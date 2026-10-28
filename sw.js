// Lisy Scout + Bethany Lister offline support.
// The app page: network first, so new versions show up right away; saved copy when there's no signal.
// Libraries, fonts, icons: saved copy first (they never change at a pinned version).
// Keepa, Amazon and Worker requests: never touched, always live.
const CACHE = "scout-v3";
const CORE = ["./", "./index.html", "./manifest.json", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("scout-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (/keepa\.com$|amazon\.com$|media-amazon\.com$|workers\.dev$/.test(url.hostname)) return;   // live data only

  if (url.pathname.includes("/lister")) return;   // the Lister has its own app and offline cache
  const isPage = req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage){
    const page = "./index.html";
    e.respondWith(
      fetch(req, {cache: "no-store"}).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(page, copy)); return res;
      }).catch(() => caches.match(page))
    );
    return;
  }
  const cacheable = url.origin === location.origin || /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque"){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
