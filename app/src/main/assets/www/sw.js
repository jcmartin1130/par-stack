/* Par Stack offline cache. Online: always fetch the latest files, then keep a copy.
   Offline: serve the saved copy. Bump VERSION with each release. */
const VERSION = "parstack-2026-11-01a";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "css/fonts.css", "css/app.css",
  "js/data.js", "js/store.js", "js/ui.js", "js/charts.js", "js/quiz.js", "js/study.js",
  "js/hands.js", "js/ledger.js", "js/home.js", "js/app.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
  "fonts/barlow-condensed-latin-500-normal.woff2",
  "fonts/barlow-condensed-latin-600-normal.woff2",
  "fonts/barlow-condensed-latin-700-normal.woff2",
  "fonts/ibm-plex-mono-latin-400-normal.woff2",
  "fonts/ibm-plex-mono-latin-500-normal.woff2",
  "fonts/ibm-plex-mono-latin-600-normal.woff2",
  "fonts/ibm-plex-sans-latin-400-normal.woff2",
  "fonts/ibm-plex-sans-latin-500-normal.woff2",
  "fonts/ibm-plex-sans-latin-600-normal.woff2",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(promise, ms){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  /* fonts never change: cache first */
  if (req.url.endsWith(".woff2")){
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await withTimeout(fetch(req), 5000);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, {ignoreSearch:true});
      if (hit) return hit;
      if (req.mode === "navigate") return cache.match("index.html");
      throw e;
    }
  })());
});
