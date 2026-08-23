/* The shell is cached so the app opens instantly on one bar of signal.
   THE BOOK IS NEVER CACHED HERE - a visit must not be served stale by a service worker
   the user cannot see. The app keeps its own snapshot and says out loud when it shows it. */
var CACHE = "ew-service-v1";

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
/* ===== NEVER STORE A ONE-TIME URL  (23 Aug 2026) =====
   MEASURED ON HIS OWN PHONE, not suspected: cache ew-team-v11 held TWELVE copies of app.js -
   20.8 MB - and had served none of them. ew-service-v1 held 97 more one-time URLs. 69 MB on
   the origin, all of it dead.

   The CRM asked for app.js?cb=<now> and liveVersion() asks every app for index.html?v=<now>.
   Both correctly went to the NETWORK - a query string means "I want fresh" - and both were
   then STORED under that one-time url. The next open carries a different stamp, so the stored
   copy can never match. A full copy written on every open, for ever, never once read.

   The routing was right. The storing was wrong: a url that will never be asked for again has
   no business in a cache. One line, and it is this one. */
function ewKeep(req, res) {
  if (!res || !(res.ok || res.status === 200)) return;
  try { if (new URL(req.url).search) return; } catch (e) { return; }
  var cp = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
}
/* and clear what the old rule left behind. Runs once, when this worker activates. The cache
   NAME is deliberately not bumped - that would delete the good entries too and cost every
   phone a fresh download, which is the exact cost this release exists to remove. */
function ewPurge() {
  return caches.open(CACHE).then(function (c) {
    return c.keys().then(function (rs) {
      return Promise.all(rs.map(function (r) {
        var dead = true;
        try { dead = !!new URL(r.url).search; } catch (e) { dead = true; }
        return dead ? c.delete(r) : null;
      }));
    });
  }).catch(function () {});
}

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
        ewKeep(req, r);
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
        ewKeep(req, r);
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
  /* 23 Aug 2026 - AND app.js, which is now asked for at a STABLE url with cache:"no-cache".
     That is a revalidation, not a download. Measured on GitHub Pages from a page no worker
     controls: 548 KB the first time and 0 KB every time after, because the server answers 304
     against its ETag. So the network path is nearly free AND always correct, and ewFresh's
     2.5-second deadline still serves the shelf when there is no signal.

     Cache-first here would be wrong, and for a reason worth writing down: the CRM has no
     liveVersion() and no update banner. Its footer promises "updates apply automatically on
     each login", and THIS REQUEST is the only thing that keeps that promise. */
  try { var u = new URL(req.url); return !!u.search || /\/app\.js$/.test(u.pathname); }
  catch (e) { return true; }
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
    /* THE RULE THIS ESTATE LEARNED THE HARD WAY (Challan v1.13.0, kept here from birth).
       Every app is served from one github.io origin, so they share one cache store. A worker
       that clears "every cache except mine" quietly wipes the other apps' shells, and they
       open to a white screen on the next basement with no signal - blamed on them, caused by
       this. An app may only ever clear ITS OWN older versions.

       Note the prefix: this is a new app and the prefix was the first thing to get wrong.
       ew-service-, not ew-challan-. */
    return Promise.all(ks.map(function (k) {
      if (k === CACHE) return null;
      return k.indexOf("ew-service-") === 0 ? caches.delete(k) : null;
    }));
  }).then(ewPurge).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* v17aug: the shelf first, unless the request is deliberately asking the server */
  e.respondWith(ewWantsNetwork(req) ? ewFresh(req, "./index.html") : ewShelf(req, "./index.html"));
});
