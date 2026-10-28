// Offline support for the installed app. Client data never passes through here: printouts are read
// from the device by the page itself; this only caches the app files and the two libraries it loads.
const CACHE = "form-filler-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { mode: u.startsWith("http") ? "no-cors" : "same-origin" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k != CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method != "GET") return;
  const url = new URL(e.request.url);
  // the app page: try the network first so updates arrive, fall back to the saved copy when offline
  if (e.request.mode == "navigate" || (url.origin == location.origin && url.pathname.endsWith("/index.html"))) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // icons and pinned library versions never change: use the saved copy first
  if (url.origin == location.origin || url.hostname == "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(e.request, { ignoreVary: true }).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })));
  }
});
