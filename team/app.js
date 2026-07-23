/* Energy World - Team App
   Loaded fresh on every page load by index.html, so edits here go live for the
   whole team on their next login. No secrets in this file: the passcode is
   verified server-side by Google Apps Script, and Telegram tokens live only in
   GAS Script Properties. */
(function () {
  "use strict";

  var GAS = "https://script.google.com/macros/s/AKfycbzVkPHWyPq-w8RFD_HdG0vCjmrfQvEUpcq_hhF9eDGa0ZbZ3rIx7N37an2DQRGmsxPK/exec";
  var LOGO = "../assets/logo.jpg";
  var STORE = "ew_team_session";
  var APP_VERSION = "6.9.110";
  /* When a handler re-renders the whole page after a small in-modal change (e.g. changing a
     product quantity), the modal is rebuilt and its scroll jumps back to the top. Setting
     keepScroll=true before render() preserves the open modal's scroll position across the rebuild,
     so the user stays on the product they were editing. */
  var keepScroll = false;
  var PRODUCTS = [];
  var CAT_KEY = "ew_team_catalog";

  var STAGES = ["Enquiry / Not started", "Foundation", "Structure / Slab", "Brickwork",
    "Concealed Plumbing", "Concealed Electrical", "Plastering", "Flooring / Tiling",
    "Sanitary & CP Fitting", "Painting", "Final Fitout / Handover", "Completed"];

  var PITCH = {
    "Enquiry / Not started": ["Introduce the range", "Share the catalogue", "Book a site visit"],
    "Foundation": ["SWR / drainage pipes", "Underground tank fittings", "Sump pump"],
    "Structure / Slab": ["Conduit pipes", "Earthing accessories"],
    "Brickwork": ["Plan the plumbing layout", "Quote concealed pipe requirement"],
    "Concealed Plumbing": ["CPVC / UPVC pipes and fittings", "Concealed valves", "Water tank"],
    "Concealed Electrical": ["Wires and cables", "MCB / distribution board", "Conduits"],
    "Plastering": ["Follow up - keep the quote warm"],
    "Flooring / Tiling": ["Floor drains and gratings", "Bathroom waste fittings"],
    "Sanitary & CP Fitting": ["CP fittings and faucets", "Sanitaryware", "Shower systems"],
    "Painting": ["Water heater / geyser", "Pumps"],
    "Final Fitout / Handover": ["Water heater / geyser", "RO / water purifier", "Solar water heater", "Pressure pump", "Lights and fans"],
    "Completed": ["AMC offer", "Solar / inverter upgrade", "Ask for a referral"]
  };

  var STAGES2 = ["Design / Drawing","Excavation / Foundation","Structure / Slab","Brickwork / Masonry",
    "Concealed Plumbing (rough-in)","Concealed Electrical","Plastering","Waterproofing",
    "Flooring / Tiling","Sanitary & CP Fitting","False Ceiling / Painting","Final Fitout / Handover","Post-Handover / AMC"];
  var PSTATUS = ["Not pitched","Pitched","Quoted","Negotiating","Won","Lost","Not applicable"];

  var LOCATIONS = ["Panipat", "Sonipat"];
  var CLIENT_TYPES = ["Builder", "Architect", "Plumber", "Contractor", "Home owner", "Dealer", "PMC"];
  var QSTATUS = ["Draft", "Sent", "Negotiating", "Won", "Lost", "Revised"];
  var GST = 0.18;

  var SVC_PRODUCTS = ["Water Softener","Sand Filter","Carbon Filter","RO / Purifier","Heat Pump","Pressure Pump","Other"];
  var SVC_ENGINEERS = ["Manoj","Jaiprakash"];
  var VISIT_TYPES = ["Periodic service","Complaint","Salt delivery","AMC visit","Installation","Repair"];
  var WATER = ["Normal","Hard","Very hard"];
  var MIN_VISIT = 500;

  var TYPES = ["Builder", "Architect", "Plumber", "Contractor", "Home owner", "Dealer"];
  var STATUSES = ["Hot", "Warm", "Cold", "Won", "Lost"];

  var S = {
    pin: "", user: "", role: "", pinSet: "", tab: "dash", q: "", busy: false, modal: null,
    siteId: "",
    installId: "",
    qz: null,
    navOpen: false,
    rmPreview: null,
    geoOnly: false,
    partner: "",
    pRole: "",
    leadBrand: "",
    clLoc: "",
    gps: null,
    calMonth: "",
    calDay: "",
    brandClient: "",
    sq: "",
    sres: null,
    alt: null,
    rt: null,
    recon: null,
    tool: null,
    scan: null,
    pr: null,
    oc: null,
    clBack: null,
    billDraft: null,
    clEditing: null,
    rpt: null,
    pLoc: "",
    vType: "Site",
    vdSite: null,
    data: { customers: [], followups: [], challans: [], associates: [], team: [], sites: [], pitch: [], rules: [], installs: [], visits: [], spares: [], payroll: [], clients: [], drivers: [], quotes: [], discounts: [], commrates: [], payments: [], commpay: [], incentives: [], sitevisits: [], brands: [], brandmap: [], areas: [], logos: [], returns: [], tools: [], toolmoves: [], pricerev: [] }
  };

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || "").trim() : ""; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dstr(d) { return d ? String(d).slice(0, 10) : ""; }
  /* Incentive is a division (amount / 1.18 * rate), so it lands on fractions of a paisa.
     Nobody pays a plumber 84.7 paise - round to the rupee everywhere money is shown. */
  function money(n) { return "\u20B9" + Math.round(Number(n) || 0).toLocaleString("en-IN"); }
  function moneyAscii(n) { return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN"); }

  /* The PDFs use the core Helvetica font (no heavy Unicode font embed - that would bloat every
     quote and break the WhatsApp/Telegram send). Core Helvetica can only draw Latin-1, so any
     fancy symbol a product description carries (bullets, diamonds, arrows, the \u20B9 sign, smart
     quotes) would print as garbage like "\u00D8=\u00DD". pdfSafe maps the common ones to clean ASCII and
     drops anything else, so descriptions always read cleanly. */
  function pdfSafe(s) {
    return String(s == null ? "" : s)
      .replace(/\u20B9/g, "Rs.")
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
      .replace(/[\u2013\u2014\u2015]/g, "-")
      .replace(/[\u2192\u21D2\u27A4\u27A2\u279C\u2794\u2799\u279E]/g, "->")
      .replace(/[\u2022\u25CF\u25CB\u25C6\u25C7\u25A0\u25A1\u2219\u2023\u2043\u30FB\u00B7\u2666\u2756\u276F\u00BB]/g, " \u00B7 ")
      .replace(/[\u2713\u2714\u2705\u2611]/g, "")
      .replace(/[^\x20-\xFF]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var ROLE_TABS = {
    admin:    ["dash","report","returns","tools","rates","clients","partners","quotes","sites","leads","brandfollow","winloss","visits","followups","challans","payments","billing","discounts","commission","service","spares","dues","payroll","products","pricelist","catalogue","rules","teampins"],
    accounts: ["dash","returns","tools","clients","partners","followups","challans","payments","billing","service","spares","dues","products","rates","pricelist"],
    godown:   ["dash","returns","tools","challans","products"],
    sales:    ["dash","report","returns","tools","clients","partners","quotes","sites","leads","brandfollow","winloss","visits","followups","challans","billing","payments","products"],
    service:  ["dash","tools","service","spares","dues","followups","products"]
  };
  function canSee(tab) {
    var t = ROLE_TABS[S.role] || ["dash"];
    /* Hubs bundle several tabs; grant a hub to anyone who could see ANY of its members, so no
       role list needs rewriting and no member is ever exposed to a role that lacked it. */
    var member = { deliveries: ["challans", "returns"], collections: ["payments", "dues"],
      pricing: ["rates", "pricelist", "catalogue"], payrollhub: ["commission", "payroll"] };
    if (member[tab]) return member[tab].some(function (m) { return t.indexOf(m) >= 0; });
    return t.indexOf(tab) >= 0 || tab === "matrix";
  }

  function api(action, extra) {
    var body = Object.assign({ action: action, user: S.user, pin: S.pin }, extra || {});
    return fetch(GAS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---------- bulletproof saving ----------
     A save used to be DISCARDED (rolled back) the instant the network hiccuped - that is how a
     finished quote could vanish. Now nothing is ever thrown away: every save is written to a
     recovery JOURNAL on this device first. If the server confirms it, the journal entry clears.
     If it fails, the record STAYS on screen and in the journal, a red banner shows, and it is
     retried automatically - and again the next time the app opens. Data cannot silently disappear. */
  var PEND_KEY = "ew_pending_v1", _pkSeq = 0, _retrying = false;
  function pendLoad() { try { return JSON.parse(localStorage.getItem(PEND_KEY) || "[]") || []; } catch (e) { return []; } }
  function pendStore(l) { try { localStorage.setItem(PEND_KEY, JSON.stringify(l)); } catch (e) { } S.pendCount = l.length; syncBanner(); }
  function pendCount() { return pendLoad().length; }
  function pendPut(pk, tab, row) { var l = pendLoad().filter(function (x) { return x.pk !== pk; }); l.push({ pk: pk, tab: tab, row: row, at: Date.now(), err: "" }); pendStore(l); }
  function pendMark(pk, err) { var l = pendLoad(); l.forEach(function (x) { if (x.pk === pk) x.err = err; }); pendStore(l); }
  function pendDrop(pk) { pendStore(pendLoad().filter(function (x) { return x.pk !== pk; })); }
  function natEq(a, b) {
    if (b._lid && a._lid === b._lid) return true;   // client-side local key: dedupes NEW rows of any tab
    if (b.id && a.id === b.id) return true;
    if (b.quoteNo) return a.quoteNo === b.quoteNo;
    if (b.challanNo) return a.challanNo === b.challanNo;
    if (b.returnNo) return a.returnNo === b.returnNo;
    if (b.name) return a.name === b.name && (a.mobile || "") === (b.mobile || "");
    return false;
  }
  /* re-overlay unsynced records on top of a fresh server pull, so a background sync can never
     erase something that has not been confirmed saved yet */
  function applyPending() {
    pendLoad().forEach(function (e) {
      var arr = (S.data[e.tab] = S.data[e.tab] || []), found = false;
      for (var j = 0; j < arr.length; j++) { if (arr[j] && natEq(arr[j], e.row)) { found = true; break; } }
      if (!found) arr.push(e.row);
    });
  }
  function retryPending() {
    /* Try EVERY journaled record, one after another, skipping past any the server refuses — one
       stuck record must never block the queue behind it (it did once: the first refused save
       stopped the loop, and 15 good records sat behind it looking "unsavable"). Refused records
       stay in the journal with the server's reason shown on the banner. */
    if (_retrying) return;
    if (!pendLoad().length) return;
    _retrying = true;
    var okCount = 0, i = 0;
    var step = function () {
      var l2 = pendLoad();
      if (i >= l2.length) {
        _retrying = false;
        render();
        if (!pendCount()) toast("All pending records are now saved.");
        else if (okCount) toast(okCount + " saved. " + pendCount() + " still held — the banner shows the server's reason.");
        return;
      }
      var e = l2[i];
      var payload = Object.assign({}, e.row); delete payload._lid;
      api("teamSave", { tab: e.tab, row: payload }).then(function (r) {
        if (r && r.ok) {
          var arr = S.data[e.tab] || []; for (var j = 0; j < arr.length; j++) { if (arr[j] && natEq(arr[j], e.row)) { Object.assign(arr[j], r.row); break; } }
          pendDrop(e.pk); okCount++;          /* list shifted left — same index now holds the next record */
        } else { pendMark(e.pk, (r && r.error) || "server refused"); i++; }
        step();
      }).catch(function () { pendMark(e.pk, "network error"); i++; step(); });
    };
    step();
  }
  function syncBanner() {
    var n = pendLoad().length, el = document.getElementById("ew_sync_banner");
    if (!n) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement("div"); el.id = "ew_sync_banner";
      el.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#b91c1c;color:#fff;padding:10px 14px;font:600 13px system-ui,sans-serif;display:flex;align-items:center;gap:12px;justify-content:center;box-shadow:0 -2px 10px rgba(0,0,0,.25)";
      document.body.appendChild(el);
    }
    /* If the server gave a REASON for refusing (a rule, not a network drop), show it right here —
       a stuck record must never be a silent mystery again. */
    var errs = pendLoad().map(function (e) { return e.err; }).filter(function (x) { return x && x !== "server refused" && x !== "network error"; });
    el.innerHTML = "⚠ " + n + " record(s) not yet saved to the server — kept safe on this device. " +
      (errs.length ? '<span style="font-weight:400;font-size:12px">Server says: “' + String(errs[0]).slice(0, 90) + '”</span> ' : '') +
      '<button id="ew_retry_btn" style="background:#fff;color:#b91c1c;border:0;border-radius:6px;padding:5px 11px;font-weight:700;cursor:pointer">Retry now</button>' +
      '<button id="ew_backup_btn" style="background:#fde68a;color:#7c2d12;border:0;border-radius:6px;padding:5px 11px;font-weight:700;cursor:pointer">Save a copy</button>';
    var b = document.getElementById("ew_retry_btn"); if (b) b.onclick = function () { toast("Retrying..."); retryPending(); };
    var bk = document.getElementById("ew_backup_btn"); if (bk) bk.onclick = exportPending;
  }

  /* Off-device backup of the unsynced journal. Shows the full records in a selectable box with a
     Copy button and a Share/Save button. Deliberately NO auto blob-download: on iOS Safari that
     navigates to the blob URL and fails ("WebKitBlobResource error 1"). Copy (clipboard) + native
     Share (files where supported, else text) + on-screen select-all all work on a phone. Read-only:
     it never changes or clears the journal. */
  function exportPending() {
    var raw = "[]";
    try { raw = localStorage.getItem("ew_pending_v1") || "[]"; } catch (e) { }
    var pretty = raw;
    try { pretty = JSON.stringify(JSON.parse(raw), null, 2); } catch (e) { }
    var n = 0; try { n = JSON.parse(raw).length; } catch (e) { }
    window.__ewBackupText = pretty;
    S.modal = '<h2>Backup — ' + n + ' unsynced record(s)</h2>' +
      '<p class="sub">A safety copy of everything not yet on the server. This changes nothing. Tap <b>Copy</b> and paste it into Notes / WhatsApp, or <b>Share / Save</b> to keep it as a file. You can also long-press the box to select all.</p>' +
      '<div class="acts" style="margin-bottom:8px">' +
      '<button class="btn" data-act="backup-copy">Copy</button>' +
      '<button class="btn ghost" data-act="backup-share">Share / Save</button></div>' +
      '<textarea id="ew_backup_text" readonly style="width:100%;height:40vh;font:12px monospace;padding:8px;border:1px solid #cbd5e1;border-radius:8px" onclick="this.select()">' + esc(pretty) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Done</button></div>';
    render();
    toast("Backup ready — Copy it or Share it to save.");
  }

  function save(tab, row, quiet) {
    /* every NEW row (no server id yet) gets a stable local key so the recovery overlay can
       recognise it and never duplicate it - works for tabs with no natural key (discounts,
       payments, pitch...). The key is stripped before the row goes to the server. */
    if (!row.id && !row._lid) row._lid = "l" + (++_pkSeq) + "_" + Date.now();
    var list = (S.data[tab] = S.data[tab] || []);
    var idx = -1;
    for (var k = 0; k < list.length; k++) { if (list[k] && ((row.id && list[k].id === row.id) || (row._lid && list[k]._lid === row._lid))) { idx = k; break; } }
    if (idx >= 0) Object.assign(list[idx], row); else { list.push(row); idx = list.length - 1; }
    /* Send the FULL merged in-memory row, not just the handful of fields the caller passed. The
       backend writes the whole sheet row from whatever it receives - any column it is NOT sent is
       written blank - so a partial save would wipe the rest of the record (this is what blanked a
       team member's name on an early PIN reset). Sending list[idx] (the existing row with this
       change applied) means a save can only ever CHANGE the mentioned fields and can never blank the
       others. Safe whether the backend merges or overwrites. */
    var fullRow = list[idx] || row;
    S.pending = (S.pending || 0) + 1;
    var pk = "pk" + (++_pkSeq) + "_" + (row.id || row._lid || "x");
    pendPut(pk, tab, fullRow);        // journal the FULL row so an offline retry is safe too
    /* A "quiet" save (used by the discount / incentive editor) skips the repaint so the field being
       typed in is never torn down mid-edit and focus can never jump to the search box. The row is
       already in memory and journaled, so nothing is lost. */
    if (!quiet) render();
    var payload = Object.assign({}, fullRow); delete payload._lid;   // local-only key never leaves the device
    var done = function () { S.pending = Math.max(0, (S.pending || 1) - 1); };
    return api("teamSave", { tab: tab, row: payload }).then(function (r) {
      if (!r || !r.ok) {
        done(); pendMark(pk, (r && r.error) || "server refused it");
        toast("Not synced yet - kept safe on this device, will retry.");
        if (!quiet) render(); else syncBanner();
        return row;                   // KEEP the record - never discard
      }
      done();
      if (list[idx]) Object.assign(list[idx], r.row);
      pendDrop(pk); if (!quiet) render(); quietSync();
      return r.row;
    }).catch(function (e) {
      done(); pendMark(pk, (e && e.message) ? e.message : "network error");
      toast("Not synced yet - kept safe on this device, will retry.");
      if (!quiet) render(); else syncBanner();
      return row;                     // KEEP the record - never discard
    });
  }

/* A save now repaints instantly and syncs behind. If someone closes the app while
   a save is still in flight, warn them rather than lose it silently. */
window.addEventListener("beforeunload", function (ev) {
  var stuck = false; try { stuck = pendCount() > 0; } catch (e) { }
  if (typeof S !== "undefined" && S && (S.pending > 0 || stuck)) { ev.preventDefault(); ev.returnValue = ""; }
});

  /* background re-sync, at most once every 20s, never blocks the screen */
  var syncAt = 0, syncing = false;
  function quietSync() {
    if (syncing || Date.now() - syncAt < 20000) return;
    syncing = true;
    api("teamGet").then(function (r) {
      syncing = false; syncAt = Date.now();
      if (r && r.ok) { S.data = r; applyPending(); snapSave(); render(); }
      if (pendCount()) retryPending();
    }).catch(function () { syncing = false; });
  }

  /* The server round-trip is ~2s on a good connection and worse on 4G at a site. Rather
     than stare at a spinner, paint the last known data straight away and let the fresh
     copy land underneath. The snapshot is per user, so nobody sees another role's data. */
  function snapKey() { return "ew_snap_" + (S.user || "x"); }
  function snapSave() {
    try { localStorage.setItem(snapKey(), JSON.stringify({ at: Date.now(), d: S.data })); } catch (e) { }
  }
  function snapLoad() {
    try {
      var t = JSON.parse(localStorage.getItem(snapKey()) || "null");
      return (t && t.d) ? t.d : null;
    } catch (e) { return null; }
  }

  function refresh() {
    var snap = snapLoad();
    if (snap && snap.ok) { S.data = snap; S.busy = false; render(); }
    return api("teamGet").then(function (r) {
      S.busy = false;
      syncAt = Date.now();
      if (r && r.ok) { S.data = r; applyPending(); snapSave(); }
      render(); syncBanner();
      if (pendCount()) retryPending();
      try { maybePartnerNag(); } catch (e) { }   /* weekly: chase missing plumber/architect names */
    });
  }

  function custById(id) {
    var list = S.data.customers, i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function daysTo(d) {
    if (!d) return 9999;
    return Math.round((new Date(dstr(d) + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
  }
  function openFollowups() {
    return S.data.followups.filter(function (f) { return f.status !== "Done"; });
  }

  /* ---------- FOLLOW-UP RADAR ----------
     Auto-surface open quotes (Sent / Negotiating) that have gone quiet, so nothing goes cold
     because someone forgot to chase it. Aged from the quote's last activity (updatedAt).
     Buckets at 5 / 10 / 20 days. A "snooze" is just a followups record whose note carries the
     quote number and a future due date - it hides the quote from the radar until that date and
     also shows up in the manual reminders list. No new sheet column needed. */
  var RADAR_MIN = 5;
  function qSilentDays(q) {
    var d = q.updatedAt || q.createdAt;
    return d ? -daysTo(d) : 0;
  }
  function quoteSnoozed(q) {
    if (!q.quoteNo) return false;
    return (S.data.followups || []).some(function (f) {
      return f.status !== "Done" && String(f.note || "").indexOf(q.quoteNo) > -1 && daysTo(f.dueDate) >= 0;
    });
  }
  function radarBucket(days) {
    if (days >= 20) return { label: "Going cold", cls: "due" };
    if (days >= 10) return { label: "Getting cold", cls: "soon" };
    return { label: "Follow up", cls: "teal" };
  }
  function radarQuotes() {
    var list = (S.data.quotes || []).filter(function (q) {
      if (["Sent", "Negotiating"].indexOf(q.status) < 0) return false;
      /* follow-up is by CLIENT ASSIGNMENT, not who typed the quote: a sales exec chases every quote
         for the clients assigned to them, even one an admin created. */
      if (!seesAllClients() && !isMineClient(q.client)) return false;
      return qSilentDays(q) >= RADAR_MIN && !quoteSnoozed(q);
    });
    return list.sort(function (a, b) { return qSilentDays(b) - qSilentDays(a); });
  }
  function radarBadge() {
    var n = radarQuotes().length;
    return n ? ' <span style="background:#ef4444;color:#fff;border-radius:9px;padding:0 6px;font-size:11px;font-weight:700;margin-left:4px">' + n + '</span>' : '';
  }
  /* Residential vs Project. Explicit c.segment wins; otherwise auto-classified from the client
     Type you already set (Home owner = Residential, any partner/trade type = Project). */
  function clientSegment(c) {
    if (c && c.segment) return c.segment;
    var t = (c && c.type) || "";
    if (!t) return "";
    return t === "Home owner" ? "Residential" : "Project";
  }
  function segOf(clientName) { return clientSegment(clientByName(clientName) || {}); }

  /* ---------------- product catalog (live from the Sheet) ---------------- */
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

  function parseCatalog(rows) {
    var head = -1, i, r;
    for (i = 0; i < rows.length && i < 10; i++) {
      r = (rows[i] || []).map(function (x) { return String(x || "").toLowerCase().trim(); });
      if (r.indexOf("product code") >= 0) { head = i; break; }
    }
    if (head < 0) return [];
    var out = [];
    for (i = head + 1; i < rows.length; i++) {
      var row = rows[i] || [];
      var code = String(row[1] || "").trim();
      var desc = String(row[3] || row[2] || "").trim();
      if (!code && !desc) continue;
      out.push({
        code: code,
        family: String(row[2] || "").trim(),
        desc: desc,
        cat: String(row[4] || "").trim(),
        unit: String(row[5] || "").trim(),
        price: Number(String(row[6] || "0").replace(/[^0-9.]/g, "")) || 0,
        brand: String(row[8] || "").trim(),
        pic: driveImg(row[10]),
        label: (code ? code + " - " : "") + desc
      });
    }
    return out;
  }

  function loadCatalog() {
    try {
      var c = JSON.parse(localStorage.getItem(CAT_KEY) || "null");
      if (c && c.at && (Date.now() - c.at < 86400000) && c.items && c.items.length) PRODUCTS = c.items;
    } catch (e) {}
    return fetch(GAS + "?action=catalog", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var items = parseCatalog(rows);
        if (items.length) {
          PRODUCTS = items;
          PRODLIST_HTML = null;
          try { localStorage.setItem(CAT_KEY, JSON.stringify({ at: Date.now(), items: items })); } catch (e) {}
        }
      })
      .catch(function () {});
  }

  function findProduct(text) {
    var t = String(text || "").trim().toLowerCase(), i;
    if (!t) return null;
    for (i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].label.toLowerCase() === t) return PRODUCTS[i];
    for (i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].code.toLowerCase() === t) return PRODUCTS[i];
    return null;
  }

  var PRODLIST_HTML = null;
  function prodDatalist() {
    /* 853 option nodes rebuilt on every keystroke was a big part of the lag on a phone.
       Build it once, reuse the string. */
    if (PRODLIST_HTML === null) {
      PRODLIST_HTML = '<datalist id="prodlist">' + PRODUCTS.map(function (p) {
        return '<option value="' + esc(p.label) + '"></option>';
      }).join("") + '</datalist>';
    }
    return PRODLIST_HTML;
  }

  function viewProducts() {
    var q = S.q.toLowerCase();
    var h = '<div class="row"><input class="grow" id="q" placeholder="Search ' + PRODUCTS.length + ' products by code, name or brand..." value="' + esc(S.q) + '"/>' +
      '<button class="btn ghost" data-act="cat-reload">Reload</button></div>';
    if (!q) return h + '<div class="empty">' + PRODUCTS.length + ' products loaded. Type to search.</div>';
    var list = PRODUCTS.filter(function (p) {
      return (p.code + " " + p.desc + " " + p.family + " " + p.brand + " " + p.cat).toLowerCase().indexOf(q) >= 0;
    });
    var shown = list.slice(0, 60);
    if (!shown.length) return h + '<div class="empty">Nothing matches that.</div>';
    h += '<div class="empty" style="padding:0 0 10px">' + list.length + ' match(es)' + (list.length > 60 ? ' - showing first 60' : '') + '</div>';
    shown.forEach(function (p) {
      h += '<div class="card"><h3>' + esc(p.desc || p.family) + ' <span class="pill teal">' + money(p.price) + '</span></h3>' +
        '<div class="meta">' + esc(p.code) + (p.brand ? ' &middot; ' + esc(p.brand) : "") +
        (p.unit ? ' &middot; ' + esc(p.unit) : "") + (p.cat ? '<br>' + esc(p.cat) : "") + '</div></div>';
    });
    return h;
  }

  /* ---------------- pitch matrix ---------------- */
  function stageNo(site) { var i = STAGES2.indexOf((site || {}).stage); return i < 0 ? 0 : i + 1; }
  function siteById(id) { return S.data.sites.filter(function (x) { return x.id === id; })[0] || null; }
  function pitchRow(siteId, brand) {
    return S.data.pitch.filter(function (p) { return p.siteId === siteId && p.brand === brand; })[0] || null;
  }

  /* the whole point of the app: what closes when */
  function action(site, rule, p) {
    var st = (p && p.status) || "Not pitched";
    var sn = stageNo(site);
    var by = Number(rule.pitchBy) || 0;
    if (st === "Won") return { t: "WON", k: "won" };
    if (st === "Lost") return { t: "LOST" + (p && p.lostTo ? " to " + p.lostTo : ""), k: "lost" };
    if (st === "Not applicable") return { t: "n/a", k: "" };
    if (!sn) return { t: "set the site stage", k: "" };
    if (sn > by) return { t: "WINDOW CLOSED (was stage " + by + ")", k: "closed" };
    if (sn === by) return { t: "PITCH TODAY - last chance", k: "now" };
    if (by - sn <= 1) return { t: "PITCH NOW - closes next stage", k: "now" };
    if (st === "Not pitched") return { t: "upcoming - pitch by stage " + by, k: "soon" };
    return { t: st + " - follow up", k: "" };
  }

  function siteAlerts(site) {
    var open = 0, closed = 0;
    S.data.rules.forEach(function (r) {
      var a = action(site, r, pitchRow(site.id, r.brand));
      if (a.k === "now") open++;
      if (a.k === "closed") closed++;
    });
    return { open: open, closed: closed };
  }

  function viewSites() {
    var q = S.q.toLowerCase();
    var pendAll = S.data.sites.filter(geoPending);
    var list = S.data.sites.filter(function (x) {
      if (S.geoOnly && !geoPending(x)) return false;
      return !q || (x.name + " " + x.client + " " + x.city + " " + x.owner).toLowerCase().indexOf(q) >= 0;
    });
    var h = '';
    if (pendAll.length) {
      h += '<div class="card" style="border-color:#fde68a;background:#fffbeb"><h3>' +
        '<span class="pill soon">' + pendAll.length + ' site(s) awaiting location</span></h3>' +
        '<div class="meta">Sites entered from the office have no location yet. The next time someone is <b>standing at the site</b>, they press <b>Set location</b> once. From then on every visit is checked against it.</div>' +
        '<div class="acts"><button class="btn sm ' + (S.geoOnly ? '' : 'ghost') + '" data-act="geo-filter">' +
        (S.geoOnly ? 'Showing pending only' : 'Show only these') + '</button></div></div>';
    }
    var stale = staleSites();
    if (stale.length) {
      h += '<div class="card" style="border-color:#fdba74;background:#fff7ed"><h3>Stale sites <span class="pill soon">' + stale.length + '</span></h3>' +
        '<div class="meta">No visit logged in ' + STALE_SITE + '+ days. Check in, or update the stage — the pitch windows depend on it.</div>';
      stale.slice(0, 12).forEach(function (s) {
        h += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(s.st.name) + '</b>' +
          ' <span style="color:#94a3b8;font-size:11px">stage ' + stageNo(s.st) + '</span>' +
          '<br><span style="font-size:11px;color:#64748b">quiet ' + s.days + 'd</span></div>' +
          '<button class="btn sm ghost" data-act="matrix" data-id="' + esc(s.st.id) + '">Open</button></div>';
      });
      h += '</div>';
    }
    h += '<div class="row"><input class="grow" id="q" placeholder="Search sites..." value="' + esc(S.q) + '"/>' +
      '<button class="btn" data-act="site-new">+ New site</button></div>';
    if (!list.length) h += '<div class="empty">No sites yet. A site is a project - the 14 brands get tracked against it.</div>';
    list.forEach(function (x) {
      var a = siteAlerts(x);
      var vs = siteVisits(x.id);
      var lastV = vs.length ? vs[vs.length - 1] : null;
      var pend = geoPending(x);
      h += '<div class="card"><h3>' + esc(x.name) + ' <span class="pill teal">stage ' + stageNo(x) + '</span>' +
        (vs.length ? ' <span class="pill">' + vs.length + ' visit(s)</span>' : '') +
        (pend ? ' <span class="pill soon">location pending</span>' : ' <span class="pill Won">GPS locked</span>') +
        (!pend && vs.length && !siteVerified(x) ? ' <span class="pill due">unverified lead</span>' : '') +
        (a.open ? ' <span class="pill due">' + a.open + ' to pitch NOW</span>' : "") +
        (a.closed ? ' <span class="pill">' + a.closed + ' window(s) closed</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(x.client || "") + (x.city ? ' &middot; ' + esc(x.city) : "") +
        '<br>Stage: <b>' + esc(x.stage || "-") + '</b>' +
        (lastV ? '<br>Last visit: ' + esc(dstr(lastV.date)) + ' by ' + esc(lastV.createdBy) : '') +
        (x.owner ? '<br>Owner: ' + esc(x.owner) : "") +
        (x.architect || x.plumber ? '<br>' + esc([x.architect, x.plumber, x.builder].filter(Boolean).join(" / ")) : "") + '</div>' +
        '<div class="acts">' +
        (pend
          ? '<button class="btn sm" data-act="setgeo" data-id="' + esc(x.id) + '">Set location (I am at site)</button>'
          : '<button class="btn sm" data-act="checkin" data-id="' + esc(x.id) + '">Check in</button>') +
        (!pend && S.role === "admin"
          ? '<button class="btn sm ghost" data-act="geo-reset" data-id="' + esc(x.id) + '">Reset GPS</button>' : '') +
        '<button class="btn sm ghost" data-act="matrix" data-id="' + esc(x.id) + '">Pitch matrix</button>' +
        '<button class="btn sm ghost" data-act="site-open" data-id="' + esc(x.id) + '">Edit</button></div></div>';
    });
    return h;
  }

  function viewMatrix() {
    var site = siteById(S.siteId);
    if (!site) return '<div class="empty">Pick a site.</div>';
    var h = '<div class="row"><button class="btn sm ghost" data-act="tab" data-tab="sites">&larr; Sites</button></div>' +
      '<div class="card"><h3>' + esc(site.name) + '</h3><div class="meta">' + esc(site.client || "") +
      '<br>Current stage: <b>' + esc(site.stage || "-") + '</b> (stage ' + stageNo(site) + ' of 13)</div>' +
      '<div class="acts"><button class="btn sm ghost" data-act="site-open" data-id="' + esc(site.id) + '">Change stage</button></div></div>';
    var ra = S.data.rules.slice()
      .sort(function (a, b) { return (Number(a.pitchBy) || 0) - (Number(b.pitchBy) || 0); })
      .map(function (r) { var p = pitchRow(site.id, r.brand) || {}; return { r: r, p: p, a: action(site, r, p) }; });

    /* Instant suggestion: the brands whose window is open at THIS stage - quote them now. */
    var nowList = ra.filter(function (x) { return x.a.k === "now"; });
    if (nowList.length) {
      h += '<div class="card" style="border-color:#fca5a5;background:#fef2f2"><h3>Pitch now at this stage ' +
        '<span class="pill due">' + nowList.length + '</span></h3>' +
        '<div class="meta">These product lines close soon for this site. One tap starts a quote with the brand ready.</div>' +
        '<div class="acts" style="flex-wrap:wrap">' +
        nowList.map(function (x) {
          return '<button class="btn sm" data-act="pm-quote" data-brand="' + esc(x.r.brand) + '">Quote ' + esc(x.r.brand) + '</button>';
        }).join("") + '</div></div>';
    }

    ra.forEach(function (x) {
      var r = x.r, p = x.p, a = x.a;
      var cls = a.k === "closed" ? "due" : (a.k === "now" ? "due" : (a.k === "won" ? "Won" : (a.k === "lost" ? "Lost" : (a.k === "soon" ? "soon" : "teal"))));
      var quotable = ["Won", "Lost", "Not applicable"].indexOf(p.status || "Not pitched") < 0;
      h += '<div class="card"><h3>' + esc(r.brand) + ' <span class="pill ' + cls + '">' + esc(a.t) + '</span></h3>' +
        '<div class="meta">' + esc(r.line) + '<br>Pitch by stage ' + esc(r.pitchBy) + ' &middot; supply at stage ' + esc(r.supplyAt) +
        (r.why ? '<br><i>' + esc(r.why) + '</i>' : "") + '</div>' +
        '<div class="acts" style="align-items:center">' +
        (quotable ? '<button class="btn sm ' + (a.k === "now" ? "" : "ghost") + '" data-act="pm-quote" data-brand="' + esc(r.brand) + '">Quote</button>' : "") +
        '<select class="pm-status" data-brand="' + esc(r.brand) + '" style="width:auto;padding:7px 10px;font-size:13px">' +
        opts(PSTATUS, p.status || "Not pitched") + '</select>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="quoted" inputmode="numeric" placeholder="Quoted Rs" value="' + esc(p.quoted || "") + '" style="width:110px;padding:7px 10px;font-size:13px"/>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="won" inputmode="numeric" placeholder="Won Rs" value="' + esc(p.won || "") + '" style="width:100px;padding:7px 10px;font-size:13px"/>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="lostTo" placeholder="Lost to" value="' + esc(p.lostTo || "") + '" style="width:110px;padding:7px 10px;font-size:13px"/>' +
        '</div></div>';
    });
    return h;
  }

  /* ---------- ACTIVITY RADARS: lead ageing, site staleness, cold partners ---------- */
  var STALE_LEAD = 14, STALE_SITE = 21, COLD_PARTNER = 30;
  function clientAgeDays(c) {
    var latest = "";
    clientQuotes(c.name).forEach(function (q) { var d = q.updatedAt || q.createdAt; if (d && String(d) > latest) latest = String(d); });
    if (!latest && c.createdAt) latest = String(c.createdAt);
    return latest ? -daysTo(latest) : null;
  }
  function agingLeads() {
    return (S.data.clients || []).filter(function (c) { return !isClient(c.name); })
      .map(function (c) { return { c: c, days: clientAgeDays(c) }; })
      .filter(function (x) { return x.days !== null && x.days >= STALE_LEAD; })
      .sort(function (a, b) { return b.days - a.days; });
  }
  function siteActivityDays(st) {
    var latest = "";
    siteVisits(st.id).forEach(function (v) { var d = dstr(v.date); if (d && d > latest) latest = d; });
    if (!latest && st.createdAt) latest = String(st.createdAt).slice(0, 10);
    return latest ? -daysTo(latest) : null;
  }
  function staleSites() {
    return (S.data.sites || []).filter(function (st) {
      var s = String(st.stage || "").toLowerCase();
      if (s.indexOf("complete") >= 0 || s.indexOf("handover") >= 0 || s.indexOf("amc") >= 0) return false;
      var d = siteActivityDays(st);
      return d !== null && d >= STALE_SITE;
    }).map(function (st) { return { st: st, days: siteActivityDays(st) }; })
      .sort(function (a, b) { return b.days - a.days; });
  }
  function partnerLastContactDays(name) {
    var nm = String(name).toLowerCase(), latest = "";
    (S.data.challans || []).forEach(function (c) { if (String(c.associate || "").toLowerCase() === nm) { var d = String(c.createdAt || "").slice(0, 10); if (d > latest) latest = d; } });
    (S.data.sitevisits || []).forEach(function (v) {
      var st = (S.data.sites || []).filter(function (s) { return s.id === v.siteId; })[0];
      if (st && [st.architect, st.plumber, st.builder].some(function (x) { return String(x || "").toLowerCase() === nm; })) { var d = dstr(v.date); if (d > latest) latest = d; }
    });
    (S.data.commpay || []).forEach(function (p) { if (String(p.associate || "").toLowerCase() === nm) { var d = dstr(p.date); if (d > latest) latest = d; } });
    return latest ? -daysTo(latest) : null;
  }
  function coldPartners() {
    return (S.data.associates || []).map(function (a) { return { a: a, days: partnerLastContactDays(a.name) }; })
      .filter(function (x) { return x.days !== null && x.days >= COLD_PARTNER; })
      .sort(function (a, b) { return b.days - a.days; });
  }

  function viewWinLoss() {
    var by = S.wlBy || "brand";
    /* a sales exec gets brand-wise rates and THEIR OWN scorecard; the partner ranking and other
       executives' numbers stay with admin/accounts. */
    var modes = seesAllClients()
      ? [["brand", "By brand"], ["exec", "By executive"], ["partner", "By partner"]]
      : [["brand", "By brand"], ["exec", "My scorecard"]];
    if (!modes.some(function (o) { return o[0] === by; })) by = "brand";
    var h = '<div class="row" style="margin-bottom:10px">' +
      modes.map(function (o) {
        return '<button class="btn sm ' + (by === o[0] ? "" : "ghost") + '" data-act="wl-by" data-k="' + o[0] + '">' + o[1] + '</button>';
      }).join("") + '</div>';

    if (by === "exec") {
      var ex = {};
      (S.data.quotes || []).forEach(function (q) {
        if (!seesAllClients() && q.createdBy !== S.user && !isMineClient(q.client)) return;
        var e = q.createdBy || "?"; ex[e] = ex[e] || { won: 0, lost: 0, val: 0 };
        if (q.status === "Won") { ex[e].won++; ex[e].val += Number(q.net) || 0; } else if (q.status === "Lost") ex[e].lost++;
      });
      var er = Object.keys(ex).map(function (e) { var d = ex[e]; return { name: e, won: d.won, lost: d.lost, val: d.val, rate: (d.won + d.lost) ? Math.round(d.won * 100 / (d.won + d.lost)) : null }; })
        .filter(function (x) { return x.won + x.lost > 0; }).sort(function (a, b) { return b.val - a.val; });
      if (!er.length) return h + '<div class="empty">No Won/Lost quotes yet — win rates appear here as quotes are marked Won or Lost.</div>';
      er.forEach(function (x) {
        h += '<div class="card"><h3>' + esc(x.name) + (x.rate === null ? '' : ' <span class="pill ' + (x.rate >= 50 ? "Won" : "Lost") + '">' + x.rate + '% win</span>') + '</h3>' +
          '<div class="meta">Won ' + x.won + ' &middot; Lost ' + x.lost + ' &middot; Won value ' + money(x.val) + '</div></div>';
      });
      return h;
    }

    if (by === "partner") {
      h += '<div class="empty" style="text-align:left;padding:0 0 10px">Business actually delivered through each partner (challans with a signed receipt).</div>';
      var pr = (S.data.associates || []).map(function (a) { var b = partnerBook(a.name); return { name: a.name, role: a.role, billed: b.billed, ch: b.rows.length }; })
        .filter(function (x) { return x.billed > 0 || x.ch > 0; }).sort(function (a, b) { return b.billed - a.billed; });
      if (!pr.length) return h + '<div class="empty">No delivered business linked to partners yet.</div>';
      pr.forEach(function (x, i) {
        h += '<div class="card"><h3><span class="pill ' + (i < 3 ? "teal" : "") + '">#' + (i + 1) + '</span> ' + esc(x.name) + ' <span class="pill">' + esc(x.role || "") + '</span></h3>' +
          '<div class="meta"><b>Drove ' + money(x.billed) + '</b> &middot; ' + x.ch + ' challan(s)</div></div>';
      });
      return h;
    }

    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Win rate per product line across every site.</div>';
    var rows = S.data.rules.map(function (r) {
      var ps = S.data.pitch.filter(function (p) { return p.brand === r.brand; });
      var cnt = function (st) { return ps.filter(function (p) { return p.status === st; }).length; };
      var won = cnt("Won"), lost = cnt("Lost");
      var missed = S.data.sites.filter(function (site) { return action(site, r, pitchRow(site.id, r.brand)).k === "closed"; }).length;
      var wonVal = ps.reduce(function (a, p) { return a + (Number(p.won) || 0); }, 0);
      return { brand: r.brand, line: r.line, won: won, lost: lost, missed: missed, rate: (won + lost) ? Math.round(won * 100 / (won + lost)) : null, val: wonVal };
    }).sort(function (a, b) { return b.missed - a.missed; });
    rows.forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.brand) +
        (x.rate === null ? ' <span class="pill">no result yet</span>' : ' <span class="pill ' + (x.rate >= 50 ? "Won" : "Lost") + '">' + x.rate + '% win</span>') +
        (x.missed ? ' <span class="pill due">' + x.missed + ' missed window(s)</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(x.line) + '<br>Won ' + x.won + ' &middot; Lost ' + x.lost + ' &middot; Value won ' + money(x.val) + '</div></div>';
    });
    return h;
  }

  function viewRules() {
    var h = '<div class="empty" style="text-align:left;padding:0 0 12px"><b>This is the rulebook.</b> PITCH BY is the last stage at which the sale can still be made - after it, the wall is closed. SUPPLY AT is when material goes to site. Correct these and the whole app follows.</div>';
    S.data.rules.forEach(function (r) {
      h += '<div class="card"><h3>' + esc(r.brand) + '</h3><div class="meta">' + esc(r.line) +
        (r.why ? '<br><i>' + esc(r.why) + '</i>' : "") + '</div>' +
        '<div class="acts" style="align-items:center">' +
        '<span class="pill">PITCH BY</span>' +
        '<select class="rl" data-id="' + esc(r.id) + '" data-f="pitchBy" style="width:auto;padding:7px 10px;font-size:13px">' +
        STAGES2.map(function (st, i) { return '<option value="' + (i + 1) + '"' + (Number(r.pitchBy) === i + 1 ? " selected" : "") + '>' + (i + 1) + '. ' + esc(st) + '</option>'; }).join("") + '</select>' +
        '<span class="pill">SUPPLY AT</span>' +
        '<select class="rl" data-id="' + esc(r.id) + '" data-f="supplyAt" style="width:auto;padding:7px 10px;font-size:13px">' +
        STAGES2.map(function (st, i) { return '<option value="' + (i + 1) + '"' + (Number(r.supplyAt) === i + 1 ? " selected" : "") + '>' + (i + 1) + '. ' + esc(st) + '</option>'; }).join("") + '</select>' +
        '</div></div>';
    });
    return h;
  }

  /* Owner / sales-exec field. A new record is auto-assigned to whoever is entering it; only an
     admin may change the assignment. Non-admins see it locked. The current owner is always kept
     as a selectable option so an edit never silently drops it. Enforced again in the save. */
  function ownerField(fid, current, isNew) {
    var v = current || (isNew ? S.user : "");
    if (S.role === "admin") {
      var names = [""];
      (S.data.team || []).filter(function (t2) { return String(t2.active).toUpperCase() !== "N"; })
        .forEach(function (t2) { if (t2.name && names.indexOf(t2.name) < 0) names.push(t2.name); });
      if (v && names.indexOf(v) < 0) names.push(v);
      return '<select id="' + fid + '">' + opts(names, v) + '</select>';
    }
    return '<input id="' + fid + '" value="' + esc(v) + '" disabled style="background:#f1f5f9;color:#64748b"/>' +
      '<div class="meta" style="font-size:11px;margin-top:2px">Auto-assigned to you. Only admin can reassign.</div>';
  }
  function modalSite(x) {
    x = x || {};
    return '<h2>' + (x.id ? "Edit site" : "New site") + '</h2>' +
      '<p class="sub">The stage drives everything. Keep it current.</p>' +
      '<label>Site / project name</label><input id="s_name" value="' + esc(x.name) + '"/>' +
      '<div class="grid2"><div><label>Client</label><input id="s_client" value="' + esc(x.client) + '"/></div>' +
      '<div><label>Mobile</label><input id="s_mobile" inputmode="numeric" value="' + esc(x.mobile) + '"/></div></div>' +
      '<label>Current construction stage</label><select id="s_stage">' + opts(STAGES2, x.stage || STAGES2[0]) + '</select>' +
      '<div class="grid2"><div><label>City</label><input id="s_city" value="' + esc(x.city) + '"/></div>' +
      '<div><label>Type</label><select id="s_type">' + opts(["Bungalow","Apartment","Villa Project","Commercial","Hotel","Hospital","Other"], x.type || "Bungalow") + '</select></div></div>' +
      '<div class="grid2"><div><label>Architect</label>' + partnerSelect("s_arch", "architect", x.architect, true) + '</div>' +
      '<div><label>Plumber</label>' + partnerSelect("s_plumb", "plumber", x.plumber, true) + '</div></div>' +
      '<div class="meta" style="font-size:11px;color:#94a3b8;margin:-4px 0 6px">Pick from registered partners. A new man? Add him first (Partners tab or the client card) &mdash; mobile required.</div>' +
      '<div class="grid2"><div><label>Builder / PMC</label><input id="s_build" value="' + esc(x.builder) + '"/></div>' +
      '<div><label>Owner (sales exec)</label>' + ownerField("s_owner", x.owner || x.createdBy, !x.id) + '</div></div>' +
      '<label>Notes</label><textarea id="s_notes">' + esc(x.notes) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="site-save" data-id="' + esc(x.id || "") + '">Save</button></div>';
  }

  /* ---------------- service / AMC ---------------- */
  function addDays(d, n) {
    var x = new Date(String(d).slice(0, 10) + "T00:00:00");
    if (isNaN(x.getTime())) x = new Date();
    x.setDate(x.getDate() + Number(n || 0));
    return x.toISOString().slice(0, 10);
  }
  function installById(id) { return S.data.installs.filter(function (x) { return x.id === id; })[0] || null; }
  function spareByName(n) {
    var t = String(n || "").trim().toLowerCase();
    return S.data.spares.filter(function (x) { return String(x.name).toLowerCase() === t; })[0] || null;
  }
  function visitTotal(v) { return (Number(v.visitCharge) || 0) + (Number(v.saltAmt) || 0) + (Number(v.partsAmt) || 0); }

  function dueLabel(x) {
    if (!x.nextService) return { t: "no date set", k: "" };
    var d = daysTo(x.nextService);
    if (d < 0) return { t: Math.abs(d) + "d OVERDUE", k: "due" };
    if (d === 0) return { t: "DUE TODAY", k: "due" };
    if (d <= 7) return { t: "due in " + d + "d", k: "soon" };
    return { t: "due " + dstr(x.nextService), k: "" };
  }

  /* ---------- PRODUCT COMMISSIONING ----------
     Some products need on-site commissioning (softener, filters, pumps, heat pump). Once a
     challan carrying them is DELIVERED (signed receipt), it lands in the Service "To commission"
     queue. The engineer enters the commissioning date + a warranty period per product (seeded by
     type, editable); that stamps the challan's itemsJson (no new sheet column) and prints a
     Commissioning Certificate + a Warranty Card. */
  var COMM_CATS = [
    { kw: ["softener"], label: "Water Softener", months: 12, cycle: 90 },
    { kw: ["sand filter"], label: "Sand Filter", months: 12, cycle: 180 },
    { kw: ["carbon filter"], label: "Carbon Filter", months: 12, cycle: 180 },
    { kw: ["pressure pump"], label: "Pressure Pump", months: 12, cycle: 365 },
    { kw: ["heat pump"], label: "Heat Pump", months: 24, cycle: 180 },
    { kw: ["recirculation"], label: "Recirculation Pump", months: 12, cycle: 365 },
    { kw: ["purifier", "reverse osmosis"], label: "RO / Purifier", months: 12, cycle: 180 }
  ];
  function commCat(desc) {
    var d = " " + String(desc || "").toLowerCase() + " ";
    for (var i = 0; i < COMM_CATS.length; i++) {
      if (COMM_CATS[i].kw.some(function (k) { return d.indexOf(k) >= 0; })) return COMM_CATS[i];
    }
    return null;
  }
  function chItems(ch) { try { return JSON.parse(ch.itemsJson || "[]"); } catch (e) { return []; } }
  function commItemsOf(ch) {
    return chItems(ch).map(function (i, idx) { var c = commCat(i.desc); return c ? { i: i, idx: idx, cat: c } : null; }).filter(Boolean);
  }
  function commDateOf(ch) { var ci = commItemsOf(ch); return (ci[0] && ci[0].i.comm && ci[0].i.comm.date) || ""; }
  function commPending() {
    return (S.data.challans || []).filter(function (c) {
      if (String(c.receiptReceived).toUpperCase() !== "Y") return false;
      return commItemsOf(c).some(function (x) { return !(x.i.comm && x.i.comm.date); });
    });
  }
  function commDone() {
    return (S.data.challans || []).filter(function (c) {
      var ci = commItemsOf(c);
      return ci.length && ci.every(function (x) { return x.i.comm && x.i.comm.date; });
    }).sort(function (a, b) { return String(commDateOf(b)).localeCompare(String(commDateOf(a))); });
  }
  /* Commissioned units whose EW installation warranty is near/at its end - the moment to sell
     an AMC or extended warranty. Reads warranty-till straight from the challan's comm data. */
  function warrantyExpiring(windowDays) {
    var win = windowDays || 60, out = [];
    (S.data.challans || []).forEach(function (c) {
      commItemsOf(c).forEach(function (x) {
        if (x.i.comm && x.i.comm.till) {
          var days = daysTo(x.i.comm.till);
          if (days <= win) out.push({ client: c.customerName, product: x.cat.label, till: x.i.comm.till, days: days });
        }
      });
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  }
  function addMonths(dateStr, m) {
    var d = new Date(dstr(dateStr) + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + (Number(m) || 0));
    return d.toISOString().slice(0, 10);
  }
  function fullDate(v) {
    var s = String(v || "").trim(); if (!s) return "";
    var d = new Date(s); if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function modalCommission(chId) {
    var ch = (S.data.challans || []).filter(function (x) { return x.id === chId; })[0];
    if (!ch) return "";
    var rows = commItemsOf(ch).filter(function (x) { return !(x.i.comm && x.i.comm.date); }).map(function (x) {
      var wm = x.cat.months;
      return '<div class="acts" style="align-items:center;margin:6px 0"><div class="grow"><b>' + esc(x.i.desc) + '</b>' +
        '<br><span style="font-size:11px;color:#94a3b8">' + esc(x.cat.label) + ' &middot; qty ' + esc(x.i.qty || 1) + '</span></div>' +
        '<input class="cm-wm" data-idx="' + x.idx + '" inputmode="numeric" value="' + esc(wm) + '" style="width:60px;padding:6px 8px;font-size:13px"/>' +
        '<span style="font-size:12px;color:#64748b">months</span></div>';
    }).join("");
    return '<h2>Commission products</h2>' +
      '<p class="sub">' + esc(ch.customerName || "") + (ch.site ? ' &middot; ' + esc(ch.site) : "") + ' &middot; ' + esc(ch.challanNo || "") + '</p>' +
      '<div class="grid2"><div><label>Commissioning date</label><input id="cm_date" type="date" value="' + today() + '"/></div>' +
      '<div><label>Engineer</label><select id="cm_eng">' + opts(SVC_ENGINEERS, SVC_ENGINEERS[0]) + '</select></div></div>' +
      '<label style="margin-top:8px">Warranty per product</label>' + rows +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="comm-save" data-ch="' + esc(ch.id) + '">Commission &amp; generate</button></div>';
  }

  function commPdfBase(title, ch, dateStr) {
    return loadFonts().then(function (f) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold"); uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var W = 210, L = 16, R = W - 16;
      doc.setFillColor(11, 59, 54); doc.rect(0, 0, W, 34, "F");
      doc.setFillColor(94, 234, 212); doc.rect(0, 34, W, 1.2, "F");
      if (LOGO_B64) { try { doc.addImage(LOGO_B64, "JPEG", L, 8, 30, 16); } catch (e) {} }
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(15);
      doc.text(title, R, 15, { align: "right" });
      F("normal"); doc.setFontSize(8); doc.setTextColor(160, 205, 199);
      doc.text("Energy World · Save Energy, Money & Earth", R, 22, { align: "right" });
      doc.text("Date: " + fullDate(dateStr), R, 27, { align: "right" });
      doc.setTextColor(17, 34, 45);
      return { doc: doc, F: F, uni: uni, L: L, R: R, y: 46 };
    });
  }
  function commCustomerBlock(b, ch) {
    var doc = b.doc, F = b.F, L = b.L, y = b.y;
    F("bold"); doc.setFontSize(8.5); doc.setTextColor(13, 118, 108); doc.text("CUSTOMER", L, y);
    F("normal"); doc.setTextColor(17, 34, 45); doc.setFontSize(10.5); y += 6;
    doc.text(String(ch.customerName || "-"), L, y);
    if (ch.site) { y += 5.5; doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text("Site: " + ch.site, L, y); }
    return y + 11;
  }

  function commCertPdf(ch, dateStr, engineer) {
    var ci = commItemsOf(ch);
    return commPdfBase("COMMISSIONING CERTIFICATE", ch, dateStr).then(function (b) {
      var doc = b.doc, F = b.F, L = b.L, R = b.R, y;
      doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(10.5); y = 46;
      doc.splitTextToSize("This is to certify that the following product(s) supplied by Energy World have been successfully installed and commissioned at the customer's premises and found to be functioning to satisfaction.", R - L).forEach(function (ln) { doc.text(ln, L, y); y += 6; });
      b.y = y + 4; y = commCustomerBlock(b, ch);
      doc.setFillColor(30, 41, 59); doc.rect(L, y - 5.5, R - L, 9, "F");
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(7.6);
      doc.text("PRODUCT", L + 3, y); doc.text("QTY", R - 40, y, { align: "right" }); doc.text("WARRANTY", R - 3, y, { align: "right" });
      y += 9;
      ci.forEach(function (x, idx) {
        if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 4.5, R - L, 7, "F"); }
        doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(9);
        doc.text(doc.splitTextToSize(String(x.i.desc || ""), 120)[0], L + 3, y);
        doc.text(String(x.i.qty || 1), R - 40, y, { align: "right" });
        doc.text(((x.i.comm && x.i.comm.wm) || x.cat.months) + " months", R - 3, y, { align: "right" });
        y += 7;
      });
      y += 8; doc.setFontSize(9.5); doc.setTextColor(17, 34, 45); F("normal");
      doc.text("Challan No: " + String(ch.challanNo || "-"), L, y);
      doc.text("Commissioned on: " + fullDate(dateStr), L, y + 6);
      doc.text("Commissioning engineer: " + String(engineer || "-"), L, y + 12);
      var sy = 252; doc.setDrawColor(180, 190, 200); doc.line(R - 62, sy, R, sy);
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text("For Energy World — Authorised Signatory", R, sy + 5, { align: "right" });
      doc.setFontSize(6.6); doc.setTextColor(150, 163, 175);
      doc.text("Energy World  |  Panipat · Sonipat · Karnal", L, 290);
      return doc;
    });
  }

  function warrantyCardPdf(ch, dateStr) {
    var ci = commItemsOf(ch);
    return commPdfBase("WARRANTY CARD", ch, dateStr).then(function (b) {
      var doc = b.doc, F = b.F, L = b.L, R = b.R, y = commCustomerBlock(b, ch);
      F("bold"); doc.setFontSize(9.5); doc.setTextColor(13, 118, 108);
      doc.text("Energy World Installation Warranty", L, y); y += 7;
      doc.setFillColor(30, 41, 59); doc.rect(L, y - 5.5, R - L, 9, "F");
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(7.4);
      doc.text("PRODUCT", L + 3, y); doc.text("COMMISSIONED", R - 46, y, { align: "right" }); doc.text("WARRANTY VALID TILL", R - 3, y, { align: "right" });
      y += 9;
      ci.forEach(function (x, idx) {
        if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 4.5, R - L, 7, "F"); }
        doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(9);
        doc.text(doc.splitTextToSize(String(x.i.desc || ""), 92)[0], L + 3, y);
        var cd = (x.i.comm && x.i.comm.date) || dateStr;
        var wm = (x.i.comm && x.i.comm.wm) || x.cat.months;
        doc.text(fullDate(cd), R - 46, y, { align: "right" });
        F("bold"); doc.text(fullDate((x.i.comm && x.i.comm.till) || addMonths(cd, wm)), R - 3, y, { align: "right" }); F("normal");
        y += 7;
      });
      y += 10; F("bold"); doc.setFontSize(9); doc.setTextColor(13, 118, 108); doc.text("WARRANTY TERMS", L, y); F("normal");
      y += 6; doc.setFontSize(8.2); doc.setTextColor(80, 92, 108);
      [
        "1. This is the Energy World Installation Warranty — it covers installation workmanship, commissioning and functioning for the period stated above, from the commissioning date. The product's manufacturing warranty, if any, is provided separately by the manufacturer as per their terms.",
        "2. Consumables — filter media, resin, salt, membranes, cartridges and gaskets — are not covered.",
        "3. Damage from misuse, tampering, incorrect voltage, poor water quality, or servicing by unauthorised persons voids this warranty.",
        "4. This card must be produced for any warranty claim. Warranty is non-transferable.",
        "5. Free service visits during warranty do not extend the warranty period."
      ].forEach(function (t2) {
        doc.splitTextToSize(t2, R - L).forEach(function (ln) { doc.text(ln, L, y); y += 5; }); y += 1;
      });
      doc.setFontSize(6.6); doc.setTextColor(150, 163, 175);
      doc.text("Energy World  |  Panipat · Sonipat · Karnal", L, 290);
      return doc;
    });
  }

  function commissioningSection() {
    var pend = commPending(), done = commDone(), cs = "";
    var exp = warrantyExpiring(60);
    if (exp.length) {
      cs += '<div class="card" style="border-color:#fdba74;background:#fff7ed"><h3>Warranty ending — AMC opportunity <span class="pill soon">' + exp.length + '</span></h3>' +
        '<div class="meta">These commissioned units are near or past warranty end — the best moment to pitch an AMC or extended warranty.</div>';
      exp.slice(0, 15).forEach(function (x) {
        var lbl = x.days < 0 ? Math.abs(x.days) + 'd ago' : (x.days === 0 ? 'today' : x.days + 'd left');
        cs += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(x.client) + '</b> &middot; ' + esc(x.product) +
          '<br><span style="font-size:11px;color:#64748b">warranty till ' + esc(fullDate(x.till)) + ' &middot; ' + lbl + '</span></div>' +
          '<button class="btn sm" data-act="amc-wa" data-n="' + esc(x.client) + '" data-p="' + esc(x.product) + '" data-till="' + esc(x.till) + '">Offer AMC</button></div>';
      });
      cs += '</div>';
    }
    if (pend.length) {
      cs += '<div class="card" style="border-color:#fca5a5;background:#fef2f2"><h3>To commission <span class="pill due">' + pend.length + '</span></h3>' +
        '<div class="meta">Delivered products that need on-site commissioning. Enter the date to issue the certificate + warranty card.</div>';
      pend.forEach(function (c) {
        var names = commItemsOf(c).filter(function (x) { return !(x.i.comm && x.i.comm.date); }).map(function (x) { return x.cat.label; });
        cs += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(c.customerName || "") + '</b>' +
          (c.site ? ' <span style="color:#94a3b8;font-size:11px">' + esc(c.site) + '</span>' : "") +
          '<br><span style="font-size:11px;color:#64748b">' + esc(c.challanNo || "") + ' &middot; ' + esc(names.join(", ")) + '</span></div>' +
          '<button class="btn sm" data-act="comm-open" data-ch="' + esc(c.id) + '">Commission</button></div>';
      });
      cs += '</div>';
    }
    if (done.length) {
      cs += '<div class="card"><h3>Commissioned <span class="pill Won">' + done.length + '</span></h3><div class="meta">Re-print or send the documents any time.</div>';
      done.slice(0, 12).forEach(function (c) {
        cs += '<div class="acts" style="align-items:center;margin-top:8px;flex-wrap:wrap"><div class="grow"><b>' + esc(c.customerName || "") + '</b>' +
          '<br><span style="font-size:11px;color:#64748b">' + esc(c.challanNo || "") + ' &middot; ' + esc(fullDate(commDateOf(c))) + '</span></div>' +
          '<button class="btn sm ghost" data-act="comm-cert" data-ch="' + esc(c.id) + '">Certificate</button>' +
          '<button class="btn sm ghost" data-act="comm-warr" data-ch="' + esc(c.id) + '">Warranty</button>' +
          '<button class="btn sm" data-act="comm-warr-wa" data-ch="' + esc(c.id) + '">Send</button></div>';
      });
      cs += '</div>';
    }
    return cs;
  }

  function viewService() {
    var q = S.q.toLowerCase();
    var list = S.data.installs.filter(function (x) {
      return !q || (x.client + " " + x.area + " " + x.product + " " + x.engineer + " " + x.mobile).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return daysTo(a.nextService) - daysTo(b.nextService); });
    var due = list.filter(function (x) { return daysTo(x.nextService) <= 0; }).length;
    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + S.data.installs.length + '</div><div class="l">Installations</div></div>' +
      '<div class="stat ' + (due ? "alert" : "") + '"><div class="n">' + due + '</div><div class="l">Service due / overdue</div></div>' +
      '<div class="stat"><div class="n">' + S.data.installs.filter(function (x) { return x.amcType && x.amcType !== "None"; }).length + '</div><div class="l">Under AMC</div></div>' +
      '</div>';
    h += commissioningSection();
    h += '<div class="row"><input class="grow" id="q" placeholder="Search client, area, engineer..." value="' + esc(S.q) + '"/>' +
      '<button class="btn" data-act="inst-new">+ New installation</button></div>';
    if (!list.length) h += '<div class="empty">No installations yet.</div>';
    list.forEach(function (x) {
      var d = dueLabel(x);
      var bal = S.data.visits.filter(function (v) { return v.installId === x.id; })
        .reduce(function (a, v) { return a + (Number(v.balance) || 0); }, 0);
      h += '<div class="card"><h3>' + esc(x.client) + ' <span class="pill ' + d.k + '">' + d.t + '</span>' +
        (x.amcType && x.amcType !== "None" ? ' <span class="pill teal">AMC' + (x.amcEnd ? " to " + esc(dstr(x.amcEnd)) : "") + '</span>' : "") +
        (bal > 0 ? ' <span class="pill due">' + money(bal) + ' pending</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(x.product || "") + (x.model ? " " + esc(x.model) : "") +
        '<br>' + esc(x.area || "") + (x.mobile ? ' &middot; ' + esc(x.mobile) : "") +
        '<br>Every ' + esc(x.cycleDays || "?") + ' days &middot; water: ' + esc(x.waterQuality || "-") +
        '<br>Engineer: ' + esc(x.engineer || "unassigned") +
        (x.lastService ? '<br>Last service: ' + esc(dstr(x.lastService)) : "") + '</div>' +
        '<div class="acts">' +
        (x.mobile ? '<a class="btn sm ghost" href="tel:' + esc(x.mobile) + '">Call</a>' : "") +
        '<button class="btn sm" data-act="visit-new" data-id="' + esc(x.id) + '">Log visit</button>' +
        '<button class="btn sm ghost" data-act="inst-open" data-id="' + esc(x.id) + '">Edit</button></div></div>';
    });
    return h;
  }

  function viewSpares() {
    var q = S.q.toLowerCase();
    var list = S.data.spares.filter(function (x) {
      return !q || (x.code + " " + x.name + " " + x.category).toLowerCase().indexOf(q) >= 0;
    });
    var missing = S.data.spares.filter(function (x) { return !Number(x.price); }).length;
    var h = '<div class="row"><input class="grow" id="q" placeholder="Search spares..." value="' + esc(S.q) + '"/></div>';
    if (missing) h += '<div class="empty" style="text-align:left;padding:0 0 12px"><b>' + missing + ' spare(s) have no price yet.</b> Set them - the app will not guess a price for you.</div>';
    list.forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.name) + ' <span class="pill">' + esc(x.category) + '</span></h3>' +
        '<div class="meta">' + esc(x.code) + ' &middot; per ' + esc(x.unit) + '</div>' +
        '<div class="acts" style="align-items:center"><span class="pill teal">Rs</span>' +
        '<input class="sp-price" data-id="' + esc(x.id) + '" inputmode="decimal" value="' + esc(x.price || "") + '" placeholder="set price" style="width:120px;padding:7px 10px;font-size:13px"/>' +
        '</div></div>';
    });
    return h;
  }

  function viewDues() {
    var by = {};
    S.data.visits.forEach(function (v) {
      var b = Number(v.balance) || 0;
      if (!by[v.client]) by[v.client] = { bal: 0, n: 0, last: "" };
      by[v.client].bal += b;
      by[v.client].n += 1;
      if (!by[v.client].last || v.date > by[v.client].last) by[v.client].last = v.date;
    });
    var names = Object.keys(by).filter(function (k) { return by[k].bal > 0; })
      .sort(function (a, b) { return by[b].bal - by[a].bal; });
    var total = names.reduce(function (a, k) { return a + by[k].bal; }, 0);
    var h = '<div class="cards"><div class="stat ' + (total ? "alert" : "") + '"><div class="n">' + money(total) + '</div><div class="l">Total pending from clients</div></div>' +
      '<div class="stat"><div class="n">' + names.length + '</div><div class="l">Clients owing</div></div></div>';
    if (!names.length) return h + '<div class="empty">Nothing pending. Everything collected.</div>';
    names.forEach(function (k) {
      var vs = S.data.visits.filter(function (v) { return v.client === k && (Number(v.balance) || 0) > 0; });
      h += '<div class="card"><h3>' + esc(k) + ' <span class="pill due">' + money(by[k].bal) + '</span></h3><div class="meta">';
      vs.forEach(function (v) {
        h += esc(dstr(v.date)) + ' &middot; ' + esc(v.type) + ' &middot; billed ' + money(v.total) +
          ', paid ' + money(v.collected) + ', <b>due ' + money(v.balance) + '</b><br>';
      });
      h += '</div></div>';
    });
    return h;
  }

  function viewPayroll() {
    var month = S.q || new Date().toISOString().slice(0, 7);
    var h = '<div class="row"><input class="grow" id="q" type="month" value="' + esc(month) + '"/></div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Salary vs what each engineer actually collected in ' + esc(month) + '.</div>';
    SVC_ENGINEERS.forEach(function (eng) {
      var vs = S.data.visits.filter(function (v) {
        return v.engineer === eng && String(v.date).slice(0, 7) === month;
      });
      var billed = vs.reduce(function (a, v) { return a + (Number(v.total) || 0); }, 0);
      var collected = vs.reduce(function (a, v) { return a + (Number(v.collected) || 0); }, 0);
      var pr = S.data.payroll.filter(function (p) { return p.engineer === eng && p.month === month; })[0] || {};
      var sal = Number(pr.salary) || 0;
      var net = collected - sal;
      h += '<div class="card"><h3>' + esc(eng) + ' <span class="pill ' + (net >= 0 ? "Won" : "Lost") + '">' + (net >= 0 ? "+" : "") + money(net) + '</span></h3>' +
        '<div class="meta">' + vs.length + ' visit(s) &middot; billed ' + money(billed) + ' &middot; <b>collected ' + money(collected) + '</b>' +
        (billed - collected > 0 ? ' &middot; uncollected ' + money(billed - collected) : "") + '</div>' +
        '<div class="acts" style="align-items:center"><span class="pill">Salary</span>' +
        '<input class="pay-sal" data-eng="' + esc(eng) + '" data-month="' + esc(month) + '" data-id="' + esc(pr.id || "") + '" inputmode="numeric" value="' + esc(pr.salary || "") + '" placeholder="monthly salary" style="width:140px;padding:7px 10px;font-size:13px"/>' +
        '</div></div>';
    });
    return h;
  }

  function modalInstall(x) {
    x = x || {};
    return '<h2>' + (x.id ? "Edit installation" : "New installation") + '</h2>' +
      '<p class="sub">Service cycle drives the reminders. Hard water = shorter cycle.</p>' +
      '<label>Client</label><input id="i_client" value="' + esc(x.client) + '"/>' +
      '<div class="grid2"><div><label>Mobile</label><input id="i_mobile" inputmode="numeric" value="' + esc(x.mobile) + '"/></div>' +
      '<div><label>Area / route</label><input id="i_area" value="' + esc(x.area) + '"/></div></div>' +
      '<label>Address</label><input id="i_addr" value="' + esc(x.address) + '"/>' +
      '<div class="grid2"><div><label>Product</label><select id="i_prod">' + opts(SVC_PRODUCTS, x.product || SVC_PRODUCTS[0]) + '</select></div>' +
      '<div><label>Model / capacity</label><input id="i_model" value="' + esc(x.model) + '"/></div></div>' +
      '<div class="grid2"><div><label>Serial no.</label><input id="i_serial" value="' + esc(x.serial) + '"/></div>' +
      '<div><label>Install date</label><input id="i_idate" type="date" value="' + esc(dstr(x.installDate) || today()) + '"/></div></div>' +
      '<div class="grid2"><div><label>Water quality</label><select id="i_water">' + opts(WATER, x.waterQuality || "Hard") + '</select></div>' +
      '<div><label>Service every (days)</label><input id="i_cycle" inputmode="numeric" value="' + esc(x.cycleDays || "60") + '"/></div></div>' +
      '<div class="grid2"><div><label>Last service</label><input id="i_last" type="date" value="' + esc(dstr(x.lastService)) + '"/></div>' +
      '<div><label>Next service</label><input id="i_next" type="date" value="' + esc(dstr(x.nextService)) + '"/></div></div>' +
      '<div class="grid2"><div><label>AMC</label><select id="i_amc">' + opts(["None","Yearly","Visit-based"], x.amcType || "None") + '</select></div>' +
      '<div><label>AMC amount (Rs)</label><input id="i_amcamt" inputmode="numeric" value="' + esc(x.amcAmount || "") + '"/></div></div>' +
      '<div class="grid2"><div><label>AMC ends</label><input id="i_amcend" type="date" value="' + esc(dstr(x.amcEnd)) + '"/></div>' +
      '<div><label>Engineer</label><select id="i_eng">' + opts([""].concat(SVC_ENGINEERS), x.engineer) + '</select></div></div>' +
      '<label>Notes</label><textarea id="i_notes">' + esc(x.notes) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="inst-save" data-id="' + esc(x.id || "") + '">Save</button></div>';
  }

  function spareRow(i) {
    return '<div class="lineitem" data-row="' + i + '">' +
      '<input class="sv-d" list="sparelist" placeholder="Spare part" value=""/>' +
      '<input class="sv-q" inputmode="numeric" placeholder="Qty" value=""/>' +
      '<input class="sv-r" inputmode="decimal" placeholder="Rate" value=""/>' +
      '<button class="x" data-act="sv-del">&times;</button></div>';
  }

  function modalVisit(inst) {
    var saltPrice = spareByName("Salt tablet bag (25 kg)");
    return '<h2>Log a visit</h2><p class="sub">' + esc(inst.client) + ' &middot; ' + esc(inst.product || "") + ' &middot; ' + esc(inst.area || "") + '</p>' +
      '<div class="grid2"><div><label>Date</label><input id="v_date" type="date" value="' + today() + '"/></div>' +
      '<div><label>Engineer</label><select id="v_eng">' + opts(SVC_ENGINEERS, inst.engineer || SVC_ENGINEERS[0]) + '</select></div></div>' +
      '<label>Type of visit</label><select id="v_type">' + opts(VISIT_TYPES, "Periodic service") + '</select>' +
      '<div class="grid2"><div><label>Visit charge (Rs)</label><input id="v_charge" inputmode="numeric" value="' + MIN_VISIT + '"/></div>' +
      '<div><label>Salt bags</label><input id="v_salt" inputmode="numeric" value="0"/></div></div>' +
      '<label>Salt rate per bag (Rs)</label><input id="v_saltrate" inputmode="numeric" value="' + esc(saltPrice && saltPrice.price ? saltPrice.price : "") + '" placeholder="set the salt bag price in Spares"/>' +
      '<label>Spare parts used</label><div id="v_lines">' + spareRow(0) + '</div>' +
      '<button class="btn sm ghost" data-act="sv-add" style="margin-top:4px">+ Add spare</button>' +
      '<label>Collected now (Rs)</label><input id="v_coll" inputmode="numeric" value="0"/>' +
      '<label>Notes</label><textarea id="v_notes"></textarea>' +
      '<datalist id="sparelist">' + S.data.spares.map(function (p) { return '<option value="' + esc(p.name) + '"></option>'; }).join("") + '</datalist>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="visit-save" data-id="' + esc(inst.id) + '">Save visit</button></div>';
  }

  function clientById(id) { return S.data.clients.filter(function (c) { return c.id === id; })[0] || null; }
  function clientByName(n) {
    var t = String(n || "").trim().toLowerCase();
    return S.data.clients.filter(function (c) { return String(c.name).trim().toLowerCase() === t; })[0] || null;
  }
  function clientDiscount(client, brand) {
    var d = S.data.discounts.filter(function (x) {
      return String(x.client).toLowerCase() === String(client).toLowerCase() && String(x.brand) === String(brand);
    })[0];
    return d ? Number(d.pct) || 0 : 0;
  }
  /* ---- per-client, per-brand, per-partner incentive ----
     The incentive a partner earns is set at the SAME place as that client's brand discount
     (admin only). We store it on the very same discount row, in its `notes` column, as a small
     JSON map of role -> percent, e.g. {"plumber":5,"architect":3}. Role, not partner name, so it
     follows whoever is that client's plumber / architect today. No new sheet column is needed. */
  function discRow(client, brand) {
    return S.data.discounts.filter(function (x) {
      return String(x.client).trim().toLowerCase() === String(client).trim().toLowerCase() && String(x.brand) === String(brand);
    })[0] || null;
  }
  function incMap(row) {
    try { var m = JSON.parse((row && row.notes) || "{}"); return (m && typeof m === "object") ? m : {}; } catch (e) { return {}; }
  }
  function incRate(client, brand, role) {
    var d = discRow(client, brand); if (!d) return 0;
    return Number(incMap(d)[String(role).toLowerCase()]) || 0;
  }
  /* Which roles a partner fills on a client (usually one). Drives who earns the incentive. */
  function clientRolesOf(client, partnerLower) {
    var roles = [];
    ["architect", "plumber", "builder", "pmc"].forEach(function (role) {
      if (String(client[role] || "").trim().toLowerCase() === partnerLower && partnerLower) roles.push(role);
    });
    return roles;
  }
  /* The catalogue Master Brand column mixes real brands with categories. Map it. */
  function realBrand(p) {
    var m = S.data.brandmap.filter(function (x) { return String(x.catalogValue) === String(p.brand); })[0];
    return (m && m.brand) ? m.brand : "";
  }
  function brandList() {
    var live = {};
    PRODUCTS.forEach(function (p) { var b = realBrand(p); if (b) live[b] = (live[b] || 0) + 1; });
    /* Include a brand if it is active AND (it has catalogue products OR it is a real brand you
       distribute). This lets a brand with no products yet (FIMA, TOTO...) still be set up for
       discounts/incentives and picked in the quote builder - products can be added when needed.
       Accessory / Net-price buckets only appear when they actually carry products. */
    return S.data.brands
      .filter(function (b) { return String(b.active).toUpperCase() !== "N" && (live[b.brand] || isRealBrandName(b.brand)); })
      .map(function (b) { return b.brand; });
  }
  /* Catalogue buckets that are NOT real brands and must never appear in brand follow-ups. */
  var NON_BRANDS = ["accessory", "accessories", "net price items", "net price item", "net price", "misc", "miscellaneous"];
  function isRealBrandName(name) {
    return NON_BRANDS.indexOf(String(name || "").trim().toLowerCase()) < 0;
  }
  /* Brands you can FOLLOW UP / pitch - every active brand in the master, even one with no
     products loaded yet (a brand you distribute can be pitched before its catalogue is entered).
     Excludes accessory / net-price buckets, which are catalogue groups, not brands. */
  function followBrandList() {
    return S.data.brands
      .filter(function (b) { return String(b.active).toUpperCase() !== "N" && isRealBrandName(b.brand); })
      .map(function (b) { return b.brand; });
  }
  function brandProducts(brand) {
    return PRODUCTS.filter(function (p) { return realBrand(p) === brand; });
  }
  function familyList(brand) {
    var seen = {}, out = [];
    brandProducts(brand).forEach(function (p) {
      if (p.family && !seen[p.family]) { seen[p.family] = 1; out.push(p.family); }
    });
    return out.sort();
  }

  /* ---- per-brand quote helpers ----
     A quote can carry products from several brands (Lunos + Pentair + Oyster + ...).
     Each brand keeps its OWN discount in z.brandDiscs[brand]; a per-line override in
     i.disc still wins. Every item is tagged with i.brand so it can be grouped. */
  function brandByCode(code) {
    var p = PRODUCTS.filter(function (x) { return x.code === code; })[0];
    return p ? realBrand(p) : "";
  }
  /* distinct brands present in the quote, in the order they were first added */
  function qzBrands(z) {
    var seen = {}, out = [];
    (z.items || []).forEach(function (i) {
      var b = i.brand || brandByCode(i.code) || "";
      if (b && !seen[b]) { seen[b] = 1; out.push(b); }
    });
    return out;
  }
  /* effective discount for one line given the quote state */
  function lineDisc(i, z) {
    if (i.disc !== "" && i.disc !== undefined && i.disc !== null) return Number(i.disc) || 0;
    var b = i.brand || brandByCode(i.code) || "";
    var bd = z.brandDiscs && z.brandDiscs[b];
    return Number(bd) || 0;
  }
  /* gross/net for one brand's lines */
  function brandTotals(z, brand) {
    var gross = 0, net = 0, n = 0;
    (z.items || []).forEach(function (i) {
      var b = i.brand || brandByCode(i.code) || "";
      if (b !== brand) return;
      gross += i.qty * i.price;
      net += Math.round(i.price * (1 - (lineDisc(i, z)) / 100)) * i.qty; n++;
    });
    return { gross: Math.round(gross), net: Math.round(net), count: n };
  }
  /* the quote's location list is derived from the clients themselves, so a client in
     Karnal (or any city) shows up without hard-coding every town into the app. */
  function qLocations() {
    var seen = {}, out = [];
    (S.data.clients || []).forEach(function (c) {
      var l = String(c.location || "").trim();
      if (l && !seen[l.toLowerCase()]) { seen[l.toLowerCase()] = 1; out.push(l); }
    });
    LOCATIONS.forEach(function (l) { if (!seen[l.toLowerCase()]) { seen[l.toLowerCase()] = 1; out.push(l); } });
    return out.sort();
  }

  /* ---------- CUSTOMER BRAND BOARD ----------
     One board per customer, coloured straight from that customer's quotes (the single source
     of truth). A customer is a LEAD until his first brand is Won; then he graduates to CLIENT
     and the same board keeps running for the rest. State per brand:
       won  -> a Won quote exists   : greyed/parked, small reopen to wake it
       live -> an open quote exists : green, tap to continue/quote
       lost -> only lost quotes     : red strikethrough, wake-able
       none -> no quote yet         : neutral, tap to start
     "Waking" a parked brand just starts a fresh quote, which turns it green again. */
  function clientQuotes(name) {
    var t = String(name || "").trim().toLowerCase();
    return (S.data.quotes || []).filter(function (q) { return String(q.client || "").trim().toLowerCase() === t; });
  }
  function quoteBrands(q) {
    return String(q.brand || "").split(/,\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  /* A brand counts as WON if it has a Won quote OR a delivered challan (signed material
     receipt). And ANY delivered challan makes the customer a Client - so Clients seeds from
     real sales already made, even on challans that never recorded a brand. */
  function challanWonBrands(name) {
    var set = {}, t = String(name || "").trim().toLowerCase();
    (S.data.challans || []).forEach(function (c) {
      if (String(c.customerName || "").trim().toLowerCase() === t &&
        String(c.receiptReceived).toUpperCase() === "Y" && c.brand) {
        String(c.brand).split(/,\s*/).forEach(function (b) { b = b.trim(); if (b) set[b] = 1; });
      }
    });
    return set;
  }
  function clientDelivered(name) {
    var t = String(name || "").trim().toLowerCase();
    return (S.data.challans || []).some(function (c) {
      return String(c.customerName || "").trim().toLowerCase() === t &&
        String(c.receiptReceived).toUpperCase() === "Y";
    });
  }
  function clientWonBrands(name) {
    var set = challanWonBrands(name);
    clientQuotes(name).forEach(function (q) {
      if (q.status === "Won") quoteBrands(q).forEach(function (b) { set[b] = 1; });
    });
    /* manual per-brand wins (for old clients entered without a quote) */
    (S.data.pitch || []).forEach(function (p) {
      if (String(p.clientName || "") === name && p.status === "Won" && p.brand) set[p.brand] = 1;
    });
    return Object.keys(set);
  }
  function clientWonCount(name) { return clientWonBrands(name).length; }
  function isClient(name) { return clientWonBrands(name).length > 0 || clientDelivered(name); }
  /* Board state blends quotes + delivered challans + a manual per-brand status (clientPitch), so
     old clients with pre-app history can be recorded directly. Priority: won > live > lost > none. */
  function clientBrandState(name, brand) {
    if (clientWonBrands(name).indexOf(brand) >= 0) return "won";
    var ps = (clientPitch(name, brand) || {}).status || "";
    if (ps === "Not required") return "nr";
    var qs = clientQuotes(name).filter(function (q) { return quoteBrands(q).indexOf(brand) >= 0; });
    var hasOpen = qs.some(function (q) { return ["Draft", "Sent", "Negotiating", "Revised"].indexOf(q.status) >= 0; });
    if (hasOpen || ["Pitched", "Quoted", "Negotiating", "Ongoing"].indexOf(ps) >= 0) return "live";
    if (ps === "Lost" || qs.length) return "lost";
    return "none";
  }
  function brandBoard(name, compact) {
    var brands = brandList();
    /* compact card mode: only REAL brands - "Accessory" / "Net Price Items" are allied-item
       heads, not brands, and they were eating a whole line on every lead card. Still quotable
       from the quote builder. One line, small chips, side-scroll if narrow. */
    if (compact) brands = brands.filter(function (b) {
      var l = String(b).toLowerCase();
      return l.indexOf("accessor") < 0 && l.indexOf("net price") < 0;
    });
    if (!brands.length) return "";
    var base = compact
      ? "display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:10px;font-size:11px;margin:0 4px 0 0;border:1px solid;cursor:pointer;flex:0 0 auto;"
      : "display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:14px;font-size:12px;margin:0 6px 6px 0;border:1px solid;cursor:pointer;";
    return (compact
      ? '<div style="margin-top:6px;display:flex;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px">'
      : '<div style="margin-top:8px;display:flex;flex-wrap:wrap">') + brands.map(function (b) {
      var st = clientBrandState(name, b), sty, inner;
      if (st === "won") { sty = base + "background:#f1f5f9;color:#94a3b8;border-color:#cbd5e1"; inner = "✓ " + esc(b); }
      else if (st === "lost") { sty = base + "background:#fef2f2;color:#dc2626;border-color:#fecaca"; inner = '<span style="text-decoration:line-through">' + esc(b) + '</span>'; }
      else if (st === "live") { sty = base + "background:#0d9488;color:#fff;border-color:#0d9488"; inner = esc(b); }
      else if (st === "nr") { sty = base + "background:#f8fafc;color:#94a3b8;border-color:#e2e8f0"; inner = esc(b) + ' <span style="font-size:10px">n/a</span>'; }
      else { sty = base + "background:#fff;color:#334155;border-color:#e2e8f0"; inner = esc(b); }
      return '<button data-act="board-menu" data-n="' + esc(name) + '" data-brand="' + esc(b) + '" style="' + sty + '">' + inner + '</button>';
    }).join("") + '</div>';
  }
  /* Tapping a brand opens this menu: quote it (the main path) OR just record the outcome. */
  function modalBrandAction(name, brand) {
    var st = clientBrandState(name, brand);
    var pstat = (clientPitch(name, brand) || {}).status || "";
    var label = { won: "Won ✓", lost: "Lost", live: "In play", none: "Not started", nr: "Not required" }[st] || "";
    return '<h2>' + esc(brand) + '</h2>' +
      '<p class="sub">' + esc(name) + ' &middot; currently: <b>' + esc(label) + '</b></p>' +
      '<button class="btn" style="width:100%;justify-content:center;margin-bottom:12px" data-act="board-quote" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '">Quote this brand</button>' +
      '<div class="empty" style="text-align:left;padding:0 0 8px;font-size:12.5px">Or just record the outcome — for an old client or a verbal deal (no quote made):</div>' +
      '<div class="acts" style="flex-wrap:wrap">' +
      '<button class="btn sm" data-act="board-status" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '" data-s="Won">Mark Won</button>' +
      '<button class="btn sm ghost" data-act="board-status" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '" data-s="Ongoing">Ongoing</button>' +
      '<button class="btn sm ghost" data-act="board-status" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '" data-s="Lost">Lost</button>' +
      '<button class="btn sm ghost" data-act="board-nr" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '">Not required</button>' +
      (pstat && pstat !== "Not pitched" ? '<button class="btn sm ghost" data-act="board-status" data-n="' + esc(name) + '" data-brand="' + esc(brand) + '" data-s="">Clear</button>' : "") +
      '</div>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button></div>';
  }

  /* ---------- BRAND-WISE FOLLOW-UP ----------
     Every customer is chased brand by brand. A lead shows under every brand until he wins one
     (then he becomes a Client but still shows under the brands he hasn't bought - cross-sell). A
     brand drops off a customer's list only when it is marked Won, Lost or Not required (reason). */
  function viewBrandFollow() {
    var brands = followBrandList();
    if (!brands.length) return '<div class="empty">No brands set up yet.</div>';
    if (!S.bf || brands.indexOf(S.bf) < 0) S.bf = brands[0];
    if (S.bfMode !== "client") S.bfMode = "lead";
    var mode = S.bfMode, wantClient = mode === "client";
    var custs = S.data.clients || [];
    if (!seesAllClients()) custs = custs.filter(function (c) { return isMineClient(c.name); });
    var openByBrand = {};
    brands.forEach(function (b) { openByBrand[b] = []; });
    custs.forEach(function (c) {
      if (isClient(c.name) !== wantClient) return;
      brands.forEach(function (b) {
        var st = clientBrandState(c.name, b);
        if (st === "none" || st === "live") openByBrand[b].push({ c: c, st: st });
      });
    });
    var brand = S.bf, listOpen = openByBrand[brand] || [];
    var h = '<div class="row" style="gap:8px;margin-bottom:10px">' +
      '<button class="btn ' + (wantClient ? "ghost" : "") + '" data-act="bf-mode" data-m="lead">Lead follow-up</button>' +
      '<button class="btn ' + (wantClient ? "" : "ghost") + '" data-act="bf-mode" data-m="client">Client follow-up</button>' +
      '</div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 10px">' +
      (wantClient
        ? 'Clients who have bought at least one brand. Pick a brand and cross-sell the ones they haven\'t bought yet &mdash; a name drops off when that brand is marked <b>Won</b>, <b>Lost</b> or <b>Not required</b>.'
        : 'Leads who haven\'t won a single brand yet. Pick a brand and chase each one &mdash; they stay here until a brand is <b>Won</b> (then they move to <b>Client follow-up</b>), <b>Lost</b> or <b>Not required</b>.') +
      ' The number on each brand is how many are still open.</div>';
    h += '<div class="row" style="flex-wrap:wrap;gap:6px">' + brands.map(function (b) {
      var n = openByBrand[b].length;
      return '<button class="btn sm ' + (b === brand ? "" : "ghost") + '" data-act="bf-brand" data-brand="' + esc(b) + '">' + esc(b) + (n ? ' <b>' + n + '</b>' : '') + '</button>';
    }).join("") + '</div>';
    h += '<div class="cards"><div class="stat ' + (listOpen.length ? "alert" : "") + '"><div class="n">' + listOpen.length + '</div><div class="l">' +
      (wantClient ? 'Clients to cross-sell' : 'Leads to chase') + ' &middot; ' + esc(brand) + '</div></div></div>';
    var rowH = function (x) {
      var c = x.c, num = String(c.mobile || "").replace(/\D/g, "");
      var pill = x.st === "live" ? '<span class="pill teal">in play</span>' : '<span class="pill">not started</span>';
      return '<div class="card"><h3>' + esc(c.name) + ' ' + pill + '</h3>' +
        '<div class="meta">' + esc([c.area, c.location].filter(Boolean).join(", ")) + (c.mobile ? '<br>' + esc(c.mobile) : "") + '</div>' +
        '<div class="acts" style="flex-wrap:wrap;margin-top:6px">' +
        '<button class="btn sm" data-act="board-quote" data-n="' + esc(c.name) + '" data-brand="' + esc(brand) + '">Quote</button>' +
        (num ? '<a class="btn sm ghost" href="tel:' + esc(num) + '">Call</a>' : "") +
        '<button class="btn sm ghost" data-act="board-status" data-n="' + esc(c.name) + '" data-brand="' + esc(brand) + '" data-s="Won">Won</button>' +
        '<button class="btn sm ghost" data-act="board-status" data-n="' + esc(c.name) + '" data-brand="' + esc(brand) + '" data-s="Lost">Lost</button>' +
        '<button class="btn sm ghost" data-act="board-nr" data-n="' + esc(c.name) + '" data-brand="' + esc(brand) + '">Not required</button>' +
        '</div></div>';
    };
    if (!listOpen.length) { h += '<div class="empty">No ' + (wantClient ? 'clients' : 'leads') + ' open for ' + esc(brand) + ' &mdash; nothing to chase here. 🎉</div>'; return h; }
    listOpen.forEach(function (x) { h += rowH(x); });
    return h;
  }

  /* Leads = customers with zero Won brands. Enter leads here; a brand tap starts its quote. */
  function viewLeadBoard() {
    var loc = S.q;
    var leads = S.data.clients.filter(function (c) { return !isClient(c.name); });
    /* a sales exec's lead board holds ONLY their own leads (assigned to them, or entered by them) */
    if (!seesAllClients()) leads = leads.filter(function (c) { return isMineClient(c.name); });
    var shown = leads.filter(function (c) { return !loc || c.location === loc; });
    var clocs = [];
    leads.forEach(function (c) { if (c.location && clocs.indexOf(c.location) < 0) clocs.push(c.location); });
    clocs.sort();
    var h = '<div class="empty" style="text-align:left;padding:0 0 10px">A <b>lead</b> is a customer who hasn’t won a single brand yet. Tap a brand to quote it; the moment one brand’s quote is marked <b>Won</b>, he moves to <b>Clients</b> automatically.</div>';
    h += '<div class="row">' + clocs.map(function (l) {
      return '<button class="btn sm ' + (S.q === l ? "" : "ghost") + '" data-act="cl-loc" data-loc="' + esc(l) + '">' + esc(l) + '</button>';
    }).join("") + (clocs.length ? '<button class="btn sm ' + (S.q ? "ghost" : "") + '" data-act="cl-loc" data-loc="">All</button>' : "") +
      '<div class="grow"></div><button class="btn" data-act="cl-new">+ New lead</button></div>';
    /* The owner's standing rule now lives ON each card as PL/AR badges (red = enter detail),
       so no separate "names missing" card here - the weekly reminder modal still fires. */
    var aging = agingLeads();
    if (!seesAllClients()) aging = aging.filter(function (x) { return isMineClient(x.c.name); });
    if (aging.length) {
      h += '<div class="card" style="border-color:#fdba74;background:#fff7ed"><h3>Going quiet <span class="pill soon">' + aging.length + '</span></h3>' +
        '<div class="meta">No quote activity for ' + STALE_LEAD + '+ days — give them a nudge before they go cold.</div>';
      aging.slice(0, 12).forEach(function (x) {
        h += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(x.c.name) + '</b>' +
          (x.c.location ? ' <span style="color:#94a3b8;font-size:11px">' + esc(x.c.location) + '</span>' : "") +
          '<br><span style="font-size:11px;color:#64748b">quiet ' + x.days + 'd</span></div>' +
          (x.c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(x.c.mobile) + '">Call</a>' : "") + '</div>';
      });
      h += '</div>';
    }
    if (!shown.length) return h + '<div class="empty">No leads here. Add one, then tap a brand to start quoting.</div>';

    ensurePickerCss();   /* the exec band (.ch-exec) styling lives with the picker CSS */
    function leadCardHtml(c) {
      var cSeg = clientSegment(c);
      var openQ = clientQuotes(c.name).filter(function (q) { return ["Draft", "Sent", "Negotiating", "Revised"].indexOf(q.status) >= 0; }).length;
      /* COMPACT: one header line (name + pills + PL/AR badges + Call/Edit), one brand line.
         The plumber/architect gap shows on the card itself - green with phone, red to fill. */
      return '<div class="card lc-compact">' +
        '<div class="lc-top"><div class="lc-id"><b>' + esc(c.name) + '</b>' +
        ' <span class="pill teal">' + esc(c.location || "-") + '</span>' +
        (cSeg ? ' <span class="pill" style="background:' + (cSeg === "Project" ? "#e0e7ff;color:#3730a3" : "#dcfce7;color:#166534") + '">' + esc(cSeg) + '</span>' : "") +
        (openQ ? ' <span class="pill soon">' + openQ + ' in play</span>' : "") +
        (c.mobile ? ' <span style="color:#94a3b8;font-size:12px;white-space:nowrap">' + esc(c.mobile) + '</span>' : "") +
        '</div>' +
        '<div class="lc-right">' + partnerBadge(c, "plumber") + partnerBadge(c, "architect") +
        (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : "") +
        '<button class="btn sm ghost" data-act="cl-open" data-id="' + esc(c.id) + '">Edit</button></div></div>' +
        brandBoard(c.name, true) + '</div>';
    }

    /* Admin / accounts read the lead book grouped under the sales executive it's assigned to (teal
       band per exec), mirroring the Clients and Challans views. Everyone else keeps the flat list. */
    if (seesAllClients()) {
      var groups = {}, order = [];
      shown.forEach(function (c) {
        var e = String(c.ownedBy || c.createdBy || "").trim() || "Unassigned";
        if (!groups[e]) { groups[e] = []; order.push(e); }
        groups[e].push(c);
      });
      order.sort(function (a, b) {
        if (a === "Unassigned") return 1; if (b === "Unassigned") return -1;
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });
      order.forEach(function (e) {
        var cs = groups[e].slice().sort(function (a, b) { return String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : 1; });
        h += '<div class="ch-exec">' + esc(e) +
          '<span class="sub">' + cs.length + ' lead' + (cs.length !== 1 ? 's' : '') + '</span></div>';
        cs.forEach(function (c) { h += leadCardHtml(c); });
      });
    } else {
      shown.forEach(function (c) { h += leadCardHtml(c); });
    }
    return h;
  }

  function viewClients() {
    var loc = S.q;
    var all = S.data.clients.filter(function (c) { return isClient(c.name); });
    if (!seesAllClients()) all = all.filter(function (c) { return isMineClient(c.name); });   /* a sales exec sees only clients assigned to them */
    var list = all.filter(function (c) { return !loc || c.location === loc; });
    var clocs = [];
    all.forEach(function (c) { if (c.location && clocs.indexOf(c.location) < 0) clocs.push(c.location); });
    clocs.sort();
    var h = '<div class="empty" style="text-align:left;padding:0 0 10px">A <b>client</b> has won at least one brand. Keep cross-selling the rest — tap any brand on his board to quote it.</div>';
    h += '<div class="row">' + clocs.map(function (l) {
      return '<button class="btn sm ' + (S.q === l ? "" : "ghost") + '" data-act="cl-loc" data-loc="' + esc(l) + '">' + esc(l) + '</button>';
    }).join("") + (clocs.length ? '<button class="btn sm ' + (S.q ? "ghost" : "") + '" data-act="cl-loc" data-loc="">All</button>' : "") + '</div>';
    if (!list.length) return h + '<div class="empty">No clients yet. A lead becomes a client here the moment one of his quotes is marked Won.</div>';

    ensurePickerCss();   /* the exec band (.ch-exec) styling lives with the picker CSS */
    function clientCardHtml(c) {
      var won = clientWonCount(c.name);
      var cSeg = clientSegment(c);
      /* COMPACT: one header line (name + pills + PL/AR badges + Call/Edit), one brand line.
         Builder/PMC/address stay on the Edit form - the card is for scanning the book fast. */
      return '<div class="card lc-compact">' +
        '<div class="lc-top"><div class="lc-id"><b>' + esc(c.name) + '</b>' +
        ' <span class="pill teal">' + esc(c.location || "-") + '</span>' +
        (cSeg ? ' <span class="pill" style="background:' + (cSeg === "Project" ? "#e0e7ff;color:#3730a3" : "#dcfce7;color:#166534") + '">' + esc(cSeg) + '</span>' : "") +
        ' <span class="bs win">' + (won ? won + ' WON' : 'CLIENT') + '</span>' +
        (c.mobile ? ' <span style="color:#94a3b8;font-size:12px;white-space:nowrap">' + esc(c.mobile) + '</span>' : "") +
        '</div>' +
        '<div class="lc-right">' + partnerBadge(c, "plumber") + partnerBadge(c, "architect") +
        (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : "") +
        '<button class="btn sm ghost" data-act="cl-open" data-id="' + esc(c.id) + '">Edit</button></div></div>' +
        brandBoard(c.name, true) + '</div>';
    }

    /* For admin / accounts, group the client list by the sales executive it's assigned to (a teal
       band per exec), so the owner can read the book exec-wise. A sales exec (list already filtered
       to their own clients) just gets the flat list. */
    if (seesAllClients()) {
      var groups = {}, order = [];
      list.forEach(function (c) {
        var e = String(c.ownedBy || c.createdBy || "").trim() || "Unassigned";
        if (!groups[e]) { groups[e] = []; order.push(e); }
        groups[e].push(c);
      });
      order.sort(function (a, b) {
        if (a === "Unassigned") return 1; if (b === "Unassigned") return -1;
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });
      order.forEach(function (e) {
        var cs = groups[e].slice().sort(function (a, b) { return String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : 1; });
        h += '<div class="ch-exec">' + esc(e) +
          '<span class="sub">' + cs.length + ' client' + (cs.length !== 1 ? 's' : '') + '</span></div>';
        cs.forEach(function (c) { h += clientCardHtml(c); });
      });
    } else {
      list.forEach(function (c) { h += clientCardHtml(c); });
    }
    return h;
  }

  /* ALTERATION AT RECEIPT.
     Short, excess, or something added at site. The dispatched list is never rewritten - what
     went out stays exactly as it went out, and this records what actually landed. Otherwise a
     shortage silently disappears and there is nothing to put to the transporter. */
  function modalAlter() {
    var c = (S.data.challans || []).filter(function (x) { return x.id === S.alt.id; })[0] || {};
    var dispatched = [];
    try { dispatched = JSON.parse(c.itemsJson || "[]"); } catch (e) { }
    if (!S.alt.rows) {
      S.alt.rows = dispatched.slice().sort(function (a, b) { return (Number(b.qty) || 0) - (Number(a.qty) || 0); }).map(function (i) {
        return { code: i.code || "", desc: i.desc || "", unit: i.unit || "", was: Number(i.qty) || 0, now: Number(i.qty) || 0, note: "" };
      });
    }
    var h = '<h2>Receipt - ' + esc(c.challanNo || "") + '</h2>' +
      '<div class="meta" style="margin-bottom:8px">Enter what actually arrived. Leave a line alone if it came in full.</div>' +
      '<div style="max-height:46vh;overflow:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<tr style="text-align:left;color:#64748b;font-size:10px">' +
      '<th style="padding:4px">ITEM</th><th style="width:52px">SENT</th><th style="width:64px">RECEIVED</th><th style="width:110px">REASON</th></tr>';
    S.alt.rows.forEach(function (r, i) {
      var diff = Number(r.now) - Number(r.was);
      var col = diff === 0 ? "#94a3b8" : (diff < 0 ? "#dc2626" : "#0d9488");
      h += '<tr style="border-top:1px solid #e2e8f0">' +
        '<td style="padding:5px 4px">' + esc(r.desc) + '<br><span style="color:#94a3b8;font-size:10px">' + esc(r.code) + '</span></td>' +
        '<td style="color:#94a3b8">' + r.was + '</td>' +
        '<td><input id="alt_q' + i + '" inputmode="numeric" value="' + r.now + '" style="width:56px;padding:4px" data-act="alt-q" data-i="' + i + '"/>' +
        '<div style="font-size:10px;color:' + col + '">' + (diff === 0 ? "full" : (diff > 0 ? "+" + diff + " excess" : diff + " short")) + '</div></td>' +
        '<td><input id="alt_n' + i + '" value="' + esc(r.note) + '" placeholder="reason" style="width:100%;padding:4px"/></td>' +
        '</tr>';
    });
    h += '</table></div>' +
      '<label style="margin-top:10px">Add a product that was NOT on the challan</label>' +
      '<div class="row"><input class="grow" id="alt_add" list="prodlist" placeholder="Product code or name"/>' +
      '<input id="alt_addq" inputmode="numeric" placeholder="Qty" style="width:70px"/>' +
      '<button class="btn sm ghost" data-act="alt-add">Add</button></div>' + prodDatalist() +
      '<div class="foot"><button class="btn ghost" data-act="alt-cancel">Cancel</button>' +
      '<button class="btn" data-act="alt-save">Confirm receipt</button></div>';
    return h;
  }

  /* ONE client field for the whole app. A challan, a return, an old delivery and a quote all
     need the same thing: pick an existing client, or register a new one properly - with his
     architect, plumber, area, second number, the lot. Four half-copies of that meant a client
     typed on a challan arrived with no partners and no area, and the same man ended up in the
     book twice under two spellings. One field, one form, everywhere. */
  function billRows(c) {
    var list = [];
    try { list = JSON.parse((S.billDraft !== null && S.billDraft !== undefined) ? JSON.stringify(S.billDraft) : (c && c.billingJson) || "[]"); } catch (e) { list = []; }
    if (!list.length) return '<div class="meta" style="color:#94a3b8">None yet - the first challan will ask.</div>';
    return '<div class="meta">' + list.map(function (b, i) {
      return '&bull; <b>' + esc(b.name) + '</b>' + (b.gstin ? ' &middot; ' + esc(b.gstin) : "") +
        ' <button class="btn sm ghost" data-act="bill-del" data-i="' + i + '" style="padding:0 6px">&times;</button>';
    }).join("<br>") + '</div>';
  }

  /* ONE number, ONE person. Two names on a number means incentive lands on the wrong man and
     a client gets rung twice by two executives. This warns and lets you carry on - a father
     and son really do share a phone, and blocking that would just teach people to type 0000.
     Checks clients, partners and drivers together, because the same plumber is often two of
     the three. */
  function dupWarn(fields) {
    return api("dupCheck", fields).then(function (r) {
      var hits = (r && r.hits) || [];
      if (!hits.length) return true;
      var phone = hits.filter(function (h) { return h.why === "same phone number"; });
      var name = hits.filter(function (h) { return h.why === "same name"; });
      var msg = "";
      if (phone.length) {
        msg += "This NUMBER is already saved against:\n\n" +
          phone.map(function (h) { return "  \u2022 " + h.name + " (" + h.kind + (h.role ? " - " + h.role : "") + ")"; }).join("\n") +
          "\n\nIf that is the same person, cancel and edit him instead of adding him twice.\n";
      }
      if (name.length) {
        msg += (msg ? "\n" : "") + "This NAME already exists:\n\n" +
          name.slice(0, 6).map(function (h) { return "  \u2022 " + h.name + " - " + (h.mobile || "no number") + " (" + h.kind + ")"; }).join("\n") +
          "\n\nDifferent person in a different town? Carry on.\n";
      }
      return window.confirm(msg + "\nSave anyway?");
    }).catch(function () { return true; });   /* never block a save because the check failed */
  }

  function clientField(id, value, label) {
    var list = (S.data.clients || []).map(function (c) { return c.name; });
    return '<label>' + (label || "Client") + '</label>' +
      '<div class="row">' +
      '<input class="grow" id="' + id + '" list="ew_clientlist" autocomplete="off" ' +
      'placeholder="Type client name" value="' + esc(value || "") + '"/>' +
      '<button class="btn sm ghost" data-act="cl-inline" data-for="' + id + '">+ New</button>' +
      '</div>' +
      '<datalist id="ew_clientlist">' + list.map(function (n) {
        return '<option value="' + esc(n) + '"></option>';
      }).join("") + '</datalist>';
  }

  /* ---- partner dropdowns + the weekly "names missing" push ----
     Owner's rule: a lead is no use without its plumber and architect. So those two fields are
     DROPDOWN-ONLY (pick a registered partner, or add a new one - which demands a mobile number),
     and whoever entered a lead/client that is still missing either name is reminded weekly. */
  function partnerNames(role) {
    var want = String(role || "").toLowerCase();
    var seen = {}, primary = [], other = [];
    (S.data.associates || []).forEach(function (a) {
      var n = String(a.name || "").trim(); if (!n || seen[n]) return; seen[n] = 1;
      (String(a.role || "").toLowerCase() === want ? primary : other).push(n);
    });
    (S.data.clients || []).forEach(function (x) {
      var n = String(x[want] || "").trim(); if (n && !seen[n]) { seen[n] = 1; other.push(n); }
    });
    primary.sort(); other.sort();
    return { primary: primary, other: other };
  }
  function partnerSelect(id, role, cur, noAdd) {
    var p = partnerNames(role);
    cur = String(cur || "").trim();
    var have = p.primary.indexOf(cur) >= 0 || p.other.indexOf(cur) >= 0;
    var opt = function (n) { return '<option value="' + esc(n) + '"' + (n === cur ? " selected" : "") + '>' + esc(n) + '</option>'; };
    return '<select id="' + id + '">' +
      '<option value="">&mdash; select &mdash;</option>' +
      (cur && !have ? opt(cur) : "") +
      p.primary.map(opt).join("") +
      (p.other.length ? '<optgroup label="Other partners">' + p.other.map(opt).join("") + '</optgroup>' : "") +
      (noAdd ? "" : '<option value="__new__">+ Add new (not in list)</option>') +
      '</select>';
  }
  /* PL / AR status badge for a lead/client card. Green with the partner's phone when named;
     red "Enter Detail" (tap = open Edit) when missing - the gap shows on the card itself. */
  function partnerBadge(c, role) {
    var pre = role === "plumber" ? "PL" : "AR";
    var nm = String(c[role] || "").trim();
    if (!nm) return '<button class="pl-badge pl-miss" data-act="cl-open" data-id="' + esc(c.id) + '">' + pre + ' &mdash; Enter Detail</button>';
    var key = nm.toLowerCase();
    var a = (S.data.associates || []).filter(function (x) { return String(x.name || "").trim().toLowerCase() === key; })[0] || {};
    var ph = String(a.mobile || "").trim();
    return '<span class="pl-badge pl-ok">' + pre + ' ' + esc(nm) + (ph ? ' &middot; ' + esc(ph) : '') + '</span>';
  }
  var CL_FORM_IDS = ["c_name","c_loc","c_type","c_segment","c_mob","c_mob2","c_short","c_area","c_addr","c_arch","c_plumb","c_build","c_pmc","c_notes","c_owner","c_opamt","c_opdate","c_leadtype","c_billname","c_billgst"];
  function clFormVals() {
    var v = {};
    CL_FORM_IDS.forEach(function (fid) { var e2 = el(fid); if (e2) v[fid] = e2.value; });
    return v;
  }
  function clFormRestore(v) {
    CL_FORM_IDS.forEach(function (fid) { var e2 = el(fid); if (e2 && v[fid] !== undefined) e2.value = v[fid]; });
  }
  function partnersMissing() {
    return (S.data.clients || []).filter(function (c) {
      if (!String(c.name || "").trim()) return false;
      var missP = !String(c.plumber || "").trim(), missA = !String(c.architect || "").trim();
      if (!missP && !missA) return false;
      if (!seesAllClients() && !isMineClient(c.name)) return false;
      return true;
    });
  }
  function modalPartnerNag() {
    var list = partnersMissing();
    var h = '<h2>Missing plumber / architect names</h2>' +
      '<p class="sub">A lead is no use without its plumber and architect. Fill them in &mdash; pick from the list, or add the partner (mobile number required).</p>';
    list.slice(0, 30).forEach(function (c) {
      var miss = [!String(c.plumber || "").trim() ? "plumber" : "", !String(c.architect || "").trim() ? "architect" : ""].filter(Boolean).join(" + ");
      h += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(c.name) + '</b>' +
        (seesAllClients() ? ' <span style="color:#94a3b8;font-size:11px">' + esc(c.ownedBy || c.createdBy || "") + '</span>' : '') +
        '<br><span style="font-size:11px;color:#b45309">missing ' + miss + '</span></div>' +
        '<button class="btn sm" data-act="cl-open" data-id="' + esc(c.id) + '">Fill now</button></div>';
    });
    if (list.length > 30) h += '<div class="meta" style="margin-top:8px">&hellip;and ' + (list.length - 30) + ' more.</div>';
    h += '<div class="foot"><button class="btn ghost" data-act="close">Later</button></div>';
    return h;
  }
  function maybePartnerNag() {
    try {
      if (!S.user || S.modal) return;
      /* the weekly chase is for whoever enters/owns leads - sales and admin.
         Accounts / godown / service can't fix a lead's plumber, so never nag them. */
      if (S.role !== "sales" && S.role !== "admin") return;
      var key = "ew_pnag_" + S.user;
      var last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < 7 * 86400000) return;      /* once a week per person */
      if (!partnersMissing().length) return;
      localStorage.setItem(key, String(Date.now()));
      S.modal = modalPartnerNag(); render();
    } catch (e) { }
  }

  function modalClient(c) {
    c = c || {};
    var names = function (role) {
      var seen = {}, out = [];
      S.data.clients.forEach(function (x) { if (x[role] && !seen[x[role]]) { seen[x[role]] = 1; out.push(x[role]); } });
      S.data.associates.forEach(function (a) { if (a.name && !seen[a.name]) { seen[a.name] = 1; out.push(a.name); } });
      return out;
    };
    var dl = function (id, role) {
      return '<datalist id="' + id + '">' + names(role).map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>';
    };
    return '<h2>' + (c.id ? "Edit customer" : "New lead") + '</h2>' +
      '<p class="sub">Enter a new lead — or an old client. Partners named here flow into every quote, challan and incentive. Mark his brands on the board afterwards.</p>' +
      '<label>Client name</label><input id="c_name" value="' + esc(c.name) + '"/>' +
      '<div class="grid2"><div><label>Location</label>' + (function () {
        /* CITY dropdown only — free-typed plot/colony text was exploding into dozens of
           unusable location chips. Pick a city, or "+ Add new location" for a genuinely new
           one. An old odd value stays selectable, so just opening a client changes nothing;
           correcting it moves the odd text into Address (see cl-save) so nothing is lost. */
        var ls = locations(), cur = String(c.location || "").trim();
        var listL = [""].concat(cur && ls.indexOf(cur) < 0 ? [cur] : [], ls, ["+ Add new location"]);
        return '<select id="c_loc">' + opts(listL, cur) + '</select>';
      })() + '</div>' +
      '<div><label>Type</label><select id="c_type">' + opts(CLIENT_TYPES, c.type || "Home owner") + '</select></div></div>' +
      '<div class="grid2"><div><label>Segment</label><select id="c_segment">' + opts(["", "Residential", "Project"], c.segment || "") + '</select>' +
      '<div class="pmeta" style="font-size:11px;color:#94a3b8">Leave blank to auto-classify from Type.</div></div><div></div></div>' +
      '<div class="grid2"><div><label>Mobile</label><input id="c_mob" inputmode="numeric" value="' + esc(c.mobile) + '"/></div>' +
      '<div><label>Alternate mobile</label><input id="c_mob2" inputmode="numeric" value="' + esc(c.mobile2 || "") + '"/></div></div>' +
      '<div class="grid2"><div><label>Short name (challan no.)</label><input id="c_short" value="' + esc(c.shortName) + '" placeholder="SHARMA"/></div>' +
      '<div><label>Area / colony</label><input id="c_area" value="' + esc(c.area || "") + '" placeholder="e.g. Model Town"/></div></div>' +
      '<label>Address</label><input id="c_addr" value="' + esc(c.address) + '"/>' +
      '<div class="grid2"><div><label>Architect</label>' + partnerSelect("c_arch", "architect", c.architect) + '</div>' +
      '<div><label>Plumber</label>' + partnerSelect("c_plumb", "plumber", c.plumber) + '</div></div>' +
      '<div class="meta" style="font-size:11px;color:#94a3b8;margin:-4px 0 6px">Pick from the list. If he isn’t on it, choose <b>+ Add new</b> &mdash; his mobile number is required.</div>' +
      '<div class="grid2"><div><label>Builder</label><input id="c_build" list="dl_build" value="' + esc(c.builder) + '"/></div>' +
      '<div><label>PMC</label><input id="c_pmc" list="dl_pmc" value="' + esc(c.pmc) + '"/></div></div>' +
      dl("dl_build", "builder") + dl("dl_pmc", "pmc") +
      '<label>Notes</label><textarea id="c_notes">' + esc(c.notes) + '</textarea>' +
      '<label>Assigned to (sales exec)</label>' + ownerField("c_owner", c.ownedBy || c.createdBy, !c.id) +
      /* Migration block - partners only. The server refuses these fields from anyone else, and
         a field that is visible but always errors is just a trap, so sales never sees it. */
      (S.role === "admin"
        ? '<div style="margin-top:14px;padding:10px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px">' +
          '<h3 style="margin:0 0 2px;font-size:13px">Migrating from the old books</h3>' +
          '<div class="meta" style="margin-bottom:8px">Only for a client who already existed before this app.</div>' +
          '<div class="grid2">' +
          '<div><label>Pending amount</label><input id="c_opamt" inputmode="numeric" placeholder="148000" value="' + esc(c.openingAmt || "") + '"/></div>' +
          '<div><label>As on date</label><input id="c_opdate" type="date" value="' + esc(c.openingAsOn || "") + '"/></div>' +
          '</div>' +
          '<div class="grid2">' +
          '<div><label>Lead type</label><select id="c_leadtype">' + opts(["New", "Old"], c.leadType || "New") + '</select></div>' +
          '<div></div>' +
          '</div>' +
          '<div class="meta" style="margin-top:6px">A pending amount marks him <b>Old</b> automatically. It is money owed, not this month\u2019s sale, and it earns nobody an incentive.</div>' +
          '</div>'
        : "") +
      /* Billing names. A man bills his house in his own name and his shop through his firm -
         same client, two bills. Asked once, reused on every challan after that. */
      '<h3 style="margin:14px 0 4px;font-size:13px">Bills under</h3>' +
      '<div class="meta" style="margin-bottom:6px">Add every name this client is billed under. You can add more later.</div>' +
      (billRows(c) || "") +
      '<div class="row"><input class="grow" id="c_billname" placeholder="Name on the bill"/>' +
      '<input id="c_billgst" placeholder="GSTIN (optional)" style="width:150px"/>' +
      '<button class="btn sm ghost" data-act="bill-add">Add</button></div>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="cl-save" data-id="' + esc(c.id || "") + '">Save client</button></div>';
  }

  function uniRupee() { return true; }

  function qzTotals() {
    var gross = 0, net = 0;
    (S.qz.items || []).forEach(function (i) {
      var d = lineDisc(i, S.qz);
      gross += i.qty * i.price;
      /* round per line (discounted unit rate x qty) so the on-screen total, the
         per-brand subtotals and the printed PDF all reconcile to the same figure. */
      net += Math.round(i.price * (1 - (Number(d) || 0) / 100)) * i.qty;
    });
    var gst = net * GST;
    return { gross: Math.round(gross), net: Math.round(net), gst: Math.round(gst), total: Math.round(net + gst) };
  }

  function viewQuotes() {
    if (S.qz) return viewQzWizard();
    var h = '<div class="row"><div class="grow"></div><button class="btn" data-act="qz-new">+ New quote</button></div>';
    var list = S.data.quotes.slice().reverse();
    if (!seesAllClients()) list = list.filter(function (q) { return isMineClient(q.client); });
    if (!list.length) { h += '<div class="empty">No quotes yet. Every quote is versioned - revising keeps the old one.</div>'; return h; }

    ensurePickerCss();   /* exec band (.ch-exec) + sub-strip (.ch-client) styling */
    function quoteCardHtml(q) {
      /* Title + figures on the left; the action row sits top-right to use the empty space -
         and WRAPS below on a narrow screen (phone/tablet) so nothing gets squeezed. */
      return '<div class="card" style="padding:9px 13px;margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
        '<div style="flex:1 1 240px;min-width:0">' +
        '<h3 style="margin:0 0 2px;font-size:13.5px">' + esc(q.quoteNo) + ' <span class="pill ' + (q.status === "Won" ? "Won" : (q.status === "Lost" ? "Lost" : "teal")) + '">' + esc(q.status) + '</span>' +
        (Number(q.version) > 1 ? ' <span class="pill">v' + esc(q.version) + '</span>' : "") + '</h3>' +
        '<div class="meta" style="font-size:12px;line-height:1.5">' + esc(q.client) + ' &middot; ' + esc(q.brand) +
        '<br>net <b>' + money(q.net) + '</b> &middot; <b>' + money(q.total) + '</b> incl GST &middot; ' + esc(q.discountPct) + '% off ' + money(q.gross) +
        ' <span style="color:#94a3b8">&middot; ' + esc(dstr(q.createdAt)) + ' ' + esc(q.createdBy) + '</span></div>' +
        '</div>' +
        '<div class="acts" style="margin:0;flex:0 0 auto;flex-wrap:wrap;justify-content:flex-end;gap:6px">' +
        '<select class="qs" data-id="' + esc(q.id) + '" style="width:auto;padding:5px 8px;font-size:12.5px">' + opts(QSTATUS, q.status) + '</select>' +
        '<button class="btn sm" data-act="q-pdf" data-id="' + esc(q.id) + '">Download PDF</button>' +
        '<button class="btn sm ghost" data-act="q-tg" data-id="' + esc(q.id) + '">Telegram</button>' +
        (q.status === "Won" ? '<button class="btn sm" data-act="q-challan" data-id="' + esc(q.id) + '">Make challan</button>' : "") +
        '<button class="btn sm ghost" data-act="qz-revise" data-id="' + esc(q.id) + '">Revise</button></div>' +
        '</div></div>';
    }
    /* win/loss lens: Won, then Lost, then everything still open (Draft/Sent/Negotiating/Revised). */
    var qCat = function (q) { return q.status === "Won" ? "Won" : (q.status === "Lost" ? "Lost" : "In play"); };
    var CAT = ["Won", "Lost", "In play"];
    var catColor = { "Won": "#047857", "Lost": "#b91c1c", "In play": "#0f766e" };
    function renderByOutcome(quotes) {
      var byCat = { "Won": [], "Lost": [], "In play": [] };
      quotes.forEach(function (q) { byCat[qCat(q)].push(q); });
      CAT.forEach(function (cat) {
        if (!byCat[cat].length) return;
        h += '<div class="ch-client" style="border-left-color:' + catColor[cat] + ';color:' + catColor[cat] + '">' + cat +
          '<span class="sub" style="color:' + catColor[cat] + '">' + byCat[cat].length + '</span></div>';
        byCat[cat].forEach(function (q) { h += quoteCardHtml(q); });
      });
    }

    /* Admin / accounts read the quote book grouped by the sales executive who owns the client, and
       within each exec by outcome (Won / Lost / In play). A sales exec (list already filtered to
       their own clients) skips the exec band but still gets the win/loss breakdown. */
    if (seesAllClients()) {
      var groups = {}, order = [];
      list.forEach(function (q) {
        var cl = clientByName(q.client) || {};
        var e = String(cl.ownedBy || cl.createdBy || "").trim() || "Unassigned";
        if (!groups[e]) { groups[e] = []; order.push(e); }
        groups[e].push(q);
      });
      order.sort(function (a, b) {
        if (a === "Unassigned") return 1; if (b === "Unassigned") return -1;
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
      });
      order.forEach(function (e) {
        var qs = groups[e];
        var won = qs.filter(function (q) { return q.status === "Won"; }).length;
        var lost = qs.filter(function (q) { return q.status === "Lost"; }).length;
        h += '<div class="ch-exec">' + esc(e) +
          '<span class="sub">' + qs.length + ' quote' + (qs.length !== 1 ? 's' : '') +
          ' &middot; ' + won + ' won &middot; ' + lost + ' lost</span></div>';
        renderByOutcome(qs);
      });
    } else {
      renderByOutcome(list);
    }
    return h;
  }

  /* Device-aware WhatsApp share of a jsPDF document (a Promise that resolves to a jsPDF
     doc). WhatsApp cannot accept a file from a plain link, so behaviour differs by device:
     on a PHONE we use the native share sheet (the PDF rides along as the attachment); on a
     LAPTOP we open the chat immediately (while the click is still "fresh", so the browser
     doesn't block the pop-up) and download the PDF to drag in. Shared by quote share (q-wa /
     rad-wa) and the payment reminder (pay-wa). */
  function waShareDoc(docPromise, fname, wnum, wmsg) {
    /* WhatsApp cannot carry a file through a wa.me link - a hard platform limit. So we HOST the
       PDF: the backend saves it to Drive and returns a view-only link, and we put that link in
       the message. The customer taps it and gets the PDF, on any phone or computer. A blank tab
       is opened first (inside the click, so it isn't popup-blocked) and redirected to WhatsApp
       once the link is ready. If hosting fails, we fall back to downloading the PDF to drag in. */
    var win = window.open("", "_blank");
    toast("Preparing the PDF link...");
    docPromise.then(function (d) {
      var b64 = d.output("datauristring").split(",")[1];
      return api("pdfHost", { pdfBase64: b64, filename: fname }).then(function (r) {
        var link = (r && r.ok && r.url) ? r.url : "";
        var msg = wmsg + (link ? "\n\nView / download your PDF:\n" + link : "");
        var waUrl = "https://wa.me/" + (wnum || "") + "?text=" + encodeURIComponent(msg);
        if (win && !win.closed) { win.location = waUrl; } else { window.open(waUrl, "_blank"); }
        if (link) { toast("WhatsApp opened - the PDF link is in the message."); }
        else { d.save(fname); toast("Couldn't host the PDF - opened WhatsApp, downloaded the PDF to drag in."); }
      });
    }).catch(function () {
      /* PDF build or host errored: still open WhatsApp with the text, download the PDF to attach */
      try { if (win && !win.closed) win.location = "https://wa.me/" + (wnum || "") + "?text=" + encodeURIComponent(wmsg); } catch (e) { }
      docPromise.then(function (d) { d.save(fname); }).catch(function () { });
      toast("Opened WhatsApp - attach the downloaded PDF.");
    });
  }

  function waShareQuote(id) {
    var wq = (S.data.quotes || []).filter(function (x) { return x.id === id; })[0];
    if (!wq) return;
    var wcl = clientByName(wq.client) || {};
    var wnum = String(wcl.mobile || "").replace(/\D/g, "");
    if (wnum.length === 10) wnum = "91" + wnum;
    var wmsg = "Hello " + wq.client + ",\n\nSharing your quotation " + wq.quoteNo + " from Energy World.\n" +
      "Amount: " + moneyAscii(wq.net) + " (GST as applicable). Valid for 30 days.\n" +
      "Please let us know if we may proceed.\n\nThank you,\nEnergy World";
    var fname = String(wq.quoteNo).replace(/[^\w.-]/g, "_") + ".pdf";
    waShareDoc(quotePdf(wq), fname, wnum, wmsg);
  }

  function viewQzWizard() {
    var z = S.qz;
    var steps = ["Client", "Brand", "Products", "Discount", "Review"];
    /* Back keeps the in-progress quote. From Brand it returns to Products whenever a brand has
       already been chosen (adding another brand, then changing your mind) - otherwise, on the
       very first brand pick, to Client. Cancel still discards the whole draft. */
    var backStep = z.step === 2 ? (z.brand ? 3 : 1) : (z.step - 1);
    var h = '<div class="row">' + steps.map(function (nm, i) {
      return '<span class="pill ' + (z.step === i + 1 ? "teal" : "") + '">' + (i + 1) + '. ' + nm + '</span>';
    }).join("") + '<div class="grow"></div>' +
      (z.step > 1 ? '<button class="btn sm ghost" data-act="qz-step" data-step="' + backStep + '">&larr; Back</button>' : '') +
      '<button class="btn sm ghost" data-act="qz-cancel">Cancel</button></div>';

    if (z.step === 1) {
      var all = z.location === "*";
      var inLoc = S.data.clients.filter(function (c) { return !z.location || all || c.location === z.location; });
      h += '<div class="card"><h3>Where is the client?</h3><div class="acts">' +
        qLocations().map(function (l) {
          return '<button class="btn sm ' + (z.location === l ? "" : "ghost") + '" data-act="qz-loc" data-loc="' + esc(l) + '">' + esc(l) + '</button>';
        }).join("") +
        '<button class="btn sm ' + (all ? "" : "ghost") + '" data-act="qz-loc" data-loc="*">All clients</button>' +
        '</div></div>';
      if (z.location) {
        h += '<div class="card"><h3>Which client?</h3>' +
          '<div class="meta">' + inLoc.length + ' client(s) ' + (all ? 'in all areas' : 'in ' + esc(z.location)) + '. Start typing.</div>' +
          '<input id="qz_client" list="clientlist" placeholder="Type client name..." value="' + esc(z.client || "") + '" style="margin-top:8px"/>' +
          '<datalist id="clientlist">' + inLoc.map(function (c) { return '<option value="' + esc(c.name) + '"></option>'; }).join("") + '</datalist>' +
          '<div class="acts"><button class="btn" data-act="qz-client-go">Continue</button>' +
          '<button class="btn ghost" data-act="cl-new">Not listed - register</button></div></div>';
        if (z.clientObj) {
          var c = z.clientObj;
          h += '<div class="card"><h3>' + esc(c.name) + '</h3><div class="meta">' +
            esc(c.mobile || "") + '<br>' + esc(c.address || "") +
            '<br>Arch: ' + esc(c.architect || "-") + ' - Plumber: ' + esc(c.plumber || "-") +
            '<br>Builder: ' + esc(c.builder || "-") + ' - PMC: ' + esc(c.pmc || "-") + '</div></div>';
        }
      }
      return h;
    }

    if (z.step === 2) {
      h += '<div class="empty" style="text-align:left;padding:0 0 12px">Quoting for <b>' + esc(z.client) + '</b>. Pick a brand.</div>';
      var unmapped = S.data.brandmap.filter(function (m) { return !m.brand; }).length;
      if (unmapped) h += '<div class="empty" style="text-align:left;padding:0 0 12px"><b>' + unmapped + ' catalogue value(s) are not mapped to a brand yet</b> - those products cannot be quoted. A partner can fix this under Catalogue.</div>';
      brandList().forEach(function (b) {
        var n = brandProducts(b).length;
        var d = clientDiscount(z.client, b);
        h += '<div class="card"><h3>' + esc(b) + ' <span class="pill">' + n + ' products</span>' +
          (d ? ' <span class="pill teal">' + d + '% preset</span>' : "") + '</h3>' +
          '<div class="acts"><button class="btn sm" data-act="qz-brand" data-brand="' + esc(b) + '">Choose</button></div></div>';
      });
      return h;
    }

    if (z.step === 3) {
      var chosen = qzBrands(z);
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="2">+ Add brand</button>' +
        '<span class="pill teal">' + esc(z.brand) + '</span>' +
        (chosen.length ? '<span class="pmeta" style="font-size:12px;color:#64748b">in quote: ' + esc(chosen.join(", ")) + '</span>' : '') +
        '<div class="grow"></div>' +
        '<button class="btn" data-act="qz-step" data-step="4">Discount (' + (z.items || []).length + ')</button></div>';

      /* One compact product row - reused by the family list and the code search below. */
      var qzProw = function (p) {
        var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
        return '<div class="prow ' + (ex ? "picked" : "") + '">' +
          (p.pic ? '<img src="' + esc(p.pic) + '" loading="lazy"/>' : '<div class="noimg"></div>') +
          '<div class="pinfo"><div class="pname">' + esc(p.desc) + '</div>' +
          '<div class="pmeta">' + esc(p.code) + ' &middot; ' + money(p.price) + ' / ' + esc(p.unit) +
          (p.brand && p.brand !== z.brand ? ' &middot; ' + esc(p.brand) : '') + '</div></div>' +
          '<div class="pqty">' +
          '<button class="stp" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="-1">&minus;</button>' +
          '<input class="qz-q" data-code="' + esc(p.code) + '" inputmode="numeric" value="' + esc(ex ? ex.qty : "") + '" placeholder="0"/>' +
          '<button class="stp" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
          '</div></div>';
      };

      /* Search straight to a product by its code (or a word in its name) without hunting
         through the family chips. A code is unique across the catalogue, so this looks at
         every product - adding a hit from another brand just starts that brand in the quote. */
      h += '<div class="row" style="margin:8px 0 2px">' +
        '<input id="qz_code" class="grow" autocomplete="off" placeholder="Search by product code" value="' + esc(z.codeq || "") + '"/>' +
        '<button class="btn sm" data-act="qz-code-go">Find</button>' +
        (z.codeq ? ' <button class="btn sm ghost" data-act="qz-code-clear">Clear</button>' : '') + '</div>';

      if (z.codeq && String(z.codeq).trim()) {
        var qc = String(z.codeq).trim().toLowerCase();
        var hits = PRODUCTS.filter(function (p) {
          return String(p.code || "").toLowerCase().indexOf(qc) > -1 ||
            String(p.desc || "").toLowerCase().indexOf(qc) > -1;
        }).slice(0, 40);
        h += '<div class="plist">';
        if (!hits.length) h += '<div class="empty">No product matches "' + esc(z.codeq) + '".</div>';
        hits.forEach(function (p) { h += qzProw(p); });
        h += '</div>';
        return h;
      }

      /* a brand you distribute but have not catalogued yet: say so plainly instead of an empty
         "pick a family" with no families under it */
      if (!brandProducts(z.brand).length) {
        return h + '<div class="empty" style="text-align:left">No products loaded for <b>' + esc(z.brand) + '</b> yet. Add them under <b>Products</b> (Catalogue) and they will appear here to quote. You can still set this brand’s discount &amp; incentive on the <b>Discounts</b> screen and chase it under <b>Brand follow-up</b>.</div>';
      }
      /* families as small horizontal chips, not a vertical wall of cards */
      var fams = familyList(z.brand);
      h += '<div class="chips">' + fams.map(function (f) {
        var n = brandProducts(z.brand).filter(function (p) { return p.family === f; }).length;
        return '<button class="chip ' + (z.family === f ? "on" : "") + '" data-act="qz-fam" data-fam="' + esc(f) + '">' +
          esc(f) + ' <b>' + n + '</b></button>';
      }).join("") + '</div>';

      if (!z.family) return h + '<div class="empty">Pick a family above, or search by code.</div>';

      /* compact product rows: pic, name, price, stepper - all on one line */
      h += '<div class="plist">';
      brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
        h += qzProw(p);
      });
      h += '</div>';
      return h;
    }

    if (z.step === 4) {
      var t4 = qzTotals();
      var dBrands = qzBrands(z);
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="3">Products</button>' +
        '<div class="grow"></div><button class="btn" data-act="qz-step" data-step="5">Review</button></div>';

      /* one discount per brand - each brand is a separate negotiation. A sales exec cannot change
         discounts: for them each brand is FIXED to the client's pre-set rate (owner-controlled), the
         inputs become read-only chips, and the per-line override is hidden. */
      var lockDisc = !canSetPricing();
      if (lockDisc) {
        z.brandDiscs = z.brandDiscs || {};
        dBrands.forEach(function (b) { z.brandDiscs[b] = clientDiscount(z.client, b); });
        (z.items || []).forEach(function (i) { delete i.disc; });   // no per-line overrides for sales
      }
      h += '<div class="card"><h3>Discount by brand</h3>' +
        '<div class="meta">' + (lockDisc
          ? 'Set from <b>' + esc(z.client) + '</b>\u2019s pre-set rate for each brand. Only the owner can change discounts.'
          : 'Each brand gets its own discount, applied to every line of that brand. Type all of them, then Apply.') + '</div>';
      dBrands.forEach(function (b) {
        var bt = brandTotals(z, b);
        h += '<div class="row" style="margin:8px 0 0;align-items:center;gap:10px">' +
          '<div style="min-width:150px"><b>' + esc(b) + '</b>' +
          '<div class="pmeta">' + bt.count + ' item(s) \u00B7 ' + money(bt.gross) + ' \u2192 <b>' + money(bt.net) + '</b></div></div>' +
          (lockDisc
            ? '<span class="pill teal" style="font-size:15px;padding:8px 12px;font-weight:700">' + esc(z.brandDiscs[b] || 0) + '% off list</span>'
            : '<input class="qz-bd" data-brand="' + esc(b) + '" inputmode="decimal" value="' + esc(z.brandDiscs && z.brandDiscs[b] != null ? z.brandDiscs[b] : 0) + '" style="width:80px;padding:9px 10px;font-size:16px;font-weight:700"/>' +
              '<span class="pill teal">% off list</span>') + '</div>';
      });
      h += (lockDisc ? '' : '<div class="acts" style="margin-top:12px"><button class="btn sm" data-act="qz-bd">Apply brand discounts</button></div>') + '</div>';

      if (!lockDisc) {
        /* product-wise override hidden behind a disclosure - most people never need it */
        var overrides = (z.items || []).filter(function (i) { return i.disc !== undefined && i.disc !== ""; }).length;
        h += '<button class="btn ghost" data-act="qz-adv" style="width:100%;margin-bottom:10px">' +
          (z.adv ? "\u25B2 Hide product-wise discount" : "\u25BC Change discount product-wise") +
          (overrides ? "  (" + overrides + " overridden)" : "") + '</button>';

        if (z.adv) {
          h += '<div class="plist">';
          dBrands.forEach(function (b) {
            h += '<div class="prow" style="background:#f8fafc"><div class="pinfo"><b>' + esc(b) + '</b> <span class="pmeta">(brand ' + esc(z.brandDiscs && z.brandDiscs[b] != null ? z.brandDiscs[b] : 0) + '%)</span></div></div>';
            (z.items || []).filter(function (i) { return (i.brand || brandByCode(i.code)) === b; }).forEach(function (i) {
              var d = lineDisc(i, z);
              var lineNet = Math.round(i.qty * i.price * (1 - (Number(d) || 0) / 100));
              h += '<div class="prow">' +
                '<div class="pinfo"><div class="pname">' + esc(i.desc) + '</div>' +
                '<div class="pmeta">' + i.qty + ' \u00d7 ' + money(i.price) + '  \u2192  <b>' + money(lineNet) + '</b></div></div>' +
                '<div class="pqty">' +
                '<input class="qz-d" data-code="' + esc(i.code) + '" inputmode="decimal" value="' + esc(i.disc === undefined ? "" : i.disc) + '" placeholder="' + esc(z.brandDiscs && z.brandDiscs[b] != null ? z.brandDiscs[b] : 0) + '" style="width:52px"/>' +
                '<span class="pill">%</span></div></div>';
            });
          });
          h += '</div>';
        }
      }

      h += '<div class="card"><div class="meta">Gross ' + money(t4.gross) +
        '<br>After discount <b>' + money(t4.net) + '</b>' +
        '<br><span style="color:#94a3b8">GST as actual - never printed on the quote</span></div></div>';
      return h;
    }

    var tt = qzTotals();
    var revBrands = qzBrands(z);
    h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="4">Back to discount</button>' +
      '<div class="grow"></div><button class="btn" data-act="qz-save">Save quote</button></div>';
    h += '<div class="card"><h3>' + esc(z.client) + ' — ' + esc(revBrands.join(", ") || "-") + '</h3>' +
      '<div class="meta" style="margin-bottom:10px">' + (z.items || []).length + ' line(s) across ' + revBrands.length + ' brand(s)</div>';

    /* Excel-like review: one table, grouped by brand, each brand with its own subtotal. */
    var TB = 'border:1px solid #e2e8f0;';
    var thBase = TB + 'padding:6px 8px;font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;';
    var thL = 'style="' + thBase + 'text-align:left"', thR = 'style="' + thBase + 'text-align:right"';
    h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:560px;font-variant-numeric:tabular-nums lining-nums">' +
      '<thead><tr>' +
      '<th ' + thL + '>Item</th>' +
      '<th ' + thR + '>Qty</th>' +
      '<th ' + thR + '>Rate</th>' +
      '<th ' + thR + '>Disc%</th>' +
      '<th ' + thR + '>Disc. Rate</th>' +
      '<th ' + thR + '>Amount</th>' +
      '</tr></thead><tbody>';

    var tdL = 'style="' + TB + 'padding:6px 8px;font-size:12px;text-align:left"';
    var tdR = 'style="' + TB + 'padding:6px 8px;font-size:12px;text-align:right"';
    revBrands.forEach(function (b) {
      var bt = brandTotals(z, b);
      var bdPct = (z.brandDiscs && z.brandDiscs[b] != null) ? z.brandDiscs[b] : 0;
      h += '<tr><td colspan="6" style="' + TB + 'padding:6px 8px;background:#ccfbf1;color:#0f766e;font-weight:700;font-size:12px">' +
        esc(b) + ' &middot; brand ' + esc(bdPct) + '% off</td></tr>';
      (z.items || []).filter(function (i) { return (i.brand || brandByCode(i.code)) === b; }).forEach(function (i) {
        var d = lineDisc(i, z);
        var dr = Math.round(i.price * (1 - d / 100));
        var amt = dr * i.qty;
        var ov = (i.disc !== "" && i.disc !== undefined && i.disc !== null);
        h += '<tr>' +
          '<td ' + tdL + '><div style="font-weight:600">' + esc(i.desc) + '</div>' +
            '<div style="font-size:10px;color:#94a3b8">' + esc(i.code) + '</div></td>' +
          '<td ' + tdR + '>' + i.qty + '</td>' +
          '<td ' + tdR + '>' + money(i.price) + '</td>' +
          '<td ' + tdR + '>' + (Number(d) || 0) + (ov ? '<span style="color:#0f766e">*</span>' : '') + '</td>' +
          '<td ' + tdR + '>' + money(dr) + '</td>' +
          '<td ' + tdR + '><b>' + money(amt) + '</b></td>' +
          '</tr>';
      });
      h += '<tr><td colspan="5" style="' + TB + 'padding:6px 8px;text-align:right;font-size:12px;background:#f8fafc">' +
        esc(b) + ' subtotal (gross ' + money(bt.gross) + ')</td>' +
        '<td style="' + TB + 'padding:6px 8px;text-align:right;background:#f8fafc"><b>' + money(bt.net) + '</b></td></tr>';
    });
    h += '</tbody><tfoot>' +
      '<tr><td colspan="5" style="' + TB + 'padding:8px;text-align:right;font-weight:700;font-size:13px">Grand total (before GST)</td>' +
      '<td style="' + TB + 'padding:8px;text-align:right;font-weight:800;font-size:13px;color:#0f766e">' + money(tt.net) + '</td></tr>' +
      '</tfoot></table></div>';
    h += '<div class="meta" style="margin-top:8px">Gross ' + money(tt.gross) + ' &middot; after discount <b>' + money(tt.net) + '</b> &middot; GST 18% ' + money(tt.gst) +
      ' &middot; <b>Total incl GST ' + money(tt.total) + '</b>' +
      '<br><span style="color:#94a3b8">* = product-wise override.</span></div>';
    /* GST-on-the-PDF toggle. Ticked -> the PDF prints Sub-Total, GST @ 18% and Grand Total.
       Unticked -> the PDF keeps "Sub-Total { GST as Actual }" with no GST amount. */
    h += '<label class="card" data-act="qz-gst" style="margin-top:10px;border-color:#99f6e4;background:#f0fdfa;display:flex;align-items:center;gap:12px;cursor:pointer">' +
      '<span style="flex:0 0 auto;width:22px;height:22px;border-radius:6px;border:2px solid #0d9488;background:' + (z.gst ? '#0d9488' : '#fff') + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:15px">' + (z.gst ? '✓' : '') + '</span>' +
      '<span><b style="font-size:14px">Show 18% GST on the quote PDF</b>' +
      '<div class="pmeta" style="font-size:12px;color:#64748b">Ticked: the PDF prints Sub-Total, GST @ 18% and Grand Total (incl. GST). Unticked: it shows &ldquo;Sub-Total { GST as Actual }&rdquo; with no GST amount.</div></span></label>';
    h += '<div class="acts" style="margin-top:12px"><button class="btn" data-act="qz-save">Save quote</button></div></div>';
    return h;
  }

  
/* ============ BRAND PRICE LIST PDF (admin + accounts) ============
   A brand-format list to send outside: brand logo and name only in the header,
   product pictures, no Energy World identity anywhere on the page. ============ */
function plBrands() {
  var live = {};
  PRODUCTS.forEach(function (p) {
    var b = String(p.brand || "").trim();
    if (b) live[b] = (live[b] || 0) + 1;
  });
  return Object.keys(live).sort().map(function (b) { return { brand: b, n: live[b] }; });
}

function viewPriceList() {
  if (["admin", "accounts"].indexOf(S.role) < 0)
    return '<div class="empty">Price lists are for partners and accounts only.</div>';
  S.pl = S.pl || {};
  var bs = plBrands();
  if (!bs.length) return '<div class="empty">No products loaded yet.</div>';
  var picked = Object.keys(S.pl).filter(function (k) { return S.pl[k]; });
  var h = '<div class="card"><h3>Brand price list</h3>' +
    '<p class="sub">Pick one or more brands. The PDF carries the brand name and logo only ' +
    '- no Energy World details - so it can go straight to a customer or architect.</p><div class="chips">';
  bs.forEach(function (b) {
    var on = !!S.pl[b.brand];
    h += '<button class="chip' + (on ? ' on' : '') + '" data-act="pl-tog" data-b="' + esc(b.brand) + '">' +
         (on ? "&#10003; " : "") + esc(b.brand) + ' <span class="mut">' + b.n + '</span></button>';
  });
  h += '</div>';
  var tot = bs.filter(function (b) { return S.pl[b.brand]; }).reduce(function (a, b) { return a + b.n; }, 0);
  h += '<div class="row" style="margin-top:10px">' +
       '<button class="btn" data-act="pl-pdf"' + (picked.length ? "" : " disabled") + '>' +
       (picked.length ? "Download PDF - " + picked.length + " brand" + (picked.length > 1 ? "s" : "") + ", " + tot + " products" : "Pick a brand first") +
       '</button>';
  if (picked.length) h += '<button class="btn ghost" data-act="pl-clear">Clear</button>';
  h += '</div>';
  if (tot > 400) h += '<p class="sub" style="color:#b45309">That is ' + tot + ' products - the PDF will take a while and be a large file. Consider fewer brands.</p>';
  h += '</div>';
  return h;
}


// Pipe families lead every price list - that is what a plumber looks for first.
function plRank(fam) {
  var f = String(fam || "").toUpperCase();
  if (/\bPIPE\b|\bPIPES\b/.test(f)) return 0;
  return 1;
}

async function priceListPdf(brands) {
  if (["admin", "accounts"].indexOf(S.role) < 0) { toast("Not allowed."); return; }
  var rows = PRODUCTS.filter(function (p) { return brands.indexOf(String(p.brand || "").trim()) >= 0; });
  if (!rows.length) { toast("No products for that brand."); return; }
  toast("Building price list...");
  var pics = {}, uniq = [];
  rows.forEach(function (p) { var u = String(p.pic || "").trim(); if (u && uniq.indexOf(u) < 0) uniq.push(u); });
  var f = await loadFonts();
  var got = await Promise.all(uniq.map(function (u) { return loadPic(u); }));
  uniq.forEach(function (u, i) { pics[u] = got[i]; });
  var logos = {};
  var lg = await Promise.all(brands.map(function (b) {
    var row = (S.data.logos || []).filter(function (l) { return String(l.brand || "").trim().toLowerCase() === b.toLowerCase(); })[0];
    return row ? loadPic(row.url) : Promise.resolve(null);
  }));
  brands.forEach(function (b, i) { logos[b] = lg[i]; });

  var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  var uni = false;
  if (f) {
    doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
    uni = true;
  }
  // no bold anywhere - weight is carried by colour and size
  var F = function () { doc.setFont(uni ? "DJ" : "helvetica", "normal"); };
  var GSTX = 1.18;
  var money = function (n) {
    var v = Math.round(Number(n || 0) * GSTX);
    return (uni ? "\u20B9" : "Rs ") + v.toLocaleString("en-IN");
  };
  var L = 10, Rt = 200, first = true;
  var C = { pic: L, code: L + 7, desc: L + 34, unit: 158, mrp: Rt };
  var ROW = 5.6, PIC = 4.6;

  brands.forEach(function (brand) {
    var list = rows.filter(function (p) { return String(p.brand || "").trim() === brand; })
                   .sort(function (a, b) { return plRank(a.family) - plRank(b.family) || String(a.family).localeCompare(String(b.family)) || (a.price - b.price); });
    if (!list.length) return;
    if (!first) doc.addPage();
    first = false;
    var y = 10;
    // ---- brand band: the logo is the hero ----
    doc.setFillColor(240, 253, 250); doc.rect(0, 0, 210, 26, "F");
    doc.setFillColor(15, 118, 110); doc.rect(0, 26, 210, 1.2, "F");
    if (logos[brand]) { try { doc.addImage(logos[brand], "PNG", L, 4, 48, 18, undefined, "FAST"); } catch (e) {} }
    var bx = L + (logos[brand] ? 53 : 0);
    F(); doc.setFontSize(13); doc.setTextColor(15, 118, 110);
    doc.text(String(brand).toUpperCase(), bx, 12);
    doc.setFontSize(6.4); doc.setTextColor(100, 116, 139);
    doc.text("PRICE LIST  \u00b7  " + dmy(new Date().toISOString().slice(0, 10)), bx, 17);
    doc.setFontSize(6); doc.setTextColor(120, 113, 108);
    doc.text("All prices inclusive of 18% GST", Rt, 17, { align: "right" });
    y = 31;
    var head = function () {
      F(); doc.setFontSize(5.4); doc.setTextColor(148, 163, 184);
      doc.text("CODE", C.code, y);
      doc.text("DESCRIPTION", C.desc, y);
      doc.text("UNIT", C.unit, y);
      doc.text("PRICE INCL. GST", C.mrp, y, { align: "right" });
      y += 2.2;
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(L, y, Rt, y);
      y += 2.6;
    };
    head();
    var fam = "";
    list.forEach(function (p) {
      if (String(p.family || "") !== fam) {
        fam = String(p.family || "");
        if (y + 12 > 286) { doc.addPage(); y = 10; head(); }
        // ---- category bar: highlighted ----
        doc.setFillColor(15, 118, 110); doc.rect(L, y, Rt - L, 4.6, "F");
        F(); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
        doc.text(fam.toUpperCase(), L + 2, y + 3.2);
        var cnt = list.filter(function (q) { return String(q.family || "") === fam; }).length;
        doc.text(cnt + " items", Rt - 2, y + 3.2, { align: "right" });
        y += 6.2;
      }
      if (y + ROW > 288) { doc.addPage(); y = 10; head(); }
      var img = pics[String(p.pic || "").trim()];
      if (img) { try { doc.addImage(img, "PNG", C.pic, y - 0.4, PIC, PIC, undefined, "FAST"); } catch (e) {} }
      F(); doc.setFontSize(5.2); doc.setTextColor(71, 85, 105);
      doc.text(String(p.code || "").slice(0, 16), C.code, y + 3);
      doc.setFontSize(5.4); doc.setTextColor(30, 41, 59);
      doc.text(fitCell(doc, F, p.desc, C.unit - C.desc - 3, 1, "normal", 5.4)[0], C.desc, y + 3);
      doc.setFontSize(5); doc.setTextColor(148, 163, 184);
      doc.text(String(p.unit || "").replace("Per ", ""), C.unit, y + 3);
      doc.setFontSize(6.4); doc.setTextColor(15, 118, 110);
      doc.text(money(p.price), C.mrp, y + 3, { align: "right" });
      y += ROW;
      doc.setDrawColor(241, 245, 249); doc.setLineWidth(0.1); doc.line(C.code, y - 1.2, Rt, y - 1.2);
    });
  });
  var n = doc.getNumberOfPages();
  for (var i = 1; i <= n; i++) {
    doc.setPage(i);
    F(); doc.setFontSize(5); doc.setTextColor(148, 163, 184);
    doc.text("Prices are MRP inclusive of 18% GST. Subject to revision without notice.", L, 293);
    doc.text(i + " / " + n, Rt, 293, { align: "right" });
  }
  doc.save(brands.join("_").replace(/[^A-Za-z0-9_]+/g, "") + "_Price_List.pdf");
  toast("Price list ready - " + n + " page" + (n > 1 ? "s" : ""));
}

function viewCatalogue() {
    var q = S.q.toLowerCase();
    var unmapped = S.data.brandmap.filter(function (m) { return !m.brand; });
    var h = '<div class="empty" style="text-align:left;padding:0 0 14px"><b>Brand mapping.</b> The catalogue\'s Master Brand column mixes real brands with categories. Map each value to one of your brands - quotes, pitch matrix and incentives all key off this.</div>';
    if (unmapped.length) h += '<div class="card" style="border-color:#fecdd3"><h3><span class="pill due">' + unmapped.length + ' unmapped</span></h3><div class="meta">Products under these values cannot be quoted until mapped.</div></div>';
    var brandOpts = S.data.brands.map(function (b) { return b.brand; });
    S.data.brandmap.forEach(function (m) {
      h += '<div class="card"><h3>' + esc(m.catalogValue) + ' <span class="pill">' + esc(m.count) + ' products</span>' +
        (m.brand ? ' <span class="pill Won">' + esc(m.brand) + '</span>' : ' <span class="pill due">unmapped</span>') + '</h3>' +
        '<div class="acts" style="align-items:center"><span class="pill">maps to</span>' +
        '<select class="bm" data-id="' + esc(m.id) + '" style="width:auto;padding:7px 10px;font-size:13px">' +
        opts([""].concat(brandOpts), m.brand) + '</select></div></div>';
    });

    h += '<h3 style="margin:24px 0 10px;font-size:15px">Move products to another brand</h3>' +
      '<div class="card"><div class="meta">Shift a whole set of products under a different brand. This rewrites the <b>Master Brand</b> column in your Google Sheet, so the catalogue itself is corrected - not just the app.<br>Match by <b>product code prefix</b> or <b>product family prefix</b> (e.g. family <b>HR</b> = the Heliroma composite range).</div>' +
      '<div class="grid2" style="margin-top:8px">' +
      '<div><label>Code starts with</label><input id="rm_code" placeholder="e.g. MW1"/></div>' +
      '<div><label>Family starts with</label><input id="rm_fam" placeholder="e.g. HR"/></div></div>' +
      '<label>Move them to</label><select id="rm_to">' + opts([""].concat(S.data.brands.map(function (b) { return b.brand; })), "") + '</select>' +
      '<div class="acts"><button class="btn ghost" data-act="rm-preview">Preview</button>' +
      '<button class="btn" data-act="rm-apply">Move products</button></div>' +
      (S.rmPreview ? '<div class="meta" style="margin-top:8px"><b>' + esc(S.rmPreview.matched) + ' product(s) match:</b><br>' +
        (S.rmPreview.sample || []).map(function (x) { return esc(x); }).join("<br>") + '</div>' : "") +
      '</div>';

    h += '<h3 style="margin:24px 0 10px;font-size:15px">Brands</h3>' +
      '<div class="row"><div class="grow"></div><button class="btn sm" data-act="br-new">+ Add brand</button></div>';
    S.data.brands.forEach(function (b) {
      var n = brandProducts(b.brand).length;
      h += '<div class="card"><h3>' + esc(b.brand) + ' <span class="pill' + (n ? " teal" : " due") + '">' + n + ' products</span>' +
        (String(b.active).toUpperCase() === "N" ? ' <span class="pill">inactive</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(b.notes || "") + '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="br-open" data-id="' + esc(b.id) + '">Edit</button>' +
        '<button class="btn sm ghost" data-act="br-del" data-id="' + esc(b.id) + '">Remove</button></div></div>';
    });

    h += '<h3 style="margin:24px 0 10px;font-size:15px">Products (' + PRODUCTS.length + ')</h3>' +
      '<div class="row"><input class="grow" id="q" placeholder="Search code, name, family..." value="' + esc(S.q) + '"/>' +
      '<button class="btn" data-act="cat-new">+ Add product</button></div>';
    if (!q) return h + '<div class="empty">Type to search the catalogue.</div>';
    var list = PRODUCTS.filter(function (p) {
      return (p.code + " " + p.desc + " " + p.family + " " + p.brand).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 40);
    if (!list.length) return h + '<div class="empty">Nothing matches.</div>';
    list.forEach(function (p) {
      h += '<div class="card" style="display:flex;gap:12px;align-items:center">' +
        (p.pic ? '<img src="' + esc(p.pic) + '" style="width:48px;height:48px;object-fit:contain;border:1px solid var(--line);border-radius:8px;background:#fff"/>' : "") +
        '<div style="flex:1"><h3 style="margin:0 0 2px">' + esc(p.desc) + '</h3>' +
        '<div class="meta">' + esc(p.code) + ' - ' + money(p.price) + ' / ' + esc(p.unit) +
        '<br>' + esc(p.family) + ' - ' + esc(p.brand) + (realBrand(p) ? ' -> ' + esc(realBrand(p)) : ' (unmapped)') + '</div></div>' +
        '<div style="display:flex;gap:4px"><button class="btn sm ghost" data-act="pr-open" data-code="' + esc(p.code) + '">Edit</button>' +
        '<button class="btn sm ghost" data-act="pr-del" data-code="' + esc(p.code) + '">Del</button></div></div>';
    });
    return h;
  }

  function modalBrand(b) {
    b = b || {};
    return '<h2>' + (b.id ? "Edit brand" : "Add brand") + '</h2>' +
      '<label>Brand name</label><input id="b_name" value="' + esc(b.brand) + '"/>' +
      '<label>What it is</label><input id="b_notes" value="' + esc(b.notes) + '"/>' +
      '<label>Active</label><select id="b_active">' + opts(["Y", "N"], b.active || "Y") + '</select>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="br-save" data-id="' + esc(b.id || "") + '">Save</button></div>';
  }

  function modalProduct(p) {
    p = p || {};
    var mapVals = S.data.brandmap.map(function (m) { return m.catalogValue; });
    return '<h2>' + (p.code ? "Edit product" : "Add product") + '</h2>' +
      '<p class="sub">This writes to the master price list the whole firm quotes from.</p>' +
      '<div class="grid2"><div><label>Product code</label><input id="p_code" value="' + esc(p.code) + '"' + (p.code ? " readonly" : "") + '/></div>' +
      '<div><label>List price (Rs)</label><input id="p_price" inputmode="decimal" value="' + esc(p.price || "") + '"/></div></div>' +
      '<label>Description</label><input id="p_desc" value="' + esc(p.desc) + '"/>' +
      '<div class="grid2"><div><label>Product family</label><input id="p_fam" value="' + esc(p.family) + '"/></div>' +
      '<div><label>Unit</label><input id="p_unit" value="' + esc(p.unit || "Per Pc.") + '"/></div></div>' +
      '<div class="grid2"><div><label>Master Brand (catalogue value)</label><input id="p_mb" list="mblist" value="' + esc(p.brand) + '"/></div>' +
      '<div><label>Category</label><input id="p_cat" value="' + esc(p.cat) + '"/></div></div>' +
      '<datalist id="mblist">' + mapVals.map(function (m) { return '<option value="' + esc(m) + '"></option>'; }).join("") + '</datalist>' +
      '<label>Picture URL</label><input id="p_pic" value="' + esc(p.pic) + '"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="cat-save">Save product</button></div>';
  }

  /* ---------------- Quotation PDF (Energy World format) ----------------
     jsPDF core fonts are Latin-1 and physically cannot draw the rupee glyph, so a
     Unicode TTF is embedded once and cached. Falls back to "Rs." if the font fails. */
  /* ---------------- Quotation PDF ----------------
     Three things the browser cannot do alone, so they are solved here:
     1) jsPDF core fonts are Latin-1 - they cannot draw the rupee glyph. Embed a Unicode TTF.
     2) Product pictures are on lh3.googleusercontent.com with no CORS header, so a canvas
        conversion taints and throws. Fetch them through the server instead.
     3) The logo is same-origin, so FileReader is enough for that one. */
  var FONTS = null, LOGO_B64 = null, PIC_CACHE = {};

  function loadFonts() {
    if (FONTS !== null) return Promise.resolve(FONTS);
    var base = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/";
    var grab = function (f) {
      return fetch(base + f).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        var u = new Uint8Array(b), bin = "";
        for (var i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
        return btoa(bin);
      });
    };
    return Promise.all([grab("DejaVuSans.ttf"), grab("DejaVuSans-Bold.ttf")])
      .then(function (r) { FONTS = { reg: r[0], bold: r[1] }; return FONTS; })
      .catch(function () { FONTS = false; return false; });
  }

  function loadLogo() {
    if (LOGO_B64 !== null) return Promise.resolve(LOGO_B64);
    return fetch("../assets/logo.jpg").then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (res) {
        var fr = new FileReader();
        fr.onload = function () { LOGO_B64 = String(fr.result); res(LOGO_B64); };
        fr.onerror = function () { LOGO_B64 = false; res(false); };
        fr.readAsDataURL(b);
      });
    }).catch(function () { LOGO_B64 = false; return false; });
  }

  var LOGO_PICS = {}, LOGO_PRE = 0, PIC_DIM = {};
  /* Processed brand logos are cached in localStorage so they are fetched + canvas-processed ONCE
     per device (the slow bit), then reused instantly on every later PDF and every later session -
     no live image downloads at export time. That is what keeps the statement fast while still
     printing the real logos. */
  var LOGO_STORE = "ew_logos_v2";
  function saveLogoCache() {
    try { if (Object.keys(LOGO_PICS).length) localStorage.setItem(LOGO_STORE, JSON.stringify({ at: Date.now(), pics: LOGO_PICS })); } catch (e) { }
  }
  function restoreLogoCache() {
    try {
      var c = JSON.parse(localStorage.getItem(LOGO_STORE) || "null");
      if (c && c.pics && Object.keys(c.pics).length) { LOGO_PICS = c.pics; return true; }
    } catch (e) { }
    return false;
  }
  restoreLogoCache();
  function normB(x) { return String(x || "").toUpperCase().replace(/[^A-Z]/g, ""); }
  function logoFor(brand) {
    var k = normB(brand);
    var keys = Object.keys(LOGO_PICS);
    for (var i = 0; i < keys.length; i++) {
      var lk = keys[i];
      if (lk === k || lk.indexOf(k.slice(0, 5)) === 0 || k.indexOf(lk.slice(0, 5)) === 0) return LOGO_PICS[lk];
    }
    return null;
  }
  /* logos are fetched once, server-side (Drive share links are HTML pages, not images),
     then held as data URLs so the PDF can draw them without tainting a canvas. */
  /* The PDF used to draw whatever logos happened to have arrived, so a slow one printed as an
     empty box. Now the fetch is a single memoised promise and quotePdf waits on it. */
  var LOGO_READY = null;
  function logosReady() {
    if (LOGO_READY) return LOGO_READY;
    var list = (S.data.logos || []).filter(function (l) { return l.url; });
    LOGO_READY = Promise.all(list.map(function (l) {
      return loadPic(l.url, true).then(function (src) {
        if (!src) return null;
        var d = PIC_DIM[l.url] || { w: 100, h: 40 };
        LOGO_PICS[normB(l.brand)] = { src: src, w: d.w, h: d.h };
        return true;
      }).catch(function () { return null; });
    })).then(function (r) { saveLogoCache(); return r; });
    return LOGO_READY;
  }
  function preloadLogos() { logosReady(); }

  /* Catalogue photos and brand logos come back at full resolution. Embedded raw, a 100-line
     quote became a 45MB PDF - unsendable. Every picture is downscaled on a canvas first and
     flattened onto white (the PDF page is white anyway, so alpha buys nothing). */
  /* Every PDF overflow so far came from one mistake: text measured at one font size, then
     drawn at another - or wrapped to a width wider than the column it lives in. fitCell
     measures with the exact font it will be drawn with, clips to maxLines and ellipsises the
     rest. Use it for EVERY free-text cell. Never call splitTextToSize with a guessed width. */
  function fitCell(doc, F, txt, width, maxLines, style, size) {
    F(style || "normal");
    doc.setFontSize(size);
    var all = doc.splitTextToSize(String(txt == null ? "" : txt), width);
    var mx = maxLines || 1;
    if (all.length <= mx) return all;
    var keep = all.slice(0, mx);
    var last = keep[mx - 1];
    while (last.length > 1 && doc.getTextWidth(last + "\u2026") > width) last = last.slice(0, -1);
    keep[mx - 1] = last.replace(/[\s,;:.-]+$/, "") + "\u2026";
    return keep;
  }

  /* Several brand logos ship with a wide white margin baked into the file. Fitted to a box,
     the mark itself ends up tiny while another brand fills the box edge to edge. trimWhite
     crops the blank border away first, so every logo is measured on its actual artwork. */
  function trimWhite(cv) {
    var cx = cv.getContext("2d"), w = cv.width, h = cv.height;
    var d;
    try { d = cx.getImageData(0, 0, w, h).data; } catch (e) { return cv; }
    var TH = 244, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        var p = (yy * w + xx) * 4;
        if (d[p] < TH || d[p + 1] < TH || d[p + 2] < TH) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
          if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
        }
      }
    }
    if (x1 < 0) return cv;
    var pad = 1;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    var nw = x1 - x0 + 1, nh = y1 - y0 + 1;
    if (nw === w && nh === h) return cv;
    var o = document.createElement("canvas"); o.width = nw; o.height = nh;
    var ox = o.getContext("2d");
    ox.fillStyle = "#ffffff"; ox.fillRect(0, 0, nw, nh);
    ox.drawImage(cv, x0, y0, nw, nh, 0, 0, nw, nh);
    return o;
  }

  function shrinkPic(src, maxDim, q, trim) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        var sc = Math.min(1, maxDim / Math.max(im.width, im.height));
        var w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
        var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        var cx = cv.getContext("2d");
        cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, w, h);
        cx.drawImage(im, 0, 0, w, h);
        if (trim) cv = trimWhite(cv);
        try { res({ src: cv.toDataURL("image/jpeg", q || 0.8), w: cv.width, h: cv.height }); }
        catch (e) { res({ src: src, w: im.width, h: im.height }); }
      };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  function loadPic(url, trim) {
    /* Logos (trim=true) print into ~17mm boxes and were fetched at only =w200, so they came
       out soft/blurry. Pull them at =w700 and keep the downscale ceiling at 600 so the mark
       is crisp. Catalogue photos stay at =w200 / 300 - they sit in a 10mm box and the smaller
       fetch keeps on-screen data light on 4G. */
    var raw = url;
    url = driveImg(url, trim ? 700 : 200);
    if (!url) return Promise.resolve(null);
    if (PIC_CACHE[url] !== undefined) return Promise.resolve(PIC_CACHE[url]);
    return api("imgB64", { url: url }).then(function (r) {
      if (!r || !r.ok) { PIC_CACHE[url] = null; return null; }
      return shrinkPic("data:" + r.mime + ";base64," + r.b64, trim ? 600 : 300, trim ? 0.85 : 0.75, trim).then(function (p) {
        PIC_CACHE[url] = p ? p.src : null;
        var dim = p ? { w: p.w, h: p.h } : null;
        /* Store the real pixel dimensions under BOTH the fetched (=w700) key and the ORIGINAL
           url. logosReady() and the quote table look dims up by the original url; keying only
           by the transformed url made every lookup miss and fall back to a fixed {100,40},
           which squashed every logo to the box aspect and stretched the wide ones tall. */
        PIC_DIM[url] = dim;
        PIC_DIM[raw] = dim;
        return PIC_CACHE[url];
      });
    }).catch(function () { PIC_CACHE[url] = null; return null; });
  }

  /* the 12 logos that print on a quote, in the order Mukesh grouped them.
     INAIR, LUNOS and NEXGEN are distributed but have no logo, so they no longer
     appear as text chips - a name beside a logo looked like a missing image. */
  var PDF_LOGO_ORDER = ["Huliot", "Heliroma", "FIMA", "TOTO",
    "Grundfos", "Pentair", "Green Heat", "Adani",
    "Geberit", "Stellar", "MEA", "Oyster"];

  var DIST_BRANDS = ["HULIOT", "FIMA", "TOTO", "GRUNDFOS", "PENTAIR", "GREEN HEAT+", "GEBERIT",
    "INAIR", "LUNOS", "STELLAR", "MEA", "NEXGEN", "ADANI SOLAR", "HELIROMA"];

  var TERMS = [
    "EX WORKS - Prices are Ex Works Panipat warehouse.",
    "VALIDITY - This quotation is valid for 30 days from the date of issue. Prices are subject to revision after expiry and re-quotation may be required for orders placed thereafter.",
    "PRODUCT IMAGES - Product images shown are for reference only. Actual product supplied may differ in appearance, colour, finish or packaging. The product description and model number shall be the basis of supply.",
    "PRICES & GST - Applicable GST at prevailing rates will be charged additionally. Prices are subject to change without prior notice based on supplier or MRP revisions.",
    "PAYMENT TERMS - 50% advance along with a signed Purchase Order confirms the booking. Balance is payable against the Proforma Invoice before dispatch. Cheques and demand drafts in favour of Energy World are subject to realization before order processing.",
    "DELIVERY - Delivery timelines are indicative and subject to stock availability and supplier lead times. Delivery charges, if applicable, are communicated separately and are not included unless explicitly stated.",
    "RETURNS - Goods once delivered and accepted cannot be returned unless defective or incorrectly supplied. Any discrepancy must be reported within 48 hours of delivery. Custom-ordered or imported items are non-returnable once placed with the supplier.",
    "CANCELLATION - Orders once confirmed and subsequently cancelled shall attract a cancellation fee of 40% of the advance received; the balance of the advance shall be refunded.",
    "WARRANTY - Products carry the respective manufacturer warranty. Energy World will assist in connecting the customer with the brand service team but does not assume warranty obligation on behalf of the manufacturer.",
    "INSTALLATION - Unless explicitly included, installation is not in the scope of supply. Energy World recommends installation by certified plumbers or brand-authorized technicians."
  ];

  function quotePdf(q) {
    var items = [];
    try { items = JSON.parse(q.items || "[]"); } catch (e) {}
    /* No DejaVu ₹-font embed: it added ~600 KB to every quote, which made the Telegram bot send
       (base64 over the wire) fail and the WhatsApp share sluggish. Uses "Rs." in core Helvetica,
       exactly like the statement PDF. Result: ~50 KB, sends reliably. */
    return Promise.all([
      Promise.resolve(null),
      loadLogo(),
      Promise.all(items.map(function (i) { return loadPic(i.pic); })),
      logosReady()
    ]).then(function (res) {
      var f = res[0], logo = res[1], pics = res[2];
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
        uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var R = function (n) { return (uni ? "\u20B9" : "Rs.") + Number(n || 0).toLocaleString("en-IN"); };
      var col = function (c) { doc.setTextColor(c[0], c[1], c[2]); };
      var fill = function (c) { doc.setFillColor(c[0], c[1], c[2]); };

      var INK = [17, 34, 45], DEEP = [11, 59, 54], MINT = [94, 234, 212],
          SLATE = [30, 41, 59], GREY = [110, 125, 140], LINE = [226, 232, 240], SOFT = [248, 250, 252];
      var W = 210, L = 14, Rt = W - 14;

      var bd = Number(q.discountPct) || 0;
      var rows = items.map(function (i, idx) {
        /* per-line discount: explicit override wins, else the line's own brand
           discount snapshot (i.bd), else the quote's blended figure for old quotes. */
        var d = (i.disc === "" || i.disc === undefined || i.disc === null)
          ? ((i.bd !== undefined && i.bd !== null) ? Number(i.bd) : bd)
          : Number(i.disc);
        d = Number(d) || 0;
        var net = Math.round(i.price * (1 - d / 100));
        return { desc: pdfSafe(i.desc), code: pdfSafe(i.code), pic: pics[idx], dim: PIC_DIM[i.pic] || null,
          unit: i.unit || "No's",
          qty: i.qty, price: i.price, disc: d, net: net, total: net * i.qty };
      });
      var ordered = rows.filter(function (r) { return r.disc > 0; }).sort(function (a, b) { return b.disc - a.disc; })
        .concat(rows.filter(function (r) { return r.disc <= 0; }));
      var subTotal = rows.reduce(function (a, r) { return a + r.total; }, 0);
      /* Some projects must show 18% GST spelled out on the quote. The flag rides along inside
         the saved items (no sheet column), so it round-trips. Off = the old "{ GST as Actual }". */
      var showGst = items.some(function (i) { return Number(i.gst) === 1; });
      var c = clientByName(q.client) || {};

      /* ================= HEADER =================
         Everything the reader needs to identify the quote sits in the dark band: who it is for,
         what it is, and how long it holds. The old "PREPARED FOR / PREPARED BY" strip below it
         was repeating the same names in a second box - dropped. Who wrote it now signs off at
         the foot of the document, which is where a signature belongs. */
      var HH = 46;   /* the word QUOTATION was doing no work - the document is obviously a quote */
      fill(DEEP); doc.rect(0, 0, W, HH, "F");
      fill(MINT); doc.rect(0, HH, W, 1.2, "F");

      if (logo) { try { doc.addImage(logo, "JPEG", L, 8, 31, 16.5); } catch (e) {} }
      col(MINT); F("bold"); doc.setFontSize(6.4);
      doc.text("M O D E R N   P L U M B I N G   S O L U T I O N", L, 30.5);
      col([148, 190, 184]); F("normal"); doc.setFontSize(6);
      doc.text("PANIPAT   |   SONIPAT   |   KARNAL", L, 35.5);

      /* QUOTE FOR - name and address only. The client knows their own phone number. */
      col(MINT); F("bold"); doc.setFontSize(5.6);
      doc.text("Q U O T E   F O R", Rt, 12.5, { align: "right" });
      col([255, 255, 255]); F("bold"); doc.setFontSize(11.5);
      doc.text(fitCell(doc, F, q.client || "-", 92, 1, "bold", 11.5)[0], Rt, 18.6, { align: "right" });
      /* Address parts repeat in practice: the address line often already ends in the city,
         and area == location for a Panipat client, which printed "Sector 57, Panipat, Panipat".
         Drop any part already contained in what we have built so far. */
      var addr = [c.address, c.area, c.location].filter(Boolean).map(String)
        .reduce(function (acc, p) {
          var seen = acc.join(", ").toLowerCase();
          if (seen.indexOf(p.trim().toLowerCase()) < 0) acc.push(p.trim());
          return acc;
        }, []).join(", ");
      col([176, 214, 209]); F("normal"); doc.setFontSize(7);
      var aLines = fitCell(doc, F, addr, 92, 2, "normal", 7);
      aLines.forEach(function (ln, i) { doc.text(ln, Rt, 23.4 + i * 3.6, { align: "right" }); });

      doc.setDrawColor(38, 94, 88); doc.setLineWidth(0.3);
      doc.line(Rt - 62, 32.4, Rt, 32.4); doc.setLineWidth(0.2);

      col([160, 205, 199]); F("normal"); doc.setFontSize(7.4);
      var VALID_DAYS = 30;
      var vUntil = new Date(Date.now() + VALID_DAYS * 86400000).toISOString().slice(0, 10);
      doc.text("Quote No.   " + String(q.quoteNo || ""), Rt, 36.8, { align: "right" });
      doc.text("Date   " + today(), Rt, 40.6, { align: "right" });
      col(MINT);
      doc.text("Valid for " + VALID_DAYS + " days  \u00b7  until " + vUntil, Rt, 44.4, { align: "right" });

      /* ---- AUTH. DISTRIBUTOR FOR: the whole strip sits in one soft panel ---- */
      var y = HH + 10;
      var PER_ROW = 6, GAP = 2.2, BW = 17.5, BH = 9;
      var GRID_W = PER_ROW * BW + (PER_ROW - 1) * GAP;
      var LROWS = Math.ceil(PDF_LOGO_ORDER.length / PER_ROW);
      var PAN_H = LROWS * BH + (LROWS - 1) * 2.2 + 8;
      fill([246, 250, 249]); doc.roundedRect(L, y - 4, Rt - L, PAN_H, 2, 2, "F");
      doc.setDrawColor(214, 232, 228); doc.roundedRect(L, y - 4, Rt - L, PAN_H, 2, 2, "S");
      fill(MINT); doc.rect(L, y - 4, 1.4, PAN_H, "F");

      col([13, 118, 108]); F("bold"); doc.setFontSize(6.2);
      doc.text("AUTH. DISTRIBUTOR FOR", L + 6, y - 4 + PAN_H / 2 + 0.8);

      var CHIP_L = Rt - GRID_W - 4;
      var slots = PDF_LOGO_ORDER.map(function (n) { return logoFor(n); });
      slots.forEach(function (lg, i) {
        var r = Math.floor(i / PER_ROW), cIdx = i % PER_ROW;
        var bx = CHIP_L + cIdx * (BW + GAP), by = y + r * (BH + 2.2);
        fill([255, 255, 255]); doc.roundedRect(bx, by, BW, BH, 1.6, 1.6, "F");
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.25);
        doc.roundedRect(bx, by, BW, BH, 1.6, 1.6, "S");
        if (!lg || !lg.src) return;
        var mw = BW - 2.4, mh = BH - 2.4;
        var sc = Math.min(mw / lg.w, mh / lg.h);
        var iw = lg.w * sc, ih = lg.h * sc;
        try { doc.addImage(lg.src, "JPEG", bx + (BW - iw) / 2, by + (BH - ih) / 2, iw, ih); } catch (e) { }
      });
      doc.setLineWidth(0.2);
      y += PAN_H + 4;

      /* ================= TABLE ================= */
      /* money columns widened: a lakh figure like Rs 4,51,869 needs real room, and it
         was running into the next column. Everything shrunk a notch so 100+ lines fit. */
      var X = { n: L + 2, pic: L + 6, item: L + 21, unit: 106, qty: 118, price: 137, dis: 149, dprice: 172, amt: Rt - 1 };
      var UNIT_W = 13;                       /* "Per Set", "Per Pc." at 6.2pt, with air */
      var DESC_W = X.unit - UNIT_W - X.item - 2;
      var head = function () {
        fill(SLATE); doc.rect(L, y - 4.6, Rt - L, 7.6, "F");
        col([255, 255, 255]); F("bold"); doc.setFontSize(5.2);
        doc.text("#", X.n, y);
        doc.text("ITEM DESCRIPTION", X.item, y);
        doc.text("UNIT", X.unit, y, { align: "right" });
        doc.text("QTY", X.qty, y, { align: "right" });
        doc.text("PRICE", X.price, y, { align: "right" });
        doc.text("DIS.%", X.dis, y, { align: "right" });
        doc.text("DISC. PRICE", X.dprice, y, { align: "right" });
        doc.text("TOTAL AMT", X.amt, y, { align: "right" });
        y += 7;
      };
      head();

      ordered.forEach(function (r, i) {
        /* ONE description. The catalogue repeats the spec inside the description, and
           printing both made every row a wall of duplicated text. */
        /* DESC_W is derived from the column positions, not guessed. The unit column is
           right-aligned at X.unit, so its text grows leftwards - reserve room for it. */
        var lines = fitCell(doc, F, r.desc, DESC_W, 40, "normal", 6.4);
        var hgt = Math.max(11, 5 + lines.length * 3.1);
        if (y + hgt > 272) { doc.addPage(); y = 20; head(); }
        if (i % 2 === 1) { fill(SOFT); doc.rect(L, y - 3.6, Rt - L, hgt, "F"); }

        col(GREY); F("normal"); doc.setFontSize(5.6);
        doc.text(String(i + 1), X.n, y);
        /* A photo was forced into a fixed 10 x 9 box, so a tall product (the sand filter)
           came out visibly squashed. Fit it inside the box on its own aspect ratio and centre
           it. Products with no photo in the catalogue simply leave the cell blank. */
        if (r.pic) {
          try {
            var BOXW = 10, BOXH = 9;
            var dm = (r.dim && r.dim.w && r.dim.h) ? r.dim : { w: BOXW, h: BOXH };
            var psc = Math.min(BOXW / dm.w, BOXH / dm.h);
            var pw = dm.w * psc, ph = dm.h * psc;
            /* Centre the photo in the FULL row height, not just the top 9mm box. A tall row
               (long, wrapped description) used to leave the picture stuck at the top while the
               text ran down beside it - the tank looked top-aligned. Centre it on the row band
               (which starts at y-3.6 and is `hgt` tall) so every photo sits mid-row. */
            doc.addImage(r.pic, "JPEG", X.pic + (BOXW - pw) / 2, (y - 3.6) + (hgt - ph) / 2, pw, ph);
          } catch (e) { }
        }

        col([13, 148, 136]); F("bold"); doc.setFontSize(5.4);
        doc.text(String(r.code || ""), X.item, y - 0.6);
        col(INK); F("normal"); doc.setFontSize(6.4);
        doc.text(lines, X.item, y + 3, { lineHeightFactor: 1.15 });

        col(INK); F("normal"); doc.setFontSize(6.2);
        doc.text(fitCell(doc, F, r.unit, UNIT_W, 1, "normal", 6.2)[0], X.unit, y + 0.6, { align: "right" });
        F("bold"); doc.text(String(r.qty), X.qty, y + 0.6, { align: "right" });
        F("normal");
        /* A discounted line shows list PRICE, DIS.%, and the DISC. PRICE. A line with NO
           discount would just repeat the same figure in PRICE and DISC. PRICE, so we leave the
           PRICE and DIS.% cells blank and print the single price once, under DISC. PRICE. */
        if (r.disc > 0) {
          col(GREY); F("normal");
          doc.text(R(r.price), X.price, y + 0.6, { align: "right" });
          col([13, 148, 136]); F("bold");
          doc.text(r.disc.toFixed(1) + "%", X.dis, y + 0.6, { align: "right" });
        }
        col(INK); F("normal");
        doc.text(R(r.net), X.dprice, y + 0.6, { align: "right" });
        F("bold"); doc.setFontSize(6.6); col(INK);
        doc.text(R(r.total), X.amt, y + 0.6, { align: "right" });

        y += hgt;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(L, y - 2.8, Rt, y - 2.8);
      });

      /* ---- sub-total. Either "{ GST as Actual }" (default) or a spelled-out 18% GST block. ---- */
      y += 4;
      if (y > (showGst ? 250 : 258)) { doc.addPage(); y = 26; }
      if (showGst) {
        var GST_RATE = 18;
        var gstAmt = Math.round(subTotal * GST_RATE / 100);
        var grand = subTotal + gstAmt;
        var GBH = 18;
        fill([236, 253, 245]); doc.roundedRect(106, y - 4.5, Rt - 106, GBH, 1.5, 1.5, "F");
        col([13, 118, 108]); F("normal"); doc.setFontSize(6.8);
        doc.text("Sub-Total", 110, y + 1);
        F("bold"); doc.text(R(subTotal), X.amt, y + 1, { align: "right" });
        col([75, 85, 99]); F("normal"); doc.setFontSize(6.8);
        doc.text("GST @ 18%", 110, y + 6.4);
        doc.text(R(gstAmt), X.amt, y + 6.4, { align: "right" });
        doc.setDrawColor(178, 217, 210); doc.setLineWidth(0.25); doc.line(110, y + 9, Rt - 4, y + 9); doc.setLineWidth(0.2);
        /* Grand total kept at the SAME weight/size as the Sub-Total line (normal label, bold
           figure, 6.8pt) - not the oversized bold it had, per Mukesh. */
        col([13, 118, 108]); F("normal"); doc.setFontSize(6.8);
        doc.text("Grand Total (incl. GST)", 110, y + 12.2);
        F("bold"); doc.text(R(grand), X.amt, y + 12.2, { align: "right" });
        /* Advance clear of the FULL box (bottom = y-4.5+GBH). The Terms panel adds its own +4
           below this, so the panel can never ride over the total again. */
        y += (GBH - 5);
      } else {
        fill([236, 253, 245]); doc.roundedRect(106, y - 4.5, Rt - 106, 11, 1.5, 1.5, "F");
        col([13, 118, 108]); F("bold"); doc.setFontSize(6.8);
        doc.text("Sub-Total { GST as Actual }", 110, y + 1.4);
        doc.setFontSize(10);
        doc.text(R(subTotal), X.amt, y + 1.6, { align: "right" });
      }

      /* ================= TERMS ================= */
      /* T&C now sits inside the same soft, mint-barred panel as the distributor strip, so it
         reads as one framed block instead of loose text under a bar. The panel is sized to the
         taller of the two text columns, computed deterministically before it is drawn. */
      var TC_FS = 5.4, TC_LEAD = 2.2, TC_GAP = 2.3;
      var TC_PADL = 6, TC_PADR = 5, TC_HEADH = 8.5, TC_PADB = 4, TC_COLGAP = 6;
      var COLW = (Rt - L - TC_PADL - TC_PADR - TC_COLGAP) / 2;
      F("normal"); doc.setFontSize(TC_FS);
      var tcBlocks = TERMS.map(function (tx, n) {
        var parts = tx.split(" - ");
        var hd = parts.length > 1 ? parts.shift() : "";
        var body = parts.join(" - ") || tx;
        var ls = doc.splitTextToSize(body, COLW - 3);
        return { hd: hd, ls: ls, n: n + 1, h: (hd ? 2.5 : 0) + ls.length * TC_LEAD + TC_GAP };
      });
      var tcTotal = tcBlocks.reduce(function (a, b) { return a + b.h; }, 0);
      var tcHalf = tcTotal / 2;
      var tcAccP = 0, tcColP = 0, tcColH = [0, 0];
      var tcPlaced = tcBlocks.map(function (b) {
        if (tcColP === 0 && tcAccP + b.h > tcHalf && tcAccP > 0) { tcColP = 1; }
        tcColH[tcColP] += b.h;
        if (tcColP === 0) tcAccP += b.h;
        return tcColP;
      });
      var TC_PANH = TC_HEADH + Math.max(tcColH[0], tcColH[1]) + TC_PADB;
      if (y + TC_PANH + 3 > 276) { doc.addPage(); y = 22; } else { y += 4; }
      var tcPy = y;
      fill([246, 250, 249]); doc.roundedRect(L, tcPy, Rt - L, TC_PANH, 2, 2, "F");
      doc.setDrawColor(214, 232, 228); doc.setLineWidth(0.3);
      doc.roundedRect(L, tcPy, Rt - L, TC_PANH, 2, 2, "S"); doc.setLineWidth(0.2);
      fill(MINT); doc.rect(L, tcPy, 1.4, TC_PANH, "F");
      col(DEEP); F("bold"); doc.setFontSize(9);
      doc.text("Terms & Conditions", L + TC_PADL, tcPy + 5.4);
      var tcTop = tcPy + TC_HEADH + 1.5;
      var tcY = [tcTop, tcTop];
      tcBlocks.forEach(function (b, bi) {
        var tcCol = tcPlaced[bi];
        var x = L + TC_PADL + tcCol * (COLW + TC_COLGAP);
        var yy = tcY[tcCol];
        if (b.hd) {
          col([13, 118, 108]); F("bold"); doc.setFontSize(TC_FS - 0.3);
          doc.text(b.n + ". " + b.hd.toUpperCase(), x, yy);
          yy += 2.5;
        }
        col([75, 85, 99]); F("normal"); doc.setFontSize(TC_FS);
        doc.text(b.ls, x + (b.hd ? 1.8 : 0), yy);
        yy += b.ls.length * TC_LEAD + TC_GAP;
        tcY[tcCol] = yy;
      });
      y = tcPy + TC_PANH + 2;

      /* ---- sign-off, bottom right of the last page. A quotation is a document a person
           stands behind, so the name goes where a signature goes - not in a header box. ---- */
      var me = (S.data.team || []).filter(function (t2) { return t2.name === q.createdBy; })[0] || {};
      /* Keep the sign-off on THIS page whenever it fits. It used to jump to a fresh page far
         too early (y>236) even with half the page still empty. Only break if the ~25mm block
         would collide with the footer; otherwise anchor it at the usual 250, or just below the
         terms when those run long. */
      if (y + 21 > 290) { doc.addPage(); y = 30; }
      var sy = Math.max(250, y + 3);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.line(Rt - 62, sy, Rt, sy); doc.setLineWidth(0.2);
      col(GREY); F("bold"); doc.setFontSize(5.8);
      doc.text("PREPARED BY", Rt, sy + 4, { align: "right" });
      col(INK); F("bold"); doc.setFontSize(10);
      doc.text(String(q.createdBy || "-"), Rt, sy + 10, { align: "right" });
      if (me.mobile) {
        col(GREY); F("normal"); doc.setFontSize(7.4);
        doc.text(String(me.mobile), Rt, sy + 14.5, { align: "right" });
      }

      var pages = doc.internal.getNumberOfPages();
      for (var p = 1; p <= pages; p++) {
        doc.setPage(p);
        F("normal"); doc.setFontSize(6.2); col([150, 163, 175]);
        doc.text("Energy World  |  Panipat \u00b7 Sonipat \u00b7 Karnal  |  Authorised Distributor", L, 290);
        doc.text(p + " / " + pages, Rt, 290, { align: "right" });
      }
      return doc;
    });
  }

  /* ---------------- site visits (check-in, not tracking) ---------------- */
  function siteVisits(siteId) {
    return S.data.sitevisits.filter(function (v) { return v.siteId === siteId; });
  }
  function siteVerified(site) {
    return siteVisits(site.id).some(function (v) { return v.verified === "Verified"; });
  }

  function checkIn(siteId, setLocation, purpose, photoB64) {
    if (!navigator.geolocation) { toast("This phone cannot give a location."); return; }
    toast(setLocation ? "Fixing site location..." : "Getting your location...");
    navigator.geolocation.getCurrentPosition(function (pos) {
      api("siteVisit", {
        siteId: siteId, setLocation: !!setLocation, purpose: purpose || "", photoB64: photoB64 || "",
        lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy
      }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Check-in failed."); return; }
        if (r.note === "site location set from this visit") toast("Site location fixed. Future visits are measured from here.");
        else if (r.verified === "Verified") toast("Visit logged and verified.");
        else if (r.verified === "Far") toast("Logged, but " + r.distanceM + "m from the site.");
        else toast("Logged - " + (r.note || "unverified") + ".");
        refresh();
      });
    }, function () {
      api("siteVisit", { siteId: siteId, purpose: purpose || "", photoB64: photoB64 || "" }).then(function () {
        toast("Location blocked - visit logged as UNVERIFIED.");
        refresh();
      });
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }
  function geoPending(site) { return !site.lat || !site.lng; }

  /* A photo is the only thing that actually defeats a spoofed GPS, so it is offered
     on every check-in. Resized on the phone before upload - nobody wants a 4MB JPEG
     going up on 4G. */
  function shrinkPhoto(file) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 1100;
          var sc = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.72).split(",")[1]);
        };
        img.onerror = function () { res(null); };
        img.src = String(fr.result);
      };
      fr.onerror = function () { res(null); };
      fr.readAsDataURL(file);
    });
  }

  function modalCheckIn(site, setLoc) {
    return '<h2>' + (setLoc ? "Set site location" : "Check in") + '</h2>' +
      '<p class="sub">' + esc(site.name) + '</p>' +
      (setLoc ? '<div class="card" style="border-color:#fde68a;background:#fffbeb"><div class="meta"><b>Only do this while standing at the site.</b> It fixes the location permanently, and every future visit is measured from it. Never from the office.</div></div>' : "") +
      '<label>What was this visit for?</label><input id="ck_purpose" placeholder="e.g. measurement, follow-up, delivery check"/>' +
      '<label>Site photo (optional - this is your proof)</label>' +
      '<div class="meta" style="margin-bottom:6px">Goes to the EW Daily Report bot with the GPS pin, client and time. Kept in Telegram, not on this phone.</div>' +
      '<input id="ck_photo" type="file" accept="image/*" capture="environment"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="ck-go" data-id="' + esc(site.id) + '" data-set="' + (setLoc ? "1" : "") + '">' +
      (setLoc ? "Fix location & log visit" : "Log visit") + '</button></div>';
  }

  /* ---------------- distance + nearby site detection ---------------- */
  function metresBetween(a1, o1, a2, o2) {
    var R = 6371000, t = Math.PI / 180;
    var dA = (a2 - a1) * t, dO = (o2 - o1) * t;
    var x = Math.sin(dA / 2) * Math.sin(dA / 2) +
      Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dO / 2) * Math.sin(dO / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
  }
  function nearbySites(lat, lng, radius) {
    return S.data.sites.filter(function (s2) { return s2.lat && s2.lng; })
      .map(function (s2) { return { site: s2, m: metresBetween(Number(s2.lat), Number(s2.lng), lat, lng) }; })
      .filter(function (x) { return x.m <= (radius || 400); })
      .sort(function (a, b) { return a.m - b.m; });
  }

  /* ---------------- register a visit: GPS first, site second ----------------
     The executive presses one button. We take the GPS, then WE work out which site
     he is standing at - he does not get to tell us. If nothing is nearby he can pick
     a site manually, but that visit is honestly marked as away from any known site. */
  function startVisit() {
    if (!navigator.geolocation) { toast("This phone cannot give a location."); return; }
    S.gps = { busy: true }; render();
    navigator.geolocation.getCurrentPosition(function (pos) {
      S.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy), busy: false };
      S.modal = modalVisitPick();
      render();
    }, function () {
      S.gps = { busy: false, denied: true };
      toast("Location blocked. Turn on GPS to register a visit.");
      render();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function modalVisitPick() {
    var near = nearbySites(S.gps.lat, S.gps.lng, 400);
    var pending = S.data.sites.filter(geoPending);
    var h = '<h2>Register visit</h2>' +
      '<p class="sub">GPS locked, accuracy ' + S.gps.acc + 'm. Now pick the site you are at.</p>';
    if (near.length) {
      h += '<div class="meta" style="margin-bottom:6px"><b>Nearby sites</b></div>';
      near.forEach(function (x) {
        h += '<div class="card"><h3>' + esc(x.site.name) + ' <span class="pill Won">' + x.m + 'm away</span></h3>' +
          '<div class="meta">' + esc(x.site.client || "") + '</div>' +
          '<div class="acts"><button class="btn sm" data-act="vp-pick" data-id="' + esc(x.site.id) + '">This one</button></div></div>';
      });
    } else {
      h += '<div class="card" style="border-color:#fde68a;background:#fffbeb"><div class="meta">No known site within 400m of you. Either this is a new site, or its location has not been fixed yet.</div></div>';
    }
    if (pending.length) {
      h += '<label>Site awaiting its location</label>' +
        '<select id="vp_pend">' + opts([""].concat(pending.map(function (p) { return p.name; })), "") + '</select>' +
        '<div class="meta" style="margin-top:-2px">Picking one here fixes its GPS permanently, from where you are standing now.</div>' +
        '<button class="btn sm" data-act="vp-setgeo" style="margin-top:6px">Fix this site here</button>';
    }
    h += '<label style="margin-top:12px">Or any other site</label>' +
      '<select id="vp_any">' + opts([""].concat(S.data.sites.map(function (p) { return p.name; })), "") + '</select>' +
      '<button class="btn sm ghost" data-act="vp-any" style="margin-top:6px">Log against this site</button>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button></div>';
    return h;
  }

  function modalVisitDetail(site) {
    S.vdSite = site.id;
    var vs = siteVisits(site.id);
    var d = (site.lat && site.lng) ? metresBetween(Number(site.lat), Number(site.lng), S.gps.lat, S.gps.lng) : null;
    return '<h2>' + (vs.length ? "Revisit" : "First visit") + '</h2>' +
      '<p class="sub">' + esc(site.name) + (d !== null ? '  \u00b7  ' + d + 'm from the site' : "") + '</p>' +
      (vs.length ? '<div class="card"><div class="meta"><b>' + vs.length + ' previous visit(s)</b><br>Last: ' +
        esc(dstr(vs[vs.length - 1].date)) + ' by ' + esc(vs[vs.length - 1].createdBy) + '</div></div>' : "") +
      '<label>Who did you see?</label>' +
      '<div class="row" id="vd_types">' +
      ["Site", "Plumber", "Architect", "PMC", "Builder"].map(function (t2) {
        return '<button class="chip ' + ((S.vType || "Site") === t2 ? "on" : "") + '" data-act="vd-type" data-t="' + t2 + '">' + t2 + '</button>';
      }).join("") + '</div>' +
      '<label>Remarks</label><textarea id="vd_note" placeholder="What happened on this visit?"></textarea>' +
      '<label>Site photo</label><input id="vd_photo" type="file" accept="image/*" capture="environment"/>' +
      '<div class="meta">Goes to the EW Daily Report bot with the GPS pin, client and time. Stored in Telegram only.</div>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="vd-save" data-id="' + esc(site.id) + '" data-set="' + (geoPending(site) ? "1" : "") + '">Save visit</button></div>';
  }

  /* ---------------- compact month calendar ---------------- */
  function visitCalendar() {
    var base = S.calMonth ? new Date(S.calMonth + "-01T00:00:00") : new Date();
    var y = base.getFullYear(), m = base.getMonth();
    var first = new Date(y, m, 1);
    var days = new Date(y, m + 1, 0).getDate();
    var pad = first.getDay();
    var mine = S.role === "admin" ? S.data.sitevisits
      : S.data.sitevisits.filter(function (v) { return v.createdBy === S.user; });
    var counts = {};
    mine.forEach(function (v) { var d = dstr(v.date); counts[d] = (counts[d] || 0) + 1; });
    var mk = y + "-" + String(m + 1).padStart(2, "0");
    var label = first.toLocaleString("en-IN", { month: "long", year: "numeric" });

    var h = '<div class="calhead">' +
      '<button class="btn sm ghost" data-act="cal-prev">&lsaquo;</button>' +
      '<b>' + esc(label) + '</b>' +
      '<button class="btn sm ghost" data-act="cal-next">&rsaquo;</button></div>';
    h += '<div class="cal">';
    ["S", "M", "T", "W", "T", "F", "S"].forEach(function (d) { h += '<div class="cdow">' + d + '</div>'; });
    for (var i = 0; i < pad; i++) h += '<div class="cday empty2"></div>';
    for (var d2 = 1; d2 <= days; d2++) {
      var key = mk + "-" + String(d2).padStart(2, "0");
      var n = counts[key] || 0;
      h += '<button class="cday ' + (n ? "has" : "") + ' ' + (S.calDay === key ? "sel" : "") + (key === today() ? " tdy" : "") + '" data-act="cal-day" data-d="' + key + '">' +
        '<span>' + d2 + '</span>' + (n ? '<i>' + n + '</i>' : "") + '</button>';
    }
    h += '</div>';
    return h;
  }

  function viewVisits() {
    var mine = S.role === "admin" ? S.data.sitevisits
      : S.data.sitevisits.filter(function (v) { return v.createdBy === S.user; });
    var day = S.calDay || today();
    var todays = mine.filter(function (v) { return dstr(v.date) === day; });
    var flagged = mine.filter(function (v) { return v.verified !== "Verified"; });

    var h = '<div class="row"><button class="btn" data-act="visit-start" style="flex:1">' +
      (S.gps && S.gps.busy ? "Getting GPS..." : "Register visit (uses your GPS)") + '</button></div>';
    h += '<div class="cards">' +
      '<div class="stat"><div class="n">' + mine.filter(function (v) { return dstr(v.date) === today(); }).length + '</div><div class="l">Visits today</div></div>' +
      '<div class="stat"><div class="n">' + mine.length + '</div><div class="l">Total logged</div></div>' +
      '<div class="stat ' + (flagged.length ? "alert" : "") + '"><div class="n">' + flagged.length + '</div><div class="l">Unverified / far</div></div>' +
      '</div>';

    h += visitCalendar();

    h += '<h3 style="margin:16px 0 10px;font-size:15px">' +
      (day === today() ? "Today" : esc(day)) + ' &middot; ' + todays.length + ' visit(s)</h3>';
    if (!todays.length) h += '<div class="empty">No visits logged on this day.</div>';
    todays.slice().reverse().forEach(function (v) {
      var cls = v.verified === "Verified" ? "Won" : (v.verified === "Far" ? "due" : "soon");
      h += '<div class="card"><h3>' + esc(v.siteName || "(site)") + ' <span class="pill ' + cls + '">' + esc(v.verified) + '</span></h3>' +
        '<div class="meta">' + esc(v.client || "") + '<br>' + esc(String(v.createdAt).slice(11, 16)) + ' &middot; ' + esc(v.createdBy) +
        (v.purpose ? '<br><b>' + esc(v.purpose) + '</b>' : "") +
        (v.distanceM ? '<br>' + esc(v.distanceM) + 'm from site' : "") +
        (v.accuracy ? ' &middot; GPS ' + esc(v.accuracy) + 'm' : "") +
        (v.note ? '<br><i>' + esc(v.note) + '</i>' : "") + '</div>' +
        '<div class="acts">' +
        (v.lat ? '<a class="btn sm ghost" target="_blank" href="https://maps.google.com/?q=' + esc(v.lat) + ',' + esc(v.lng) + '">Map</a>' : "") +
        (v.tgFileId ? '<button class="btn sm" data-act="v-photo" data-file="' + esc(v.tgFileId) + '">Photo</button>' : '<span class="pill">no photo</span>') +
        '</div></div>';
    });
    return h;
  }

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  /* ---------------- CHALLAN LIFECYCLE ----------------
     Draft -> Approved -> Dispatched -> Received.
     The challan PDF deliberately carries NO prices and NO pictures - it is a delivery
     document, not a quotation. Prices live in the ledger, not in the driver's hand. */
  var CH_FLOW = ["Draft", "Approved", "Dispatched", "Received"];
  function canApprove() { return S.role === "admin" || S.role === "sales"; }

  /* ---- assignment-based visibility ----
     A client is "assigned" to a sales exec via ownedBy (falling back to whoever entered it). Admin
     and accounts see every client; a sales exec sees only the clients assigned to them, and through
     them every related quote / challan / hisab, so they can chase payment and follow up. */
  function seesAllClients() { return S.role === "admin" || S.role === "accounts"; }
  function clientOwner(name) {
    var cl = clientByName(name) || {};
    return String(cl.ownedBy || cl.createdBy || "").trim().toLowerCase();
  }
  function isMineClient(name) {
    if (seesAllClients()) return true;
    if (!name) return false;
    return clientOwner(name) === String(S.user || "").trim().toLowerCase();
  }
  /* Only the owner/admin may set pricing. A sales exec can view every figure and record a payment,
     but can never change a discount % or a rate - pricing stays the owner's control. */
  function canSetPricing() { return S.role === "admin"; }

  /* ---------------- DELIVERY CHALLAN (landscape) ----------------
     This is a picking and receiving sheet, not a sales document. So: no company logo or name,
     no price, no discount, no amount, no photos. Two columns on a landscape A4 fit ~52 lines a
     sheet, and the printer's 2-up setting halves the paper again. Greyscale throughout because
     it is printed in black and white. Freight and the driver DO appear - the driver is a record
     in the Drivers master, not free text, so freight can be totalled per driver later. */
  function challanLogos() {
    return logosReady().then(function () {
      return PDF_LOGO_ORDER.map(function (n) { return logoFor(n); });
    });
  }

  function challanPdf(c, approver) {
    var items = [];
    try { items = JSON.parse(c.itemsJson || "[]"); } catch (e) { items = []; }
    if (!items.length && c.items) {
      items = String(c.items).split(",").map(function (t) {
        var m = String(t).match(/^(.*)x(\d+)\s*$/);
        return { code: "", desc: m ? m[1].trim() : String(t).trim(), unit: "", qty: m ? m[2] : "" };
      });
    }
    items.sort(function (a, b) { return (Number(b.qty) || 0) - (Number(a.qty) || 0); });
    var alt = [];
    try { alt = JSON.parse(c.altJson || "[]"); } catch (e) { alt = []; }
    alt.sort(function (a, b) { return (Number(b.was) || 0) - (Number(a.was) || 0); });

    return Promise.all([loadFonts(), challanLogos()]).then(function (res) {
      var f = res[0], LOGOS = res[1];
      /* v6.9.107: small challan -> HALF an A4 sheet (297 x 105 mm) so paper isn't wasted;
         set the printer to "2 pages per sheet" or cut the sheet - owner's request. A challan
         with more items (or an alteration sheet) stays full A4 landscape and flows onto
         further pages, each carrying the SAME full header and footer. */
      var hasTr = !!(c.driver || c.vehicle || c.freight);
      var slotsNeeded = items.length + (hasTr ? 1 : 0);
      /* v6.9.110: the page is ALWAYS a full A4 LANDSCAPE sheet - no custom sizes, so no
         viewer or printer ever rotates it to portrait. A small challan draws everything in
         the TOP half only; the bottom half stays completely clean (not one word), so the
         sheet can be cut and the blank half reused - owner's paper-saving spec. */
      var small = (slotsNeeded <= 10) && !alt.length;
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
        uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var RS = function (n) { return (uni ? "\u20B9" : "Rs.") + Math.round(Number(n) || 0).toLocaleString("en-IN"); };
      var g = function (v) { doc.setTextColor(v, v, v); };
      var dg = function (v) { doc.setDrawColor(v, v, v); };
      var W = 297, H = (small ? 105 : 210), L = 10, R = W - L;   /* H = content bottom; page stays 210 tall */
      var COLGAP = 8, COLS = 2, COLW = (R - L - COLGAP) / 2, RH = 4.7;
      var LOGO_H = 12, FOOT_H = 24;   /* one line of logos */
      var cols = function (x) {
        return { n: x + 1.5, code: x + 7, desc: x + 30, unit: x + COLW - 26, qty: x + COLW - 2 };
      };
      var client = clientByName(c.customerName) || {};
      var addr = [client.address, client.area, client.location].filter(Boolean).map(String)
        .reduce(function (acc, p) {
          if (acc.join(", ").toLowerCase().indexOf(p.trim().toLowerCase()) < 0) acc.push(p.trim());
          return acc;
        }, []).join(", ");
      var drv = [c.driver, c.vehicle].filter(Boolean).join("  \u00b7  ");
      var drv2 = c.driverMobile ? String(c.driverMobile) : "";

      function header() {
        dg(120); doc.setLineWidth(0.4); doc.line(L, 12, R, 12);
        g(0); F("bold"); doc.setFontSize(11);
        doc.text("DELIVERY CHALLAN", L, 10);
        doc.text(String(c.challanNo || ""), R, 10, { align: "right" });
        var y = 18;
        g(90); F("bold"); doc.setFontSize(5.6); doc.text("DELIVER TO", L, y);
        g(0); F("bold"); doc.setFontSize(10);
        doc.text(fitCell(doc, F, String(c.customerName || "-"), 170, 1, "bold", 10)[0], L, y + 5.5);
        g(60); F("normal"); doc.setFontSize(7);
        var AWID = 110;
        if (addr) doc.text(fitCell(doc, F, addr, AWID, 1, "normal", 7)[0], L, y + 10);
        if (c.site) doc.text(fitCell(doc, F, "Site: " + c.site, AWID, 1, "normal", 7)[0], L, y + 14);
        g(90); F("bold"); doc.setFontSize(5.6);
        var OFF1 = 52, OFF2 = 105;
        doc.text("DATE", R, y, { align: "right" });
        doc.text("PREPARED BY", R - OFF1, y, { align: "right" });
        doc.text("APPROVED BY", R - OFF2, y, { align: "right" });
        g(0); F("normal"); doc.setFontSize(7.6);
        doc.setFontSize(7.6);
        doc.text(String(c.createdAt || "").slice(0, 10), R, y + 4.5, { align: "right" });
        doc.text(String(c.createdBy || "-"), R - OFF1, y + 4.5, { align: "right" });
        doc.text(String(approver || c.approvedBy || "-"), R - OFF2, y + 4.5, { align: "right" });
        /* Freight and the driver used to sit up here. They belong at the FOOT of the item
           list - the storeman reads top to bottom and the transport line is the last thing
           he checks off, not the first. */
        dg(190); doc.setLineWidth(0.2); doc.line(L, 30, R, 30);
      }
      /* From page 2 on, only a slim identifying strip - the full header repeated on every
         sheet just eats rows we need for products. */
      function slimHead() {
        dg(120); doc.setLineWidth(0.4); doc.line(L, 12, R, 12);
        g(0); F("bold"); doc.setFontSize(8);
        doc.text("DELIVERY CHALLAN", L, 10);
        doc.text(String(c.challanNo || ""), R, 10, { align: "right" });
        g(90); F("normal"); doc.setFontSize(6.4);
        doc.text(String(c.customerName || ""), L + 42, 10);
        dg(200); doc.setLineWidth(0.2); doc.line(L, 15, R, 15);
      }

      function colHead(x, y) {
        doc.setFillColor(238, 238, 238); doc.rect(x, y - 3.6, COLW, 5.4, "F");
        dg(160); doc.setLineWidth(0.2); doc.rect(x, y - 3.6, COLW, 5.4, "S");
        g(0); F("bold"); doc.setFontSize(5.4);
        var C = cols(x);
        doc.text("#", C.n, y); doc.text("CODE", C.code, y);
        doc.text("ITEM DESCRIPTION", C.desc, y);
        doc.text("UNIT", C.unit, y, { align: "right" });
        doc.text("QTY", C.qty, y, { align: "right" });
      }
      /* One line of small boxes, spanning exactly the width of an item column (# to QTY),
         so the strip lines up with the table above it instead of floating loose. */
      function logoStrip() {
        var n = LOGOS.length, GP = 1.2;
        var BW = (COLW - GP * (n - 1)) / n, BH = 5.4;
        var x0 = L, y0 = H - FOOT_H - LOGO_H + 4;
        g(115); F("bold"); doc.setFontSize(4.8);
        doc.text("AUTH. DISTRIBUTOR FOR", L, y0 - 1.8);
        LOGOS.forEach(function (lg, i) {
          var bx = x0 + i * (BW + GP);
          dg(218); doc.setLineWidth(0.18); doc.rect(bx, y0, BW, BH, "S");
          if (lg && lg.src) {
            var sc = Math.min((BW - 1.2) / lg.w, (BH - 1.2) / lg.h);
            var iw = lg.w * sc, ih = lg.h * sc;
            try { doc.addImage(lg.src, "JPEG", bx + (BW - iw) / 2, y0 + (BH - ih) / 2, iw, ih); } catch (e) { }
          }
        });
      }
      /* Every sheet carries the sign-off. A 3-sheet challan where only the last page is signed
         proves nothing about the first two, and that is exactly what gets disputed later. */
      function footer(p, pages) {
        /* Who approved it, and when - bottom of the LAST page only, in small grey type.
           It is a fact for an argument later, not a headline. */
        if (p === pages && (approver || c.approvedBy)) {
          g(165); F("normal"); doc.setFontSize(4.6);
          doc.text("Dispatch approved by " + String(approver || c.approvedBy) +
            (c.approvedAt ? " on " + String(c.approvedAt).slice(0, 10) + " at " + String(c.approvedAt).slice(11, 16) : "") +
            ", verified by PIN.", R, H - 23.5, { align: "right" });
        }
        dg(190); doc.setLineWidth(0.2); doc.line(L, H - 20, R, H - 20);
        g(90); F("bold"); doc.setFontSize(5.6);
        doc.text("RECEIVED THE ABOVE MATERIAL IN GOOD CONDITION", L, H - 15.8);
        dg(150); doc.setLineWidth(0.3);
        var S1 = 62, G1 = 72, S2 = 124, G2 = 134, S3 = 180;
        doc.line(L, H - 7, L + S1, H - 7);
        doc.line(L + G1, H - 7, L + S2, H - 7);
        doc.line(L + G2, H - 7, L + S3, H - 7);
        g(95); F("normal"); doc.setFontSize(5.6);
        doc.text("Client name & signature", L, H - 4);
        doc.text("Contact number", L + G1, H - 4);
        doc.text("Date", L + G2, H - 4);
        g(140); doc.setFontSize(6);
        doc.text("Page " + p + " of " + pages, R, H - 4, { align: "right" });
      }

      /* v6.9.107: every page carries the SAME full header (owner's request), so row
         capacity is uniform across pages. */
      var TOP = 34;
      var bottomLimit = H - FOOT_H - LOGO_H - 2;
      var perCol = Math.floor((bottomLimit - TOP - 7) / RH);
      var itemPages = Math.max(1, Math.ceil(items.length / (perCol * COLS)));
      var totalPages = itemPages + (alt.length ? 1 : 0);
      var idx = 0, page = 1, lastY = 0, lastX = L;

      do {
        if (page > 1) doc.addPage();
        header();
        var top = TOP;
        for (var ci = 0; ci < COLS && idx < items.length; ci++) {
          var x = L + ci * (COLW + COLGAP), y = top + 4;
          colHead(x, y); y += 6.6;
          var C = cols(x);
          for (var k = 0; k < perCol && idx < items.length; k++, idx++) {
            var it = items[idx];
            if (idx % 2 === 1) { doc.setFillColor(248, 248, 248); doc.rect(x, y - 3.3, COLW, RH, "F"); }
            g(125); F("normal"); doc.setFontSize(5.6);
            doc.text(String(idx + 1), C.n, y);
            g(45); F("bold"); doc.setFontSize(5.6);
            doc.text(String(it.code || "").slice(0, 14), C.code, y);
            g(0); F("normal"); doc.setFontSize(6.4);
            doc.text(fitCell(doc, F, it.desc, C.unit - C.desc - 4, 1, "normal", 6.4)[0], C.desc, y);
            g(95); F("normal"); doc.setFontSize(6);
            doc.text(String(it.unit || ""), C.unit, y, { align: "right" });
            g(0); F("bold"); doc.setFontSize(7);
            doc.text(String(it.qty || ""), C.qty, y, { align: "right" });
            y += RH;
          }
          dg(220); doc.setLineWidth(0.2); doc.line(x, y - 3.3, x + COLW, y - 3.3);
          lastY = y; lastX = x;
        }
        /* the transport line closes the list, like a final serial - not a header banner */
        if (idx >= items.length && (drv || c.freight)) {
          var ty = lastY + 1.6;
          if (ty > bottomLimit - 6) { ty = bottomLimit - 6; }
          g(125); F("normal"); doc.setFontSize(5.6);
          doc.text(String(items.length + 1), lastX + 1.5, ty);
          g(90); F("bold"); doc.setFontSize(5.6);
          doc.text("TRANSPORT", lastX + 7, ty);
          g(0); F("normal"); doc.setFontSize(6.4);
          var tline = [drv, drv2].filter(Boolean).join("  \u00b7  ");
          if (c.freight) tline += (tline ? "   \u00b7   " : "") + "Freight " + RS(c.freight) + " (" + String(c.freightTo || "Client") + ")";
          doc.text(fitCell(doc, F, tline, COLW - 34, 1, "normal", 6.4)[0], lastX + 30, ty);
          dg(220); doc.setLineWidth(0.2); doc.line(lastX, ty + 1.8, lastX + COLW, ty + 1.8);
        }
        logoStrip(); footer(page, totalPages);
        page++;
      } while (idx < items.length);

      if (alt.length) {
        /* Half width - one item column - so it reads as a short note against the challan,
           not as a second document twice the size of the thing it is correcting. */
        doc.addPage(); header();
        var AW = COLW;
        var ay = 40;
        doc.setFillColor(55, 55, 55); doc.rect(L, ay - 4, AW, 5.6, "F");
        doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(5.8);
        doc.text("ALTERATION AT RECEIPT  -  short / excess / added at site", L + 2, ay);
        ay += 8;
        g(90); F("bold"); doc.setFontSize(5.2);
        doc.text("CODE", L + 1.5, ay);
        doc.text("ITEM DESCRIPTION", L + 26, ay);
        doc.text("SENT", L + AW - 44, ay, { align: "right" });
        doc.text("RECD", L + AW - 30, ay, { align: "right" });
        doc.text("DIFF", L + AW - 16, ay, { align: "right" });
        doc.text("REASON", L + AW - 1.5, ay, { align: "right" });
        dg(200); doc.setLineWidth(0.2); doc.line(L, ay + 1.4, L + AW, ay + 1.4);
        ay += 5.8;
        alt.forEach(function (a, i) {
          if (i % 2 === 1) { doc.setFillColor(248, 248, 248); doc.rect(L, ay - 3.2, AW, 5, "F"); }
          var was = Number(a.was) || 0, now = Number(a.now) || 0, diff = now - was;
          g(45); F("bold"); doc.setFontSize(5.4);
          doc.text(String(a.code || "").slice(0, 14), L + 1.5, ay);
          g(0); F("normal"); doc.setFontSize(6.2);
          doc.text(fitCell(doc, F, a.desc, AW - 78, 1, "normal", 6.2)[0], L + 26, ay);
          g(120); F("normal"); doc.setFontSize(6.2);
          doc.text(was ? String(was) : "-", L + AW - 44, ay, { align: "right" });
          g(0); F("bold"); doc.setFontSize(6.8);
          doc.text(String(now), L + AW - 30, ay, { align: "right" });
          F("bold"); doc.setFontSize(6.2);
          doc.text((diff > 0 ? "+" : "") + diff, L + AW - 16, ay, { align: "right" });
          g(80); F("normal"); doc.setFontSize(5.4);
          doc.text(fitCell(doc, F, a.note || "", 26, 1, "normal", 5.4)[0], L + AW - 1.5, ay, { align: "right" });
          ay += 5;
        });
        dg(200); doc.line(L, ay - 3.2, L + AW, ay - 3.2);
        ay += 7;
        g(95); F("normal"); doc.setFontSize(6);
        doc.text("The dispatched challan is unchanged. This sheet records only what actually arrived at site" +
          (c.alteredBy ? "  \u00b7  recorded by " + c.alteredBy : "") + ".", L, ay);
        logoStrip(); footer(totalPages, totalPages);
      }
      return doc;
    });
  }

  function sendChallanPdf(c, bot, caption, approver) {
    return loadLogo().then(function () { return challanPdf(c, approver); }).then(function (d) {
      return api("tgSend", { bot: bot, pdfBase64: d.output("datauristring").split(",")[1],
        filename: String(c.challanNo).replace(/[^\w.-]/g, "_") + ".pdf", caption: caption,
        challanId: c.id });   /* v6.9.106: server stores the Telegram message id on the challan */
    });
  }

  /* ---------------- MATERIAL RETURNS ----------------
     A return is its own record, never a negative challan. Raised -> Picked up -> Received at the
     godown, each step stamped. The cross-check is the point of the whole thing: it names returns
     that are stuck - raised but never collected, or collected but never booked in - because
     those are the two ways material quietly goes missing between a client and the godown. */
  /* ---------------- TOOLS ----------------
     A punching machine is a liability with ONE holder at a time, not stock. So the question is
     never "where is it on a map" - it is "who accepted it, and when". Every movement is a named
     handover appended to a chain that is never edited, so a tool that goes missing always has a
     last named holder to ask. Holders come from people already in the app: clients, partners
     and staff - nobody has to be registered twice. */
  function toolHolders() {
    var out = [];
    (S.data.clients || []).forEach(function (c) { out.push({ type: "Client", name: c.name, mobile: c.mobile || "" }); });
    (S.data.associates || []).forEach(function (p) { out.push({ type: p.role || "Partner", name: p.name, mobile: p.mobile || "" }); });
    (S.data.team || []).forEach(function (t) { out.push({ type: "Staff", name: t.name, mobile: t.mobile || "" }); });
    return out;
  }

  function toolDays(t) {
    if (!t.issuedAt) return 0;
    return Math.floor((Date.now() - new Date(t.issuedAt).getTime()) / 86400000);
  }
  function toolOverdue(t) {
    var due = Number(t.dueDays) || 0;
    return String(t.status) === "Issued" && due > 0 && toolDays(t) > due;
  }

  /* The scanner uses the phone camera. Where the browser cannot decode a QR (older iOS), the
     code can always be typed - the sticker prints the code in plain text underneath for exactly
     that reason. A tool must never be un-trackable because a camera API was missing. */
  function modalToolScan() {
    return '<h2>Scan a tool sticker</h2>' +
      '<div id="scanbox" style="position:relative;background:#000;border-radius:12px;overflow:hidden;height:230px">' +
      '<video id="scanvid" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover"></video>' +
      '<div style="position:absolute;inset:18% 22%;border:2px solid #5eead4;border-radius:10px"></div></div>' +
      '<div class="meta" id="scanmsg" style="margin-top:8px">Point the camera at the sticker.</div>' +
      '<label style="margin-top:10px">Or type the code from the sticker</label>' +
      '<div class="row"><input class="grow" id="tl_code" placeholder="EW-T001"/>' +
      '<button class="btn" data-act="tl-code">Open</button></div>' +
      '<div class="foot"><button class="btn ghost" data-act="tl-close">Cancel</button></div>';
  }

  function startScanner() {
    var vid = el("scanvid"), msg = el("scanmsg");
    if (!vid) return;
    if (!navigator.mediaDevices || !window.BarcodeDetector) {
      if (msg) msg.textContent = "This phone cannot scan from the browser - type the code printed under the QR.";
      return;
    }
    var det = new BarcodeDetector({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
      S.scan = stream;
      vid.srcObject = stream;
      var tick = function () {
        if (!S.scan || !el("scanvid")) return;
        det.detect(vid).then(function (codes) {
          if (codes && codes.length) {
            var code = String(codes[0].rawValue || "").trim();
            stopScanner();
            openToolByCode(code);
            return;
          }
          setTimeout(tick, 350);
        }).catch(function () { setTimeout(tick, 500); });
      };
      setTimeout(tick, 600);
    }).catch(function () {
      if (msg) msg.textContent = "Camera not allowed - type the code printed under the QR.";
    });
  }
  function stopScanner() {
    if (S.scan) { try { S.scan.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { } S.scan = null; }
  }
  /* Tool codes are case- and space-insensitive: the sticker prints EW-T001 but a person may
     type "ew-t001" or "ew - t001". Canonicalise to UPPERCASE with all whitespace stripped
     (hyphens kept) at the one point every scan / typed code / list-open passes through, so the
     same tool is found no matter how the code was entered. */
  function normToolCode(code) { return String(code == null ? "" : code).toUpperCase().replace(/\s+/g, ""); }
  function openToolByCode(code) {
    code = normToolCode(code);
    if (!code) { toast("Type the code from the sticker."); return; }
    api("toolScan", { code: code }).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error) || "Tool not found."); return; }
      S.tool = { t: r.tool, chain: r.chain || [], days: r.heldDays || 0 };
      S.modal = modalTool(); render();
    });
  }

  function modalTool() {
    var t = S.tool.t;
    var iss = String(t.status) === "Issued";
    var holders = toolHolders();
    var h = '<h2>' + esc(t.code) + (t.name ? ' &middot; ' + esc(t.name) : "") + '</h2>';

    if (!t.name) {
      /* first scan of a fresh sticker: register the machine against it */
      h += '<p class="sub">This sticker is not registered to a tool yet. Name the machine once - after that, every scan just moves it.</p>' +
        '<label>Tool name</label><input id="tl_name" placeholder="Pipe punching machine"/>' +
        '<div class="grid2"><div><label>Make</label><input id="tl_brand" placeholder="Huliot"/></div>' +
        '<div><label>Model</label><input id="tl_model"/></div></div>' +
        '<div class="grid2"><div><label>Serial no.</label><input id="tl_serial"/></div>' +
        '<div><label>Value</label><input id="tl_value" inputmode="numeric" placeholder="80000"/></div></div>' +
        '<label>Return expected within (days)</label><input id="tl_due" inputmode="numeric" value="30"/>' +
        '<div class="foot"><button class="btn ghost" data-act="tl-close">Cancel</button>' +
        '<button class="btn" data-act="tl-register">Register this tool</button></div>';
      return h;
    }

    h += '<div class="meta">' + esc([t.brand, t.model, t.serial].filter(Boolean).join(" &middot; ")) +
      (t.value ? ' &middot; ' + money(t.value) : "") + '</div>';
    h += iss
      ? '<div class="card" style="margin-top:8px"><h3>With ' + esc(t.holder) + '</h3><div class="meta">' +
        esc(t.holderType || "") + (t.holderMobile ? ' &middot; ' + esc(t.holderMobile) : "") +
        (t.site ? '<br>' + esc(t.site) : "") +
        '<br>Out ' + S.tool.days + ' days' + (toolOverdue(t) ? ' - agreed ' + esc(t.dueDays) + ' days' : "") + '</div></div>'
      : '<div class="card" style="margin-top:8px"><h3>In the godown</h3></div>';

    h += '<h3 style="margin:14px 0 4px;font-size:14px">' + (iss ? "Hand over to" : "Issue to") + '</h3>' +
      '<input id="tl_holder" list="holderlist" placeholder="Client, plumber, architect or staff"/>' +
      '<datalist id="holderlist">' + holders.map(function (x) {
        return '<option value="' + esc(x.name) + '">' + esc(x.type) + '</option>';
      }).join("") + '</datalist>' +
      '<label>Site (optional)</label><input id="tl_site" list="sitelist2" placeholder="Where is it going"/>' +
      '<datalist id="sitelist2">' + (S.data.sites || []).map(function (x) {
        return '<option value="' + esc(x.name) + '"></option>';
      }).join("") + '</datalist>' +
      '<div class="acts" style="margin-top:10px">' +
      '<button class="btn" data-act="tl-give">' + (iss ? "Transfer custody" : "Issue tool") + '</button>' +
      (iss ? '<button class="btn sm ghost" data-act="tl-back">Take back into godown</button>' : "") +
      '</div>';

    if ((S.tool.chain || []).length) {
      h += '<h3 style="margin:14px 0 4px;font-size:14px">Chain of custody</h3><div class="meta">';
      S.tool.chain.forEach(function (m) {
        h += '<div style="padding:5px 0;border-bottom:1px solid #f1f5f9">' +
          '<b>' + esc(m.action) + '</b> &middot; ' + esc(String(m.createdAt).slice(0, 10)) + '<br>' +
          esc(m.fromHolder || "Godown") + ' &rarr; ' + esc(m.toHolder || "Godown") +
          (m.site ? ' &middot; ' + esc(m.site) : "") + '<br>' +
          '<span style="color:#0d9488">Transferred by ' + esc(m.by) +
          (m.byMobile ? ' &middot; ' + esc(m.byMobile) : "") +
          (m.byRole ? ' (' + esc(m.byRole) + ')' : "") + '</span>' +
          (m.lat ? '<br><span style="color:#94a3b8">GPS ' + esc(String(m.lat).slice(0, 8)) + ', ' + esc(String(m.lng).slice(0, 8)) + '</span>' : "") +
          '</div>';
      });
      h += '</div>';
    }
    h += '<div class="foot"><button class="btn ghost" data-act="tl-close">Close</button></div>';
    return h;
  }

  /* ---------------- RATE REVISION ----------------
     A revision is a DATED event, not an edit. The catalogue keeps its base rate; a challan
     raised on or after the effective date is billed at the revised rate, and every challan
     raised before it keeps the rate it was billed at, for good. That is what lets a return be
     valued honestly a year later: 10 pcs come back at this year's rate, the next 5 at last
     year's, because the challans still remember what each one cost. */
  function viewRates() {
    var revs = (S.data.pricerev || []).slice().sort(function (a, b) {
      return String(b.effectiveFrom).localeCompare(String(a.effectiveFrom));
    });
    var h = '<div class="row"><div class="grow"></div>' +
      '<button class="btn" data-act="pr-new">+ New price revision</button></div>';
    if (!revs.length) h += '<div class="empty">No revisions yet. Today every product bills at its catalogue rate.</div>';
    revs.forEach(function (r) {
      var ov = [];
      try { ov = JSON.parse(r.overridesJson || "[]"); } catch (e) { }
      var live = String(r.effectiveFrom).slice(0, 10) <= today();
      h += '<div class="card"><h3>' + esc(r.brand) + ' ' +
        '<span class="pill ' + (live ? "Won" : "soon") + '">' + (Number(r.pct) >= 0 ? "+" : "") + esc(r.pct) + '%' +
        (live ? "" : " from " + esc(r.effectiveFrom)) + '</span></h3>' +
        '<div class="meta">Effective ' + esc(r.effectiveFrom) + ' &middot; ' + (live ? "in force" : "not yet in force") +
        (ov.length ? '<br>' + ov.length + ' item(s) overridden: ' + esc(ov.slice(0, 4).map(function (o) { return o.code; }).join(", ")) : "") +
        '<br>By ' + esc(r.createdBy) + (r.createdAt ? ' on ' + dmy(String(r.createdAt).slice(0,10)) + ' ' + String(r.createdAt).slice(11,16) : '') + (r.notes ? ' &middot; ' + esc(r.notes) : "") +
        '<br><span style="color:#94a3b8">Challans raised before this date keep their old rates.</span></div></div>';
    });
    return h;
  }

  function modalPrice() {
    if (!S.pr) S.pr = { brand: "", overrides: [] };
    var z = S.pr;
    return '<h2>New price revision</h2>' +
      '<p class="sub">This applies to challans raised on or after the date. Nothing already billed changes.</p>' +
      '<label>Brand</label><select id="pr_brand">' +
      opts([""].concat((S.data.brands || []).filter(function (b) {
        return String(b.active || "Y").toUpperCase() !== "N";
      }).map(function (b) { return b.brand; })), z.brand) + '</select>' +
      '<div class="grid2">' +
      '<div><label>Increase across the brand (%)</label><input id="pr_pct" inputmode="decimal" placeholder="6"/></div>' +
      '<div><label>Effective from</label><input id="pr_from" type="date" value="' + today() + '"/></div>' +
      '</div>' +
      '<h3 style="margin:14px 0 4px;font-size:14px">Items that rise differently ' +
      '<span class="pill teal">' + (z.overrides || []).length + '</span></h3>' +
      '<div class="row"><input class="grow" id="pr_code" list="prodlist" placeholder="Product code or name"/>' +
      '<input id="pr_rate" inputmode="numeric" placeholder="New rate" style="width:100px"/>' +
      '<button class="btn sm ghost" data-act="pr-add">Add</button></div>' + prodDatalist() +
      ((z.overrides || []).length
        ? '<div class="meta" style="margin-top:6px">' + z.overrides.map(function (o) {
            return esc(o.code) + ' &rarr; ' + money(o.rate);
          }).join("<br>") + '</div>'
        : "") +
      '<label style="margin-top:10px">Note (optional)</label><input id="pr_note" placeholder="Annual revision"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="pr-save">Save revision</button></div>';
  }

  /* ---------------- MONTHLY SALES CARD ----------------
     Sundays are dropped from the working-day average, because counting a day nobody works
     drags the average down and makes a good month read as a poor one. But a visit actually
     LOGGED on a Sunday is still shown, flagged - the man did the work, and hiding it would be
     the opposite of the point. */
  function viewReport() {
    var execs = (S.data.team || []).filter(function (t2) {
      return String(t2.role).toLowerCase() === "sales" && String(t2.active).toUpperCase() !== "N";
    }).map(function (t2) { return t2.name; });
    if (S.role !== "admin") execs = [S.user];
    var months = [];
    for (var i = 0; i < 12; i++) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    var h = '<div class="row">' +
      '<div><label>Executive</label><select id="rp_exec">' + opts(execs, (S.rpt && S.rpt.exec) || execs[0] || "") + '</select></div>' +
      '<div><label>Month</label><select id="rp_month">' + opts(months, (S.rpt && S.rpt.month) || months[1]) + '</select></div>' +
      '<div style="align-self:end"><button class="btn" data-act="rp-go">Show</button></div>' +
      '</div>';
    var r = S.rpt && S.rpt.data;
    if (!r) return h + '<div class="empty">Pick an executive and a month.</div>';

    h += '<div class="cards" style="margin-top:12px">' +
      '<div class="stat"><div class="n">' + r.newLeads + '</div><div class="l">New leads opened</div></div>' +
      '<div class="stat"><div class="n">' + r.totalVisits + '</div><div class="l">Visits logged</div></div>' +
      '<div class="stat"><div class="n">' + r.daysOut + '/' + r.workingDays + '</div><div class="l">Days out (Sun excl.)</div></div>' +
      '<div class="stat"><div class="n">' + r.perDayAvg + '</div><div class="l">Visits per working day</div></div>' +
      '</div>';

    var TYPES = ["Site", "Plumber", "Architect", "PMC", "Builder"];
    var COL = { Site: "#0d9488", Plumber: "#2563eb", Architect: "#9333ea", PMC: "#ea580c", Builder: "#64748b" };
    h += '<h3 style="margin:14px 0 6px;font-size:14px">Who he saw</h3><div class="row">' +
      TYPES.map(function (t2) {
        return '<span class="pill" style="background:' + COL[t2] + '22;color:' + COL[t2] + '">' +
          t2 + ' <b>' + (r.byType[t2] || 0) + '</b></span>';
      }).join("") + '</div>';

    h += '<div class="meta" style="margin-top:8px">' +
      '<b>' + r.newLeadVisits + '</b> visits to new leads &middot; <b>' + r.existingLeadVisits + '</b> to existing clients' +
      (r.sundayVisits ? '<br><span style="color:#b45309"><b>' + r.sundayVisits + '</b> logged on a Sunday - shown below, not counted in the working-day average.</span>' : "") +
      '</div>';

    /* the graph: one bar a day, stacked by who was seen */
    var max = Math.max.apply(null, r.perDay.map(function (p) { return p.total; }).concat([1]));
    h += '<h3 style="margin:16px 0 6px;font-size:14px">Visits per day</h3>' +
      '<div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:6px 0;border-bottom:1px solid #e2e8f0;overflow-x:auto">';
    r.perDay.forEach(function (p) {
      var hp = Math.round((p.total / max) * 100);
      var stack = TYPES.filter(function (t2) { return p.byType[t2]; }).map(function (t2) {
        return '<div style="height:' + Math.round((p.byType[t2] / p.total) * hp) + '%;background:' + COL[t2] + '"></div>';
      }).join("");
      h += '<div title="' + p.iso + ' - ' + p.total + ' visit(s)" style="flex:1;min-width:9px;display:flex;flex-direction:column;justify-content:flex-end;height:100%;' +
        (p.sunday ? "background:#fef2f2;" : "") + '">' + stack + '</div>';
    });
    h += '</div><div style="display:flex;gap:2px;font-size:8px;color:#94a3b8">' +
      r.perDay.map(function (p) {
        return '<div style="flex:1;min-width:9px;text-align:center;' + (p.sunday ? "color:#dc2626;font-weight:700" : "") + '">' + p.day + '</div>';
      }).join("") + '</div>' +
      '<div class="meta" style="margin-top:4px;color:#94a3b8">Red columns are Sundays.</div>';

    if (r.newLeadNames && r.newLeadNames.length) {
      h += '<h3 style="margin:16px 0 6px;font-size:14px">New leads he opened</h3><div class="meta">' +
        r.newLeadNames.map(function (n) { return "&bull; " + esc(n); }).join("<br>") + '</div>';
    }
    return h;
  }

  function viewTools() {
    var list = (S.data.tools || []).slice().sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
    var out = list.filter(function (t) { return String(t.status) === "Issued"; });
    var late = out.filter(toolOverdue);
    var idle = list.filter(function (t) { return String(t.status) !== "Issued" && t.name; });
    var blank = list.filter(function (t) { return !t.name; });
    var worth = list.reduce(function (a, t) { return a + (Number(t.value) || 0); }, 0);

    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + out.length + '</div><div class="l">Out with someone</div></div>' +
      '<div class="stat ' + (late.length ? "alert" : "") + '"><div class="n">' + late.length + '</div><div class="l">Held too long</div></div>' +
      '<div class="stat"><div class="n">' + idle.length + '</div><div class="l">In godown</div></div>' +
      '<div class="stat"><div class="n">' + money(worth) + '</div><div class="l">Value tracked</div></div>' +
      '</div>';
    h += '<div class="row"><button class="btn" data-act="tl-scan">Scan a tool</button>' +
      '<div class="grow"></div><button class="btn sm ghost" data-act="tl-blank">Unregistered (' + blank.length + ')</button></div>';

    if (late.length) {
      h += '<h3 style="margin:14px 0 6px;font-size:14px">Held beyond the agreed days</h3>';
      late.forEach(function (t) {
        h += '<div class="card" style="border-color:#fecaca;background:#fef2f2">' +
          '<h3>' + esc(t.code) + ' &middot; ' + esc(t.name || "unnamed") + ' <span class="pill Lost">' + toolDays(t) + 'd</span></h3>' +
          '<div class="meta">With <b>' + esc(t.holder) + '</b> (' + esc(t.holderType || "") + ')' +
          (t.site ? ' at ' + esc(t.site) : "") + '<br>Agreed ' + esc(t.dueDays) + ' days &middot; out since ' + esc(String(t.issuedAt).slice(0, 10)) + '</div>' +
          '<div class="acts"><button class="btn sm" data-act="tl-open" data-id="' + esc(t.id) + '">Open</button></div></div>';
      });
    }

    h += '<h3 style="margin:14px 0 6px;font-size:14px">Where every tool is</h3>';
    var named = list.filter(function (t) { return t.name; });
    if (!named.length) h += '<div class="empty">No tools registered yet. Scan a sticker to register the first one.</div>';
    named.forEach(function (t) {
      var iss = String(t.status) === "Issued";
      h += '<div class="card"><h3>' + esc(t.code) + ' &middot; ' + esc(t.name) +
        ' <span class="pill ' + (iss ? (toolOverdue(t) ? "Lost" : "teal") : "Won") + '">' +
        (iss ? "with " + esc(t.holder) : "in godown") + '</span></h3>' +
        '<div class="meta">' + esc([t.brand, t.model, t.serial].filter(Boolean).join(" &middot; ")) +
        (t.value ? '<br>Value ' + money(t.value) : "") +
        (iss ? '<br>' + esc(t.holderType || "") + (t.holderMobile ? ' &middot; ' + esc(t.holderMobile) : "") +
          (t.site ? '<br>Site: ' + esc(t.site) : "") + '<br>Out ' + toolDays(t) + ' days' : "") + '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="tl-open" data-id="' + esc(t.id) + '">' +
        (iss ? "Transfer / take back" : "Issue") + '</button></div></div>';
    });
    return h;
  }

  function viewReturns() {
    var list = (S.data.returns || []).slice().reverse();
    /* a sales exec sees returns for THEIR clients only */
    /* ONLY a sales exec is scoped to their own clients. Godown/service are operational roles that
       must see the whole dispatch/return board, not an owner-filtered slice. */
    if (S.role === "sales") list = list.filter(function (r) { return isMineClient(r.customerName); });
    var by = function (st) { return list.filter(function (r) { return (r.status || "Raised") === st; }).length; };
    var h = '<div class="cards">' +
      '<div class="stat ' + (by("Raised") ? "alert" : "") + '"><div class="n">' + by("Raised") + '</div><div class="l">Raised, to collect</div></div>' +
      '<div class="stat"><div class="n">' + by("Picked up") + '</div><div class="l">In transit</div></div>' +
      '<div class="stat"><div class="n">' + by("Received") + '</div><div class="l">Back in godown</div></div>' +
      '</div>';
    h += '<div class="row"><button class="btn sm ghost" data-act="rt-recon">Cross-check dispatch vs return</button>' +
      '<div class="grow"></div><button class="btn" data-act="rt-new">+ Register return</button></div>';
    if (S.recon) {
      var st = S.recon.stale || [];
      h += '<h3 style="margin:14px 0 6px;font-size:14px">Cross-check</h3>';
      if (st.length) {
        st.forEach(function (x) {
          h += '<div class="card" style="border-color:#fecaca;background:#fef2f2">' +
            '<h3>' + esc(x.returnNo) + ' <span class="pill Lost">stuck ' + x.days + 'd</span></h3>' +
            '<div class="meta">' + esc(x.client) + ' &middot; ' + x.qty + ' pcs<br>' + esc(x.why) + '</div></div>';
        });
      } else {
        h += '<div class="card"><div class="meta">Nothing stuck. Every return raised has been collected and booked in.</div></div>';
      }
      (S.recon.rows || []).forEach(function (r) {
        h += '<div class="card"><h3>' + esc(r.client) + '</h3><div class="meta">' +
          'Dispatched <b>' + r.dispatched + '</b> pcs &middot; returned <b>' + r.returned + '</b>' +
          (r.pending ? ' &middot; <span style="color:#dc2626">' + r.pending + ' still out on a return</span>' : "") +
          '</div></div>';
      });
    }
    if (!list.length) h += '<div class="empty">No returns registered yet.</div>';
    list.forEach(function (r) {
      var stt = r.status || "Raised";
      var cls = stt === "Received" ? "Won" : (stt === "Raised" ? "due" : "teal");
      var its = [];
      try { its = JSON.parse(r.itemsJson || "[]"); } catch (e) { }
      h += '<div class="card"><h3>' + esc(r.returnNo) + ' <span class="pill ' + cls + '">' + esc(stt) + '</span></h3>' +
        '<div class="meta">' + esc(r.customerName || "") + (r.site ? ' &middot; ' + esc(r.site) : "") +
        (r.challanNo ? '<br>Against challan ' + esc(r.challanNo) : "") +
        '<br>' + its.map(function (i) { return esc(i.desc) + " x" + i.qty; }).join(", ") +
        (r.reason ? '<br>Reason: ' + esc(r.reason) : "") +
        (r.driver ? '<br>Pickup: ' + esc(r.driver) + (r.vehicle ? " (" + esc(r.vehicle) + ")" : "") : "") +
        '<br>' + esc(String(r.createdAt).slice(0, 10)) + ' by ' + esc(r.createdBy) +
        (r.receivedBy ? '<br>Booked in by ' + esc(r.receivedBy) : "") + '</div>' +
        '<div class="acts">' +
        (stt === "Raised" ? '<button class="btn sm" data-act="rt-move" data-id="' + esc(r.id) + '" data-to="Picked up">Picked up</button>' : "") +
        (stt === "Picked up" ? '<button class="btn sm" data-act="rt-move" data-id="' + esc(r.id) + '" data-to="Received">Received at godown</button>' : "") +
        '</div></div>';
    });
    return h;
  }

  /* the return form reuses the challan picker, so nobody has to learn a second screen */
  /* read the form into a plain object so it survives a modal swap */
  function keepSnapshot(ids) {
    var o = {};
    ids.forEach(function (i) { var e = el(i); if (e) o[i] = e.value; });
    return o;
  }
  function restoreSnapshot(o) {
    if (!o) return;
    Object.keys(o).forEach(function (i) { var e = el(i); if (e) e.value = o[i]; });
  }
  var OC_FIELDS = ["o_client", "o_date", "o_no", "o_site", "o_bill"];

  function keepFields(ids) {
    var keep = {};
    ids.forEach(function (i) { var e = el(i); if (e) keep[i] = e.value; });
    return function () {
      ids.forEach(function (i) { var e = el(i); if (e && keep[i] !== undefined) e.value = keep[i]; });
    };
  }
  var CH_FIELDS = ["m_loc", "m_client", "m_site", "m_assoc", "m_freight", "m_fto", "m_driver", "m_dmob", "m_veh", "m_disc", "m_discnote"];
  var RT_FIELDS = ["r_client", "r_site", "r_ch", "r_reason", "r_driver", "r_freight"];

  function modalReturn() {
    if (!S.rt) S.rt = { brand: "", family: "", items: [] };
    var z = S.rt;
    var clients = S.data.clients.map(function (x) { return x.name; });
    var chs = (S.data.challans || []).filter(function (c) {
      return ["Dispatched", "Received"].indexOf(String(c.status)) >= 0;
    }).map(function (c) { return c.challanNo; });
    return '<h2>Register material return</h2>' +
      '<p class="sub">Material coming back from a client. The original challan is not changed.</p>' +
      clientField("r_client", (S.rt && S.rt.client) || "") +
      '<label>Site (optional)</label><input id="r_site" placeholder="Site / project"/>' +
      '<label>Against challan (optional)</label><input id="r_ch" list="chlist" placeholder="Challan number"/>' +
      '<datalist id="chlist">' + chs.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>' +
      '<label>Reason</label><select id="r_reason">' +
      opts(["Excess at site", "Damaged", "Wrong item supplied", "Client cancelled", "Other"], "Excess at site") + '</select>' +
      '<h3 style="margin:14px 0 4px;font-size:14px">Material coming back ' +
      '<span class="pill teal">' + (z.items || []).length + ' picked</span></h3>' +
      rtPicker() +
      '<div class="grid2" style="margin-top:10px">' +
      '<div><label>Pickup driver</label><input id="r_driver" list="driverlist2" placeholder="Driver name"/>' +
      '<datalist id="driverlist2">' + (S.data.drivers || []).map(function (d) {
        return '<option value="' + esc(d.name) + '"></option>';
      }).join("") + '</datalist></div>' +
      '<div><label>Freight on the return</label><input id="r_freight" inputmode="numeric" value="0"/></div>' +
      '</div>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="rt-save">Register return</button></div>';
  }

  function rtPicker() {
    var z = S.rt;
    var h = '<div class="row" style="margin-top:6px">' + (S.data.brands || []).filter(function (br) {
      return String(br.active || "Y").toUpperCase() !== "N" && brandProducts(br.brand).length;
    }).map(function (br) {
      return '<button class="chip ' + (z.brand === br.brand ? "on" : "") + '" data-act="rt-brand" data-brand="' + esc(br.brand) + '">' + esc(br.brand) + '</button>';
    }).join("") + '</div>';
    if (!z.brand) return h + '<div class="empty">Pick a brand.</div>';
    h += '<div class="chips">' + familyList(z.brand).map(function (f) {
      var n = brandProducts(z.brand).filter(function (p) { return p.family === f; }).length;
      return '<button class="chip ' + (z.family === f ? "on" : "") + '" data-act="rt-fam" data-fam="' + esc(f) + '">' + esc(f) + ' <b>' + n + '</b></button>';
    }).join("") + '</div>';
    if (!z.family) return h + '<div class="empty">Pick a family above.</div>';
    h += '<div class="plist">';
    brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
      var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
      h += '<div class="prow ' + (ex ? "picked" : "") + '">' +
        (p.pic ? '<img src="' + esc(p.pic) + '" loading="lazy"/>' : '<div class="noimg"></div>') +
        '<div class="pinfo"><div class="pname">' + esc(p.desc) + '</div>' +
        '<div class="pmeta">' + esc(p.code) + ' &middot; ' + esc(p.unit) + '</div></div>' +
        '<div class="pqty">' +
        '<button class="stp" data-act="rt-qty" data-code="' + esc(p.code) + '" data-d="-1">&minus;</button>' +
        '<b>' + (ex ? ex.qty : 0) + '</b>' +
        '<button class="stp" data-act="rt-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  /* Deliveries hub: Challans + Material returns are one lifecycle, so they share a screen with
     a small sub-tab switch instead of two top-level tabs. Each sub-view is unchanged. */
  function viewDeliveries() {
    var sub = S.delSub === "returns" ? "returns" : "challans";
    var h = '<div class="row" style="margin-bottom:10px">' +
      '<button class="btn sm ' + (sub === "challans" ? "" : "ghost") + '" data-act="del-sub" data-s="challans">Challans</button>' +
      '<button class="btn sm ' + (sub === "returns" ? "" : "ghost") + '" data-act="del-sub" data-s="returns">Material returns</button>' +
      '</div>';
    return h + (sub === "returns" ? viewReturns() : viewChallans());
  }

  /* A saved challan's items as a compact, numbered, qty-descending table (same look as the
     challan builder and receipt) instead of one long comma string. Uses itemsJson when present,
     else parses the legacy "desc xQty, ..." string. */
  function challanItemsTable(c) {
    var items = [];
    try { items = JSON.parse(c.itemsJson || "[]"); } catch (e) { items = []; }
    if (!items.length && c.items) {
      items = String(c.items).split(",").map(function (t) {
        var m = String(t).match(/^(.*?)[x×](\d+)\s*$/);
        return { desc: m ? m[1].trim() : String(t).trim(), qty: m ? m[2] : "" };
      });
    }
    if (!items.length) return "";
    items = items.slice().sort(function (a, b) { return (Number(b.qty) || 0) - (Number(a.qty) || 0); });
    var tot = items.reduce(function (a, i) { return a + (Number(i.qty) || 0); }, 0);
    var rows = items.map(function (i, idx) {
      return '<tr style="border-bottom:1px solid #e2e8f0;background:' + (idx % 2 ? '#f8fafc' : '#fff') + '">' +
        '<td style="padding:5px 8px;color:#64748b;font-weight:700">' + (idx + 1) + '</td>' +
        '<td style="padding:5px 8px">' + esc(i.desc || i.code || "") + '</td>' +
        '<td style="padding:5px 8px;text-align:center;font-weight:700">' + esc(i.qty || "") + '</td></tr>';
    }).join("");
    return '<div style="overflow-x:auto;margin:8px 0 2px"><table style="width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #e2e8f0">' +
      '<thead><tr style="background:#0b3b36;color:#fff"><th style="padding:6px 8px;text-align:left;width:32px">#</th>' +
      '<th style="padding:6px 8px;text-align:left">Product</th><th style="padding:6px 8px;text-align:center;width:60px">Qty</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div style="text-align:right;font-size:11.5px;color:#64748b;margin-bottom:4px"><b>' + items.length + '</b> item(s) &middot; <b>' + tot + '</b> units</div>';
  }

  /* line & unit counts for the compact challan card, without building the whole table */
  function challanCount(c) {
    var items = [];
    try { items = JSON.parse(c.itemsJson || "[]"); } catch (e) { items = []; }
    if (!items.length && c.items) {
      items = String(c.items).split(",").map(function (t) {
        var m = String(t).match(/[x×](\d+)\s*$/); return { qty: m ? m[1] : 0 };
      });
    }
    return { lines: items.length, units: items.reduce(function (a, i) { return a + (Number(i.qty) || 0); }, 0) };
  }

  /* Billing-detail entry for a received challan. Billed-to picks from the client's saved billing
     names (or add a new one, remembered on the client); bill number + optional date are recorded on
     the challan so a delivered challan can be tied to its invoice for stock tallying. */
  function modalBill(id) {
    var c = (S.data.challans || []).filter(function (x) { return x.id === id; })[0] || {};
    var cl = clientByName(c.customerName) || {};
    var profiles = [];
    try { profiles = JSON.parse(cl.billingJson || "[]"); } catch (e) { profiles = []; }
    var cnt = challanCount(c);
    var curTo = c.billTo || "";
    var profOpts = profiles.map(function (p) {
      var v = p.gstin ? p.name + " - " + p.gstin : p.name;
      return '<option value="' + esc(v) + '"' + (v === curTo ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join("");
    var wantNew = !profiles.length || !curTo;
    return '<h2>Billing detail</h2>' +
      '<p class="sub">' + esc(c.challanNo) + ' &middot; ' + esc(c.customerName || "") + (c.site ? ' &middot; ' + esc(c.site) : "") +
      ' &middot; ' + cnt.lines + ' item' + (cnt.lines > 1 ? 's' : '') + ' / ' + cnt.units + ' units</p>' +
      '<label>Billed to (party name / GSTIN)</label>' +
      '<select id="b_to">' + profOpts +
      '<option value="__new"' + (wantNew ? ' selected' : '') + '>+ New billing name...</option></select>' +
      '<div class="grid2" style="margin-top:6px">' +
      '<div><label>New billing name (if not in the list)</label><input id="b_newname" placeholder="Name on the invoice"/></div>' +
      '<div><label>GSTIN (optional)</label><input id="b_newgst" placeholder="GSTIN"/></div>' +
      '</div>' +
      '<label>Bill number</label><input id="b_no" value="' + esc(c.billNo || "") + '" placeholder="Invoice / bill no."/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="bill-save" data-id="' + esc(id) + '">Save billing</button></div>';
  }

  /* Owner-only PIN reset. It only ever CLEARS a teammate's PIN (pin + pinSet columns); it never
     sets one. After a reset, the app forces that person to choose a fresh PIN the next time they
     sign in (login checks pinSet !== "Y"). No PIN is ever seen or typed by anyone but its owner. */
  function viewTeamPins() {
    ensurePickerCss();
    var team = (S.data.team || []).slice().sort(function (a, b) {
      return String(a.name || "").toLowerCase().localeCompare(String(b.name || "").toLowerCase());
    });
    var h = '<h2>Team PINs</h2>' +
      '<p class="sub">Two ways to hand someone a fresh login. <b>Reset</b> clears their PIN so they pick their own at next sign-in (most secure — nobody ever sees a PIN). ' +
      '<b>Temp PIN</b> sets a starting PIN of the <b>last 4 digits of their own mobile</b> and forces them to change it at first sign-in — handy for onboarding, but guessable, so only the forced change keeps it safe. Either way the person ends up with a private PIN of their own.</p>';
    if (!team.length) return h + '<div class="empty">No team members loaded.</div>';
    team.forEach(function (u) {
      if (!u.name) return;   /* skip blank placeholder rows from the sheet */
      var inactive = String(u.active || "").toUpperCase() === "N";
      var mob = String(u.mobile || "").replace(/\D/g, "");
      var temp = mob.length >= 4 ? mob.slice(-4) : "";
      h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<div style="min-width:0"><h3 style="margin:0">' + esc(u.name) +
        ' <span class="pill ' + (u.role === "admin" ? "teal" : "") + '">' + esc(u.role || "") + '</span>' +
        (inactive ? ' <span class="pill due">inactive</span>' : '') + '</h3>' +
        (u.mobile ? '<div class="meta">' + esc(u.mobile) + (u.office ? ' &middot; ' + esc(u.office) : '') +
          (temp ? ' &middot; temp PIN would be <b>' + esc(temp) + '</b>' : '') + '</div>' : '') + '</div>' +
        (u.id ? '<div style="display:flex;gap:6px;flex:0 0 auto">' +
          (temp ? '<button class="btn sm act-billsend" data-act="tp-temp" data-id="' + esc(u.id) + '">Temp PIN</button>' : '') +
          '<button class="btn sm act-reset" data-act="tp-reset" data-id="' + esc(u.id) + '">Reset PIN</button></div>'
              : '<span class="meta" style="color:#94a3b8">no id — set in sheet</span>') +
        '</div></div>';
    });
    return h;
  }

  function viewChallans() {
    ensurePickerCss();   /* stage-action colours + picker styles must exist on the list view too */
    var list = S.data.challans.slice().reverse();
    /* ONLY sales is owner-scoped; godown must see every challan to dispatch/receipt them. */
    if (S.role === "sales") list = list.filter(function (c) { return isMineClient(c.customerName); });
    var by = function (st) { return list.filter(function (c) { return (c.status || "Draft") === st; }).length; };
    var h = '<div class="cards">' +
      '<div class="stat ' + (by("Draft") ? "alert" : "") + '"><div class="n">' + by("Draft") + '</div><div class="l">Awaiting approval</div></div>' +
      '<div class="stat"><div class="n">' + by("Approved") + '</div><div class="l">Approved, to dispatch</div></div>' +
      '<div class="stat"><div class="n">' + by("Dispatched") + '</div><div class="l">Awaiting receipt</div></div>' +
      '<div class="stat"><div class="n">' + by("Received") + '</div><div class="l">Receipt in</div></div>' +
      '</div>';
    h += '<div class="row">' +
      (S.role === "admin" ? '<button class="btn sm ghost" data-act="oc-new">Enter an old delivery</button>' : "") +
      '<div class="grow"></div><button class="btn" data-act="ch-new">+ New challan</button></div>';
    if (!list.length) h += '<div class="empty">No challans yet.</div>';

    /* One challan's card (compact summary + expandable detail). Factored out so the very same card
       can be dropped under whichever client it belongs to in the grouped layout below. */
    function challanCardHtml(c) {
      var st = c.status || "Draft";
      var cls = st === "Received" ? "Won" : (st === "Draft" ? "due" : "teal");
      var open = !!(S.chExp && S.chExp[c.id]);
      var cnt = challanCount(c);

      /* action buttons stay on the compact card too, so approving many in a row never needs an
         extra tap to expand first. */
      var actions =
        (st === "Draft" && canApprove() ? '<button class="btn sm act-approve" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Approved">Approve</button>' : "") +
        (st === "Approved" && canApprove() ? '<button class="btn sm act-dispatch" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Dispatched">Dispatch</button>' : "") +
        ((st === "Draft" || st === "Approved") && canApprove() ? '<button class="btn sm ghost" data-act="ch-edit" data-id="' + esc(c.id) + '">Edit</button>' : "") +
        (st === "Dispatched" ? '<button class="btn sm act-receipt" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Received">Receipt received</button>' : "") +
        /* Billing on a received challan. Accounts/admin enter it directly here (add or edit), so a
           delivered challan can be tied to its invoice number - the basis for tallying stock later.
           Other roles keep the hand-off ("Send for billing") that puts it in the accounts queue. */
        (st === "Received"
          ? ((S.role === "admin" || S.role === "accounts")
              ? '<button class="btn sm ' + (c.billNo ? 'act-billedit' : 'act-bill') + '" data-act="bill-detail" data-id="' + esc(c.id) + '">' + (c.billNo ? 'Edit bill' : 'Add billing detail') + '</button>'
              : (!c.billStatus ? '<button class="btn sm act-billsend" data-act="bill-send" data-id="' + esc(c.id) + '">Send for billing</button>' : ""))
          : "") +
        '<button class="btn sm ghost" data-act="ch-pdf" data-id="' + esc(c.id) + '">PDF</button>';

      /* two-line compact card, same pattern as the lead/client cards:
         line 1 - challan no + status pills, all action buttons pinned right
         line 2 - client · site · items/units · brand · bill state */
      var out = '<div class="card lc-compact">' +
        '<div class="lc-top"><div class="lc-id"><b>' + esc(c.challanNo) + '</b>' +
        ' <span class="pill ' + cls + '">' + esc(st) + '</span>' +
        (String(c.receiptReceived).toUpperCase() === "Y" ? ' <span class="pill Won">receipt in</span>' : "") +
        '</div>' +
        '<div class="lc-right">' + actions +
        '<button class="btn sm ghost" data-act="ch-exp" data-id="' + esc(c.id) + '">' + (open ? '&#9650;' : '&#9660;') + '</button>' +
        '</div></div>' +
        /* compact summary — always visible */
        '<div class="meta" style="margin-top:2px">' + esc(c.customerName || "") + (c.site ? ' &middot; ' + esc(c.site) : "") +
        (cnt.lines ? ' &middot; <b>' + cnt.lines + '</b> item' + (cnt.lines > 1 ? 's' : '') + ' / <b>' + cnt.units + '</b> units' : "") +
        (c.brand ? ' &middot; ' + esc(c.brand) : "") +
        (c.billNo ? ' &middot; <span class="pill Won">Bill ' + esc(c.billNo) + '</span>' :
          (st === "Received" ? ' &middot; <span class="pill due">not billed</span>' : "")) +
        (function () {   /* v6.9.106: jump straight to this challan's PDF in the Telegram group */
          var tm = String(c.tgMsg || "");
          if (tm.indexOf("/") < 0) return "";
          var chat = tm.split("/")[0], msg = tm.split("/")[1];
          if (chat.indexOf("-100") === 0) chat = chat.slice(4);
          return ' &middot; <a href="https://t.me/c/' + esc(chat) + '/' + esc(msg) + '" target="_blank" rel="noopener" style="color:#0f766e;font-weight:600;text-decoration:none">Telegram &#8599;</a>';
        })() + '</div>';

      if (open) {
        var billLine = (c.billNo ? 'Bill <b>' + esc(c.billNo) + '</b>' + (c.billTo ? ' to ' + esc(c.billTo) : "") :
          (String(c.billStatus) === "Sent for billing" ? '<span style="color:#b45309">With accounts for billing' + (c.billTo ? ' - ' + esc(c.billTo) : "") + '</span>' : ""));
        var freightLine = (c.freight ? 'Freight ' + money(c.freight) + ' (' + esc(c.freightTo || "Client") + ') &middot; ' + esc(c.driver || "no driver") : "");
        var madeLine = 'Created by ' + esc(c.createdBy || "") + (c.approvedBy ? ' &middot; approved by <b>' + esc(c.approvedBy) + '</b>' : "");
        out += '<div class="meta" style="margin-top:4px">' +
          [billLine, freightLine, madeLine].filter(function (x) { return x; }).join('<br>') +
          '</div>' + challanItemsTable(c);
      }

      out += '</div>';
      return out;
    }

    /* Group the whole delivery book top-down: Sales exec -> Client -> that client's challans.
       Admin / accounts see every exec; a sales exec (list already filtered) sees only their own
       clients, so their view is simply their clients each with its challans. A client whose owner
       is blank falls under "Unassigned", pinned to the bottom so it reads as a to-do. */
    var groups = {}, execOrder = [];
    list.forEach(function (c) {
      var cl = clientByName(c.customerName) || {};
      var exec = String(cl.ownedBy || cl.createdBy || "").trim() || "Unassigned";
      var clientName = c.customerName || "(no client)";
      if (!groups[exec]) { groups[exec] = { clients: {}, clientOrder: [], n: 0 }; execOrder.push(exec); }
      var g = groups[exec];
      if (!g.clients[clientName]) { g.clients[clientName] = []; g.clientOrder.push(clientName); }
      g.clients[clientName].push(c);
      g.n++;
    });
    execOrder.sort(function (a, b) {
      if (a === "Unassigned") return 1; if (b === "Unassigned") return -1;
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    });
    execOrder.forEach(function (exec) {
      var g = groups[exec];
      g.clientOrder.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
      /* the exec band only earns its space when more than one exec is on screen (i.e. admin/accounts);
         for a single sales exec it would just repeat their own name over and over. */
      if (seesAllClients()) {
        h += '<div class="ch-exec">' + esc(exec) +
          '<span class="sub">' + g.clientOrder.length + ' client' + (g.clientOrder.length > 1 ? 's' : '') +
          ' &middot; ' + g.n + ' challan' + (g.n > 1 ? 's' : '') + '</span></div>';
      }
      g.clientOrder.forEach(function (clientName) {
        var chs = g.clients[clientName];
        h += '<div class="ch-client">' + esc(clientName) +
          '<span class="sub">' + chs.length + ' challan' + (chs.length > 1 ? 's' : '') + '</span></div>';
        chs.forEach(function (c) { h += challanCardHtml(c); });
      });
    });
    return h;
  }

  /* ---------------- INCENTIVE ENGINE ----------------
     Settled rules, applied literally:
       - GST is a flat 18%, so the base is always amount / 1.18
       - Incentive is on NET BILLED, ex-GST (after the client discount)
       - It becomes PAYABLE only as the client actually pays
       - Sales incentive is a flat % of their own sales
     Nothing here is visible to anyone but a partner. The server never sends it. */
  var GST_DIV = 1.18;

  function exGst(n) { return (Number(n) || 0) / GST_DIV; }

  /* Value a registered sales return at the client's NET price (list price of each returned
     product, less that client's brand discount) so its incentive can be reversed on the same
     basis the sale earned it. Return items store only code + qty, so the brand and list price
     come from the product catalogue. */
  function returnLines(r) {
    var items = []; try { items = JSON.parse(r.itemsJson || "[]"); } catch (e) { items = []; }
    var cl = r.customerName;
    return items.map(function (it) {
      var p = PRODUCTS.filter(function (pp) { return pp.code === it.code; })[0] || {};
      var brand = it.brand || realBrand(p) || p.brand || "";
      var disc = clientDiscount(cl, brand);
      var netRate = Math.round((Number(p.price) || 0) * (1 - disc / 100));
      var qty = Number(it.qty) || 0;
      return { brand: brand, qty: qty, amt: qty * netRate };
    });
  }

  function partnerBook(name) {
    var nm = String(name).trim().toLowerCase();
    /* A partner earns on every client he is named on (as plumber / architect / builder / PMC),
       at the rate set for THAT client and THAT brand - line by line, because one challan can
       carry more than one brand. Incentive is paid ONLY where an explicit client-&-brand rate is
       set (owner's decision: explicit-only, no default fallback). A registered sales RETURN
       reverses the incentive on the returned goods at the same client/brand/role rate. Only
       challans whose material receipt is in count as business. */
    var myClients = (S.data.clients || []).filter(function (cl) { return clientRolesOf(cl, nm).length; });
    var billed = 0, earned = 0, returned = 0, reversed = 0, rows = [], clientNames = {};
    var rateCB = function (roles, clName, br) {
      var rate = 0; roles.forEach(function (role) { var r = incRate(clName, br, role); if (r > rate) rate = r; }); return rate;
    };
    myClients.forEach(function (cl) {
      var roles = clientRolesOf(cl, nm), clLower = String(cl.name).trim().toLowerCase();
      var chs = S.data.challans.filter(function (c) {
        return String(c.customerName || "").trim().toLowerCase() === clLower &&
               String(c.receiptReceived).toUpperCase() === "Y";
      });
      chs.forEach(function (c) {
        var base = 0, inc = 0;
        pricedLines(c, c.customerName).forEach(function (x) {
          base += x.amt;
          inc += x.amt * rateCB(roles, cl.name, x.brand || c.brand || "") / 100;
        });
        billed += base; earned += inc; clientNames[c.customerName] = 1;
        rows.push({ no: c.challanNo, client: c.customerName, site: c.site, brand: c.brand,
          amount: base, base: base, pct: base > 0 ? (inc / base * 100) : 0, inc: inc });
      });
      /* reverse incentive only once a return is BOOKED IN at the godown (status "Received") —
         symmetric with a sale, which counts only when its material receipt is in. A return that
         is merely raised or in transit does not reverse anything yet. */
      (S.data.returns || []).filter(function (r) {
        return String(r.customerName || "").trim().toLowerCase() === clLower &&
               String(r.status || "").trim().toLowerCase() === "received";
      }).forEach(function (r) {
        returnLines(r).forEach(function (x) {
          var rev = x.amt * rateCB(roles, cl.name, x.brand) / 100;
          returned += x.amt; reversed += rev; earned -= rev;
        });
      });
    });
    /* payable follows the money in, not the invoice out */
    var collected = S.data.payments.filter(function (p) { return clientNames[p.client]; })
      .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    var ratio = billed > 0 ? Math.min(1, collected / billed) : 0;
    var payable = earned * ratio;
    var paid = S.data.commpay.filter(function (p) { return String(p.associate).toLowerCase() === nm; })
      .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    var sites = S.data.sites.filter(function (st) {
      return [st.architect, st.plumber, st.builder].some(function (x) { return String(x || "").toLowerCase() === nm; });
    });
    return { rows: rows, billed: billed, earned: earned, returned: returned, reversed: reversed,
      collected: collected, ratio: ratio, payable: payable, paid: paid, pending: payable - paid, sites: sites };
  }

  function viewIncentives() {
    if (S.partner) return viewPartnerCard(S.partner);
    var partners = S.data.associates.slice();
    var tot = { earned: 0, payable: 0, paid: 0, pending: 0 };
    var books = {};
    partners.forEach(function (a) {
      var b = partnerBook(a.name); books[a.name] = b;
      tot.earned += b.earned; tot.payable += b.payable; tot.paid += b.paid; tot.pending += b.pending;
    });
    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + money(tot.earned) + '</div><div class="l">Incentive earned (ex-GST)</div></div>' +
      '<div class="stat"><div class="n">' + money(tot.payable) + '</div><div class="l">Payable (money collected)</div></div>' +
      '<div class="stat"><div class="n">' + money(tot.paid) + '</div><div class="l">Paid out</div></div>' +
      '<div class="stat ' + (tot.pending > 0 ? "alert" : "") + '"><div class="n">' + money(tot.pending) + '</div><div class="l">Still to pay</div></div>' +
      '</div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Incentive = net sale (post-discount, ex-GST) \u00d7 the rate set for that <b>client &amp; brand</b> on the discount screen, paid to whoever is that client\u2019s plumber / architect / builder / PMC. It only becomes <b>payable as the client pays</b>, and a challan counts only once its material receipt is in.</div>';
    var cold = coldPartners();
    if (cold.length) {
      h += '<div class="card" style="border-color:#fdba74;background:#fff7ed"><h3>Stay in touch <span class="pill soon">' + cold.length + '</span></h3>' +
        '<div class="meta">No challan, visit or payout logged with these partners for ' + COLD_PARTNER + '+ days. A quick call keeps the pipeline warm.</div>';
      cold.slice(0, 12).forEach(function (x) {
        h += '<div class="acts" style="align-items:center;margin-top:8px"><div class="grow"><b>' + esc(x.a.name) + '</b> <span style="color:#94a3b8;font-size:11px">' + esc(x.a.role || "") + '</span>' +
          '<br><span style="font-size:11px;color:#64748b">quiet ' + x.days + 'd</span></div>' +
          (x.a.mobile ? '<a class="btn sm ghost" href="tel:' + esc(x.a.mobile) + '">Call</a>' : "") + '</div>';
      });
      h += '</div>';
    }
    var roles = ["Plumber", "Architect", "Builder", "PMC", "Contractor", "Dealer", "Other"];
    h += '<div class="row">' + roles.map(function (r) {
      return '<button class="btn sm ' + (S.pRole === r ? "" : "ghost") + '" data-act="p-role" data-r="' + esc(r) + '">' + esc(r) + '</button>';
    }).join("") + '<button class="btn sm ' + (S.pRole ? "ghost" : "") + '" data-act="p-role" data-r="">All</button>' +
      '<div class="grow"></div><button class="btn" data-act="as-new">+ New partner</button></div>';

    /* Leaderboard: rank partners by whichever metric matters right now. */
    var metric = S.pSort || "billed";
    var mLabel = { billed: "Business driven", earned: "Incentive earned", pending: "Still to pay" };
    h += '<div class="row"><span style="font-size:12px;color:#64748b;align-self:center;margin-right:2px">Rank by:</span>' +
      ["billed", "earned", "pending"].map(function (k) {
        return '<button class="btn sm ' + (metric === k ? "" : "ghost") + '" data-act="p-sort" data-k="' + k + '">' + mLabel[k] + '</button>';
      }).join("") + '</div>';

    var list = partners.filter(function (a) { return !S.pRole || a.role === S.pRole; })
      .sort(function (a, b) { return (Number(books[b.name][metric]) || 0) - (Number(books[a.name][metric]) || 0); });
    if (!list.length) h += '<div class="empty">No partners here yet.</div>';
    list.forEach(function (a, idx) {
      var b = books[a.name];
      var medal = idx === 0 ? "#1" : (idx === 1 ? "#2" : (idx === 2 ? "#3" : "#" + (idx + 1)));
      h += '<div class="card"><h3><span class="pill ' + (idx < 3 ? "teal" : "") + '">' + medal + '</span> ' + esc(a.name) +
        ' <span class="pill">' + esc(a.role || "") + '</span>' +
        (b.pending > 0 ? ' <span class="pill due">' + money(b.pending) + ' pending</span>' : ' <span class="pill Won">settled</span>') + '</h3>' +
        '<div class="meta"><b>Drove ' + money(b.billed) + '</b> &middot; ' + b.sites.length + ' site(s) &middot; ' + b.rows.length + ' challan(s)' +
        '<br>Earned ' + money(b.earned) + ' &middot; payable ' + money(b.payable) + ' &middot; paid ' + money(b.paid) + '</div>' +
        '<div class="acts"><button class="btn sm" data-act="p-open" data-n="' + esc(a.name) + '">Open</button>' +
        '<button class="btn sm ghost" data-act="as-open" data-id="' + esc(a.id) + '">Edit</button></div></div>';
    });
    return h;
  }

  function viewPartnerCard(name) {
    var b = partnerBook(name);
    var a = S.data.associates.filter(function (x) { return x.name === name; })[0] || {};
    var h = '<div class="row"><button class="btn sm ghost" data-act="p-back">Back to partners</button></div>';
    h += '<div class="cards">' +
      '<div class="stat"><div class="n">' + b.sites.length + '</div><div class="l">Ongoing sites</div></div>' +
      '<div class="stat"><div class="n">' + money(b.earned) + '</div><div class="l">Incentive earned</div></div>' +
      '<div class="stat"><div class="n">' + money(b.paid) + '</div><div class="l">Paid</div></div>' +
      '<div class="stat ' + (b.pending > 0 ? "alert" : "") + '"><div class="n">' + money(b.pending) + '</div><div class="l">Pending</div></div>' +
      '</div>';
    h += '<div class="card"><h3>' + esc(name) + ' <span class="pill">' + esc(a.role || "") + '</span></h3>' +
      '<div class="meta">' + (a.mobile ? esc(a.mobile) + '<br>' : "") +
      'Billed ' + money(b.billed) + ' &middot; collected ' + money(b.collected) +
      ' (' + Math.round(b.ratio * 100) + '% in)' +
      (b.reversed > 0 ? '<br><span style="color:#dc2626">Returns: ' + money(b.returned) + ' came back &middot; ' + money(b.reversed) + ' incentive reversed</span>' : "") +
      '<br><i>Incentive becomes payable only in proportion to what the client has actually paid. Sales returns reverse the incentive on the returned goods.</i></div>' +
      '<div class="acts"><button class="btn sm" data-act="pay-out" data-n="' + esc(name) + '">Record payout</button></div></div>';

    h += '<h3 style="margin:20px 0 10px;font-size:15px">Ongoing sites</h3>';
    if (!b.sites.length) h += '<div class="empty">No sites linked to this partner.</div>';
    b.sites.forEach(function (st) {
      h += '<div class="card"><h3>' + esc(st.name) + ' <span class="pill teal">' + esc(st.stage || "-") + '</span></h3>' +
        '<div class="meta">' + esc(st.client || "") + '</div></div>';
    });

    h += '<h3 style="margin:20px 0 10px;font-size:15px">Challans &amp; incentive</h3>';
    if (!b.rows.length) h += '<div class="empty">No delivered challans yet for this partner.</div>';
    b.rows.forEach(function (r) {
      h += '<div class="card"><h3>' + esc(r.no) + ' <span class="pill teal">' + money(r.inc) + '</span></h3>' +
        '<div class="meta">' + esc(r.client) + (r.site ? ' &middot; ' + esc(r.site) : "") +
        '<br>' + esc(r.brand || "-") + ' &middot; billed ' + money(r.amount) +
        '<br>ex-GST ' + money(r.base) + ' \u00d7 ' + r.pct + '% = <b>' + money(r.inc) + '</b></div></div>';
    });

    h += '<h3 style="margin:20px 0 10px;font-size:15px">Payouts</h3>';
    var outs = S.data.commpay.filter(function (p) { return p.associate === name; });
    if (!outs.length) h += '<div class="empty">Nothing paid out yet.</div>';
    outs.forEach(function (p) {
      h += '<div class="card"><div class="meta">' + esc(dstr(p.date)) + ' &middot; ' + money(p.amount) +
        (p.mode ? ' &middot; ' + esc(p.mode) : "") + ' &middot; by ' + esc(p.createdBy || "") + '</div></div>';
    });
    return h;
  }

  function modalPayout(name) {
    var b = partnerBook(name);
    return '<h2>Record incentive payout</h2><p class="sub">' + esc(name) + '</p>' +
      '<div class="card"><div class="meta">Pending: <b>' + money(b.pending) + '</b><br>Earned ' + money(b.earned) +
      ', payable ' + money(b.payable) + ', already paid ' + money(b.paid) + '</div></div>' +
      '<label>Amount</label><input id="po_amt" inputmode="numeric" value="' + Math.round(b.pending > 0 ? b.pending : 0) + '"/>' +
      '<div class="grid2"><div><label>Date</label><input id="po_date" type="date" value="' + today() + '"/></div>' +
      '<div><label>Mode</label><select id="po_mode">' + opts(["Cash", "Bank transfer", "Cheque", "UPI", "Adjustment"], "Bank transfer") + '</select></div></div>' +
      '<label>Notes</label><input id="po_note"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="po-save" data-n="' + esc(name) + '">Save payout</button></div>';
  }

  /* ---------------- client discounts (sales may set these) ---------------- */
  function viewDiscounts() {
    var cl = S.q;
    var h = '<div class="row"><input class="grow" id="q" placeholder="Type a client to set their brand discounts..." list="dclients" value="' + esc(S.q) + '"/></div>' +
      '<datalist id="dclients">' + S.data.clients.map(function (c) { return '<option value="' + esc(c.name) + '"></option>'; }).join("") + '</datalist>';
    if (!cl) {
      /* one client per card, and under the name a brand-wise line for the discount and for
         EACH partner role that has an incentive on at least one brand. A role with no incentive
         anywhere is not shown at all. */
      var agg = {};
      (S.data.discounts || []).forEach(function (d) {
        var s = agg[d.client] = agg[d.client] || { disc: [], plumber: [], architect: [], pmc: [], builder: [] };
        if (Number(d.pct) > 0) s.disc.push({ brand: d.brand, pct: d.pct });
        var im = incMap(d);
        ["plumber", "architect", "pmc", "builder"].forEach(function (role) {
          var v = Number(im[role]) || 0;
          if (v > 0) s[role].push({ brand: d.brand, pct: v });
        });
      });
      var names = Object.keys(agg).filter(function (n) {
        var s = agg[n]; return s.disc.length || s.plumber.length || s.architect.length || s.pmc.length || s.builder.length;
      }).sort();
      h += '<div class="empty" style="text-align:left;padding:0 0 10px">Type a client above to set discounts, or tap one below to edit. Discounts feed the quote builder, each new challan and the billing screen. <b>Admin only</b>; edits apply to future challans, not past ones.</div>';
      h += '<div class="card" style="border-color:#fde68a;background:#fffbeb;padding:10px 12px"><div class="meta" style="font-size:11px;color:#92400e">🔒 Incentive figures are admin-only inside the app — but they also live in the CRM Google Sheet. Keep that sheet shared with as few Google accounts as possible (ideally just you) so partner rates stay private there too. Staff should work through the app, not the sheet.</div></div>';
      if (!names.length) return h + '<div class="empty">No client discounts set yet. Type a client above to set the first one.</div>';
      h += '<h3 style="margin:6px 0 8px;font-size:14px">Clients with a discount / incentive set (' + names.length + ')</h3>';
      var fmtBW = function (arr) { return arr.map(function (x) { return esc(x.brand) + ' <b>' + esc(x.pct) + '%</b>'; }).join('  &middot;  '); };
      names.forEach(function (n) {
        var c = clientByName(n) || {}, s = agg[n], lines = [];
        if (s.disc.length) lines.push('<span style="color:#334155">Brand discount:</span> ' + fmtBW(s.disc));
        [["plumber", "Plumber", c.plumber], ["architect", "Architect", c.architect], ["pmc", "PMC", c.pmc], ["builder", "Builder", c.builder]].forEach(function (rm) {
          if (s[rm[0]].length) lines.push('<span style="color:#0d9488">' + rm[1] + (rm[2] ? ' (' + esc(rm[2]) + ')' : '') + ' incentive:</span> ' + fmtBW(s[rm[0]]));
        });
        h += '<div class="card"><h3>' + esc(n) + (c.location ? ' <span class="pill teal">' + esc(c.location) + '</span>' : '') + '</h3>' +
          '<div class="meta">' + lines.join('<br>') + '</div>' +
          '<div class="acts"><button class="btn sm ghost" data-act="disc-edit" data-n="' + esc(n) + '">Edit</button></div></div>';
      });
      return h;
    }
    var brands = brandList();
    var cObj = clientByName(cl) || {};
    var ROLE_LABEL = { plumber: "Plumber", architect: "Architect", builder: "Builder", pmc: "PMC" };
    var anyPartner = ["plumber", "architect", "builder", "pmc"].some(function (r) { return String(cObj[r] || "").trim(); });
    h += '<div class="row"><button class="btn sm ghost" data-act="disc-back">&larr; All discount clients</button></div>' +
      '<div class="empty" style="text-align:left;padding:6px 0 10px">Brand-wise discount for <b>' + esc(cl) + '</b>. Used by the quote builder, new challans and the billing screen.' +
      (anyPartner
        ? ' Below each discount, set the incentive % for this client’s partner(s) on that brand — each earns on the net (post-discount) sale.'
        : ' <span style="color:#94a3b8">No plumber / architect / builder / PMC is linked to this client, so there is no incentive to set. Add one on the client’s record to set partner incentives here.</span>') +
      '<br><span style="color:#0f766e;font-weight:600">Fill in every brand you need, then tap <b>Save &amp; back</b> — nothing is saved until you do.</span>' +
      '</div>';
    brands.forEach(function (b) {
      var d = discRow(cl, b);
      var im = incMap(d);
      var incRows = "";
      ["plumber", "architect", "builder", "pmc"].forEach(function (role) {
        var pn = String(cObj[role] || "").trim();
        if (!pn) return;
        var rv = (im[role] != null && im[role] !== "") ? im[role] : "";
        incRows += '<div class="acts" style="align-items:center;margin-top:6px">' +
          '<span class="grow" style="font-size:12px;color:#0d9488">' + esc(ROLE_LABEL[role]) + ' incentive <span style="color:#94a3b8">(' + esc(pn) + ')</span></span>' +
          '<input class="incp" data-client="' + esc(cl) + '" data-brand="' + esc(b) + '" data-role="' + role + '" data-id="' + esc(d ? d.id : "") + '" inputmode="decimal" value="' + esc(rv) + '" placeholder="0" style="width:78px;padding:7px 10px"/>' +
          '<span class="pill">%</span></div>';
      });
      /* incentive load = the sum of every assigned partner's rate on this brand (each earns on
         the net). Shown so the combined giveaway is visible at the moment you set the rates. */
      var pf = function (x) { return (Math.round(x * 100) / 100) + "%"; };
      var totInc = ["plumber", "architect", "builder", "pmc"].reduce(function (a, role) {
        return a + ((String(cObj[role] || "").trim() && Number(im[role])) || 0);
      }, 0);
      var dPct = Number(d && d.pct) || 0;
      var loadLine = totInc > 0
        ? '<div class="meta" style="margin-top:8px;font-size:11px;color:#64748b;border-top:1px solid #eef2f7;padding-top:6px">Incentive load: <b style="color:#b45309">' + pf(totInc) + ' of net</b>' + (dPct ? ' &middot; ≈ ' + pf(totInc * (1 - dPct / 100)) + ' of list, on top of the ' + pf(dPct) + ' discount' : "") + '</div>'
        : "";
      h += '<div class="card"><h3>' + esc(b) + (d && Number(d.pct) ? ' <span class="pill teal">' + esc(d.pct) + '%</span>' : ' <span class="pill">not set</span>') + '</h3>' +
        '<div class="acts" style="align-items:center">' +
        '<span class="grow" style="font-size:12px;color:#334155">Brand discount</span>' +
        '<input class="dsc" data-client="' + esc(cl) + '" data-brand="' + esc(b) + '" data-id="' + esc(d ? d.id : "") + '" inputmode="decimal" value="' + esc(d ? d.pct : "") + '" placeholder="0" style="width:78px;padding:7px 10px"/>' +
        '<span class="pill">% off list</span></div>' +
        incRows +
        loadLine +
        '</div>';
    });
    /* Explicit, DEFERRED Save. Typing in a discount / incentive box writes nothing; this button is
       the only thing that commits — it reads every box on the screen and saves them in one pass,
       then returns to the client list. "Back" leaves without saving (discards unsaved edits). */
    h += '<div class="acts" style="position:sticky;bottom:0;background:#fff;padding:12px 0 14px;border-top:1px solid #e2e8f0;margin-top:10px;z-index:5">' +
      '<button class="btn" data-act="disc-saveall">&#10003; Save &amp; back</button>' +
      '<button class="btn ghost" data-act="disc-back">Back (don\'t save)</button></div>';
    return h;
  }

  /* ---------- BILLING (admin / accounts) ----------
     After a challan's receipt is confirmed it can be billed. This prices every received challan for
     a client from the discount FROZEN on each line at creation: Qty · Rate · Disc% · discounted rate
     · amount, a per-challan total, a grand total, and an optional 18% GST. Admin can override a
     line's Disc% here for the rare product-wise case (it re-saves onto that challan). */
  function pricedLines(c, cl) {
    var items = []; try { items = JSON.parse(c.itemsJson || "[]"); } catch (e) { items = []; }
    var priced = items.map(function (i) {
      var rate = Number(i.rate) || 0, qty = Number(i.qty) || 0;
      var bBrand = i.brand || realBrand((PRODUCTS.filter(function (p) { return p.code === i.code; })[0]) || {}) || c.brand || "";
      var disc = (i.disc != null && i.disc !== "") ? Number(i.disc) : clientDiscount(cl, bBrand);
      var dr = Math.round(rate * (1 - disc / 100));
      return { desc: i.desc || i.code || "", code: i.code, brand: bBrand, qty: qty, rate: rate, disc: disc, dr: dr, amt: qty * dr };
    });
    priced.sort(function (a, b) { return (b.disc || 0) - (a.disc || 0); });
    return priced;
  }
  /* Distinct customer names that actually have a received challan (these are the billable clients). */
  function hisabClientNames() {
    var seen = {}, out = [];
    (S.data.challans || []).forEach(function (c) {
      if (String(c.receiptReceived).toUpperCase() === "Y" && c.customerName && !seen[c.customerName]) {
        seen[c.customerName] = 1; out.push(c.customerName);
      }
    });
    return out.sort();
  }
  /* Resolve a typed name to a real billable client name: exact (case/space-tolerant) first,
     then a unique partial match, so "atul" finds "Atul Garg / Hukam Chand Garg". "" if none/ambiguous. */
  function hisabResolve(typed) {
    var q = String(typed || "").trim().toLowerCase();
    if (!q) return "";
    var names = hisabClientNames();
    var exact = names.filter(function (n) { return n.trim().toLowerCase() === q; });
    if (exact.length) return exact[0];
    var part = names.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; });
    return part.length === 1 ? part[0] : "";
  }
  /* Freight the CLIENT is billed for on a challan (company-borne freight is not the client's cost). */
  function chFreight(c) { return String(c.freightTo) === "Client" ? (Number(c.freight) || 0) : 0; }
  /* Net (post-discount, ex-GST) goods value of a challan - the basis for dues and incentive.
     Freight is NOT part of it (freight is a pass-through cost, not a sale). */
  function challanNet(c) { return pricedLines(c, c.customerName).reduce(function (s, x) { return s + x.amt; }, 0); }
  /* Every billable client with a net outstanding balance (net billed incl. client freight, minus
     payments received), tagged with the sales executive who owns the client. */
  function hisabOutstanding() {
    return hisabClientNames().map(function (nm) {
      var chs = (S.data.challans || []).filter(function (c) { return c.customerName === nm && String(c.receiptReceived).toUpperCase() === "Y"; });
      var net = chs.reduce(function (a, c) { return a + pricedLines(c, nm).reduce(function (s, x) { return s + x.amt; }, 0) + chFreight(c); }, 0);
      var paid = clientLedger(nm).paid, cl = clientByName(nm) || {};
      var opening = Number(cl.openingAmt) || 0;
      /* No explicit sales-exec set yet -> falls to whoever entered the client. Billed includes
         any old balance brought forward, so Billed - Received = Outstanding stays consistent. */
      return { name: nm, owner: cl.ownedBy || cl.createdBy || "", net: net + opening, paid: paid, due: net + opening - paid };
    }).filter(function (r) { return r.due > 0.5; });
  }
  function viewBilling() {
    if (!S.billSel) S.billSel = {};
    var cl = hisabResolve(S.q);
    var billNames = hisabClientNames();
    if (!seesAllClients()) billNames = billNames.filter(function (n) { return isMineClient(n); });
    var h = '<div class="row"><input class="grow" id="q" placeholder="Type a client to bill (then Enter)..." list="billclients" value="' + esc(S.q) + '"/><button class="btn" data-act="bill-go">Show</button></div>' +
      '<datalist id="billclients">' + billNames.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>';
    if (cl && !isMineClient(cl)) return h + '<div class="empty"><b>' + esc(cl) + '</b> is assigned to another sales executive, so their hisab is not open to you. You can view and follow up on the clients assigned to you.</div>';
    if (!S.q) {
      var outs = hisabOutstanding();
      if (!seesAllClients()) outs = outs.filter(function (r) { return isMineClient(r.name); });
      if (!outs.length) return h + '<div class="empty">No outstanding balances &mdash; every received challan is fully paid. Type a client above to view their hisab.</div>';
      var groups = {};
      outs.forEach(function (r) { var k = r.owner || "Unassigned"; (groups[k] = groups[k] || []).push(r); });
      var gtot = function (k) { return groups[k].reduce(function (s, r) { return s + r.due; }, 0); };
      var gkeys = Object.keys(groups).sort(function (a, b) { return gtot(b) - gtot(a); });
      var totalDue = outs.reduce(function (a, r) { return a + r.due; }, 0);
      var oh = '<div class="card" style="border-color:#fecaca;background:#fef2f2"><h3>Outstanding &mdash; ' + money(totalDue) + ' across ' + outs.length + ' client(s)</h3>' +
        '<div class="meta" style="font-size:13px">Grouped by sales executive &middot; net of pre-set discounts. Tap a client to open their hisab.</div></div>';
      gkeys.forEach(function (k) {
        var rows = groups[k].slice().sort(function (a, b) { return b.due - a.due; });
        oh += '<div class="card"><h3>' + esc(k) + ' <span class="pill due">' + money(gtot(k)) + '</span> <span style="font-weight:400;color:#94a3b8;font-size:12.5px">' + rows.length + ' client(s)</span></h3>' +
          '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f1f5f9;color:#475569"><th style="padding:6px 8px;text-align:left">Client</th>' +
          '<th style="padding:6px 8px;text-align:right">Billed (net)</th><th style="padding:6px 8px;text-align:right">Received</th>' +
          '<th style="padding:6px 8px;text-align:right">Outstanding</th></tr></thead><tbody>' +
          rows.map(function (r, i) {
            return '<tr style="border-bottom:1px solid #eef2f7;cursor:pointer;background:' + (i % 2 ? '#f8fafc' : '#fff') + '" data-act="bill-open" data-n="' + esc(r.name) + '">' +
              '<td style="padding:7px 8px;font-weight:600;color:#0d766c">' + esc(r.name) + '</td>' +
              '<td style="padding:7px 8px;text-align:right;color:#64748b">' + money(r.net) + '</td>' +
              '<td style="padding:7px 8px;text-align:right;color:#64748b">' + money(r.paid) + '</td>' +
              '<td style="padding:7px 8px;text-align:right;font-weight:800;color:#dc2626">' + money(r.due) + '</td></tr>';
          }).join("") + '</tbody></table></div></div>';
      });
      return h + oh;
    }
    if (!cl) {
      var guess = billNames.filter(function (n) { return n.toLowerCase().indexOf(String(S.q).trim().toLowerCase()) >= 0; });
      return h + '<div class="empty">No received challans matching <b>' + esc(S.q) + '</b> yet.' +
        (guess.length > 1 ? ' Did you mean: ' + guess.map(function (n) { return '<b>' + esc(n) + '</b>'; }).join(", ") + '?' : ' A challan lands here automatically once its receipt is confirmed.') + '</div>';
    }
    var chs = (S.data.challans || []).filter(function (c) { return c.customerName === cl && String(c.receiptReceived).toUpperCase() === "Y"; })
      .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
    if (!chs.length) return h + '<div class="empty">No received challans for <b>' + esc(cl) + '</b> yet. A challan lands here automatically once its receipt is confirmed.</div>';
    var admin = S.role === "admin";
    var allNet = 0, selNet = 0, selGoods = 0, selCount = 0;
    chs.forEach(function (c) {
      var sel = S.billSel[c.id] !== false;
      var priced = pricedLines(c, cl);
      var sub = priced.reduce(function (a, x) { return a + x.amt; }, 0);
      var frt = chFreight(c), chTotal = sub + frt;
      allNet += chTotal; if (sel) { selNet += chTotal; selGoods += sub; selCount++; }
      var rows = priced.map(function (x, idx) {
        var disc = x.disc;
        var discCell = admin
          ? '<input class="bdsc" data-ch="' + esc(c.id) + '" data-code="' + esc(x.code) + '" inputmode="decimal" value="' + (disc > 0 ? esc(disc) : "") + '" placeholder="0" style="width:48px;text-align:center;padding:4px;border:1px solid #cbd5e1;border-radius:5px"/>'
          : (disc > 0 ? disc + '%' : '');
        return '<tr style="border-bottom:1px solid #e2e8f0;background:' + (idx % 2 ? '#f8fafc' : '#fff') + '">' +
          '<td style="padding:5px 6px;color:#64748b">' + (idx + 1) + '</td>' +
          '<td style="padding:5px 6px">' + esc(x.desc) + '</td>' +
          '<td style="padding:5px 6px;text-align:center">' + x.qty + '</td>' +
          '<td style="padding:5px 6px;text-align:right;color:#94a3b8">' + (disc > 0 ? money(x.rate) : '') + '</td>' +
          '<td style="padding:5px 6px;text-align:center">' + discCell + '</td>' +
          '<td style="padding:5px 6px;text-align:right;font-weight:600">' + money(x.dr) + '</td>' +
          '<td style="padding:5px 6px;text-align:right;font-weight:700">' + money(x.amt) + '</td></tr>';
      }).join("");
      h += '<div class="card" style="' + (sel ? '' : 'opacity:.5') + '"><h3>' +
        '<label style="cursor:pointer;font-size:15px"><input type="checkbox" class="billsel" data-ch="' + esc(c.id) + '"' + (sel ? ' checked' : '') + ' style="vertical-align:middle;margin-right:7px;transform:scale(1.25)"/>' + esc(c.challanNo) + '</label> <span class="pill teal">' + esc(dstr(c.createdAt)) + '</span>' +
        (c.billNo ? ' <span class="pill Won">billed ' + esc(c.billNo) + '</span>' : '') + '</h3>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0">' +
        '<thead><tr style="background:#0b3b36;color:#fff">' +
        '<th style="padding:6px;text-align:left;width:26px">#</th><th style="padding:6px;text-align:left">Product</th>' +
        '<th style="padding:6px;text-align:center;width:40px">Qty</th><th style="padding:6px;text-align:right;width:66px">Rate</th>' +
        '<th style="padding:6px;text-align:center;width:56px">Disc%</th><th style="padding:6px;text-align:right;width:72px">Net rate</th>' +
        '<th style="padding:6px;text-align:right;width:82px">Amount</th></tr></thead><tbody>' + rows +
        (frt > 0 ? '<tr style="background:#fffbeb;border-top:1px dashed #e2e8f0"><td colspan="6" style="padding:5px 6px;text-align:right;color:#92400e">Freight' + (c.driver ? ' (' + esc(c.driver) + ')' : '') + '</td><td style="padding:5px 6px;text-align:right;font-weight:700;color:#92400e">' + money(frt) + '</td></tr>' : '') +
        '</tbody>' +
        '<tfoot><tr style="background:#f1f5f9"><td colspan="6" style="padding:6px;text-align:right;font-weight:700">Challan total</td>' +
        '<td style="padding:6px;text-align:right;font-weight:800">' + money(chTotal) + '</td></tr></tfoot></table></div></div>';
    });
    var _led = clientLedger(cl), paid = _led.paid, opening = _led.opening || 0, bal = opening + allNet - paid;
    var gst = S.billGst ? Math.round(selNet * 0.18) : 0;
    h += '<div class="card" style="border-color:#99f6e4;background:#f0fdfa">' +
      '<h3>Client ledger &mdash; ' + esc(cl) + '</h3>' +
      '<div class="meta" style="font-size:13.5px">' +
      (opening > 0 ? 'Previous balance (b/f): <b>' + money(opening) + '</b>  &middot;  ' : '') +
      'Billed (net): <b>' + money(allNet) + '</b>  &middot;  Received: <b>' + money(paid) + '</b>  &middot;  Balance due: <b style="color:' + (bal > 0 ? '#dc2626' : '#0d9488') + '">' + money(bal) + '</b></div>' +
      '<div style="margin-top:8px;font-size:14px">Statement: <b>' + selCount + '</b> of ' + chs.length + ' challan(s) ticked &mdash; <b>' + money(selNet) + '</b>' + (S.billGst ? ' + GST ' + money(gst) + ' = <b>' + money(selNet + gst) + '</b>' : '') + '</div>' +
      '<div class="acts" style="flex-wrap:wrap;gap:8px;margin-top:10px">' +
      '<button class="btn sm ' + (S.billGst ? '' : 'ghost') + '" data-act="bill-gst">' + (S.billGst ? 'GST 18% ✓' : 'Add GST 18%') + '</button>' +
      '<button class="btn sm ghost" data-act="bill-selall" data-v="1">Tick all</button>' +
      '<button class="btn sm ghost" data-act="bill-selall" data-v="0">Untick all</button>' +
      '<div class="grow"></div>' +
      '<button class="btn sm" data-act="bill-wa">WhatsApp statement</button>' +
      '<button class="btn sm ghost" data-act="bill-pdf">Download PDF</button>' +
      '</div></div>';
    return h;
  }

  /* The statement/hisab PDF: header, customer, then each TICKED challan priced out, a statement
     total (+ optional GST), and the running account ledger (billed to date, received, balance). */
  function hisabPdf(cl) {
    var chs = (S.data.challans || []).filter(function (c) { return c.customerName === cl && String(c.receiptReceived).toUpperCase() === "Y"; });
    var sel = chs.filter(function (c) { return S.billSel[c.id] !== false; })
      .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
    var allNet = chs.reduce(function (a, c) { return a + pricedLines(c, cl).reduce(function (s, x) { return s + x.amt; }, 0) + chFreight(c); }, 0);
    /* The statement uses its OWN compact header (not the shared commPdfBase): a shorter band,
       a small un-shouty "STATEMENT" label top-right, then the client's details and date beneath
       it - so the client block need not repeat in the body. No company tagline. */
    /* The statement uses jsPDF's built-in Helvetica and "Rs." - NOT the ~600KB DejaVu Unicode
       font. Embedding that font took several seconds and bloated the file to ~550KB, spiking
       memory enough to reload the tab (which is what signed people out). Helvetica builds the
       statement in a blink at ~30KB. The trade is the rupee symbol shows as "Rs." here. */
    return Promise.resolve().then(function () {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var W = 210, L = 16, R = W - 16, HB = 25;
      var RS = function (n) { return (uni ? "₹" : "Rs.") + Math.round(Number(n) || 0).toLocaleString("en-IN"); };
      var cust = clientByName(cl) || {};
      doc.setFillColor(11, 59, 54); doc.rect(0, 0, W, HB, "F");
      doc.setFillColor(94, 234, 212); doc.rect(0, HB, W, 1.0, "F");
      if (LOGO_B64) { try { doc.addImage(LOGO_B64, "JPEG", L, 6, 26, 13); } catch (e) { } }
      F("bold"); doc.setFontSize(7.4); doc.setTextColor(148, 210, 200);
      doc.text("STATEMENT OF ACCOUNT", R, 7.5, { align: "right" });
      F("bold"); doc.setFontSize(11.5); doc.setTextColor(255, 255, 255);
      doc.text(String(cl), R, 13.6, { align: "right" });
      F("normal"); doc.setFontSize(7.6); doc.setTextColor(172, 212, 205);
      var line2 = [cust.area, cust.location].filter(Boolean).join(", ");
      if (line2) { doc.text(line2, R, 18, { align: "right" }); }
      var l3 = [cust.mobile ? "Mobile: " + cust.mobile : "", "Date: " + fullDate(today())].filter(Boolean).join("    ·    ");
      doc.text(l3, R, 22.2, { align: "right" });
      doc.setTextColor(17, 34, 45);
      var y = HB + 9;
      /* Columns pulled a touch inside the right margin so AMOUNT never rides the page edge. */
      var cA = R - 2, cN = R - 27, cD = R - 49, cR = R - 68, cQ = R - 87;
      var sX = L + 1, pX = L + 7, prodW = cQ - pX - 5;
      var head = function () {
        doc.setFillColor(11, 59, 54); doc.rect(L, y - 3.8, R - L, 5.4, "F");
        doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(6.2);
        doc.text("#", sX, y); doc.text("PRODUCT", pX, y); doc.text("QTY", cQ, y, { align: "right" });
        doc.text("RATE", cR, y, { align: "right" }); doc.text("DISC", cD, y, { align: "right" });
        doc.text("NET", cN, y, { align: "right" }); doc.text("AMOUNT", cA, y, { align: "right" });
        y += 4.8;
      };
      var grand = 0, goodsGrand = 0;
      sel.forEach(function (c) {
        if (y > 262) { doc.addPage(); y = 20; }
        F("bold"); doc.setFontSize(8.6); doc.setTextColor(13, 118, 108);
        doc.text(String(c.challanNo) + "   ·   " + fullDate(c.createdAt), L, y); y += 5;
        head();
        var priced = pricedLines(c, cl), sub = 0;
        priced.forEach(function (x, idx) {
          var lines = doc.splitTextToSize(pdfSafe(x.desc), prodW);
          var nL = Math.min(lines.length, 2), rowH = nL > 1 ? 6.9 : 4.15;
          if (y + rowH > 282) { doc.addPage(); y = 20; head(); }
          if (idx % 2) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 3.2, R - L, rowH, "F"); }
          F("normal"); doc.setFontSize(6.8); doc.setTextColor(17, 34, 45);
          doc.text(String(idx + 1), sX, y);
          for (var li = 0; li < nL; li++) doc.text(lines[li], pX, y + li * 3.3);
          doc.text(String(x.qty), cQ, y, { align: "right" });
          doc.setTextColor(120, 120, 120);
          doc.text(x.disc > 0 ? RS(x.rate) : "-", cR, y, { align: "right" });
          doc.text(x.disc > 0 ? (x.disc + "%") : "-", cD, y, { align: "right" });
          doc.setTextColor(17, 34, 45); doc.text(RS(x.dr), cN, y, { align: "right" });
          F("bold"); doc.text(RS(x.amt), cA, y, { align: "right" }); F("normal");
          y += rowH; sub += x.amt;
        });
        var frt = chFreight(c), chTotal = sub + frt;
        if (frt > 0) {
          if (y + 4.4 > 282) { doc.addPage(); y = 20; head(); }
          F("normal"); doc.setFontSize(6.8); doc.setTextColor(146, 64, 14);
          doc.text("Freight" + (c.driver ? " (" + c.driver + ")" : ""), pX, y);
          doc.text(RS(frt), cA, y, { align: "right" }); y += 4.4;
        }
        grand += chTotal; goodsGrand += sub;
        /* Challan total in a shaded band, text VERTICALLY CENTERED in the band (was sitting at
           the top of the row). */
        var tbY = y - 3.4, tbH = 6.4, tMid = tbY + tbH / 2 + 1.35;
        doc.setFillColor(241, 245, 249); doc.rect(L, tbY, R - L, tbH, "F");
        F("bold"); doc.setFontSize(8.2); doc.setTextColor(17, 34, 45);
        doc.text("Challan total", cN, tMid, { align: "right" }); doc.text(RS(chTotal), cA, tMid, { align: "right" });
        y = tbY + tbH + 3;
      });
      if (!sel.length) { doc.setFontSize(10); doc.setTextColor(120, 120, 120); doc.text("No challans selected.", L, y); y += 6; }
      if (y > 250) { doc.addPage(); y = 20; }
      var gst = S.billGst ? Math.round(grand * 0.18) : 0, paid = clientLedger(cl).paid;
      doc.setDrawColor(13, 118, 108); doc.setLineWidth(0.5); doc.line(L, y - 1, R, y - 1); doc.setLineWidth(0.2); y += 5;
      F("bold"); doc.setFontSize(11); doc.setTextColor(17, 34, 45);
      doc.text("Statement total", cN, y, { align: "right" }); doc.text(RS(grand), cA, y, { align: "right" }); y += 6;
      if (S.billGst) {
        F("normal"); doc.setFontSize(9.5); doc.text("GST @ 18%", cN, y, { align: "right" }); doc.text(RS(gst), cA, y, { align: "right" }); y += 5.5;
        F("bold"); doc.setFontSize(11); doc.text("Total incl. GST", cN, y, { align: "right" }); doc.text(RS(grand + gst), cA, y, { align: "right" }); y += 6;
      }
      var opening = Number((clientByName(cl) || {}).openingAmt) || 0;
      y += 4; F("normal"); doc.setFontSize(9.5); doc.setTextColor(100, 116, 139);
      if (opening > 0) { doc.text("Previous balance (before app): " + RS(opening), L, y); y += 5; }
      doc.text("Account billed to date (net): " + RS(allNet), L, y); y += 5;
      doc.text("Received to date: " + RS(paid), L, y); y += 5;
      F("bold"); doc.setTextColor(17, 34, 45); doc.setFontSize(10.5);
      doc.text("Balance due: " + RS(opening + allNet - paid), L, y); y += 6;

      /* Authorised-distributor strip. The brand logos are drawn from the persistent cache (fetched
         + processed once per device, then reused instantly) - so there is NO live image download
         at export time, which is what used to make the statement slow and reload the tab. Until
         the cache is warm on a device we fall back to brand names as text; meanwhile logosReady()
         warms it in the background for next time. */
      logosReady();
      if (y > 268) { doc.addPage(); y = 20; }
      var slots = PDF_LOGO_ORDER.map(function (n) { return logoFor(n); }).filter(function (s) { return s && s.src; });
      F("bold"); doc.setFontSize(5); doc.setTextColor(120, 130, 140);
      doc.text("AUTHORISED DISTRIBUTOR FOR", L, 277);
      if (slots.length >= 6) {
        var GP = 1.2, BH = 6, y0 = 279, BW = (R - L - GP * (slots.length - 1)) / slots.length;
        slots.forEach(function (lg, i) {
          var bx = L + i * (BW + GP);
          doc.setDrawColor(216, 216, 216); doc.setLineWidth(0.18); doc.rect(bx, y0, BW, BH, "S");
          var sc = Math.min((BW - 1.4) / lg.w, (BH - 1.4) / lg.h);
          var iw = lg.w * sc, ih = lg.h * sc;
          try { doc.addImage(lg.src, "JPEG", bx + (BW - iw) / 2, y0 + (BH - ih) / 2, iw, ih); } catch (e) { }
        });
      } else {
        F("bold"); doc.setFontSize(7.4); doc.setTextColor(90, 100, 110);
        doc.splitTextToSize(PDF_LOGO_ORDER.join("   ·   "), R - L).forEach(function (ln, i) { doc.text(ln, L, 282 + i * 3.6); });
      }
      doc.setFontSize(6.6); doc.setTextColor(150, 163, 175); F("normal");
      doc.text("Energy World  |  Panipat · Sonipat · Karnal    |    Statement of account, not a tax invoice.", L, 291);
      return doc;
    });
  }

  /* ---------------- client payments + ledger ---------------- */
  function clientLedger(client) {
    var chs = S.data.challans.filter(function (c) {
      return c.customerName === client && String(c.receiptReceived).toUpperCase() === "Y";
    });
    var pays = S.data.payments.filter(function (p) { return p.client === client; });
    /* Dues are now on the NET (post-discount) value, matching the HISAB statement. */
    var billed = chs.reduce(function (a, c) { return a + challanNet(c); }, 0);
    var freight = chs.reduce(function (a, c) {
      return a + (String(c.freightTo) === "Client" ? (Number(c.freight) || 0) : 0);
    }, 0);
    var paid = pays.reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    /* Old balance carried in when the client was first entered (money owed before the app). It is
       part of what they owe, so it rides in the dues and the HISAB balance. */
    var opening = Number((clientByName(client) || {}).openingAmt) || 0;
    return { chs: chs, pays: pays, opening: opening, billed: billed, freight: freight, paid: paid, due: opening + billed + freight - paid };
  }

  /* ---------- COLLECTION RADAR ----------
     Money already earned but not yet in the bank. Aged from the LATEST delivered challan
     (when the collection clock started). Buckets 15 / 30 days; a grace of PAY_MIN days keeps
     brand-new deliveries off the chase list. One tap sends a polite WhatsApp reminder with
     the client's ledger PDF attached. */
  var PAY_MIN = 7;
  function payAge(name) {
    var latest = "";
    S.data.challans.forEach(function (c) {
      if (c.customerName === name && String(c.receiptReceived).toUpperCase() === "Y") {
        var d = String(c.createdAt || "").slice(0, 10);
        if (d > latest) latest = d;
      }
    });
    return latest ? -daysTo(latest) : 0;
  }
  function payBucket(days) {
    if (days >= 30) return { label: "Chase now", cls: "due" };
    if (days >= 15) return { label: "Getting old", cls: "soon" };
    return { label: "Watch", cls: "teal" };
  }
  function payReminder(name) {
    var l = clientLedger(name);
    var pcl = clientByName(name) || {};
    var pnum = String(pcl.mobile || "").replace(/\D/g, "");
    if (pnum.length === 10) pnum = "91" + pnum;
    var pmsg = "Dear " + name + ",\n\nGentle reminder from Energy World - an amount of " +
      moneyAscii(l.due) + " is currently outstanding on your account. Your ledger is attached.\n" +
      "Kindly arrange the payment at your convenience. Thank you.\n\nEnergy World";
    waShareDoc(loadLogo().then(function () { return ledgerPdf(name); }),
      name.replace(/[^\w.-]/g, "_") + "_ledger.pdf", pnum, pmsg);
  }

  function viewPayments() {
    var names = {};
    S.data.challans.forEach(function (c) { if (String(c.receiptReceived).toUpperCase() === "Y") names[c.customerName] = 1; });
    var list = Object.keys(names).map(function (n) { return { name: n, l: clientLedger(n), age: payAge(n) }; })
      .sort(function (a, b) { return b.l.due - a.l.due; });
    if (!seesAllClients()) list = list.filter(function (x) { return isMineClient(x.name); });   /* a sales exec sees only the clients assigned to them */
    var totDue = list.reduce(function (a, x) { return a + x.l.due; }, 0);
    var h = '<div class="cards">' +
      '<div class="stat ' + (totDue > 0 ? "alert" : "") + '"><div class="n">' + money(totDue) + '</div><div class="l">Outstanding from clients</div></div>' +
      '<div class="stat"><div class="n">' + list.length + '</div><div class="l">Client ledgers</div></div>' +
      '</div>';

    /* Collection radar: overdue clients bubble to the top, oldest first. */
    var overdue = list.filter(function (x) { return x.l.due > 0 && x.age >= PAY_MIN; })
      .sort(function (a, b) { return b.age - a.age; });
    if (overdue.length) {
      h += '<div class="card" style="border-color:#fca5a5;background:#fef2f2"><h3>Collection radar ' +
        '<span class="pill due">' + overdue.length + ' to chase</span></h3>' +
        '<div class="meta">Billed a while ago, still unpaid. One tap sends a polite WhatsApp reminder with the ledger attached.</div>';
      overdue.forEach(function (x) {
        var bk = payBucket(x.age);
        h += '<div class="acts" style="align-items:center;margin-top:8px"><b>' + esc(x.name) + '</b>' +
          '<span class="pill ' + bk.cls + '">' + money(x.l.due) + ' &middot; ' + x.age + 'd</span>' +
          '<button class="btn sm" data-act="pay-wa" data-n="' + esc(x.name) + '">Remind</button>' +
          '<button class="btn sm ghost" data-act="pay-in" data-n="' + esc(x.name) + '">Payment received</button></div>';
      });
      h += '</div>';
    }

    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Only challans with a <b>signed material receipt</b> enter the ledger. Freight appears here when the client bears it.</div>';
    if (!list.length) return h + '<div class="empty">Nothing delivered yet.</div>';
    list.forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.name) +
        (x.l.due > 0 ? ' <span class="pill due">' + money(x.l.due) + ' due</span>' : ' <span class="pill Won">clear</span>') +
        (x.l.due > 0 && x.age ? ' <span class="pill ' + payBucket(x.age).cls + '">' + x.age + 'd old</span>' : "") + '</h3>' +
        '<div class="meta">' + x.l.chs.length + ' challan(s) &middot; billed ' + money(x.l.billed) +
        (x.l.freight ? ' + freight ' + money(x.l.freight) : "") +
        '<br>Received ' + money(x.l.paid) + '</div>' +
        '<div class="acts"><button class="btn sm" data-act="pay-in" data-n="' + esc(x.name) + '">Payment received</button>' +
        (x.l.due > 0 ? '<button class="btn sm ghost" data-act="pay-wa" data-n="' + esc(x.name) + '">Remind on WhatsApp</button>' : "") +
        '<button class="btn sm ghost" data-act="ledger-pdf" data-n="' + esc(x.name) + '">Ledger PDF</button></div></div>';
    });
    return h;
  }

  function modalPayIn(client) {
    var l = clientLedger(client);
    return '<h2>Payment received</h2><p class="sub">' + esc(client) + '</p>' +
      '<div class="card"><div class="meta">Billed ' + money(l.billed) + (l.freight ? ' + freight ' + money(l.freight) : "") +
      '<br>Received so far ' + money(l.paid) + '<br><b>Due ' + money(l.due) + '</b></div></div>' +
      '<label>Amount received</label><input id="pi_amt" inputmode="numeric" value="' + Math.round(l.due > 0 ? l.due : 0) + '"/>' +
      '<div class="grid2"><div><label>Date</label><input id="pi_date" type="date" value="' + today() + '"/></div>' +
      '<div><label>Mode</label><select id="pi_mode">' + opts(["Cash", "Bank transfer", "Cheque", "UPI"], "Bank transfer") + '</select></div></div>' +
      '<label>Reference (cheque / UTR)</label><input id="pi_ref"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="pi-save" data-n="' + esc(client) + '">Save payment</button></div>';
  }

  function ledgerPdf(client) {
    var l = clientLedger(client);
    return loadFonts().then(function (f) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
        uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var R2 = function (n) { return (uni ? "\u20B9" : "Rs.") + Number(n || 0).toLocaleString("en-IN"); };
      var W = 210, L = 14, Rt = W - 14, y = 0;
      doc.setFillColor(11, 59, 54); doc.rect(0, 0, W, 34, "F");
      doc.setFillColor(94, 234, 212); doc.rect(0, 34, W, 1.2, "F");
      if (LOGO_B64) { try { doc.addImage(LOGO_B64, "JPEG", L, 8, 30, 16); } catch (e) {} }
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(14);
      doc.text("CLIENT LEDGER", Rt, 15, { align: "right" });
      F("normal"); doc.setFontSize(8); doc.setTextColor(160, 205, 199);
      doc.text(client, Rt, 22, { align: "right" });
      doc.text("As on " + today(), Rt, 27, { align: "right" });

      y = 48;
      doc.setFillColor(30, 41, 59); doc.rect(L, y - 5.5, Rt - L, 9, "F");
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(6.4);
      doc.text("DATE", L + 3, y);
      doc.text("PARTICULARS", L + 26, y);
      doc.text("DEBIT", Rt - 46, y, { align: "right" });
      doc.text("CREDIT", Rt - 24, y, { align: "right" });
      doc.text("BALANCE", Rt - 2, y, { align: "right" });
      y += 9;

      var bal = 0;
      var lines = [];
      l.chs.forEach(function (c) {
        lines.push({ d: dstr(c.createdAt), p: "Challan " + c.challanNo + (c.brand ? " (" + c.brand + ")" : ""), dr: challanNet(c), cr: 0 });
        if (String(c.freightTo) === "Client" && Number(c.freight)) {
          lines.push({ d: dstr(c.createdAt), p: "Freight - " + c.challanNo + (c.driver ? " (" + c.driver + ")" : ""), dr: Number(c.freight), cr: 0 });
        }
      });
      l.pays.forEach(function (p) {
        lines.push({ d: dstr(p.date), p: "Payment received" + (p.mode ? " - " + p.mode : "") + (p.ref ? " [" + p.ref + "]" : ""), dr: 0, cr: Number(p.amount) || 0 });
      });
      lines.sort(function (a, b) { return String(a.d).localeCompare(String(b.d)); });

      lines.forEach(function (ln, i) {
        if (y > 262) { doc.addPage(); y = 24; }
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 4.5, Rt - L, 7, "F"); }
        bal += ln.dr - ln.cr;
        doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(7.2);
        doc.text(String(ln.d), L + 3, y);
        doc.text(doc.splitTextToSize(ln.p, 78)[0], L + 26, y);
        if (ln.dr) doc.text(R2(ln.dr), Rt - 46, y, { align: "right" });
        if (ln.cr) doc.text(R2(ln.cr), Rt - 24, y, { align: "right" });
        F("bold"); doc.text(R2(bal), Rt - 2, y, { align: "right" });
        y += 7;
      });

      y += 4;
      doc.setFillColor(236, 253, 245); doc.roundedRect(112, y - 5, Rt - 112, 12, 1.5, 1.5, "F");
      doc.setTextColor(13, 118, 108); F("bold"); doc.setFontSize(8);
      doc.text("Balance due", 116, y + 1.4);
      doc.setFontSize(11);
      doc.text(R2(l.due), Rt - 2, y + 1.6, { align: "right" });
      F("normal"); doc.setFontSize(6.4); doc.setTextColor(150, 163, 175);
      doc.text("Energy World  |  Panipat \u00b7 Sonipat \u00b7 Karnal", L, 290);
      return doc;
    });
  }

  /* ---------------- brand-wise pending leads ----------------
     "Which leads are still pending for Stellar?" - one tap, then hand the list to the
     executive who covers that brand. */
  function brandLeads(brand) {
    var rule = S.data.rules.filter(function (r) { return r.brand === brand; })[0] || {};
    var by = Number(rule.pitchBy) || 0;
    var out = [];
    S.data.sites.forEach(function (st) {
      var p = S.data.pitch.filter(function (x) { return x.siteId === st.id && x.brand === brand; })[0];
      var status = (p && p.status) || "Not pitched";
      if (status === "Won" || status === "Lost" || status === "Not applicable") return;
      var sn = stageNo(st);
      var win = sn === 0 ? "stage not set" : (sn > by ? "CLOSED" : (sn === by ? "CLOSES NOW" : "open till stage " + by));
      out.push({ site: st, status: status, window: win, urgent: (sn === by || by - sn === 1) && sn > 0 });
    });
    out.sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0); });
    return { rule: rule, list: out };
  }

  function partnersFor(clientName) {
    var c = clientByName(clientName) || {};
    return [c.architect && "Arch: " + c.architect, c.plumber && "Plumber: " + c.plumber,
      c.builder && "Builder: " + c.builder, c.pmc && "PMC: " + c.pmc].filter(Boolean).join("  ·  ");
  }
  /* Every brand this client has already been quoted (any live quote). */
  function clientQuotedBrands(clientName) {
    var set = {};
    (S.data.quotes || []).forEach(function (q) {
      if (String(q.client) !== String(clientName) || String(q.status) === "Lost") return;
      String(q.brand || "").split(",").forEach(function (b) { b = b.trim(); if (b) set[b] = 1; });
    });
    return Object.keys(set);
  }
  /* A client's construction stage, DERIVED from a matching site/customer record (clients don't
     carry their own stage). Blank when there is no stage source for them. */
  function clientStage(clientName) {
    var s = (S.data.sites || []).filter(function (x) { return x.client === clientName || x.name === clientName; })[0];
    if (s && s.stage) return s.stage;
    var cu = (S.data.customers || []).filter(function (x) { return x.name === clientName; })[0];
    return (cu && cu.stage) || "";
  }
  /* Cross-sell list for a brand: clients who buy at least one OTHER brand from us but have not
     been quoted THIS brand yet — the visiting brand executive's gold list. */
  function crossSellClients(brand) {
    var bl = String(brand || "").toLowerCase();
    return (S.data.clients || []).filter(function (c) {
      var brands = clientQuotedBrands(c.name);
      if (!brands.length) return false;   /* not a buyer yet -> a lead, not a cross-sell */
      return !brands.some(function (b) { return b.toLowerCase() === bl || b.toLowerCase().indexOf(bl) > -1; });
    });
  }

  function viewLeads() {
    var h = '<div class="empty" style="text-align:left;padding:0 0 12px">Pick a brand. <b>Cross-sell</b> = your clients who already buy other brands but not this one yet (with plumber, architect and stage) — the list to hand a visiting brand executive. <b>New leads</b> = prospect sites that are not yet your clients.</div>';
    h += '<div class="row">' + brandList().map(function (b) {
      var n = crossSellClients(b).length;
      return '<button class="btn sm ' + (S.leadBrand === b ? "" : "ghost") + '" data-act="lead-brand" data-b="' + esc(b) + '">' + esc(b) + ' (' + n + ')</button>';
    }).join("") + '</div>';
    if (!S.leadBrand) return h;
    var brand = S.leadBrand;
    var cross = crossSellClients(brand);
    var leads = brandLeads(brand).list;
    var urgent = leads.filter(function (x) { return x.urgent; }).length;

    h += '<div class="cards">' +
      '<div class="stat ' + (cross.length ? "alert" : "") + '"><div class="n">' + cross.length + '</div><div class="l">Cross-sell clients</div></div>' +
      '<div class="stat"><div class="n">' + leads.length + '</div><div class="l">New leads (sites)</div></div>' +
      '<div class="stat ' + (urgent ? "alert" : "") + '"><div class="n">' + urgent + '</div><div class="l">Window closing</div></div>' +
      '</div>';
    h += '<div class="row"><span class="pill teal">' + esc(brand) + '</span><div class="grow"></div>' +
      '<button class="btn ghost" data-act="lead-pdf">PDF</button>' +
      '<select id="lead_exec" style="width:auto;padding:9px 10px">' +
      opts(["Vivek Verma", "Ashish Bhuker", "Imran", "Mukesh Verma", "Dinesh Verma"], "Vivek Verma") + '</select>' +
      '<button class="btn" data-act="lead-send">Send to executive</button></div>';

    /* ---- Cross-sell: existing clients missing this brand ---- */
    h += '<h3 style="margin:16px 0 8px;font-size:15px">Cross-sell &mdash; clients buying from you, not ' + esc(brand) + ' yet</h3>';
    if (!cross.length) h += '<div class="empty">No cross-sell clients for ' + esc(brand) + ' — everyone who buys from you already has it, or you have no clients on the book yet.</div>';
    cross.forEach(function (c) {
      var brands = clientQuotedBrands(c.name);
      var stg = clientStage(c.name);
      var partners = partnersFor(c.name);
      var seg = clientSegment(c);
      h += '<div class="card"><h3>' + esc(c.name) +
        ' <span class="pill teal">' + esc(c.location || "-") + '</span>' +
        (seg ? ' <span class="pill" style="background:' + (seg === "Project" ? "#e0e7ff;color:#3730a3" : "#dcfce7;color:#166534") + '">' + esc(seg) + '</span>' : "") +
        (stg ? ' <span class="pill soon">' + esc(stg) + '</span>' : "") + '</h3>' +
        '<div class="meta">Already buys: <b>' + esc(brands.join(", ")) + '</b>' +
        (partners ? '<br>' + esc(partners) : "") +
        (c.mobile ? '<br>' + esc(c.mobile) : "") + '</div>' +
        '<div class="acts">' + (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : "") +
        '<button class="btn sm" data-act="lead-quote" data-id="' + esc(c.id) + '" data-brand="' + esc(brand) + '">Quote ' + esc(brand) + '</button></div></div>';
    });

    /* ---- New leads: prospect sites (not yet clients) ---- */
    if (leads.length) {
      h += '<h3 style="margin:18px 0 8px;font-size:15px">New leads &mdash; prospect sites</h3>';
      leads.forEach(function (x) {
        var cls = x.window === "CLOSED" ? "due" : (x.urgent ? "due" : "teal");
        h += '<div class="card"><h3>' + esc(x.site.name) + ' <span class="pill ' + cls + '">' + esc(x.window) + '</span></h3>' +
          '<div class="meta">' + esc(x.site.client || "") + (x.site.city ? ' &middot; ' + esc(x.site.city) : "") +
          '<br>Stage: <b>' + esc(x.site.stage || "-") + '</b> &middot; status: ' + esc(x.status) +
          (x.site.owner ? '<br>Owner: ' + esc(x.site.owner) : "") +
          (x.site.mobile ? '<br>' + esc(x.site.mobile) : "") + '</div>' +
          '<div class="acts">' + (x.site.mobile ? '<a class="btn sm ghost" href="tel:' + esc(x.site.mobile) + '">Call</a>' : "") +
          '<button class="btn sm ghost" data-act="matrix" data-id="' + esc(x.site.id) + '">Matrix</button></div></div>';
      });
    }
    return h;
  }

  function leadsPdf(brand) {
    var r = brandLeads(brand);
    return loadFonts().then(function (f) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
        uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var W = 210, L = 14, Rt = W - 14, y = 0;
      doc.setFillColor(11, 59, 54); doc.rect(0, 0, W, 34, "F");
      doc.setFillColor(94, 234, 212); doc.rect(0, 34, W, 1.2, "F");
      if (LOGO_B64) { try { doc.addImage(LOGO_B64, "JPEG", L, 8, 30, 16); } catch (e) {} }
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(14);
      doc.text("PENDING LEADS", Rt, 15, { align: "right" });
      F("normal"); doc.setFontSize(9); doc.setTextColor(160, 205, 199);
      doc.text(brand + "  \u00b7  " + (r.rule.line || ""), Rt, 22, { align: "right" });
      doc.text(today(), Rt, 27, { align: "right" });

      y = 48;
      doc.setFillColor(30, 41, 59); doc.rect(L, y - 5.5, Rt - L, 9, "F");
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(6.4);
      doc.text("SITE", L + 3, y);
      doc.text("CLIENT", L + 62, y);
      doc.text("STAGE", L + 105, y);
      doc.text("STATUS", Rt - 34, y, { align: "right" });
      doc.text("WINDOW", Rt - 2, y, { align: "right" });
      y += 9;

      r.list.forEach(function (x, i) {
        if (y > 268) { doc.addPage(); y = 24; }
        if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 4.5, Rt - L, 8, "F"); }
        doc.setTextColor(17, 34, 45); F("bold"); doc.setFontSize(7.4);
        doc.text(doc.splitTextToSize(String(x.site.name), 46)[0], L + 3, y);
        F("normal"); doc.setTextColor(90, 105, 120);
        doc.text(doc.splitTextToSize(String(x.site.client || "-"), 40)[0], L + 62, y);
        doc.setFontSize(6.6);
        doc.text(doc.splitTextToSize(String(x.site.stage || "-"), 40)[0], L + 105, y);
        doc.setFontSize(7);
        doc.text(String(x.status), Rt - 34, y, { align: "right" });
        if (x.window === "CLOSED" || x.urgent) { doc.setTextColor(190, 30, 60); F("bold"); }
        else { doc.setTextColor(13, 148, 136); F("normal"); }
        doc.text(String(x.window), Rt - 2, y, { align: "right" });
        y += 8;
      });

      y += 6;
      doc.setTextColor(110, 125, 140); F("normal"); doc.setFontSize(7);
      doc.text("Window = the last construction stage at which " + brand + " can still be sold at that site.", L, y);
      doc.text("Once it is CLOSED the wall is shut and the sale is gone.", L, y + 4.5);
      doc.setFontSize(6.4); doc.setTextColor(150, 163, 175);
      doc.text("Energy World  |  Panipat \u00b7 Sonipat \u00b7 Karnal", L, 290);
      return doc;
    });
  }

  /* ---------------- owner dashboard ----------------
     For a partner: money, then what is about to be lost, then what needs a decision.
     Deliberately opinionated - it names ONE thing to do today rather than 12 numbers. */
  /* ---------- DAILY TEAM DIGEST ---------- */
  function digestLines() {
    var lines = [];
    var dueRem = openFollowups().filter(function (f) { return f.dueDate && daysTo(f.dueDate) <= 0; }).length;
    var radar = 0; try { radar = radarQuotes().length; } catch (e) {}
    if (radar + dueRem) lines.push("Follow-ups to chase: " + (radar + dueRem));
    var names = {}; S.data.challans.forEach(function (c) { if (String(c.receiptReceived).toUpperCase() === "Y") names[c.customerName] = 1; });
    var overdue = Object.keys(names).map(function (n) { return { due: clientLedger(n).due, age: payAge(n) }; }).filter(function (x) { return x.due > 0 && x.age >= PAY_MIN; });
    var overTot = overdue.reduce(function (a, x) { return a + x.due; }, 0);
    if (overdue.length) lines.push("Payments to collect: " + overdue.length + " client(s), " + moneyAscii(overTot));
    var closing = [];
    S.data.sites.forEach(function (st) { S.data.rules.forEach(function (r) { if (action(st, r, pitchRow(st.id, r.brand)).k === "now") closing.push(r.brand + " @ " + st.name); }); });
    if (closing.length) lines.push("Pitch windows closing: " + closing.length + " (" + closing.slice(0, 3).join(", ") + (closing.length > 3 ? "…" : "") + ")");
    var awaitApp = S.data.challans.filter(function (c) { return (c.status || "Draft") === "Draft"; }).length;
    if (awaitApp) lines.push("Challans awaiting approval: " + awaitApp);
    var toComm = 0; try { toComm = commPending().length; } catch (e) {}
    if (toComm) lines.push("Products to commission: " + toComm);
    var quiet = agingLeads().length; if (quiet) lines.push("Leads going quiet: " + quiet);
    return lines;
  }
  function digestText() {
    var l = digestLines();
    return "Energy World — Today (" + fullDate(today()) + ")\n\n" + (l.length ? l.map(function (x) { return "• " + x; }).join("\n") : "All clear — nothing pending today.") + "\n\n(from the CRM)";
  }
  function digestPdf() {
    return commPdfBase("TODAY'S BOARD", {}, today()).then(function (b) {
      var doc = b.doc, F = b.F, L = b.L, R = b.R, y = 48;
      var l = digestLines();
      doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(11.5);
      if (!l.length) doc.text("All clear — nothing pending today.", L, y);
      l.forEach(function (ln) {
        doc.splitTextToSize(ln, R - L - 8).forEach(function (t2, i) { doc.text((i === 0 ? "•  " : "    ") + t2, L, y); y += 8; });
        y += 1;
      });
      doc.setFontSize(6.6); doc.setTextColor(150, 163, 175); doc.text("Energy World  |  Panipat · Sonipat · Karnal", L, 290);
      return doc;
    });
  }

  function viewOwner() {
    var clients = {};
    S.data.challans.forEach(function (c) { if (String(c.receiptReceived).toUpperCase() === "Y") clients[c.customerName] = 1; });
    var due = Object.keys(clients).reduce(function (a, n) { return a + clientLedger(n).due; }, 0);

    var incPend = 0;
    S.data.associates.forEach(function (a) { incPend += partnerBook(a.name).pending; });

    var awaitApp = S.data.challans.filter(function (c) { return (c.status || "Draft") === "Draft"; });
    var awaitRcpt = S.data.challans.filter(function (c) { return c.status === "Dispatched"; });

    var closing = [];
    S.data.sites.forEach(function (st) {
      S.data.rules.forEach(function (r) {
        var a = action(st, r, pitchRow(st.id, r.brand));
        if (a.k === "now") closing.push({ site: st, brand: r.brand });
      });
    });

    var svcDue = S.data.installs.filter(function (x) { return x.nextService && daysTo(x.nextService) <= 0; });
    var visitsToday = S.data.sitevisits.filter(function (v) { return dstr(v.date) === today(); });
    var quotesOpen = S.data.quotes.filter(function (q) { return q.status === "Sent" || q.status === "Negotiating"; });

    /* the one thing */
    var one = null;
    if (closing.length) one = { t: closing.length + " pitch window(s) close TODAY", s: closing.slice(0, 3).map(function (c) { return c.brand + " at " + c.site.name; }).join(", "), a: "leads", b: "Open brand leads" };
    else if (awaitApp.length) one = { t: awaitApp.length + " challan(s) waiting on your approval", s: "The godown cannot dispatch until you approve.", a: "challans", b: "Approve now" };
    else if (due > 0) one = { t: money(due) + " outstanding from clients", s: "Incentive only becomes payable as this comes in.", a: "payments", b: "Open payments" };
    else if (svcDue.length) one = { t: svcDue.length + " service visit(s) overdue", s: "Softeners and filters past their cycle.", a: "service", b: "Open service" };

    var h = "";
    if (one) {
      h += '<div class="card" style="border-color:#99f6e4;background:#f0fdfa">' +
        '<div class="meta" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0f766e"><b>Today</b></div>' +
        '<h3 style="font-size:17px;margin:4px 0 2px">' + esc(one.t) + '</h3>' +
        '<div class="meta">' + esc(one.s) + '</div>' +
        '<div class="acts"><button class="btn sm" data-act="tab" data-tab="' + one.a + '">' + esc(one.b) + '</button></div></div>';
    }

    var dg = digestLines();
    h += '<div class="card"><h3>Team digest — today</h3>' +
      '<div class="meta">' + (dg.length ? dg.map(function (l) { return "&bull; " + esc(l); }).join("<br>") : "All clear — nothing pending. 🎉") + '</div>' +
      '<div class="acts"><button class="btn sm" data-act="dg-tg">Send to team (Telegram)</button>' +
      '<button class="btn sm ghost" data-act="dg-wa">WhatsApp</button></div>' +
      '<div class="meta" style="font-size:11px;color:#94a3b8;margin-top:4px">Tap each morning to push the team their to-dos. (Ask me to set up automatic 8 AM posting.)</div></div>';

    /* the pitch-by-stage engine only works once sites are entered - nudge until at least a few are in */
    if ((S.role === "admin" || S.role === "sales") && (S.data.sites || []).length < 3) {
      h += '<div class="card" style="border-color:#bfdbfe;background:#eff6ff"><h3>Turn on stage-based pitching</h3>' +
        '<div class="meta">Only <b>' + (S.data.sites || []).length + '</b> site(s) entered, so the pitch matrix stays mostly dark. Enter your live sites with their construction stage and the app will start flagging <b>what to pitch, to whom, and when</b> — pipes at rough-in, heat pumps &amp; softeners at finishing. This is the single biggest lever you have unused.</div>' +
        '<div class="acts"><button class="btn sm" data-act="tab" data-tab="sites">Add a site</button>' +
        '<button class="btn sm ghost" data-act="tab" data-tab="leads">Leads</button></div></div>';
    }

    h += '<div class="cards">' +
      '<div class="stat ' + (due > 0 ? "alert" : "") + '"><div class="n">' + money(due) + '</div><div class="l">Client outstanding</div></div>' +
      '<div class="stat"><div class="n">' + money(incPend) + '</div><div class="l">Incentive to pay</div></div>' +
      '<div class="stat ' + (closing.length ? "alert" : "") + '"><div class="n">' + closing.length + '</div><div class="l">Windows closing</div></div>' +
      '<div class="stat ' + (awaitApp.length ? "alert" : "") + '"><div class="n">' + awaitApp.length + '</div><div class="l">Challans to approve</div></div>' +
      '<div class="stat"><div class="n">' + awaitRcpt.length + '</div><div class="l">Awaiting receipt</div></div>' +
      '<div class="stat"><div class="n">' + quotesOpen.length + '</div><div class="l">Quotes live</div></div>' +
      '<div class="stat ' + (svcDue.length ? "alert" : "") + '"><div class="n">' + svcDue.length + '</div><div class="l">Service overdue</div></div>' +
      '<div class="stat"><div class="n">' + visitsToday.length + '</div><div class="l">Site visits today</div></div>' +
      '</div>';

    if (closing.length) {
      h += '<h3 style="margin:18px 0 10px;font-size:15px">Closing today - pitch or lose</h3>';
      closing.slice(0, 8).forEach(function (c) {
        h += '<div class="card"><h3>' + esc(c.brand) + ' <span class="pill due">closes now</span></h3>' +
          '<div class="meta">' + esc(c.site.name) + ' &middot; ' + esc(c.site.stage || "") +
          (c.site.owner ? '<br>Owner: ' + esc(c.site.owner) : "") + '</div>' +
          '<div class="acts"><button class="btn sm ghost" data-act="matrix" data-id="' + esc(c.site.id) + '">Matrix</button></div></div>';
      });
    }

    h += '<div class="foot-note">Figures are ex-GST where incentive is concerned. Only delivered challans (receipt in) count.</div>';
    return h;
  }

  /* ---------------- biometric unlock ----------------
     Honest about what this is: the phone\u2019s own Face ID / fingerprint unlocks a PIN that
     is already stored on THAT device. The biometric never leaves the phone and is never
     sent anywhere - that is how WebAuthn works. The server still authenticates with the
     PIN, exactly as before. It is convenience with a real lock on it, not a new identity
     system, and I am not going to pretend otherwise. */
  var BIO_KEY = "ew_team_bio";

  function bioAvailable() {
    return !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  }
  function bioSaved() {
    try { return JSON.parse(localStorage.getItem(BIO_KEY) || "null"); } catch (e) { return null; }
  }
  function randBytes(n) {
    var a = new Uint8Array(n); crypto.getRandomValues(a); return a;
  }
  function b64u(buf) {
    var b = new Uint8Array(buf), s2 = "";
    for (var i = 0; i < b.length; i++) s2 += String.fromCharCode(b[i]);
    return btoa(s2).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64u(str) {
    var s2 = String(str).replace(/-/g, "+").replace(/_/g, "/");
    var bin = atob(s2);
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  function bioEnrol() {
    if (!bioAvailable()) { toast("This device has no biometric support."); return; }
    navigator.credentials.create({
      publicKey: {
        challenge: randBytes(32),
        rp: { name: "Energy World Team" },
        user: { id: randBytes(16), name: S.user, displayName: S.user },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000, attestation: "none"
      }
    }).then(function (cred) {
      localStorage.setItem(BIO_KEY, JSON.stringify({ id: b64u(cred.rawId), user: S.user, pin: S.pin }));
      toast("Face ID / fingerprint enabled on this device.");
      render();
    }).catch(function () { toast("Could not enable biometric unlock."); });
  }

  function bioUnlock() {
    var saved = bioSaved();
    if (!saved) return;
    navigator.credentials.get({
      publicKey: {
        challenge: randBytes(32),
        allowCredentials: [{ type: "public-key", id: fromB64u(saved.id) }],
        userVerification: "required", timeout: 60000
      }
    }).then(function () {
      S.user = saved.user; S.pin = saved.pin;
      api("teamAuth", { ua: navigator.userAgent }).then(function (r) {
        if (!r || !r.ok) { localStorage.removeItem(BIO_KEY);
      try { localStorage.removeItem(snapKey()); } catch (e) { } S.pin = ""; renderLogin("Saved sign-in no longer valid."); return; }
        S.user = r.user.name; S.role = r.user.role; S.pinSet = r.user.pinSet;
        S.tab = (ROLE_TABS[S.role] || ["dash"])[0];
        loadCatalog(); refresh();
      });
    }).catch(function () { toast("Biometric check failed - use your PIN."); });
  }

  function bioForget() {
    localStorage.removeItem(BIO_KEY);
      try { localStorage.removeItem(snapKey()); } catch (e) { }
    toast("Biometric unlock removed from this device.");
    render();
  }

  /* ---------------- locations, areas, partners ---------------- */
  function locations() {
    var seen = {}, out = [];
    S.data.areas.forEach(function (a) { if (a.location && !seen[a.location]) { seen[a.location] = 1; out.push(a.location); } });
    LOCATIONS.forEach(function (l) { if (!seen[l]) { seen[l] = 1; out.push(l); } });
    return out;
  }
  function areasIn(loc) {
    return S.data.areas.filter(function (a) { return a.location === loc; })
      .map(function (a) { return a.area; }).filter(Boolean);
  }
  function partnerByName(n) {
    var t = String(n || "").trim().toLowerCase();
    return S.data.associates.filter(function (a) { return String(a.name).trim().toLowerCase() === t; })[0] || null;
  }
  /* short name is derived, never typed: first name + last 4 of the mobile */
  function shortNameOf(name, mobile) {
    var first = String(name || "").trim().split(/\s+/)[0] || "CLIENT";
    var last4 = String(mobile || "").replace(/[^0-9]/g, "").slice(-4);
    return (first.toUpperCase().replace(/[^A-Z0-9]/g, "") + last4).slice(0, 14);
  }

  function partnerField(id, label, role, value) {
    var p = partnerByName(value);
    return '<label>' + label + '</label>' +
      '<input id="' + id + '" class="pf" data-role="' + esc(role) + '" list="pl_' + esc(role) + '" value="' + esc(value) + '" placeholder="Type a name, or add new"/>' +
      '<div class="meta" id="' + id + '_info" style="margin:-4px 0 4px">' +
        (p ? esc([p.mobile, p.mobile2, p.area].filter(Boolean).join("  \u00b7  ")) : '<span style="color:#94a3b8">not in Partners yet - it will be added</span>') +
      '</div>';
  }

  function partnerLists() {
    var roles = ["Architect", "Plumber", "Builder", "PMC"];
    return roles.map(function (r) {
      var names = S.data.associates.filter(function (a) { return a.role === r; }).map(function (a) { return a.name; });
      return '<datalist id="pl_' + esc(r) + '">' + names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>';
    }).join("");
  }

  /* legacy modalClient removed: a second, older definition sat further down the file and,
     because function declarations hoist, it silently overrode the current one. That is why the
     rebuilt form never appeared. Do not reintroduce a duplicate name in this file. */

  /* any partner named on a client that we do not know yet is created automatically -
     that is how the Partners master fills itself without anyone doing double entry */
  function ensurePartner(name, role, loc, area) {
    if (!name) return Promise.resolve(null);
    if (partnerByName(name)) return Promise.resolve(partnerByName(name));
    return save("associates", { id: "", name: name, role: role, mobile: "", mobile2: "",
      location: loc || "", area: area || "", address: "", birthday: "", anniversary: "",
      rate: "", notes: "auto-added from a client" });
  }

  /* ---------------- PARTNERS ----------------
     296 plumbers and architects in a flat list is a list nobody opens. So: role, then town,
     then the men - and against each one the only numbers that actually decide whether you
     ring him today. Incentive is ADMIN ONLY and never rendered for anyone else. */
  function partnerStats(name) {
    var n = String(name || "").trim().toLowerCase();
    var isMine = function (v) { return String(v || "").trim().toLowerCase() === n; };
    /* his clients: he is named as the plumber / architect / builder / PMC on the client. For a sales
       exec the count is scoped to THEIR assigned clients only, so "sites going on" and the
       most-sites-first order reflect this exec's own book, not the whole company's. */
    var mine = (S.data.clients || []).filter(function (c) {
      var named = isMine(c.plumber) || isMine(c.architect) || isMine(c.builder) || isMine(c.pmc);
      if (!named) return false;
      return seesAllClients() || isMineClient(c.name);
    });
    var names = {};
    mine.forEach(function (c) { names[String(c.name).trim().toLowerCase()] = 1; });
    /* live = we are actually delivering there. open = quoted or pitched, not yet closed. */
    var live = {}, quoted = {};
    (S.data.challans || []).forEach(function (c) {
      if (names[String(c.customerName || "").trim().toLowerCase()]) live[c.customerName] = 1;
    });
    (S.data.quotes || []).forEach(function (q) {
      if (!names[String(q.client || "").trim().toLowerCase()]) return;
      if (["Won", "Lost"].indexOf(String(q.status)) < 0 && !live[q.client]) quoted[q.client] = 1;
    });
    var owed = 0;
    if (S.role === "admin") {
      (S.data.incentives || []).forEach(function (i) {
        if (isMine(i.person)) owed += (Number(i.earned) || 0) - (Number(i.paid) || 0);
      });
    }
    return {
      clients: mine.length,
      live: Object.keys(live).length,
      open: Object.keys(quoted).length,
      owed: owed
    };
  }

  function dmy(v) {
    var s2 = String(v || "").trim();
    if (!s2) return "";
    var d = new Date(s2);
    if (isNaN(d.getTime())) return s2;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  function viewPartners() {
    var q = S.q.toLowerCase();
    var all = S.data.associates || [];
    /* only roles that actually exist, with counts - no empty buttons to click on */
    var roleCount = {};
    all.forEach(function (a2) { var r = a2.role || "Other"; roleCount[r] = (roleCount[r] || 0) + 1; });
    var roles = Object.keys(roleCount).sort(function (x, y) { return roleCount[y] - roleCount[x]; });

    var greet = greetToday();
    var h = "";
    if (greet.length) {
      h += '<div class="card" style="border-color:#fde68a;background:#fffbeb"><h3>Greet today</h3><div class="meta">';
      greet.forEach(function (x) {
        h += '<b>' + esc(x.name) + '</b> - ' + esc(x.what) + (x.mobile ? ' &middot; <a href="tel:' + esc(x.mobile) + '">' + esc(x.mobile) + '</a>' : "") + '<br>';
      });
      h += '</div></div>';
    }

    /* step 1 - the trade */
    h += '<div class="row" style="margin-top:6px">' + roles.map(function (r) {
      return '<button class="chip ' + (S.pRole === r ? "on" : "") + '" data-act="p-role" data-r="' + esc(r) + '">' +
        esc(r) + ' <b>' + roleCount[r] + '</b></button>';
    }).join("") + '</div>';
    if (!S.pRole && !q) return h + '<div class="empty">Pick a trade above.</div>';

    /* step 2 - the town */
    var inRole = all.filter(function (a2) { return !S.pRole || a2.role === S.pRole; });
    if (S.pRole) {
      var locCount = {};
      inRole.forEach(function (a2) { var l = a2.location || "-"; locCount[l] = (locCount[l] || 0) + 1; });
      var locs = Object.keys(locCount).sort(function (x, y) { return locCount[y] - locCount[x]; });
      h += '<div class="chips">' + locs.map(function (l) {
        return '<button class="chip ' + (S.pLoc === l ? "on" : "") + '" data-act="p-loc" data-l="' + esc(l) + '">' +
          esc(l) + ' <b>' + locCount[l] + '</b></button>';
      }).join("") + '</div>';
      if (!S.pLoc && !q) return h + '<div class="empty">Pick a town.</div>';
    }

    /* step 3 - the men */
    /* the man running the most live sites sits at the top - that is who is worth a call first */
    var list = inRole.filter(function (a2) {
      if (S.pLoc && (a2.location || "-") !== S.pLoc) return false;
      return !q || (a2.name + " " + a2.area + " " + a2.location + " " + a2.mobile).toLowerCase().indexOf(q) >= 0;
    }).map(function (a2) { return { p: a2, st: partnerStats(a2.name) }; })
      .sort(function (x, y) {
        return (y.st.live - x.st.live) || (y.st.open - x.st.open) || (y.st.clients - x.st.clients) ||
          String(x.p.name).localeCompare(String(y.p.name));
      });

    h += '<div class="row" style="margin:10px 0 4px"><div class="meta"><b>' + list.length + '</b> ' +
      esc(S.pRole || "partner") + (list.length === 1 ? "" : "s") + (S.pLoc ? ' in ' + esc(S.pLoc) : "") +
      ' &middot; most live sites first' + (seesAllClients() ? '' : ' (your clients)') + '</div>' +
      '<div class="grow"></div><button class="btn sm" data-act="as-new">+ Add</button></div>';
    if (!list.length) return h + '<div class="empty">Nobody here yet.</div>';

    list.forEach(function (row) {
      var p = row.p, st = row.st;
      h += '<div class="card"><h3>' + esc(p.name) +
        (p.flag ? ' <span class="pill Lost">needs number</span>' : "") +
        (st.live ? ' <span class="pill Won">' + st.live + ' live</span>' : "") +
        (st.open ? ' <span class="pill soon">' + st.open + ' open</span>' : "") + '</h3>' +
        '<div class="meta">' +
        (p.mobile ? '<a href="tel:' + esc(p.mobile) + '">' + esc(p.mobile) + '</a>' : '<span style="color:#dc2626">no number</span>') +
        (p.mobile2 ? ' &middot; ' + esc(p.mobile2) : "") +
        (p.area ? ' &middot; ' + esc(p.area) : "") +
        '<br>' + st.clients + ' client(s) &middot; ' + st.live + ' site(s) taking material &middot; ' + st.open + ' quoted, not closed' +
        ((p.birthday || p.anniversary)
          ? '<br>' + (p.birthday ? 'Birthday ' + esc(dmy(p.birthday)) : "") +
            (p.birthday && p.anniversary ? ' &middot; ' : "") +
            (p.anniversary ? 'Anniversary ' + esc(dmy(p.anniversary)) : "")
          : "") +
        /* incentive: partners only. Never rendered for sales, accounts or service. */
        (S.role === "admin"
          ? (function () { var _b = partnerBook(p.name); return '<br><b style="color:#0d9488">' + money(_b.pending) + '</b> incentive pending' +
              (_b.reversed > 0 ? ' &middot; <span style="color:#dc2626">' + money(_b.reversed) + ' reversed on returns</span>' : ""); })()
          : "") +
        '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="as-open" data-id="' + esc(p.id) + '">Open</button></div></div>';
    });
    return h;
  }

  function greetToday() {
    var md = today().slice(5);
    var out = [];
    S.data.associates.forEach(function (a) {
      if (a.birthday && String(a.birthday).slice(5, 10) === md) out.push({ name: a.name, what: "Birthday", mobile: a.mobile });
      if (a.anniversary && String(a.anniversary).slice(5, 10) === md) out.push({ name: a.name, what: "Anniversary", mobile: a.mobile });
    });
    return out;
  }

  function modalAssociate(a) {
    a = a || {};
    var loc = a.location || locations()[0];
    return '<h2>' + (a.id ? "Edit partner" : "New partner") + '</h2>' +
      '<p class="sub">Plumbers, architects, builders and PMCs. Incentive % is set per client &amp; brand on the Discounts screen — a partner earns only where you set a rate there.</p>' +
      '<label>Name</label><input id="m_aname" value="' + esc(a.name) + '"/>' +
      '<div class="grid2">' +
      '<div><label>Role</label><select id="m_arole">' + opts(["Architect", "Plumber", "Builder", "PMC", "Contractor", "Dealer", "Other"], a.role || "Plumber") + '</select></div>' +
      '<div><label>Mobile</label><input id="m_amobile" inputmode="numeric" value="' + esc(a.mobile) + '"/></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Alternate mobile</label><input id="m_amobile2" inputmode="numeric" value="' + esc(a.mobile2) + '"/></div>' +
      '<div><label>Location</label><select id="m_aloc" class="loc-sel2">' + opts(locations().concat(["+ Add new location"]), loc) + '</select></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Area</label><select id="m_aarea">' + opts([""].concat(areasIn(loc), ["+ Add new area"]), a.area || "") + '</select></div>' +
      '<div><label>Address</label><input id="m_aaddr" value="' + esc(a.address) + '"/></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Birthday</label><input id="m_abday" type="date" value="' + esc(dstr(a.birthday)) + '"/></div>' +
      '<div><label>Anniversary</label><input id="m_aanniv" type="date" value="' + esc(dstr(a.anniversary)) + '"/></div>' +
      '</div>' +
      '<label>Notes</label><textarea id="m_anotes">' + esc(a.notes) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="as-save" data-id="' + esc(a.id || "") + '">Save partner</button></div>';
  }

  /* ---------------- client brand board ----------------
     Quoted = amber. Won = green. Lost = red, struck through, with the brand that beat us.
     Set by hand by the executive or a partner - the app does not guess a win. */
  function clientPitch(clientName, brand) {
    return S.data.pitch.filter(function (p) {
      return String(p.clientName || "") === clientName && p.brand === brand;
    })[0] || null;
  }

  function brandChip(p) {
    var st = (p && p.status) || "Not pitched";
    if (st === "Won") return '<span class="bs win">WON</span>';
    if (st === "Lost") return '<span class="bs lose">LOST' + (p.lostTo ? ' to ' + esc(p.lostTo) : "") + '</span>';
    if (st === "Quoted" || st === "Negotiating") return '<span class="bs quoted">' + esc(st.toUpperCase()) + '</span>';
    if (st === "Pitched") return '<span class="bs pitched">PITCHED</span>';
    return '<span class="bs none">-</span>';
  }

  function viewBrandBoard() {
    var cn = S.brandClient;
    var c = clientByName(cn) || {};
    var h = '<div class="row"><button class="btn sm ghost" data-act="bb-back">Back to clients</button></div>';
    h += '<div class="card"><h3>' + esc(cn) + '</h3><div class="meta">' +
      esc([c.area, c.location].filter(Boolean).join(", ")) + '<br>' + esc(c.mobile || "") + '</div></div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 10px">Mark every brand as you go. <b>Quoted</b> is amber, <b>Won</b> green, <b>Lost</b> red with the brand that beat us. This is what the Brand leads screen reads.</div>';
    var won = 0, lost = 0, quoted = 0;
    brandList().forEach(function (b) {
      var p = clientPitch(cn, b);
      var st = (p && p.status) || "Not pitched";
      if (st === "Won") won++; else if (st === "Lost") lost++; else if (st === "Quoted" || st === "Negotiating") quoted++;
      h += '<div class="card bcard ' + (st === "Lost" ? "is-lost" : (st === "Won" ? "is-won" : (st === "Quoted" || st === "Negotiating" ? "is-quoted" : ""))) + '">' +
        '<h3><span class="bname">' + esc(b) + '</span> ' + brandChip(p) + '</h3>' +
        '<div class="acts" style="align-items:center;flex-wrap:wrap">' +
        '<select class="bb-st" data-c="' + esc(cn) + '" data-b="' + esc(b) + '" data-id="' + esc(p ? p.id : "") + '" style="width:auto;padding:7px 10px;font-size:13px">' +
        opts(["Not pitched", "Pitched", "Quoted", "Negotiating", "Won", "Lost", "Not applicable"], st) + '</select>' +
        '<input class="bb-amt" data-c="' + esc(cn) + '" data-b="' + esc(b) + '" data-id="' + esc(p ? p.id : "") + '" data-f="quoted" inputmode="numeric" placeholder="Quoted \u20B9" value="' + esc(p ? p.quoted : "") + '" style="width:110px;padding:7px 10px;font-size:13px"/>' +
        (st === "Lost"
          ? '<input class="bb-amt" data-c="' + esc(cn) + '" data-b="' + esc(b) + '" data-id="' + esc(p ? p.id : "") + '" data-f="lostTo" placeholder="Lost to which brand?" value="' + esc(p ? p.lostTo : "") + '" style="width:170px;padding:7px 10px;font-size:13px"/>'
          : "") +
        '</div></div>';
    });
    h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + won + '</div><div class="l">Won</div></div>' +
      '<div class="stat"><div class="n">' + quoted + '</div><div class="l">Quoted</div></div>' +
      '<div class="stat ' + (lost ? "alert" : "") + '"><div class="n">' + lost + '</div><div class="l">Lost</div></div>' +
      '</div>' + h;
    return h;
  }

  function saveBrandStatus(cn, brand, id, patch) {
    var c = clientByName(cn) || {};
    var p = clientPitch(cn, brand) || {};
    var row = {
      id: id || p.id || "", createdBy: p.createdBy || S.user,
      siteId: "", siteName: "", clientId: c.id || "", clientName: cn, brand: brand,
      status: p.status || "Not pitched", quoted: p.quoted || "", won: p.won || "",
      lostTo: p.lostTo || "", note: p.note || ""
    };
    Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    return save("pitch", row);
  }

  /* ---------------- master search ----------------
     Everyone can search everything. But a salesman searching a number that belongs to a
     colleague\u2019s client gets ONLY the name and the date it was registered - enough to stop a
     duplicate entry, not enough to poach. Partners and accounts see the full record. */
  /* ---------- GLOBAL SEARCH (top-bar "Search anything") ----------
     Products and partners are searched locally (already loaded); clients/quotes/challans/sites
     come from the server search (which enforces per-executive scoping). Results open in a modal
     so the search works from any tab without leaving the current screen. */
  function runGlobalSearch() {
    var qv = String(S.gq || "").trim();
    if (qv.length < 2) { toast("Type at least 2 characters."); return; }
    var lq = qv.toLowerCase();
    var products = PRODUCTS.filter(function (p) {
      return (p.code + " " + p.desc + " " + p.family + " " + p.brand + " " + p.cat).toLowerCase().indexOf(lq) > -1;
    }).slice(0, 25);
    var partners = (S.data.associates || []).filter(function (a) {
      return Object.keys(a).map(function (k) { return a[k]; }).join(" ").toLowerCase().indexOf(lq) > -1;
    }).slice(0, 25);
    S.sres = { clients: [], quotes: [], challans: [], sites: [], products: products, partners: partners, loading: true, q: qv };
    S.modal = modalSearchResults(); render();
    api("search", { q: qv }).then(function (r) {
      if (r && r.ok) { S.sres.clients = r.clients || []; S.sres.quotes = r.quotes || []; S.sres.challans = r.challans || []; S.sres.sites = r.sites || []; }
      S.sres.loading = false;
      if (S.modal) { S.modal = modalSearchResults(); render(); }
    }).catch(function () { S.sres.loading = false; if (S.modal) { S.modal = modalSearchResults(); render(); } });
  }

  function modalSearchResults() {
    var r = S.sres || {};
    var HH = 'style="margin:14px 0 8px;font-size:14px"';
    var h = '<h2>Search &mdash; &ldquo;' + esc(r.q || S.gq || "") + '&rdquo;</h2>';
    var counts = (r.clients || []).length + (r.quotes || []).length + (r.challans || []).length +
      (r.sites || []).length + (r.products || []).length + (r.partners || []).length;
    h += '<div class="meta" style="margin-bottom:4px">' + counts + ' result(s)' + (r.loading ? ' &middot; searching your records…' : '') + '</div>';
    h += '<div style="max-height:60vh;overflow:auto;margin:0 -4px;padding:0 4px">';

    if ((r.clients || []).length) h += '<h3 ' + HH + '>Clients</h3>';
    (r.clients || []).forEach(function (c) {
      if (!c.own) {
        h += '<div class="card" style="border:1.5px solid #f87171;background:#fef2f2"><h3>' + esc(c.name) +
          ' <span class="pill due">another executive</span></h3><div class="meta">Registered on <b>' + esc(c.on) +
          '</b> by another executive.<br><b style="color:#dc2626">Already on another executive’s book — coordinate, do not double-quote.</b></div></div>';
        return;
      }
      h += '<div class="card"><h3>' + esc(c.name) + ' <span class="pill teal">' + esc(c.location || "") + '</span></h3>' +
        '<div class="meta">' + esc([c.mobile, c.mobile2].filter(Boolean).join("  ·  ")) +
        (c.area ? '<br>' + esc(c.area) : "") + '<br>Added ' + esc(c.on) + ' by ' + esc(c.by) + '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="bb-open" data-n="' + esc(c.name) + '">Brands</button></div></div>';
    });

    if ((r.quotes || []).length) h += '<h3 ' + HH + '>Quotations</h3>';
    (r.quotes || []).forEach(function (q) {
      var mine = q.own;
      h += '<div class="card"' + (mine ? '' : ' style="border:1.5px solid #f87171;background:#fef2f2"') + '>' +
        '<h3>' + esc(q.no) + ' <span class="pill ' + (mine ? 'teal' : 'due') + '">' + (mine ? esc(q.status || "") : 'another executive') + '</span></h3>' +
        '<div class="meta">' + esc(q.client || "") + (mine && q.brand ? ' &middot; ' + esc(q.brand) : "") +
        (mine && q.total ? '<br>' + money(q.total) : "") + '<br>' + esc(q.on) + ' by ' + esc(q.by) +
        (mine ? "" : '<br><b style="color:#dc2626">Already quoted by ' + esc(q.by || 'another executive') + ' — do not double-quote.</b>') + '</div></div>';
    });

    if ((r.challans || []).length) h += '<h3 ' + HH + '>Challans</h3>';
    (r.challans || []).forEach(function (c) {
      h += '<div class="card"><h3>' + esc(c.no) + ' <span class="pill teal">' + esc(c.status || "Draft") + '</span></h3>' +
        '<div class="meta">' + esc(c.client || "") + (c.site ? ' &middot; ' + esc(c.site) : "") +
        (c.own && c.amount ? '<br>' + money(c.amount) : "") + '<br>' + esc(c.on) + ' by ' + esc(c.by) + '</div></div>';
    });

    if ((r.products || []).length) h += '<h3 ' + HH + '>Products</h3>';
    (r.products || []).forEach(function (p) {
      h += '<div class="card"><h3>' + esc(p.desc || p.family) + ' <span class="pill teal">' + money(p.price) + '</span></h3>' +
        '<div class="meta">' + esc(p.code) + (p.brand ? ' &middot; ' + esc(p.brand) : "") + (p.unit ? ' &middot; ' + esc(p.unit) : "") + '</div></div>';
    });

    if ((r.partners || []).length) h += '<h3 ' + HH + '>Partners</h3>';
    (r.partners || []).forEach(function (a) {
      h += '<div class="card"><h3>' + esc(a.name || "-") + (a.role || a.type ? ' <span class="pill teal">' + esc(a.role || a.type) + '</span>' : "") + '</h3>' +
        '<div class="meta">' + esc([a.mobile, a.location || a.area].filter(Boolean).join("  ·  ")) +
        '</div>' + (a.mobile ? '<div class="acts"><a class="btn sm ghost" href="tel:' + esc(a.mobile) + '">Call</a></div>' : "") + '</div>';
    });

    if ((r.sites || []).length) h += '<h3 ' + HH + '>Sites</h3>';
    (r.sites || []).forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.name) + ' <span class="pill teal">' + esc(x.stage || "") + '</span></h3>' +
        '<div class="meta">' + esc(x.client || "") + '</div></div>';
    });

    if (!counts && !r.loading) h += '<div class="empty">Nothing found.</div>';
    h += '</div><div class="foot"><button class="btn ghost" data-act="close">Close</button></div>';
    return h;
  }

  function viewSearch() {
    var h = '<div class="row"><input class="grow" id="sq" placeholder="Client name, phone, quote no., challan no..." value="' + esc(S.sq) + '"/>' +
      '<button class="btn" data-act="s-go">Search</button></div>';
    var r = S.sres;
    if (!r) return h + '<div class="empty">Type at least 3 characters. Searches clients, phone numbers, quotes, challans and sites across the whole firm.</div>';
    var total = (r.clients || []).length + (r.quotes || []).length + (r.challans || []).length + (r.sites || []).length;
    if (!total) return h + '<div class="empty">Nothing found for "' + esc(S.sq) + '".</div>';
    (r.clients || []).length && (h += '<h3 style="margin:14px 0 8px;font-size:14px">Clients</h3>');
    (r.clients || []).forEach(function (c) {
      if (!c.own) {
        h += '<div class="card" style="border-color:#fde68a;background:#fffbeb"><h3>' + esc(c.name) +
          ' <span class="pill soon">already registered</span></h3><div class="meta">Registered on <b>' + esc(c.on) +
          '</b> by another executive.<br><span style="color:#94a3b8">Do not enter this client again. Ask a partner if you need the details.</span></div></div>';
        return;
      }
      h += '<div class="card"><h3>' + esc(c.name) + ' <span class="pill teal">' + esc(c.location || "") + '</span></h3>' +
        '<div class="meta">' + esc([c.mobile, c.mobile2].filter(Boolean).join("  \u00b7  ")) +
        (c.area ? '<br>' + esc(c.area) : "") + '<br>Added ' + esc(c.on) + ' by ' + esc(c.by) + '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="bb-open" data-n="' + esc(c.name) + '">Brands</button></div></div>';
    });
    (r.quotes || []).length && (h += '<h3 style="margin:14px 0 8px;font-size:14px">Quotations</h3>');
    (r.quotes || []).forEach(function (q) {
      h += '<div class="card"><h3>' + esc(q.no) + ' <span class="pill teal">' + esc(q.status || "") + '</span></h3>' +
        '<div class="meta">' + esc(q.client || "") + (q.own && q.brand ? ' &middot; ' + esc(q.brand) : "") +
        (q.own && q.total ? '<br>' + money(q.total) : "") + '<br>' + esc(q.on) + ' by ' + esc(q.by) +
        (q.own ? "" : '<br><span style="color:#94a3b8">Another executive\u2019s quote - amounts hidden.</span>') + '</div></div>';
    });
    (r.challans || []).length && (h += '<h3 style="margin:14px 0 8px;font-size:14px">Challans</h3>');
    (r.challans || []).forEach(function (c) {
      h += '<div class="card"><h3>' + esc(c.no) + ' <span class="pill teal">' + esc(c.status || "Draft") + '</span></h3>' +
        '<div class="meta">' + esc(c.client || "") + (c.site ? ' &middot; ' + esc(c.site) : "") +
        (c.own && c.amount ? '<br>' + money(c.amount) : "") + '<br>' + esc(c.on) + ' by ' + esc(c.by) + '</div></div>';
    });
    (r.sites || []).length && (h += '<h3 style="margin:14px 0 8px;font-size:14px">Sites</h3>');
    (r.sites || []).forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.name) + ' <span class="pill teal">' + esc(x.stage || "") + '</span></h3>' +
        '<div class="meta">' + esc(x.client || "") + '</div></div>';
    });
    return h;
  }

  function renderLogin(err) {
    document.getElementById("root").innerHTML =
      '<div class="login-wrap"><div class="login">' +
      '<img class="logo" src="' + LOGO + '" alt="Energy World" onerror="this.style.display=\'none\'"/>' +
      '<h1>Energy World - Team</h1>' +
      '<p>Your own name and your own PIN. Never share them.</p>' +
      (err ? '<div class="pill due" style="display:block;text-align:center;padding:8px">' + esc(err) + '</div>' : '') +
      '<label for="ln">Your name</label>' +
      '<input id="ln" placeholder="e.g. Vivek Verma" autocomplete="username"/>' +
      '<label for="lp">Your PIN</label>' +
      '<input id="lp" type="password" inputmode="numeric" autocomplete="current-password" placeholder="4-digit PIN"/>' +
      '<div style="height:18px"></div>' +
      '<button class="btn full" data-act="login">Sign in</button>' +
      (bioSaved() && bioAvailable()
        ? '<div style="height:10px"></div><button class="btn full ghost" data-act="bio-unlock">Unlock with Face ID / fingerprint</button>'
        : '') +
      '<div class="foot-note">v' + APP_VERSION + ' - updates apply automatically on each login.</div>' +
      '</div></div>';
    var p = el("lp");
    if (p) p.addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    var n = el("ln");
    if (n) n.addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  }

  function doLogin() {
    var pin = val("lp"), name = val("ln");
    if (!name) { renderLogin("Enter your name."); return; }
    if (!pin) { renderLogin("Enter your PIN."); return; }
    S.user = name; S.pin = pin;
    api("teamAuth", { ua: navigator.userAgent }).then(function (r) {
      if (!r || !r.ok) { S.pin = ""; renderLogin((r && r.error) || "Could not sign in."); return; }
      S.user = r.user.name; S.role = r.user.role; S.pinSet = r.user.pinSet;
      try { localStorage.setItem(STORE, JSON.stringify({ pin: pin, user: S.user, role: S.role, pinSet: S.pinSet })); } catch (e) {}
      if (String(S.pinSet).toUpperCase() !== "Y") { renderPinChange(); return; }
      S.tab = (ROLE_TABS[S.role] || ["dash"])[0];
      loadCatalog();
      refresh();
    }).catch(function () { S.pin = ""; renderLogin("Network error. Try again."); });
  }

  function renderPinChange(err) {
    document.getElementById("root").innerHTML =
      '<div class="login-wrap"><div class="login">' +
      '<h1>Set your own PIN</h1>' +
      '<p>You are signed in with a temporary PIN. Choose a private one before you continue - nobody else should know it.</p>' +
      (err ? '<div class="pill due" style="display:block;text-align:center;padding:8px">' + esc(err) + '</div>' : '') +
      '<label>New PIN (4-8 digits)</label><input id="np1" type="password" inputmode="numeric"/>' +
      '<label>Repeat new PIN</label><input id="np2" type="password" inputmode="numeric"/>' +
      '<div style="height:18px"></div>' +
      '<button class="btn full" data-act="pin-save">Save PIN</button>' +
      '<div class="foot-note">Signed in as ' + esc(S.user) + '</div></div></div>';
  }

  function logout() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    S.pin = ""; S.user = ""; S.role = "";
    renderLogin();
  }

  function viewDash() {
    /* every figure on a sales exec's dashboard is THEIR book only: their reminders, their
       customers, their clients' challans. Admin/accounts still see the whole company. */
    var mineF = function (f) { return seesAllClients() || f.createdBy === S.user || isMineClient(f.customerName); };
    var open = openFollowups().filter(mineF);
    var overdue = open.filter(function (f) { return daysTo(f.dueDate) < 0; });
    var due = open.filter(function (f) { return daysTo(f.dueDate) === 0; });
    /* v6.9.105: live tiles - count the REAL book (clients sheet), not the legacy customers
       table those two tiles used to read. Same role scoping as every other screen. */
    var book = (S.data.clients || []).filter(function (c) { return seesAllClients() || isMineClient(c.name); });
    var liveClients = book.filter(function (c) { return isClient(c.name); });
    var liveLeads = book.length - liveClients.length;
    var myCh = (S.data.challans || []).filter(function (c) { return seesAllClients() || isMineClient(c.customerName); });
    var sales = myCh.reduce(function (a, c) { return a + challanNet(c); }, 0);
    var comm = myCh.reduce(function (a, c) { return a + (Number(c.commissionAmt) || 0); }, 0);

    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + liveClients.length + '</div><div class="l">Clients</div></div>' +
      '<div class="stat ' + (overdue.length ? 'alert' : '') + '"><div class="n">' + overdue.length + '</div><div class="l">Follow-ups overdue</div></div>' +
      '<div class="stat"><div class="n">' + due.length + '</div><div class="l">Due today</div></div>' +
      '<div class="stat"><div class="n">' + liveLeads + '</div><div class="l">Leads</div></div>' +
      '<div class="stat"><div class="n">' + money(sales) + '</div><div class="l">Challan value</div></div>' +
      (seesAllClients() ? '<div class="stat"><div class="n">' + money(comm) + '</div><div class="l">Incentive owed</div></div>' : '') +
      '</div>';

    var todo = overdue.concat(due);
    h += '<h3 style="margin:0 0 10px;font-size:15px">Today: ' + todo.length + ' to call</h3>';
    if (!todo.length) h += '<div class="empty">Nothing due. Add a follow-up so nobody slips.</div>';
    todo.sort(function (a, b) { return daysTo(a.dueDate) - daysTo(b.dueDate); });
    todo.forEach(function (f) {
      var c = custById(f.customerId);
      var d = daysTo(f.dueDate);
      h += '<div class="card">' +
        '<h3>' + esc(f.customerName || "(customer)") +
        ' <span class="pill ' + (d < 0 ? 'due' : 'soon') + '">' + (d < 0 ? Math.abs(d) + 'd overdue' : 'due today') + '</span></h3>' +
        '<div class="meta">' + esc(f.note || "-") +
        (c && c.mobile ? '<br>Mobile: ' + esc(c.mobile) : '') +
        (c && c.stage ? '<br>Stage: ' + esc(c.stage) : '') + '</div>' +
        '<div class="acts">' +
        (c && c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : '') +
        '<button class="btn sm" data-act="fu-done" data-id="' + esc(f.id) + '">Mark done</button>' +
        (c ? '<button class="btn sm ghost" data-act="cust-open" data-id="' + esc(c.id) + '">Open customer</button>' : '') +
        '</div></div>';
    });
    return h;
  }

  function viewCustomers() {
    var q = S.q.toLowerCase();
    var list = S.data.customers.filter(function (c) {
      if (!q) return true;
      return (c.name + " " + c.mobile + " " + c.city + " " + c.site + " " + c.associate).toLowerCase().indexOf(q) >= 0;
    });
    var h = '<div class="row">' +
      '<input class="grow" id="q" placeholder="Search name, mobile, city, site..." value="' + esc(S.q) + '"/>' +
      '<button class="btn" data-act="cust-new">+ New customer</button></div>';
    if (!list.length) h += '<div class="empty">No customers yet. Add your first one.</div>';
    list.forEach(function (c) {
      var pitch = PITCH[c.stage] || [];
      h += '<div class="card">' +
        '<h3>' + esc(c.name) + ' <span class="pill ' + esc(c.status || "") + '">' + esc(c.status || "-") + '</span>' +
        (c.type ? ' <span class="pill">' + esc(c.type) + '</span>' : '') + '</h3>' +
        '<div class="meta">' +
        (c.mobile ? esc(c.mobile) + ' &middot; ' : '') + esc(c.city || "") +
        (c.site ? '<br>Site: ' + esc(c.site) : '') +
        (c.stage ? '<br>Stage: <b>' + esc(c.stage) + '</b>' : '') +
        (c.associate ? '<br>Associate: ' + esc(c.associate) : '') +
        (c.notes ? '<br>' + esc(c.notes) : '') +
        (pitch.length ? '<br><span class="pill teal">Pitch now: ' + esc(pitch.join(", ")) + '</span>' : '') +
        '</div>' +
        '<div class="acts">' +
        (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : '') +
        '<button class="btn sm" data-act="fu-new" data-id="' + esc(c.id) + '">Follow-up</button>' +
        '<button class="btn sm ghost" data-act="ch-new" data-id="' + esc(c.id) + '">Challan</button>' +
        '<button class="btn sm ghost" data-act="cust-open" data-id="' + esc(c.id) + '">Edit</button>' +
        '</div></div>';
    });
    return h;
  }

  function viewFollowups() {
    var h = '';

    /* ---- Follow-up radar: quotes that need chasing ---- */
    var radarAll = radarQuotes();
    var seg = S.radarSeg || "";
    var radar = seg ? radarAll.filter(function (q) { return segOf(q.client) === seg; }) : radarAll;
    var segCount = function (s) { return radarAll.filter(function (q) { return segOf(q.client) === s; }).length; };
    h += '<div class="card" style="border-color:' + (radar.length ? '#fecaca' : '#bbf7d0') + ';background:' + (radar.length ? '#fff5f5' : '#f0fdf4') + '">' +
      '<h3 style="margin:0">Follow-up radar ' +
      (radar.length ? '<span class="pill due">' + radar.length + ' to chase</span>' : '<span class="pill Won">all clear</span>') +
      '</h3><div class="meta" style="margin-top:2px">Open quotes (Sent / Negotiating) with no update for ' + RADAR_MIN + '+ days.</div>' +
      '<div class="row" style="margin-top:8px">' +
      '<button class="btn sm ' + (seg ? "ghost" : "") + '" data-act="rad-seg" data-s="">All (' + radarAll.length + ')</button>' +
      '<button class="btn sm ' + (seg === "Residential" ? "" : "ghost") + '" data-act="rad-seg" data-s="Residential">Residential (' + segCount("Residential") + ')</button>' +
      '<button class="btn sm ' + (seg === "Project" ? "" : "ghost") + '" data-act="rad-seg" data-s="Project">Projects (' + segCount("Project") + ')</button>' +
      '</div></div>';
    radar.forEach(function (q) {
      var days = qSilentDays(q);
      var b = radarBucket(days);
      var qseg = segOf(q.client);
      h += '<div class="card"><h3>' + esc(q.client) +
        ' <span class="pill ' + b.cls + '">' + b.label + ' &middot; ' + days + 'd</span>' +
        (qseg ? ' <span class="pill" style="background:' + (qseg === "Project" ? "#e0e7ff;color:#3730a3" : "#dcfce7;color:#166534") + '">' + esc(qseg) + '</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(q.quoteNo) + (q.brand ? ' &middot; ' + esc(q.brand) : '') + '<br>' +
        esc(moneyAscii(q.net)) + ' (GST as applicable) &middot; ' + esc(q.status) +
        (S.role === "admin" && q.createdBy ? ' &middot; ' + esc(q.createdBy) : '') + '</div>' +
        '<div class="acts">' +
        '<button class="btn sm" data-act="q-pdf" data-id="' + esc(q.id) + '">Download PDF</button>' +
        '<button class="btn sm ghost" data-act="q-tg" data-id="' + esc(q.id) + '">Telegram</button>' +
        '<button class="btn sm ghost" data-act="rad-status" data-id="' + esc(q.id) + '" data-s="Won">Won</button>' +
        '<button class="btn sm ghost" data-act="rad-status" data-id="' + esc(q.id) + '" data-s="Lost">Lost</button>' +
        '<button class="btn sm ghost" data-act="rad-snooze" data-id="' + esc(q.id) + '">Snooze</button>' +
        '</div></div>';
    });

    /* ---- manual reminders — a sales exec sees only their own (made by them or on their client) ---- */
    var mineFu = function (f) { return seesAllClients() || f.createdBy === S.user || isMineClient(f.customerName); };
    var open = openFollowups().filter(mineFu).sort(function (a, b) { return daysTo(a.dueDate) - daysTo(b.dueDate); });
    var done = S.data.followups.filter(function (f) { return f.status === "Done"; }).filter(mineFu).slice(-10).reverse();
    h += '<div class="row" style="margin-top:18px"><h3 style="margin:0;font-size:15px">Your reminders</h3>' +
      '<div class="grow"></div><button class="btn" data-act="fu-new">+ New follow-up</button></div>';
    if (!open.length) h += '<div class="empty">No open reminders.</div>';
    open.forEach(function (f) {
      var d = daysTo(f.dueDate);
      var lbl = d < 0 ? Math.abs(d) + 'd overdue' : (d === 0 ? 'due today' : 'in ' + d + 'd');
      h += '<div class="card"><h3>' + esc(f.customerName || "(customer)") +
        ' <span class="pill ' + (d < 0 ? 'due' : (d === 0 ? 'soon' : '')) + '">' + lbl + '</span></h3>' +
        '<div class="meta">' + esc(f.note || "-") + '<br>Due ' + esc(dstr(f.dueDate)) + ' &middot; ' + esc(f.createdBy || "") + '</div>' +
        '<div class="acts"><button class="btn sm" data-act="fu-done" data-id="' + esc(f.id) + '">Mark done</button></div></div>';
    });
    if (done.length) {
      h += '<h3 style="margin:20px 0 10px;font-size:15px;color:#64748b">Recently done</h3>';
      done.forEach(function (f) {
        h += '<div class="card"><div class="meta"><b>' + esc(f.customerName) + '</b> - ' + esc(f.note || "") + '</div></div>';
      });
    }
    return h;
  }

  /* legacy viewChallans removed: a second, older definition sat further down the file and,
     because function declarations hoist, it silently overrode the current one. That is why the
     rebuilt form never appeared. Do not reintroduce a duplicate name in this file. */

  /* legacy viewCommission removed. It was mapped over the incentive engine by a duplicate
     key in the views object, so the Incentives tab was showing a raw sum of stored figures
     with no GST strip and no collection gate. Do not reintroduce it. */

  function viewPitch() {
    var h = '<div class="empty" style="padding:6px 0 16px;text-align:left">Pick the stage the site is at and pitch what fits. Customers are grouped by their current stage.</div>';
    STAGES.forEach(function (st) {
      var cs = S.data.customers.filter(function (c) { return c.stage === st; });
      var p = PITCH[st] || [];
      h += '<div class="card"><h3>' + esc(st) + ' <span class="pill">' + cs.length + ' customer(s)</span></h3>' +
        '<div class="meta"><b>Pitch:</b> ' + esc(p.join(", ") || "-") +
        (cs.length ? '<br><b>Who:</b> ' + esc(cs.map(function (c) { return c.name; }).join(", ")) : '') +
        '</div></div>';
    });
    return h;
  }

  function opts(list, sel) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join("");
  }

  function modalCustomer(c) {
    c = c || {};
    return '<h2>' + (c.id ? "Edit customer" : "New customer") + '</h2>' +
      '<p class="sub">Site and stage drive what you pitch next.</p>' +
      '<label>Name</label><input id="m_name" value="' + esc(c.name) + '"/>' +
      '<div class="grid2">' +
      '<div><label>Mobile</label><input id="m_mobile" inputmode="numeric" value="' + esc(c.mobile) + '"/></div>' +
      '<div><label>City</label><input id="m_city" value="' + esc(c.city) + '"/></div>' +
      '</div>' +
      '<label>Address</label><input id="m_address" value="' + esc(c.address) + '"/>' +
      '<label>Site / project</label><input id="m_site" value="' + esc(c.site) + '"/>' +
      '<div class="grid2">' +
      '<div><label>Type</label><select id="m_type">' + opts([""].concat(TYPES), c.type) + '</select></div>' +
      '<div><label>Status</label><select id="m_status">' + opts(STATUSES, c.status || "Warm") + '</select></div>' +
      '</div>' +
      '<label>Construction stage</label><select id="m_stage">' + opts(STAGES, c.stage || STAGES[0]) + '</select>' +
      '<label>Referred by (partner)</label><select id="m_assoc">' + opts([""].concat(S.data.associates.map(function (a) { return a.name; })), c.associate) + '</select>' +
      '<label>Notes</label><textarea id="m_notes">' + esc(c.notes) + '</textarea>' +
      '<div class="foot">' +
      '<button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="cust-save" data-id="' + esc(c.id || "") + '">Save</button>' +
      '</div>';
  }

  function modalFollowup(f) {
    f = f || {};
    var cs = S.data.customers.map(function (c) { return c.name; });
    var pre = f.customerId ? (custById(f.customerId) || {}).name : "";
    return '<h2>New follow-up</h2><p class="sub">Nothing gets forgotten if it has a date.</p>' +
      '<label>Customer</label><select id="m_cust">' + opts(cs, pre) + '</select>' +
      '<label>Follow up on</label><input id="m_due" type="date" value="' + esc(f.dueDate || today()) + '"/>' +
      '<label>What to do / discuss</label><textarea id="m_note">' + esc(f.note) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="fu-save">Save</button></div>';
  }

  function modalSnooze(q) {
    var due5 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    return '<h2>Snooze ' + esc(q.quoteNo) + '</h2>' +
      '<p class="sub">Hides it from the radar until this date. It also appears in your reminders below.</p>' +
      '<label>Follow up on</label><input id="sn_due" type="date" value="' + due5 + '"/>' +
      '<label>Note</label><textarea id="sn_note">Chase ' + esc(q.quoteNo) + ' — ' + esc(q.client) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="sn-save" data-id="' + esc(q.id) + '">Snooze</button></div>';
  }

  /* legacy modalAssociate removed: a second, older definition sat further down the file and,
     because function declarations hoist, it silently overrode the current one. That is why the
     rebuilt form never appeared. Do not reintroduce a duplicate name in this file. */

  function lineRow(i, d, q, r) {
    return '<div class="lineitem" data-row="' + i + '">' +
      '<input class="li-d" list="prodlist" placeholder="Product code or name" value="' + esc(d || "") + '"/>' +
      '<input class="li-q" inputmode="numeric" placeholder="Qty" value="' + esc(q || "") + '"/>' +
      '<input class="li-r" inputmode="decimal" placeholder="Rate" value="' + esc(r || "") + '"/>' +
      '<button class="x" data-act="li-del" data-row="' + i + '">&times;</button></div>';
  }

  /* One-time injection of the picker styles. The site's base CSS lives in index.html; rather than
     ship a second file, the new brand/category picker brings its own styles the first time it draws
     so the whole change stays inside app.js. */
  function ensurePickerCss() {
    if (document.getElementById("ew_pick_css")) return;
    var s = document.createElement("style");
    s.id = "ew_pick_css";
    s.textContent =
      ".ew-picklabel{font-size:12px;font-weight:700;color:#0f766e;margin:12px 0 7px;text-transform:uppercase;letter-spacing:.4px}" +
      ".ew-picklabel .step{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#0f766e;color:#fff;font-size:11px;margin-right:6px}" +
      ".ew-pickgrid{display:flex;flex-wrap:wrap;gap:8px}" +
      ".ew-pickbtn{border:1.5px solid #cbd5e1;background:#fff;border-radius:11px;padding:11px 15px;font-size:14px;font-weight:600;cursor:pointer;color:#0f172a;display:inline-flex;align-items:center;gap:7px;line-height:1}" +
      ".ew-pickbtn.brand{border-color:#0d9488;color:#0f766e;background:#f0fdfa}" +
      ".ew-pickbtn.brand:active,.ew-pickbtn.brand:hover{background:#ccfbf1}" +
      ".ew-pickbtn.cat{border-color:#a5b4fc;color:#3730a3;background:#eef2ff}" +
      ".ew-pickbtn.cat:active,.ew-pickbtn.cat:hover{background:#e0e7ff}" +
      ".ew-pickbtn .cnt{background:#0f766e;color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700}" +
      ".ew-pickbtn.cat .cnt{background:#4f46e5}" +
      ".ew-pickbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0 2px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px}" +
      ".ew-crumb{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer;color:#0f172a;display:inline-flex;align-items:center;gap:7px}" +
      ".ew-crumb .tag{font-size:9.5px;text-transform:uppercase;letter-spacing:.3px;color:#64748b;font-weight:700}" +
      ".ew-crumb .cx{color:#94a3b8;font-weight:700}" +
      ".ew-crumb:active,.ew-crumb:hover{border-color:#ef4444;color:#b91c1c}" +
      ".ew-crumb:hover .cx{color:#b91c1c}" +
      /* Product rows: a small thumbnail on the left, name + meta beside it, qty stepper on the right -
         the base CSS was showing a full-width photo. Override to a compact 54px thumbnail. */
      ".plist .prow{display:flex!important;align-items:center;gap:10px;padding:6px 2px;border-bottom:1px solid #eef2f7}" +
      ".plist .prow img,.plist .prow .noimg{width:54px!important;height:54px!important;min-width:54px;max-width:54px;object-fit:contain;border-radius:8px;background:#f8fafc;flex:0 0 54px}" +
      ".plist .prow .pinfo{flex:1 1 auto;min-width:0}" +
      ".plist .prow .pname{font-size:13.5px;font-weight:600;line-height:1.25}" +
      ".plist .prow .pmeta{font-size:11.5px;color:#94a3b8}" +
      ".plist .prow .pqty{flex:0 0 auto;display:flex;align-items:center;gap:6px}" +
      ".plist .prow .pqty .ch-q{width:56px;text-align:center}" +
      /* Colour-coded stage actions, so Approve / Dispatch / Receipt / Billing read apart at a glance.
         Blue = authorise, Orange = releases material, Teal = goods in, Purple/Indigo = billing. */
      ".btn.act-approve{background:#2563eb!important;border-color:#2563eb!important;color:#fff!important}" +
      ".btn.act-dispatch{background:#ea580c!important;border-color:#ea580c!important;color:#fff!important}" +
      ".btn.act-receipt{background:#0d9488!important;border-color:#0d9488!important;color:#fff!important}" +
      ".btn.act-bill{background:#7c3aed!important;border-color:#7c3aed!important;color:#fff!important}" +
      ".btn.act-billedit{background:#fff!important;border-color:#7c3aed!important;color:#7c3aed!important}" +
      ".btn.act-billsend{background:#4f46e5!important;border-color:#4f46e5!important;color:#fff!important}" +
      ".btn.act-reset{background:#fff!important;border-color:#dc2626!important;color:#dc2626!important}" +
      ".btn.act-reset:hover{background:#fef2f2!important}" +
      /* Grouped challan book: a solid teal band per sales exec, a lighter left-ruled strip per client. */
      ".ch-exec{margin:20px 0 4px;padding:9px 13px;background:#0f766e;color:#fff;border-radius:10px;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px}" +
      ".ch-exec .sub{font-size:11px;font-weight:600;background:rgba(255,255,255,.2);padding:2px 9px;border-radius:999px;white-space:nowrap}" +
      ".ch-client{margin:12px 0 6px;padding:6px 11px;border-left:4px solid #0d9488;background:#f0fdfa;border-radius:0 8px 8px 0;font-weight:700;font-size:13.5px;color:#134e4a;display:flex;justify-content:space-between;align-items:center;gap:8px}" +
      ".ch-client .sub{font-size:11px;font-weight:600;color:#0f766e;background:#ccfbf1;padding:2px 8px;border-radius:999px;white-space:nowrap}" +
      /* Compact lead/client cards: one header line (name+pills left, PL/AR badges + Call/Edit
         right), one scrollable brand line. PL/AR badge: green = named (with phone), red = fill. */
      ".card.lc-compact{padding:8px 12px;margin-bottom:6px}" +
      ".lc-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}" +
      ".lc-id{display:flex;align-items:center;gap:6px;min-width:0;flex:1 1 240px;overflow:hidden}" +
      ".lc-id b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".lc-right{display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}" +
      ".pl-badge{font-size:11px;font-weight:700;border-radius:999px;padding:4px 9px;white-space:nowrap;border:0}" +
      ".pl-ok{background:#dcfce7;color:#15803d}" +
      ".pl-miss{background:#fee2e2;color:#b91c1c;cursor:pointer}" +
      ".pl-miss:hover{background:#fecaca}";
    document.head.appendChild(s);
  }

  /* Product picker for a challan — deliberately ONE step at a time so a brand can never be mistaken
     for a category. Step 1 shows only brands (teal). Pick one and it collapses to a breadcrumb; Step
     2 shows only that brand's categories (indigo). Pick one and Step 3 lists the products with photo
     and a +/- stepper. Tap a breadcrumb's × to change that level. The photo is there to stop picking
     the wrong 110mm fitting - it never reaches the printed challan. */
  function chPicker() {
    ensurePickerCss();
    var z = S.ch;
    var brands = (S.data.brands || []).filter(function (br) {
      return String(br.active || "Y").toUpperCase() !== "N" && brandProducts(br.brand).length;
    });

    /* STEP 1 — no brand yet: show ONLY brands */
    if (!z.brand) {
      return '<div class="ew-picklabel"><span class="step">1</span>Tap a brand</div>' +
        '<div class="ew-pickgrid">' + brands.map(function (br) {
          return '<button class="ew-pickbtn brand" data-act="ch-brand" data-brand="' + esc(br.brand) + '">' + esc(br.brand) + '</button>';
        }).join("") + '</div>';
    }

    /* brand chosen — a breadcrumb bar; tap a crumb's × to go back a level */
    var bar = '<div class="ew-pickbar">' +
      '<button class="ew-crumb" data-act="ch-brandclear"><span class="tag">Brand</span> ' + esc(z.brand) + ' <span class="cx">&#10005;</span></button>' +
      (z.family ? '<button class="ew-crumb" data-act="ch-famclear"><span class="tag">Category</span> ' + esc(z.family) + ' <span class="cx">&#10005;</span></button>' : '') +
      '</div>';

    /* STEP 2 — brand but no category: show ONLY that brand's categories */
    if (!z.family) {
      var fams = familyList(z.brand);
      return bar + '<div class="ew-picklabel"><span class="step">2</span>Tap a category in ' + esc(z.brand) + ' &middot; ' + fams.length + '</div>' +
        '<div class="ew-pickgrid">' + fams.map(function (f) {
          var n = brandProducts(z.brand).filter(function (p) { return p.family === f; }).length;
          return '<button class="ew-pickbtn cat" data-act="ch-fam" data-fam="' + esc(f) + '">' + esc(f) + ' <span class="cnt">' + n + '</span></button>';
        }).join("") + '</div>';
    }

    /* STEP 3 — products in the chosen brand+category */
    var h = bar + '<div class="ew-picklabel"><span class="step">3</span>Set quantities</div><div class="plist">';
    brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
      var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
      h += '<div class="prow ' + (ex ? "picked" : "") + '">' +
        (p.pic ? '<img src="' + esc(p.pic) + '" loading="lazy"/>' : '<div class="noimg"></div>') +
        '<div class="pinfo"><div class="pname">' + esc(p.desc) + '</div>' +
        '<div class="pmeta">' + esc(p.code) + ' &middot; ' + esc(p.unit) + '</div></div>' +
        '<div class="pqty">' +
        '<button class="stp" data-act="ch-qty" data-code="' + esc(p.code) + '" data-d="-1">&minus;</button>' +
        '<input class="ch-q" data-code="' + esc(p.code) + '" inputmode="numeric" value="' + esc(ex ? ex.qty : "") + '" placeholder="0"/>' +
        '<button class="stp" data-act="ch-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  /* Old material, typed in from the books. Deliberately its own form and not a tick-box on the
     live challan screen: a "do not notify" checkbox sitting next to a real challan is a mis-tap
     waiting to happen, and the cost of that mistake is a client who never gets his delivery. */
  function modalOldChallan() {
    if (!S.oc) S.oc = { brand: "", family: "", items: [] };
    var z = S.oc;
    var clients = S.data.clients.map(function (x) { return x.name; });
    return '<h2>Enter an old delivery</h2>' +
      '<div class="card" style="border-color:#fde68a;background:#fffbeb;margin-bottom:10px">' +
      '<div class="meta">For material already delivered before this app. It is saved straight as ' +
      '<b>Received</b> with the date you give, and <b>no Telegram message is sent to anyone</b>.' +
      '<br>For material going out today, use <b>+ New challan</b> instead.</div></div>' +
      clientField("o_client", (S.oc && S.oc.client) || "") +
      '<div class="grid2">' +
      '<div><label>Date it was delivered</label><input id="o_date" type="date" value="' + today() + '"/></div>' +
      '<div><label>Old challan no. (optional)</label><input id="o_no" placeholder="leave blank to auto-number"/></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Site (optional)</label><input id="o_site"/></div>' +
      '<div><label>Bill no. (if already billed)</label><input id="o_bill"/></div>' +
      '</div>' +
      '<h3 style="margin:14px 0 4px;font-size:14px">Products ' +
      '<span class="pill teal">' + (z.items || []).length + ' picked</span></h3>' +
      ocPicker() +
      '<div class="foot"><button class="btn ghost" data-act="oc-close">Cancel</button>' +
      '<button class="btn" data-act="oc-save">Save old delivery (sends nothing)</button></div>';
  }

  function ocPicker() {
    var z = S.oc;
    var h = '<div class="row" style="margin-top:6px">' + (S.data.brands || []).filter(function (br) {
      return String(br.active || "Y").toUpperCase() !== "N" && brandProducts(br.brand).length;
    }).map(function (br) {
      return '<button class="chip ' + (z.brand === br.brand ? "on" : "") + '" data-act="oc-brand" data-brand="' + esc(br.brand) + '">' + esc(br.brand) + '</button>';
    }).join("") + '</div>';
    if (!z.brand) return h + '<div class="empty">Pick a brand.</div>';
    h += '<div class="chips">' + familyList(z.brand).map(function (f) {
      return '<button class="chip ' + (z.family === f ? "on" : "") + '" data-act="oc-fam" data-fam="' + esc(f) + '">' + esc(f) + '</button>';
    }).join("") + '</div>';
    if (!z.family) return h + '<div class="empty">Pick a family above.</div>';
    h += '<div class="plist">';
    brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
      var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
      h += '<div class="prow ' + (ex ? "picked" : "") + '">' +
        (p.pic ? '<img src="' + esc(p.pic) + '" loading="lazy"/>' : '<div class="noimg"></div>') +
        '<div class="pinfo"><div class="pname">' + esc(p.desc) + '</div>' +
        '<div class="pmeta">' + esc(p.code) + ' &middot; ' + money(p.price) + '</div></div>' +
        '<div class="pqty">' +
        '<button class="stp" data-act="oc-qty" data-code="' + esc(p.code) + '" data-d="-1">&minus;</button>' +
        '<b>' + (ex ? ex.qty : 0) + '</b>' +
        '<button class="stp" data-act="oc-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  function modalChallan() {
    if (!S.ch) S.ch = { brand: "", family: "", items: [] };
    var z = S.ch;
    var clients = S.data.clients.map(function (x) { return x.name; });
    var sites = S.data.sites.map(function (x) { return x.name; });
    var picked = (z.items || []).slice().sort(function (a, b) { return (Number(b.qty) || 0) - (Number(a.qty) || 0); });
    var isEdit = !!(z && z.editId);
    return '<h2>' + (isEdit ? 'Edit challan ' + esc(z.editNo || "") : 'New delivery challan') + '</h2>' +
      '<p class="sub">The printed challan carries no prices and no pictures - it is a delivery note, not a quote.</p>' +
      (isEdit && z.editStatus === "Approved" ? '<div class="empty" style="text-align:left;padding:0 0 10px;color:#b45309">This challan is <b>Approved</b>. Saving a change sends it back to <b>Draft</b> so it must be approved again before dispatch - approval releases material and can\'t carry over to changed contents.</div>' : "") +
      ((z && z.fromQuote) ? '<div class="empty" style="text-align:left;padding:0 0 10px;color:#0d9488">Pre-filled from quote <b>' + esc(z.fromQuote) + '</b> - review the products and discount, then create.</div>' : "") +
      '<label>Location</label><select id="m_loc">' + opts(LOCATIONS, (z && z.loc) || LOCATIONS[0]) + '</select>' +
      clientField("m_client", (S.ch && S.ch.client) || "") +
      '<label>Site (optional)</label><input id="m_site" list="sitelist" placeholder="Site / project" value="' + esc((z && z.site) || "") + '"/>' +
      '<datalist id="sitelist">' + sites.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>' +
      '<label>Referring partner (optional)</label><select id="m_assoc">' +
      opts([""].concat((S.data.associates || []).map(function (p) { return p.name; })), (z && z.assoc) || "") + '</select>' +

      '<h3 style="margin:14px 0 4px;font-size:14px">Products ' +
      '<span class="pill teal">' + picked.length + ' picked</span></h3>' +
      chPicker() +
      (picked.length
        ? '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0">' +
            '<thead><tr style="background:#0b3b36;color:#fff">' +
            '<th style="padding:7px 8px;text-align:left;width:36px">#</th>' +
            '<th style="padding:7px 8px;text-align:left">Product</th>' +
            '<th style="padding:7px 8px;text-align:center;width:96px">Qty</th>' +
            '<th style="width:38px"></th></tr></thead><tbody>' +
            picked.map(function (i, idx) {
              return '<tr style="border-bottom:1px solid #e2e8f0;background:' + (idx % 2 ? '#f8fafc' : '#fff') + '">' +
                '<td style="padding:6px 8px;color:#64748b;font-weight:700">' + (idx + 1) + '</td>' +
                '<td style="padding:6px 8px"><b>' + esc(i.desc) + '</b><br><span style="font-size:11px;color:#94a3b8">' + esc(i.code) + '</span></td>' +
                '<td style="padding:4px 6px;text-align:center"><input class="ch-q" data-code="' + esc(i.code) + '" inputmode="numeric" value="' + esc(i.qty) + '" style="width:76px;text-align:center;padding:7px;font-size:15px;font-weight:700;border:1px solid #cbd5e1;border-radius:6px"/></td>' +
                '<td style="text-align:center"><button class="stp" data-act="ch-qty" data-code="' + esc(i.code) + '" data-d="-1" title="reduce by one">&minus;</button></td>' +
                '</tr>';
            }).join("") +
            '</tbody></table></div>' +
            '<div style="text-align:right;font-size:12.5px;color:#64748b;margin-top:5px">' +
            '<b>' + picked.length + '</b> line(s) &middot; <b>' +
            picked.reduce(function (a, i) { return a + (Number(i.qty) || 0); }, 0) + '</b> units total</div>'
        : "") +

      '<div class="grid2" style="margin-top:10px">' +
      '<div><label>Freight / tempo fare</label><input id="m_freight" inputmode="numeric" value="' + esc((z && z.freight != null) ? z.freight : 0) + '"/></div>' +
      '<div><label>Freight borne by</label><select id="m_fto">' + opts(["Client", "Energy World"], (z && z.fto) || "Client") + '</select></div>' +
      '</div>' +
      /* The bargain. Enter it once, here, and every line quietly remembers what the client
         ACTUALLY paid - so if 5 of 20 come back later, he is credited what he paid, not the
         list price. Without this the credit is always slightly too generous and the leak is
         invisible, because each one looks fair on its own. */
      '<div class="grid2">' +
      '<div><label>Discount given on the whole challan</label><input id="m_disc" inputmode="numeric" placeholder="0" value="' + esc((z && z.disc != null) ? z.disc : 0) + '"' + (canSetPricing() ? '' : ' readonly title="Only the owner can set a discount" style="background:#f1f5f9;color:#94a3b8"') + '/></div>' +
      '<div><label>Why (optional)</label><input id="m_discnote" placeholder="bargained on site" value="' + esc((z && z.discnote) || "") + '"' + (canSetPricing() ? '' : ' readonly') + '/></div>' +
      '</div>' +
      '<div class="grid2" style="margin-top:6px">' +
      '<div><label>Driver</label><input id="m_driver" list="driverlist" placeholder="Driver name" value="' + esc((z && z.driver) || "") + '"/>' +
      '<datalist id="driverlist">' + (S.data.drivers || []).map(function (d) {
        return '<option value="' + esc(d.name) + '"></option>';
      }).join("") + '</datalist></div>' +
      '<div><label>Driver mobile</label><input id="m_dmob" inputmode="numeric" placeholder="10 digits" value="' + esc((z && z.dmob) || "") + '"/></div>' +
      '</div>' +
      '<label>Vehicle number</label><input id="m_veh" placeholder="HR-06-AB-1234" value="' + esc((z && z.veh) || "") + '"/>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="ch-save">' + (isEdit ? 'Save changes' : 'Create challan') + '</button></div>';
  }

  function buildPdf(ch, cust, lines) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "mm", format: "a4" });
    var W = 210, y = 0;

    doc.setFillColor(15, 118, 110); doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("ENERGY WORLD", 14, 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Save Energy, Money and Earth", 14, 18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("DELIVERY CHALLAN", W - 14, 14, { align: "right" });

    doc.setTextColor(15, 23, 42); y = 38;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Challan No: " + ch.challanNo, 14, y);
    doc.text("Date: " + today(), W - 14, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Customer: " + (cust.name || "-"), 14, y); y += 5.5;
    if (cust.mobile) { doc.text("Mobile: " + cust.mobile, 14, y); y += 5.5; }
    if (cust.site) { doc.text("Site: " + cust.site, 14, y); y += 5.5; }
    if (cust.address) { doc.text("Address: " + cust.address, 14, y); y += 5.5; }

    y += 4;
    doc.setFillColor(241, 245, 249); doc.rect(14, y - 5, W - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item", 17, y); doc.text("Qty", 130, y, { align: "right" });
    doc.text("Rate", 155, y, { align: "right" }); doc.text("Amount", W - 17, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal");
    lines.forEach(function (l) {
      doc.text(String(l.d).slice(0, 55), 17, y);
      doc.text(String(l.q), 130, y, { align: "right" });
      doc.text(String(l.r), 155, y, { align: "right" });
      doc.text(String(l.q * l.r), W - 17, y, { align: "right" });
      y += 6.5;
      if (y > 250) { doc.addPage(); y = 25; }
    });

    y += 3;
    doc.setDrawColor(226, 232, 240); doc.line(14, y, W - 14, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Total: Rs " + ch.amount, W - 17, y, { align: "right" });

    y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text("Received the above goods in good condition.", 14, y);
    doc.text("Prepared by: " + ch.createdBy, 14, y + 6);
    doc.text("Receiver signature", W - 17, y + 6, { align: "right" });

    return doc.output("datauristring").split(",")[1];
  }

  /* Leads hub: prospect Sites + Site visits + the Brand desk in one tab. Sub-tabs are shown
     only for the pieces this role may see; the Brand desk (viewLeads) is the tab itself. */
  function viewLeadsHub() {
    var tabs = [["board", "Leads"]];
    if (canSee("sites")) tabs.push(["sites", "Sites"]);
    if (canSee("visits")) tabs.push(["visits", "Site visits"]);
    var sub = S.leadsSub || tabs[0][0];
    if (!tabs.some(function (t) { return t[0] === sub; })) sub = tabs[0][0];
    var h = '<div class="row" style="margin-bottom:10px">' + tabs.map(function (t) {
      return '<button class="btn sm ' + (sub === t[0] ? "" : "ghost") + '" data-act="leads-sub" data-s="' + t[0] + '">' + t[1] + '</button>';
    }).join("") + '</div>';
    return h + (sub === "sites" ? viewSites() : (sub === "visits" ? viewVisits() : viewLeadBoard()));
  }

  /* Quotes hub: quotations + Win/Loss (quote outcomes) as sub-tabs instead of two tabs. */
  function viewQuotesHub() {
    var sub = S.quotesSub === "winloss" && canSee("winloss") ? "winloss" : "quotes";
    var h = '<div class="row" style="margin-bottom:10px">' +
      '<button class="btn sm ' + (sub === "quotes" ? "" : "ghost") + '" data-act="quotes-sub" data-s="quotes">Quotations</button>' +
      (canSee("winloss") ? '<button class="btn sm ' + (sub === "winloss" ? "" : "ghost") + '" data-act="quotes-sub" data-s="winloss">Win / Loss</button>' : "") +
      '</div>';
    return h + (sub === "winloss" ? viewWinLoss() : viewQuotes());
  }

  /* Generic role-aware sub-tab hub: `pieces` = [[tabKey, label, viewFn], ...]; only pieces the
     role canSee are shown; `stateKey` holds the active sub on S. */
  function subHub(pieces, stateKey, actName) {
    var vis = pieces.filter(function (p) { return canSee(p[0]); });
    if (!vis.length) return '<div class="empty">Nothing here for your role.</div>';
    var sub = S[stateKey];
    if (!vis.some(function (p) { return p[0] === sub; })) sub = vis[0][0];
    var h = '<div class="row" style="margin-bottom:10px">' + vis.map(function (p) {
      return '<button class="btn sm ' + (sub === p[0] ? "" : "ghost") + '" data-act="' + actName + '" data-s="' + p[0] + '">' + esc(p[1]) + '</button>';
    }).join("") + '</div>';
    var chosen = vis.filter(function (p) { return p[0] === sub; })[0];
    return h + chosen[2]();
  }
  function viewCollections() {
    return subHub([["payments", "Payments", viewPayments], ["dues", "Client dues", viewDues]], "collSub", "coll-sub");
  }
  function viewPricing() {
    return subHub([["rates", "Rate revision", viewRates], ["pricelist", "Price list PDF", viewPriceList], ["catalogue", "Catalogue", viewCatalogue]], "priceSub", "price-sub");
  }
  function viewPayrollHub() {
    return subHub([["commission", "Incentives", viewIncentives], ["payroll", "Payroll", viewPayroll]], "payHubSub", "pay-sub");
  }

  /* ---------------- crash log ----------------
     Everything the app throws - an uncaught error, a rejected promise, or a screen that fails to
     render - is caught, the app is kept alive, and the error (time, app version, which tab, the
     message and stack) is written to a small rolling log in THIS browser (last 25). Tap the "vX"
     version in the footer to read it, or run ewCrashLog() in the browser console. This is what
     turns "it just crashed" into an actual reason. */
  var CRASH_KEY = "ew_crash_log";
  function logCrash(where, err) {
    try {
      var reason = err && err.reason;
      var msg = (err && err.message) || (reason && reason.message) || (err && String(err)) || "unknown error";
      var stack = (err && err.stack) || (reason && reason.stack) || "";
      var rec = { t: new Date().toISOString(), v: APP_VERSION,
        tab: (typeof S !== "undefined" && S && S.tab) || "",
        user: (typeof S !== "undefined" && S && S.user) || "",
        where: where || "", msg: String(msg).slice(0, 300), stack: String(stack).slice(0, 1400) };
      var log = [];
      try { log = JSON.parse(localStorage.getItem(CRASH_KEY) || "[]"); } catch (x) { }
      log.push(rec);
      if (log.length > 25) log = log.slice(-25);
      localStorage.setItem(CRASH_KEY, JSON.stringify(log));
    } catch (x) { }
  }
  function crashLogList() { try { return JSON.parse(localStorage.getItem(CRASH_KEY) || "[]"); } catch (e) { return []; } }
  window.ewCrashLog = crashLogList;
  window.addEventListener("error", function (ev) { logCrash("window.error", (ev && ev.error) || { message: ev && ev.message }); });
  window.addEventListener("unhandledrejection", function (ev) { logCrash("promise", ev); });
  function modalCrashLog() {
    var list = crashLogList().slice().reverse();
    var h = '<h2>Crash log</h2><p class="sub">Errors the app caught on this device &mdash; newest first. Send me a screenshot of this if something breaks.</p>';
    if (!list.length) h += '<div class="empty">No crashes recorded on this device. 🎉</div>';
    list.forEach(function (e) {
      h += '<div class="card"><h3 style="font-size:13px;color:#b91c1c">' + esc(e.msg || "error") + '</h3>' +
        '<div class="meta" style="font-size:11.5px">' + esc(String(e.t).replace("T", " ").slice(0, 19)) + ' &middot; v' + esc(e.v) + ' &middot; ' + esc(e.where || "") + (e.tab ? ' &middot; tab: ' + esc(e.tab) : "") + (e.user ? ' &middot; ' + esc(e.user) : "") + '</div>' +
        (e.stack ? '<pre style="white-space:pre-wrap;font-size:10px;color:#64748b;margin:6px 0 0;max-height:130px;overflow:auto">' + esc(e.stack) + '</pre>' : "") + '</div>';
    });
    h += '<div class="foot"><button class="btn ghost" data-act="crash-clear">Clear log</button>' +
      '<button class="btn" data-act="close">Close</button></div>';
    return h;
  }

  /* render() is the crash boundary: if anything inside blows up, log it and show a safe recovery
     screen instead of a frozen/blank app. The real work is in renderCore(). */
  function render() {
    try { renderCore(); try { syncBanner(); } catch (e) { } }
    catch (err) {
      logCrash("render", err);
      try {
        document.getElementById("root").innerHTML =
          '<div style="max-width:540px;margin:60px auto;padding:24px;font-family:system-ui,sans-serif;text-align:center">' +
          '<h2 style="color:#0f766e;margin:0 0 8px">Energy World hit a snag</h2>' +
          '<p style="color:#64748b">The app caught an error and paused to keep your data safe. Your saved data is untouched.</p>' +
          '<button onclick="location.reload()" style="padding:11px 20px;border:0;border-radius:10px;background:#0d9488;color:#fff;font-size:15px;cursor:pointer">Reload the app</button>' +
          '<p style="margin-top:16px;font-size:11px;color:#94a3b8">Saved to the crash log (v' + APP_VERSION + ').</p></div>';
      } catch (x) { }
    }
  }
  function renderCore() {
    if (!LOGO_PRE && S.data.logos && S.data.logos.length) { LOGO_PRE = 1; preloadLogos(); }
    if (!S.pin) { renderLogin(); return; }
    var views = { search: viewSearch, brandboard: viewBrandBoard, partners: viewPartners, leads: viewLeadsHub, brandfollow: viewBrandFollow, visits: viewVisits, commission: viewIncentives, payments: viewPayments, discounts: viewDiscounts, billing: viewBilling, catalogue: viewCatalogue, clients: viewClients, quotes: viewQuotesHub, service: viewService, spares: viewSpares, dues: viewDues, payroll: viewPayroll, dash: viewDash, sites: viewSites, matrix: viewMatrix, winloss: viewWinLoss, rules: viewRules, customers: viewCustomers, followups: viewFollowups, challans: viewChallans, returns: viewReturns, deliveries: viewDeliveries, collections: viewCollections, pricing: viewPricing, payrollhub: viewPayrollHub, tools: viewTools, rates: viewRates, pricelist: viewPriceList, report: viewReport, products: viewProducts, pitch: viewPitch, teampins: viewTeamPins };
    var tabs = [["search", "Search"], ["dash", "Today"], ["returns", "Material returns"], ["tools", "Tools"], ["report", "Monthly card"], ["rates", "Rate revision"], ["pricelist", "Price list PDF"], ["sites", "Sites"], ["winloss", "Win/Loss"], ["leads", "Leads"], ["brandfollow", "Brand follow-up"], ["visits", "Site visits"], ["customers", "Customers"], ["followups", "Follow-ups"], ["challans", "Challans"], ["deliveries", "Deliveries"], ["collections", "Collections"], ["pricing", "Pricing"], ["payrollhub", "Payroll & incentives"], ["clients", "Clients"], ["partners", "Partners"], ["quotes", "Quotes"], ["commission", "Incentives"], ["service", "Service"], ["spares", "Spares"], ["dues", "Client dues"], ["payroll", "Payroll"], ["products", "Products"], ["payments", "Payments"], ["billing", "HISAB"], ["discounts", "Discounts"], ["catalogue", "Catalogue"], ["rules", "Pitch rules"], ["teampins", "Team PINs"]];

    var h = '<div class="top">' +
      '<button class="burger" data-act="nav-toggle">&#9776;</button>' +
      '<img src="' + LOGO + '" alt="EW" onerror="this.style.display=\'none\'"/>' +
      '<div><b style="font-size:15px">Energy World</b><div style="font-size:12px;color:#64748b">Team workspace <span style="color:#94a3b8">&middot; v' + APP_VERSION + '</span></div></div>' +
      '<input id="gq" placeholder="Search anything — quote, challan, product, client, partner…" value="' + esc(S.gq || "") + '" autocomplete="off" ' +
      'style="flex:1;min-width:110px;max-width:380px;margin:0 14px;padding:9px 14px;border:1px solid #cbd5e1;border-radius:20px;font-size:14px;outline:none;background:#fff"/>' +
      '<div class="who"><b>' + esc(S.user) + '</b><span class="pill teal">' + esc(S.role) + '</span>' +
      '<div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">' +
      (bioAvailable() ? (bioSaved()
        ? '<button class="btn sm ghost" data-act="bio-off">Face ID on</button>'
        : '<button class="btn sm ghost" data-act="bio-on">Enable Face ID</button>') : '') +
      '<button class="btn sm" data-act="app-refresh" title="Reload the app fresh — latest version and all updates">&#8635; Refresh</button>' +
      '<button class="btn sm ghost" data-act="pin-change">PIN</button>' +
      '<button class="btn sm ghost" data-act="logout">Sign out</button></div></div></div>';

    var GROUPS = [
      ["Sell", ["dash", "leads", "brandfollow", "quotes", "followups", "clients", "partners"]],
      ["Deliver", ["deliveries", "tools", "collections", "billing", "products"]],
      ["Service", ["service", "spares"]],
      ["Admin", ["payrollhub", "discounts", "report", "pricing", "rules", "teampins"]]
    ];
    var label = {};
    tabs.forEach(function (t) { label[t[0]] = t[1]; });

    var navHtml = '';
    GROUPS.forEach(function (grp) {
      var items = grp[1].filter(function (k) { return canSee(k) && label[k]; });
      if (!items.length) return;
      navHtml += '<div class="navgrp"><span class="grp">' + grp[0] + '</span>' + items.map(function (k) {
        return '<button data-act="tab" data-tab="' + k + '" class="' + (S.tab === k ? 'on' : '') + '">' + label[k] + (k === "followups" ? radarBadge() : "") + '</button>';
      }).join("") + '</div>';
    });

    h += '<div class="scrim" data-act="nav-close"></div><div class="shell"><nav>' + navHtml + '</nav>';

    /* Defence-in-depth: never render a role-gated view the current role can't see, even if
       S.tab was somehow set to one. Derived/utility views (opened by handlers, not in ROLE_TABS)
       are whitelisted so legitimate flows aren't bounced. */
    var FREE_TAB = { dash: 1, brandboard: 1, matrix: 1, customers: 1, pitch: 1 };
    if (!FREE_TAB[S.tab] && !canSee(S.tab)) S.tab = (ROLE_TABS[S.role] || ["dash"])[0] || "dash";
    var pick = (S.tab === 'dash' && S.role === 'admin') ? viewOwner : (views[S.tab] || viewDash);
    var body;
    try { body = pick(); }
    catch (err) {
      logCrash("view:" + S.tab, err);
      body = '<div class="card" style="border-color:#fecaca;background:#fef2f2">' +
        '<h3>This screen hit an error</h3>' +
        '<div class="meta">The app caught it and kept your data safe. Switch to another tab, or reload. The details are saved in the crash log.</div>' +
        '<div class="acts" style="margin-top:10px;flex-wrap:wrap;gap:6px">' +
        '<button class="btn sm" data-act="tab" data-tab="dash">Go to Today</button>' +
        '<button class="btn sm ghost" data-act="crash-log">View crash log</button>' +
        '<button class="btn sm ghost" data-act="reload-app">Reload app</button></div></div>';
    }
    h += '<main>' + body +
      '<div class="foot-note">Energy World Team <span data-act="crash-log" style="cursor:pointer;border-bottom:1px dotted #cbd5e1" title="View crash log">v' + APP_VERSION + '</span> &middot; data lives in your Google Sheet</div></main>';

    h += '</div>';
    if (S.modal) h += '<div class="mask" data-act="mask"><div class="modal">' + S.modal + '</div></div>';

    var _msTop = null;
    if (keepScroll) { var _msOld = document.querySelector(".modal"); if (_msOld) _msTop = _msOld.scrollTop; }
    document.getElementById("root").innerHTML = h;
    if (_msTop != null) { var _msNew = document.querySelector(".modal"); if (_msNew) _msNew.scrollTop = _msTop; }
    keepScroll = false;
    document.body.classList.toggle("navopen", !!S.navOpen);

    var q = el("q");
    if (q) {
      q.addEventListener("input", function (e) { S.q = e.target.value; });
      q.addEventListener("keyup", function (e) { if (e.key === "Enter") render(); });
      /* Only grab focus when the box is empty (a fresh search). Once a client is loaded — e.g. while
         editing that client's discounts / incentives — leave focus where the user put it so a
         background repaint can never yank the caret back up to the search box. */
      if (!q.value) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
    /* quote builder code search: hold the text as it is typed (no re-render, so focus stays),
       and run the search on Enter. Not auto-focused - that would steal focus off the +/- taps. */
    var qzc = el("qz_code");
    if (qzc) {
      qzc.addEventListener("input", function (e) { if (S.qz) S.qz.codeq = e.target.value; });
      qzc.addEventListener("keyup", function (e) { if (e.key === "Enter") render(); });
    }
    /* top-bar global search: hold the text, run on Enter, results open in a modal */
    var gqi = el("gq");
    if (gqi) {
      gqi.addEventListener("input", function (e) { S.gq = e.target.value; });
      gqi.addEventListener("keyup", function (e) { if (e.key === "Enter") runGlobalSearch(); });
    }
  }

  function readLines() {
    var out = [];
    [].forEach.call(document.querySelectorAll("#m_lines .lineitem"), function (row) {
      var d = row.querySelector(".li-d").value.trim();
      var q = Number(row.querySelector(".li-q").value) || 0;
      var r = Number(row.querySelector(".li-r").value) || 0;
      if (d) out.push({ d: d, q: q, r: r });
    });
    return out;
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.getAttribute("data-act");
    var id = t.getAttribute("data-id");

    if (act === "login") { doLogin(); return; }
    if (act === "pin-change") { renderPinChange(); return; }
    if (act === "bio-on") { bioEnrol(); return; }
    if (act === "bio-off") { bioForget(); return; }
    if (act === "bio-unlock") { bioUnlock(); return; }
    if (act === "pin-save") {
      var p1 = val("np1"), p2 = val("np2");
      if (!/^[0-9]{4,8}$/.test(p1)) { renderPinChange("PIN must be 4-8 digits."); return; }
      if (p1 !== p2) { renderPinChange("The two PINs do not match."); return; }
      api("teamSetPin", { newPin: p1 }).then(function (r) {
        if (!r || !r.ok) { renderPinChange((r && r.error) || "Could not set PIN."); return; }
        S.pin = p1; S.pinSet = "Y";
        try { localStorage.setItem(STORE, JSON.stringify({ pin: p1, user: S.user })); } catch (e) {}
        toast("PIN updated.");
        S.tab = (ROLE_TABS[S.role] || ["dash"])[0];
        loadCatalog(); refresh();
      });
      return;
    }
    if (act === "tp-reset") {
      if (S.role !== "admin") { toast("Only the owner can reset PINs."); return; }
      var u = (S.data.team || []).filter(function (x) { return x.id === id; })[0];
      if (!u) { toast("Team member not found."); return; }
      if (!u.id) { toast("This member has no id - reset in the sheet."); return; }
      if (!window.confirm("Reset the PIN for " + u.name + "?\n\nTheir current PIN is cleared. The next time they open the app and enter their name, they will be asked to set a NEW PIN of their own. You will not see or set it.")) return;
      /* Clear pin + pinSet, forcing a fresh PIN at next login. Send the FULL known member row (not
         just the two fields) so that even if the backend ever wrote whole rows instead of merging
         fields, a reset could never blank someone's name / role / mobile. */
      save("team", Object.assign({}, u, { pin: "", pinSet: "N" }));
      toast("PIN reset for " + u.name + " - they'll set a new one at next login.");
      render();
      return;
    }
    if (act === "tp-temp") {
      /* Give a TEMPORARY PIN = last 4 digits of the person's own mobile, and force a change at first
         login (pinSet="N"). The owner clicks this; the value is derived from their mobile, never
         chosen or typed by Claude. Convenient but guessable - the forced change is what protects it. */
      if (S.role !== "admin") { toast("Only the owner can set PINs."); return; }
      var tu = (S.data.team || []).filter(function (x) { return x.id === id; })[0];
      if (!tu || !tu.id) { toast("Member not found."); return; }
      var mob = String(tu.mobile || "").replace(/\D/g, "");
      if (mob.length < 4) { toast("No mobile on file - can't make a temp PIN. Add a mobile first."); return; }
      var temp = mob.slice(-4);
      if (!window.confirm("Give " + tu.name + " a temporary PIN of " + temp + " (last 4 of their mobile)?\n\nThey must change it to their own private PIN the first time they sign in. Tell them this temp PIN.")) return;
      save("team", Object.assign({}, tu, { pin: temp, pinSet: "N" }));
      toast(tu.name + ": temp PIN " + temp + " set - they must change it at first login.");
      render();
      return;
    }
    if (act === "logout") { logout(); return; }
    /* Clicking the dimmed background no longer closes a popup - a stray click while making a
       challan used to wipe the whole form. Popups now close ONLY via their Cancel/Close button.
       The mask still swallows the click so the main screen stays inert underneath. */
    if (act === "mask") { return; }
    if (act === "close") {
      /* cancelling a partner form that was opened FROM the client form goes back to the client
         form with everything still typed - never dumps the user's half-entered lead. */
      if (S.clDraft) {
        var cd = S.clDraft; S.clDraft = null;
        S.modal = modalClient(S.clEditing || null); render();
        clFormRestore(cd.vals);
        return;
      }
      S.modal = null; render(); return;
    }
    if (act === "pnag-open") { S.modal = modalPartnerNag(); render(); return; }
    if (act === "app-refresh") {
      /* Hard-refresh: refetch app.js past the browser cache (cache:"reload" replaces the stored
         copy), then reload the page — fresh version AND fresh data. Unsynced records are safe:
         the journal lives in localStorage and survives any reload. Only an in-flight save asks
         for a few seconds' patience. */
      if (S.pending > 0) { toast("A save is still syncing — tap Refresh again in a few seconds."); return; }
      toast("Refreshing the app…");
      fetch("app.js", { cache: "reload" }).catch(function () { })
        .then(function () { try { location.reload(); } catch (e2) { location.href = location.pathname; } });
      return;
    }
    if (act === "crash-log") { S.modal = modalCrashLog(); render(); return; }
    if (act === "crash-clear") { try { localStorage.removeItem(CRASH_KEY); } catch (e) { } S.modal = modalCrashLog(); render(); return; }
    if (act === "reload-app") { location.reload(); return; }
    if (act === "tab") { S.tab = t.getAttribute("data-tab"); S.q = ""; render(); return; }
    if (act === "del-sub") { S.delSub = t.getAttribute("data-s"); render(); return; }
    if (act === "leads-sub") { S.leadsSub = t.getAttribute("data-s"); render(); return; }
    if (act === "quotes-sub") { S.quotesSub = t.getAttribute("data-s"); render(); return; }
    if (act === "coll-sub") { S.collSub = t.getAttribute("data-s"); render(); return; }
    if (act === "price-sub") { S.priceSub = t.getAttribute("data-s"); render(); return; }
    if (act === "pay-sub") { S.payHubSub = t.getAttribute("data-s"); render(); return; }
    if (act === "cat-reload") { toast("Reloading catalogue..."); loadCatalog().then(function () { toast(PRODUCTS.length + " products loaded."); render(); }); return; }

    if (act === "nav-toggle") { S.navOpen = !S.navOpen; render(); return; }
    if (act === "nav-close") { S.navOpen = false; render(); return; }

    if (act === "rm-preview") {
      var cp = val("rm_code"), fp = val("rm_fam");
      if (!cp && !fp) { toast("Give a code or family prefix."); return; }
      t.disabled = true; t.textContent = "Checking...";
      api("catalogRemap", { codePrefix: cp, familyPrefix: fp, preview: true }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Preview failed."); render(); return; }
        S.rmPreview = r; render();
      });
      return;
    }
    if (act === "rm-apply") {
      var cp2 = val("rm_code"), fp2 = val("rm_fam"), to = val("rm_to");
      if (!cp2 && !fp2) { toast("Give a code or family prefix."); return; }
      if (!to) { toast("Pick the brand to move them to."); return; }
      if (!window.confirm("Move matching products to " + to + "? This edits the master catalogue sheet.")) return;
      t.disabled = true; t.textContent = "Moving...";
      api("catalogRemap", { codePrefix: cp2, familyPrefix: fp2, toBrand: to }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Move failed."); render(); return; }
        S.rmPreview = null;
        toast(r.moved + " product(s) moved to " + to + ".");
        loadCatalog().then(function () { refresh(); });
      });
      return;
    }
    if (act === "br-new") { S.modal = modalBrand(null); render(); return; }
    if (act === "br-open") { S.modal = modalBrand(S.data.brands.filter(function (b) { return b.id === id; })[0]); render(); return; }
    if (act === "br-save") {
      var bn = val("b_name");
      if (!bn) { toast("Brand name is required."); return; }
      save("brands", { id: id || "", brand: bn, active: val("b_active"), notes: val("b_notes") })
        .then(function (r) { if (r) { S.modal = null; toast("Brand saved."); render(); } });
      return;
    }
    if (act === "br-del") {
      var bb = S.data.brands.filter(function (b) { return b.id === id; })[0];
      if (!bb) return;
      if (brandProducts(bb.brand).length) { toast("That brand still has products mapped to it."); return; }
      api("teamDelete", { tab: "brands", id: id }).then(function (r) {
        if (r && r.ok) { toast("Brand removed."); refresh(); } else { toast((r && r.error) || "Could not remove."); }
      });
      return;
    }

    if (act === "cat-new") { S.modal = modalProduct(null); render(); return; }
    if (act === "pr-open") {
      var pp = PRODUCTS.filter(function (x) { return x.code === t.getAttribute("data-code"); })[0];
      S.modal = modalProduct(pp); render(); return;
    }
    if (act === "cat-save") {
      var pc = val("p_code");
      if (!pc) { toast("Product code is required."); return; }
      t.disabled = true; t.textContent = "Saving...";
      api("catalogSave", { product: {
        code: pc, desc: val("p_desc"), family: val("p_fam"), category: val("p_cat"),
        unit: val("p_unit"), price: val("p_price"), masterBrand: val("p_mb"),
        subBrand: "", hsn: "", pic: val("p_pic")
      } }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Save failed."); return; }
        S.modal = null;
        toast(r.created ? "Product added." : "Product updated.");
        loadCatalog().then(function () { render(); });
      });
      return;
    }
    if (act === "pr-del") {
      var code = t.getAttribute("data-code");
      if (!window.confirm("Remove " + code + " from the master price list?")) return;
      api("catalogDelete", { code: code }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Delete failed."); return; }
        toast("Removed from catalogue.");
        loadCatalog().then(function () { render(); });
      });
      return;
    }

    if (act === "geo-filter") { S.geoOnly = !S.geoOnly; render(); return; }
    if (act === "cl-loc") { S.q = t.getAttribute("data-loc"); render(); return; }
    if (act === "cl-new") {
      S.billDraft = []; S.clEditing = null; S.modal = modalClient(null); render(); return; }
    if (act === "cl-open") {
      var ce = S.data.clients.filter(function (x) { return x.id === id; })[0];
      S.clEditing = ce || null;
      try { S.billDraft = JSON.parse((ce && ce.billingJson) || "[]"); } catch (e) { S.billDraft = []; } S.modal = modalClient(clientById(id)); render(); return; }
    if (act === "cl-save") {
      var cn = val("c_name");
      if (!cn) { toast("Client name is required."); return; }
      /* READ EVERY FIELD FIRST. Creating a partner re-renders the app, which rebuilds
         this modal - anything read afterwards comes back empty. That bug ate mobile2. */
      /* NEVER read a field that isn't on the form as "" — that blanks it on save (the backend
         writes the whole row). If an input is absent, keep the client's existing value. */
      var keep = S.clEditing || {};
      var fld = function (fid, prop) { var e2 = el(fid); return e2 ? e2.value : String(keep[prop] || ""); };
      var f = {
        mob: val("c_mob"), mob2: fld("c_mob2", "mobile2"), loc: val("c_loc"), ar: fld("c_area", "area"),
        addr: val("c_addr"), type: val("c_type"), notes: val("c_notes"), seg: val("c_segment"),
        arch: val("c_arch"), plumb: val("c_plumb"), build: val("c_build"), pmc: val("c_pmc"),
        /* migration fields - only rendered for a partner, so blank for everyone else */
        opAmt: val("c_opamt"), opDate: val("c_opdate"),
        leadType: val("c_leadtype"), owner: val("c_owner")
      };
      /* Money owed from before the app means he is an OLD lead, whatever the dropdown says.
         Otherwise a migrated client quietly inflates next month's "new leads" figure. */
      if (Number(f.opAmt) > 0) f.leadType = "Old";
      /* If the location held plot/colony text (not a real city) and is being corrected to a
         proper city, keep the old text by moving it into Address — never lose what was typed. */
      var oldLocV = String((S.clEditing && S.clEditing.location) || "").trim();
      if (oldLocV && oldLocV !== f.loc && locations().indexOf(oldLocV) < 0 &&
          String(f.addr || "").toLowerCase().indexOf(oldLocV.toLowerCase()) < 0) {
        f.addr = (f.addr ? f.addr + ", " : "") + oldLocV;
      }
      var mob = f.mob, loc = f.loc, ar = f.ar;
      var arch = f.arch, plumb = f.plumb, build = f.build, pmc = f.pmc;
      var back = S.clBack;
      /* The actual write. Optimistic: save() repaints the client instantly and syncs
         behind, undoing itself on failure. anyone named here who is not yet a Partner
         gets created first - no double entry. */
      var doSave = function () {
        return Promise.all([
          ensurePartner(arch, "Architect", loc, ar),
          ensurePartner(plumb, "Plumber", loc, ar),
          ensurePartner(build, "Builder", loc, ar),
          ensurePartner(pmc, "PMC", loc, ar)
        ]).then(function () {
          return save("clients", {
            /* On EDIT keep the ORIGINAL creator — overwriting it with the editor flipped a
               lead's ownership (clientOwner falls back to createdBy when ownedBy is blank), so a
               migrated lead vanished from the real exec's book the moment an admin edited it. */
            id: id || "", createdBy: (id ? (String(keep.createdBy || "").trim() || S.user) : S.user), name: cn,
            shortName: shortNameOf(cn, f.mob),
            location: f.loc, area: f.ar, mobile: f.mob, mobile2: f.mob2,
            address: f.addr, type: f.type, segment: f.seg,
            architect: f.arch, plumber: f.plumb, builder: f.build, pmc: f.pmc,
            notes: f.notes,
            billingJson: JSON.stringify(S.billDraft || []),
            openingAmt: f.opAmt || "", openingAsOn: f.opDate || "",
            leadType: f.leadType || "New",
            /* Auto-assign the creator; only admin may set/change it. Enforced here so a tampered
               DOM cannot reassign a lead. */
            ownedBy: (S.role === "admin"
              ? (f.owner || (id ? ((S.clEditing && S.clEditing.ownedBy) || "") : S.user))
              : (id ? ((S.clEditing && S.clEditing.ownedBy) || "") : S.user))
          });
        }).then(function (r) {
          if (!r) return;
          toast("Client saved as " + r.shortName + ".");
          if (S.qz && S.qz.step === 1) { S.qz.client = r.name; S.qz.clientObj = r; }
          /* came here from another form? go back to it, with the new client filled in */
          if (back) {
            S.clBack = null;
            if (back.keep) back.keep[back.forId] = r.name;
            if (back.modal === "challan") S.modal = modalChallan();
            else if (back.modal === "return") S.modal = modalReturn();
            else if (back.modal === "old") S.modal = modalOldChallan();
            render();
            restoreSnapshot(back.keep);
            return;
          }
          render();
        });
      };
      if (!back) {
        /* Close the form the INSTANT the button is pressed. The duplicate check is a
           network round-trip; keeping a "Checking..." modal up through it was the whole
           "modal won't close / not responsive" complaint. Run the check behind the closed
           form - the confirm only ever pops in the rare duplicate case. */
        S.modal = null; render();
        dupWarn({ id: id || "", name: cn, mobile: mob }).then(function (go) {
          if (!go) { toast("Client not saved - looks like a duplicate."); return; }
          doSave();
        });
        return;
      }
      /* registering a client from inside another form (challan/return) - we need the new
         name handed back into that form, so keep the modal up with live button feedback. */
      t.disabled = true; t.textContent = "Checking...";
      dupWarn({ id: id || "", name: cn, mobile: mob }).then(function (go) {
        if (!go) { t.disabled = false; t.textContent = "Save client"; return; }
        t.textContent = "Saving...";
        return doSave();
      });
      return;
    }
    if (act === "q-pdf") {
      var qd = S.data.quotes.filter(function (x) { return x.id === id; })[0];
      if (!qd) return;
      toast("Building PDF...");
      quotePdf(qd).then(function (d) { d.save(String(qd.quoteNo).replace(/[^\w.-]/g, "_") + ".pdf"); });
      return;
    }
    if (act === "q-tg") {
      var qt = S.data.quotes.filter(function (x) { return x.id === id; })[0];
      if (!qt) return;
      t.disabled = true; t.textContent = "Sending...";
      quotePdf(qt).then(function (d) {
        var b64 = d.output("datauristring").split(",")[1];
        return api("tgSend", { bot: "TG_QUOTES", pdfBase64: b64,
          filename: String(qt.quoteNo).replace(/[^\w.-]/g, "_") + ".pdf",
          caption: "<b>Quotation " + qt.quoteNo + "</b>\n" + qt.client + "\n" + qt.brand + "\nSub-total Rs. " + qt.net + " (GST as actual)\nBy " + qt.createdBy
        });
      }).then(function (r) { toast(r && r.ok ? "Quote sent to Telegram." : "Send failed."); render(); });
      return;
    }
    if (act === "qz-new") { S.qz = { step: 1, location: "", client: "", items: [], brandDisc: 0, brandDiscs: {} }; S.tab = "quotes"; render(); return; }
    if (act === "qz-for") {
      var c0 = clientById(id);
      S.qz = { step: 2, location: c0.location, client: c0.name, clientObj: c0, items: [], brandDisc: 0, brandDiscs: {} };
      S.tab = "quotes"; render(); return;
    }
    /* Brand board: tapping a brand opens a small menu (quote it, or just record the outcome). */
    if (act === "board-menu") { S.modal = modalBrandAction(t.getAttribute("data-n"), t.getAttribute("data-brand")); render(); return; }
    if (act === "board-status") {
      var stn = t.getAttribute("data-n"), stb = t.getAttribute("data-brand"), stv = t.getAttribute("data-s") || "Not pitched";
      saveBrandStatus(stn, stb, "", { status: stv });
      S.modal = null;
      toast(stb + (stv === "Not pitched" ? " status cleared" : " marked " + stv) + (stv === "Won" ? " — moved to Clients" : ""));
      render(); return;
    }
    if (act === "board-nr") {
      var nrn = t.getAttribute("data-n"), nrb = t.getAttribute("data-brand");
      var why = window.prompt("Why is " + nrb + " not required for " + nrn + "?\n(e.g. already has it, competitor tied up, not in scope)");
      if (why === null) return;
      saveBrandStatus(nrn, nrb, "", { status: "Not required", note: why });
      S.modal = null; toast(nrb + " marked Not required."); render(); return;
    }
    if (act === "bf-brand") { S.bf = t.getAttribute("data-brand"); render(); return; }
    if (act === "bf-mode") { S.bfMode = t.getAttribute("data-m") === "client" ? "client" : "lead"; render(); return; }
    if (act === "bill-go") { render(); return; }
    if (act === "bill-open") { S.q = t.getAttribute("data-n"); render(); return; }
    if (act === "bill-gst") { S.billGst = !S.billGst; render(); return; }
    if (act === "bill-selall") {
      if (!S.billSel) S.billSel = {};
      var bsv = t.getAttribute("data-v") === "1", bcl = hisabResolve(S.q);
      (S.data.challans || []).filter(function (c) { return c.customerName === bcl && String(c.receiptReceived).toUpperCase() === "Y"; })
        .forEach(function (c) { S.billSel[c.id] = bsv; });
      render(); return;
    }
    if (act === "bill-wa") {
      var wcl = hisabResolve(S.q), wc = clientByName(wcl) || {};
      var wnum = String(wc.mobile || "").replace(/\D/g, ""); if (wnum.length === 10) wnum = "91" + wnum;
      var wmsg = "Dear " + wcl + ",\n\nPlease find your Energy World statement (hisab) attached.\n\nThank you.\nEnergy World";
      waShareDoc(loadLogo().then(function () { return hisabPdf(wcl); }), wcl.replace(/[^\w.-]/g, "_") + "_hisab.pdf", wnum, wmsg);
      return;
    }
    if (act === "bill-pdf") {
      var pcl = hisabResolve(S.q); toast("Building PDF...");
      loadLogo().then(function () { return hisabPdf(pcl); }).then(function (d) { d.save(pcl.replace(/[^\w.-]/g, "_") + "_hisab.pdf"); }).catch(function () { toast("Could not build the PDF."); });
      return;
    }
    if (act === "backup-copy") {
      var bt = window.__ewBackupText || "";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(bt).then(function () { toast("Copied — paste it into Notes or WhatsApp to keep it safe."); })
            .catch(function () { var el = document.getElementById("ew_backup_text"); if (el) { el.focus(); el.select(); } toast("Select all in the box and copy."); });
        } else { var el2 = document.getElementById("ew_backup_text"); if (el2) { el2.focus(); el2.select(); } toast("Select all in the box and copy."); }
      } catch (e) { toast("Select all in the box and copy."); }
      return;
    }
    if (act === "backup-share") {
      var st = window.__ewBackupText || "";
      try {
        if (navigator.share) {
          var didFile = false;
          try {
            if (window.File && navigator.canShare) {
              var f = new File([st], "ew_unsynced_backup.json", { type: "application/json" });
              if (navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: "EW unsynced backup" }); didFile = true; }
            }
          } catch (e) { }
          if (!didFile) navigator.share({ title: "EW unsynced backup", text: st }).catch(function () { });
        } else { toast("Sharing isn't available here — use Copy instead."); }
      } catch (e) { toast("Couldn't open Share — use Copy instead."); }
      return;
    }
    if (act === "disc-edit") { S.q = t.getAttribute("data-n"); render(); return; }
    if (act === "disc-back") { S.q = ""; render(); return; }
    if (act === "disc-saveall") {
      if (S.role !== "admin") { toast("Only admin can set discounts."); return; }
      /* DEFERRED SAVE: read every discount (.dsc) and incentive (.incp) box on the screen and
         commit them in ONE pass — grouped per client+brand, because one discount row carries the
         brand discount AND every partner's incentive together in its notes. Nothing was written
         while the owner typed; this is the only place a discount edit reaches the sheet. */
      var groups = {};
      document.querySelectorAll(".dsc").forEach(function (el) {
        var cl = el.getAttribute("data-client"), br = el.getAttribute("data-brand"), k = cl + "||" + br;
        groups[k] = groups[k] || { client: cl, brand: br };
        groups[k].pctSet = true; groups[k].pct = String(el.value || "").trim();
      });
      document.querySelectorAll(".incp").forEach(function (el) {
        var cl = el.getAttribute("data-client"), br = el.getAttribute("data-brand"), k = cl + "||" + br;
        groups[k] = groups[k] || { client: cl, brand: br };
        (groups[k].inc = groups[k].inc || []).push({ role: String(el.getAttribute("data-role") || "").toLowerCase(), val: String(el.value || "").trim() });
      });
      var saved = 0;
      Object.keys(groups).forEach(function (k) {
        var g = groups[k], exd = discRow(g.client, g.brand);
        var pct = g.pctSet ? (g.pct === "" ? "" : (Number(g.pct) || 0)) : (exd && exd.pct != null ? exd.pct : "");
        var notes = incMap(exd);           // start from what's stored, overlay the on-screen roles
        (g.inc || []).forEach(function (f) {
          if (f.val === "" || Number(f.val) === 0) { delete notes[f.role]; } else { notes[f.role] = Number(f.val) || 0; }
        });
        var notesStr = Object.keys(notes).length ? JSON.stringify(notes) : "";
        var isEmpty = (pct === "" || pct === 0) && !notesStr;
        if (isEmpty && !exd) return;       // don't create a blank row for a brand never touched
        save("discounts", { id: (exd ? exd.id : "") || ("D-" + Date.now() + "-" + Math.floor(Math.random() * 1000)), client: g.client, brand: g.brand, pct: pct, notes: notesStr }, true);
        saved++;
      });
      setTimeout(function () {
        S.q = ""; render();
        toast(saved ? ("Saved " + saved + " brand line" + (saved > 1 ? "s" : "") + " for this client.") : "Nothing to save.");
      }, 120);
      return;
    }
    if (act === "board-quote") {
      var bn = t.getAttribute("data-n"), bb = t.getAttribute("data-brand");
      var bcl = clientByName(bn);
      S.qz = { step: 3, location: (bcl && bcl.location) || "", client: bn, clientObj: bcl || null,
        items: [], brandDisc: 0, brandDiscs: {}, brand: bb, family: "", codeq: "" };
      S.qz.brandDiscs[bb] = clientDiscount(bn, bb);
      S.modal = null; S.tab = "quotes"; render(); return;
    }
    /* Cross-sell one-click: start a quote for this client with the brand already picked. */
    if (act === "lead-quote") {
      var lc = clientById(id);
      if (!lc) return;
      var lbr = t.getAttribute("data-brand");
      S.qz = { step: 3, location: lc.location, client: lc.name, clientObj: lc, items: [], brandDisc: 0, brandDiscs: {}, brand: lbr, family: "", codeq: "" };
      S.qz.brandDiscs[lbr] = clientDiscount(lc.name, lbr);
      S.tab = "quotes"; render(); return;
    }
    /* Stage-based pitch: one-click quote from a site's Pitch matrix, brand pre-picked. */
    if (act === "pm-quote") {
      var mSite = siteById(S.siteId);
      if (!mSite) return;
      if (!mSite.client) { toast("Set the site's client first (Edit site)."); return; }
      var mbr = t.getAttribute("data-brand");
      var mcl = clientByName(mSite.client) || null;
      S.qz = { step: 3, location: (mcl && mcl.location) || "", client: mSite.client,
        clientObj: mcl, items: [], brandDisc: 0, brandDiscs: {}, brand: mbr, family: "", codeq: "" };
      S.qz.brandDiscs[mbr] = clientDiscount(mSite.client, mbr);
      S.tab = "quotes"; render(); return;
    }
    if (act === "qz-cancel") { S.qz = null; render(); return; }
    if (act === "qz-loc") { S.qz.location = t.getAttribute("data-loc"); render(); return; }
    if (act === "qz-client-go") {
      var nm = val("qz_client");
      var c1 = clientByName(nm);
      if (!c1) { toast("Not found - register the client."); S.qz.client = nm; render(); return; }
      S.qz.client = c1.name; S.qz.clientObj = c1; S.qz.step = 2; render(); return;
    }
    if (act === "qz-brand") {
      var bch = t.getAttribute("data-brand");
      S.qz.brand = bch;
      S.qz.brandDiscs = S.qz.brandDiscs || {};
      if (S.qz.brandDiscs[bch] === undefined) S.qz.brandDiscs[bch] = clientDiscount(S.qz.client, bch);
      S.qz.family = ""; S.qz.codeq = ""; S.qz.step = 3; render(); return;
    }
    if (act === "qz-fam") { S.qz.family = t.getAttribute("data-fam"); S.qz.codeq = ""; render(); return; }
    if (act === "qz-code-go") { var qcb = el("qz_code"); if (qcb && S.qz) S.qz.codeq = qcb.value; render(); return; }
    if (act === "qz-code-clear") { if (S.qz) S.qz.codeq = ""; render(); return; }
    if (act === "qz-gst") { if (S.qz) S.qz.gst = !S.qz.gst; render(); return; }
    if (act === "qz-step") { S.qz.step = Number(t.getAttribute("data-step")); render(); return; }
    if (act === "qz-qty") {
      var code = t.getAttribute("data-code");
      var delta = Number(t.getAttribute("data-d"));
      var p = PRODUCTS.filter(function (x) { return x.code === code; })[0];
      if (!p) return;
      var it = S.qz.items.filter(function (x) { return x.code === code; })[0];
      if (!it) {
        if (delta < 0) return;
        var qb2 = realBrand(p);
        S.qz.items.push({ code: p.code, desc: p.desc, family: p.family, price: p.price, qty: 1, pic: p.pic, unit: p.unit, brand: qb2 });
        S.qz.brandDiscs = S.qz.brandDiscs || {};
        if (qb2 && S.qz.brandDiscs[qb2] === undefined) S.qz.brandDiscs[qb2] = clientDiscount(S.qz.client, qb2);
      } else {
        it.qty += delta;
        if (it.qty <= 0) S.qz.items = S.qz.items.filter(function (x) { return x.code !== code; });
      }
      keepScroll = true;
      render(); return;
    }
    if (act === "qz-bd") {
      if (!canSetPricing()) { toast("Only the owner can change discounts."); return; }
      S.qz.brandDiscs = S.qz.brandDiscs || {};
      document.querySelectorAll(".qz-bd").forEach(function (el2) {
        var b = el2.getAttribute("data-brand");
        if (b) S.qz.brandDiscs[b] = Number(el2.value) || 0;
      });
      render(); return;
    }
    if (act === "qz-adv") { S.qz.adv = !S.qz.adv; render(); return; }
    /* One-tap: turn a Won quote into a pre-filled delivery challan (client, brand, items,
       and the quote's total discount carried over). User reviews driver/freight and creates. */
    if (act === "q-challan") {
      var wqc = S.data.quotes.filter(function (q) { return q.id === id; })[0];
      if (!wqc) return;
      var qcits = [];
      try { qcits = JSON.parse(wqc.items || "[]"); } catch (e) { }
      /* Bill the NET the client agreed to: bake each line's discount into its unit rate
         (challan.amount = sum(qty x rate) is what the ledger bills; the separate discAmt
         field isn't subtracted anywhere). This also makes any future return credit the
         actual per-unit price paid. Effective disc = per-line override, else brand disc. */
      S.ch = {
        brand: String(wqc.brand || "").split(",")[0].trim(),
        family: "", client: wqc.client, fromQuote: wqc.quoteNo, disc: 0,
        items: qcits.map(function (i) {
          var d = (i.disc !== "" && i.disc != null) ? Number(i.disc) : (Number(i.bd) || 0);
          var netRate = Math.round(Number(i.price || 0) * (1 - (Number(d) || 0) / 100));
          return { code: i.code, desc: i.desc, unit: i.unit || "No's",
            qty: Number(i.qty) || 1, rate: netRate };
        })
      };
      S.modal = modalChallan(); render(); return;
    }
    if (act === "qz-revise") {
      var old = S.data.quotes.filter(function (q) { return q.id === id; })[0];
      if (!old) return;
      var its = [];
      try { its = JSON.parse(old.items || "[]"); } catch (e) {}
      /* Rebuild the per-brand discount map from the saved items. Older quotes were
         saved as a single brand + one discountPct and their items carry no brand tag,
         so backfill both from the product catalogue and the old flat discount. */
      var revBd = {};
      its.forEach(function (i) {
        if (!i.brand) i.brand = brandByCode(i.code) || old.brand || "";
        var bd = (i.bd !== undefined && i.bd !== null) ? Number(i.bd) || 0 : (Number(old.discountPct) || 0);
        if (i.brand && revBd[i.brand] === undefined) revBd[i.brand] = bd;
      });
      S.qz = { step: 4, location: "", client: old.client,
        brand: (its[0] && its[0].brand) || old.brand, items: its,
        brandDisc: Number(old.discountPct) || 0, brandDiscs: revBd, parentId: old.id,
        version: (Number(old.version) || 1) + 1, quoteNo: old.quoteNo,
        gst: its.some(function (i) { return Number(i.gst) === 1; }) };
      S.tab = "quotes"; render(); return;
    }
    if (act === "qz-save") {
      var z = S.qz;
      if (!z.items.length) { toast("Add at least one product."); return; }

      /* Save is optimistic and instant. The only thing that ever made "Save quote" feel
         unresponsive was the duplicate check hitting the server first (~2-3s). So: give it
         a hard 3.5s timeout, disable BOTH Save buttons with live progress, and NEVER make
         the user press Save twice - on a real clash they confirm once; on a timeout or a
         network error we save anyway (a quote is a reversible Draft) and just note the
         check was skipped. The actual save is a direct call, not a re-dispatched click. */
      var saveBtns = document.querySelectorAll('[data-act="qz-save"]');
      function qzBtns(txt, dis) { saveBtns.forEach(function (b) { b.disabled = !!dis; b.textContent = txt; }); }

      function qzDoSave() {
        var tot = qzTotals();
        var cObj = clientByName(z.client) || {};
        var short = cObj.shortName || String(z.client).toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(" ")[0].slice(0, 10);
        var dt = new Date();
        var ds = String(dt.getDate()).padStart(2, "0") + String(dt.getMonth() + 1).padStart(2, "0") + String(dt.getFullYear()).slice(2);
        var seq = S.data.quotes.filter(function (q) { return String(q.quoteNo || "").indexOf("Q/" + short + "/") === 0; }).length + 1;
        var qno = z.quoteNo || ("Q/" + short + "/" + ds + "/" + String(seq).padStart(3, "0"));
        qzBtns("Saving...", true);
        /* Snapshot each line's brand and the brand's discount (i.bd) into the saved item,
           so the PDF, the list and a future revision reprice exactly without a separate
           column. i.disc stays the per-line override; discountPct = blended effective. */
        var savedBrands = qzBrands(z);
        var savedItems = (z.items || []).map(function (i) {
          var b = i.brand || brandByCode(i.code) || "";
          var bd = (z.brandDiscs && z.brandDiscs[b] != null) ? Number(z.brandDiscs[b]) || 0 : 0;
          var o = { code: i.code, desc: i.desc, family: i.family, price: i.price, qty: i.qty,
            pic: i.pic, unit: i.unit, brand: b, bd: bd };
          if (i.disc !== "" && i.disc !== undefined && i.disc !== null) o.disc = Number(i.disc) || 0;
          /* GST-on-PDF flag rides inside each item so it persists without a new sheet column */
          if (z.gst) o.gst = 1;
          return o;
        });
        var blended = tot.gross > 0 ? Math.round((tot.gross - tot.net) / tot.gross * 100) : 0;
        /* save() adds the quote to the list and repaints SYNCHRONOUSLY, then syncs to the server
           behind the scenes. So the instant the row is in, we leave the wizard and show the saved
           quote in the list - we do NOT sit on the Review screen waiting ~4s for the server, which
           is exactly what made "Save quote" feel like it did nothing. On a rare server refusal,
           save() undoes its row and toasts why, and we drop the user back on Review to retry. */
        var draft = z;
        var savePromise = save("quotes", {
          id: "", createdBy: S.user, quoteNo: qno, version: z.version || 1, parentId: z.parentId || "",
          siteId: "", siteName: "", client: z.client, brand: savedBrands.join(", "),
          items: JSON.stringify(savedItems), gross: tot.gross, discountPct: blended,
          net: tot.net, gstAmt: tot.gst, total: tot.total, status: "Draft", validTill: "", notes: ""
        });
        S.qz = null;
        toast("Quote " + qno + " saved.");
        render();
        savePromise.then(function (r) {
          if (!r) { draft.dupChecked = true; S.qz = draft; render(); return; }   /* server refused - back to Review */
          /* Auto-send the freshly saved quote to the Telegram group (setting: send on save).
             Strictly fire-and-forget - the quote is already saved and on screen, so a
             Telegram hiccup must never block the UI or undo the save. If it fails, the user
             can still press Send on the quote by hand. */
          toast("Sending to Telegram...");
          quotePdf(r).then(function (d) {
            return api("tgSend", { bot: "TG_QUOTES", pdfBase64: d.output("datauristring").split(",")[1],
              filename: String(r.quoteNo || qno).replace(/[^\w.-]/g, "_") + ".pdf",
              caption: "<b>Quotation " + (r.quoteNo || qno) + "</b>\n" + (r.client || z.client) + "\n" + (r.brand || savedBrands.join(", ")) + "\nSub-total Rs. " + (r.net != null ? r.net : tot.net) + " (GST as actual)\nBy " + (r.createdBy || S.user) });
          }).then(function (tr) {
            toast(tr && tr.ok ? "Quote sent to Telegram." : "Saved - Telegram send failed, use Send on the quote.");
          }).catch(function () {
            toast("Saved - Telegram send failed, use Send on the quote.");
          });
        });
      }

      if (z.dupChecked) { qzDoSave(); return; }
      qzBtns("Checking...", true);
      var qzTimeout = new Promise(function (res) { setTimeout(function () { res({ __timeout: true }); }, 2000); });
      Promise.race([
        api("quoteDup", { client: z.client, codes: z.items.map(function (i) { return i.code; }) }),
        qzTimeout
      ]).then(function (r) {
        z.dupChecked = true;
        if (r && r.__timeout) { toast("Duplicate check timed out - saving anyway."); qzDoSave(); return; }
        var others = ((r && r.clashes) || []).filter(function (x) { return !x.mine; });
        if (!others.length) { qzDoSave(); return; }
        var msg = "WARNING - this client has already been quoted these products by someone else:\n\n";
        others.slice(0, 6).forEach(function (x) {
          msg += "- " + x.desc + "\n  " + (uniRupee() ? "\u20B9" : "Rs.") + x.price + " at " + x.disc + "% off, on " + x.date +
            "\n  by " + x.by + " (" + x.quoteNo + ", " + x.status + ")\n\n";
        });
        msg += "A client must never get two different prices from Energy World.\n\nContinue anyway?";
        if (window.confirm(msg)) { qzDoSave(); }
        else { z.dupChecked = false; render(); }
      }).catch(function (e) {
        z.dupChecked = true;
        toast("Duplicate check skipped (" + ((e && e.message) || "network") + ") - saving.");
        qzDoSave();
      });
      return;
    }
    if (act === "comm-open") { S.modal = modalCommission(t.getAttribute("data-ch")); render(); return; }
    if (act === "comm-save") {
      var commCh = (S.data.challans || []).filter(function (x) { return x.id === t.getAttribute("data-ch"); })[0];
      if (!commCh) return;
      var cDate = val("cm_date") || today(), cEng = val("cm_eng");
      var cItems = chItems(commCh), justDone = [];
      [].slice.call(document.querySelectorAll(".cm-wm")).forEach(function (inp) {
        var idx = Number(inp.getAttribute("data-idx")), wm = Number(inp.value) || 0;
        if (cItems[idx]) { cItems[idx].comm = { date: cDate, eng: cEng, wm: wm, till: addMonths(cDate, wm) }; justDone.push(cItems[idx]); }
      });
      commCh.itemsJson = JSON.stringify(cItems);
      t.disabled = true; t.textContent = "Generating...";
      save("challans", commCh).then(function (r) {
        S.modal = null; toast("Commissioned. Generating documents..."); render();
        /* Close the loop: every commissioned unit becomes a tracked installation, so it flows
           into the Service-due reminders and AMC pipeline automatically. */
        var cl = clientByName(commCh.customerName) || {};
        justDone.forEach(function (it) {
          var cat = commCat(it.desc) || {}, cyc = cat.cycle || 180;
          save("installs", {
            id: "", createdBy: S.user, client: commCh.customerName, mobile: cl.mobile || "",
            address: cl.address || "", area: cl.area || cl.location || "",
            product: cat.label || it.desc, model: it.desc, serial: "",
            installDate: cDate, waterQuality: "", cycleDays: cyc,
            lastService: "", nextService: addDays(cDate, cyc),
            amcType: "None", amcAmount: "", amcEnd: "", engineer: cEng, status: "Active",
            notes: "Auto-created on commissioning · Challan " + (commCh.challanNo || "") + " · EW warranty till " + fullDate(it.comm.till)
          });
        });
        loadLogo().then(function () { return commCertPdf(commCh, cDate, cEng); })
          .then(function (d) { d.save("Commissioning_" + String(commCh.challanNo || "").replace(/[^\w.-]/g, "_") + ".pdf"); return warrantyCardPdf(commCh, cDate); })
          .then(function (d) { d.save("Warranty_" + String(commCh.challanNo || "").replace(/[^\w.-]/g, "_") + ".pdf"); toast("Certificate + warranty card downloaded."); })
          .catch(function () { toast("Saved, but PDF generation failed."); });
      });
      return;
    }
    if (act === "comm-cert" || act === "comm-warr" || act === "comm-warr-wa") {
      var cch = (S.data.challans || []).filter(function (x) { return x.id === t.getAttribute("data-ch"); })[0];
      if (!cch) return;
      var cd = commDateOf(cch), ci0 = commItemsOf(cch)[0], ceng = (ci0 && ci0.i.comm && ci0.i.comm.eng) || "";
      var fn = String(cch.challanNo || "").replace(/[^\w.-]/g, "_");
      if (act === "comm-cert") {
        toast("Building certificate...");
        loadLogo().then(function () { return commCertPdf(cch, cd, ceng); }).then(function (d) { d.save("Commissioning_" + fn + ".pdf"); });
      } else if (act === "comm-warr") {
        toast("Building warranty card...");
        loadLogo().then(function () { return warrantyCardPdf(cch, cd); }).then(function (d) { d.save("Warranty_" + fn + ".pdf"); });
      } else {
        var wcl = clientByName(cch.customerName) || {};
        var wnum = String(wcl.mobile || "").replace(/\D/g, ""); if (wnum.length === 10) wnum = "91" + wnum;
        var wmsg = "Dear " + cch.customerName + ",\n\nYour Energy World warranty card is attached. Please keep it safe for any future service or warranty claim.\n\nThank you,\nEnergy World";
        waShareDoc(loadLogo().then(function () { return warrantyCardPdf(cch, cd); }), "Warranty_" + fn + ".pdf", wnum, wmsg);
      }
      return;
    }
    if (act === "amc-wa") {
      var an = t.getAttribute("data-n"), ap = t.getAttribute("data-p"), atill = t.getAttribute("data-till");
      var acl = clientByName(an) || {};
      var anum = String(acl.mobile || "").replace(/\D/g, ""); if (anum.length === 10) anum = "91" + anum;
      var amsg = "Dear " + an + ",\n\nYour " + ap + " from Energy World is nearing the end of its installation warranty (" + fullDate(atill) + "). To keep it running trouble-free, we would be glad to offer an Annual Maintenance Contract (AMC) with priority service and periodic checks.\n\nMay we share the details?\n\nThank you,\nEnergy World";
      window.open("https://wa.me/" + anum + "?text=" + encodeURIComponent(amsg), "_blank");
      return;
    }
    if (act === "dg-tg") {
      toast("Building digest...");
      loadLogo().then(function () { return digestPdf(); }).then(function (d) {
        return api("tgSend", { bot: "TG_QUOTES", pdfBase64: d.output("datauristring").split(",")[1], filename: "EW_digest_" + today() + ".pdf", caption: digestText() });
      }).then(function (r) { toast(r && r.ok ? "Digest sent to the team." : "Send failed."); }).catch(function () { toast("Could not send the digest."); });
      return;
    }
    if (act === "dg-wa") {
      waShareDoc(loadLogo().then(function () { return digestPdf(); }), "EW_digest_" + today() + ".pdf", "", digestText());
      return;
    }
    if (act === "inst-new") { S.modal = modalInstall(null); render(); return; }
    if (act === "inst-open") { S.modal = modalInstall(installById(id)); render(); return; }
    if (act === "inst-save") {
      var ic = val("i_client");
      if (!ic) { toast("Client name is required."); return; }
      var cyc = Number(val("i_cycle")) || 60;
      var last = val("i_last");
      var next = val("i_next") || (last ? addDays(last, cyc) : addDays(val("i_idate") || today(), cyc));
      save("installs", {
        id: id || "", createdBy: S.user, client: ic, mobile: val("i_mobile"), address: val("i_addr"),
        area: val("i_area"), product: val("i_prod"), model: val("i_model"), serial: val("i_serial"),
        installDate: val("i_idate"), waterQuality: val("i_water"), cycleDays: cyc,
        lastService: last, nextService: next, amcType: val("i_amc"), amcAmount: val("i_amcamt"),
        amcEnd: val("i_amcend"), engineer: val("i_eng"), status: "Active", notes: val("i_notes")
      }).then(function (r) { if (r) { S.modal = null; toast("Installation saved."); render(); } });
      return;
    }
    if (act === "visit-new") {
      var inst = installById(id);
      if (!inst) return;
      S.installId = id; S.modal = modalVisit(inst); render(); return;
    }
    if (act === "sv-add") {
      var box = el("v_lines");
      box.insertAdjacentHTML("beforeend", spareRow(box.children.length));
      return;
    }
    if (act === "sv-del") {
      var rr = t.closest(".lineitem");
      if (rr && el("v_lines").children.length > 1) rr.remove();
      return;
    }
    if (act === "visit-save") {
      var ins = installById(id);
      if (!ins) return;
      var parts = [], partsAmt = 0;
      [].forEach.call(document.querySelectorAll("#v_lines .lineitem"), function (row) {
        var d = row.querySelector(".sv-d").value.trim();
        var q = Number(row.querySelector(".sv-q").value) || 0;
        var rt = Number(row.querySelector(".sv-r").value) || 0;
        if (d) { parts.push(d + " x" + q); partsAmt += q * rt; }
      });
      var bags = Number(val("v_salt")) || 0;
      var saltRate = Number(val("v_saltrate")) || 0;
      var saltAmt = bags * saltRate;
      var charge = Number(val("v_charge")) || 0;
      if (charge < MIN_VISIT) { toast("Minimum visit charge is Rs " + MIN_VISIT + "."); return; }
      var total = charge + saltAmt + partsAmt;
      var coll = Number(val("v_coll")) || 0;
      var vdate = val("v_date");
      var veng = val("v_eng");
      t.disabled = true; t.textContent = "Saving...";
      save("visits", {
        id: "", createdBy: S.user, installId: ins.id, client: ins.client, area: ins.area || "",
        date: vdate, engineer: veng, type: val("v_type"), visitCharge: charge,
        saltBags: bags, saltAmt: saltAmt, partsUsed: parts.join(", "), partsAmt: partsAmt,
        total: total, collected: coll, balance: total - coll, notes: val("v_notes")
      }).then(function (r) {
        if (!r) return;
        ins.lastService = vdate;
        ins.nextService = addDays(vdate, Number(ins.cycleDays) || 60);
        ins.engineer = veng;
        save("installs", ins).then(function () {
          S.modal = null;
          toast("Visit logged. Next service " + ins.nextService + ".");
          render();
        });
      });
      return;
    }

    if (act === "site-new") { S.modal = modalSite(null); render(); return; }
    if (act === "site-open") { S.modal = modalSite(siteById(id)); render(); return; }
    if (act === "site-save") {
      var sn = val("s_name");
      if (!sn) { toast("Site name is required."); return; }
      var existS = id ? (siteById(id) || {}) : {};
      var sOwner = S.role === "admin"
        ? (val("s_owner") || (id ? (existS.owner || "") : S.user))
        : (id ? (existS.owner || "") : S.user);
      save("sites", {
        id: id || "", createdBy: S.user, name: sn, client: val("s_client"), mobile: val("s_mobile"),
        city: val("s_city"), stage: val("s_stage"), type: val("s_type"), architect: val("s_arch"),
        plumber: val("s_plumb"), builder: val("s_build"), owner: sOwner,
        status: "Active", notes: val("s_notes")
      }).then(function (r) { if (r) { S.modal = null; toast("Site saved."); render(); } });
      return;
    }
    if (act === "lead-brand") { S.leadBrand = t.getAttribute("data-b"); render(); return; }
    if (act === "lead-pdf") {
      toast("Building list...");
      loadLogo().then(function () { return leadsPdf(S.leadBrand); })
        .then(function (d) { d.save("Leads_" + S.leadBrand.replace(/[^\w.-]/g, "_") + ".pdf"); });
      return;
    }
    if (act === "lead-send") {
      var exec = val("lead_exec");
      var r2 = brandLeads(S.leadBrand);
      if (!r2.list.length) { toast("Nothing pending."); return; }
      t.disabled = true; t.textContent = "Sending...";
      loadLogo().then(function () { return leadsPdf(S.leadBrand); }).then(function (d) {
        var urg = r2.list.filter(function (x) { return x.urgent; }).length;
        return api("tgSend", { bot: "TG_QUOTES",
          pdfBase64: d.output("datauristring").split(",")[1],
          filename: "Leads_" + S.leadBrand.replace(/[^\w.-]/g, "_") + ".pdf",
          caption: "<b>" + S.leadBrand + " - pending leads</b>\nFor: <b>" + exec + "</b>\n" +
            r2.list.length + " open" + (urg ? ", <b>" + urg + " closing now</b>" : "") + "\nSent by " + S.user });
      }).then(function (r3) { toast(r3 && r3.ok ? "Sent to " + exec + "." : "Send failed."); render(); });
      return;
    }
    if (act === "s-go") {
      var qv = val("sq");
      if (qv.length < 3) { toast("Type at least 3 characters."); return; }
      S.sq = qv; t.disabled = true; t.textContent = "Searching...";
      api("search", { q: qv }).then(function (r) {
        S.sres = (r && r.ok) ? r : { clients: [], quotes: [], challans: [], sites: [] };
        render();
      });
      return;
    }
    if (act === "bb-open") { S.brandClient = t.getAttribute("data-n"); S.tab = "brandboard"; render(); return; }
    if (act === "bb-back") { S.brandClient = ""; S.tab = "clients"; render(); return; }
    if (act === "p-loc") {
      var nl = t.getAttribute("data-l");
      S.pLoc = (S.pLoc === nl) ? "" : nl;      /* tap again to go back up */
      render(); return;
    }
    if (act === "p-role") {
      var nr = t.getAttribute("data-r");
      S.pRole = (S.pRole === nr) ? "" : nr;
      S.pLoc = "";
      render(); return;
    }
    if (act === "p-sort") { S.pSort = t.getAttribute("data-k"); render(); return; }
    if (act === "wl-by") { S.wlBy = t.getAttribute("data-k"); render(); return; }
    if (act === "p-open") { S.partner = t.getAttribute("data-n"); render(); return; }
    if (act === "p-back") { S.partner = ""; render(); return; }

    if (act === "pay-out") { S.modal = modalPayout(t.getAttribute("data-n")); render(); return; }
    if (act === "po-save") {
      var pn = t.getAttribute("data-n");
      var amt = Number(val("po_amt")) || 0;
      if (amt <= 0) { toast("Enter an amount."); return; }
      save("commpay", { id: "", createdBy: S.user, associate: pn, siteId: "", siteName: "",
        date: val("po_date"), amount: amt, mode: val("po_mode"), notes: val("po_note") })
        .then(function (r) { if (r) { S.modal = null; toast("Payout recorded."); render(); } });
      return;
    }

    if (act === "pay-in") { S.modal = modalPayIn(t.getAttribute("data-n")); render(); return; }
    if (act === "pi-save") {
      var cln = t.getAttribute("data-n");
      var amt2 = Number(val("pi_amt")) || 0;
      if (amt2 <= 0) { toast("Enter an amount."); return; }
      var site = S.data.challans.filter(function (c) { return c.customerName === cln && c.siteId; })[0] || {};
      save("payments", { id: "P-" + Date.now() + "-" + Math.floor(Math.random() * 1000), createdBy: S.user, siteId: site.siteId || "", siteName: site.site || "",
        client: cln, date: val("pi_date"), amount: amt2, mode: val("pi_mode"), ref: val("pi_ref"), notes: "" })
        .then(function (r) { if (r) { S.modal = null; toast("Payment recorded. Incentive payable updated."); render(); } });
      return;
    }

    if (act === "ledger-pdf") {
      var lc = t.getAttribute("data-n");
      toast("Building ledger...");
      loadLogo().then(function () { return ledgerPdf(lc); })
        .then(function (d) { d.save("Ledger_" + lc.replace(/[^\w.-]/g, "_") + ".pdf"); });
      return;
    }
    if (act === "pay-wa") { payReminder(t.getAttribute("data-n")); return; }

    if (act === "visit-start") { startVisit(); return; }
    if (act === "cal-prev" || act === "cal-next") {
      var b0 = S.calMonth ? new Date(S.calMonth + "-01T00:00:00") : new Date();
      b0.setMonth(b0.getMonth() + (act === "cal-next" ? 1 : -1));
      S.calMonth = b0.getFullYear() + "-" + String(b0.getMonth() + 1).padStart(2, "0");
      render(); return;
    }
    if (act === "cal-day") { S.calDay = t.getAttribute("data-d"); render(); return; }

    if (act === "vp-pick") { S.modal = modalVisitDetail(siteById(id)); render(); return; }
    if (act === "vp-setgeo") {
      var pn = val("vp_pend");
      var ps = S.data.sites.filter(function (x) { return x.name === pn; })[0];
      if (!ps) { toast("Pick a site."); return; }
      if (!window.confirm("Fix " + ps.name + " to where you are standing NOW?\n\nThis is permanent. Sales cannot change it afterwards.")) return;
      S.modal = modalVisitDetail(ps); render(); return;
    }
    if (act === "vp-any") {
      var an2 = val("vp_any");
      var as2 = S.data.sites.filter(function (x) { return x.name === an2; })[0];
      if (!as2) { toast("Pick a site."); return; }
      S.modal = modalVisitDetail(as2); render(); return;
    }
    if (act === "vd-type") {
      S.vType = t.getAttribute("data-t");
      var keepN = el("vd_note") ? el("vd_note").value : "";
      S.modal = modalVisitDetail(siteById(S.vdSite)); render();
      if (el("vd_note")) el("vd_note").value = keepN;
      return;
    }
    if (act === "vd-save") {
      var st2 = siteById(id);
      var setLoc = t.getAttribute("data-set") === "1";
      var note = val("vd_note");
      var fEl = el("vd_photo");
      var file2 = fEl && fEl.files && fEl.files[0];
      t.disabled = true; t.textContent = "Saving...";
      (file2 ? shrinkPhoto(file2) : Promise.resolve(null)).then(function (b64) {
        return api("siteVisit", {
          siteId: id, setLocation: setLoc, purpose: note, photoB64: b64 || "",
          visitType: S.vType || "Site",
          lat: S.gps.lat, lng: S.gps.lng, accuracy: S.gps.acc
        });
      }).then(function (r) {
        S.modal = null; S.gps = null;
        if (!r || !r.ok) { toast((r && r.error) || "Could not save."); render(); return; }
        toast(r.note === "site location set from this visit" ? "Location fixed. Visit logged."
          : (r.verified === "Verified" ? "Visit logged and verified." :
             (r.verified === "Far" ? "Logged, " + r.distanceM + "m from the site." : "Logged as unverified.")));
        refresh();
      });
      return;
    }

    if (act === "geo-reset") {
      if (!window.confirm("Clear this site\u2019s GPS?\n\nOnly do this if it was set at the wrong place. The next person standing at the site will fix it again.")) return;
      api("geoReset", { siteId: id }).then(function (r) {
        toast(r && r.ok ? "Location cleared. It can be set again on site." : ((r && r.error) || "Failed."));
        refresh();
      });
      return;
    }

    if (act === "v-photo") {
      var fid = t.getAttribute("data-file");
      t.disabled = true; t.textContent = "Loading...";
      api("visitPhoto", { fileId: fid }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Photo not available."); render(); return; }
        /* Telegram hands the file back as application/octet-stream; it is a JPEG. */
        var mime = (r.mime && r.mime.indexOf("image/") === 0) ? r.mime : "image/jpeg";
        S.modal = '<h2>Site photo</h2><img src="data:' + mime + ';base64,' + r.b64 +
          '" style="width:100%;border-radius:12px;margin-top:8px"/>' +
          '<div class="foot"><button class="btn" data-act="close">Close</button></div>';
        render();
      });
      return;
    }
    if (act === "checkin") { S.modal = modalCheckIn(siteById(id), false); render(); return; }
    if (act === "setgeo") { S.modal = modalCheckIn(siteById(id), true); render(); return; }
    if (act === "ck-go") {
      var setLoc = t.getAttribute("data-set") === "1";
      if (setLoc && !window.confirm("Confirm you are standing AT this site.\n\nThis fixes its location permanently.")) return;
      var purpose = val("ck_purpose");
      var f = el("ck_photo");
      var file = f && f.files && f.files[0];
      t.disabled = true; t.textContent = "Logging...";
      S.modal = null; render();
      (file ? shrinkPhoto(file) : Promise.resolve(null)).then(function (b64) {
        checkIn(id, setLoc, purpose, b64);
      });
      return;
    }
    if (act === "matrix") { S.siteId = id; S.tab = "matrix"; render(); return; }

    if (act === "cust-new") { S.modal = modalCustomer(null); render(); return; }
    if (act === "cust-open") { S.modal = modalCustomer(custById(id)); render(); return; }
    if (act === "cust-save") {
      var name = val("m_name");
      if (!name) { toast("Name is required."); return; }
      save("customers", {
        id: id || "", createdBy: S.user, name: name, mobile: val("m_mobile"), city: val("m_city"),
        address: val("m_address"), site: val("m_site"), type: val("m_type"), stage: val("m_stage"),
        associate: val("m_assoc"), status: val("m_status"), notes: val("m_notes")
      }).then(function (r) { if (r) { S.modal = null; toast("Customer saved."); render(); } });
      return;
    }

    if (act === "fu-new") { S.modal = modalFollowup(id ? { customerId: id } : null); render(); return; }
    if (act === "fu-save") {
      var cname = val("m_cust");
      var c = S.data.customers.filter(function (x) { return x.name === cname; })[0];
      if (!c) { toast("Pick a customer."); return; }
      save("followups", {
        id: "", createdBy: S.user, customerId: c.id, customerName: c.name,
        dueDate: val("m_due"), note: val("m_note"), status: "Open"
      }).then(function (r) { if (r) { S.modal = null; toast("Follow-up added."); render(); } });
      return;
    }
    if (act === "fu-done") {
      var f = S.data.followups.filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      f.status = "Done"; f.doneAt = new Date().toISOString();
      save("followups", f).then(function () { toast("Done."); });
      return;
    }
    /* ---- follow-up radar actions ---- */
    if (act === "rad-seg") { S.radarSeg = t.getAttribute("data-s") || ""; render(); return; }
    if (act === "rad-status") {
      var rq = S.data.quotes.filter(function (x) { return x.id === id; })[0];
      if (!rq) return;
      rq.status = t.getAttribute("data-s");
      save("quotes", rq).then(function (r) { if (r) toast("Quote marked " + rq.status + "."); });
      return;
    }
    if (act === "rad-snooze") {
      var sq = S.data.quotes.filter(function (x) { return x.id === id; })[0];
      if (!sq) return;
      S.modal = modalSnooze(sq); render(); return;
    }
    if (act === "sn-save") {
      var snq = S.data.quotes.filter(function (x) { return x.id === id; })[0];
      if (!snq) return;
      var due = val("sn_due") || today();
      var note = val("sn_note") || ("Chase " + snq.quoteNo);
      /* the radar detects a snooze by finding the quote number in an open follow-up's note */
      if (note.indexOf(snq.quoteNo) < 0) note = "[" + snq.quoteNo + "] " + note;
      save("followups", { id: "", createdBy: S.user, customerId: "", customerName: snq.client, dueDate: due, note: note, status: "Open" })
        .then(function (r) { if (r) { S.modal = null; toast("Snoozed to " + dstr(due) + "."); render(); } });
      return;
    }
    if (act === "rad-wa") { waShareQuote(id); return; }
    if (act === "q-wa") { waShareQuote(id); return; }

    if (act === "as-new") { S.modal = modalAssociate(null); render(); return; }
    if (act === "as-open") {
      S.modal = modalAssociate(S.data.associates.filter(function (x) { return x.id === id; })[0]); render(); return;
    }
    if (act === "as-save") {
      var an = val("m_aname");
      if (!an) { toast("Name is required."); return; }
      /* Owner's rule: NO partner without a phone number. A partner you cannot call is a name,
         not a partner. 10 digits minimum, always. */
      var am = String(val("m_amobile") || "").replace(/\D/g, "");
      if (am.length < 10) { toast("Partner mobile number is required (10 digits) — no partner without a phone."); return; }
      save("associates", {
        id: id || "", name: an, role: val("m_arole"),
        mobile: val("m_amobile"), mobile2: val("m_amobile2"),
        location: val("m_aloc"), area: val("m_aarea"), address: val("m_aaddr"),
        birthday: val("m_abday"), anniversary: val("m_aanniv"),
        rate: val("m_arate"), notes: val("m_anotes")
      }).then(function (r) {
        if (!r) return;
        /* came here from a half-filled client form? Reopen it with everything typed intact and
           the new partner selected in the field that started this. */
        if (S.clDraft) {
          var d = S.clDraft; S.clDraft = null;
          S.modal = modalClient(S.clEditing || null); render();
          d.vals[d.field] = an;
          clFormRestore(d.vals);
          var sel = el(d.field);
          if (sel && sel.value !== an) {   /* option may not exist yet on a slow sync - inject it */
            var o = document.createElement("option"); o.value = an; o.textContent = an;
            sel.insertBefore(o, sel.firstChild); sel.value = an;
          }
          toast("Partner saved — " + an + " selected. Finish the client and Save.");
        } else { S.modal = null; toast("Partner saved."); render(); }
      });
      return;
    }

    if (act === "ch-new") {
      S.ch = { brand: "", family: "", items: [] }; S.modal = modalChallan(); render(); return; }
    if (act === "li-add") {
      var box = el("m_lines");
      box.insertAdjacentHTML("beforeend", lineRow(box.children.length, "", "", ""));
      return;
    }
    if (act === "li-del") {
      var row = t.closest(".lineitem");
      if (row && el("m_lines").children.length > 1) row.remove();
      return;
    }
    if (act === "pl-tog") {
    var b = t.getAttribute("data-b");
    S.pl = S.pl || {};
    S.pl[b] = !S.pl[b];
    render();
    return;
  }
  if (act === "pl-clear") { S.pl = {}; render(); return; }
  if (act === "pl-pdf") {
    var bs = Object.keys(S.pl || {}).filter(function (k) { return S.pl[k]; });
    if (!bs.length) { toast("Pick a brand first."); return; }
    t.disabled = true; t.textContent = "Building...";
    priceListPdf(bs).catch(function (e) { toast("PDF failed: " + e.message); })
      .then(function () { render(); });
    return;
  }
  if (act === "pr-new") { S.pr = { brand: "", overrides: [] }; S.modal = modalPrice(); render(); return; }
    if (act === "pr-add") {
      var pc = val("pr_code"), pr2 = val("pr_rate");
      if (!pc || !pr2) { toast("Pick a product and its new rate."); return; }
      var pp2 = PRODUCTS.filter(function (p) { return p.label === pc || p.code === pc; })[0] || {};
      S.pr.brand = val("pr_brand"); S.pr.pct = val("pr_pct"); S.pr.from = val("pr_from"); S.pr.note = val("pr_note");
      S.pr.overrides.push({ code: pp2.code || pc, rate: pr2 });
      S.modal = modalPrice(); render();
      if (el("pr_brand")) el("pr_brand").value = S.pr.brand;
      if (el("pr_pct")) el("pr_pct").value = S.pr.pct || "";
      if (el("pr_from")) el("pr_from").value = S.pr.from || today();
      if (el("pr_note")) el("pr_note").value = S.pr.note || "";
      return;
    }
    if (act === "pr-save") {
      var pb = val("pr_brand"), pf = val("pr_from");
      if (!pb) { toast("Pick the brand."); return; }
      if (!pf) { toast("Set the effective-from date."); return; }
      t.disabled = true; t.textContent = "Saving...";
      api("priceSave", {
        brand: pb, pct: val("pr_pct") || 0, effectiveFrom: pf,
        overrides: S.pr.overrides || [], notes: val("pr_note")
      }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not save."); render(); return; }
        S.pr = null; S.modal = null;
        toast("Revision saved. It applies from " + pf + ".");
        refresh();
      });
      return;
    }
    if (act === "rp-go") {
      var ex = val("rp_exec"), mo = val("rp_month");
      t.disabled = true; t.textContent = "...";
      api("execReport", { exec: ex, month: mo }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not build the report."); render(); return; }
        S.rpt = { exec: ex, month: mo, data: r };
        render();
      });
      return;
    }
    if (act === "tl-scan") { S.modal = modalToolScan(); render(); setTimeout(startScanner, 300); return; }
    if (act === "tl-close") { stopScanner(); S.tool = null; S.modal = null; render(); return; }
    if (act === "tl-code") {
      var tc = val("tl_code");
      if (!tc) { toast("Type the code from the sticker."); return; }
      stopScanner();
      openToolByCode(tc);
      return;
    }
    if (act === "tl-open") {
      var tt = (S.data.tools || []).filter(function (x) { return x.id === id; })[0];
      if (!tt) return;
      openToolByCode(tt.code);
      return;
    }
    if (act === "tl-blank") {
      var free = (S.data.tools || []).filter(function (x) { return !x.name; }).map(function (x) { return x.code; });
      toast(free.length ? free.length + " stickers not yet registered: " + free.slice(0, 6).join(", ") + (free.length > 6 ? "..." : "") : "Every sticker is registered.");
      return;
    }
    if (act === "tl-register") {
      var nm = val("tl_name");
      if (!nm) { toast("Name the tool."); return; }
      t.disabled = true; t.textContent = "Saving...";
      var tr = S.tool.t;
      save("tools", {
        id: tr.id, code: normToolCode(tr.code), name: nm, brand: val("tl_brand"), model: val("tl_model"),
        serial: val("tl_serial"), value: val("tl_value"), dueDays: val("tl_due") || "30",
        status: "In godown", holder: "", holderType: "", holderMobile: "", site: "", issuedAt: ""
      }).then(function () {
        toast(tr.code + " registered.");
        openToolByCode(tr.code);
      });
      return;
    }
    if (act === "tl-give" || act === "tl-back") {
      var give = act === "tl-give";
      var tw = S.tool.t;
      var hn = give ? val("tl_holder") : "";
      if (give && !hn) { toast("Name the person taking the tool."); return; }
      var hrec = toolHolders().filter(function (x) {
        return String(x.name).trim().toLowerCase() === hn.trim().toLowerCase();
      })[0];
      if (give && !hrec) { toast("Pick a client, partner or staff member already in the app."); return; }
      t.disabled = true; t.textContent = "...";
      /* stamp where the handover happened - a custody record with no place is half a record */
      var withGeo = function (pos) {
        var body = {
          id: tw.id, action: give ? "give" : "return",
          holder: hn, holderType: hrec ? hrec.type : "", holderMobile: hrec ? hrec.mobile : "",
          site: give ? val("tl_site") : ""
        };
        if (pos) { body.lat = pos.coords.latitude; body.lng = pos.coords.longitude; body.accuracy = Math.round(pos.coords.accuracy); }
        api("toolMove", body).then(function (r) {
          if (!r || !r.ok) { toast((r && r.error) || "Could not record the handover."); render(); return; }
          toast(give ? tw.code + " is now with " + hn + "." : tw.code + " is back in the godown.");
          S.tool = null; S.modal = null;
          refresh();
        });
      };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(withGeo, function () { withGeo(null); },
          { enableHighAccuracy: true, timeout: 8000 });
      } else { withGeo(null); }
      return;
    }
    if (act === "rt-new") { S.rt = { brand: "", family: "", items: [] }; S.modal = modalReturn(); render(); return; }
    if (act === "rt-brand" || act === "rt-fam") {
      var restoreR = keepFields(RT_FIELDS);
      if (act === "rt-brand") { S.rt.brand = t.getAttribute("data-brand"); S.rt.family = ""; }
      else { S.rt.family = t.getAttribute("data-fam"); }
      S.modal = modalReturn(); render(); restoreR(); return;
    }
    if (act === "rt-qty") {
      var rc = t.getAttribute("data-code"), rd = Number(t.getAttribute("data-d")) || 0;
      var rp = PRODUCTS.filter(function (p) { return p.code === rc; })[0] || {};
      var rr = (S.rt.items || []).filter(function (i) { return i.code === rc; })[0];
      if (!rr) { if (rd < 0) return; S.rt.items.push({ code: rc, desc: rp.desc || rc, unit: rp.unit || "No's", qty: 1 }); }
      else { rr.qty += rd; if (rr.qty <= 0) S.rt.items = S.rt.items.filter(function (i) { return i.code !== rc; }); }
      var restoreQ = keepFields(RT_FIELDS);
      keepScroll = true;
      S.modal = modalReturn(); render(); restoreQ();
      return;
    }
    if (act === "rt-recon") {
      t.disabled = true; t.textContent = "Checking...";
      api("reconcile").then(function (r) {
        S.recon = (r && r.ok) ? r : { rows: [], stale: [] };
        render();
      });
      return;
    }
    if (act === "rt-move") {
      var rto = t.getAttribute("data-to");
      t.disabled = true; t.textContent = "...";
      api("returnMove", { id: id, to: rto }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not update."); render(); return; }
        var rec = S.data.returns.filter(function (x) { return x.id === id; })[0];
        if (rec) { rec.status = rto; if (rto === "Received") rec.receivedBy = r.by; }
        toast(rto === "Received" ? "Booked in at the godown." : "Marked picked up.");
        S.recon = null;
        render();
      });
      return;
    }
    if (act === "rt-save") {
      var rcl = val("r_client");
      if (!rcl) { toast("Enter the client."); return; }
      if (!(S.rt.items || []).length) { toast("Pick at least one product."); return; }
      var rcObj = clientByName(rcl) || {};
      t.disabled = true; t.textContent = "Registering...";
      var rdrv = val("r_driver");
      var drec = (S.data.drivers || []).filter(function (x) {
        return String(x.name).trim().toLowerCase() === rdrv.trim().toLowerCase();
      })[0] || {};
      api("returnNo", { client: rcObj.shortName || rcl }).then(function (n) {
        var rowR = {
          id: "", createdBy: S.user,
          returnNo: (n && n.returnNo) || (rcl.toUpperCase().slice(0, 6) + "/" + today().slice(8) + "/R01"),
          customerId: rcObj.id || "", customerName: rcl,
          site: val("r_site"), challanNo: val("r_ch"),
          itemsJson: JSON.stringify(S.rt.items),
          reason: val("r_reason"), status: "Raised",
          driver: rdrv, driverMobile: drec.mobile || "", vehicle: drec.vehicle || "",
          freight: val("r_freight") || 0, freightTo: "Energy World"
        };
        return save("returns", rowR).then(function (r) {
          if (!r) return;
          S.rt = null; S.modal = null; S.recon = null;
          toast("Return " + rowR.returnNo + " registered.");
          render();
        });
      });
      return;
    }
    /* "+ New" from inside a challan / return / old-delivery. Remember what the man had already
       typed, open the FULL client form, and when he saves, come straight back to where he was
       with the client filled in. Registering a client must never cost him the form he was on. */
    if (act === "bill-detail") {
      S.modal = modalBill(id); render(); return;
    }
    if (act === "bill-save") {
      var bch = (S.data.challans || []).filter(function (x) { return x.id === id; })[0];
      if (!bch) { toast("Challan not found."); return; }
      var sel = val("b_to"), billTo = "";
      if (sel && sel !== "__new") {
        billTo = sel;
      } else {
        var nn = String(val("b_newname") || "").trim();
        if (!nn) { toast("Pick a billing name, or type a new one."); return; }
        var gg = String(val("b_newgst") || "").trim();
        billTo = gg ? nn + " - " + gg : nn;
        /* remember this billing name on the client for next time */
        var bcl = clientByName(bch.customerName) || {};
        var profs = []; try { profs = JSON.parse(bcl.billingJson || "[]"); } catch (e) { profs = []; }
        if (bcl.id && !profs.some(function (p) { return (p.gstin ? p.name + " - " + p.gstin : p.name) === billTo; })) {
          profs.push({ name: nn, gstin: gg });
          save("clients", { id: bcl.id, name: bcl.name, billingJson: JSON.stringify(profs) });
        }
      }
      var billNo = String(val("b_no") || "").trim();
      if (!billNo) { toast("Enter the bill number."); return; }
      /* Warn (don't block) if this bill number is already on another challan - could be a legitimate
         consolidated bill, or a typo. */
      var dupes = (S.data.challans || []).filter(function (x) {
        return x.id !== id && String(x.billNo || "").trim() && String(x.billNo).trim().toLowerCase() === billNo.toLowerCase();
      }).map(function (x) { return x.challanNo; });
      if (dupes.length && !window.confirm("Bill " + billNo + " is already on:\n\n" + dupes.join("\n") +
        "\n\nSave it on " + bch.challanNo + " too?\n(Fine for a consolidated bill; cancel if it's a typo.)")) return;
      /* Optimistic + journaled full-row save, so the billing detail can't be lost. */
      S.modal = null;
      var updated = Object.assign({}, bch, { billTo: billTo, billNo: billNo, billStatus: "Billed" });
      Object.assign(bch, { billTo: billTo, billNo: billNo, billStatus: "Billed" });
      toast("Bill " + billNo + " recorded on " + bch.challanNo + ".");
      render();
      save("challans", updated).catch(function () { toast("Kept safe on this device - will sync on next refresh."); });
      return;
    }
    if (act === "bill-send") {
      var bc = S.data.challans.filter(function (x) { return x.id === id; })[0];
      if (!bc) return;
      var cl2 = clientByName(bc.customerName) || {};
      var profiles = [];
      try { profiles = JSON.parse(cl2.billingJson || "[]"); } catch (e) { }
      var chosen;
      if (!profiles.length) {
        /* first challan for this client - ask now and remember it for next time */
        var nm = window.prompt("Which name is " + bc.customerName + " billed under?\n\n" +
          "Nothing is saved against this client yet, so this will be remembered for next time.");
        if (!nm) return;
        var gst = window.prompt("GSTIN for " + nm + "?\n(leave blank if none)") || "";
        chosen = gst ? nm + " - " + gst : nm;
        profiles.push({ name: nm, gstin: gst });
        save("clients", { id: cl2.id, name: cl2.name, billingJson: JSON.stringify(profiles) });
      } else if (profiles.length === 1) {
        chosen = profiles[0].gstin ? profiles[0].name + " - " + profiles[0].gstin : profiles[0].name;
        if (!window.confirm("Bill " + bc.challanNo + " to " + chosen + "?")) return;
      } else {
        var menu = profiles.map(function (p, i) { return (i + 1) + ". " + p.name + (p.gstin ? " (" + p.gstin + ")" : ""); }).join("\n");
        var pick = window.prompt("Which name is this billed under?\n\n" + menu + "\n\nType the number.");
        var pi = Number(pick) - 1;
        if (!(pi >= 0 && pi < profiles.length)) return;
        chosen = profiles[pi].gstin ? profiles[pi].name + " - " + profiles[pi].gstin : profiles[pi].name;
      }
      t.disabled = true; t.textContent = "...";
      api("billSend", { id: id, billTo: chosen }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not send."); render(); return; }
        bc.billStatus = "Sent for billing"; bc.billTo = chosen;
        toast("Sent to accounts for billing.");
        render(); quietSync();
      });
      return;
    }
    if (act === "bill-no") {
      var bn2 = S.data.challans.filter(function (x) { return x.id === id; })[0];
      var no = window.prompt("Bill number for " + bn2.challanNo + "\nBilled to: " + (bn2.billTo || "-"));
      if (!no) return;
      t.disabled = true; t.textContent = "...";
      api("billNo", { id: id, billNo: no }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not save."); render(); return; }
        bn2.billNo = no; bn2.billStatus = "Billed";
        if (r.alsoOn && r.alsoOn.length) {
          window.alert("Careful - bill " + no + " is already on:\n\n" + r.alsoOn.join("\n") +
            "\n\nSaved anyway. If that is a consolidated bill, fine. If it is a typo, fix it.");
        }
        toast("Bill " + no + " recorded.");
        render(); quietSync();
      });
      return;
    }
    if (act === "bill-add") {
      var bn = val("c_billname");
      if (!bn) { toast("Type the name on the bill."); return; }
      var cur = S.billDraft || [];
      cur.push({ name: bn, gstin: val("c_billgst") });
      S.billDraft = cur;
      var keepC = keepSnapshot(["c_name", "c_mob", "c_loc", "c_type", "c_addr", "c_arch", "c_plumb", "c_build", "c_pmc", "c_opamt", "c_opdate", "c_leadtype", "c_owner"]);
      S.modal = modalClient(S.clEditing || null); render(); restoreSnapshot(keepC);
      return;
    }
    if (act === "bill-del") {
      var bi = Number(t.getAttribute("data-i"));
      var cur2 = S.billDraft || [];
      cur2.splice(bi, 1);
      S.billDraft = cur2;
      var keepD = keepSnapshot(["c_name", "c_mob", "c_loc", "c_type", "c_addr", "c_arch", "c_plumb", "c_build", "c_pmc", "c_opamt", "c_opdate", "c_leadtype", "c_owner"]);
      S.modal = modalClient(S.clEditing || null); render(); restoreSnapshot(keepD);
      return;
    }
    if (act === "cl-inline") {
      S.billDraft = []; S.clEditing = null;
      var forId = t.getAttribute("data-for");
      var back = { forId: forId };
      if (forId === "m_client") { back.modal = "challan"; back.keep = keepSnapshot(CH_FIELDS); }
      else if (forId === "r_client") { back.modal = "return"; back.keep = keepSnapshot(RT_FIELDS); }
      else if (forId === "o_client") { back.modal = "old"; back.keep = keepSnapshot(OC_FIELDS); }
      S.clBack = back;
      S.modal = modalClient(null);
      render();
      return;
    }
    if (act === "oc-new") { S.oc = { brand: "", family: "", items: [] }; S.modal = modalOldChallan(); render(); return; }
    if (act === "oc-close") { S.oc = null; S.modal = null; render(); return; }
    if (act === "oc-brand" || act === "oc-fam") {
      var keepOc = keepFields(["o_client", "o_date", "o_no", "o_site", "o_bill"]);
      if (act === "oc-brand") { S.oc.brand = t.getAttribute("data-brand"); S.oc.family = ""; }
      else { S.oc.family = t.getAttribute("data-fam"); }
      S.modal = modalOldChallan(); render(); keepOc(); return;
    }
    if (act === "oc-qty") {
      var oc2 = keepFields(["o_client", "o_date", "o_no", "o_site", "o_bill"]);
      var ocode = t.getAttribute("data-code"), od = Number(t.getAttribute("data-d")) || 0;
      var op = PRODUCTS.filter(function (p) { return p.code === ocode; })[0] || {};
      var orow = (S.oc.items || []).filter(function (i) { return i.code === ocode; })[0];
      if (!orow) { if (od < 0) return; S.oc.items.push({ code: ocode, desc: op.desc || ocode, unit: op.unit || "No's", qty: 1, rate: op.price || 0 }); }
      else { orow.qty += od; if (orow.qty <= 0) S.oc.items = S.oc.items.filter(function (i) { return i.code !== ocode; }); }
      S.modal = modalOldChallan(); render(); oc2(); return;
    }
    if (act === "oc-save") {
      var ocl = val("o_client"), odate = val("o_date");
      if (!ocl) { toast("Enter the client."); return; }
      if (!odate) { toast("Give the date it was actually delivered."); return; }
      if (!(S.oc.items || []).length) { toast("Pick at least one product."); return; }
      t.disabled = true; t.textContent = "Saving...";
      api("historicChallan", {
        client: ocl, date: odate, challanNo: val("o_no"), site: val("o_site"),
        billNo: val("o_bill"), brand: S.oc.brand, items: S.oc.items
      }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not save."); render(); return; }
        S.oc = null; S.modal = null;
        toast("Saved " + r.challanNo + ". Nothing was sent to Telegram.");
        refresh();
      });
      return;
    }
    if (act === "ch-brand" || act === "ch-fam" || act === "ch-brandclear" || act === "ch-famclear") {
      var restoreC = keepFields(CH_FIELDS);
      if (act === "ch-brand") { S.ch.brand = t.getAttribute("data-brand"); S.ch.family = ""; }
      else if (act === "ch-fam") { S.ch.family = t.getAttribute("data-fam"); }
      else if (act === "ch-brandclear") { S.ch.brand = ""; S.ch.family = ""; }  /* back to Step 1 */
      else if (act === "ch-famclear") { S.ch.family = ""; }                     /* back to Step 2 */
      S.modal = modalChallan(); render(); restoreC(); return;
    }
    if (act === "ch-qty") {
      var pcode = t.getAttribute("data-code");
      var dd2 = Number(t.getAttribute("data-d")) || 0;
      var prod = PRODUCTS.filter(function (p) { return p.code === pcode; })[0] || {};
      var row = (S.ch.items || []).filter(function (i) { return i.code === pcode; })[0];
      if (!row) {
        if (dd2 < 0) return;
        S.ch.items.push({ code: pcode, desc: prod.desc || pcode, unit: prod.unit || "No's", qty: 1, rate: prod.price || 0 });
      } else {
        row.qty += dd2;
        if (row.qty <= 0) S.ch.items = S.ch.items.filter(function (i) { return i.code !== pcode; });
      }
      /* keep the form fields the user already typed - a redraw would wipe them */
      var restoreCh = keepFields(CH_FIELDS);
      keepScroll = true;
      S.modal = modalChallan(); render(); restoreCh();
      return;
    }
    if (act === "ch-exp") {
      S.chExp = S.chExp || {};
      S.chExp[id] = !S.chExp[id];
      var _y = window.scrollY;           // keep the page where it is - rebuilding #root resets scroll
      render();
      window.scrollTo(0, _y);
      return;
    }
    if (act === "ch-edit") {
      var ce = (S.data.challans || []).filter(function (x) { return x.id === id; })[0];
      if (!ce) return;
      if (ce.status === "Dispatched" || ce.status === "Received") { toast("A dispatched challan can't be edited."); return; }
      var eItems = []; try { eItems = JSON.parse(ce.itemsJson || "[]"); } catch (e) { eItems = []; }
      S.ch = {
        editId: ce.id, editNo: ce.challanNo, editStatus: ce.status || "Draft",
        brand: ce.brand || "", family: "",
        client: ce.customerName || "", site: ce.site || "", assoc: ce.associate || "",
        loc: ce.location || "", freight: (ce.freight != null ? ce.freight : 0), fto: ce.freightTo || "Client",
        disc: (ce.discAmt != null ? ce.discAmt : 0), discnote: ce.discNote || "",
        driver: ce.driver || "", dmob: ce.driverMobile || "", veh: ce.vehicle || "",
        items: eItems.map(function (l) { return { code: l.code, desc: l.desc, unit: l.unit, qty: l.qty, rate: l.rate, brand: l.brand, disc: l.disc }; })
      };
      S.modal = modalChallan(); render(); return;
    }
    if (act === "ch-save") {
      var cn = val("m_client");
      if (!cn) { toast("Enter the client."); return; }
      var lines = (S.ch && S.ch.items) || [];
      if (!lines.length) { toast("Pick at least one product."); return; }
      var cObj = clientByName(cn) || {};
      var siteName = val("m_site");
      var siteObj = S.data.sites.filter(function (x) { return x.name === siteName; })[0] || {};
      /* Freeze the client's pre-set brand discount onto each line at creation, so billing reads a
         value that never changes even if an admin edits the pre-set later (edit affects only future
         challans). Admin can override a line product-wise later in the Billing screen. */
      var chBrandV = val("m_brand") || (S.ch && S.ch.brand) || "";
      lines = lines.map(function (l) {
        var prod = (PRODUCTS.filter(function (x) { return x.code === l.code; })[0]) || {};
        var lb = l.brand || realBrand(prod) || chBrandV;
        var pd = (l.disc != null && l.disc !== "") ? Number(l.disc) : clientDiscount(cn, lb);
        return { code: l.code, desc: l.desc, unit: l.unit, qty: l.qty, rate: l.rate, brand: lb, disc: pd };
      });
      var amount = lines.reduce(function (a, l) { return a + (Number(l.qty) || 0) * (Number(l.rate) || 0); }, 0);
      var assocName = val("m_assoc");
      var itemsJson = JSON.stringify(lines);
      /* Read EVERY form field into plain vars NOW, before we close the modal. Once the modal is
         gone the inputs no longer exist, so any val() after this point would read blank. */
      var dName = val("m_driver"), dMob = val("m_dmob"), dVeh = val("m_veh");
      var brandV = val("m_brand") || (S.ch && S.ch.brand) || "";
      var locV = val("m_loc"), freightV = val("m_freight") || 0, ftoV = val("m_fto");
      var discV = val("m_disc") || 0, discnoteV = val("m_discnote");

      /* Make sure the driver exists in the master before the challan points at him. A driver
         typed as free text can never be totalled, so freight per driver would be guesswork. */
      var known = (S.data.drivers || []).filter(function (x) {
        return String(x.name).trim().toLowerCase() === dName.trim().toLowerCase();
      })[0];
      var driverReady = (!dName || known)
        ? Promise.resolve(known || null)
        : save("drivers", { id: "", name: dName, mobile: dMob, vehicle: dVeh, defaultFare: freightV || "" })
            .then(function () {
              return (S.data.drivers || []).filter(function (x) {
                return String(x.name).trim().toLowerCase() === dName.trim().toLowerCase();
              })[0] || null;
            });

      /* Editing an existing challan? Capture its identity BEFORE we clear S.ch. */
      var editId = S.ch && S.ch.editId, editNo = S.ch && S.ch.editNo, editStatus = S.ch && S.ch.editStatus;
      var editRow = editId ? ((S.data.challans || []).filter(function (x) { return x.id === editId; })[0] || {}) : null;

      /* SNAPPY: close the builder instantly and toast, so the user never stares at a blocked
         "Creating..." button through two slow Apps Script round-trips. The driver-lookup and the
         challan-number reservation now run in PARALLEL (were sequential), and the actual save is
         journaled by the bulletproof save() so nothing can be lost even if the network drops. */
      S.modal = null; S.ch = null;

      /* ----- EDIT an existing (pre-dispatch) challan ----- */
      if (editId) {
        var wasApproved = editStatus === "Approved";
        toast("Saving changes to " + editNo + "...");
        render();
        driverReady.then(function (dRec) {
          var ch = Object.assign({}, editRow, {
            id: editId, challanNo: editNo,
            customerId: cObj.id || editRow.customerId || "", customerName: cn,
            siteId: siteObj.id || "", site: siteName || "",
            brand: brandV, location: locV,
            items: lines.map(function (l) { return l.desc + " x" + l.qty; }).join(", "),
            itemsJson: itemsJson, amount: amount,
            freight: freightV, freightTo: ftoV,
            discAmt: discV, discNote: discnoteV,
            driver: dName, driverId: (dRec && dRec.id) || editRow.driverId || "",
            driverMobile: dMob || (dRec && dRec.mobile) || "",
            vehicle: dVeh || (dRec && dRec.vehicle) || "",
            associate: assocName
          });
          /* Approval was given on the earlier contents. Changed contents must be approved again
             before any material is released, so an edit sends an Approved challan back to Draft. */
          if (wasApproved) { ch.status = "Draft"; ch.approvedBy = ""; }
          return save("challans", ch).then(function (r) {
            if (!r) return;
            toast(wasApproved ? "Saved - back to Draft, approve again before dispatch." : "Challan " + editNo + " updated.");
            render();
          });
        }).catch(function () { toast("Kept safe on this device - will sync on next refresh."); });
        return;
      }

      /* ----- CREATE a new challan ----- */
      toast("Creating challan for " + cn + "...");
      render();

      Promise.all([driverReady, api("challanNo", { client: cObj.shortName || cn })]).then(function (arr) {
        var dRec = arr[0], n = arr[1];
        var no = (n && n.challanNo) || (cn.toUpperCase().slice(0, 6) + "/" + today().slice(8) + "/001");
        var ch = {
          id: "", createdBy: S.user, challanNo: no,
          customerId: cObj.id || "", customerName: cn,
          siteId: siteObj.id || "", site: siteName || "",
          brand: brandV, location: locV,
          items: lines.map(function (l) { return l.desc + " x" + l.qty; }).join(", "),
          itemsJson: itemsJson, amount: amount,
          freight: freightV, freightTo: ftoV,
          discAmt: discV, discNote: discnoteV,
          driver: dName, driverId: (dRec && dRec.id) || "",
          driverMobile: dMob || (dRec && dRec.mobile) || "",
          vehicle: dVeh || (dRec && dRec.vehicle) || "",
          associate: assocName, commissionSet: "N", status: "Draft", receiptReceived: "N"
        };
        return save("challans", ch).then(function (r) {
          if (!r) return;
          toast("Challan " + no + " created - pending approval.");
          render();
          sendChallanPdf(r, "TG_CHALLAN",
            "<b>Challan " + no + "</b>\n" + cn + (siteName ? " - " + siteName : "") +
            "\nCreated by <b>" + S.user + "</b>\n\n<i>PENDING APPROVAL</i>", null)
            .then(function (tg) { toast(tg && tg.ok ? "Sent to challan bot." : "Saved, but Telegram send failed."); });
        });
      }).catch(function () { toast("Kept safe on this device - will sync on next refresh."); });
      return;
    }

    if (act === "alt-q") { return; }
    if (act === "alt-cancel") { S.alt = null; S.modal = null; render(); return; }
    /* read what is on screen back into state before ANY re-render, or the quantities the
       storeman just typed are wiped by the redraw. */
    function altReadBack() {
      (S.alt.rows || []).forEach(function (r, i) {
        var q = el("alt_q" + i), n2 = el("alt_n" + i);
        if (q) r.now = Number(q.value) || 0;
        if (n2) r.note = String(n2.value || "").trim();
      });
    }
    if (act === "alt-add") {
      altReadBack();
      var pd = val("alt_add"), pq = Number(val("alt_addq")) || 0;
      if (!pd || !pq) { toast("Pick a product and a quantity."); return; }
      var pp = PRODUCTS.filter(function (x) { return x.label === pd || x.code === pd; })[0] || {};
      S.alt.rows.push({ code: pp.code || "", desc: pp.desc || pd, unit: pp.unit || "No's",
        was: 0, now: pq, note: "Added at site" });
      S.modal = modalAlter(); render(); return;
    }
    if (act === "alt-save") {
      altReadBack();
      /* only the lines that actually differ are worth recording */
      var changed = S.alt.rows.filter(function (r) { return Number(r.now) !== Number(r.was); });
      var missingWhy = changed.filter(function (r) { return !r.note; });
      if (missingWhy.length) { toast("Give a reason for each changed line."); return; }
      var cid = S.alt.id;
      /* Optimistic save: update the challan locally and close the screen instantly, so the user
         never waits on the two (slow) Apps Script round-trips. The save then runs in the
         background; if the server rejects it, a quiet re-sync reconciles and we warn. */
      var ch4 = S.data.challans.filter(function (x) { return x.id === cid; })[0];
      if (ch4) {
        ch4.status = "Received"; ch4.receiptReceived = "Y";
        if (changed.length) { ch4.altJson = JSON.stringify(changed); ch4.alteredBy = S.user; }
      }
      S.alt = null; S.modal = null;
      toast(changed.length ? "Receipt in, with " + changed.length + " alteration(s)." : "Receipt in - full quantity.");
      render();
      var fail = function () { toast("Saved on your device - server sync failed, it will retry on next refresh."); quietSync(); };
      (changed.length ? api("challanAlter", { id: cid, alterations: changed }) : Promise.resolve({ ok: true }))
        .then(function (r) {
          if (!r || !r.ok) { fail(); return; }
          return api("challanMove", { id: cid, to: "Received" }).then(function (r2) {
            if (!r2 || !r2.ok) { fail(); return; }
            quietSync();
          });
        }).catch(fail);
      return;
    }
    if (act === "ch-move") {
      var to = t.getAttribute("data-to");
      var ch2 = S.data.challans.filter(function (x) { return x.id === id; })[0];
      if (!ch2) return;
      if (to === "Received") { S.alt = { id: id, rows: null }; S.modal = modalAlter(); render(); return; }
      /* Approving a dispatch releases real material. A pocket tap must not do that, so the PIN
         is asked again here - the same one used to sign in, nothing new to remember. */
      if (to === "Approved" || to === "Dispatched") {
        var pin = window.prompt("Enter your PIN to " + (to === "Approved" ? "APPROVE" : "DISPATCH") +
          "\n\n" + ch2.challanNo + " - " + ch2.customerName +
          "\n\nThis releases material. It is not a formality.");
        if (!pin) return;
        /* SNAPPY: flip the status and redraw INSTANTLY so approving many challans feels immediate.
           The server still validates the PIN in the background; if it refuses, we revert the row
           and tell the user. No quietSync round-trip on success - the local state already matches. */
        var prevStatus = ch2.status, prevBy = ch2.approvedBy || "";
        ch2.status = to;
        if (to === "Approved") { ch2.approvedBy = S.user; toast("Approved."); }
        else { toast("Dispatched."); }
        render();
        var revert = function (msg) {
          ch2.status = prevStatus; ch2.approvedBy = prevBy;
          toast(msg || ("Could not " + (to === "Approved" ? "approve" : "dispatch") + " - reverted."));
          render();
        };
        api("challanMove", { id: id, to: to, approvePin: pin }).then(function (r) {
          if (!r || !r.ok) { revert(r && r.error); return; }
          if (to === "Approved") { ch2.approvedBy = r.by || S.user; render(); return; }
          sendChallanPdf(ch2, "TG_DISPATCH",
            "<b>DISPATCH: " + ch2.challanNo + "</b>\n" + ch2.customerName +
            (ch2.driver ? "\nDriver: " + ch2.driver : "") +
            "\nApproved by <b>" + (ch2.approvedBy || r.by) + "</b>", ch2.approvedBy || r.by)
            .then(function (tg) { toast(tg && tg.ok ? "Sent to dispatch bot." : "Dispatch done, Telegram send failed."); });
        }).catch(function () { revert("Network error - reverted."); });
        return;
      }
      /* SNAPPY: flip instantly, validate in the background, revert on refusal (no full refresh). */
      var prevS2 = ch2.status, prevR2 = ch2.receiptReceived;
      ch2.status = to;
      if (to === "Received") { ch2.receiptReceived = "Y"; toast("Receipt in. Ledger, freight and partner incentive now count for this challan."); }
      else if (to === "Dispatched") { toast("Dispatched."); }
      else { toast("Updated."); }
      render();
      var revert2 = function (msg) { ch2.status = prevS2; ch2.receiptReceived = prevR2; toast(msg || "Could not update - reverted."); render(); };
      api("challanMove", { id: id, to: to }).then(function (r) {
        if (!r || !r.ok) { revert2(r && r.error); return; }
        if (to === "Approved") { ch2.approvedBy = r.by; render(); }
        else if (to === "Dispatched") {
          sendChallanPdf(ch2, "TG_DISPATCH",
            "<b>DISPATCH: " + ch2.challanNo + "</b>\n" + ch2.customerName +
            (ch2.driver ? "\nDriver: " + ch2.driver : "") +
            "\nApproved by <b>" + (ch2.approvedBy || "-") + "</b>", ch2.approvedBy || "")
            .then(function (tg) { toast(tg && tg.ok ? "Sent to dispatch bot." : "Dispatch send failed."); });
        }
      }).catch(function () { revert2("Network error - reverted."); });
      return;
    }

    if (act === "ch-pdf") {
      var ch3 = S.data.challans.filter(function (x) { return x.id === id; })[0];
      if (!ch3) return;
      toast("Building PDF...");
      loadLogo().then(function () { return challanPdf(ch3, ch3.approvedBy || ""); })
        .then(function (d) { d.save(String(ch3.challanNo).replace(/[^\w.-]/g, "_") + ".pdf"); });
      return;
    }
  });

  function savePitch(brand, patch) {
    var site = siteById(S.siteId);
    if (!site) return;
    var p = pitchRow(site.id, brand) || {};
    var row = {
      id: p.id || "", createdBy: p.createdBy || S.user, siteId: site.id, siteName: site.name, brand: brand,
      status: p.status || "Not pitched", quoted: p.quoted || "", won: p.won || "", lostTo: p.lostTo || "", note: p.note || ""
    };
    Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    save("pitch", row).then(function (r) { if (r) toast(brand + ": " + row.status); });
  }

  document.addEventListener("change", function (e) {
    var t = e.target;

    /* "+ Add new" chosen on the client form's plumber/architect dropdown: park the half-filled
       client form, open the partner form (mobile compulsory), and come back with him selected. */
    if (t.id === "c_arch" || t.id === "c_plumb") {
      if (t.value === "__new__") {
        S.clDraft = { field: t.id, vals: clFormVals() };
        S.clDraft.vals[t.id] = "";
        S.modal = modalAssociate({ role: t.id === "c_arch" ? "Architect" : "Plumber" });
        render();
      }
      return;
    }
    /* sites form never offers add-new; just guard the sentinel in case */
    if ((t.id === "s_arch" || t.id === "s_plumb") && t.value === "__new__") { t.value = ""; return; }

    /* pick a known driver and his number, vehicle and usual fare fill themselves in */
    if (t.id === "m_driver") {
      var dd = (S.data.drivers || []).filter(function (x) {
        return String(x.name).trim().toLowerCase() === String(t.value).trim().toLowerCase();
      })[0];
      if (dd) {
        if (el("m_dmob")) el("m_dmob").value = dd.mobile || "";
        if (el("m_veh")) el("m_veh").value = dd.vehicle || "";
        if (el("m_freight") && !Number(val("m_freight"))) el("m_freight").value = dd.defaultFare || "";
      }
      return;
    }

    /* + Add new location / area, right inside the dropdown */
    if (t.id === "c_loc" || t.id === "m_aloc") {
      if (t.value === "+ Add new location") {
        var nl = String(window.prompt("New location (city) name") || "").trim();
        if (!nl) { t.value = (S.clEditing && S.clEditing.location) || ""; return; }
        if (t.id === "c_loc") {
          /* preserve the whole half-filled client form across the save's repaint, then reselect
             the new city — the old code blanked everything typed so far. */
          var vals = clFormVals(); vals.c_loc = nl;
          save("areas", { id: "", location: nl, area: "" }, true).then(function () {
            S.modal = modalClient(S.clEditing || null); render();
            clFormRestore(vals);
            var sel = el("c_loc");
            if (sel && sel.value !== nl) { var o = document.createElement("option"); o.value = nl; o.textContent = nl; sel.appendChild(o); sel.value = nl; }
            toast("Location added: " + nl);
          });
        } else {
          save("areas", { id: "", location: nl, area: "" }, true).then(function () { toast("Location added: " + nl); });
        }
        return;
      }
      /* partner form's area select cascades; the client form's area is a plain input (no cascade) */
      var areaSel = document.getElementById(t.id === "m_aloc" ? "m_aarea" : "");
      if (areaSel) areaSel.innerHTML = opts([""].concat(areasIn(t.value), ["+ Add new area"]), "");
      return;
    }
    if (t.id === "c_area" || t.id === "m_aarea") {
      if (t.value === "+ Add new area") {
        var locSel = document.getElementById(t.id === "c_area" ? "c_loc" : "m_aloc");
        var lv = locSel ? locSel.value : locations()[0];
        var na = window.prompt("New area under " + lv);
        if (!na) { t.value = ""; return; }
        save("areas", { id: "", location: lv, area: na }).then(function () {
          t.innerHTML = opts([""].concat(areasIn(lv), ["+ Add new area"]), na);
          toast("Area added: " + na);
        });
        return;
      }
      return;
    }

    /* picking a known partner pulls their details in */
    if (t.classList && t.classList.contains("pf")) {
      var p = partnerByName(t.value);
      var info = document.getElementById(t.id + "_info");
      if (info) {
        info.innerHTML = p
          ? esc([p.mobile, p.mobile2, p.area].filter(Boolean).join("  \u00b7  ")) || "no contact saved yet"
          : '<span style="color:#94a3b8">not in Partners yet - it will be added</span>';
      }
      return;
    }

    if (t.classList && t.classList.contains("bb-st")) {
      saveBrandStatus(t.getAttribute("data-c"), t.getAttribute("data-b"), t.getAttribute("data-id"), { status: t.value })
        .then(function (r) { if (r) toast(t.getAttribute("data-b") + ": " + t.value); });
      return;
    }
    if (t.classList && t.classList.contains("bb-amt")) {
      var pa = {}; pa[t.getAttribute("data-f")] = t.value;
      saveBrandStatus(t.getAttribute("data-c"), t.getAttribute("data-b"), t.getAttribute("data-id"), pa);
      return;
    }
    if (t.classList && t.classList.contains("billsel")) {
      if (!S.billSel) S.billSel = {};
      S.billSel[t.getAttribute("data-ch")] = t.checked;
      var _sy = window.scrollY; render(); window.scrollTo(0, _sy);
      return;
    }
    if (t.classList && t.classList.contains("bdsc")) {
      if (S.role !== "admin") return;
      var bch = (S.data.challans || []).filter(function (x) { return x.id === t.getAttribute("data-ch"); })[0];
      if (!bch) return;
      var bitems = []; try { bitems = JSON.parse(bch.itemsJson || "[]"); } catch (e) { bitems = []; }
      var bit = bitems.filter(function (x) { return x.code === t.getAttribute("data-code"); })[0];
      if (bit) { bit.disc = Number(t.value) || 0; bch.itemsJson = JSON.stringify(bitems); save("challans", bch); render(); }
      return;
    }
    if (t.classList && (t.classList.contains("dsc") || t.classList.contains("incp"))) {
      /* Discount / incentive fields are now DEFERRED: nothing is written as you type or leave a
         field. The values just sit in the boxes until you tap "Save & back", which reads every box
         on screen and commits them in one go (see the disc-saveall handler). This is what the owner
         asked for — no save after every entry. */
      return;
    }
    if (t.classList && t.classList.contains("bm")) {
      var m = S.data.brandmap.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0];
      if (!m) return;
      m.brand = t.value;
      save("brandmap", m).then(function (r) { if (r) toast(m.catalogValue + " -> " + (m.brand || "unmapped")); });
      return;
    }
    if (t.classList && t.classList.contains("qz-q") && S.qz) {
      var code = t.getAttribute("data-code");
      var q = Number(t.value) || 0;
      var p = PRODUCTS.filter(function (x) { return x.code === code; })[0];
      S.qz.items = S.qz.items.filter(function (x) { return x.code !== code; });
      if (q > 0 && p) {
        var qb = realBrand(p);
        S.qz.items.push({ code: p.code, desc: p.desc, family: p.family, price: p.price, qty: q, pic: p.pic, unit: p.unit, brand: qb });
        S.qz.brandDiscs = S.qz.brandDiscs || {};
        if (qb && S.qz.brandDiscs[qb] === undefined) S.qz.brandDiscs[qb] = clientDiscount(S.qz.client, qb);
      }
      keepScroll = true;
      render(); return;
    }
    if (t.classList && t.classList.contains("ch-q") && S.ch) {
      var chCode = t.getAttribute("data-code");
      var chQ = Math.max(0, Math.floor(Number(t.value) || 0));
      var chProd = PRODUCTS.filter(function (x) { return x.code === chCode; })[0] || {};
      var chRow = (S.ch.items || []).filter(function (i) { return i.code === chCode; })[0];
      if (chRow) {
        if (chQ <= 0) S.ch.items = S.ch.items.filter(function (i) { return i.code !== chCode; });
        else chRow.qty = chQ;
      } else if (chQ > 0) {
        S.ch.items.push({ code: chCode, desc: chProd.desc || chCode, unit: chProd.unit || "No's", qty: chQ, rate: chProd.price || 0 });
      }
      var restoreChQ = keepFields(CH_FIELDS);
      keepScroll = true;
      S.modal = modalChallan(); render(); restoreChQ();
      return;
    }
    if (t.classList && t.classList.contains("qz-d") && S.qz) {
      if (!canSetPricing()) return;   /* sales cannot change discounts */
      var c2 = t.getAttribute("data-code");
      var it2 = S.qz.items.filter(function (x) { return x.code === c2; })[0];
      if (it2) it2.disc = t.value === "" ? undefined : Number(t.value);
      render(); return;
    }
    if (t.classList && t.classList.contains("qs")) {
      var qq = S.data.quotes.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0];
      if (!qq) return;
      qq.status = t.value;
      save("quotes", qq).then(function (r) { if (r) toast("Quote " + qq.status + "."); });
      return;
    }
    if (t.classList && t.classList.contains("sp-price")) {
      var sp = S.data.spares.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0];
      if (!sp) return;
      sp.price = t.value;
      save("spares", sp).then(function (r) { if (r) toast("Price saved."); });
      return;
    }
    if (t.classList && t.classList.contains("pay-sal")) {
      save("payroll", {
        id: t.getAttribute("data-id") || "", month: t.getAttribute("data-month"),
        engineer: t.getAttribute("data-eng"), salary: t.value, notes: ""
      }).then(function (r) { if (r) toast("Salary saved."); });
      return;
    }
    if (t.classList && t.classList.contains("pm-status")) { savePitch(t.getAttribute("data-brand"), { status: t.value }); return; }
    if (t.classList && t.classList.contains("pm-amt")) {
      var patch = {}; patch[t.getAttribute("data-f")] = t.value;
      savePitch(t.getAttribute("data-brand"), patch); return;
    }
    if (t.classList && t.classList.contains("rl")) {
      var rid = t.getAttribute("data-id");
      var rule = S.data.rules.filter(function (x) { return x.id === rid; })[0];
      if (!rule) return;
      rule[t.getAttribute("data-f")] = t.value;
      save("rules", rule).then(function (r) { if (r) toast("Rule updated."); });
      return;
    }
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains("sv-d")) {
      var sp = spareByName(t.value);
      if (!sp) return;
      var row = t.closest(".lineitem");
      if (sp.price) row.querySelector(".sv-r").value = sp.price;
      if (!row.querySelector(".sv-q").value) row.querySelector(".sv-q").value = 1;
      return;
    }
    if (!t.classList || !t.classList.contains("li-d")) return;
    var p = findProduct(t.value);
    if (!p) return;
    var row = t.closest(".lineitem");
    var rate = row.querySelector(".li-r");
    var qty = row.querySelector(".li-q");
    if (p.price) rate.value = p.price;
    if (!qty.value) qty.value = 1;
  });

  /* ---------------- install prompt ----------------
     Most of the team will open this from a WhatsApp link and then keep opening the link.
     Running it from the home screen matters: it gets a real app icon, no browser chrome, and
     - the part that actually bites - the camera and GPS permissions stick, so a site visit
     does not re-ask every single time. Chrome/Android gives us a real install prompt; iOS
     never will, so there we show the two-step Share > Add to Home Screen instruction. */
  var deferredPrompt = null;
  var INSTALL_DISMISS = "ew_install_dismissed";

  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function installDismissed() {
    try { return localStorage.getItem(INSTALL_DISMISS) === "1"; } catch (e) { return false; }
  }
  function dismissInstall() {
    try { localStorage.setItem(INSTALL_DISMISS, "1"); } catch (e) { }
    var b = document.getElementById("ewInstall");
    if (b) b.parentNode.removeChild(b);
  }

  function showInstallBar() {
    if (isInstalled() || installDismissed() || document.getElementById("ewInstall")) return;
    if (!deferredPrompt && !isIOS()) return;          /* nothing we can offer on this browser */
    var bar = document.createElement("div");
    bar.id = "ewInstall";
    bar.setAttribute("style",
      "position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:#0b3b36;color:#fff;" +
      "border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.28);" +
      "display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.35");
    var msg = isIOS()
      ? "<b>Install Energy World</b><br><span style='color:#9fd8d0'>Tap Share, then <b>Add to Home Screen</b>. Keeps you signed in and stops the camera asking every time.</span>"
      : "<b>Install Energy World</b><br><span style='color:#9fd8d0'>Add it to your home screen - opens like an app, works on a weak signal.</span>";
    bar.innerHTML =
      '<div style="flex:1">' + msg + '</div>' +
      (isIOS() ? "" : '<button id="ewInstallGo" style="background:#5eead4;color:#06302c;border:0;border-radius:9px;padding:9px 14px;font-weight:700;font-size:13px">Install</button>') +
      '<button id="ewInstallNo" style="background:transparent;color:#7fb8b0;border:0;font-size:20px;padding:0 4px">&times;</button>';
    document.body.appendChild(bar);
    var no = document.getElementById("ewInstallNo");
    if (no) no.onclick = dismissInstall;
    var go = document.getElementById("ewInstallGo");
    if (go) go.onclick = function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (c) {
        if (c && c.outcome === "accepted") dismissInstall();
        deferredPrompt = null;
      });
    };
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBar();
  });
  window.addEventListener("appinstalled", function () { dismissInstall(); });
  /* iOS never fires beforeinstallprompt, so offer the manual route after the app settles */
  setTimeout(showInstallBar, 2500);

  (function boot() {
    var sess = null;
    try { sess = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (sess && sess.pin && sess.user) {
      S.pin = sess.pin; S.user = sess.user;
    // Warm start: the data is already on this device and was role-filtered by the
    // server when it was cached. Paint it now; verify the PIN in the background.
    // If the check fails we wipe and show the login screen.
    var warm = null;
    try { warm = snapLoad(); } catch (e) {}
    if (warm && warm.ok && sess.role) {
      S.role = sess.role;
      S.pinSet = sess.pinSet;
      if (String(S.pinSet || "").toUpperCase() === "Y") {   // "Y" = PIN is set; anything else must reset it first
        S.tab = (ROLE_TABS[S.role] || ["dash"])[0] || "dash";
        S.data = warm;
        S.warmStart = true;
        loadCatalog();
        render();
      }
    }
      api("teamAuth", { ua: navigator.userAgent }).then(function (r) {
        if (r && r.ok) {
          S.user = r.user.name; S.role = r.user.role; S.pinSet = r.user.pinSet;
          if (String(S.pinSet).toUpperCase() !== "Y") { renderPinChange(); return; }
          S.tab = (ROLE_TABS[S.role] || ["dash"])[0];
          loadCatalog(); refresh();
        } else { S.pin = ""; renderLogin(); }
      }).catch(function () {
        /* Network error on boot. If we already painted a valid warm session (this device's own
           role-filtered data), DON'T sign the user out - they're just offline or the network
           hiccupped, e.g. right after a heavy PDF reloaded the tab. Signing out here was what
           booted people to the login screen after downloading a statement. */
        if (S.warmStart) { toast("Offline - working from saved data."); loadCatalog(); }
        else { S.pin = ""; renderLogin("Network error."); }
      });
    } else {
      renderLogin();
      if (bioSaved() && bioAvailable()) setTimeout(bioUnlock, 400);
    }
  })();
})();