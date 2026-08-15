/* ------------------------------------------------------------------
   Shell cache for the visit app.

   Only the frame is cached - the HTML, the manifest, the icons. No
   business data ever lands here, because data comes from the Apps
   Script server on another origin and that request is left alone.

   Network first, cache second. That order matters: it means the day
   you upload a new version, every phone gets it on the next open.
   The cache only speaks when the network does not, so a man standing
   in a basement still sees the app instead of the browser's error.
------------------------------------------------------------------ */
var CACHE = 'ew-visit-v1';

/* ===== A DEADLINE ON THE NETWORK (15 Aug 2026) =====
   This worker was network-first with no timeout. The comment above is right that the cache
   exists so the app opens in a basement - but the old handler only reached for the cache when
   fetch REJECTED, and on one bar of signal a fetch does not reject, it hangs. So the cache was
   never consulted at the one moment it was built for.
   Ask the network; if it has not answered in 2.5 seconds serve what is cached and let the
   network finish quietly into the cache. */
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
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      clearTimeout(timer);
      give(res);
    }).catch(function () {
      clearTimeout(timer);
      cached().then(function (m) {
        if (m) { give(m); return; }
        if (!settled) { settled = true; resolve(new Response('', { status: 504, statusText: 'offline' })); }
      });
    });
  });
}

var SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u;
  try { u = new URL(r.url); } catch (err) { return; }
  if (u.origin !== location.origin) return;              /* the API and the fonts go straight out */
  if (/ew-config\.js$/.test(u.pathname)) return;         /* the address must never go stale */

  e.respondWith(ewFresh(r, './index.html'));
});
