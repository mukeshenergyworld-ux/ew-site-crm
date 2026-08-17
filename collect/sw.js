/* The shell is cached so the app opens instantly and works in a lift or a basement.
   THE BOOK IS NEVER CACHED HERE - money must not be served stale by a service
   worker the user cannot see. The app keeps its own snapshot in localStorage and
   says out loud when it is showing it. */
var CACHE = "ew-collect-v1150";

/* ===== A DEADLINE ON THE NETWORK (15 Aug 2026) =====
   This worker was network-first with no timeout, and so were the other four. The comment above
   is right that the cache exists so the app opens in a basement - but the old handler only
   reached for the cache when fetch REJECTED, and on one bar of signal a fetch does not reject,
   it hangs. So the cache was never consulted at the one moment it was built for, and the app
   showed a white screen for as long as the radio kept trying.
   Ask the network; if it has not answered in 2.5 seconds serve what is cached and let the
   network finish quietly into the cache. A new version then arrives on the open after the slow
   one instead of never, which is the right trade for an app that opens at all. */
var NET_MS = 2500;
function ewFresh(req, fallbackUrl) {
  return new Promise(function (resolve) {
    var settled = false;
    var give = function (r) { if (!settled && r) { settled = true; resolve(r); } };
    var cached = function () {
      return caches.match(req).then(function (m) {
        if (m) return m;
        return fallbackUrl ? caches.match(fallbackUrl) : null;
      }).catch(function () { return null; });
    };
    var timer = setTimeout(function () { cached().then(give); }, NET_MS);
    fetch(req).then(function (r) {
      if (r && r.ok) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
      }
      clearTimeout(timer);
      give(r);                       /* if the cache already answered, this only warms it */
    }).catch(function () {
      clearTimeout(timer);
      cached().then(function (m) {
        if (m) { give(m); return; }
        if (!settled) { settled = true; resolve(new Response("", { status: 504, statusText: "offline" })); }
      });
    });
  });
}

var SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u).catch(function () { /* one missing file must not fail the install */ });
    }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    /* v1.12.0 - this deleted EVERY cache on the origin. All seven apps share one github.io
       origin and therefore one cache store, so each Collection update was wiping the Challan
       app's shell, and Saathi's, and the CRM's. Only clear our own old versions. */
    return Promise.all(ks.map(function (k) {
      if (k === CACHE) return null;
      return k.indexOf("ew-collect-") === 0 ? caches.delete(k) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       /* never touch a save */
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        /* the server is not ours to cache */
  /* network first, so a new version is picked up the moment there is signal;
     the cache is only the fallback when there is none */
  e.respondWith(ewFresh(req, "./index.html"));
});
