// Energy World service worker.
// HARD-LEARNED RULE: app.js AND index.html are both network-first. The promise of this
// app is that a change reaches the team on their next open. A cache-first shell broke
// that once already - CSS changes never arrived. Only icons and fonts are cache-first.
// API calls are NEVER cached: stale business data is worse than slow business data.
var CACHE = "ew-team-v3";
var SHELL = ["./icon-192.png", "./icon-512.png", "../assets/logo.jpg"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(e) {
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
}

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (e.request.method !== "GET") return;
  if (url.indexOf("script.google.com") >= 0 || url.indexOf("api.github.com") >= 0) return;

  // the app code and the shell must always be fresh
  if (e.request.mode === "navigate" || url.indexOf("app.js") >= 0 ||
      url.indexOf("index.html") >= 0 || url.indexOf("manifest") >= 0) {
    networkFirst(e);
    return;
  }

  // everything else (icons, logo, fonts) can come from cache
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return r;
      }).catch(function () { return hit; });
    })
  );
});