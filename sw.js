const CACHE_VERSION = "card-battle-r67-v1";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

function versioned(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

const CORE_ASSETS = [
  "./",
  "index.html",
  "offline.html",
  "templates/index.html",
  "templates/card-battle/index.html",
  "templates/card-pack/index.html",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/backgrounds/dark.png",
  "assets/backgrounds/fantasy.png",
  "assets/backgrounds/cyber.png",
  "assets/backgrounds/forest.png",
  "assets/battlefields/white-tide-citadel-high.webp?v=f57dd495",
  "assets/battlefields/white-tide-citadel-med.webp?v=7e3aa7a2",
  "assets/battlefields/white-tide-citadel-low.webp?v=50075ecc",
  "assets/battlefields/astral-conclave-high.webp?v=aa8b6fe4",
  "assets/battlefields/astral-conclave-med.webp?v=a391a7b2",
  "assets/battlefields/astral-conclave-low.webp?v=fcf44103",
  "assets/battlefields/thunderwild-pass-high.webp?v=c0693a23",
  "assets/battlefields/thunderwild-pass-med.webp?v=47d3f827",
  "assets/battlefields/thunderwild-pass-low.webp?v=5af6a310",
  "assets/battlefields/longnight-necropolis-high.webp?v=4b7300c8",
  "assets/battlefields/longnight-necropolis-med.webp?v=9a48f27c",
  "assets/battlefields/longnight-necropolis-low.webp?v=927f8f26",
  "assets/battlefields/tidebreak-confluence-high.webp?v=ae55f8e7",
  "assets/battlefields/tidebreak-confluence-med.webp?v=35c28764",
  "assets/battlefields/tidebreak-confluence-low.webp?v=bcaabe4e",
  "assets/factions/wardens.png?v=3fd3693f",
  "assets/factions/conclave.png?v=326f8a7e",
  "assets/factions/wild.png?v=153b6fe6",
  "assets/factions/wintershadow.png?v=d878da4b",
  "assets/factions/neutral.png?v=4cf2322a",
  "assets/cards/alleySkirmisher.png",
  "assets/cards/archer.png",
  "assets/cards/archmage.png",
  "assets/cards/archLoremaster.png",
  "assets/cards/abyssWalker.png",
  "assets/cards/arcaneApprentice.png",
  "assets/cards/arcaneInfusion.png",
  "assets/cards/arcaneVeil.png",
  "assets/cards/arcaneWeaver.png",
  "assets/cards/bannerGuard.png",
  "assets/cards/bastionColossus.png",
  "assets/cards/battleDrummer.png",
  "assets/cards/bloodmoonQueen.png",
  "assets/cards/bulwarkMonk.png",
  "assets/cards/captainGreywake.png",
  "assets/cards/cleric.png",
  "assets/cards/countessLongNight.png",
  "assets/cards/dawnArchbishop.png",
  "assets/cards/dawnRider.png",
  "assets/cards/dragon.png",
  "assets/cards/dualTalon.png",
  "assets/cards/duskWitch.png",
  "assets/cards/duskwrightBat.png",
  "assets/cards/emberpup.png",
  "assets/cards/emberVolley.png",
  "assets/cards/firebolt.png",
  "assets/cards/flameBurst.png",
  "assets/cards/footman.png",
  "assets/cards/forbiddenHex.png",
  "assets/cards/frontScout.png",
  "assets/cards/frenzyCub.png",
  "assets/cards/frost.png",
  "assets/cards/frostBiter.png",
  "assets/cards/frostChanneler.png",
  "assets/cards/frostReaver.png",
  "assets/cards/frostfangDire.png",
  "assets/cards/frostboundTyrant.png",
  "assets/cards/glaciarchWarden.png",
  "assets/cards/golem.png",
  "assets/cards/graveScribe.png",
  "assets/cards/griffin.png",
  "assets/cards/groveHerbalist.png",
  "assets/cards/guardian.png",
  "assets/cards/heal.png",
  "assets/cards/highArchivist.png",
  "assets/cards/holyGlimmer.png",
  "assets/cards/heroIsoldLongdusk.png",
  "assets/cards/heroMagisterVey.png",
  "assets/cards/heroMoenTidearbiter.png",
  "assets/cards/heroRuneFrostfang.png",
  "assets/cards/heroScarra.png",
  "assets/cards/heroSerHalden.png",
  "assets/cards/iceNeedle.png",
  "assets/cards/knight.png",
  "assets/cards/ladyAshenBell.png",
  "assets/cards/linebreaker.png",
  "assets/cards/lich.png",
  "assets/cards/lightning.png",
  "assets/cards/mage.png",
  "assets/cards/manaSurge.png",
  "assets/cards/meteor.png",
  "assets/cards/mirrorRime.png",
  "assets/cards/mooncat.png",
  "assets/cards/novicePage.png",
  "assets/cards/oathbannerHerald.png",
  "assets/cards/packHowler.png",
  "assets/cards/paladin.png",
  "assets/cards/phoenix.png",
  "assets/cards/polymorph.png",
  "assets/cards/ragingBrute.png",
  "assets/cards/raptor.png",
  "assets/cards/runicScrivener.png",
  "assets/cards/saltShieldSquire.png",
  "assets/cards/sanctuaryWarden.png",
  "assets/cards/scoutInterrogator.png",
  "assets/cards/shieldUp.png",
  "assets/cards/silenceOne.png",
  "assets/cards/skyJudicator.png",
  "assets/cards/soulfrostRaven.png",
  "assets/cards/sparkSquire.png",
  "assets/cards/starfall.png",
  "assets/cards/stormGriffin.png",
  "assets/cards/tacticalRequisition.png",
  "assets/cards/thunderClap.png",
  "assets/cards/thunderRoc.png",
  "assets/cards/tidecallerAdept.png",
  "assets/cards/tidebinderHex.png",
  "assets/cards/titan.png",
  "assets/cards/toxinViper.png",
  "assets/cards/voidTithe.png",
  "assets/cards/watchtowerBowman.png",
  "assets/cards/wolf.png",
  versioned("sw.js"),
  versioned("manifest.webmanifest"),
  versioned("templates/card-battle/cards.js"),
  versioned("templates/card-battle/core.js"),
  versioned("templates/card-battle/battle.js"),
  versioned("templates/card-pack/pack.js")
].map((path) => new URL(path, self.registration.scope).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSET_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

async function networkFirst(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || caches.match(new URL("templates/index.html", self.registration.scope).toString())
      || caches.match(new URL("offline.html", self.registration.scope).toString());
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(isHtmlRequest(request) ? networkFirst(request) : cacheFirst(request));
});

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") return;
  if (event.data.type === "GET_VERSION") {
    event.source && event.source.postMessage({ type: "CACHE_VERSION", version: CACHE_VERSION });
  }
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
});
