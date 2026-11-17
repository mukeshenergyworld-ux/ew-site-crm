/* =====================================================================================================
   EW BRAND FOLLOWUP - SERVER BLOCK FOR THE COMPANION (Saathi's) APPS SCRIPT  -  BX1  (17 Nov 2026)
   -----------------------------------------------------------------------------------------------------
   WHAT IT IS. The server for the Brand Followup app (mukeshenergyworld-ux.github.io/ew-site-crm/brand/).
   A brand executive signs in here with his mobile + PIN and gets ONLY the sites the owner put him on.
   He never talks to the CRM's server. Everything he can see was sent here by the owner's CRM
   ("Send to brand app") - per man, his sites, nothing else.

   WHERE ITS DATA LIVES. Its own spreadsheet "EW Brand Followup" (made by bxSetup), not the main book:
     BX_People  id, name, mobile, brand, company, city, active, pinHash, salt, updatedAt
     BX_Book    bxId, json, at            (his sites, as the CRM sent them)
     BX_Fu      fid, at, bxId, bxName, client, brand, status, remark, next, fileName, fileUrl
     BX_Log     at, who, what, detail     (sign-ins, opens, refusals)
   Quote files go to the Drive folder "EW Brand Quotes", private to the owner's Google account.

   SAFETY. PINs are kept only as a salted SHA-256; five wrong PINs lock that mobile for 10 minutes.
   A sign-in lasts 6 hours. Every request re-checks that he is still active, so Block works at once.
   A follow-up is refused for a client he is not on. The owner's calls (sync / pin / pull) are
   checked against the CRM's own sign-in (teamAuth) and must be an admin.

   SET-UP (once) - see the paste steps.
   ===================================================================================================== */
var BX_V = "BX3";
var BX_CRM_URL = "https://script.google.com/macros/s/AKfycbzVkPHWyPq-w8RFD_HdG0vCjmrfQvEUpcq_hhF9eDGa0ZbZ3rIx7N37an2DQRGmsxPK/exec";
var BX_TABS = {
  BX_People: ["id", "name", "mobile", "brand", "company", "city", "active", "pinHash", "salt", "updatedAt"],
  BX_Book:   ["bxId", "json", "at"],
  BX_Fu:     ["fid", "at", "bxId", "bxName", "client", "brand", "status", "remark", "next", "fileName", "fileUrl"],
  BX_Log:    ["at", "who", "what", "detail"],
  /* BX3 - sites a brand executive adds himself; the CRM pulls them, the owner decides */
  BX_Leads:  ["lid", "at", "bxId", "bxName", "brand", "client", "mobile", "city", "area", "address", "type", "stage", "architect", "plumber", "remark", "dup", "dupWhat", "status", "note", "decidedAt"],
  /* BX3 - the CRM's book, as fingerprints only: never a name or a number in the clear */
  BX_Dup:    ["json", "at"]
};
var BX_STATUS = ["Ongoing", "Won", "Lost", "Not required"];
var BX_FILE_MAX = 6 * 1024 * 1024;
var BX_FILE_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/* ---------- the one line doPost needs:  var _bx = bxTry_(e); if (_bx) return _bx;  ---------- */
function bxTry_(e) {
  var body = null;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) { return null; }
  var a = String((body && body.action) || "");
  if (["bxPing", "bxLogin", "bxBook", "bxSave", "bxAdmin", "bxAddSite"].indexOf(a) < 0) return null;
  var lock = LockService.getScriptLock();
  try {
    if (a === "bxSave" || a === "bxAdmin" || a === "bxAddSite") lock.waitLock(20000);
    if (a === "bxPing") return bxOut_({ ok: true, v: BX_V });
    if (a === "bxLogin") return bxOut_(bxLogin_(body));
    if (a === "bxBook") return bxOut_(bxBook_(body));
    if (a === "bxSave") return bxOut_(bxSave_(body));
    if (a === "bxAddSite") return bxOut_(bxAddSite_(body));
    return bxOut_(bxAdmin_(body));
  } catch (err) {
    return bxOut_({ ok: false, err: "server: " + String((err && err.message) || err).slice(0, 200) });
  } finally { try { lock.releaseLock(); } catch (x2) { } }
}

/* ---------- set-up: run once from the editor ---------- */
function bxSetup() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty("BX_SHEET_ID"), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create("EW Brand Followup"); props.setProperty("BX_SHEET_ID", ss.getId()); }
  Object.keys(BX_TABS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n), h = BX_TABS[n];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight("bold"); sh.setFrozenRows(1);
  });
  var s1 = ss.getSheetByName("Sheet1"); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  ss.getSheetByName("BX_People").getRange("C:C").setNumberFormat("@");
  bxFolder_();
  return "ready: " + ss.getUrl();
}

/* ---------- plumbing ---------- */
function bxOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function bxSs_() {
  var id = PropertiesService.getScriptProperties().getProperty("BX_SHEET_ID");
  if (!id) throw new Error("run bxSetup once in the editor");
  return SpreadsheetApp.openById(id);
}
function bxSh_(n) {
  var ss = bxSs_(), sh = ss.getSheetByName(n);
  if (!sh && BX_TABS[n]) { sh = ss.insertSheet(n); sh.getRange(1, 1, 1, BX_TABS[n].length).setValues([BX_TABS[n]]).setFontWeight("bold"); sh.setFrozenRows(1); if (n === "BX_Leads") sh.getRange("G:G").setNumberFormat("@"); }   /* BX3 - a tab added later makes itself */
  return sh;
}
function bxRows_(n) {
  var sh = bxSh_(n), v = sh.getDataRange().getValues(); if (v.length < 2) return [];
  var h = v[0];
  return v.slice(1).map(function (r, i) { var o = { _r: i + 2 }; h.forEach(function (k, j) { o[k] = r[j] instanceof Date ? r[j].toISOString() : r[j]; }); return o; });
}
function bxWrite_(n, rowNo, obj) {
  var sh = bxSh_(n), h = BX_TABS[n], line = h.map(function (k) { return obj[k] == null ? "" : obj[k]; });
  if (rowNo) sh.getRange(rowNo, 1, 1, h.length).setValues([line]); else sh.appendRow(line);
}
function bxLog_(who, what, detail) { try { bxSh_("BX_Log").appendRow([new Date().toISOString(), String(who || ""), String(what || ""), String(detail || "").slice(0, 400)]); } catch (e) { } }
function bxHash_(pin, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ":" + String(pin).trim(), Utilities.Charset.UTF_8);
  return raw.map(function (b) { b = (b + 256) % 256; return (b < 16 ? "0" : "") + b.toString(16); }).join("");
}
function bxRand_(n) { var a = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ", s = ""; for (var i = 0; i < n; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
function bxMob_(v) { return String(v == null ? "" : v).replace(/\D/g, "").slice(-10); }
function bxFolder_() {
  var it = DriveApp.getFoldersByName("EW Brand Quotes");
  return it.hasNext() ? it.next() : DriveApp.createFolder("EW Brand Quotes");
}

/* ---------- the brand executive ---------- */
function bxLogin_(b) {
  var mob = bxMob_(b.mobile), pin = String(b.pin || "").trim(), cache = CacheService.getScriptCache(), lk = "bx_lock_" + mob;
  if (mob.length !== 10 || !/^\d{4,6}$/.test(pin)) return { ok: false, err: "Mobile (10 digits) and PIN (4 to 6 digits)." };
  if (Number(cache.get(lk) || 0) >= 5) { bxLog_(mob, "locked", ""); return { ok: false, err: "Too many wrong tries. Wait 10 minutes." }; }
  var p = bxRows_("BX_People").filter(function (x) { return bxMob_(x.mobile) === mob; })[0];
  var ok = !!(p && String(p.active).toUpperCase() === "Y" && p.pinHash && p.salt && bxHash_(pin, p.salt) === String(p.pinHash));
  if (!ok) {
    cache.put(lk, String(Number(cache.get(lk) || 0) + 1), 600);
    bxLog_(mob, "login refused", p ? (String(p.active).toUpperCase() !== "Y" ? "not active" : (!p.pinHash ? "no PIN set" : "wrong PIN")) : "unknown mobile");
    if (p && String(p.active).toUpperCase() === "Y" && !p.pinHash) return { ok: false, err: "Your PIN is not set yet. Ask Energy World." };
    return { ok: false, err: "Mobile or PIN not right." };
  }
  cache.remove(lk);
  var tok = bxRand_(40);
  cache.put("bx_tok_" + tok, String(p.id), 21600);
  bxLog_(p.name, "login", mob);
  return { ok: true, tok: tok, me: bxMe_(p) };
}
function bxMe_(p) { return { id: String(p.id), name: String(p.name), mobile: bxMob_(p.mobile), brand: String(p.brand || ""), company: String(p.company || ""), city: String(p.city || "") }; }
function bxWho_(b) {   /* the signed-in man, re-read now: Block works on the next tap */
  var tok = String(b.tok || ""); if (!/^[A-Za-z0-9]{40}$/.test(tok)) return null;
  var id = CacheService.getScriptCache().get("bx_tok_" + tok); if (!id) return null;
  var p = bxRows_("BX_People").filter(function (x) { return String(x.id) === id; })[0];
  if (!p || String(p.active).toUpperCase() !== "Y") { CacheService.getScriptCache().remove("bx_tok_" + tok); return null; }
  return p;
}
function bxSites_(id) {
  var r = bxRows_("BX_Book").filter(function (x) { return String(x.bxId) === String(id); })[0];
  if (!r) return [];
  try { return JSON.parse(r.json || "[]") || []; } catch (e) { return []; }
}
function bxBook_(b) {
  var p = bxWho_(b); if (!p) return { ok: false, err: "signed out", out: 1 };
  var fus = bxRows_("BX_Fu").filter(function (x) { return String(x.bxId) === String(p.id); }).slice(-400).reverse()
    .map(function (x) { return { fid: x.fid, at: x.at, client: x.client, brand: x.brand, status: x.status, remark: x.remark, next: x.next, fileName: x.fileName, hasFile: !!x.fileUrl }; });   /* his own file name, never its link */
  var adds = bxRows_("BX_Leads").filter(function (x) { return String(x.bxId) === String(p.id); }).slice(-200).reverse()
    .map(function (x) { return { lid: x.lid, at: x.at, client: x.client, city: x.city, area: x.area, stage: x.stage, dup: x.dup, status: x.status || "new", note: x.note }; });   /* BX3 */
  bxLog_(p.name, "open", "");
  return { ok: true, me: bxMe_(p), sites: bxSites_(p.id), fus: fus, adds: adds, v: BX_V };
}
function bxSave_(b) {
  var p = bxWho_(b); if (!p) return { ok: false, err: "signed out", out: 1 };
  var f = b.fu || {}, client = String(f.client || "").trim(), status = String(f.status || ""), remark = String(f.remark || "").trim().slice(0, 1000);
  var site = bxSites_(p.id).filter(function (s) { return String(s.client).trim().toLowerCase() === client.toLowerCase(); })[0];
  if (!site) { bxLog_(p.name, "save refused", "not his site: " + client); return { ok: false, err: "This site is not given to you." }; }
  if (BX_STATUS.indexOf(status) < 0) return { ok: false, err: "Pick Ongoing, Won, Lost or Not required." };
  if (!remark) return { ok: false, err: "Write a remark." };
  var next = String(f.next || "").slice(0, 10); if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) next = "";
  var fileName = "", fileUrl = "";
  if (b.file && b.file.b64) {
    var type = String(b.file.type || ""), ext = BX_FILE_TYPES[type];
    if (!ext) return { ok: false, err: "Attach a PDF or a photo (JPG / PNG)." };
    var bytes = Utilities.base64Decode(String(b.file.b64));
    if (bytes.length > BX_FILE_MAX) return { ok: false, err: "The file is over 6 MB." };
    fileName = (site.brand || p.brand) + "_" + client.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40) + "_" + Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyyMMdd_HHmm") + "." + ext;
    var file = bxFolder_().createFile(Utilities.newBlob(bytes, type, fileName));
    file.setDescription("Brand Followup - " + p.name + " (" + p.company + ") - " + client);
    fileUrl = file.getUrl();   /* private: the owner's account opens it */
  }
  var row = { fid: "BF-" + Date.now() + "-" + bxRand_(5), at: new Date().toISOString(), bxId: String(p.id), bxName: String(p.name),
    client: site.client, brand: String(site.brand || p.brand || ""), status: status, remark: remark, next: next, fileName: fileName, fileUrl: fileUrl };
  bxWrite_("BX_Fu", 0, row);
  bxLog_(p.name, "follow-up", client + " - " + status);
  return { ok: true, fu: { fid: row.fid, at: row.at, client: row.client, brand: row.brand, status: status, remark: remark, next: next, fileName: fileName, hasFile: !!fileUrl } };
}

/* ---------- BX3: a site the brand executive adds himself ----------
   Checked at once against (1) his own sites, (2) Energy World's whole book - by fingerprint of the mobile and of the
   name, sent by the CRM; never the book itself - and (3) what any brand executive has already sent. A duplicate is
   said to him in plain words; he may still send it ("confirm"), and the owner links it to the client already there. */
function bxFp_(kind, v) {   /* the same fingerprint the CRM makes: first 16 hex of SHA-256("ew|" + kind + "|" + value) */
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "ew|" + kind + "|" + v, Utilities.Charset.UTF_8);
  return raw.map(function (b) { b = (b + 256) % 256; return (b < 16 ? "0" : "") + b.toString(16); }).join("").slice(0, 16);
}
function bxNameKey_(v) { return String(v == null ? "" : v).toLowerCase().replace(/^(mr|mrs|ms|dr|shri|smt|er|ar)\.?\s+/, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function bxDupIx_() {
  var r = bxRows_("BX_Dup")[0]; if (!r) return { m: {}, n: {} };
  try { var j = JSON.parse(r.json || "{}") || {}; return { m: j.m || {}, n: j.n || {} }; } catch (e) { return { m: {}, n: {} }; }
}
function bxAddSite_(b) {
  var p = bxWho_(b); if (!p) return { ok: false, err: "signed out", out: 1 };
  var s = b.site || {}, client = String(s.client || "").replace(/\s+/g, " ").trim().slice(0, 120), mob = bxMob_(s.mobile);
  if (client.length < 3) return { ok: false, err: "Write the client's name." };
  if (mob.length !== 10) return { ok: false, err: "The client's 10-digit mobile." };
  var city = String(s.city || "").trim().slice(0, 40);
  if (!city) return { ok: false, err: "Pick the district." };
  var key = bxNameKey_(client), dup = "", what = "";
  /* 1. already his */
  if (bxSites_(p.id).some(function (x) { return bxNameKey_(x.client) === key; })) { dup = "yours"; what = "This site is already in your list."; }
  /* 2. with Energy World */
  if (!dup) {
    var ix = bxDupIx_(), fm = bxFp_("m", mob), fn = bxFp_("n", key);
    if (ix.m[fm]) { dup = "ew"; what = "This mobile is already with Energy World (" + (ix.m[fm] === "CL" ? "a client" : "a lead") + ")."; }
    else if (ix.n[fn]) { dup = "ew"; what = "A client of this name is already with Energy World."; }
  }
  /* 3. already sent by a brand executive */
  if (!dup) {
    var prev = bxRows_("BX_Leads").filter(function (x) { return bxMob_(x.mobile) === mob || bxNameKey_(x.client) === key; })[0];
    if (prev) { dup = "sent"; what = String(prev.bxId) === String(p.id) ? "You sent this site on " + String(prev.at).slice(0, 10) + "." : "Another brand executive has already sent this site."; }
  }
  if (dup === "yours") return { ok: false, dup: dup, err: what };
  if (dup && !b.confirm) return { ok: false, dup: dup, ask: 1, err: what };
  var row = { lid: "BL-" + Date.now() + "-" + bxRand_(5), at: new Date().toISOString(), bxId: String(p.id), bxName: String(p.name), brand: String(p.brand || ""),
    client: client, mobile: mob, city: city, area: String(s.area || "").trim().slice(0, 60), address: String(s.address || "").trim().slice(0, 200),
    type: String(s.type || "").slice(0, 30), stage: String(s.stage || "").slice(0, 40), architect: String(s.architect || "").trim().slice(0, 80),
    plumber: String(s.plumber || "").trim().slice(0, 80), remark: String(s.remark || "").trim().slice(0, 500), dup: dup, dupWhat: what, status: "new", note: "", decidedAt: "" };
  bxWrite_("BX_Leads", 0, row);
  bxLog_(p.name, "site added", client + (dup ? " (" + dup + ")" : ""));
  return { ok: true, add: { lid: row.lid, at: row.at, client: client, city: city, area: row.area, stage: row.stage, dup: dup, status: "new", note: "" }, dup: dup, msg: what };
}

/* ---------- the owner, through his CRM sign-in ---------- */
function bxOwner_(b) {
  var user = String(b.crmUser || ""), pin = String(b.crmPin || ""), tok = String(b.crmTok || "");
  if (!user || (!pin && !tok)) return false;
  var key = "bx_own_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, user + "|" + pin + "|" + tok));
  var cache = CacheService.getScriptCache();
  if (cache.get(key) === "1") return true;
  var url = PropertiesService.getScriptProperties().getProperty("BX_CRM_URL") || BX_CRM_URL;
  var res = UrlFetchApp.fetch(url, { method: "post", contentType: "text/plain;charset=utf-8", muteHttpExceptions: true, followRedirects: true,
    payload: JSON.stringify({ action: "teamAuth", user: user, pin: pin, tok: tok, app: "Companion " + BX_V }) });
  var r = {}; try { r = JSON.parse(res.getContentText() || "{}"); } catch (e) { r = {}; }
  var ok = !!(r && r.ok && /admin/i.test(String((r.user && r.user.role) || r.role || "")));
  if (ok) cache.put(key, "1", 600);
  return ok;
}
function bxAdmin_(b) {
  if (!bxOwner_(b)) { bxLog_(b.crmUser, "admin refused", String(b.op || "")); return { ok: false, err: "owner sign-in not accepted" }; }
  var op = String(b.op || "");
  if (op === "sync") {
    var ppl = Array.isArray(b.people) ? b.people : [], have = {};
    bxRows_("BX_People").forEach(function (x) { have[String(x.id)] = x; });
    var seen = {}, now = new Date().toISOString();
    ppl.forEach(function (x) {
      var id = String(x.id || ""); if (!id) return; seen[id] = 1;
      var cur = have[id] || {};
      bxWrite_("BX_People", cur._r || 0, { id: id, name: String(x.name || ""), mobile: bxMob_(x.mobile), brand: String(x.brand || ""), company: String(x.company || ""),
        city: String(x.city || ""), active: String(x.active || "N").toUpperCase() === "Y" ? "Y" : "N", pinHash: cur.pinHash || "", salt: cur.salt || "", updatedAt: now });
    });
    Object.keys(have).forEach(function (id) { if (!seen[id] && String(have[id].active).toUpperCase() === "Y") { var c = have[id]; c.active = "N"; c.updatedAt = now; bxWrite_("BX_People", c._r, c); } });   /* not sent = not active */
    var sh = bxSh_("BX_Book"), books = Array.isArray(b.books) ? b.books : [];
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, BX_TABS.BX_Book.length).clearContent();
    if (books.length) sh.getRange(2, 1, books.length, 3).setValues(books.map(function (x) { return [String(x.bxId || ""), JSON.stringify(x.sites || []).slice(0, 49000), now]; }));
    if (b.dup && typeof b.dup === "object") {   /* BX3 - fingerprints of the book, replaced whole */
      var dsh = bxSh_("BX_Dup"); if (dsh.getLastRow() > 1) dsh.getRange(2, 1, dsh.getLastRow() - 1, 2).clearContent();
      dsh.getRange(2, 1, 1, 2).setValues([[JSON.stringify({ m: b.dup.m || {}, n: b.dup.n || {} }).slice(0, 49500), now]]);
    }
    bxLog_(b.crmUser, "sync", ppl.length + " people, " + books.length + " books");
    return { ok: true, people: ppl.length, books: books.length };
  }
  if (op === "pin") {
    var pin = String(b.pin || "").trim();
    if (!/^\d{4,6}$/.test(pin)) return { ok: false, err: "4 to 6 digits" };
    var p = bxRows_("BX_People").filter(function (x) { return String(x.id) === String(b.id || ""); })[0];
    if (!p) return { ok: false, err: "send him to the brand app first" };
    p.salt = bxRand_(12); p.pinHash = bxHash_(pin, p.salt); p.updatedAt = new Date().toISOString();
    bxWrite_("BX_People", p._r, p);
    bxLog_(b.crmUser, "pin set", p.name);
    return { ok: true };
  }
  if (op === "pull") {
    var since = String(b.since || "");
    var rows = bxRows_("BX_Fu").filter(function (x) { return String(x.at || "") > since; }).slice(0, 500).map(function (x) {
      return { fid: x.fid, at: x.at, bxId: x.bxId, bxName: x.bxName, client: x.client, brand: x.brand, status: x.status, remark: x.remark, next: x.next,
        file: x.fileUrl ? { name: x.fileName, url: x.fileUrl } : null };
    });
    return { ok: true, rows: rows };
  }
  if (op === "all") {   /* BX2 - the owner's own view in the Brand Followup app: every man, his sites, every follow-up */
    var people = bxRows_("BX_People").map(function (x) { return { id: String(x.id), name: x.name, mobile: bxMob_(x.mobile), brand: x.brand, company: x.company, city: x.city, active: x.active, hasPin: !!x.pinHash }; });
    var books = bxRows_("BX_Book").filter(function (x) { return x.bxId; }).map(function (x) { var st = []; try { st = JSON.parse(x.json || "[]") || []; } catch (e) { st = []; } return { bxId: String(x.bxId), sites: st }; });
    var fus = bxRows_("BX_Fu").slice(-2000).reverse().map(function (x) {
      return { fid: x.fid, at: x.at, bxId: String(x.bxId), bxName: x.bxName, client: x.client, brand: x.brand, status: x.status, remark: x.remark, next: x.next, file: x.fileUrl ? { name: x.fileName, url: x.fileUrl } : null };
    });
    bxLog_(b.crmUser, "admin view", people.length + " people");
    return { ok: true, people: people, books: books, fus: fus };
  }
  if (op === "leads") {   /* BX3 - every site the brand executives added, newest last */
    return { ok: true, rows: bxRows_("BX_Leads").map(function (x) { var o = {}; BX_TABS.BX_Leads.forEach(function (k) { o[k] = x[k]; }); o.mobile = bxMob_(x.mobile); return o; }) };
  }
  if (op === "leadset") {   /* BX3 - the owner's decision, shown to the brand executive in his app */
    var st = String(b.status || "");
    if (["accepted", "linked", "rejected", "new"].indexOf(st) < 0) return { ok: false, err: "bad status" };
    var L = bxRows_("BX_Leads").filter(function (x) { return String(x.lid) === String(b.lid || ""); })[0];
    if (!L) return { ok: false, err: "no such site" };
    L.status = st; L.note = String(b.note || "").slice(0, 200); L.decidedAt = new Date().toISOString();
    bxWrite_("BX_Leads", L._r, L);
    bxLog_(b.crmUser, "site " + st, L.client);
    return { ok: true };
  }
  return { ok: false, err: "unknown op" };
}
