/* =========================================================================
 * test-quality-gates.js - R40 文案與 PWA 快取守門
 * ========================================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failed = 0;

function assert(condition, message) {
  if (condition) console.log("  ✓ " + message);
  else {
    console.error("  ✗ " + message);
    failed++;
  }
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function abs(rel) {
  return path.resolve(ROOT, rel);
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8");
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function decodeHtml(text) {
  return String(text)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function extractJsStringLiterals(source, file) {
  const literals = [];
  let i = 0;

  function push(text, index, kind) {
    if (text && text.trim()) literals.push({ file, line: lineOf(source, index), kind, text });
  }

  function skipQuoted(quote) {
    i++;
    while (i < source.length) {
      if (source[i] === "\\") {
        i += 2;
        continue;
      }
      if (source[i] === quote) {
        i++;
        return;
      }
      i++;
    }
  }

  function readQuoted(quote) {
    const start = i;
    let text = "";
    i++;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "\\") {
        text += source[i + 1] || "";
        i += 2;
        continue;
      }
      if (ch === quote) {
        i++;
        push(text, start, "js-string");
        return;
      }
      text += ch;
      i++;
    }
    push(text, start, "js-string");
  }

  function skipTemplateRaw() {
    i++;
    while (i < source.length) {
      if (source[i] === "\\") {
        i += 2;
        continue;
      }
      if (source[i] === "`") {
        i++;
        return;
      }
      if (source[i] === "$" && source[i + 1] === "{") {
        i += 2;
        skipExpression();
        continue;
      }
      i++;
    }
  }

  function skipExpression() {
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      const next = source[i + 1];
      if (ch === "/" && next === "/") {
        i += 2;
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        i += 2;
        while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"') {
        skipQuoted(ch);
        continue;
      }
      if (ch === "`") {
        skipTemplateRaw();
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
  }

  function readTemplate() {
    const start = i;
    let chunk = "";
    i++;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "\\") {
        chunk += source[i + 1] || "";
        i += 2;
        continue;
      }
      if (ch === "`") {
        i++;
        push(chunk, start, "js-template");
        return;
      }
      if (ch === "$" && source[i + 1] === "{") {
        push(chunk, start, "js-template");
        chunk = "";
        i += 2;
        skipExpression();
        continue;
      }
      chunk += ch;
      i++;
    }
    push(chunk, start, "js-template");
  }

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      readQuoted(ch);
      continue;
    }
    if (ch === "`") {
      readTemplate();
      continue;
    }
    i++;
  }
  return literals;
}

function extractHtmlTexts(file) {
  const html = read(file);
  const texts = [];
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");

  for (const match of withoutComments.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    texts.push(...extractJsStringLiterals(match[1], file));
  }

  const display = withoutComments
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");

  for (const match of display.matchAll(/\b(?:title|aria-label|placeholder|alt)=["']([^"']*)["']/gi)) {
    texts.push({ file, line: lineOf(html, match.index), kind: "html-attr", text: decodeHtml(match[1]) });
  }

  const nodeText = display.replace(/<[^>]+>/g, "\n");
  for (const match of nodeText.matchAll(/[^\n]+/g)) {
    const text = decodeHtml(match[0]).replace(/\s+/g, " ").trim();
    if (text) texts.push({ file, line: null, kind: "html-text", text });
  }
  return texts;
}

const MOJIBAKE_PATTERNS = [
  { name: "U+FFFD", re: /\uFFFD/ },
  { name: "連續問號", re: /\?{2,}/ },
  { name: "私用或 C1 控制字元", re: /[\u0080-\u009F\uE000-\uF8FF]/ },
  { name: "常見 mojibake 字群", re: /[嚗摮蝯撠銝雿瘥頛隞鞎璅蝭憿閮摰蝣蝺餉閫韏駁唳啁箇瘝銵]{2,}/ },
];

function isNullishOperatorArtifact(text) {
  return /\$\{[^}]*\?\?/.test(text) || /[A-Za-z0-9_$\]\)]\s*\?\?/.test(text);
}

function checkCopyQuality() {
  const htmlFiles = [
    "templates/card-battle/index.html",
    "templates/card-pack/index.html",
  ];
  const jsFiles = [
    "templates/card-battle/cards.js",
    "templates/card-battle/core.js",
    "templates/card-battle/battle.js",
    "templates/card-pack/pack.js",
  ];
  const samples = [];
  htmlFiles.forEach((file) => samples.push(...extractHtmlTexts(file)));
  jsFiles.forEach((file) => samples.push(...extractJsStringLiterals(read(file), file)));
  if (process.env.R40_FAKE_MOJIBAKE === "1") {
    samples.push({ file: "__fault_injection__", line: 1, kind: "fake", text: "嚗摮??" });
  }

  const findings = [];
  for (const sample of samples) {
    const compact = sample.text.replace(/\s+/g, " ").trim();
    if (!compact) continue;
    for (const pattern of MOJIBAKE_PATTERNS) {
      if (pattern.name === "連續問號" && isNullishOperatorArtifact(compact)) continue;
      if (pattern.re.test(compact)) {
        findings.push(`${sample.file}${sample.line ? ":" + sample.line : ""} [${sample.kind}] ${pattern.name} -> ${compact.slice(0, 90)}`);
      }
    }
  }
  findings.slice(0, 20).forEach((finding) => console.error("    " + finding));
  assert(findings.length === 0, `battle/pack HTML 與 JS 字串無 mojibake（異常 ${findings.length}）`);
}

function normalizeRef(ref, baseFile) {
  let value = decodeHtml(String(ref || "")).trim().replace(/^['"]|['"]$/g, "");
  if (!value || value.startsWith("#")) return null;
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|about:)/i.test(value)) return null;
  value = value.split("#")[0].split("?")[0];
  if (!value) return null;
  const baseAbs = abs(baseFile);
  const target = value.startsWith("/")
    ? path.resolve(ROOT, "." + value)
    : path.resolve(path.dirname(baseAbs), value);
  const rel = path.relative(ROOT, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const normalized = toPosix(path.normalize(rel));
  if (normalized === "") return ".";
  if (!/\.(?:html?|js|css|png|webmanifest|json)$/i.test(normalized)) return null;
  return normalized;
}

function addRequired(required, rel, source) {
  if (!rel) return;
  if (!required.has(rel)) required.set(rel, new Set());
  required.get(rel).add(source);
}

function discoverHtmlResources(file, required, scripts) {
  const html = read(file);
  addRequired(required, file, "page");
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const rel = normalizeRef(match[1], file);
    addRequired(required, rel, `${file}:attr`);
    if (rel && rel.endsWith(".js")) scripts.add(rel);
  }
  for (const match of html.matchAll(/url\(([^)]+)\)/gi)) {
    addRequired(required, normalizeRef(match[1], file), `${file}:css-url`);
  }
  for (const match of html.matchAll(/url=([^"';\s>]+)/gi)) {
    addRequired(required, normalizeRef(match[1], file), `${file}:refresh`);
  }
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const literal of extractJsStringLiterals(match[1], file)) {
      addRequired(required, normalizeRef(literal.text, file), `${file}:inline-js`);
    }
  }
}

function discoverManifestResources(file, required) {
  const manifest = JSON.parse(read(file));
  addRequired(required, normalizeRef(manifest.start_url, file), `${file}:start_url`);
  for (const icon of manifest.icons || []) addRequired(required, normalizeRef(icon.src, file), `${file}:icon`);
}

function discoverJsResources(file, required) {
  if (!fs.existsSync(abs(file))) return;
  for (const literal of extractJsStringLiterals(read(file), file)) {
    addRequired(required, normalizeRef(literal.text, file), `${file}:js-string`);
  }
}

function cacheAssetToRel(asset) {
  let value = String(asset || "").trim().replace(/^['"]|['"]$/g, "");
  value = value.split("#")[0].split("?")[0];
  if (value === "./" || value === ".") return ".";
  if (value.startsWith("/")) value = value.slice(1);
  return toPosix(path.normalize(value));
}

function parseCachedAssets() {
  const sw = read("sw.js");
  const block = sw.match(/const\s+CORE_ASSETS\s*=\s*\[([\s\S]*?)\]\.map/);
  if (!block) return { cached: new Set(), rawCount: 0 };
  const strings = extractJsStringLiterals(block[1], "sw.js").map((item) => item.text);
  return { cached: new Set(strings.map(cacheAssetToRel)), rawCount: strings.length };
}

function checkSwCacheCompleteness() {
  const required = new Map();
  const scripts = new Set();
  const pages = [
    "index.html",
    "templates/index.html",
    "templates/card-battle/index.html",
    "templates/card-pack/index.html",
  ];
  pages.forEach((file) => discoverHtmlResources(file, required, scripts));
  if (required.has("manifest.webmanifest")) discoverManifestResources("manifest.webmanifest", required);
  [
    ...scripts,
    "templates/card-battle/cards.js",
    "templates/card-battle/core.js",
    "templates/card-battle/battle.js",
    "templates/card-pack/pack.js",
  ].forEach((file) => discoverJsResources(file, required));

  const { cached, rawCount } = parseCachedAssets();
  if (process.env.R40_FAKE_SW_MISSING === "1") cached.delete("templates/card-battle/battle.js");

  const missingFiles = [];
  for (const rel of cached) {
    if (rel === ".") continue;
    if (!fs.existsSync(abs(rel))) missingFiles.push(rel);
  }
  missingFiles.slice(0, 20).forEach((rel) => console.error("    cache missing file: " + rel));
  assert(rawCount > 0 && missingFiles.length === 0, `sw.js CORE_ASSETS 清單項目存在（${rawCount} 項）`);

  const missingCache = [];
  for (const [rel, sources] of required.entries()) {
    if (!fs.existsSync(abs(rel))) missingCache.push(`${rel}（引用檔不存在；${[...sources].join(", ")}）`);
    else if (!cached.has(rel)) missingCache.push(`${rel}（未列入 sw.js；${[...sources].join(", ")}）`);
  }
  missingCache.slice(0, 20).forEach((rel) => console.error("    resource gate: " + rel));
  assert(missingCache.length === 0, `入口 shell、battle、pack 的本地資源皆納入 SW 快取（${required.size} 項）`);
}

console.log("== R40 文案品質守門 ==");
checkCopyQuality();
console.log("== R40 SW 快取完整性守門 ==");
checkSwCacheCompleteness();

if (failed > 0) {
  console.error(`❌ ${failed} 項守門失敗`);
  process.exit(1);
}
console.log("✅ R40 quality gates passed");
