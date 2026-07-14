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
  var APP_VERSION = "4.21";
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
    data: { customers: [], followups: [], challans: [], associates: [], team: [], sites: [], pitch: [], rules: [], installs: [], visits: [], spares: [], payroll: [], clients: [], drivers: [], quotes: [], discounts: [], commrates: [], payments: [], commpay: [], incentives: [], sitevisits: [], brands: [], brandmap: [], areas: [] }
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

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var ROLE_TABS = {
    admin:    ["search","dash","clients","partners","quotes","sites","leads","winloss","visits","followups","challans","payments","discounts","commission","service","spares","dues","payroll","products","catalogue","rules"],
    accounts: ["search","dash","clients","partners","followups","challans","payments","discounts","service","spares","dues","products"],
    godown:   ["search","dash","challans","products"],
    sales:    ["search","dash","clients","partners","quotes","sites","leads","winloss","visits","followups","challans","discounts","products"],
    service:  ["search","dash","service","spares","dues","followups","products"]
  };
  function canSee(tab) {
    var t = ROLE_TABS[S.role] || ["dash"];
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

  function save(tab, row) {
    /* optimistic: merge the saved row straight into local state and repaint immediately.
       The server is still the source of truth - we re-sync quietly in the background. */
    return api("teamSave", { tab: tab, row: row }).then(function (r) {
      if (!r || !r.ok) { toast("Save failed: " + ((r && r.error) || "unknown")); return null; }
      var list = S.data[tab] || (S.data[tab] = []);
      var i = -1;
      for (var k = 0; k < list.length; k++) { if (list[k].id === r.row.id) { i = k; break; } }
      if (i >= 0) list[i] = Object.assign({}, list[i], r.row); else list.push(r.row);
      render();
      quietSync();
      return r.row;
    });
  }

  /* background re-sync, at most once every 20s, never blocks the screen */
  var syncAt = 0, syncing = false;
  function quietSync() {
    if (syncing || Date.now() - syncAt < 20000) return;
    syncing = true;
    api("teamGet").then(function (r) {
      syncing = false; syncAt = Date.now();
      if (r && r.ok) { S.data = r; snapSave(); render(); }
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
      if (r && r.ok) { S.data = r; snapSave(); }
      render();
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

  /* ---------------- product catalog (853 items, live from the Sheet) ---------------- */
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
        pic: String(row[10] || "").trim(),
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
    var rules = S.data.rules.slice().sort(function (a, b) { return (Number(a.pitchBy) || 0) - (Number(b.pitchBy) || 0); });
    rules.forEach(function (r) {
      var p = pitchRow(site.id, r.brand) || {};
      var a = action(site, r, p);
      var cls = a.k === "closed" ? "due" : (a.k === "now" ? "due" : (a.k === "won" ? "Won" : (a.k === "lost" ? "Lost" : (a.k === "soon" ? "soon" : "teal"))));
      h += '<div class="card"><h3>' + esc(r.brand) + ' <span class="pill ' + cls + '">' + esc(a.t) + '</span></h3>' +
        '<div class="meta">' + esc(r.line) + '<br>Pitch by stage ' + esc(r.pitchBy) + ' &middot; supply at stage ' + esc(r.supplyAt) +
        (r.why ? '<br><i>' + esc(r.why) + '</i>' : "") + '</div>' +
        '<div class="acts" style="align-items:center">' +
        '<select class="pm-status" data-brand="' + esc(r.brand) + '" style="width:auto;padding:7px 10px;font-size:13px">' +
        opts(PSTATUS, p.status || "Not pitched") + '</select>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="quoted" inputmode="numeric" placeholder="Quoted Rs" value="' + esc(p.quoted || "") + '" style="width:110px;padding:7px 10px;font-size:13px"/>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="won" inputmode="numeric" placeholder="Won Rs" value="' + esc(p.won || "") + '" style="width:100px;padding:7px 10px;font-size:13px"/>' +
        '<input class="pm-amt" data-brand="' + esc(r.brand) + '" data-f="lostTo" placeholder="Lost to" value="' + esc(p.lostTo || "") + '" style="width:110px;padding:7px 10px;font-size:13px"/>' +
        '</div></div>';
    });
    return h;
  }

  function viewWinLoss() {
    var h = '<div class="empty" style="text-align:left;padding:0 0 12px">Win rate per product line across every site.</div>';
    var rows = S.data.rules.map(function (r) {
      var ps = S.data.pitch.filter(function (p) { return p.brand === r.brand; });
      var cnt = function (st) { return ps.filter(function (p) { return p.status === st; }).length; };
      var won = cnt("Won"), lost = cnt("Lost");
      var missed = S.data.sites.filter(function (site) {
        return action(site, r, pitchRow(site.id, r.brand)).k === "closed";
      }).length;
      var wonVal = ps.reduce(function (a, p) { return a + (Number(p.won) || 0); }, 0);
      return { brand: r.brand, line: r.line, won: won, lost: lost, missed: missed,
        rate: (won + lost) ? Math.round(won * 100 / (won + lost)) : null, val: wonVal };
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
      '<div class="grid2"><div><label>Architect</label><input id="s_arch" value="' + esc(x.architect) + '"/></div>' +
      '<div><label>Plumber</label><input id="s_plumb" value="' + esc(x.plumber) + '"/></div></div>' +
      '<div class="grid2"><div><label>Builder / PMC</label><input id="s_build" value="' + esc(x.builder) + '"/></div>' +
      '<div><label>Owner (sales exec)</label><select id="s_owner">' + opts(["","Vivek Verma","Ashish Bhuker","Imran","Mukesh Verma","Dinesh Verma"], x.owner) + '</select></div></div>' +
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
  /* The catalogue Master Brand column mixes real brands with categories. Map it. */
  function realBrand(p) {
    var m = S.data.brandmap.filter(function (x) { return String(x.catalogValue) === String(p.brand); })[0];
    return (m && m.brand) ? m.brand : "";
  }
  function brandList() {
    var live = {};
    PRODUCTS.forEach(function (p) { var b = realBrand(p); if (b) live[b] = (live[b] || 0) + 1; });
    return S.data.brands
      .filter(function (b) { return String(b.active).toUpperCase() !== "N" && live[b.brand]; })
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

  function viewClients() {
    var loc = S.q;
    var list = S.data.clients.filter(function (c) { return !loc || c.location === loc; });
    var h = '<div class="row">' + LOCATIONS.map(function (l) {
      return '<button class="btn sm ' + (S.q === l ? "" : "ghost") + '" data-act="cl-loc" data-loc="' + esc(l) + '">' + esc(l) + '</button>';
    }).join("") + '<button class="btn sm ' + (S.q ? "ghost" : "") + '" data-act="cl-loc" data-loc="">All</button>' +
      '<div class="grow"></div><button class="btn" data-act="cl-new">+ New client</button></div>';
    if (!list.length) h += '<div class="empty">No clients here yet.</div>';
    list.forEach(function (c) {
      var partners = [c.architect && "Arch: " + c.architect, c.plumber && "Plumber: " + c.plumber,
        c.builder && "Builder: " + c.builder, c.pmc && "PMC: " + c.pmc].filter(Boolean);
      var bp = S.data.pitch.filter(function (p) { return p.clientName === c.name; });
      var bw = bp.filter(function (p) { return p.status === "Won"; }).length;
      var bq = bp.filter(function (p) { return p.status === "Quoted" || p.status === "Negotiating"; }).length;
      var bl = bp.filter(function (p) { return p.status === "Lost"; }).length;
      h += '<div class="card"><h3>' + esc(c.name) + ' <span class="pill teal">' + esc(c.location || "-") + '</span>' +
        (bw ? ' <span class="bs win">' + bw + ' WON</span>' : "") +
        (bq ? ' <span class="bs quoted">' + bq + ' QUOTED</span>' : "") +
        (bl ? ' <span class="bs lose">' + bl + ' LOST</span>' : "") + '</h3>' +
        '<div class="meta">' + esc([c.mobile, c.mobile2].filter(Boolean).join("  &middot;  ")) +
        (c.area ? '<br>' + esc(c.area) : "") + (c.address ? '<br>' + esc(c.address) : "") +
        (partners.length ? '<br>' + esc(partners.join(" - ")) : "") + '</div>' +
        '<div class="acts">' + (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : "") +
        '<button class="btn sm" data-act="qz-for" data-id="' + esc(c.id) + '">Quote</button>' +
        '<button class="btn sm ghost" data-act="bb-open" data-n="' + esc(c.name) + '">Brands</button>' +
        '<button class="btn sm ghost" data-act="cl-open" data-id="' + esc(c.id) + '">Edit</button></div></div>';
    });
    return h;
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
    return '<h2>' + (c.id ? "Edit client" : "Register new client") + '</h2>' +
      '<p class="sub">Partners preset here flow into every quote, challan and incentive.</p>' +
      '<label>Client name</label><input id="c_name" value="' + esc(c.name) + '"/>' +
      '<div class="grid2"><div><label>Location</label><select id="c_loc">' + opts(LOCATIONS, c.location || LOCATIONS[0]) + '</select></div>' +
      '<div><label>Type</label><select id="c_type">' + opts(CLIENT_TYPES, c.type || "Home owner") + '</select></div></div>' +
      '<div class="grid2"><div><label>Mobile</label><input id="c_mob" inputmode="numeric" value="' + esc(c.mobile) + '"/></div>' +
      '<div><label>Short name (challan no.)</label><input id="c_short" value="' + esc(c.shortName) + '" placeholder="SHARMA"/></div></div>' +
      '<label>Address</label><input id="c_addr" value="' + esc(c.address) + '"/>' +
      '<div class="grid2"><div><label>Architect</label><input id="c_arch" list="dl_arch" value="' + esc(c.architect) + '"/></div>' +
      '<div><label>Plumber</label><input id="c_plumb" list="dl_plumb" value="' + esc(c.plumber) + '"/></div></div>' +
      '<div class="grid2"><div><label>Builder</label><input id="c_build" list="dl_build" value="' + esc(c.builder) + '"/></div>' +
      '<div><label>PMC</label><input id="c_pmc" list="dl_pmc" value="' + esc(c.pmc) + '"/></div></div>' +
      dl("dl_arch", "architect") + dl("dl_plumb", "plumber") + dl("dl_build", "builder") + dl("dl_pmc", "pmc") +
      '<label>Notes</label><textarea id="c_notes">' + esc(c.notes) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="cl-save" data-id="' + esc(c.id || "") + '">Save client</button></div>';
  }

  function uniRupee() { return true; }

  function qzTotals() {
    var gross = 0, net = 0;
    (S.qz.items || []).forEach(function (i) {
      var line = i.qty * i.price;
      var d = (i.disc === "" || i.disc === undefined || i.disc === null) ? S.qz.brandDisc : Number(i.disc);
      gross += line;
      net += line * (1 - (Number(d) || 0) / 100);
    });
    var gst = net * GST;
    return { gross: Math.round(gross), net: Math.round(net), gst: Math.round(gst), total: Math.round(net + gst) };
  }

  function viewQuotes() {
    if (S.qz) return viewQzWizard();
    var h = '<div class="row"><div class="grow"></div><button class="btn" data-act="qz-new">+ New quote</button></div>';
    var list = S.data.quotes.slice().reverse();
    if (!list.length) h += '<div class="empty">No quotes yet. Every quote is versioned - revising keeps the old one.</div>';
    list.forEach(function (q) {
      h += '<div class="card"><h3>' + esc(q.quoteNo) + ' <span class="pill ' + (q.status === "Won" ? "Won" : (q.status === "Lost" ? "Lost" : "teal")) + '">' + esc(q.status) + '</span>' +
        (Number(q.version) > 1 ? ' <span class="pill">v' + esc(q.version) + '</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(q.client) + ' - ' + esc(q.brand) +
        '<br>Gross ' + money(q.gross) + ' - disc ' + esc(q.discountPct) + '% - net ' + money(q.net) +
        '<br><b>Total incl GST: ' + money(q.total) + '</b>' +
        '<br>' + esc(dstr(q.createdAt)) + ' by ' + esc(q.createdBy) + '</div>' +
        '<div class="acts">' +
        '<select class="qs" data-id="' + esc(q.id) + '" style="width:auto;padding:7px 10px;font-size:13px">' + opts(QSTATUS, q.status) + '</select>' +
        '<button class="btn sm ghost" data-act="q-pdf" data-id="' + esc(q.id) + '">PDF</button>' +
        '<button class="btn sm ghost" data-act="q-tg" data-id="' + esc(q.id) + '">Send</button>' +
        '<button class="btn sm ghost" data-act="qz-revise" data-id="' + esc(q.id) + '">Revise</button></div></div>';
    });
    return h;
  }

  function viewQzWizard() {
    var z = S.qz;
    var steps = ["Client", "Brand", "Products", "Discount", "Review"];
    var h = '<div class="row">' + steps.map(function (nm, i) {
      return '<span class="pill ' + (z.step === i + 1 ? "teal" : "") + '">' + (i + 1) + '. ' + nm + '</span>';
    }).join("") + '<div class="grow"></div><button class="btn sm ghost" data-act="qz-cancel">Cancel</button></div>';

    if (z.step === 1) {
      var inLoc = S.data.clients.filter(function (c) { return !z.location || c.location === z.location; });
      h += '<div class="card"><h3>Where is the client?</h3><div class="acts">' +
        LOCATIONS.map(function (l) {
          return '<button class="btn sm ' + (z.location === l ? "" : "ghost") + '" data-act="qz-loc" data-loc="' + esc(l) + '">' + esc(l) + '</button>';
        }).join("") + '</div></div>';
      if (z.location) {
        h += '<div class="card"><h3>Which client?</h3>' +
          '<div class="meta">' + inLoc.length + ' client(s) in ' + esc(z.location) + '. Start typing.</div>' +
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
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="2">Brands</button>' +
        '<span class="pill teal">' + esc(z.brand) + '</span><div class="grow"></div>' +
        '<button class="btn" data-act="qz-step" data-step="4">Discount (' + (z.items || []).length + ')</button></div>';

      /* families as small horizontal chips, not a vertical wall of cards */
      var fams = familyList(z.brand);
      h += '<div class="chips">' + fams.map(function (f) {
        var n = brandProducts(z.brand).filter(function (p) { return p.family === f; }).length;
        return '<button class="chip ' + (z.family === f ? "on" : "") + '" data-act="qz-fam" data-fam="' + esc(f) + '">' +
          esc(f) + ' <b>' + n + '</b></button>';
      }).join("") + '</div>';

      if (!z.family) return h + '<div class="empty">Pick a family above.</div>';

      /* compact product rows: pic, name, price, stepper - all on one line */
      h += '<div class="plist">';
      brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
        var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
        h += '<div class="prow ' + (ex ? "picked" : "") + '">' +
          (p.pic ? '<img src="' + esc(p.pic) + '" loading="lazy"/>' : '<div class="noimg"></div>') +
          '<div class="pinfo"><div class="pname">' + esc(p.desc) + '</div>' +
          '<div class="pmeta">' + esc(p.code) + ' &middot; ' + money(p.price) + ' / ' + esc(p.unit) + '</div></div>' +
          '<div class="pqty">' +
          '<button class="stp" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="-1">&minus;</button>' +
          '<input class="qz-q" data-code="' + esc(p.code) + '" inputmode="numeric" value="' + esc(ex ? ex.qty : "") + '" placeholder="0"/>' +
          '<button class="stp" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
          '</div></div>';
      });
      h += '</div>';
      return h;
    }

    if (z.step === 4) {
      var t4 = qzTotals();
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="3">Products</button>' +
        '<div class="grow"></div><button class="btn" data-act="qz-step" data-step="5">Review</button></div>';

      /* brand discount first - that is the decision 95% of the time */
      h += '<div class="card"><h3>Discount on ' + esc(z.brand) + '</h3>' +
        '<div class="meta">Applied to every line in this quote.</div>' +
        '<div class="acts" style="align-items:center">' +
        '<input id="qz_bd" inputmode="decimal" value="' + esc(z.brandDisc) + '" style="width:90px;padding:9px 10px;font-size:16px;font-weight:700"/>' +
        '<span class="pill teal">% off list</span>' +
        '<button class="btn sm" data-act="qz-bd">Apply</button></div></div>';

      /* product-wise override hidden behind a disclosure - most people never need it */
      var overrides = (z.items || []).filter(function (i) { return i.disc !== undefined && i.disc !== ""; }).length;
      h += '<button class="btn ghost" data-act="qz-adv" style="width:100%;margin-bottom:10px">' +
        (z.adv ? "\u25B2 Hide product-wise discount" : "\u25BC Change discount product-wise") +
        (overrides ? "  (" + overrides + " overridden)" : "") + '</button>';

      if (z.adv) {
        h += '<div class="plist">';
        (z.items || []).forEach(function (i) {
          var d = (i.disc === "" || i.disc === undefined || i.disc === null) ? z.brandDisc : i.disc;
          var lineNet = Math.round(i.qty * i.price * (1 - (Number(d) || 0) / 100));
          h += '<div class="prow">' +
            '<div class="pinfo"><div class="pname">' + esc(i.desc) + '</div>' +
            '<div class="pmeta">' + i.qty + ' \u00d7 ' + money(i.price) + '  \u2192  <b>' + money(lineNet) + '</b></div></div>' +
            '<div class="pqty">' +
            '<input class="qz-d" data-code="' + esc(i.code) + '" inputmode="decimal" value="' + esc(i.disc === undefined ? "" : i.disc) + '" placeholder="' + esc(z.brandDisc) + '" style="width:52px"/>' +
            '<span class="pill">%</span></div></div>';
        });
        h += '</div>';
      }

      h += '<div class="card"><div class="meta">Gross ' + money(t4.gross) +
        '<br>After discount <b>' + money(t4.net) + '</b>' +
        '<br><span style="color:#94a3b8">GST as actual - never printed on the quote</span></div></div>';
      return h;
    }

    var tt = qzTotals();
    h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="4">Back to discount</button></div>';
    h += '<div class="card"><h3>' + esc(z.client) + ' - ' + esc(z.brand) + '</h3><div class="meta">';
    (z.items || []).forEach(function (i) {
      var d = (i.disc === "" || i.disc === undefined || i.disc === null) ? z.brandDisc : i.disc;
      h += esc(i.desc) + ' - ' + i.qty + ' x ' + money(i.price) + ' @ ' + (Number(d) || 0) + '% off<br>';
    });
    h += '<br>Gross ' + money(tt.gross) + '<br>Net ' + money(tt.net) + '<br>GST 18% ' + money(tt.gst) +
      '<br><b>Total ' + money(tt.total) + '</b></div>' +
      '<div class="acts"><button class="btn" data-act="qz-save">Save quote</button></div></div>';
    return h;
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
      '<button class="btn" data-act="pr-new">+ Add product</button></div>';
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
      '<button class="btn" data-act="pr-save">Save product</button></div>';
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
    }));
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
    if (!url) return Promise.resolve(null);
    if (PIC_CACHE[url] !== undefined) return Promise.resolve(PIC_CACHE[url]);
    return api("imgB64", { url: url }).then(function (r) {
      if (!r || !r.ok) { PIC_CACHE[url] = null; return null; }
      return shrinkPic("data:" + r.mime + ";base64," + r.b64, 300, trim ? 0.85 : 0.75, trim).then(function (p) {
        PIC_CACHE[url] = p ? p.src : null;
        PIC_DIM[url] = p ? { w: p.w, h: p.h } : null;
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
    "Prices are Ex Works Panipat warehouse.",
    "VALIDITY - This quotation is valid for 30 days from the date of issue. Prices are subject to revision after expiry and re-quotation may be required for orders placed thereafter.",
    "PRODUCT IMAGES - Product images shown are for reference only. Actual product supplied may differ in appearance, colour, finish or packaging. The product description and model number shall be the basis of supply.",
    "PRICES & GST - Applicable GST at prevailing rates will be charged additionally. Prices are subject to change without prior notice based on supplier or MRP revisions.",
    "PAYMENT TERMS - 50% advance along with a signed Purchase Order confirms the booking. Balance is payable against the Proforma Invoice before dispatch. Cheques and demand drafts in favour of Energy World are subject to realization before order processing.",
    "DELIVERY - Delivery timelines are indicative and subject to stock availability and supplier lead times. Delivery charges, if applicable, are communicated separately and are not included unless explicitly stated.",
    "RETURNS & CANCELLATIONS - Goods once delivered and accepted cannot be returned unless defective or incorrectly supplied. Any discrepancy must be reported within 48 hours of delivery. Custom-ordered or imported items are non-returnable once placed with the supplier.",
    "WARRANTY - Products carry the respective manufacturer warranty. Energy World will assist in connecting the customer with the brand service team but does not assume warranty obligation on behalf of the manufacturer.",
    "INSTALLATION - Unless explicitly included, installation is not in the scope of supply. Energy World recommends installation by certified plumbers or brand-authorized technicians."
  ];

  function quotePdf(q) {
    var items = [];
    try { items = JSON.parse(q.items || "[]"); } catch (e) {}
    return Promise.all([
      loadFonts(),
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
        var d = (i.disc === "" || i.disc === undefined || i.disc === null) ? bd : Number(i.disc);
        d = Number(d) || 0;
        var net = Math.round(i.price * (1 - d / 100));
        return { desc: i.desc, code: i.code, pic: pics[idx], dim: PIC_DIM[i.pic] || null,
          unit: i.unit || "No's",
          qty: i.qty, price: i.price, disc: d, net: net, total: net * i.qty };
      });
      var ordered = rows.filter(function (r) { return r.disc > 0; }).sort(function (a, b) { return b.disc - a.disc; })
        .concat(rows.filter(function (r) { return r.disc <= 0; }));
      var subTotal = rows.reduce(function (a, r) { return a + r.total; }, 0);
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
        var lines = fitCell(doc, F, r.desc, DESC_W, 3, "normal", 6.4);
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
            doc.addImage(r.pic, "JPEG", X.pic + (BOXW - pw) / 2, y - 2.8 + (BOXH - ph) / 2, pw, ph);
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
        if (r.disc > 0) {
          col(GREY);
          doc.text(R(r.price), X.price, y + 0.6, { align: "right" });
          col([13, 148, 136]); F("bold");
          doc.text(r.disc.toFixed(1) + "%", X.dis, y + 0.6, { align: "right" });
          col(INK); F("normal");
          doc.text(R(r.net), X.dprice, y + 0.6, { align: "right" });
        } else {
          col(INK);
          doc.text(R(r.net), X.dprice, y + 0.6, { align: "right" });
        }
        F("bold"); doc.setFontSize(6.6); col(INK);
        doc.text(R(r.total), X.amt, y + 0.6, { align: "right" });

        y += hgt;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(L, y - 2.8, Rt, y - 2.8);
      });

      /* ---- sub-total. GST amount never appears. ---- */
      y += 4;
      if (y > 258) { doc.addPage(); y = 26; }
      fill([236, 253, 245]); doc.roundedRect(106, y - 4.5, Rt - 106, 11, 1.5, 1.5, "F");
      col([13, 118, 108]); F("bold"); doc.setFontSize(6.8);
      doc.text("Sub-Total { GST as Actual }", 110, y + 1.4);
      doc.setFontSize(10);
      doc.text(R(subTotal), X.amt, y + 1.6, { align: "right" });

      /* ================= TERMS ================= */
      doc.addPage(); y = 24;
      fill(MINT); doc.rect(L, y - 5, 1.8, 5.6, "F");
      col(DEEP); F("bold"); doc.setFontSize(11);
      doc.text("Terms & Conditions", L + 5, y - 0.5);
      y += 9;
      TERMS.forEach(function (tx) {
        var parts = tx.split(" - ");
        var hd = parts.length > 1 ? parts.shift() : "";
        var body = parts.join(" - ");
        F("normal"); doc.setFontSize(7.3);
        var ls = doc.splitTextToSize(body || tx, Rt - L - 10);
        var blk = (hd ? 4.5 : 0) + ls.length * 3.4 + 5;
        if (y + blk > 274) { doc.addPage(); y = 22; }
        fill([249, 251, 252]); doc.roundedRect(L, y - 4.5, Rt - L, blk, 1.5, 1.5, "F");
        fill(MINT); doc.rect(L, y - 4.5, 1.2, blk, "F");
        if (hd) { col([13, 118, 108]); F("bold"); doc.setFontSize(6.6); doc.text(hd.toUpperCase(), L + 5, y); y += 4.5; }
        col([55, 65, 81]); F("normal"); doc.setFontSize(7.3);
        doc.text(ls, L + 5, y);
        y += ls.length * 3.4 + 6.5;
      });

      /* ---- sign-off, bottom right of the last page. A quotation is a document a person
           stands behind, so the name goes where a signature goes - not in a header box. ---- */
      var me = (S.data.team || []).filter(function (t2) { return t2.name === q.createdBy; })[0] || {};
      if (y > 236) { doc.addPage(); y = 30; }
      var sy = 250;
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.line(Rt - 62, sy, Rt, sy); doc.setLineWidth(0.2);
      col(GREY); F("bold"); doc.setFontSize(5.8);
      doc.text("PREPARED BY", Rt, sy + 5, { align: "right" });
      col(INK); F("bold"); doc.setFontSize(10);
      doc.text(String(q.createdBy || "-"), Rt, sy + 11.5, { align: "right" });
      if (me.mobile) {
        col(GREY); F("normal"); doc.setFontSize(7.4);
        doc.text(String(me.mobile), Rt, sy + 16.2, { align: "right" });
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
    var vs = siteVisits(site.id);
    var d = (site.lat && site.lng) ? metresBetween(Number(site.lat), Number(site.lng), S.gps.lat, S.gps.lng) : null;
    return '<h2>' + (vs.length ? "Revisit" : "First visit") + '</h2>' +
      '<p class="sub">' + esc(site.name) + (d !== null ? '  \u00b7  ' + d + 'm from the site' : "") + '</p>' +
      (vs.length ? '<div class="card"><div class="meta"><b>' + vs.length + ' previous visit(s)</b><br>Last: ' +
        esc(dstr(vs[vs.length - 1].date)) + ' by ' + esc(vs[vs.length - 1].createdBy) + '</div></div>' : "") +
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

  function challanPdf(c, approver) {
    return loadFonts().then(function (f) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      var uni = false;
      if (f) {
        doc.addFileToVFS("DejaVuSans.ttf", f.reg); doc.addFont("DejaVuSans.ttf", "DJ", "normal");
        doc.addFileToVFS("DejaVuSans-Bold.ttf", f.bold); doc.addFont("DejaVuSans-Bold.ttf", "DJ", "bold");
        uni = true;
      }
      var F = function (w) { doc.setFont(uni ? "DJ" : "helvetica", w || "normal"); };
      var W = 210, L = 14, Rt = W - 14;
      var items = [];
      try { items = JSON.parse(c.itemsJson || "[]"); } catch (e) { items = []; }

      doc.setFillColor(11, 59, 54); doc.rect(0, 0, W, 40, "F");
      doc.setFillColor(94, 234, 212); doc.rect(0, 40, W, 1.2, "F");
      if (LOGO_B64) { try { doc.addImage(LOGO_B64, "JPEG", L, 8, 32, 17); } catch (e) {} }
      doc.setTextColor(153, 246, 228); F("bold"); doc.setFontSize(6.2);
      doc.text("M O D E R N   P L U M B I N G   S O L U T I O N", L, 30);
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(16);
      doc.text("DELIVERY CHALLAN", Rt, 15, { align: "right" });
      F("normal"); doc.setFontSize(8); doc.setTextColor(160, 205, 199);
      doc.text(String(c.challanNo || ""), Rt, 22, { align: "right" });
      doc.text(today(), Rt, 27, { align: "right" });
      doc.text("Status: " + String(c.status || "Draft"), Rt, 32, { align: "right" });

      var y = 52;
      doc.setTextColor(110, 125, 140); F("bold"); doc.setFontSize(5.8);
      doc.text("DELIVER TO", L, y);
      doc.text("SITE", L + 90, y);
      doc.setTextColor(17, 34, 45); F("bold"); doc.setFontSize(10);
      doc.text(String(c.customerName || "-"), L, y + 6);
      doc.text(String(c.site || "-"), L + 90, y + 6);
      F("normal"); doc.setFontSize(7.6); doc.setTextColor(110, 125, 140);
      doc.text(String(c.location || ""), L, y + 11);
      if (c.driver) doc.text("Driver: " + c.driver, L + 90, y + 11);
      y += 20;

      doc.setFillColor(30, 41, 59); doc.rect(L, y - 5.5, Rt - L, 9, "F");
      doc.setTextColor(255, 255, 255); F("bold"); doc.setFontSize(6.4);
      doc.text("#", L + 3, y);
      doc.text("PRODUCT CODE", L + 10, y);
      doc.text("DESCRIPTION", L + 52, y);
      doc.text("UNIT", Rt - 26, y, { align: "right" });
      doc.text("QTY", Rt - 2, y, { align: "right" });
      y += 9;

      items.forEach(function (i, n) {
        if (y > 258) { doc.addPage(); y = 24; }
        if (n % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(L, y - 4.5, Rt - L, 8, "F"); }
        doc.setTextColor(110, 125, 140); F("normal"); doc.setFontSize(7);
        doc.text(String(n + 1), L + 3, y);
        doc.setTextColor(13, 148, 136); F("bold"); doc.setFontSize(7);
        doc.text(String(i.code || ""), L + 10, y);
        doc.setTextColor(17, 34, 45); F("normal"); doc.setFontSize(7.4);
        doc.text(doc.splitTextToSize(String(i.desc || ""), 68)[0], L + 52, y);
        doc.text(String(i.unit || "No's"), Rt - 26, y, { align: "right" });
        F("bold"); doc.text(String(i.qty), Rt - 2, y, { align: "right" });
        y += 8;
      });

      y += 6;
      doc.setDrawColor(226, 232, 240); doc.line(L, y, Rt, y);
      y += 8;
      doc.setTextColor(110, 125, 140); F("normal"); doc.setFontSize(7.4);
      doc.text("Received the above goods in good condition and correct quantity.", L, y);
      doc.text("Receiver signature", Rt, y + 18, { align: "right" });
      doc.setDrawColor(180, 190, 200); doc.line(Rt - 50, y + 15, Rt, y + 15);
      doc.text("Prepared by: " + String(c.createdBy || ""), L, y + 10);
      if (c.freight) doc.text("Freight: Rs. " + c.freight + " (" + (c.freightTo || "Client") + ")", L, y + 15);

      /* the approver signs the last page, small, bottom-right - exactly as asked */
      var pages = doc.internal.getNumberOfPages();
      doc.setPage(pages);
      if (approver) {
        doc.setTextColor(13, 148, 136); F("bold"); doc.setFontSize(6.4);
        doc.text("Approved by " + approver, Rt, 282, { align: "right" });
      }
      for (var p = 1; p <= pages; p++) {
        doc.setPage(p);
        F("normal"); doc.setFontSize(6.2); doc.setTextColor(150, 163, 175);
        doc.text("Energy World  |  Panipat \u00b7 Sonipat \u00b7 Karnal", L, 290);
        doc.text(p + " / " + pages, Rt, 290, { align: "right" });
      }
      return doc;
    });
  }

  function sendChallanPdf(c, bot, caption, approver) {
    return loadLogo().then(function () { return challanPdf(c, approver); }).then(function (d) {
      return api("tgSend", { bot: bot, pdfBase64: d.output("datauristring").split(",")[1],
        filename: String(c.challanNo).replace(/[^\w.-]/g, "_") + ".pdf", caption: caption });
    });
  }

  function viewChallans() {
    var list = S.data.challans.slice().reverse();
    var by = function (st) { return list.filter(function (c) { return (c.status || "Draft") === st; }).length; };
    var h = '<div class="cards">' +
      '<div class="stat ' + (by("Draft") ? "alert" : "") + '"><div class="n">' + by("Draft") + '</div><div class="l">Awaiting approval</div></div>' +
      '<div class="stat"><div class="n">' + by("Approved") + '</div><div class="l">Approved, to dispatch</div></div>' +
      '<div class="stat"><div class="n">' + by("Dispatched") + '</div><div class="l">Awaiting receipt</div></div>' +
      '<div class="stat"><div class="n">' + by("Received") + '</div><div class="l">Receipt in</div></div>' +
      '</div>';
    h += '<div class="row"><div class="grow"></div><button class="btn" data-act="ch-new">+ New challan</button></div>';
    if (!list.length) h += '<div class="empty">No challans yet.</div>';
    list.forEach(function (c) {
      var st = c.status || "Draft";
      var cls = st === "Received" ? "Won" : (st === "Draft" ? "due" : "teal");
      h += '<div class="card"><h3>' + esc(c.challanNo) + ' <span class="pill ' + cls + '">' + esc(st) + '</span>' +
        (String(c.receiptReceived).toUpperCase() === "Y" ? ' <span class="pill Won">receipt in</span>' : "") + '</h3>' +
        '<div class="meta">' + esc(c.customerName || "") + (c.site ? ' &middot; ' + esc(c.site) : "") +
        (c.brand ? '<br>Brand: ' + esc(c.brand) : "") +
        '<br>' + esc(c.items || "") +
        (c.freight ? '<br>Freight ' + money(c.freight) + ' (' + esc(c.freightTo || "Client") + ') &middot; ' + esc(c.driver || "no driver") : "") +
        '<br>Created by ' + esc(c.createdBy || "") +
        (c.approvedBy ? ' &middot; approved by <b>' + esc(c.approvedBy) + '</b>' : "") + '</div>' +
        '<div class="acts">' +
        (st === "Draft" && canApprove() ? '<button class="btn sm" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Approved">Approve</button>' : "") +
        (st === "Approved" && canApprove() ? '<button class="btn sm" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Dispatched">Dispatch</button>' : "") +
        (st === "Dispatched" ? '<button class="btn sm" data-act="ch-move" data-id="' + esc(c.id) + '" data-to="Received">Receipt received</button>' : "") +
        '<button class="btn sm ghost" data-act="ch-pdf" data-id="' + esc(c.id) + '">PDF</button>' +
        '</div></div>';
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

  function rateFor(partner, brand) {
    var r = S.data.commrates.filter(function (x) {
      return String(x.associate).toLowerCase() === String(partner).toLowerCase() &&
             String(x.brand) === String(brand);
    })[0];
    if (r) return Number(r.pct) || 0;
    var a = S.data.associates.filter(function (x) { return String(x.name).toLowerCase() === String(partner).toLowerCase(); })[0];
    return a ? Number(a.rate) || 0 : 0;
  }

  function partnerBook(name) {
    var nm = String(name).toLowerCase();
    /* only challans whose material receipt is in count as real business */
    var chs = S.data.challans.filter(function (c) {
      return String(c.associate || "").toLowerCase() === nm && String(c.receiptReceived).toUpperCase() === "Y";
    });
    var billed = 0, earned = 0;
    var rows = chs.map(function (c) {
      var base = exGst(c.amount);
      var pct = rateFor(name, c.brand);
      var inc = base * pct / 100;
      billed += Number(c.amount) || 0;
      earned += inc;
      return { no: c.challanNo, client: c.customerName, site: c.site, brand: c.brand,
        amount: Number(c.amount) || 0, base: base, pct: pct, inc: inc };
    });
    /* payable follows the money in, not the invoice out */
    var clients = {};
    chs.forEach(function (c) { clients[c.customerName] = 1; });
    var collected = S.data.payments.filter(function (p) { return clients[p.client]; })
      .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    var ratio = billed > 0 ? Math.min(1, collected / billed) : 0;
    var payable = earned * ratio;
    var paid = S.data.commpay.filter(function (p) { return String(p.associate).toLowerCase() === nm; })
      .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    var sites = S.data.sites.filter(function (st) {
      return [st.architect, st.plumber, st.builder].some(function (x) { return String(x || "").toLowerCase() === nm; });
    });
    return { rows: rows, billed: billed, earned: earned, collected: collected, ratio: ratio,
      payable: payable, paid: paid, pending: payable - paid, sites: sites };
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
    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Incentive = net billed \u00f7 1.18 (ex-GST) \u00d7 the partner rate, and it only becomes <b>payable as the client pays</b>. A challan counts only once its material receipt is in.</div>';
    var roles = ["Plumber", "Architect", "Builder", "PMC", "Contractor", "Dealer", "Other"];
    h += '<div class="row">' + roles.map(function (r) {
      return '<button class="btn sm ' + (S.pRole === r ? "" : "ghost") + '" data-act="p-role" data-r="' + esc(r) + '">' + esc(r) + '</button>';
    }).join("") + '<button class="btn sm ' + (S.pRole ? "ghost" : "") + '" data-act="p-role" data-r="">All</button>' +
      '<div class="grow"></div><button class="btn" data-act="as-new">+ New partner</button></div>';
    var list = partners.filter(function (a) { return !S.pRole || a.role === S.pRole; });
    if (!list.length) h += '<div class="empty">No partners here yet.</div>';
    list.forEach(function (a) {
      var b = books[a.name];
      h += '<div class="card"><h3>' + esc(a.name) + ' <span class="pill">' + esc(a.role || "") + '</span>' +
        (b.pending > 0 ? ' <span class="pill due">' + money(b.pending) + ' pending</span>' : ' <span class="pill Won">settled</span>') + '</h3>' +
        '<div class="meta">' + b.sites.length + ' ongoing site(s) &middot; ' + b.rows.length + ' challan(s)' +
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
      '<br><i>Incentive becomes payable only in proportion to what the client has actually paid.</i></div>' +
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
    if (!cl) return h + '<div class="empty">Pick a client. Each client can have a different discount per brand - that is what the quote builder pulls in automatically.</div>';
    var brands = brandList();
    h += '<div class="empty" style="text-align:left;padding:0 0 10px">Brand-wise discount for <b>' + esc(cl) + '</b>. Used by the quote builder and by the incentive base.</div>';
    brands.forEach(function (b) {
      var d = S.data.discounts.filter(function (x) {
        return String(x.client).toLowerCase() === cl.toLowerCase() && x.brand === b;
      })[0];
      h += '<div class="card"><h3>' + esc(b) + (d && Number(d.pct) ? ' <span class="pill teal">' + esc(d.pct) + '%</span>' : ' <span class="pill">not set</span>') + '</h3>' +
        '<div class="acts" style="align-items:center">' +
        '<input class="dsc" data-client="' + esc(cl) + '" data-brand="' + esc(b) + '" data-id="' + esc(d ? d.id : "") + '" inputmode="decimal" value="' + esc(d ? d.pct : "") + '" placeholder="0" style="width:90px;padding:7px 10px"/>' +
        '<span class="pill">% off list</span></div></div>';
    });
    return h;
  }

  /* ---------------- client payments + ledger ---------------- */
  function clientLedger(client) {
    var chs = S.data.challans.filter(function (c) {
      return c.customerName === client && String(c.receiptReceived).toUpperCase() === "Y";
    });
    var pays = S.data.payments.filter(function (p) { return p.client === client; });
    var billed = chs.reduce(function (a, c) { return a + (Number(c.amount) || 0); }, 0);
    var freight = chs.reduce(function (a, c) {
      return a + (String(c.freightTo) === "Client" ? (Number(c.freight) || 0) : 0);
    }, 0);
    var paid = pays.reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
    return { chs: chs, pays: pays, billed: billed, freight: freight, paid: paid, due: billed + freight - paid };
  }

  function viewPayments() {
    var names = {};
    S.data.challans.forEach(function (c) { if (String(c.receiptReceived).toUpperCase() === "Y") names[c.customerName] = 1; });
    var list = Object.keys(names).map(function (n) { return { name: n, l: clientLedger(n) }; })
      .sort(function (a, b) { return b.l.due - a.l.due; });
    var totDue = list.reduce(function (a, x) { return a + x.l.due; }, 0);
    var h = '<div class="cards">' +
      '<div class="stat ' + (totDue > 0 ? "alert" : "") + '"><div class="n">' + money(totDue) + '</div><div class="l">Outstanding from clients</div></div>' +
      '<div class="stat"><div class="n">' + list.length + '</div><div class="l">Client ledgers</div></div>' +
      '</div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 12px">Only challans with a <b>signed material receipt</b> enter the ledger. Freight appears here when the client bears it.</div>';
    if (!list.length) return h + '<div class="empty">Nothing delivered yet.</div>';
    list.forEach(function (x) {
      h += '<div class="card"><h3>' + esc(x.name) +
        (x.l.due > 0 ? ' <span class="pill due">' + money(x.l.due) + ' due</span>' : ' <span class="pill Won">clear</span>') + '</h3>' +
        '<div class="meta">' + x.l.chs.length + ' challan(s) &middot; billed ' + money(x.l.billed) +
        (x.l.freight ? ' + freight ' + money(x.l.freight) : "") +
        '<br>Received ' + money(x.l.paid) + '</div>' +
        '<div class="acts"><button class="btn sm" data-act="pay-in" data-n="' + esc(x.name) + '">Payment received</button>' +
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
        lines.push({ d: dstr(c.createdAt), p: "Challan " + c.challanNo + (c.brand ? " (" + c.brand + ")" : ""), dr: Number(c.amount) || 0, cr: 0 });
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

  function viewLeads() {
    var h = '<div class="empty" style="text-align:left;padding:0 0 12px">Pick a brand to see every site where it is still open - and whether the window is about to shut. Send the list straight to the executive who covers it.</div>';
    h += '<div class="row">' + brandList().map(function (b) {
      var n = brandLeads(b).list.length;
      return '<button class="btn sm ' + (S.leadBrand === b ? "" : "ghost") + '" data-act="lead-brand" data-b="' + esc(b) + '">' + esc(b) + ' (' + n + ')</button>';
    }).join("") + '</div>';
    if (!S.leadBrand) return h;
    var r = brandLeads(S.leadBrand);
    var urgent = r.list.filter(function (x) { return x.urgent; }).length;
    var closed = r.list.filter(function (x) { return x.window === "CLOSED"; }).length;
    h += '<div class="cards">' +
      '<div class="stat"><div class="n">' + r.list.length + '</div><div class="l">Open leads</div></div>' +
      '<div class="stat ' + (urgent ? "alert" : "") + '"><div class="n">' + urgent + '</div><div class="l">Window closing</div></div>' +
      '<div class="stat"><div class="n">' + closed + '</div><div class="l">Already missed</div></div>' +
      '</div>';
    h += '<div class="row"><span class="pill teal">' + esc(S.leadBrand) + '</span><div class="grow"></div>' +
      '<button class="btn ghost" data-act="lead-pdf">PDF</button>' +
      '<select id="lead_exec" style="width:auto;padding:9px 10px">' +
      opts(["Vivek Verma", "Ashish Bhuker", "Imran", "Mukesh Verma", "Dinesh Verma"], "Vivek Verma") + '</select>' +
      '<button class="btn" data-act="lead-send">Send to executive</button></div>';
    if (!r.list.length) return h + '<div class="empty">Nothing pending for ' + esc(S.leadBrand) + '.</div>';
    r.list.forEach(function (x) {
      var cls = x.window === "CLOSED" ? "due" : (x.urgent ? "due" : "teal");
      h += '<div class="card"><h3>' + esc(x.site.name) + ' <span class="pill ' + cls + '">' + esc(x.window) + '</span></h3>' +
        '<div class="meta">' + esc(x.site.client || "") + (x.site.city ? ' &middot; ' + esc(x.site.city) : "") +
        '<br>Stage: <b>' + esc(x.site.stage || "-") + '</b> &middot; status: ' + esc(x.status) +
        (x.site.owner ? '<br>Owner: ' + esc(x.site.owner) : "") +
        (x.site.mobile ? '<br>' + esc(x.site.mobile) : "") + '</div>' +
        '<div class="acts">' + (x.site.mobile ? '<a class="btn sm ghost" href="tel:' + esc(x.site.mobile) + '">Call</a>' : "") +
        '<button class="btn sm ghost" data-act="matrix" data-id="' + esc(x.site.id) + '">Matrix</button></div></div>';
    });
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
  function viewOwner() {
    var clients = {};
    S.data.challans.forEach(function (c) { if (String(c.receiptReceived).toUpperCase() === "Y") clients[c.customerName] = 1; });
    var due = Object.keys(clients).reduce(function (a, n) { return a + clientLedger(n).due; }, 0);

    var incPend = 0;
    S.data.associates.forEach(function (a) { incPend += partnerBook(a.name).pending; });

    var awaitApp = S.data.challans.filter(function (c) { return (c.status || "Draft") === "Draft"; });
    var awaitRcpt = S.data.challans.filter(function (c) { return c.status === "Dispatched"; });
    var incToSet = S.data.challans.filter(function (c) {
      return String(c.receiptReceived).toUpperCase() === "Y" && String(c.commissionSet).toUpperCase() !== "Y" && c.associate;
    });

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
    else if (incToSet.length) one = { t: incToSet.length + " incentive decision(s) pending", s: "Material receipt is in - set the incentive or mark it as none.", a: "commission", b: "Set incentive" };
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

    if (incToSet.length) {
      h += '<h3 style="margin:18px 0 10px;font-size:15px">Incentive decisions waiting</h3>';
      incToSet.slice(0, 6).forEach(function (c) {
        h += '<div class="card"><h3>' + esc(c.challanNo) + ' <span class="pill due">decide</span></h3>' +
          '<div class="meta">' + esc(c.customerName) + ' &middot; ' + esc(c.brand || "-") +
          '<br>Partner: ' + esc(c.associate) + ' &middot; billed ' + money(c.amount) + '</div></div>';
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
      api("teamAuth").then(function (r) {
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

  function viewPartners() {
    var q = S.q.toLowerCase();
    var roles = ["Architect", "Plumber", "Builder", "PMC", "Contractor", "Dealer", "Other"];
    var list = S.data.associates.filter(function (a) {
      if (S.pRole && a.role !== S.pRole) return false;
      return !q || (a.name + " " + a.area + " " + a.location + " " + a.mobile).toLowerCase().indexOf(q) >= 0;
    });
    var greet = greetToday();
    var h = "";
    if (greet.length) {
      h += '<div class="card" style="border-color:#fde68a;background:#fffbeb"><h3>Greet today</h3><div class="meta">';
      greet.forEach(function (x) {
        h += '<b>' + esc(x.name) + '</b> - ' + esc(x.what) + (x.mobile ? ' &middot; ' + esc(x.mobile) : "") + '<br>';
      });
      h += '</div></div>';
    }
    h += '<div class="row">' + roles.map(function (r) {
      return '<button class="btn sm ' + (S.pRole === r ? "" : "ghost") + '" data-act="p-role" data-r="' + esc(r) + '">' + esc(r) + '</button>';
    }).join("") + '<button class="btn sm ' + (S.pRole ? "ghost" : "") + '" data-act="p-role" data-r="">All</button></div>';
    h += '<div class="row"><input class="grow" id="q" placeholder="Search partners by name, area, mobile..." value="' + esc(S.q) + '"/>' +
      '<button class="btn" data-act="as-new">+ New partner</button></div>';
    if (!list.length) h += '<div class="empty">No partners here yet.</div>';
    list.forEach(function (a) {
      h += '<div class="card"><h3>' + esc(a.name) + ' <span class="pill">' + esc(a.role || "") + '</span>' +
        (a.area ? ' <span class="pill teal">' + esc(a.area) + '</span>' : "") + '</h3>' +
        '<div class="meta">' + esc([a.mobile, a.mobile2].filter(Boolean).join("  \u00b7  ")) +
        (a.location ? '<br>' + esc(a.location) + (a.area ? ' - ' + esc(a.area) : "") : "") +
        (a.birthday ? '<br>Birthday: ' + esc(dstr(a.birthday)) : "") +
        (a.anniversary ? ' &middot; Anniversary: ' + esc(dstr(a.anniversary)) : "") +
        (Number(a.rate) ? '<br>Incentive ' + esc(a.rate) + '%' : "") + '</div>' +
        '<div class="acts">' + (a.mobile ? '<a class="btn sm ghost" href="tel:' + esc(a.mobile) + '">Call</a>' : "") +
        (S.role === "admin" ? '<button class="btn sm" data-act="p-open" data-n="' + esc(a.name) + '">Incentive</button>' : "") +
        '<button class="btn sm ghost" data-act="as-open" data-id="' + esc(a.id) + '">Edit</button></div></div>';
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
      '<p class="sub">Plumbers, architects, builders and PMCs. Incentive % is set here.</p>' +
      '<label>Name</label><input id="m_aname" value="' + esc(a.name) + '"/>' +
      '<div class="grid2">' +
      '<div><label>Role</label><select id="m_arole">' + opts(["Architect", "Plumber", "Builder", "PMC", "Contractor", "Dealer", "Other"], a.role || "Plumber") + '</select></div>' +
      '<div><label>Incentive %</label><input id="m_arate" inputmode="decimal" value="' + esc(a.rate || "") + '"/></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Mobile</label><input id="m_amobile" inputmode="numeric" value="' + esc(a.mobile) + '"/></div>' +
      '<div><label>Alternate mobile</label><input id="m_amobile2" inputmode="numeric" value="' + esc(a.mobile2) + '"/></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div><label>Location</label><select id="m_aloc" class="loc-sel2">' + opts(locations().concat(["+ Add new location"]), loc) + '</select></div>' +
      '<div><label>Area</label><select id="m_aarea">' + opts([""].concat(areasIn(loc), ["+ Add new area"]), a.area || "") + '</select></div>' +
      '</div>' +
      '<label>Address</label><input id="m_aaddr" value="' + esc(a.address) + '"/>' +
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
    api("teamAuth").then(function (r) {
      if (!r || !r.ok) { S.pin = ""; renderLogin((r && r.error) || "Could not sign in."); return; }
      S.user = r.user.name; S.role = r.user.role; S.pinSet = r.user.pinSet;
      try { localStorage.setItem(STORE, JSON.stringify({ pin: pin, user: S.user })); } catch (e) {}
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
    var open = openFollowups();
    var overdue = open.filter(function (f) { return daysTo(f.dueDate) < 0; });
    var due = open.filter(function (f) { return daysTo(f.dueDate) === 0; });
    var hot = S.data.customers.filter(function (c) { return c.status === "Hot"; });
    var sales = S.data.challans.reduce(function (a, c) { return a + (Number(c.amount) || 0); }, 0);
    var comm = S.data.challans.reduce(function (a, c) { return a + (Number(c.commissionAmt) || 0); }, 0);

    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + S.data.customers.length + '</div><div class="l">Customers</div></div>' +
      '<div class="stat ' + (overdue.length ? 'alert' : '') + '"><div class="n">' + overdue.length + '</div><div class="l">Follow-ups overdue</div></div>' +
      '<div class="stat"><div class="n">' + due.length + '</div><div class="l">Due today</div></div>' +
      '<div class="stat"><div class="n">' + hot.length + '</div><div class="l">Hot leads</div></div>' +
      '<div class="stat"><div class="n">' + money(sales) + '</div><div class="l">Challan value</div></div>' +
      '<div class="stat"><div class="n">' + money(comm) + '</div><div class="l">Incentive owed</div></div>' +
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
    var open = openFollowups().sort(function (a, b) { return daysTo(a.dueDate) - daysTo(b.dueDate); });
    var done = S.data.followups.filter(function (f) { return f.status === "Done"; }).slice(-10).reverse();
    var h = '<div class="row"><div class="grow"></div><button class="btn" data-act="fu-new">+ New follow-up</button></div>';
    if (!open.length) h += '<div class="empty">No open follow-ups.</div>';
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

  function modalChallan() {
    var clients = S.data.clients.map(function (x) { return x.name; });
    var sites = S.data.sites.map(function (x) { return x.name; });
    var drivers = S.data.drivers.map(function (x) { return x.name + (x.vehicle ? " (" + x.vehicle + ")" : ""); });
    return '<h2>New delivery challan</h2>' +
      '<p class="sub">The challan PDF carries no prices and no pictures - it is a delivery note, not a quote.</p>' +
      '<label>Location</label><select id="m_loc">' + opts(LOCATIONS, LOCATIONS[0]) + '</select>' +
      '<label>Client</label><input id="m_client" list="clientlist2" placeholder="Type client name"/>' +
      '<datalist id="clientlist2">' + clients.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>' +
      '<label>Site (optional)</label><input id="m_site" list="sitelist" placeholder="Site / project"/>' +
      '<datalist id="sitelist">' + sites.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>' +
      '<div class="grid2">' +
      '<div><label>Brand</label><select id="m_brand">' + opts([""].concat(brandList()), "") + '</select></div>' +
      '<div><label>Partner (for incentive)</label><select id="m_assoc">' + opts([""].concat(S.data.associates.map(function (a) { return a.name; })), "") + '</select></div>' +
      '</div>' +
      '<label>Items</label><div id="m_lines">' + lineRow(0, "", "", "") + '</div>' +
      '<button class="btn sm ghost" data-act="li-add" style="margin-top:4px">+ Add item</button>' +
      prodDatalist() +
      '<div class="grid2" style="margin-top:10px">' +
      '<div><label>Freight / tempo fare</label><input id="m_freight" inputmode="numeric" value="0"/></div>' +
      '<div><label>Freight borne by</label><select id="m_fto">' + opts(["Client", "Energy World"], "Client") + '</select></div>' +
      '</div>' +
      '<label>Driver</label><input id="m_driver" list="driverlist" placeholder="Driver name (vehicle)"/>' +
      '<datalist id="driverlist">' + drivers.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") + '</datalist>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="ch-save">Create challan</button></div>';
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

  function render() {
    if (!LOGO_PRE && S.data.logos && S.data.logos.length) { LOGO_PRE = 1; preloadLogos(); }
    if (!S.pin) { renderLogin(); return; }
    var views = { search: viewSearch, brandboard: viewBrandBoard, partners: viewPartners, leads: viewLeads, visits: viewVisits, commission: viewIncentives, payments: viewPayments, discounts: viewDiscounts, catalogue: viewCatalogue, clients: viewClients, quotes: viewQuotes, service: viewService, spares: viewSpares, dues: viewDues, payroll: viewPayroll, dash: viewDash, sites: viewSites, matrix: viewMatrix, winloss: viewWinLoss, rules: viewRules, customers: viewCustomers, followups: viewFollowups, challans: viewChallans, products: viewProducts, pitch: viewPitch };
    var tabs = [["search", "Search"], ["dash", "Today"], ["sites", "Sites"], ["winloss", "Win/Loss"], ["leads", "Brand leads"], ["visits", "Site visits"], ["customers", "Customers"], ["followups", "Follow-ups"], ["challans", "Challans"], ["clients", "Clients"], ["partners", "Partners"], ["quotes", "Quotes"], ["commission", "Incentives"], ["service", "Service"], ["spares", "Spares"], ["dues", "Client dues"], ["payroll", "Payroll"], ["products", "Products"], ["payments", "Payments"], ["discounts", "Discounts"], ["catalogue", "Catalogue"], ["rules", "Pitch rules"]];

    var h = '<div class="top">' +
      '<button class="burger" data-act="nav-toggle">&#9776;</button>' +
      '<img src="' + LOGO + '" alt="EW" onerror="this.style.display=\'none\'"/>' +
      '<div><b style="font-size:15px">Energy World</b><div style="font-size:12px;color:#64748b">Team workspace</div></div>' +
      '<div class="who"><b>' + esc(S.user) + '</b><span class="pill teal">' + esc(S.role) + '</span>' +
      '<div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">' +
      (bioAvailable() ? (bioSaved()
        ? '<button class="btn sm ghost" data-act="bio-off">Face ID on</button>'
        : '<button class="btn sm ghost" data-act="bio-on">Enable Face ID</button>') : '') +
      '<button class="btn sm ghost" data-act="pin-change">PIN</button>' +
      '<button class="btn sm ghost" data-act="logout">Sign out</button></div></div></div>';

    var GROUPS = [
      ["Sell", ["search", "dash", "clients", "partners", "quotes", "sites", "leads", "visits", "winloss", "followups"]],
      ["Deliver", ["challans", "payments", "discounts", "products", "dues"]],
      ["Service", ["service", "spares"]],
      ["Admin", ["commission", "payroll", "catalogue", "rules"]]
    ];
    var label = {};
    tabs.forEach(function (t) { label[t[0]] = t[1]; });

    var navHtml = '';
    GROUPS.forEach(function (grp) {
      var items = grp[1].filter(function (k) { return canSee(k) && label[k]; });
      if (!items.length) return;
      navHtml += '<div class="navgrp"><span class="grp">' + grp[0] + '</span>' + items.map(function (k) {
        return '<button data-act="tab" data-tab="' + k + '" class="' + (S.tab === k ? 'on' : '') + '">' + label[k] + '</button>';
      }).join("") + '</div>';
    });

    h += '<div class="scrim" data-act="nav-close"></div><div class="shell"><nav>' + navHtml + '</nav>';

    var pick = (S.tab === 'dash' && S.role === 'admin') ? viewOwner : (views[S.tab] || viewDash);
    h += '<main>' + pick() +
      '<div class="foot-note">Energy World Team v' + APP_VERSION + ' &middot; data lives in your Google Sheet</div></main>';

    h += '</div>';
    if (S.modal) h += '<div class="mask" data-act="mask"><div class="modal">' + S.modal + '</div></div>';

    document.getElementById("root").innerHTML = h;
    document.body.classList.toggle("navopen", !!S.navOpen);

    var q = el("q");
    if (q) {
      q.addEventListener("input", function (e) { S.q = e.target.value; });
      q.addEventListener("keyup", function (e) { if (e.key === "Enter") render(); });
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
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
    if (act === "logout") { logout(); return; }
    if (act === "mask" && e.target === t) { S.modal = null; render(); return; }
    if (act === "close") { S.modal = null; render(); return; }
    if (act === "tab") { S.tab = t.getAttribute("data-tab"); S.q = ""; render(); return; }
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

    if (act === "pr-new") { S.modal = modalProduct(null); render(); return; }
    if (act === "pr-open") {
      var pp = PRODUCTS.filter(function (x) { return x.code === t.getAttribute("data-code"); })[0];
      S.modal = modalProduct(pp); render(); return;
    }
    if (act === "pr-save") {
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
    if (act === "cl-new") { S.modal = modalClient(null); render(); return; }
    if (act === "cl-open") { S.modal = modalClient(clientById(id)); render(); return; }
    if (act === "cl-save") {
      var cn = val("c_name");
      if (!cn) { toast("Client name is required."); return; }
      /* READ EVERY FIELD FIRST. Creating a partner re-renders the app, which rebuilds
         this modal - anything read afterwards comes back empty. That bug ate mobile2. */
      var f = {
        mob: val("c_mob"), mob2: val("c_mob2"), loc: val("c_loc"), ar: val("c_area"),
        addr: val("c_addr"), type: val("c_type"), notes: val("c_notes"),
        arch: val("c_arch"), plumb: val("c_plumb"), build: val("c_build"), pmc: val("c_pmc")
      };
      var mob = f.mob, loc = f.loc, ar = f.ar;
      var arch = f.arch, plumb = f.plumb, build = f.build, pmc = f.pmc;
      t.disabled = true; t.textContent = "Saving...";
      /* anyone named here who is not yet a Partner gets created - no double entry */
      Promise.all([
        ensurePartner(arch, "Architect", loc, ar),
        ensurePartner(plumb, "Plumber", loc, ar),
        ensurePartner(build, "Builder", loc, ar),
        ensurePartner(pmc, "PMC", loc, ar)
      ]).then(function () {
        return save("clients", {
          id: id || "", createdBy: S.user, name: cn,
          shortName: shortNameOf(cn, f.mob),
          location: f.loc, area: f.ar, mobile: f.mob, mobile2: f.mob2,
          address: f.addr, type: f.type,
          architect: f.arch, plumber: f.plumb, builder: f.build, pmc: f.pmc,
          notes: f.notes
        });
      }).then(function (r) {
        if (!r) return;
        S.modal = null;
        toast("Client saved as " + r.shortName + ".");
        if (S.qz && S.qz.step === 1) { S.qz.client = r.name; S.qz.clientObj = r; }
        render();
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
    if (act === "qz-new") { S.qz = { step: 1, location: "", client: "", items: [], brandDisc: 0 }; S.tab = "quotes"; render(); return; }
    if (act === "qz-for") {
      var c0 = clientById(id);
      S.qz = { step: 2, location: c0.location, client: c0.name, clientObj: c0, items: [], brandDisc: 0 };
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
      S.qz.brand = t.getAttribute("data-brand");
      S.qz.brandDisc = clientDiscount(S.qz.client, S.qz.brand);
      S.qz.family = ""; S.qz.step = 3; render(); return;
    }
    if (act === "qz-fam") { S.qz.family = t.getAttribute("data-fam"); render(); return; }
    if (act === "qz-step") { S.qz.step = Number(t.getAttribute("data-step")); render(); return; }
    if (act === "qz-qty") {
      var code = t.getAttribute("data-code");
      var delta = Number(t.getAttribute("data-d"));
      var p = PRODUCTS.filter(function (x) { return x.code === code; })[0];
      if (!p) return;
      var it = S.qz.items.filter(function (x) { return x.code === code; })[0];
      if (!it) {
        if (delta < 0) return;
        S.qz.items.push({ code: p.code, desc: p.desc, family: p.family, price: p.price, qty: 1, pic: p.pic, unit: p.unit });
      } else {
        it.qty += delta;
        if (it.qty <= 0) S.qz.items = S.qz.items.filter(function (x) { return x.code !== code; });
      }
      render(); return;
    }
    if (act === "qz-bd") { S.qz.brandDisc = Number(val("qz_bd")) || 0; render(); return; }
    if (act === "qz-adv") { S.qz.adv = !S.qz.adv; render(); return; }
    if (act === "qz-revise") {
      var old = S.data.quotes.filter(function (q) { return q.id === id; })[0];
      if (!old) return;
      var its = [];
      try { its = JSON.parse(old.items || "[]"); } catch (e) {}
      S.qz = { step: 4, location: "", client: old.client, brand: old.brand, items: its,
        brandDisc: Number(old.discountPct) || 0, parentId: old.id,
        version: (Number(old.version) || 1) + 1, quoteNo: old.quoteNo };
      S.tab = "quotes"; render(); return;
    }
    if (act === "qz-save") {
      var z = S.qz;
      if (!z.items.length) { toast("Add at least one product."); return; }

      if (!z.dupChecked) {
        t.disabled = true; t.textContent = "Checking...";
        api("quoteDup", { client: z.client, codes: z.items.map(function (i) { return i.code; }) })
          .then(function (r) {
            var others = ((r && r.clashes) || []).filter(function (x) { return !x.mine; });
            z.dupChecked = true;
            if (!others.length) { render(); document.querySelector('[data-act="qz-save"]').click(); return; }
            var msg = "WARNING - this client has already been quoted these products by someone else:\n\n";
            others.slice(0, 6).forEach(function (x) {
              msg += "- " + x.desc + "\n  " + (uniRupee() ? "\u20B9" : "Rs.") + x.price + " at " + x.disc + "% off, on " + x.date +
                "\n  by " + x.by + " (" + x.quoteNo + ", " + x.status + ")\n\n";
            });
            msg += "A client must never get two different prices from Energy World.\n\nContinue anyway?";
            if (window.confirm(msg)) { render(); document.querySelector('[data-act="qz-save"]').click(); }
            else { z.dupChecked = false; render(); }
          });
        return;
      }
      var tot = qzTotals();
      var cObj = clientByName(z.client) || {};
      var short = cObj.shortName || String(z.client).toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(" ")[0].slice(0, 10);
      var dt = new Date();
      var ds = String(dt.getDate()).padStart(2, "0") + String(dt.getMonth() + 1).padStart(2, "0") + String(dt.getFullYear()).slice(2);
      var seq = S.data.quotes.filter(function (q) { return String(q.quoteNo || "").indexOf("Q/" + short + "/") === 0; }).length + 1;
      var qno = z.quoteNo || ("Q/" + short + "/" + ds + "/" + String(seq).padStart(3, "0"));
      t.disabled = true; t.textContent = "Saving...";
      save("quotes", {
        id: "", createdBy: S.user, quoteNo: qno, version: z.version || 1, parentId: z.parentId || "",
        siteId: "", siteName: "", client: z.client, brand: z.brand,
        items: JSON.stringify(z.items), gross: tot.gross, discountPct: z.brandDisc,
        net: tot.net, gstAmt: tot.gst, total: tot.total, status: "Draft", validTill: "", notes: ""
      }).then(function (r) {
        if (!r) return;
        S.qz = null;
        toast("Quote " + qno + " saved.");
        render();
      });
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
      save("sites", {
        id: id || "", createdBy: S.user, name: sn, client: val("s_client"), mobile: val("s_mobile"),
        city: val("s_city"), stage: val("s_stage"), type: val("s_type"), architect: val("s_arch"),
        plumber: val("s_plumb"), builder: val("s_build"), owner: val("s_owner"),
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
    if (act === "p-role") { S.pRole = t.getAttribute("data-r"); render(); return; }
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
      save("payments", { id: "", createdBy: S.user, siteId: site.siteId || "", siteName: site.site || "",
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

    if (act === "as-new") { S.modal = modalAssociate(null); render(); return; }
    if (act === "as-open") {
      S.modal = modalAssociate(S.data.associates.filter(function (x) { return x.id === id; })[0]); render(); return;
    }
    if (act === "as-save") {
      var an = val("m_aname");
      if (!an) { toast("Name is required."); return; }
      save("associates", {
        id: id || "", name: an, role: val("m_arole"),
        mobile: val("m_amobile"), mobile2: val("m_amobile2"),
        location: val("m_aloc"), area: val("m_aarea"), address: val("m_aaddr"),
        birthday: val("m_abday"), anniversary: val("m_aanniv"),
        rate: val("m_arate"), notes: val("m_anotes")
      }).then(function (r) { if (r) { S.modal = null; toast("Partner saved."); render(); } });
      return;
    }

    if (act === "ch-new") { S.modal = modalChallan(); render(); return; }
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
    if (act === "ch-save") {
      var cn = val("m_client");
      if (!cn) { toast("Enter the client."); return; }
      var lines = readLines();
      if (!lines.length) { toast("Add at least one item."); return; }
      var cObj = clientByName(cn) || {};
      var siteName = val("m_site");
      var siteObj = S.data.sites.filter(function (x) { return x.name === siteName; })[0] || {};
      var amount = lines.reduce(function (a, l) { return a + l.q * l.r; }, 0);
      var assocName = val("m_assoc");
      var itemsJson = JSON.stringify(lines.map(function (l) {
        var p = PRODUCTS.filter(function (x) { return x.label === l.d || x.code === l.d; })[0] || {};
        return { code: p.code || "", desc: p.desc || l.d, unit: p.unit || "No's", qty: l.q, rate: l.r };
      }));
      t.disabled = true; t.textContent = "Creating...";

      api("challanNo", { client: cObj.shortName || cn }).then(function (n) {
        var no = (n && n.challanNo) || (cn.toUpperCase().slice(0, 6) + "/" + today().slice(8) + "/001");
        var ch = {
          id: "", createdBy: S.user, challanNo: no,
          customerId: cObj.id || "", customerName: cn,
          siteId: siteObj.id || "", site: siteName || "",
          brand: val("m_brand"), location: val("m_loc"),
          items: lines.map(function (l) { return l.d + " x" + l.q; }).join(", "),
          itemsJson: itemsJson, amount: amount,
          freight: val("m_freight") || 0, freightTo: val("m_fto"), driver: val("m_driver"),
          associate: assocName, commissionSet: "N", status: "Draft", receiptReceived: "N"
        };
        return save("challans", ch).then(function (r) {
          if (!r) return;
          S.modal = null;
          toast("Challan " + no + " created - pending approval.");
          render();
          sendChallanPdf(r, "TG_CHALLAN",
            "<b>Challan " + no + "</b>\n" + cn + (siteName ? " - " + siteName : "") +
            "\nCreated by <b>" + S.user + "</b>\n\n<i>PENDING APPROVAL</i>", null)
            .then(function (tg) { toast(tg && tg.ok ? "Sent to challan bot." : "Saved, but Telegram send failed."); });
        });
      });
      return;
    }

    if (act === "ch-move") {
      var to = t.getAttribute("data-to");
      var ch2 = S.data.challans.filter(function (x) { return x.id === id; })[0];
      if (!ch2) return;
      if (to === "Received" && !window.confirm("Confirm the signed material receipt is in hand for " + ch2.challanNo + "?")) return;
      t.disabled = true; t.textContent = "...";
      api("challanMove", { id: id, to: to }).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || "Could not update."); render(); return; }
        ch2.status = to;
        if (to === "Approved") {
          ch2.approvedBy = r.by;
          toast("Approved by " + r.by + ".");
        } else if (to === "Dispatched") {
          toast("Dispatched.");
          sendChallanPdf(ch2, "TG_DISPATCH",
            "<b>DISPATCH: " + ch2.challanNo + "</b>\n" + ch2.customerName +
            (ch2.driver ? "\nDriver: " + ch2.driver : "") +
            "\nApproved by <b>" + (ch2.approvedBy || "-") + "</b>", ch2.approvedBy || "")
            .then(function (tg) { toast(tg && tg.ok ? "Sent to dispatch bot." : "Dispatch send failed."); });
        } else if (to === "Received") {
          ch2.receiptReceived = "Y";
          toast("Receipt in. Ledger and freight unlocked; incentive decision requested.");
        }
        render();
        refresh();
      });
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

    /* + Add new location / area, right inside the dropdown */
    if (t.id === "c_loc" || t.id === "m_aloc") {
      if (t.value === "+ Add new location") {
        var nl = window.prompt("New location name");
        if (!nl) { t.value = locations()[0]; return; }
        save("areas", { id: "", location: nl, area: "" }).then(function () {
          if (t.id === "c_loc") S.clLoc = nl;
          toast("Location added: " + nl);
        });
        return;
      }
      var areaSel = document.getElementById(t.id === "c_loc" ? "c_area" : "m_aarea");
      if (areaSel) {
        areaSel.innerHTML = opts([""].concat(areasIn(t.value), ["+ Add new area"]), "");
      }
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
    if (t.classList && t.classList.contains("dsc")) {
      var cli = t.getAttribute("data-client");
      var br = t.getAttribute("data-brand");
      save("discounts", { id: t.getAttribute("data-id") || "", client: cli, brand: br, pct: t.value, notes: "" })
        .then(function (r) { if (r) toast(br + " for " + cli + ": " + (t.value || 0) + "%"); });
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
      if (q > 0 && p) S.qz.items.push({ code: p.code, desc: p.desc, family: p.family, price: p.price, qty: q, pic: p.pic, unit: p.unit });
      render(); return;
    }
    if (t.classList && t.classList.contains("qz-d") && S.qz) {
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
      api("teamAuth").then(function (r) {
        if (r && r.ok) {
          S.user = r.user.name; S.role = r.user.role; S.pinSet = r.user.pinSet;
          if (String(S.pinSet).toUpperCase() !== "Y") { renderPinChange(); return; }
          S.tab = (ROLE_TABS[S.role] || ["dash"])[0];
          loadCatalog(); refresh();
        } else { S.pin = ""; renderLogin(); }
      }).catch(function () { S.pin = ""; renderLogin("Network error."); });
    } else {
      renderLogin();
      if (bioSaved() && bioAvailable()) setTimeout(bioUnlock, 400);
    }
  })();
})();