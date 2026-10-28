/* =====================================================================================================
   EW SITE LEADS - WhatsApp Web collector for the group "PNP Site Location & Measurements"   v2, 28 Oct 2026

   Runs INSIDE his WhatsApp Web tab (pasted by the evening task - WhatsApp's own rules block loading it
   from a server). It reads only the group that is open and sends nothing anywhere except to the Energy
   World CRM tab it opens itself (mukeshenergyworld-ux.github.io/ew-site-crm/team/?sitelead=1), by
   postMessage. The CRM decides new / repeat visit / possible duplicate; this script only collects.

   WHAT THE GROUP LOOKS LIKE (measured 28 Oct): one mapping man posts a site as a short run of messages -
   one or more PHOTOS (caption or none), a LOCATION pin, and often a TEXT with the name and mobile
   (sometimes forwarded, sometimes a reply). So a SITE = one run from one sender: messages with no more
   than 20 minutes between them, cut when a second mobile number appears, or when a new photo / mobile
   arrives after the run already has its pin.

   TWO THINGS WHATSAPP WEB DOES THAT SHAPE THIS:
     - the chat is VIRTUALISED: only the rows on screen exist in the page. So the run is collected while
       SCROLLING DOWN from the oldest wanted day, a screen at a time, and kept by message id.
     - older photos are not downloaded until asked ("173 kB" button). For a photo the CRM does not have,
       that button is pressed (it loads the picture into the chat - nothing is saved to the computer).

   Steps the evening task runs (each a separate javascript call):
     1. paste this file                       -> 'ready'
     2. await EWSL.open()                     -> 'open'  (opens the group from the chat list)
     3. await EWSL.loadBack(3)                -> scrolls up until 3 days back is on screen
     4. EWSL.button()  then CLICK it with the mouse (only a click may open the CRM tab)
     5. EWSL.state                            -> poll until phase is 'done' or 'error' (no photos in it)
   ===================================================================================================== */
(function () {
  if (window.EWSL && window.EWSL.v >= 3) return "ready";
  var CRM = "https://mukeshenergyworld-ux.github.io/ew-site-crm/team/?sitelead=1";
  var CRM_ORIGIN = "https://mukeshenergyworld-ux.github.io";
  var GROUP = "PNP Site Location";
  var GAP_MIN = 20;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function rows() { return Array.prototype.slice.call(document.querySelectorAll("#main [data-id]")); }
  function groupOk() { var h = document.querySelector("#main header"); return !!h && h.innerText.indexOf(GROUP) >= 0; }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  var DM = null;   /* date order of this WhatsApp: "M/D" or "D/M", learnt from the messages */
  function dateOrder() {
    if (DM) return DM;
    var md = 0, dm = 0;
    document.querySelectorAll("#main [data-pre-plain-text]").forEach(function (e) {
      var m = String(e.getAttribute("data-pre-plain-text")).match(/,\s*(\d{1,2})\/(\d{1,2})\/\d{4}\]/);
      if (!m) return; if (+m[1] > 12) dm++; if (+m[2] > 12) md++;
    });
    if (dm || md) DM = dm > md ? "D/M" : "M/D";
    return DM || "M/D";
  }
  function hm(t) {   /* "3:35 PM" -> "15:35" */
    var m = String(t || "").match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/); if (!m) return "";
    var h = +m[1], ap = String(m[3] || "").toUpperCase(); if (ap === "PM" && h < 12) h += 12; if (ap === "AM" && h === 12) h = 0;
    return p2(h) + ":" + m[2];
  }
  function parsePre(s) {   /* "[2:39 PM, 10/28/2026] Sender Name: " */
    var m = String(s || "").match(/^\[([^,\]]+),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*([\s\S]*?):\s*$/);
    if (!m) return null;
    var a = +m[2], b = +m[3], mo = a, d = b;
    if (dateOrder() === "D/M" || a > 12) { d = a; mo = b; }
    return { day: m[4] + "-" + p2(mo) + "-" + p2(d), time: hm(m[1]), who: m[5].trim() };
  }
  function mins(a, b) { return Math.abs(Date.parse(a + ":00") - Date.parse(b + ":00")) / 60000; }
  function key(id) { var p = String(id || "").split("_"); return (p.length >= 3 ? p[2] : String(id || "")).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 90); }
  function locOf(r) {
    var a = r.querySelector('a[href*="maps.google"], a[href*="google.com/maps"], a[href*="maps?q"], a[href*="/maps/"]');
    if (!a) return null;
    var h = ""; try { h = decodeURIComponent(a.href); } catch (e) { h = a.href; }
    var m = h.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
    return m ? { lat: +m[1], lng: +m[2] } : null;
  }
  function textOf(r) {   /* the message's own words: the LAST selectable span (a reply shows the quoted words first) */
    var s = r.querySelectorAll("span.selectable-text");
    return s.length ? String(s[s.length - 1].innerText || "").replace(/\s+/g, " ").trim() : "";
  }
  function isPhoto(r) { return !!(r.querySelector('img[src^="blob:"]') || r.querySelector('[role="button"][aria-label="Open picture"], [aria-label="Open picture"]')); }
  function dlButton(r) {
    return Array.prototype.slice.call(r.querySelectorAll('[role="button"], button')).filter(function (x) { return /^\s*[\d.]+\s*(kB|KB|MB)\s*$/.test(x.innerText || ""); })[0] || null;
  }
  function phoneIn(t) { var m = String(t || "").match(/(?:\+?91[\s-]*)?([6-9]\d{4})[\s-]?(\d{5})(?!\d)/); return m ? m[1] + m[2] : ""; }
  /* ---------------- collect, a screen at a time ---------------- */
  var MSG = {}, ORDER = [];
  function grab(need) {
    var R = rows(), jobs = [];
    var lastPre = null;
    R.forEach(function (r) {
      var id = r.getAttribute("data-id"); if (!id) return;
      var pp = r.querySelector("[data-pre-plain-text]");
      var pre = pp ? parsePre(pp.getAttribute("data-pre-plain-text")) : null;
      var m = MSG[id];
      if (!m) { m = MSG[id] = { id: id, k: key(id), pre: pre, ll: locOf(r), photo: isPhoto(r), text: textOf(r), t: hm((String(r.innerText || "").match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])\s*$/) || [])[1] || ""), b64: "" }; ORDER.push(id); }
      else { if (!m.pre && pre) m.pre = pre; if (!m.ll) m.ll = locOf(r); if (!m.text) m.text = textOf(r); if (!m.photo) m.photo = isPhoto(r); }   /* a row is often drawn before its picture */
      if (m.photo && !m.b64 && !m.tried && need(m)) { m.tried = 1; jobs.push(exportRow(r).then(function (b) { m.b64 = b; })); }
    });
    return Promise.all(jobs);
  }
  function exportRow(r) {
    var b = r.querySelector('img[src^="blob:"]') ? null : dlButton(r);
    if (b) { try { b.click(); } catch (e) { } }
    return new Promise(function (res) {
      var tries = 0;
      (function look() {
        var img = r.querySelector('img[src^="blob:"]');
        if ((!img || !img.complete || !img.naturalWidth) && ++tries < 20) return setTimeout(look, 500);
        if (!img || !img.naturalWidth) return res("");
        try {
          var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, 1280 / Math.max(w, h));
          var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.75).split(",")[1] || "");
        } catch (e) { res(""); }
      })();
    });
  }
  function scroller() {
    var r = rows()[0]; var p = r ? r.parentElement : null;
    while (p && !(p.scrollHeight > p.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    return p;
  }
  function earliest() {
    var e = document.querySelector("#main [data-pre-plain-text]");
    var p = e ? parsePre(e.getAttribute("data-pre-plain-text")) : null;
    return p ? p.day : "";
  }
  function loadBack(days) {
    var cut = new Date(Date.now() - (days || 2) * 86400000 + 19800000).toISOString().slice(0, 10);
    var sc = scroller(), k = 0;
    if (!sc) return Promise.resolve({ ok: false, why: "chat not open" });
    function step() {
      var e = earliest(); if (e && e < cut) return Promise.resolve({ ok: true, earliest: e });
      if (++k > 80) return Promise.resolve({ ok: true, earliest: e, capped: 1 });
      var before = sc.scrollHeight; sc.scrollTop = 0;
      return wait(1600).then(function () {
        if (sc.scrollHeight > before) return step();
        return wait(2200).then(function () { return sc.scrollHeight > before ? step() : { ok: true, earliest: earliest(), top: 1 }; });
      });
    }
    return step();
  }
  function sweep(need, onStep) {   /* from where the view is now, down to the newest message */
    var sc = scroller(); if (!sc) return Promise.resolve(0);
    var n = 0;
    function step() {
      return grab(need).then(function () {
        if (onStep) onStep();
        var atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 8;
        if (atEnd || ++n > 400) return n;
        sc.scrollTop = sc.scrollTop + Math.round(sc.clientHeight * 0.7);
        return wait(900).then(step);
      });
    }
    return step();
  }
  /* ---------------- messages -> sites ---------------- */
  function sites() {
    var ms = ORDER.map(function (id) { return MSG[id]; });
    /* a photo without a caption carries no sender/date: take them from its neighbours */
    var lastPre = null;
    ms.forEach(function (m) { if (m.pre) lastPre = m.pre; else if (lastPre) m.pre0 = lastPre; });
    var nextPre = null;
    for (var i = ms.length - 1; i >= 0; i--) { if (ms[i].pre) nextPre = ms[i].pre; else if (!ms[i].pre0 && nextPre) ms[i].pre0 = nextPre; }
    ms.forEach(function (m) {
      var p = m.pre || m.pre0; m.who = p ? p.who : "";
      var t = (m.pre && m.pre.time) || m.t || (p && p.time) || "00:00";
      m.at = p ? p.day + "T" + t : "";
    });
    var out = [], cur = null;
    function close() { if (cur && (cur.phone || cur.ll || cur.photos.length)) out.push(cur); cur = null; }
    ms.forEach(function (m) {
      if (!m.at || !m.who) return;
      var ph = phoneIn(m.text);
      var cut = !cur || cur.who !== m.who || mins(cur.lastAt, m.at) > GAP_MIN ||
        (ph && cur.phone && ph !== cur.phone) || (cur.ll && (m.photo || (ph && !cur.phone && cur.photos.length)));
      if (cut) { close(); cur = { who: m.who, at: m.at, lastAt: m.at, ids: [], texts: [], phone: "", ll: null, photos: [] }; }
      cur.ids.push(m.k); cur.lastAt = m.at;
      if (m.text) { if (ph) cur.texts.unshift(m.text); else cur.texts.push(m.text); }
      if (ph && !cur.phone) cur.phone = ph;
      if (m.ll && !cur.ll) cur.ll = m.ll;
      if (m.photo) cur.photos.push(m);
    });
    close();
    return out.map(function (s) {
      var ph = s.photos.filter(function (m) { return m.b64; })[0] || null;
      return { waId: s.ids[0], ids: s.ids, at: s.at, poster: s.who, caption: s.texts.join(" | ").slice(0, 600),
        lat: s.ll ? s.ll.lat : 0, lng: s.ll ? s.ll.lng : 0, b64: ph ? ph.b64 : "", photos: s.photos.length };
    });
  }
  function preview() {   /* nothing private leaves: mobiles masked, no photos */
    return sites().map(function (s) { return s.at + " " + s.poster + " | " + s.caption.replace(/\d{10}/g, "##########").slice(0, 70) + (s.lat ? " [pin]" : "") + " [" + s.photos + " photo]"; });
  }
  function open() {
    if (groupOk()) return Promise.resolve("open");
    var t = Array.prototype.slice.call(document.querySelectorAll('#pane-side span[title]')).filter(function (s) { return s.getAttribute("title").indexOf(GROUP) >= 0; })[0];
    if (!t) return Promise.resolve("not in the chat list - search for it");
    var ev = function (type) { t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); };
    ev("mousedown"); ev("mouseup"); ev("click");
    return wait(2500).then(function () { return groupOk() ? "open" : "not opened"; });
  }
  function waitMsg(type, ms) {
    return new Promise(function (res, rej) {
      var f = function (e) {
        if (e.origin !== CRM_ORIGIN || !e.data || e.data.ew !== type) return;
        clearTimeout(t); window.removeEventListener("message", f); res(e.data);
      };
      var t = setTimeout(function () { window.removeEventListener("message", f); rej(new Error("no answer from the CRM (" + type + ")")); }, ms);
      window.addEventListener("message", f);
    });
  }
  function label(t) { var b = document.getElementById("ewsl-btn"); if (b) b.textContent = t; }
  function run() {
    var st = EWSL.state = { phase: "opening", found: 0, todo: 0, sent: 0, sum: { added: 0, visits: 0, skipped: 0, flagged: 0, photoFail: 0, names: [] }, err: "" };
    if (!groupOk()) { st.phase = "error"; st.err = "The PNP group is not open"; return Promise.resolve(st); }
    var win = window.open(CRM, "ewsitelead");   /* must stay the first thing after the click */
    if (!win) { st.phase = "error"; st.err = "The browser blocked the CRM tab"; return Promise.resolve(st); }
    label("EW: waiting for the CRM...");
    var seen = {};
    return waitMsg("sitelead-ready", 180000).then(function (rd) {
      if (!rd.ok) throw new Error("The CRM is not signed in as the owner");
      (rd.seen || []).forEach(function (s) { seen[s] = 1; });
      st.phase = "reading"; label("EW: reading the group...");
      return sweep(function (m) { return !seen[m.k]; }, function () { st.read = ORDER.length; });
    }).then(function () {
      var all = sites(); st.found = all.length;
      var todo = all.filter(function (s) { return !s.ids.some(function (k) { return seen[k]; }); });
      st.todo = todo.length; st.sum.skipped = all.length - todo.length; st.phase = "sending";
      var i = 0;
      function next() {
        if (i >= todo.length) return null;
        var batch = todo.slice(i, i + 2); i += 2;
        label("EW: sending " + Math.min(i, todo.length) + " of " + todo.length + "...");
        win.postMessage({ ew: "sitelead-items", batch: i, items: batch }, CRM_ORIGIN);
        return waitMsg("sitelead-done", 240000).then(function (d) {
          if (!d.ok) throw new Error(d.error || "the CRM refused");
          var s = d.sum || {};
          ["added", "visits", "skipped", "flagged", "photoFail"].forEach(function (k) { st.sum[k] += s[k] || 0; });
          (s.names || []).forEach(function (n) { st.sum.names.push(n); });
          if (s.photoErr) st.photoErr = s.photoErr;
          if (s.err) st.crmErr = s.err;
          st.sent += batch.length;
          return next();
        });
      }
      return next();
    }).then(function () {
      st.phase = "done";
      label("EW: done - " + st.sum.added + " new, " + st.sum.visits + " updates, " + st.sum.flagged + " to check");
      return st;
    }, function (e) { st.phase = "error"; st.err = String((e && e.message) || e); label("EW: " + st.err); return st; });
  }
  function button() {
    var b = document.getElementById("ewsl-btn");
    if (!b) {
      b = document.createElement("button"); b.id = "ewsl-btn";
      b.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:99999;min-height:52px;padding:12px 20px;font:600 16px system-ui;" +
        "background:#0A4F94;color:#fff;border:0;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer";
      b.addEventListener("click", function () { run(); });
      document.body.appendChild(b);
    }
    b.textContent = "Send site leads to EW CRM";
    var r = b.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }
  window.EWSL = { v: 3, open: open, loadBack: loadBack, sweep: sweep, sites: sites, preview: preview, button: button, run: run, state: null, earliest: earliest,
    reset: function () { MSG = {}; ORDER = []; } };
  return "ready";
})();
