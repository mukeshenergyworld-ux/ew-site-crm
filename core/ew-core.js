/* ============================================================================
   EW-CORE — the code that is the same in more than one app.

   WHY THIS FILE EXISTS. 17 August 2026: "its wasting lots of time in fixing these small
   errors, whole team productivity is affecting." He was right, and measuring said why. The
   errors were neither small nor many: they were ONE error living in up to three places, each
   of which had to be found and fixed separately. On that day alone the same crash screen was
   written twice and the same refresh three times.

   WHAT IS IN HERE. Only functions that were already BYTE-IDENTICAL in every app that had
   them - proved, not assumed. Nothing was retyped and nothing was harmonised on the way in:
   each one was lifted whole out of the app that owned it, with the comment above it, because
   the comments are the reasons and a core without its reasons is a core nobody can safely
   edit.

   WHAT IS DELIBERATELY NOT IN HERE. 85 functions share a NAME across these apps and do
   different jobs - render, doLogin, api, toast and renderLogin are between 1% and 8% alike.
   Merging those would be a rewrite wearing a refactor's clothes, and it would break the
   things that are working. They stay where they are.

   HOW IT REACHES THE APPS. It is BUILT IN, not loaded. These apps are single self-contained
   files on purpose: they must open in a godown basement with no signal. A shared
   <script src> would add a request to every boot and one new way for every app to fail at
   once - the opposite of what was asked for. tools/build_core.py writes each section between
   an app's own EW-CORE markers, so what ships is exactly as self-contained as it always was.

   THE RULE THAT MAKES IT SAFE. After a build, every function here must be byte-identical to
   what that app had before. t_core.js asserts exactly that. A change that belongs in only one
   app does not belong in this file.
   ========================================================================== */


/* ==EWCORE:idb== The IndexedDB door. */
/* ==EWCORE:idb== The IndexedDB door. */
  function idbOpen() {
    if (_idbP) return _idbP;
    _idbP = new Promise(function (res) {
      var done = false, fin = function (v) { if (!done) { done = true; res(v); } };
      try {
        if (!window.indexedDB) return fin(null);
        var rq = indexedDB.open(IDB_NAME, 1);
        rq.onupgradeneeded = function () {
          try { rq.result.createObjectStore(IDB_STORE); } catch (e) {}
        };
        rq.onsuccess = function () { fin(rq.result); };
        rq.onerror = function () { fin(null); };
        rq.onblocked = function () { fin(null); };
        /* Safari in private mode can leave open() hanging forever. The app must never wait
           on storage to start - it falls back to localStorage and carries on. */
        setTimeout(function () { fin(null); }, 2500);
      } catch (e) { fin(null); }
    });
    return _idbP;
  }
  function idbSet(k, v) {
    return idbOpen().then(function (db) {
      if (!db) return false;
      return new Promise(function (res) {
        try {
          var t = db.transaction(IDB_STORE, "readwrite");
          t.objectStore(IDB_STORE).put(v, k);
          t.oncomplete = function () { res(true); };
          t.onerror = function () { res(false); };
          t.onabort = function () { res(false); };
        } catch (e) { res(false); }
      });
    }).catch(function () { return false; });
  }
  function idbGet(k) {
    return idbOpen().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        try {
          var r = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(k);
          r.onsuccess = function () { res(r.result === undefined ? null : r.result); };
          r.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    }).catch(function () { return null; });
  }
  function idbDel(k) {
    return idbOpen().then(function (db) {
      if (!db) return false;
      return new Promise(function (res) {
        try {
          var t = db.transaction(IDB_STORE, "readwrite");
          t.objectStore(IDB_STORE).delete(k);
          t.oncomplete = function () { res(true); };
          t.onerror = function () { res(false); };
        } catch (e) { res(false); }
      });
    }).catch(function () { return false; });
  }
/* ==EWCORE:idb:END== */

/* ==EWCORE:bigbox== The big box: what will not fit in the shared 5 MB of localStorage. */
/* ==EWCORE:bigbox== The big box: what will not fit in the shared 5 MB of localStorage. */
  function bigGet(k) {
    if (Object.prototype.hasOwnProperty.call(_big, k)) return _big[k];
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function bigDel(k) { delete _big[k]; idbDel(k); try { localStorage.removeItem(k); } catch (e) {} }
  /* v1.10.0 - THE SAME WRITE, BUT IT ANSWERS.
     bigSet returned true whatever happened: the IndexedDB write is behind a promise and the
     localStorage fallback swallows its own exception. That was tolerable while the big box
     only ever held a CACHE - a catalogue that fails to store is re-fetched tomorrow and
     nobody is worse off. The write journal below is not a cache. It is the only copy of a
     challan a man typed in a basement, and if it did not store, he has to be told NOW, while
     he is still standing there and can write it in the paper book - not in three days when
     somebody notices the delivery is on no screen. */
  function bigSetX(k, v) {
    _big[k] = v;
    return idbSet(k, v).then(function (ok) {
      if (ok) { try { localStorage.removeItem(k); } catch (e) {} return true; }
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
    }).catch(function () {
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
    });
  }
/* ==EWCORE:bigbox:END== */

/* ==EWCORE:webauthn== Face ID / fingerprint plumbing. No PIN passes through any of it. */
/* ==EWCORE:webauthn== Face ID / fingerprint plumbing. No PIN passes through any of it. */
  function b64u(buf) {
    var b = new Uint8Array(buf), s2 = "";
    for (var i = 0; i < b.length; i++) s2 += String.fromCharCode(b[i]);
    return btoa(s2).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randBytes(n) {
    var a = new Uint8Array(n); crypto.getRandomValues(a); return a;
  }
  function bioSaved() {
    try { return JSON.parse(localStorage.getItem(BIO_KEY) || "null"); } catch (e) { return null; }
  }
  function bioAvailable() {
    return !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  }
/* ==EWCORE:webauthn:END== */

/* ==EWCORE:tiny== The three-line helpers every app rewrote. */
  /* ---------- tiny helpers ---------- */
  function el(id) { return document.getElementById(id); }
  function lower(s) { return String(s == null ? "" : s).trim().toLowerCase(); }
  /* Pressing a button is a fresh start - never make a man wait out a backoff he can see. */
  function flushNow() { _flushFails = 0; _flushSkip = 0; flushSoon(); }
/* ==EWCORE:tiny:END== */

/* ==EWCORE:drive== Google Drive picture links, repaired to the one form that renders. */
  /* Normalise any Google-Drive image link to the one lh3 form that actually
     renders inside an <img>: https://lh3.googleusercontent.com/d/{ID}=w200
     The catalogue's "Pic" column mixes two shapes -
       .../d/{ID}=w200            -> works (thumbnail)
       .../d/{ID}/view?usp=w200   -> a Drive *viewer* path, NOT an image -> broken ?
     Grundfos, CPVC, CISTERN, LEO and many Accessory rows were all in the broken
     /view form (verified by load-testing: /view => ERROR, =w200 => loads).
     We repair every Drive link to =w200 here, so on-screen thumbnails, the
     catalogue, the price-list PDF and the quotation PDF all get a loadable URL,
     and any future /view paste self-heals. Non-Drive URLs pass through unchanged. */
  function driveImg(u, size) {
    u = String(u || "").trim();
    if (!u) return "";
    var m = u.match(/\/d\/([A-Za-z0-9_\-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_\-]{20,})/);
    if (!m) return u;
    return "https://lh3.googleusercontent.com/d/" + m[1] + "=w" + (size || 200);
  }
/* ==EWCORE:drive:END== */

/* ==EWCORE:crash== The app may not die silently. Found the hard way, 17 Aug. */
  /* THE ONE HONEST TEST OF "did the app draw itself". The header exists only after a real
     paint, so it cannot be fooled by data merely arriving. S.data could be, and was. */
  function painted() {
    try { return !!document.querySelector(".top"); } catch (e) { return false; }
  }
  function crashPut(where, e) {
    var o = { at: Date.now(), where: where || "", ver: APP_VERSION, user: S.user || "",
              msg: (e && e.message) ? String(e.message) : String(e),
              stack: String((e && e.stack) || "").split("\n").slice(0, 4).join(" | ") };
    try { localStorage.setItem(CRASH_KEY, JSON.stringify(o)); } catch (x) {}
    return o;
  }
  function crashLast() {
    try { return JSON.parse(localStorage.getItem(CRASH_KEY) || "null"); } catch (e) { return null; }
  }
  /* Anything that reaches the top, from anywhere, at any time. If the app never painted, the
     screen is dead anyway and is replaced. If it DID paint, he may be half way through a
     challan - so it says so in a toast and leaves his typing exactly where it is. */
  function crashHandle(where, e) {
    var o = crashPut(where, e);
    if (painted()) { try { toast("Something on that screen could not be drawn — tap ↻. (" + o.msg + ")"); } catch (x) {} }
    else crashScreen(o);
  }
/* ==EWCORE:crash:END== */

/* ==EWCORE:refresh== One tap: the latest book AND the latest build. */
  /* ============ WHAT THE REFRESH BUTTON IS ACTUALLY FOR (17 Aug 2026) ============
     Two different jobs hide behind one arrow, and this app only ever did the first:

       1. pull the book again  — it did this;
       2. come back on the NEW BUILD if one has been put up — it did not, and no screen in
          this app did. A release went up and every phone kept running the old one until
          somebody was rung and told to reinstall.

     WHERE THE VERSION COMES FROM. This app's own file on GitHub Pages, fetched past the
     browser cache, with APP_VERSION read straight out of it. Not the backend: that costs
     Apps Script quota on every tap, it is often the very thing that is down when a man
     reaches for this button, and it can disagree with what is actually served. The file
     cannot disagree with itself.

     AND IT NEVER RELOADS UNDER A MAN WHO IS TYPING. If a form is open it says so and does
     nothing at all — Collection learned that in v1.9.1, when the arrow above an open "Log
     the call" silently ate three lines of notes. */
  function liveVersion() {
    return fetch("index.html?v=" + Date.now(), { cache: "reload" })
      .then(function (r) { return r.text(); })
      .then(function (t) { return (t.match(/APP_VERSION\s*=\s*"([\d.]+)"/) || [])[1] || ""; })
      .catch(function () { return ""; });      /* no signal is not a new version */
  }
  function refreshNow(loud) {
    pull(true);
    liveVersion().then(function (v) {
      if (!v || v === APP_VERSION) { if (loud) toast("This is the latest version (v" + APP_VERSION + ")."); return; }
      S.newVer = v;
      try { render(); } catch (e) {}
      toast("Version " + v + " is ready — tap Update above.");
    });
  }
  /* Only this app's shell, and only this app's worker. All seven apps share one github.io
     origin, so a blanket wipe here takes the other six down with it. */
  function updateNow(prefix) {
    var jobs = [];
    try {
      if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k.indexOf(prefix) === 0; })
                             .map(function (k) { return caches.delete(k); }));
      }));
    } catch (e) {}
    var go = function () { location.replace(location.pathname + "?u=" + Date.now()); };
    if (jobs.length) Promise.all(jobs).then(go, go); else go();
    setTimeout(go, 2500);                      /* never hang on a stuck cache */
  }
  function newVerBar() {
    if (!S.newVer) return "";
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#0f766e;' +
      'color:#fff;font-size:12.5px;font-weight:600">' +
      '<span style="flex:1">Version ' + esc(S.newVer) + ' is ready. You are on ' + esc(APP_VERSION) + '.</span>' +
      '<button class="btn sm" data-act="ver-go" style="background:#fff;color:#0f766e;border-color:#fff">Update</button>' +
            /* .btn.ghost sets a WHITE background, so on this teal band "Later" was white on white -
         invisible. Seen in a screenshot of the real thing, not in the markup. */
      '<button class="btn sm ghost" data-act="ver-later" style="background:transparent;color:#fff;' +
        'border-color:rgba(255,255,255,.55)">Later</button>' +
      '</div>';
  }
/* ==EWCORE:refresh:END== */

/* ==EWCORE:book== Pulling the book, and saying so when it comes back unusable. */
  /* ============ A BOOK WITH NO CLIENTS IS AN ANSWER, NOT A FAILURE ============
     This read `r.clients.length`, so a server that answered perfectly well - ok:true, every
     tab present - was judged UNUSABLE the moment the client list came back empty, and the app
     refused to open at all. From his screen on 17 Aug, in the app's own words:

       asked for the named tabs: server answered ok=true, clients=0,
         tabs=[brands,brandmap,clients,drivers,discounts,challans,returns,audit,associates,sites,pitch]
       then asked for everything: server answered ok=true, clients=0, tabs=[logos,areas,...]

     THE CLIENTS TAB WAS THERE BOTH TIMES. It simply had no rows for that sign-in - while the
     CRM, signed in as admin, was showing a hundred sites off the same sheet at the same
     moment. So the backend is scoping clients to the signed-in man, and this line was turning
     that into a dead end. It is very likely the whole of the original 17 Aug report too: a
     godown sign-in that could not get in, and looked like a network fault.

     Zero clients is something to SAY. It is not a reason to refuse the book. The receipts,
     the approve queue and every challan already on this phone stay usable, and a man who
     cannot start a NEW one is told why instead of being shown a wall. */
  function usableBook(r) {
    return !!(r && r.ok && (Array.isArray(r.clients) || Array.isArray(r.challans)));
  }
  function bookSay(r) {
    if (!r || typeof r !== "object") return "the server sent nothing at all";
    var tabs = Object.keys(r).filter(function (k) { return Array.isArray(r[k]); });
    return "server answered ok=" + String(r.ok) +
      ", clients=" + ((r.clients && r.clients.length) || 0) +
      ", tabs=[" + tabs.join(",") + "]" +
      (r.error ? ", error=" + String(r.error) : "");
  }
  /* ============ THE BOOK COMES DOWN IN PARTS (18 Aug 2026) ============
     "crm app updted in my macbook takes long time to update in godwon android phone."

     It was one call for the whole book before anything new could be shown. The Payment app's
     own comment has carried the size since v1.9.1 - about 680 KB - and a client added on a
     MacBook lives in ONE of those tabs. So `only` is now a parameter: each app asks for the
     half a man is waiting on first, and the history behind it.

     Omitted still means the whole book, which is what the fallback below asks for and what
     anything wanting everything at once should keep asking for. */
  function getBook(only) {
    var want = only || KEEP;
    return api("teamGet", { only: want }).then(function (r) {
      if (usableBook(r)) { BOOKSAY = ""; return r; }
      BOOKSAY = bookSay(r);
      /* the narrow ask came back unusable - try it the way the CRM does, which works */
      return api("teamGet").then(function (r2) {
        if (usableBook(r2)) {
          BOOKSAY = "";
          try { toast("The short list did not come back — pulled the whole book instead."); } catch (e) {}
          return r2;
        }
        BOOKSAY = "asked for the named tabs: " + BOOKSAY + " — then asked for everything: " + bookSay(r2);
        return r2;
      }).catch(function () { return r; });
    });
  }
  /* MERGE, NEVER REPLACE. `S.data = slimBook(r)` threw away every tab the answer did not
     carry. That is right for one call that asks for everything and catastrophic for two calls
     that each ask for half. A tab is only ever overwritten when the server actually sent it
     AS AN ARRAY - so a part that comes back empty, refused or broken leaves what is already on
     the phone exactly where it was. Nothing in here can empty a tab, which matters most in the
     Payment app: a due is challans plus freight, less payments, less returns, and a tab
     silently blanked would show a man as owing more than he does. */
  function mergeBook(r, tabs) {
    if (!S.data) S.data = { ok: true };
    S.data.ok = true;
    if (r && r.user) S.data.user = r.user;
    (tabs || []).forEach(function (k) { if (r && Array.isArray(r[k])) S.data[k] = r[k]; });
    return S.data;
  }
  /* NO LONGER ON THE PULL PATH as of 18 Aug 2026 - mergeBook above replaced it, because this
     one builds a NEW object and so silently drops every tab the answer did not carry. Kept
     because it is still the right shape for a caller that has a whole book in its hand and
     wants only the named tabs out of it. Do not wire it back into a staged pull. */
  function slimBook(r) {
    if (!r || typeof r !== "object") return r;
    var out = { ok: r.ok };
    if (r.user) out.user = r.user;
    KEEP.forEach(function (k) { if (r[k]) out[k] = r[k]; });
    return out;
  }
/* ==EWCORE:book:END== */

/* ==EWCORE:journal== The write journal's shared parts. */
/* ==EWCORE:journal== The write journal's shared parts. */
  function jrnLoad() {
    try { var l = JSON.parse(bigGet(JRN_KEY) || "[]"); return Array.isArray(l) ? l : []; }
    catch (e) { return []; }
  }
  function jrnCount() { return jrnLoad().length; }
  /* Did this entry already land? Deliberately exact and deliberately biased towards keeping:
     every field we sent must already match what the server holds. If ANYTHING differs the
     entry is kept and retried. It can never drop work the server does not have. */
  function jrnLanded(e, srv) {
    if (!srv || !e || !e.row) return false;
    var keys = Object.keys(e.row);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.charAt(0) === "_") continue;                     /* local only, never sent */
      if (k === "updatedAt" || k === "syncedAt") continue;   /* the server's own stamp */
      var a = e.row[k], b = srv[k];
      if (a === null || a === undefined) a = "";
      if (b === null || b === undefined) b = "";
      if (typeof a === "object" || typeof b === "object") {
        var ja = "", jb = "";
        try { ja = JSON.stringify(a); jb = JSON.stringify(b); } catch (x) { return false; }
        if (ja !== jb) return false;
      } else if (String(a).trim() !== String(b).trim()) return false;
    }
    return true;
  }
  function jrnMark(pk, err) {
    var l = jrnLoad();
    l.forEach(function (x) { if (x.pk === pk) { x.err = String(err || "").slice(0, 140); x.tries = (x.tries || 0) + 1; } });
    jrnStore(l);
  }
  function jrnDrop(pk) { jrnStore(jrnLoad().filter(function (x) { return x.pk !== pk; })); }
/* ==EWCORE:journal:END== */

/* ==EWCORE:sw== Registering the service worker. */
/* ==EWCORE:sw== Registering the service worker. */
  function regSW() {
    if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js"); } catch (e) {} }
  }
/* ==EWCORE:sw:END== */
