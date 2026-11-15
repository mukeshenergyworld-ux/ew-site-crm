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
        /* ============ THE DOOR THAT LATCHED SHUT (v6.9.391) ============
           The timeout below exists so the app never waits on storage to start. It answered
           null - correctly - and then left that null CACHED IN _idbP, where it stood for the
           rest of the page. Every later read and every later write got "this browser has no
           IndexedDB" from a browser that has it and had merely been slow for one moment.

           That is not a small window. v6.9.257 moved the catalogue, the offline book and the
           logo cache into IndexedDB and REMOVES the localStorage copy once IndexedDB confirms
           the write. So on a device that has already migrated, one slow open means: the
           catalogue reads as absent, the saved book reads as absent, the logos read as absent,
           and nothing saved during that whole session is kept. The app carries on and says
           nothing, because every one of those paths is written to treat "not there" as normal.

           Found on 1 Sep chasing an empty brand grid. An empty grid is what an empty PRODUCTS
           looks like, and this is one of the ways PRODUCTS ends up empty.

           A SLOW OPEN IS NOT AN ANSWER. If the door opens late, put the real door back. */
        rq.onsuccess = function () {
          if (done) _idbP = Promise.resolve(rq.result);
          fin(rq.result);
        };
        /* onerror and onblocked ARE answers. A browser that refuses stays refused, and
           re-opening it on every read would be noise. Only the timeout un-latches. */
        rq.onerror = function () { fin(null); };
        rq.onblocked = function () { fin(null); };
        /* Safari in private mode can leave open() hanging forever. The app must never wait
           on storage to start - it falls back to localStorage and carries on.
           v6.9.391 - and _idbP is cleared, so the NEXT caller knocks again instead of
           inheriting this one's shrug. */
        setTimeout(function () { if (!done) { _idbP = null; fin(null); } }, 2500);
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
  /* ============ THE BANNER NOBODY EVER FIRED (30 Aug 2026) ============
     HE REPORTED IT, and he was right: "for same client different balances on CRM and collection
     app". The arithmetic had been fixed and verified live five days running. His PHONE was still
     showing the old one, because the new build had never reached it.

     Every one of these apps has a "Version X is ready - Update" bar. liveVersion() is what sets
     it, and liveVersion() was called from exactly ONE place: refreshNow(), which is the manual
     Refresh button. Nothing checked on boot, nothing checked on a timer. A man who never taps
     Refresh runs whatever build his phone cached, for ever, while the shelf-first worker quietly
     serves him yesterday.

     That is worse than any wrong figure on this list, because it makes every OTHER fix optional.

     The workers already do the hard half: since 29 Aug ewShelf compares the ETag it served with
     the ETag that came back and posts "new-build" to the page. Nothing was listening. This
     listens, and confirms with liveVersion() before it says anything - the message is a hint,
     the version string is the proof, so a changed icon can never raise a false banner.
     It costs no extra network: that revalidation was happening anyway. */
  function verWatch() {
    try {
      if (!navigator.serviceWorker || !navigator.serviceWorker.addEventListener) return;
      navigator.serviceWorker.addEventListener("message", function (e) {
        if (!e || !e.data || e.data.ew !== "new-build") return;
        if (String(e.data.url || "").indexOf("app.js") >= 0) return;   /* that one is the CRM's */
        liveVersion().then(function (v) {
          if (!v || v === APP_VERSION || v === S.newVer) return;
          S.newVer = v;
          try { render(); } catch (x) {}
          try { toast("Version " + v + " is ready - tap Update above."); } catch (x) {}
        });
      });
    } catch (e) {}
  }
  /* ============ "NO ANSWER" IS NOT "UP TO DATE" (30 Aug 2026) ============
     liveVersion() ends in .catch(return "") - correct, because no signal is not a new version.
     But this line then read that empty string as `!v` and said "This is the latest version",
     out loud, with a version number on it. A check that never reached the server reported
     success. On a phone in a godown that is the most common outcome there is, and it is the
     one answer that stops a man looking further.

     Say which of the two actually happened. Nothing else changes: an unreachable server still
     raises no banner. */
  function refreshNow(loud) {
    rawbDropLive();   /* the arrow answers with the truth the FIRST time */
    pull(true);
    liveVersion().then(function (v) {
      if (!v) { if (loud) toast("Could not check for a new version — you are on v" + APP_VERSION + "."); return; }
      if (v === APP_VERSION) { if (loud) toast("This is the latest version (v" + APP_VERSION + ")."); return; }
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
  /* ============ "USABLE" MEANS "CARRIES WHAT I ASKED FOR" (29 Aug 2026) ============
     usableBook asks whether an answer holds clients or challans, because that is what makes a
     WHOLE book usable. Applied to a NARROW ask it is simply the wrong question.

     FOUND BY OPENING THE APP AND READING THE TOAST, not by reasoning. The Payment app's second
     call asks for ["audit"] and nothing else, so its answer can never hold clients or challans -
     and this line therefore threw away a perfectly good reply and re-pulled the ENTIRE book,
     every time, on every open, for every collector, while toasting "the short list did not come
     back" as it did so.

     Measured against the live backend the same minute: the narrow ask is 466 KB; the fallback it
     was triggering is 838 KB. The staged pull was costing MORE than the single call it replaced.

     A NAMED ask is usable when it carries the tabs it named. An unnamed ask - the fallback below,
     and anything that wants everything - is judged exactly as before. */
  function askedFor(r, only) {
    if (!r || !r.ok) return false;
    if (!only || !only.length) return usableBook(r);
    for (var i = 0; i < only.length; i++) if (!Array.isArray(r[only[i]])) return false;
    return true;
  }
  function getBook(only) {
    var want = only || KEEP;
    return teamGetD({ only: want }).then(function (r) {
      if (askedFor(r, only)) { BOOKSAY = ""; return r; }
      BOOKSAY = bookSay(r);
      /* the narrow ask came back unusable - try it the way the CRM does, which works */
      return teamGetD({}).then(function (r2) {
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
      /* v6.9.365 - createdAt joins them. It is a STAMP, not content: it can never answer
         "did my save land?", and from this release the client puts one on every new row while
         a row already on the sheet carries whatever the server stamped before. Comparing them
         would report a landed save as unsent and send it a second time. */
      if (k === "updatedAt" || k === "syncedAt" || k === "createdAt") continue;   /* the server's own stamp */
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


/* ==EWCORE:download== Handing a finished file to the man holding the phone. Byte-identical in all three apps. */
  function canShareFile() {
    try {
      if (!navigator.share || !navigator.canShare) return false;
      return navigator.canShare({ files: [new File(["x"], "x.pdf", { type: "application/pdf" })] });
    } catch (e) { return false; }
  }

  function dlBlob(blob, fname) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = fname; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); } catch (e) { } }, 1500);
    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) { } }, 120000);
  }

  function dlFresh() { return Date.now() - _dlTap < 3500; }

  /* ================= WHERE THE FILE WENT, ON A PHONE  (CRM 6.9.701 / Challan 1.127.0 / Collect 1.63.0, 6 Oct 2026) =================
     HIS WORDS: "in mobile its not showing where pdf is downloading, can we put a download folder or what
     alternate we can do?". A web page cannot choose the folder a file lands in - the phone decides
     (iPhone: Files > Downloads; Android: Downloads). So the file still downloads exactly as before
     (6.9.664), and on a phone a panel then says where it went and offers the two things a phone CAN
     do with it: Open it now, or Save / send it - the share sheet, where "Save to Files" lets him
     pick any folder (iCloud Drive, On My iPhone, Google Drive) and WhatsApp takes the file itself.
     A laptop is left alone: its browser already shows the download. */
  function dlIsPhone() {
    var ua = String((navigator && navigator.userAgent) || "");
    return /Android|iPhone|iPod/i.test(ua) || (/iPad|Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  }

  function dlPanel(blob, fname, ready) {
    try {
      if (!blob || !dlIsPhone()) return;
      var old = document.getElementById("ewdl"); if (old && old.parentNode) old.parentNode.removeChild(old);
      var type = blob.type || (/\.xlsx$/i.test(fname) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf");
      var file = null; try { file = new File([blob], fname, { type: type }); } catch (e) { file = null; }
      var canSh = false; try { canSh = !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { canSh = false; }
      var url = URL.createObjectURL(blob);
      var box = document.createElement("div");
      box.id = "ewdl";
      box.setAttribute("style", "position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 8px);z-index:10000;"   /* at the top: the app's own toasts live at the bottom */ +
        "background:#0f172a;color:#fff;border-radius:14px;padding:12px 12px 10px;box-shadow:0 6px 24px rgba(15,23,42,.35);" +
        "font:500 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto");
      var nm = document.createElement("div");
      nm.setAttribute("style", "font-weight:700;font-size:13.5px;word-break:break-all");
      nm.textContent = (ready ? "Your file is ready \u2014 " : "\u2713 Downloaded \u2014 ") + fname;
      var where = document.createElement("div");
      where.setAttribute("style", "font-size:12.5px;color:#cbd5e1;margin-top:3px");
      where.innerHTML = (ready ? "It took a moment to build. Tap <b>Download</b> to save it." : dlWhereSay()) + (!canSh ? "" : /Android/i.test(String(navigator.userAgent || ""))
        ? " To put it in Drive or send it on WhatsApp, tap <b>Save to\u2026 / Send</b>."
        : " To keep it in a folder of your choice, tap <b>Save to\u2026</b> and pick <b>Save to Files</b>.");
      var row = document.createElement("div");
      row.setAttribute("style", "display:flex;gap:8px;margin-top:9px;flex-wrap:wrap");
      var btn = function (label, main, fn) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.setAttribute("style", "min-height:44px;padding:0 14px;border-radius:10px;font:700 13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
          "border:1px solid " + (main ? "#14b8a6" : "#475569") + ";background:" + (main ? "#0f766e" : "transparent") + ";color:#fff;cursor:pointer;flex:" + (main ? "1 1 auto" : "0 0 auto"));
        b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
        row.appendChild(b);
      };
      var close = function () { if (box.parentNode) box.parentNode.removeChild(box); setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { } }, 60000); };
      if (ready) btn("Download", true, function () { dlBlob(blob, fname); nm.textContent = "\u2713 Downloaded \u2014 " + fname; where.innerHTML = dlWhereSay(); });
      btn("Open", !canSh && !ready, function () { var w = null; try { w = window.open(url, "_blank"); } catch (e) { w = null; } if (!w) { var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); } });   /* never navigate the app itself away */
      if (canSh) btn("Save to… / Send", !ready, function () { navigator.share({ files: [file], title: fname }).then(close, function () { }); });
      btn("Close", false, close);
      box.appendChild(nm); box.appendChild(where); box.appendChild(row);
      document.body.appendChild(box);
      setTimeout(function () { if (document.getElementById("ewdl") === box) close(); }, 60000);
    } catch (e) { }
  }

  function dlWhereSay() {
    var ua = String((navigator && navigator.userAgent) || "");
    if (/Android/i.test(ua)) return "It is in your phone’s <b>Downloads</b> folder (also in the notification at the top).";
    return "It is in the <b>Files</b> app → <b>Downloads</b> (or tap ⬇ in Safari’s address bar).";
  }

  /* the word on the button: every PDF button downloads now (6.9.664) */
  function pdfBtnLabel(base) { return base; }

  /* ================= WHO TOOK THIS FILE, AND WHEN  (6.9.578 / 1.86.0 / 1.46.0) =================
     His words: "mention file download date and time and by whom for every file download, in very
     small font in any corner of the page, not highlighted". One line, 5 pt, pale grey, bottom
     right of every page. Once per document. */
  function pdfDlStamp(doc) {
    try {
      if (!doc || doc._dlStamped) return;
      doc._dlStamped = true;
      var d = new Date(), p2 = function (n) { return (n < 10 ? "0" : "") + n; };
      var line = "Downloaded " + p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear() + " " +
        p2(d.getHours()) + ":" + p2(d.getMinutes()) + (S && S.user ? " by " + String(S.user) : "");
      var n = doc.getNumberOfPages(), cur = doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : n;
      var fs = doc.getFontSize(), tc = doc.getTextColor ? doc.getTextColor() : null;
      for (var i = 1; i <= n; i++) {
        doc.setPage(i);
        var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
        doc.setFontSize(5); doc.setTextColor(170, 178, 190);
        doc.text(line, W - 4, H - 2.5, { align: "right" });
      }
      doc.setPage(cur); doc.setFontSize(fs);
      if (tc) { try { doc.setTextColor(tc); } catch (e) { doc.setTextColor(0, 0, 0); } }
    } catch (e) { }
  }

  function pdfOut(doc, fname, title) {
    pdfDlStamp(doc);   /* 6.9.578 - who took it, and when */
    /* 6.9.664 / 1.118.0 / 1.58.0 - HIS WORDS: "its not downloading pdf, its very time consuming,
       change everywhere to download pdf". Every PDF downloads at once: no "Your PDF is ready"
       choice and no share sheet (Safari on a Mac says it can share a file, so "Download" opened
       the share sheet and no file came). WhatsApp and Telegram keep their own buttons. */
    var now = Date.now();
    if (now - _pdfOutAt < 2000) return Promise.resolve(false);   /* the same press twice */
    _pdfOutAt = now;
    if (dlIsPhone()) {   /* 6.9.703 - never jsPDF's save on a phone, and only inside a fresh tap */
      var _fn = String(fname || "document.pdf"), _bl = doc.output("blob");
      if (dlFresh()) { dlBlob(_bl, _fn); dlPanel(_bl, _fn, false); } else dlPanel(_bl, _fn, true);
      return Promise.resolve(true);
    }
    doc.save(String(fname || "document.pdf"));
    return Promise.resolve(true);
  }
/* ==EWCORE:download:END== */


/* ==EWCORE:rawbook== The raw book a phone keeps when the shelf will not hold it, and the version watch. */

  function rawbDropLive() {
    for (var i = 0; i < LIVE_TABS.length; i++) { delete RAWB.t[LIVE_TABS[i]]; delete RAWB.h[LIVE_TABS[i]]; }
  }

  function rawbReset() { RAWB = { u: String(S.user || ""), t: {}, h: {} }; }

  function teamGetD(extra, again) {
    if (RAWB.u !== String(S.user || "")) rawbReset();
    var ask = Object.assign({}, extra || {}, { have: RAWB.h });
    return api("teamGet", ask).then(function (r) {
      if (!r || !r.ok) return r;
      var dl = r._delta || null, hh = r._h || null, bad = false;
      delete r._delta; delete r._h;
      if (dl) Object.keys(dl).forEach(function (k) {
        if (RAWB.t[k] == null) { bad = true; return; }
        try { r[k] = JSON.parse(RAWB.t[k]).concat(dl[k] || []); } catch (e) { bad = true; }
      });
      if (!bad && hh) Object.keys(hh).forEach(function (k) { if (!Array.isArray(r[k]) || r[k].length !== Number(hh[k][0])) bad = true; });
      if (bad) { rawbReset(); return again ? r : teamGetD(extra, true); }
      if (hh) Object.keys(hh).forEach(function (k) { if (Array.isArray(r[k])) { RAWB.t[k] = JSON.stringify(r[k]); RAWB.h[k] = hh[k]; } });
      return r;
    });
  }

/* ==EWCORE:rawbook:END== */


/* ==EWCORE:money== THE MONEY RULES THE TWO FIELD APPS SHARE. 15 Nov 2026 - the Payment app and the Challan app spent a month crediting a return and pricing a brand differently from the CRM: Rs 2,12,214 over-credited and Rs 2,16,742 over-chased, both from one rule living in three files. Nineteen money functions live in more than one app and nine have drifted. These are the ones that had NOT drifted between these two; from here they cannot, because the build refuses unless both still read the same.
     THE CRM IS DELIBERATELY NOT IN THIS LIST, and the reason is worth writing down. Its EW-CORE block sits at a different scope from its own functions - idbOpen, which has been in it since August, is not top-level in the CRM while it is in both field apps. Moving a CRM function in would put it where fn_map cannot see it, and the build would be unable to prove the function had not changed. A proof that cannot see the thing it is proving is worth nothing, so the CRM is held to the same rules by TEST instead, until its block is moved to its own top level. That move is its own job, on its own day. */
  function hisabOwed(c) { return hisabCounts(c) && (!HISAB_GATE || !hisabBookReady() || inHisab(c)); }

  /* THE RATE THAT WAS IN FORCE ON A GIVEN DAY. clientDiscount() answers "what is this client's
     discount now", which is the right question when pricing something today and the WRONG one
     when asking whether a delivery already made was priced correctly. v6.9.350 built dated rates
     precisely so that "deliveries BEFORE this date keep the rate they were made at" - and then
     chDiscGap compared every challan ever made against today's rate anyway. */
  function clientDiscountOn(client, brand, ymd) { var d = discRow(client, brand, ymd); return d ? Number(d.pct) || 0 : 0; }

  /* NO dstr() IN HERE, AND THAT IS DELIBERATE. This block is shared byte-for-byte with the
     Challan app, and the two apps have a function called dstr that does OPPOSITE things: in the
     CRM it truncates to "2026-08-01", in the Challan app it FORMATS to "1 Aug 2026". Calling it
     here read every dated rate as undated in the Challan app - so a challan would have been
     priced at the old percent while the CRM used the new one, silently, and nothing on either
     screen would have said so. Caught by t_apps_agree the moment the port landed, which is what
     that suite is for. Ten characters of slicing, no shared name, no trap. */
  function discFrom(row) {
    var f = String((incMap(row) || {}).from || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : "";
  }

  function incMap(row) {
    try { var m = JSON.parse((row && row.notes) || "{}"); return (m && typeof m === "object") ? m : {}; } catch (e) { return {}; }
  }

  /* v6.9.392 - AND ONE READER FOR A PAYMENT AMOUNT, for exactly the reason above.
     Sixteen sites read it with raw Number(). A payment is typed by a man on a phone and lands
     in the sheet as text, so "1,00,000" reads back as NaN, and every `|| 0` beside it turns
     that into ZERO - a payment received, recorded, and then counted as nothing.

     Where that would have shown: the client's HISAB ledger, the dues on the collection round,
     the incentive ratio (collected / billed), the twice-weekly Telegram digest, the CSV export,
     the duplicate-payment guard - and the STATEMENT PDF THAT IS SENT TO THE CUSTOMER. Every
     one of them would have been wrong in the firm's favour, and the customer holding the
     statement would have been the only person able to see it.

     MEASURED 31 Aug on his own book: 26 payments, 164 openings, 141 freights - ZERO affected
     today. Latent, not live. It stays latent only until somebody types a comma.
     (Not re-counted today: his browser is not reachable this session. That measurement's date
     is stated rather than implied, because a stale count presented as fresh is its own fault.)

     hisabPayable read the same money TWICE, six lines apart - one line nAmt, the next Number.
     That is what a rule without a single reader looks like after three months. */
  function payAmt(p) { return nAmt((p || {}).amount); }

  function isJobLine(l) { return !!(l && (l.job === true || String(l.code || "") === JOB_CODE)); }
function rnLines(r) {
    var items = [];
    try { items = JSON.parse(r.itemsJson || "[]"); } catch (e) { items = []; }
    return items.filter(Boolean);
  }

  function dedupe(list) {
    var seen = {};
    (list || []).slice().sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    }).forEach(function (c) { seen[String(c.challanNo || c.id)] = c; });
    return Object.keys(seen).map(function (k) { return seen[k]; });
  }

  function hisabExtraOf(c) { return ((c && c.id) ? (Number(hisabExtraMap()[c.id]) || 0) : 0) + Math.max(0, nAmt(c && c.discAmt)); }
/* ==EWCORE:money:END== */


