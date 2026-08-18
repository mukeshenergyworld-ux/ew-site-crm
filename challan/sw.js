/* The shell is cached so the app opens instantly in a godown basement.
   THE BOOK IS NEVER CACHED HERE - a challan must not be served stale by a service worker
   the user cannot see. The app keeps its own snapshot and says out loud when it shows it. */
var CACHE = "ew-challan-v1210";

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


/* ===== SERVE FROM THE SHELF FIRST (17 Aug 2026) =====
   HIS REPORT: "app response is very slow on android and ios".

   Measured, not guessed. Every one of these workers was NETWORK-FIRST with a 2.5-second
   deadline. Every open of every app therefore waited for the network before it would look at
   the copy it already had - and on a phone in a godown it waited the whole 2,500 ms and then
   served the cache anyway. The CRM's app.js is 1.6 MB; that request was never going to win a
   race on one bar of signal, so the race only ever cost him the 2.5 seconds.

   WHY IT WAS BUILT THAT WAY, AND WHY THAT REASON HAS EXPIRED. The comment above is right that
   a cache-first shell once broke the promise that a change reaches the team on their next open
   - CSS changes never arrived. But on 17 August every app got liveVersion(), a refresh arrow
   and an "a newer version is ready" banner. There is now a LOUD path for a new build, so the
   shell no longer has to be slow in order to guarantee one.

   So: serve what is on the shelf immediately, fetch in the background, and the new build is in
   the cache for the very next open - where the banner announces it. Nothing is lost. The
   2.5-second wait is.

   WHAT STILL GOES STRAIGHT TO THE NETWORK, deliberately:
     - anything carrying a query string. liveVersion() asks for index.html?v=<now> precisely to
       find out what the SERVER has; answered from the cache it would compare the file against
       itself and the update banner would never fire again.
     - the app's own "come back fresh" reload (?u=...), which is the escape hatch a man is told
       to use when something looks wrong.
     - the backend, which is not ours to cache. Stale business data is worse than slow business
       data - that rule stands.
*/
function ewShelf(req, fallbackUrl) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) {
      if (r && r.ok) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
      }
      return r;
    }).catch(function () { return null; });
    if (hit) return hit;                    /* instant - the fetch finishes quietly into the cache */
    return net.then(function (r) {
      if (r) return r;
      if (!fallbackUrl) return new Response("", { status: 504, statusText: "offline" });
      return caches.match(fallbackUrl).then(function (m) {
        return m || new Response("", { status: 504, statusText: "offline" });
      });
    });
  });
}
/* a request that is ASKING for the network gets it: a version poll, or a forced fresh open */
function ewWantsNetwork(req) {
  try { return !!(new URL(req.url).search); } catch (e) { return true; }
}

var SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    /* v1.13.0 - THIS USED TO DELETE EVERY CACHE ON THE ORIGIN. All seven apps are served from
       one github.io origin, so they share one cache store: each Challan update was quietly
       wiping the Collection app's shell, and Saathi's, and the CRM's. Those apps then opened
       to a white screen on the next basement with no signal - blamed on them, caused by this.
       Only ever clear our own old versions. */
    return Promise.all(ks.map(function (k) {
      if (k === CACHE) return null;
      return k.indexOf("ew-challan-") === 0 ? caches.delete(k) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* v17aug: the shelf first, unless the request is deliberately asking the server */
  e.respondWith(ewWantsNetwork(req) ? ewFresh(req, "./index.html") : ewShelf(req, "./index.html"));
});
