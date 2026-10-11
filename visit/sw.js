/* Visit 2026.10.11-1 - this folder no longer holds an app: Site visits & quotes is in the CRM (../team/#visits).
   This worker replaces the old one, deletes the old cached copy (the Hindi sign-in screen phones kept), and
   leaves for good. Every request goes to the network. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return /^ew-visit/.test(k); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (e) {} }); }));
});
