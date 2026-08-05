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

  e.respondWith(
    fetch(r).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(r, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(r).then(function (m) {
        return m || caches.match('./index.html');
      });
    })
  );
});
