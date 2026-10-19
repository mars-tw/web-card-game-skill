const CACHE_VERSION = "card-battle-content-r11-v1";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

function versioned(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

const CORE_ASSETS = [
  "templates/card-battle/content-r11.js?v=card-battle-content-r11-v1",
  "templates/card-battle/content-r11.css?v=card-battle-content-r11-v1",
  "assets/art/content-r11/puzzles.webp",
  "assets/art/content-r11/forecast.webp",
  "assets/art/content-r11/moen.webp",
  "templates/card-battle/content-r9.css?v=card-battle-content-r11-v1",
  "assets/art/content-r10/moen-ready.webp",
  "assets/art/content-r10/moen-cast.webp",
  "assets/art/content-r10/moen-hurt.webp",
  "assets/art/content-r10/moen-recover.webp",
  "assets/art/content-r10/moen-defeated.webp",
  "assets/animations/content-r10/footman-anticipation.webp",
  "assets/animations/content-r10/footman-impact.webp",
  "assets/animations/content-r10/footman-recovery.webp",
  "assets/animations/content-r10/footman-hurt.webp",
  "assets/animations/content-r10/footman-death.webp",
  "assets/animations/content-r10/knight-anticipation.webp",
  "assets/animations/content-r10/knight-impact.webp",
  "assets/animations/content-r10/knight-recovery.webp",
  "assets/animations/content-r10/knight-hurt.webp",
  "assets/animations/content-r10/knight-death.webp",
  "assets/animations/content-r10/knight-break.webp",
  "assets/art/content-r10/anchor-puzzles.webp",
  "assets/art/content-r10/anchor-forecast.webp",
  "assets/art/content-r10/anchor-moen.webp",
  "templates/card-battle/content-r10.js?v=card-battle-content-r11-v1",
  "templates/card-battle/content-r10.css?v=card-battle-content-r11-v1",
  "templates/card-battle/content-r9.js?v=card-battle-content-r11-v1",
  "assets/animations/content-r9/footman-anticipation.webp",
  "assets/animations/content-r9/footman-death.webp",
  "assets/animations/content-r9/footman-hurt.webp",
  "assets/animations/content-r9/footman-impact.webp",
  "assets/animations/content-r9/footman-recovery.webp",
  "assets/animations/content-r9/knight-anticipation.webp",
  "assets/animations/content-r9/knight-death.webp",
  "assets/animations/content-r9/knight-hurt.webp",
  "assets/animations/content-r9/knight-impact.webp",
  "assets/animations/content-r9/knight-recovery.webp",

  "templates/card-battle/content-r8.css?v=card-battle-content-r11-v1",
  "assets/art/content-r8/taunt-wall.webp",
  "assets/art/content-r8/divine-shield.webp",
  "templates/card-battle/content-r6.css?v=card-battle-content-r11-v1",
  "templates/card-battle/content-r6.js?v=card-battle-content-r11-v1",
  "assets/art/content-r6/moen-0.webp",
  "assets/art/content-r6/moen-1.webp",
  "assets/art/content-r6/moen-2.webp",
  "templates/card-battle/content-r5.css?v=card-battle-content-r11-v1",
  "templates/index.html?voyage=1",
  "templates/card-battle/index.html?voyage=1",
  "templates/card-battle/content-r4.css?v=card-battle-content-r11-v1",
  "assets/art/content-r4/shield-cover.webp",
  "assets/art/content-r4/shield-fracture.webp",
  "templates/card-battle/content-r3.css?v=card-battle-content-r11-v1",
  "assets/art/content-r3/shield-intact.webp",
  "assets/art/content-r3/shield-broken.webp",
  "templates/card-battle/content-r2.css?v=card-battle-content-r11-v1",
  "assets/art/content-r2/moen-harbor.webp",
  "templates/index.html?content=1",
  "templates/card-battle/index.html?content=1",
  "templates/card-battle/tide-puzzles.js?v=card-battle-content-r11-v1",
  "templates/card-battle/content-r1.css?v=card-battle-content-r11-v1",
  "assets/art/content-r1/tide-study.webp",
  "templates/r80-art.css?v=card-battle-content-r11-v1",
  "assets/art/r80/footman-band-low.webp",
  "assets/art/r80/footman-band.webp",
  "assets/art/r80/archer-hood-low.webp",
  "assets/art/r80/archer-hood.webp",
  "assets/art/r80/wave.webp",
  "templates/r79-art.css?v=card-battle-content-r11-v1",
  "assets/art/r79/battlefield-low.webp",
  "assets/art/r79/battlefield.webp",
  "assets/art/r79/wave.webp?v=r79-wave",
  "assets/art/r79/foam.webp?v=r79-foam",
  "assets/art/r78/battlefield-low.webp",
  "assets/art/r78/surface-low.webp",
  "assets/art/r79/frame-low.webp",
  "assets/art/r78/avatar.webp",
  "templates/r78-art.css?v=card-battle-content-r11-v1",
  "assets/art/r79/frame.webp?v=r79-frame",
  "assets/art/r79/icon-wave.webp?v=r79-icon",
  "assets/art/r80/logo.webp",
  "assets/art/r78/wave.webp?v=r78-wave",
  "assets/art/r78/surface.webp",
  "assets/art/r78/battlefield.webp",
  "assets/art/r78/navigator.webp",
  "assets/art/r77/app-icon.webp?v=49534764",
  "assets/art/r77/battlefield-low.webp?v=d7c024be",
  "assets/art/r77/battlefield.webp?v=2e7028d5",
  "assets/art/r77/foam.webp?v=cbff159e",
  "assets/art/r77/frame.webp?v=dd64e1b0",
  "assets/art/r77/icon-wave.webp?v=f5485b8a",
  "assets/art/r77/logo.webp?v=10b69417",
  "assets/art/r77/night-harbor.webp?v=8a72de64",
  "assets/art/r77/puddle.webp?v=03e81419",
  "assets/art/r80/victory-navigator.webp",
  "assets/art/r77/wave.webp?v=8dab4642",
  "templates/r77-art.css?v=card-battle-content-r11-v1",
  "assets/art/r76/archer-low.webp?v=b78bf635",
  "assets/art/r76/footman-low.webp?v=aedc66c0",
  "assets/art/r76/firebolt-low.webp?v=8f558c82",
  "assets/art/r76/frontScout-low.webp?v=6f407c18",
  "assets/art/r76/alleySkirmisher-low.webp?v=dade5b6b",
  "assets/art/r76/sparkSquire-low.webp?v=ffb146b0",
  "assets/art/r76/wolf-low.webp?v=c333e737",
  "assets/art/r76/emberpup-low.webp?v=f6527647",
  "assets/art/r76/alleySkirmisher.webp?v=eb357347",
  "assets/art/r76/app-icon.webp?v=cf49881d",
  "assets/art/r76/battlefield-low.webp?v=99a5f93c",
  "assets/art/r76/battlefield.webp?v=dcdadd26",
  "assets/art/r76/emberpup.webp?v=d5ccf1ed",
  "assets/art/r76/firebolt.webp?v=6583d849",
  "assets/art/r76/frame.webp?v=af1d2183",
  "assets/art/r76/frontScout.webp?v=34058513",
  "assets/art/r76/icon-battle.webp?v=9d522ef8",
  "assets/art/r76/icon-cards.webp?v=2c73e532",
  "assets/art/r76/icon-compass.webp?v=941d2114",
  "assets/art/r76/icon-wave.webp?v=bbb5ce4b",
  "assets/art/r76/logo.webp?v=906babba",
  "assets/art/r76/sparkSquire.webp?v=670a755a",
  "assets/art/r76/victory-navigator.webp?v=48d09f31",
  "assets/art/r76/waterline.webp?v=bb4395df",
  "assets/art/r76/wave.webp?v=0dbf126b",
  "assets/art/r76/wolf.webp?v=b3a469e2",
  "templates/r76-art.css?v=card-battle-content-r11-v1",

  "assets/art/r75/battlefield-low.webp",
  "assets/art/r75/avatar.webp",
  "assets/art/r75/tide-water.webp",
  "assets/art/r75/app-icon.webp",
  "assets/art/r75/archer.webp?v=66fff3e9",
  "assets/art/r75/battlefield.webp",
  "assets/art/r75/footman.webp?v=c1f52344",
  "assets/art/r75/frame.webp",
  "assets/art/r75/harbor.webp",
  "assets/art/r75/icon-battle.webp",
  "assets/art/r75/icon-cards.webp",
  "assets/art/r75/icon-coin.webp",
  "assets/art/r75/icon-compass.webp",
  "assets/art/r75/icon-lantern.webp",
  "assets/art/r75/icon-settings.webp",
  "assets/art/r75/icon-shield.webp",
  "assets/art/r75/icon-voyage.webp",
  "assets/art/r75/icon-wave.webp",
  "assets/art/r75/logo.webp",
  "assets/art/r75/navigator.webp",
  "assets/art/r75/victory.webp",
  "templates/r75-theme.css?v=card-battle-content-r11-v1",
  "templates/r75-harbor.css?v=card-battle-content-r11-v1",

  "templates/harbor.html",
  "templates/card-battle/index.html?trial=1",
  "templates/card-battle/index.html?resume=1",
  versioned("templates/card-battle/tide-session.js"),
  versioned("templates/card-battle/pose-player.js"),
  versioned("templates/card-battle/r74-tide.css"),
  versioned("templates/card-battle/voyage.js"),
  versioned("templates/card-battle/r73-ui.js"),
  versioned("templates/card-battle/r73-mobile.css"),
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
    const pageUrl = new URL(request.url);
    pageUrl.search = "";
    return (await cache.match(request))
      || (await caches.match(request))
      || (await caches.match(pageUrl.toString()))
      || (await caches.match(new URL("templates/index.html", self.registration.scope).toString()))
      || (await caches.match(new URL("offline.html", self.registration.scope).toString()));
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
