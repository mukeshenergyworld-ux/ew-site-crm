/* =====================================================================================================
   EW TOOL TRACKING - SERVER BLOCK FOR THE COMPANION (Saathi's) APPS SCRIPT  -  TK1  (17 Nov 2026)
   -----------------------------------------------------------------------------------------------------
   HIS WORDS: "create a tool tracking app. 1. we will register manually which tool is with whom, contractor
   or at godown; later will assign bar code; now we don't even know which tool is with whom. 2. I will make
   a tool list manually, assigning tool will be picked from that list only. 3. everyone can login with their
   CRM or Challan app login. 4. tools transferred from one site to other will be marked at the time of
   transferring, like debit credit. 5. linked to CRM, Visit, Service and Challan app. 6. in Saathi app it will
   show the plumbing contractor which tool he is having."
   HIS ANSWERS: any staff can transfer; the giver's entry is enough; every piece separately; a damaged or
   lost tool is logged with the site and by whom, and what is to be recovered; numbering starts fresh.

   WHAT IT IS. One tool, one holder at a time: the godown, a site, a partner (plumber / contractor), a staff
   member, or "not traced". Every movement is a line added to TK_Moves (from -> to) and never edited. A tool
   damaged or lost is a line in TK_Events with the site, the man and the amount to recover.
   It lives in the Brand block's spreadsheet (BX_SHEET_ID) and uses its plumbing (bxSh_, bxRows_, bxWrite_).
   PASTE this AFTER the Brand block. The second line doPost needs, after the bx one:
       var _tk = tkTry_(e); if (_tk) return _tk;
   Staff sign in once with the CRM's name + PIN (teamAuth, checked by the CRM); after that this server's own token.
   ===================================================================================================== */
var TK_V = "TK2";   /* TK2 (17 Nov 2026) - staff sign in HERE once with the CRM name + PIN and get this server's own tool token; the CRM's saved token is no longer passed on.
   MEASURED on TK1, live: a call carrying "Mukesh Verma" + his saved CRM token made this server's sign-in check to the CRM hang until Apps Script killed it at 360 s
   ("Timeout: .../exec"), three times in three; the same call with the PIN, or the Brand block's owner check, answers in 5-7 s. So: the PIN is checked once (the path the
   Saathi staff sign-in has used since October), a token of our own is kept (only its fingerprint, 60 days), and the owner's CRM sends the pick lists through the Brand
   block's owner check. A staff member no longer on the CRM's team list (sent with the pick lists) is signed out. */
BX_TABS.TK_Sess = ["th", "name", "role", "at"];
BX_TABS.TK_Tools  = ["tid", "code", "name", "make", "model", "serial", "value", "notes", "cond", "hType", "hName", "hRef", "hCode", "site", "since", "addedAt", "addedBy", "updatedAt", "off"];
BX_TABS.TK_Moves  = ["mid", "at", "tid", "code", "tool", "kind", "fType", "fName", "fRef", "fSite", "tType", "tName", "tRef", "tCode", "tSite", "note", "by"];
BX_TABS.TK_Events = ["eid", "at", "tid", "code", "tool", "kind", "hType", "hName", "hRef", "site", "who", "whoRef", "note", "amount", "recovered", "recAt", "recBy", "by"];
BX_TABS.TK_Dir    = ["json", "at"];
var TK_HTYPES = ["godown", "site", "partner", "staff", "unknown"];
var TK_EVENTS = { "Damaged": "Damaged", "Lost": "Lost", "Repaired": "OK", "Found": "OK", "Scrapped": "Scrapped" };
var TK_WRITES = ["toolAdd", "toolEdit", "toolOff", "move", "event", "recover"];

function tkTry_(e) {
  var body = null;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) { return null; }
  var a = String((body && body.action) || "");
  if (["tkPing", "tkLogin", "tkLogout", "tkStaff", "tkAdmin", "tkMine"].indexOf(a) < 0) return null;
  if (a === "tkPing") return bxOut_({ ok: true, v: TK_V });
  var lock = LockService.getScriptLock(), locked = false;
  try {
    if (a === "tkMine") return bxOut_(tkMine_(body));
    if (a === "tkLogin") return bxOut_(tkLogin_(body));
    if (a === "tkLogout") return bxOut_(tkLogout_(body));
    if (a === "tkAdmin") {                                      /* the owner's CRM: the Brand block's own owner check */
      if (!bxOwner_(body)) return bxOut_({ ok: false, err: "owner sign-in not accepted" });
      if (String(body.op || "") !== "dirSync") return bxOut_({ ok: false, err: "unknown op" });
      lock.waitLock(20000); locked = true;
      return bxOut_(tkOp_("dirSync", body, { name: String(body.crmUser || ""), role: "admin" }));
    }
    var me = tkStaff_(body);                                   /* who he is: asked first, outside the lock */
    if (!me) return bxOut_({ ok: false, out: 1, err: "Sign in again." });
    var op = String(body.op || "book");
    if (op === "dirSync") return bxOut_({ ok: false, err: "owner only" });   /* the pick lists come through tkAdmin */
    if (TK_WRITES.indexOf(op) >= 0) { lock.waitLock(20000); locked = true; }
    return bxOut_(tkOp_(op, body, me));
  } catch (err) {
    return bxOut_({ ok: false, err: "server: " + String((err && err.message) || err).slice(0, 200) });
  } finally { if (locked) { try { lock.releaseLock(); } catch (x2) { } } }
}

/* ---------- sign-in: the CRM's name + PIN, checked by the CRM once; after that, this server's own token ---------- */
function tkHashTok_(tok) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "ewtk|" + String(tok), Utilities.Charset.UTF_8);
  return raw.map(function (b) { b = (b + 256) % 256; return (b < 16 ? "0" : "") + b.toString(16); }).join("");
}
function tkLogin_(b) {
  var user = String(b.user || "").trim(), pin = String(b.pin || "").trim();
  if (!user || !pin) return { ok: false, err: "Type your name and PIN." };
  var url = PropertiesService.getScriptProperties().getProperty("BX_CRM_URL") || BX_CRM_URL;
  var res = UrlFetchApp.fetch(url, { method: "post", contentType: "text/plain;charset=utf-8", muteHttpExceptions: true, followRedirects: true,
    payload: JSON.stringify({ action: "teamAuth", user: user, pin: pin, app: "Companion " + TK_V }) });
  var r = {}; try { r = JSON.parse(res.getContentText() || "{}"); } catch (e) { r = {}; }
  if (!(r && r.ok)) return { ok: false, err: String((r && r.error) || "Name or PIN not right.").slice(0, 200) };
  var me = { name: String((r.user && r.user.name) || user), role: String((r.user && r.user.role) || r.role || "").toLowerCase() };
  var tok = bxRand_(40), now = new Date().toISOString();
  bxWrite_("TK_Sess", 0, { th: tkHashTok_(tok), name: me.name, role: me.role, at: now });
  bxLog_(me.name, "tools sign-in", me.role);
  return { ok: true, tok: tok, me: me, v: TK_V };
}
function tkLogout_(b) {
  var th = tkHashTok_(String(b.tkTok || ""));
  bxRows_("TK_Sess").forEach(function (x) { if (String(x.th) === th) bxWrite_("TK_Sess", x._r, { th: "", name: x.name, role: "signed out", at: x.at }); });
  try { CacheService.getScriptCache().remove("tk_s_" + th); } catch (e) { }
  return { ok: true };
}
function tkStaff_(b) {
  var tok = String(b.tkTok || "").trim(); if (tok.length < 30) return null;
  var th = tkHashTok_(tok), cache = CacheService.getScriptCache(), hit = cache.get("tk_s_" + th);
  if (hit) { try { return JSON.parse(hit); } catch (e) { } }
  var row = bxRows_("TK_Sess").filter(function (x) { return String(x.th) === th; })[0];
  if (!row) return null;
  if (Date.now() - (Date.parse(row.at) || 0) > 60 * 86400000) return null;          /* 60 days, then the PIN again */
  var me = { name: String(row.name), role: String(row.role || "").toLowerCase() };
  var dir = tkDir_();                                                                 /* the CRM's team list, when it has been sent */
  if (dir && dir.staff && dir.staff.length) {
    var st = dir.staff.filter(function (x) { return tkKey_(x.n) === tkKey_(me.name); })[0];
    if (!st) return null;                                                             /* no longer on the team */
    if (st.r) me.role = String(st.r).toLowerCase();
  }
  cache.put("tk_s_" + th, JSON.stringify(me), 600);
  return me;
}
function tkBoss_(me) { return me && (me.role === "admin" || me.role === "accounts"); }
function tkKey_(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function tkClean_(s, n) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n || 120); }
function tkPub_(t) {
  return { tid: t.tid, code: t.code, name: t.name, make: t.make, model: t.model, serial: t.serial, value: Number(t.value) || 0, notes: t.notes, cond: t.cond || "OK",
    hType: t.hType || "unknown", hName: t.hName, hRef: t.hRef, hCode: t.hCode, site: t.site, since: t.since, off: String(t.off || "") === "1" ? 1 : 0 };
}
function tkDir_() {
  var rs = bxRows_("TK_Dir"); if (!rs.length) return null;
  try { return JSON.parse(rs.map(function (r) { return String(r.json || ""); }).join("") || "null"); } catch (e) { return null; }
}

function tkOp_(op, b, me) {
  var now = new Date().toISOString();
  if (op === "book") {
    var tools = bxRows_("TK_Tools").map(tkPub_);
    var mv = bxRows_("TK_Moves"), ev = bxRows_("TK_Events");
    var strip = function (x) { var o = {}; Object.keys(x).forEach(function (k) { if (k !== "_r") o[k] = x[k]; }); return o; };
    return { ok: true, v: TK_V, me: me, tools: tools, moves: mv.slice(-600).map(strip), events: ev.slice(-600).map(strip), dir: b.wantDir ? tkDir_() : undefined };
  }
  if (op === "dirSync") {
    if (me.role !== "admin") return { ok: false, err: "owner only" };
    var d = b.dir || {}, j = JSON.stringify({ partners: d.partners || [], sites: d.sites || [], staff: d.staff || [] }), parts = [];
    var sh = bxSh_("TK_Dir"); if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
    for (var i = 0; i < j.length; i += 45000) parts.push([j.slice(i, i + 45000), now]);
    if (parts.length) sh.getRange(2, 1, parts.length, 2).setValues(parts);
    return { ok: true, chars: j.length };
  }
  if (op === "toolAdd") {
    if (!tkBoss_(me)) return { ok: false, err: "Only the owner and accounts add to the tool list." };
    var nm = tkClean_(b.name, 80), n = Math.max(1, Math.min(50, Math.round(Number(b.count) || 1)));
    if (nm.length < 2) return { ok: false, err: "Write the tool's name." };
    var have = bxRows_("TK_Tools"), max = 0;
    have.forEach(function (t) { var m = /^EWT-(\d+)$/.exec(String(t.code || "")); if (m) max = Math.max(max, Number(m[1])); });
    var made = [];
    for (var k = 1; k <= n; k++) {
      var num = max + k, row = { tid: "TL" + Date.now().toString(36) + bxRand_(4), code: "EWT-" + (num < 1000 ? ("000" + num).slice(-3) : String(num)), name: nm,
        make: tkClean_(b.make, 60), model: tkClean_(b.model, 60), serial: n === 1 ? tkClean_(b.serial, 60) : "", value: Math.max(0, Math.round(Number(b.value) || 0)), notes: tkClean_(b.notes, 300),
        cond: "OK", hType: b.inGodown ? "godown" : "unknown", hName: b.inGodown ? "Godown" : "", hRef: "", hCode: "", site: "", since: now, addedAt: now, addedBy: me.name, updatedAt: now, off: "" };
      bxWrite_("TK_Tools", 0, row); made.push(tkPub_(row));
    }
    bxLog_(me.name, "tool added", nm + " x" + n);
    return { ok: true, tools: made };
  }
  var all = bxRows_("TK_Tools");
  var find = function (tid) { return all.filter(function (t) { return String(t.tid) === String(tid); })[0] || null; };
  if (op === "toolEdit") {
    if (!tkBoss_(me)) return { ok: false, err: "Only the owner and accounts change the tool list." };
    var t = find(b.tid); if (!t) return { ok: false, err: "That tool is not on the list." };
    var nm2 = tkClean_(b.name, 80); if (nm2.length < 2) return { ok: false, err: "Write the tool's name." };
    t.name = nm2; t.make = tkClean_(b.make, 60); t.model = tkClean_(b.model, 60); t.serial = tkClean_(b.serial, 60);
    t.value = Math.max(0, Math.round(Number(b.value) || 0)); t.notes = tkClean_(b.notes, 300); t.updatedAt = now;
    bxWrite_("TK_Tools", t._r, t); bxLog_(me.name, "tool edited", t.code);
    return { ok: true, tool: tkPub_(t) };
  }
  if (op === "toolOff") {
    if (me.role !== "admin") return { ok: false, err: "Only the owner takes a tool off the list." };
    var t2 = find(b.tid); if (!t2) return { ok: false, err: "That tool is not on the list." };
    t2.off = b.back ? "" : "1"; t2.updatedAt = now; bxWrite_("TK_Tools", t2._r, t2);
    bxWrite_("TK_Events", 0, { eid: "TE" + Date.now().toString(36) + bxRand_(4), at: now, tid: t2.tid, code: t2.code, tool: t2.name, kind: b.back ? "Back on the list" : "Taken off the list",
      hType: t2.hType, hName: t2.hName, hRef: t2.hRef, site: t2.site, who: "", whoRef: "", note: tkClean_(b.note, 300), amount: 0, recovered: "", recAt: "", recBy: "", by: me.name });
    return { ok: true, tool: tkPub_(t2) };
  }
  if (op === "move") {
    var tids = Array.isArray(b.tids) ? b.tids.slice(0, 60) : [], tType = String(b.tType || "");
    if (!tids.length) return { ok: false, err: "Pick the tool." };
    if (TK_HTYPES.indexOf(tType) < 0) return { ok: false, err: "Pick who it goes to." };
    var tName = tType === "godown" ? "Godown" : tType === "unknown" ? "" : tkClean_(b.tName, 120);
    if ((tType === "site" || tType === "partner" || tType === "staff") && tName.length < 2) return { ok: false, err: "Pick the name from the list." };
    var tSite = tType === "site" ? tName : (tType === "godown" || tType === "unknown" ? "" : tkClean_(b.tSite, 120));
    var done = [], skipped = [], kind = b.opening ? "Opening" : (tType === "godown" ? "Back to godown" : "Handed over");
    tids.forEach(function (tid) {
      var t3 = find(tid); if (!t3 || String(t3.off || "") === "1") { skipped.push(String(tid)); return; }
      var same = String(t3.hType || "unknown") === tType && tkKey_(t3.hName) === tkKey_(tName) && tkKey_(t3.site) === tkKey_(tSite);
      if (same) { skipped.push(t3.code); return; }
      bxWrite_("TK_Moves", 0, { mid: "TM" + Date.now().toString(36) + bxRand_(4), at: now, tid: t3.tid, code: t3.code, tool: t3.name, kind: (!t3.hType || t3.hType === "unknown") && kind === "Handed over" ? "Opening" : kind,
        fType: t3.hType || "unknown", fName: t3.hName, fRef: t3.hRef, fSite: t3.site, tType: tType, tName: tName, tRef: tkClean_(b.tRef, 60), tCode: tkClean_(b.tCode, 20), tSite: tSite, note: tkClean_(b.note, 300), by: me.name });
      t3.hType = tType; t3.hName = tName; t3.hRef = tkClean_(b.tRef, 60); t3.hCode = tkClean_(b.tCode, 20); t3.site = tSite; t3.since = now; t3.updatedAt = now;
      bxWrite_("TK_Tools", t3._r, t3); done.push(tkPub_(t3));
    });
    if (!done.length) return { ok: false, err: skipped.length ? "It is already there." : "Nothing moved." };
    return { ok: true, tools: done, skipped: skipped };
  }
  if (op === "event") {
    var kindE = String(b.kind || ""); if (!TK_EVENTS[kindE]) return { ok: false, err: "Pick what happened." };
    if (kindE === "Scrapped" && !tkBoss_(me)) return { ok: false, err: "Only the owner and accounts scrap a tool." };
    var t4 = find(b.tid); if (!t4) return { ok: false, err: "That tool is not on the list." };
    var note = tkClean_(b.note, 400);
    if ((kindE === "Damaged" || kindE === "Lost") && note.length < 4) return { ok: false, err: "Write what happened, in a line." };
    var amt = (kindE === "Damaged" || kindE === "Lost") ? Math.max(0, Math.round(Number(b.amount) || 0)) : 0;
    var who = tkClean_(b.who, 120) || (t4.hType === "partner" || t4.hType === "staff" ? t4.hName : "");
    if (amt > 0 && !who) return { ok: false, err: "Pick who it is to be recovered from." };
    var ev2 = { eid: "TE" + Date.now().toString(36) + bxRand_(4), at: now, tid: t4.tid, code: t4.code, tool: t4.name, kind: kindE, hType: t4.hType, hName: t4.hName, hRef: t4.hRef,
      site: tkClean_(b.site, 120) || t4.site, who: who, whoRef: tkClean_(b.whoRef, 60) || (who === t4.hName ? t4.hRef : ""), note: note, amount: amt, recovered: "", recAt: "", recBy: "", by: me.name };
    bxWrite_("TK_Events", 0, ev2);
    t4.cond = TK_EVENTS[kindE]; t4.updatedAt = now; bxWrite_("TK_Tools", t4._r, t4);
    delete ev2._r;
    return { ok: true, tool: tkPub_(t4), event: ev2 };
  }
  if (op === "recover") {
    if (!tkBoss_(me)) return { ok: false, err: "Only the owner and accounts mark a recovery." };
    var e5 = bxRows_("TK_Events").filter(function (x) { return String(x.eid) === String(b.eid); })[0];
    if (!e5 || !(Number(e5.amount) > 0)) return { ok: false, err: "Nothing to recover on that line." };
    e5.recovered = b.undo ? "" : "Y"; e5.recAt = b.undo ? "" : now; e5.recBy = b.undo ? "" : me.name;
    bxWrite_("TK_Events", e5._r, e5);
    return { ok: true, eid: e5.eid, recovered: e5.recovered };
  }
  return { ok: false, err: "unknown op" };
}

/* ---------- Saathi: the tools a partner is holding. His own sign-in, or a staff member looking at him ---------- */
function tkMine_(b) {
  var ref = "", name = "";
  if (b.crmUser) {
    var cs = coCrmStaff_(b); if (!cs || !cs.ok) return { ok: false, err: "Sign in again." };
    ref = String(b.refId || ""); name = String(b.refName || "");
    if (!ref && !name) return { ok: true, tools: [] };
  } else {
    var s = coAuth_(b, false); if (!s || !s.ok) return { ok: false, err: "Sign in again." };
    ref = String(s.refId || ""); name = String(s.name || "");
  }
  var nk = tkKey_(name);
  var mine = bxRows_("TK_Tools").filter(function (t) {
    if (String(t.off || "") === "1" || String(t.hType) !== "partner") return false;
    return (ref && String(t.hRef) === ref) || (nk && tkKey_(t.hName) === nk);
  }).map(function (t) { return { code: t.code, name: t.name, make: t.make, model: t.model, site: t.site, since: t.since, cond: t.cond || "OK" }; });
  return { ok: true, tools: mine, v: TK_V };
}
