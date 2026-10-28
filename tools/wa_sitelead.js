/* =====================================================================================================
   EW SITE LEADS - WhatsApp Web collector for the group "PNP Site Location & Measurements"  (28 Oct 2026)

   Runs INSIDE his WhatsApp Web tab (pasted by the evening task, never loaded from a server - WhatsApp's
   own rules block that). It reads only the group that is open, only what is on screen after scrolling
   back, and sends nothing anywhere except to the Energy World CRM tab it opens itself
   (mukeshenergyworld-ux.github.io/ew-site-crm/team/?sitelead=1), by postMessage.

   A site, in that group, is two messages from the same man: a PHOTO whose caption is
       "<name> <mobile> <address> Ar. <architect>"
   and, next to it, a LOCATION pin. They are paired here (same sender, within 20 minutes). A photo
   with no pin still goes (no map); a pin with no photo still goes (map only).

   The CRM decides new / repeat visit / possible duplicate - this script only collects. Before any
   photo is exported the CRM says which message ids it already has, so a site is never sent twice.

   Steps the evening task runs (each a separate javascript call):
     1. paste this file                       -> 'ready'
     2. EWSL.open()                           -> opens the group if it is not open (search box)
     3. await EWSL.loadBack(3)                -> scrolls up until 3 days are on screen
     4. EWSL.preview()                        -> how many sites, no photos (safe to print)
     5. EWSL.button()  then CLICK the button with the mouse (a new tab may only be opened by a click)
     6. EWSL.state                            -> poll until phase is 'done' (or 'error')
   ===================================================================================================== */
(function () {
  if (window.EWSL && window.EWSL.v >= 1) return "ready";
  var CRM = "https://mukeshenergyworld-ux.github.io/ew-site-crm/team/?sitelead=1";
  var CRM_ORIGIN = "https://mukeshenergyworld-ux.github.io";
  var GROUP = "PNP Site Location";
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function rows() { return Array.prototype.slice.call(document.querySelectorAll("#main [data-id]")); }
  function groupOk() { var h = document.querySelector("#main header"); return !!h && h.innerText.indexOf(GROUP) >= 0; }
  var DM = null;   /* date order: "M/D" or "D/M" - read from the messages themselves */
  function dateOrder() {
    if (DM) return DM;
    var md = 0, dm = 0;
    document.querySelectorAll("#main [data-pre-plain-text]").forEach(function (e) {
      var m = String(e.getAttribute("data-pre-plain-text")).match(/,\s*(\d{1,2})\/(\d{1,2})\/\d{4}\]/);
      if (!m) return; if (+m[1] > 12) dm++; if (+m[2] > 12) md++;
    });
    DM = dm > md ? "D/M" : "M/D";
    return DM;
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function parsePre(s) {   /* "[2:39 PM, 10/28/2026] Sender Name: " */
    var m = String(s || "").match(/^\[(\d{1,2}):(\d{2})\s*([AaPp][Mm])?,\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*([\s\S]*?):\s*$/);
    if (!m) return null;
    var h = +m[1], mi = +m[2], ap = String(m[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12; if (ap === "AM" && h === 12) h = 0;
    var a = +m[4], b = +m[5], mo = a, d = b;
    if (dateOrder() === "D/M" || a > 12) { d = a; mo = b; }
    return { at: m[6] + "-" + p2(mo) + "-" + p2(d) + "T" + p2(h) + ":" + p2(mi), who: m[7].trim() };
  }
  function mins(a, b) { return Math.abs(Date.parse(a + ":00") - Date.parse(b + ":00")) / 60000; }
  function key(id) {
    var parts = String(id || "").split("_");
    var k = parts.length >= 3 ? parts[2] : String(id || "");
    return k.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 90);
  }
  function locOf(r) {
    var a = r.querySelector('a[href*="maps.google"], a[href*="google.com/maps"], a[href*="maps?q"], a[href*="/maps/"]');
    if (!a) return null;
    var h = ""; try { h = decodeURIComponent(a.href); } catch (e) { h = a.href; }
    var m = h.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
    return m ? { lat: +m[1], lng: +m[2] } : null;
  }
  function capOf(r) {
    var c = r.querySelector('[data-testid="image-caption"] span, span.selectable-text');
    return c ? String(c.innerText || "").trim() : "";
  }
  function photoOf(r) { return r.querySelector('img[src^="blob:"]') || null; }
  function hasPhoto(r) { return !!(photoOf(r) || r.querySelector('img[src^="data:image"]') || r.querySelector('[data-icon="media-download"], [data-testid="image-thumb"]')); }
  function scan() {
    var msgs = rows().map(function (r) {
      var pp = r.querySelector("[data-pre-plain-text]");
      return { id: r.getAttribute("data-id"), el: r, pre: pp ? parsePre(pp.getAttribute("data-pre-plain-text")) : null,
        ll: locOf(r), photo: hasPhoto(r), cap: capOf(r) };
    });
    for (var i = 0; i < msgs.length; i++) if (!msgs[i].pre) msgs[i].pre = (msgs[i + 1] && msgs[i + 1].pre) || (msgs[i - 1] && msgs[i - 1].pre) || null;
    var items = [], used = {};
    msgs.forEach(function (m, i) {
      if (!m.photo || !m.pre) return;
      var loc = null, j, q;
      for (j = i + 1; j < Math.min(msgs.length, i + 6) && !loc; j++) {
        q = msgs[j]; if (!q.pre || q.pre.who !== m.pre.who) continue;
        if (q.ll && !used[j] && mins(q.pre.at, m.pre.at) <= 20) { loc = q; used[j] = 1; break; }
        if (q.photo) break;
      }
      if (!loc) for (j = i - 1; j >= Math.max(0, i - 3) && !loc; j--) {
        q = msgs[j]; if (!q.pre || q.pre.who !== m.pre.who) continue;
        if (q.ll && !used[j] && !q.photo && mins(q.pre.at, m.pre.at) <= 20) { loc = q; used[j] = 1; }
      }
      items.push({ waId: key(m.id), at: m.pre.at, poster: m.pre.who, caption: m.cap, lat: loc ? loc.ll.lat : 0, lng: loc ? loc.ll.lng : 0, _el: m.el });
    });
    msgs.forEach(function (m, i) {
      if (m.ll && !used[i] && !m.photo && m.pre) items.push({ waId: key(m.id), at: m.pre.at, poster: m.pre.who, caption: m.cap, lat: m.ll.lat, lng: m.ll.lng });
    });
    return items.filter(function (it) { return it.waId; });
  }
  function exportRow(el) {
    return new Promise(function (res) {
      try { el.scrollIntoView({ block: "center" }); } catch (e) { }
      var tries = 0;
      (function look() {
        var img = photoOf(el);
        if (!img || !img.complete || !img.naturalWidth) { if (++tries < 10) return setTimeout(look, 500); }
        if (!img) img = el.querySelector('img[src^="data:image"]');
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
    return p ? p.at.slice(0, 10) : "";
  }
  function loadBack(days) {
    var cut = new Date(Date.now() - (days || 2) * 86400000 + 19800000).toISOString().slice(0, 10);
    var sc = scroller(), k = 0;
    if (!sc) return Promise.resolve({ ok: false, why: "chat not open" });
    function step() {
      var e = earliest(); if (e && e < cut) return Promise.resolve({ ok: true, earliest: e, rows: rows().length });
      if (++k > 60) return Promise.resolve({ ok: true, earliest: e, rows: rows().length, capped: 1 });
      var n = rows().length; sc.scrollTop = 0;
      return wait(1600).then(function () {
        if (rows().length > n) return step();
        return wait(2000).then(function () { return rows().length > n ? step() : { ok: true, earliest: earliest(), rows: rows().length, top: 1 }; });
      });
    }
    return step();
  }
  function open() {
    if (groupOk()) return Promise.resolve("open");
    var t = Array.prototype.slice.call(document.querySelectorAll('#pane-side span[title]')).filter(function (s) { return s.getAttribute("title").indexOf(GROUP) >= 0; })[0];
    if (!t) return Promise.resolve("not in the chat list - search for it");
    var ev = function (type) { t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); };
    ev("mousedown"); ev("mouseup"); ev("click");
    return wait(2500).then(function () { return groupOk() ? "open" : "not opened"; });
  }
  function preview() {
    var it = scan();
    return { group: groupOk(), earliest: earliest(), sites: it.length, withPin: it.filter(function (x) { return x.lat; }).length,
      withPhoto: it.filter(function (x) { return x._el; }).length,
      list: it.map(function (x) { return x.at + " " + x.poster + ": " + String(x.caption || "(no caption)").slice(0, 60) + (x.lat ? " [pin]" : ""); }) };
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
    var items = scan(); st.found = items.length;
    var win = window.open(CRM, "ewsitelead");   /* must stay the first thing after the click */
    if (!win) { st.phase = "error"; st.err = "The browser blocked the CRM tab"; return Promise.resolve(st); }
    label("EW: waiting for the CRM...");
    return waitMsg("sitelead-ready", 180000).then(function (rd) {
      if (!rd.ok) throw new Error("The CRM is not signed in as the owner");
      var seen = {}; (rd.seen || []).forEach(function (s) { seen[s] = 1; });
      var todo = items.filter(function (x) { return !seen[x.waId]; });
      st.todo = todo.length; st.sum.skipped = items.length - todo.length; st.phase = "sending";
      var i = 0;
      function next() {
        if (i >= todo.length) return null;
        var batch = todo.slice(i, i + 2); i += 2;
        label("EW: sending " + Math.min(i, todo.length) + " of " + todo.length + "...");
        return Promise.all(batch.map(function (x) { return x._el ? exportRow(x._el) : Promise.resolve(""); })).then(function (b64s) {
          var clean = batch.map(function (x, n) { return { waId: x.waId, at: x.at, poster: x.poster, caption: x.caption, lat: x.lat, lng: x.lng, b64: b64s[n] || "" }; });
          win.postMessage({ ew: "sitelead-items", batch: i, items: clean }, CRM_ORIGIN);
          return waitMsg("sitelead-done", 240000);
        }).then(function (d) {
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
  window.EWSL = { v: 1, scan: scan, preview: preview, loadBack: loadBack, open: open, button: button, run: run, state: null, earliest: earliest };
  return "ready";
})();
