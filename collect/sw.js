/* The shell is cached so the app opens instantly and works in a lift or a basement.
   THE BOOK IS NEVER CACHED HERE - money must not be served stale by a service
   worker the user cannot see. The app keeps its own snapshot in localStorage and
   says out loud when it is showing it. */
var CACHE = "ew-collect-v1";
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
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       /* never touch a save */
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        /* the server is not ours to cache */
  /* network first, so a new version is picked up the moment there is signal;
     the cache is only the fallback when there is none */
  e.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match("./index.html"); });
    })
  );
});
