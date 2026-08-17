// Energy World service worker.
// HARD-LEARNED RULE: app.js AND index.html are both network-first. The promise of this
// app is that a change reaches the team on their next open. A cache-first shell broke
// that once already - CSS changes never arrived. Only icons and fonts are cache-first.
// API calls are NEVER cached: stale business data is worse than slow business data.
var CACHE = "ew-team-v9";

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

var SHELL = ["./icon-192.png", "./icon-512.png", "../assets/logo.jpg"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    /* THIS DELETED EVERY CACHE ON THE ORIGIN (fixed 17 Aug 2026). All seven Energy World apps
       are served from one github.io origin, so they share ONE cache store. Every update of any
       one app was therefore wiping the shells of the other six - which then opened to a white
       screen the next time a phone was somewhere with no signal, and got blamed for it. An
       app may only ever clear its OWN older versions. */
    return Promise.all(ks.filter(function (k) {
      return k !== CACHE && k.indexOf("ew-team-") === 0;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(e) {
  e.respondWith(ewFresh(e.request, e.request.mode === "navigate" ? "./index.html" : null));
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