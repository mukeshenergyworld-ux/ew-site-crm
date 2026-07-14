// Energy World service worker.
// The rule that matters: app.js is ALWAYS network-first. The whole promise of this app is
// that a change reaches the team on their next open - a cache must never break that.
// Shell and icons are cache-first, which is what makes it open instantly on a bad signal.
// API calls are NEVER cached: stale business data is worse than slow business data.
var CACHE = "ew-team-v1";
var SHELL = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "../assets/logo.jpg"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (e.request.method !== "GET") return;
  if (url.indexOf("script.google.com") >= 0 || url.indexOf("api.github.com") >= 0) return;

  if (url.indexOf("app.js") >= 0) {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return r;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

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