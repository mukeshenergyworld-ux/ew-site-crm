// Energy World service worker.
// THIS HEADER USED TO SAY app.js and index.html are always network-first. That was true
// until 17 Aug 2026 and is not any more - see "SERVE FROM THE SHELF FIRST" below for what
// changed and why the reason for it expired. The rule that has NOT changed: API calls are
// NEVER cached, because stale business data is worse than slow business data.
//
// AND THE CACHE NAME IS DELIBERATELY NOT BUMPED for that change. Bumping it deletes the old
// cache, which would force every phone to re-download 1.6 MB - the exact cost this release
// exists to remove. A worker updates on a byte difference; it does not need a new cache to
// do it.
var CACHE = "ew-team-v11";

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
/* ===== SAYING SO, INSTEAD OF WAITING TO SAY IT (29 Aug 2026) =====
   Serving off the shelf is only honest if the man is told when the shelf is out of date. The
   bodies are 2.1 MB and comparing them would cost more than the wait we just removed, so this
   compares what the server itself uses to answer 304: the ETag, or failing that Last-Modified.
   Different tag, different build. Nothing is guessed and nothing is downloaded twice. */
function ewTag(r) {
  try { return (r && (r.headers.get("etag") || r.headers.get("last-modified"))) || ""; }
  catch (e) { return ""; }
}
function ewTellNewBuild(url) {
  try {
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
      cs.forEach(function (c) { try { c.postMessage({ ew: "new-build", url: url }); } catch (e) {} });
    });
  } catch (e) {}
}
function ewShelf(req, fallbackUrl) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) {
      if (r && r.ok) {
        /* the tag is read BEFORE ewKeep replaces the stored copy */
        if (hit && ewTag(hit) && ewTag(r) && ewTag(hit) !== ewTag(r)) ewTellNewBuild(req.url);
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
  /* ===== 29 Aug 2026 - AND app.js CAME OFF THE LIST =====
     The paragraph above is a correct description of a fast line and a wrong one of a phone in
     a godown. A 304 revalidation is free in BYTES; it is not free in TIME. It is still a round
     trip to GitHub Pages before the app may start, and ewFresh waits up to 2,500 ms for it
     before it will look at the copy already on the phone. Measured across the estate that is
     0.5 to 2.5 seconds on every single open, paid by every man, every time.

     The reason given for keeping it - "the CRM has no update banner, and this request is the
     only thing that keeps the footer's promise" - was true when it was written. It is not true
     any more, because this release built the banner: ewShelf now compares the ETag of what it
     served against the ETag of what came back, and tells the page when they differ. The promise
     is kept LOUDLY instead of slowly, and the wait is gone. */
  try { var u = new URL(req.url); return !!u.search; }
  catch (e) { return true; }
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
  }).then(ewPurge).then(function () { return self.clients.claim(); }));
});

function networkFirst(e) {
  e.respondWith(ewFresh(e.request, e.request.mode === "navigate" ? "./index.html" : null));
}

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (e.request.method !== "GET") return;
  if (url.indexOf("script.google.com") >= 0 || url.indexOf("api.github.com") >= 0) return;

  // v17aug: the app code comes off the shelf first. app.js is 1.6 MB - it was never going to
  // win a 2.5-second race on a phone, so the race only ever cost him the 2.5 seconds.
  if (e.request.mode === "navigate" || url.indexOf("app.js") >= 0 ||
      url.indexOf("index.html") >= 0 || url.indexOf("manifest") >= 0) {
    if (ewWantsNetwork(e.request)) { networkFirst(e); return; }
    e.respondWith(ewShelf(e.request, e.request.mode === "navigate" ? "./index.html" : null));
    return;
  }

  // everything else (icons, logo, fonts) can come from cache
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          ewKeep(e.request, r);
        }
        return r;
      }).catch(function () { return hit; });
    })
  );
});