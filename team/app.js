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
  var APP_VERSION = "2.8";
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
    data: { customers: [], followups: [], challans: [], associates: [], team: [], sites: [], pitch: [], rules: [], installs: [], visits: [], spares: [], payroll: [], clients: [], drivers: [], quotes: [], discounts: [], commrates: [], payments: [], commpay: [], incentives: [], sitevisits: [], brands: [], brandmap: [] }
  };

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || "").trim() : ""; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dstr(d) { return d ? String(d).slice(0, 10) : ""; }
  function money(n) { return "\u20B9" + (Number(n) || 0).toLocaleString("en-IN"); }
  function moneyAscii(n) { return "Rs. " + (Number(n) || 0).toLocaleString("en-IN"); }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var ROLE_TABS = {
    admin:    ["dash","clients","quotes","sites","leads","winloss","visits","followups","challans","payments","discounts","commission","service","spares","dues","payroll","products","catalogue","rules"],
    accounts: ["dash","clients","followups","challans","payments","discounts","service","spares","dues","products"],
    godown:   ["dash","challans","products"],
    sales:    ["dash","clients","quotes","sites","leads","winloss","visits","followups","challans","discounts","products"],
    service:  ["dash","service","spares","dues","followups","products"]
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
      if (r && r.ok) { S.data = r; render(); }
    }).catch(function () { syncing = false; });
  }

  function refresh() {
    return api("teamGet").then(function (r) {
      S.busy = false;
      syncAt = Date.now();
      if (r && r.ok) S.data = r;
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
        (pend ? ' <span class="pill soon">location pending</span>' : '') +
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
      h += '<div class="card"><h3>' + esc(c.name) + ' <span class="pill teal">' + esc(c.location || "-") + '</span>' +
        (c.type ? ' <span class="pill">' + esc(c.type) + '</span>' : "") + '</h3>' +
        '<div class="meta">' + (c.mobile ? esc(c.mobile) + '<br>' : "") + esc(c.address || "") +
        (partners.length ? '<br>' + esc(partners.join(" - ")) : "") + '</div>' +
        '<div class="acts">' + (c.mobile ? '<a class="btn sm ghost" href="tel:' + esc(c.mobile) + '">Call</a>' : "") +
        '<button class="btn sm" data-act="qz-for" data-id="' + esc(c.id) + '">Quote</button>' +
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
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="2">Back to brands</button>' +
        '<span class="pill teal">' + esc(z.brand) + '</span><div class="grow"></div>' +
        '<button class="btn" data-act="qz-step" data-step="4">Discount (' + (z.items || []).length + ' item)</button></div>';
      if (!z.family) {
        h += '<div class="empty" style="text-align:left;padding:0 0 12px">Pick a product family.</div>';
        familyList(z.brand).forEach(function (f) {
          var n = brandProducts(z.brand).filter(function (p) { return p.family === f; }).length;
          h += '<div class="card"><h3>' + esc(f) + ' <span class="pill">' + n + '</span></h3>' +
            '<div class="acts"><button class="btn sm" data-act="qz-fam" data-fam="' + esc(f) + '">Open</button></div></div>';
        });
        return h;
      }
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-fam" data-fam="">Back to families</button>' +
        '<span class="pill">' + esc(z.family) + '</span></div>';
      brandProducts(z.brand).filter(function (p) { return p.family === z.family; }).forEach(function (p) {
        var ex = (z.items || []).filter(function (i) { return i.code === p.code; })[0];
        h += '<div class="card" style="display:flex;gap:12px;align-items:center">' +
          (p.pic ? '<img src="' + esc(p.pic) + '" alt="" style="width:56px;height:56px;object-fit:contain;border:1px solid var(--line);border-radius:8px;background:#fff"/>' : "") +
          '<div style="flex:1"><h3 style="margin:0 0 2px">' + esc(p.desc) + '</h3>' +
          '<div class="meta">' + esc(p.code) + ' - ' + money(p.price) + ' / ' + esc(p.unit) + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
          '<button class="btn sm ghost" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="-1">-</button>' +
          '<input class="qz-q" data-code="' + esc(p.code) + '" inputmode="numeric" value="' + esc(ex ? ex.qty : "") + '" placeholder="0" style="width:56px;text-align:center;padding:7px 4px"/>' +
          '<button class="btn sm ghost" data-act="qz-qty" data-code="' + esc(p.code) + '" data-d="1">+</button>' +
          '</div></div>';
      });
      return h;
    }

    if (z.step === 4) {
      var t = qzTotals();
      h += '<div class="row"><button class="btn sm ghost" data-act="qz-step" data-step="3">Back to products</button>' +
        '<div class="grow"></div><button class="btn" data-act="qz-step" data-step="5">Review</button></div>';
      h += '<div class="card"><h3>Discount for ' + esc(z.brand) + '</h3>' +
        '<div class="meta">Applies to every line unless a product is overridden below.</div>' +
        '<div class="acts" style="align-items:center"><input id="qz_bd" inputmode="decimal" value="' + esc(z.brandDisc) + '" style="width:90px;padding:7px 10px"/><span class="pill teal">%</span>' +
        '<button class="btn sm" data-act="qz-bd">Apply</button></div></div>';
      (z.items || []).forEach(function (i) {
        var d = (i.disc === "" || i.disc === undefined || i.disc === null) ? z.brandDisc : i.disc;
        var lineNet = Math.round(i.qty * i.price * (1 - (Number(d) || 0) / 100));
        h += '<div class="card"><h3>' + esc(i.desc) + ' <span class="pill teal">' + money(lineNet) + '</span></h3>' +
          '<div class="meta">' + esc(i.code) + ' - ' + i.qty + ' x ' + money(i.price) + '</div>' +
          '<div class="acts" style="align-items:center"><span class="pill">Override %</span>' +
          '<input class="qz-d" data-code="' + esc(i.code) + '" inputmode="decimal" value="' + esc(i.disc === undefined ? "" : i.disc) + '" placeholder="brand ' + esc(z.brandDisc) + '%" style="width:110px;padding:7px 10px"/></div></div>';
      });
      h += '<div class="card"><div class="meta">Gross ' + money(t.gross) + '<br>Net after discount ' + money(t.net) +
        '<br>GST 18% ' + money(t.gst) + '<br><b>Total ' + money(t.total) + '</b></div></div>';
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

  function loadPic(url) {
    if (!url) return Promise.resolve(null);
    if (PIC_CACHE[url] !== undefined) return Promise.resolve(PIC_CACHE[url]);
    return api("imgB64", { url: url }).then(function (r) {
      PIC_CACHE[url] = (r && r.ok) ? ("data:" + r.mime + ";base64," + r.b64) : null;
      return PIC_CACHE[url];
    }).catch(function () { PIC_CACHE[url] = null; return null; });
  }

  var DIST_BRANDS = ["HULIOT", "FIMA", "TOTO", "GRUNDFOS", "PENTAIR", "GREEN HEAT+", "GEBERIT",
    "INAIR", "LUNOS", "STELLAR", "MEA", "NEXGEN", "ADANI SOLAR", "HELIROMA"];

  var TERMS = [
    "Prices are Ex Works Panipat warehouse.",
    "VALIDITY - This quotation is valid for 15 days from the date of issue. Prices are subject to revision after expiry and re-quotation may be required for orders placed thereafter.",
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
      Promise.all(items.map(function (i) { return loadPic(i.pic); }))
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
        return { desc: i.desc, code: i.code, pic: pics[idx], unit: i.unit || "No's",
          qty: i.qty, price: i.price, disc: d, net: net, total: net * i.qty };
      });
      var ordered = rows.filter(function (r) { return r.disc > 0; }).sort(function (a, b) { return b.disc - a.disc; })
        .concat(rows.filter(function (r) { return r.disc <= 0; }));
      var subTotal = rows.reduce(function (a, r) { return a + r.total; }, 0);
      var c = clientByName(q.client) || {};

      /* ================= HEADER ================= */
      fill(DEEP); doc.rect(0, 0, W, 46, "F");
      fill(MINT); doc.rect(0, 46, W, 1.2, "F");

      if (logo) { try { doc.addImage(logo, "JPEG", L, 9, 32, 17); } catch (e) {} }
      col(MINT); F("bold"); doc.setFontSize(6.4);
      doc.text("M O D E R N   P L U M B I N G   S O L U T I O N", L, 31.5);
      col([148, 190, 184]); F("normal"); doc.setFontSize(6);
      doc.text("PANIPAT   |   SONIPAT   |   KARNAL", L, 36.5);

      col([255, 255, 255]); F("bold"); doc.setFontSize(17);
      doc.text("QUOTATION", Rt, 16, { align: "right" });
      F("normal"); doc.setFontSize(7.6); col([160, 205, 199]);
      doc.text("Quote No.  " + String(q.quoteNo || ""), Rt, 23, { align: "right" });
      doc.text("Date  " + today(), Rt, 28, { align: "right" });
      doc.text("Valid until  " + new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), Rt, 33, { align: "right" });

      /* ---- authorised distributor strip: brands highlighted as chips ---- */
      /* label hard-left, chips packed right and right-aligned as a block */
      var y = 55;
      col(GREY); F("bold"); doc.setFontSize(6.2);
      doc.text("AUTH. DISTRIBUTOR FOR", L, y + 1);

      var CHIP_L = L + 46;
      F("bold"); doc.setFontSize(6.2);
      var lines2 = [[]], cur = 0, wsum = 0, avail = Rt - CHIP_L;
      DIST_BRANDS.forEach(function (b) {
        var w = doc.getTextWidth(b) + 5.4;
        if (wsum + w > avail && lines2[cur].length) { cur++; lines2[cur] = []; wsum = 0; }
        lines2[cur].push({ b: b, w: w });
        wsum += w + 2.2;
      });
      lines2.forEach(function (ln, li) {
        var total = ln.reduce(function (a, x) { return a + x.w + 2.2; }, 0) - 2.2;
        var cx = Rt - total;
        var ly = y + li * 7.4;
        ln.forEach(function (x) {
          fill([236, 253, 245]); doc.roundedRect(cx, ly - 3.6, x.w, 5.8, 1.4, 1.4, "F");
          doc.setDrawColor(153, 246, 228); doc.roundedRect(cx, ly - 3.6, x.w, 5.8, 1.4, 1.4, "S");
          col([13, 118, 108]); doc.text(x.b, cx + 2.7, ly);
          cx += x.w + 2.2;
        });
      });
      y += (lines2.length - 1) * 7.4 + 9;

      /* ---- client block ---- */
      fill(SOFT); doc.roundedRect(L, y, Rt - L, 24, 2, 2, "F");
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.roundedRect(L, y, Rt - L, 24, 2, 2, "S");
      fill(MINT); doc.rect(L, y, 1.4, 24, "F");
      var c1 = L + 6, c2 = L + 96, c3 = L + 140;
      col(GREY); F("bold"); doc.setFontSize(5.8);
      doc.text("PREPARED FOR", c1, y + 5.5);
      doc.text("LOCATION", c2, y + 5.5);
      doc.text("PREPARED BY", c3, y + 5.5);
      col(INK); F("bold"); doc.setFontSize(10);
      doc.text(String(q.client || "-"), c1, y + 11.5);
      doc.text(String(c.location || "Panipat"), c2, y + 11.5);
      doc.text(String(q.createdBy || "-"), c3, y + 11.5);
      col(GREY); F("normal"); doc.setFontSize(7);
      var det = [];
      if (c.mobile) det.push(String(c.mobile));
      if (c.type) det.push(String(c.type));
      doc.text(det.join("  |  "), c1, y + 16.5);
      if (c.address) doc.text(doc.splitTextToSize(String(c.address), 78)[0], c1, y + 21);
      doc.text("Energy World | Authorised Distributor", c3, y + 16.5);
      y += 32;

      /* ================= TABLE ================= */
      var X = { n: L + 3, pic: L + 8, item: L + 26, unit: 112, qty: 126, price: 145, dis: 160, dprice: 180, amt: Rt - 1 };
      var head = function () {
        fill(SLATE); doc.rect(L, y - 5.5, Rt - L, 9, "F");
        col([255, 255, 255]); F("bold"); doc.setFontSize(5.9);
        doc.text("#", X.n, y);
        doc.text("ITEM DESCRIPTION", X.item, y);
        doc.text("UNIT", X.unit, y, { align: "right" });
        doc.text("QTY", X.qty, y, { align: "right" });
        doc.text("PRICE", X.price, y, { align: "right" });
        doc.text("DIS.%", X.dis, y, { align: "right" });
        doc.text("DISCOUNTED PRICE", X.dprice, y, { align: "right" });
        doc.text("TOTAL AMT", X.amt, y, { align: "right" });
        y += 8.5;
      };
      head();

      ordered.forEach(function (r, i) {
        F("normal"); doc.setFontSize(6.3);
        var lines = doc.splitTextToSize(String(r.desc || ""), 78);
        var hgt = Math.max(16, 9.5 + lines.length * 3);
        if (y + hgt > 268) { doc.addPage(); y = 22; head(); }
        if (i % 2 === 1) { fill(SOFT); doc.rect(L, y - 4.5, Rt - L, hgt, "F"); }

        col(GREY); F("normal"); doc.setFontSize(6.8);
        doc.text(String(i + 1), X.n, y + 1);
        if (r.pic) { try { doc.addImage(r.pic, X.pic, y - 2.6, 14, 12); } catch (e) {} }

        col([13, 148, 136]); F("bold"); doc.setFontSize(6.3);
        doc.text(String(r.code || ""), X.item, y - 0.6);
        col(INK); F("bold"); doc.setFontSize(7.8);
        doc.text(doc.splitTextToSize(String(r.desc || "").split(":")[0], 78)[0], X.item, y + 3.8);
        col(GREY); F("normal"); doc.setFontSize(6.3);
        doc.text(lines.slice(0, 4), X.item, y + 8);

        col(INK); F("normal"); doc.setFontSize(7.2);
        doc.text(String(r.unit), X.unit, y + 1, { align: "right" });
        F("bold"); doc.text(String(r.qty), X.qty, y + 1, { align: "right" });
        F("normal");
        if (r.disc > 0) {
          col(GREY);
          doc.text(R(r.price), X.price, y + 1, { align: "right" });
          col([13, 148, 136]); F("bold");
          doc.text(r.disc.toFixed(1) + "%", X.dis, y + 1, { align: "right" });
          col(INK); F("normal");
          doc.text(R(r.net), X.dprice, y + 1, { align: "right" });
        } else {
          col(INK);
          doc.text(R(r.net), X.dprice, y + 1, { align: "right" });
        }
        F("bold"); doc.setFontSize(8); col(INK);
        doc.text(R(r.total), X.amt, y + 1, { align: "right" });

        y += hgt;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(L, y - 3.5, Rt, y - 3.5);
      });

      /* ---- sub-total. GST amount never appears. ---- */
      y += 4;
      if (y > 258) { doc.addPage(); y = 26; }
      fill([236, 253, 245]); doc.roundedRect(112, y - 5, Rt - 112, 12, 1.5, 1.5, "F");
      col([13, 118, 108]); F("bold"); doc.setFontSize(7.6);
      doc.text("Sub-Total { GST as Actual }", 116, y + 1.4);
      doc.setFontSize(11.5);
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

  function viewVisits() {
    var today = todayStr();
    var mine = S.role === "admin" ? S.data.sitevisits : S.data.sitevisits.filter(function (v) { return v.createdBy === S.user; });
    var list = mine.slice().reverse();
    var todays = list.filter(function (v) { return dstr(v.date) === today; });
    var flagged = list.filter(function (v) { return v.verified !== "Verified"; });

    var h = '<div class="cards">' +
      '<div class="stat"><div class="n">' + todays.length + '</div><div class="l">Visits today</div></div>' +
      '<div class="stat"><div class="n">' + list.length + '</div><div class="l">Visits logged</div></div>' +
      '<div class="stat ' + (flagged.length ? "alert" : "") + '"><div class="n">' + flagged.length + '</div><div class="l">Unverified / far</div></div>' +
      '</div>';
    h += '<div class="empty" style="text-align:left;padding:0 0 12px">A visit is logged only when someone presses <b>Check in</b>. Nobody is tracked in the background. The first verified visit fixes the site location; later visits are measured against it.</div>';
    if (!list.length) return h + '<div class="empty">No visits logged yet.</div>';
    list.slice(0, 60).forEach(function (v) {
      var cls = v.verified === "Verified" ? "Won" : (v.verified === "Far" ? "due" : "soon");
      h += '<div class="card"><h3>' + esc(v.siteName || "(site)") + ' <span class="pill ' + cls + '">' + esc(v.verified) + '</span></h3>' +
        '<div class="meta">' + esc(v.client || "") + '<br>' + esc(dstr(v.date)) + ' &middot; ' + esc(v.createdBy) +
        (v.purpose ? '<br>' + esc(v.purpose) : "") +
        (v.distanceM ? '<br>' + esc(v.distanceM) + 'm from site' : "") +
        (v.accuracy ? ' &middot; GPS ' + esc(v.accuracy) + 'm' : "") +
        (v.note ? '<br><i>' + esc(v.note) + '</i>' : "") + '</div>' +
        '<div class="acts">' +
        (v.lat ? '<a class="btn sm ghost" target="_blank" href="https://maps.google.com/?q=' + esc(v.lat) + ',' + esc(v.lng) + '">Map</a>' : "") +
        (v.tgFileId ? '<button class="btn sm" data-act="v-photo" data-file="' + esc(v.tgFileId) + '">Photo</button>' : '<span class="pill">no photo</span>') +
        '</div>' +
        '</div>';
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

  function viewChallans() {
    var h = '<div class="row"><div class="grow"></div><button class="btn" data-act="ch-new">+ New challan</button></div>';
    var list = S.data.challans.slice().reverse();
    if (!list.length) h += '<div class="empty">No challans yet.</div>';
    list.forEach(function (c) {
      h += '<div class="card"><h3>' + esc(c.challanNo) + ' <span class="pill teal">' + money(c.amount) + '</span></h3>' +
        '<div class="meta">' + esc(c.customerName || "") + (c.site ? ' &middot; ' + esc(c.site) : '') +
        '<br>' + esc(c.items || "") +
        (c.associate ? '<br>Partner: ' + esc(c.associate) + ' &middot; incentive ' + money(c.commissionAmt) : '') +
        '<br>' + esc(dstr(c.createdAt)) + ' by ' + esc(c.createdBy || "") + '</div></div>';
    });
    return h;
  }

  function viewCommission() {
    var byAssoc = {};
    S.data.challans.forEach(function (c) {
      if (!c.associate) return;
      if (!byAssoc[c.associate]) byAssoc[c.associate] = { sales: 0, comm: 0, n: 0 };
      byAssoc[c.associate].sales += Number(c.amount) || 0;
      byAssoc[c.associate].comm += Number(c.commissionAmt) || 0;
      byAssoc[c.associate].n += 1;
    });
    var h = '<div class="row"><div class="grow"></div><button class="btn" data-act="as-new">+ New partner</button></div>';
    if (!S.data.associates.length) h += '<div class="empty">No partners yet. Add the plumbers, architects, builders and PMCs who bring you work.</div>';
    S.data.associates.forEach(function (a) {
      var t = byAssoc[a.name] || { sales: 0, comm: 0, n: 0 };
      h += '<div class="card"><h3>' + esc(a.name) + ' <span class="pill">' + esc(a.role || "") + '</span>' +
        ' <span class="pill teal">' + esc(a.rate || 0) + '% incentive</span></h3>' +
        '<div class="meta">' + (a.mobile ? esc(a.mobile) + '<br>' : '') +
        t.n + ' challan(s) &middot; sales ' + money(t.sales) + '<br><b>Incentive: ' + money(t.comm) + '</b>' +
        (a.notes ? '<br>' + esc(a.notes) : '') + '</div>' +
        '<div class="acts"><button class="btn sm ghost" data-act="as-open" data-id="' + esc(a.id) + '">Edit</button></div></div>';
    });
    return h;
  }

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

  function modalAssociate(a) {
    a = a || {};
    return '<h2>' + (a.id ? "Edit partner" : "New partner") + '</h2>' +
      '<p class="sub">Plumbers, architects, builders and PMCs. Incentive % is set here.</p>' +
      '<label>Name</label><input id="m_aname" value="' + esc(a.name) + '"/>' +
      '<div class="grid2">' +
      '<div><label>Role</label><select id="m_arole">' + opts(["Plumber", "Architect", "Contractor", "Dealer", "Other"], a.role || "Plumber") + '</select></div>' +
      '<div><label>Incentive %</label><input id="m_arate" inputmode="decimal" value="' + esc(a.rate || "5") + '"/></div>' +
      '</div>' +
      '<label>Mobile</label><input id="m_amobile" inputmode="numeric" value="' + esc(a.mobile) + '"/>' +
      '<label>Notes</label><textarea id="m_anotes">' + esc(a.notes) + '</textarea>' +
      '<div class="foot"><button class="btn ghost" data-act="close">Cancel</button>' +
      '<button class="btn" data-act="as-save" data-id="' + esc(a.id || "") + '">Save</button></div>';
  }

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
    if (!S.pin) { renderLogin(); return; }
    var views = { leads: viewLeads, visits: viewVisits, commission: viewIncentives, payments: viewPayments, discounts: viewDiscounts, catalogue: viewCatalogue, clients: viewClients, quotes: viewQuotes, service: viewService, spares: viewSpares, dues: viewDues, payroll: viewPayroll, dash: viewDash, sites: viewSites, matrix: viewMatrix, winloss: viewWinLoss, rules: viewRules, customers: viewCustomers, followups: viewFollowups, challans: viewChallans, commission: viewCommission, products: viewProducts, pitch: viewPitch };
    var tabs = [["dash", "Today"], ["sites", "Sites"], ["winloss", "Win/Loss"], ["leads", "Brand leads"], ["visits", "Site visits"], ["customers", "Customers"], ["followups", "Follow-ups"], ["challans", "Challans"], ["clients", "Clients"], ["quotes", "Quotes"], ["commission", "Incentives"], ["service", "Service"], ["spares", "Spares"], ["dues", "Client dues"], ["payroll", "Payroll"], ["products", "Products"], ["payments", "Payments"], ["discounts", "Discounts"], ["catalogue", "Catalogue"], ["rules", "Pitch rules"]];

    var h = '<div class="top">' +
      '<button class="burger" data-act="nav-toggle">&#9776;</button>' +
      '<img src="' + LOGO + '" alt="EW" onerror="this.style.display=\'none\'"/>' +
      '<div><b style="font-size:15px">Energy World</b><div style="font-size:12px;color:#64748b">Team workspace</div></div>' +
      '<div class="who"><b>' + esc(S.user) + '</b><span class="pill teal">' + esc(S.role) + '</span>' +
      '<div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">' +
      '<button class="btn sm ghost" data-act="pin-change">PIN</button>' +
      '<button class="btn sm ghost" data-act="logout">Sign out</button></div></div></div>';

    var GROUPS = [
      ["Sell", ["dash", "clients", "quotes", "sites", "leads", "visits", "winloss", "followups"]],
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

    h += '<main>' + (S.busy ? '<div class="empty">Saving...</div>' : (views[S.tab] || viewDash)()) +
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
      save("clients", {
        id: id || "", createdBy: S.user, name: cn,
        shortName: val("c_short") || cn.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(" ")[0].slice(0, 10),
        location: val("c_loc"), mobile: val("c_mob"), address: val("c_addr"), type: val("c_type"),
        architect: val("c_arch"), plumber: val("c_plumb"), builder: val("c_build"), pmc: val("c_pmc"),
        notes: val("c_notes")
      }).then(function (r) {
        if (!r) return;
        S.modal = null;
        toast("Client saved.");
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
        id: id || "", name: an, role: val("m_arole"), mobile: val("m_amobile"),
        rate: val("m_arate"), notes: val("m_anotes")
      }).then(function (r) { if (r) { S.modal = null; toast("Associate saved."); render(); } });
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
    }
  })();
})();