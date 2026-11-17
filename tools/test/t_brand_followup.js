/* 6.9.1030 / Visit 1.21.0 / Brand Followup 1.0.0 - the brand follow-up system. */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var R = function (f) { return fs.readFileSync(path.join(__dirname, "..", "..", f), "utf8"); };
var T = "2026-11-17T06:00:00Z";
var audit = [
  { action: "bx:exec", createdAt: T, detail: JSON.stringify({ id: "BX1", name: "Rahul", brand: "HULIOT", company: "Huliot India", mobile: "9812345678", status: "active" }) },
  { action: "bx:exec", createdAt: T, detail: JSON.stringify({ id: "BX2", name: "Old Man", brand: "TOTO", status: "removed" }) },
  { action: "bx:assign", createdAt: T, detail: JSON.stringify({ bxId: "BX1", client: "Nitin Jain", brand: "HULIOT", on: 1 }) },
  { action: "bx:assign", createdAt: T, detail: JSON.stringify({ bxId: "BX1", client: "Amrik", brand: "HULIOT", on: 1 }) },
  { action: "bx:assign", createdAt: "2026-11-17T07:00:00Z", detail: JSON.stringify({ bxId: "BX1", client: "Amrik", brand: "HULIOT", on: 0 }) },
  { action: "bx:fu", createdAt: T, detail: JSON.stringify({ fid: "F1", bxId: "BX1", bxName: "Rahul", client: "Nitin Jain", brand: "HULIOT", status: "Ongoing", remark: "sample fitted", next: "2026-11-20", at: "2026-11-17T05:00:00Z" }) },
  { action: "bx:fu", createdAt: T, detail: JSON.stringify({ fid: "F1", bxId: "BX1", client: "Nitin Jain", status: "Won", at: "2026-11-17T05:00:00Z" }) }];
var ctx = { S: { data: { audit: audit } }, dkey: function (x) { return String(x || "").trim().toLowerCase(); }, esc: function (x) { return String(x); } };
["team/app.src.js", "visit/index.src.html"].forEach(function (f) {
  var app = f.indexOf("team") === 0 ? "team" : "visit";
  var F = H.lift(app, ["bxIndex", "bxExecs", "bxAssigned", "bxLastFu", "bxOnClient", "bxChip"], ctx, ["_bxIx", "_bxN"]);
  H.eq(app + ": removed men are left out unless asked", F.bxExecs().map(function (e) { return e.name; }).join(","), "Rahul");
  H.eq(app + ": an assignment taken off is off (newest row wins)", F.bxAssigned("BX1").map(function (x) { return x.client; }).join(","), "Nitin Jain");
  var on = F.bxOnClient("nitin jain", "HULIOT");
  H.ok(app + ": who is on the site, with his first follow-up (a repeated id is one)", on.length === 1 && on[0].last.status === "Ongoing");
  H.ok(app + ": the chip names him, his company and his last word", /Rahul/.test(F.bxChip(on[0])) && /Huliot India/.test(F.bxChip(on[0])) && /Ongoing/.test(F.bxChip(on[0])));
});
/* the shared reader is the same code in both apps */
var blk = function (s) { var a = s.indexOf("BRAND EXECUTIVES - THE SHARED READER"), b = s.indexOf("END OF THE BRAND EXECUTIVE READER"); return s.slice(a, b); };
H.ok("the reader is byte for byte the same in the CRM and the Visit app", blk(R("team/app.src.js")) === blk(R("visit/index.src.html")) && blk(R("team/app.src.js")).length > 1000);
/* the lifted follow-up rule is the CRM's own */
["clientBrandState", "clientGroupState", "clientWonBrandsCalc", "qBrandMap"].forEach(function (n) {
  var g = function (s) { var i = s.indexOf("  function " + n + "("), d = 0, k = s.indexOf("{", i); for (; k < s.length; k++) { if (s[k] === "{") d++; else if (s[k] === "}") { d--; if (!d) break; } } return s.slice(i, k + 1); };
  H.ok("Visit's " + n + " is the CRM's, unchanged", g(R("team/app.src.js")) === g(R("visit/index.src.html")));
});
var v = R("visit/index.src.html");
H.ok("Visit: a Follow-up tab in the bottom bar and its view", /\["fu", "&#9989;", "Follow-up"\]/.test(v) && /t === "fu" \? viewFu\(\)/.test(v) && /act === "fu-b"/.test(v));
/* the CRM's book for the brand app carries no phone of a partner or a client, and no prices */
var c = R("team/app.src.js");
var bb = c.slice(c.indexOf("  function bxPartnerCard("), c.indexOf("  function bxCall("));
H.ok("CRM: a partner goes to the brand app as name, code, town - never a phone", /return \{ name: nm, code: String\(a\.code \|\| ""\), town:/.test(bb) && !/a\.mobile/.test(bb));
H.ok("CRM: the site book has no client mobile and no quote value", !/c\.mobile/.test(bb) && !/total/.test(bb));
H.ok("CRM: Brand executives is the owner's screen, in the Clients group", /"brief","attendance","brandexec"\]/.test(c) && /"brandfollow", "brandexec", "crlog"/.test(c) && /brandexec: viewBrandExecs/.test(c));
H.ok("CRM: a client or lead number wears his executive's ink", /OWN\[String\(c\.code\)\.trim\(\)\] = String\(c\.ownedBy \|\| c\.createdBy/.test(c) && /if \(\/\^\(CL\|LD\)\/\.test\(code\) && OWN\[code\]\)/.test(c));
/* the brand app's guards */
var b = R("brand/index.html");
H.ok("Brand app: watermark with his name, mobile and the time", /id="wm"/.test(b) && /S\.me\.name \+ " (\u00b7|\\u00b7) " \+ S\.me\.mobile/.test(b));
H.ok("Brand app: no copy, no select, no right-click, no drag, no print", /\["copy", "cut"\]/.test(b) && /"selectstart"/.test(b) && /"contextmenu"/.test(b) && /"dragstart"/.test(b) && /@media print\{body \*\{display:none!important\}/.test(b));
H.ok("Brand app: the screen blurs when he leaves it, signs out after 15 idle minutes", /body\.away #app/.test(b) && /visibilitychange/.test(b) && /IDLE_MS = 15 \* 60000/.test(b));
H.ok("Brand app: nothing to download or share for a brand executive (the one download is the admin's)", !/navigator\.share|\.xlsx|jspdf|window\.print\(/.test(b) && (b.match(/a\.download = /g) || []).length === 1 && b.indexOf("a.download = ") > b.indexOf("function admCsv("));
H.ok("Brand app: talks only to the Companion, never to the CRM's server", /AKfycbxXTOOJ/.test(b) && !/AKfycbzVkPH/.test(b));
H.ok("Brand app: the version is at the top", /Brand Followup v' \+ APP_VERSION/.test(b));
H.ok("CRM 6.9.1030: Saathi is sent the book every 2 hours and 15 s after any partner change", /Date\.now\(\) - Date\.parse\(d\) < 2 \* 3600000/.test(c) && /function saathiSyncSoon\(\)/.test(c) && /saathiSyncSoon\(\); \} catch \(e\) \{ \} return moved\.length;/.test(c) && /try \{ saathiSyncSoon\(\); \} catch \(e\) \{ \}   \/\* 6\.9\.1030 \*\//.test(c));
H.ok("CRM 6.9.1030: a return naming no challan reverses at most what the client's deliveries earned", /if \(!rCh\) rInc = Math\.max\(0, Math\.min\(rInc, clIncLeft\)\);/.test(c) && /clIncLeft \+= inc;/.test(c));
H.ok("Brand app 1.1.0: an admin sign-in with the CRM name and PIN, kept in memory only", /data-act="adm-show"/.test(b) && /op: op, crmUser: S\.adm\.user, crmPin: S\.adm\.pin/.test(b) && !/store\([^)]*adm/i.test(b));
H.ok("Brand app 1.1.0: the admin sees everyone, opens the quote, downloads; the guards let him be", /admCall\("all"\)/.test(b) && /target="_blank" rel="noopener">' \+ esc\(f\.file\.name/.test(b) && /function admCsv\(\)/.test(b) && /function isField\(t\) \{ return !!S\.adm \|\|/.test(b));
H.ok("Brand app 1.2.0: he can add a site; a duplicate is asked before it goes", /data-act="add-open"/.test(b) && /call\("bxAddSite", \{ site:/.test(b) && /Send anyway/.test(b));
H.ok("CRM 6.9.1031: brand-executive sites come in to link, add as lead or turn down", /function bxLeadsCard\(/.test(c) && /function bxLeadDecide\(/.test(c) && /function bxDupIx\(/.test(c) && /return bxDupIx\(\)\.catch/.test(c));
var sa = R("saathi/index.html");
H.ok("Saathi -3: the staff view of a partner refetches on refresh and on return", /function staffReload\(/.test(sa) && /if \(ST\.view\) \{ REFBUSY = true; staffReload\(false\)/.test(sa) && /visibilitychange/.test(sa));
H.done();
