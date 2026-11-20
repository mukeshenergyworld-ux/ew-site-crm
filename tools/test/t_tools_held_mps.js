/* 6.9.1039-1040 / Challan 1.164.0 / Visit 1.23.0 - tools with a partner shown where he is searched; Modern Plumbing owes no receipt */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var A = [{ action: "tool:held", createdAt: "2026-11-18T05:00:00Z", detail: JSON.stringify({ tools: [
  { code: "EWT-001", name: "Pipe punching machine", hName: "Ramesh Plumber", hRef: "AS-7", site: "Green Valley Villa", since: "2026-11-10T00:00:00Z", cond: "OK" },
  { code: "EWT-002", name: "Welding machine", hName: "Ramesh Plumber", hRef: "AS-7", site: "", since: "2026-11-12T00:00:00Z", cond: "Damaged" },
  { code: "EWT-003", name: "Drill", hName: "Sunil", hRef: "", site: "", since: "", cond: "OK" }] }) },
  { action: "tool:held", createdAt: "2026-11-01T05:00:00Z", detail: JSON.stringify({ tools: [] }) }];
var ctx = { S: { data: { audit: A }, user: "Vivek" }, dkey: function (s) { return String(s || "").trim().toLowerCase(); }, esc: function (s) { return String(s); },
  localStorage: { getItem: function () { return null; } }, roleIs: function () { return false; }, CO_GAS: "", APP_VERSION: "t", assocLive: function () { return []; }, money: function (n) { return "Rs " + n; } };
var F = H.lift("team", ["tkTok", "tkSnap", "tkHeldIdx", "tkHeldBy", "tkHeldTag", "tkHeldCard", "tkPull", "tkHeldPub", "tkCutsFor"], ctx, ["_tkLive", "_tkAt", "_tkBusy", "_tkIdx", "_tkIdxK"]);
H.eq("the newest copy is read: Ramesh (by his id) has two tools", F.tkHeldBy({ id: "AS-7", name: "Ramesh Plumber" }).length, 2);
H.eq("a partner matched by name when no id was kept", F.tkHeldBy({ id: "AS-9", name: "sunil" }).length, 1);
H.eq("the tag in a search or a picker", F.tkHeldTag({ id: "AS-7", name: "Ramesh Plumber" }), "2 tools with him");
H.eq("nobody holding nothing says nothing", F.tkHeldTag({ id: "AS-1", name: "Nobody" }), "");
H.ok("his card lists each tool, the site and a damaged one", /EWT-001/.test(F.tkHeldCard({ id: "AS-7", name: "Ramesh Plumber" })) && /Green Valley Villa/.test(F.tkHeldCard({ id: "AS-7", name: "Ramesh Plumber" })) && /Damaged/.test(F.tkHeldCard({ id: "AS-7", name: "Ramesh Plumber" })));
var S = H.read("team");
H.ok("shown in the top search, every partner box, his form and his page", /tkHeldTag\(a\)\]\.filter\(Boolean\)/.test(S) && /var tg = a \? tkHeldTag\(a\)/.test(S) && /\(a\.id \? tkHeldCard\(a\) : ''\)/.test(S) && /\(isX \? '' : tkHeldCard\(a\)\)/.test(S));
var M = H.lift("team", ["rcptExempt", "rcptNone", "chNoPaper"], { chProofAny: function () { return { has: false }; } });
H.ok("CRM: Modern Plumbing Solutions owes no signed paper", !M.chNoPaper({ customerName: "Modern Plumbing Solutions", status: "Received" }) && M.chNoPaper({ customerName: "Vinay Gupta", status: "Received" }));
var C = H.lift("challan", ["rcptNone", "receiptOwed"], { canAttachYet: function () { return true; }, receiptIn: function () { return false; }, chStatus: function (c) { return c.status; } });
H.ok("Challan: Modern Plumbing Solutions is on no receipt list; anyone else still is", !C.receiptOwed({ customerName: "MODERN PLUMBING SOLUTIONS", status: "Dispatched" }) && C.receiptOwed({ customerName: "Vinay Gupta", status: "Dispatched" }));
var CH = H.read("challan");
H.ok("Challan: Mark received for our own godown, without a photo", /data-act="ch-recd-own"/.test(CH) && /if \(act === "ch-recd-own"\)/.test(CH) && /markReceived\(_ro\)/.test(CH));
var V = fs.readFileSync(path.join(__dirname, "..", "..", "visit", "index.src.html"), "utf8");
H.ok("Visit: the plumber / architect lists say how many tools he has", /function tkHeldN\(n\)/.test(V) && /tool" \+ \(k === 1 \? "" : "s"\) \+ " with him"/.test(V));
["team", "challan", "collect", "visit", "service", "saathi", "brand", "tooltrack", "complaint", "console", "social"].forEach(function (a) {
  var m = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", a, "manifest.webmanifest"), "utf8"));
  H.ok(a + ": its own icon, any + maskable", m.icons.length === 3 && m.icons[2].purpose === "maskable" && fs.existsSync(path.join(__dirname, "..", "..", a, "icon-maskable-512.png")));
});
/* 20 Nov 2026 - the apps page finds the apps itself (a folder with a manifest is an app); every app folder has its manifest and its tile wording */
H.ok("Apps page: every app folder carries a manifest, and the page knows its tile", ["team", "challan", "collect", "visit", "service", "saathi", "brand", "tooltrack", "complaint", "console", "social"].every(function (a) { var hub = fs.readFileSync(path.join(__dirname, "..", "..", "apps", "index.html"), "utf8"); return fs.existsSync(path.join(__dirname, "..", "..", a, "manifest.webmanifest")) && new RegExp("\\b" + a + ': \\["').test(hub); }));
["challan", "service", "collect", "visit"].forEach(function (a) {
  var t = fs.readFileSync(path.join(__dirname, "..", "..", a, "index.src.html"), "utf8");
  H.ok(a + ": Mark your attendance, saved only with the location taken now", />Mark your attendance<\/button>/.test(t) && /enableHighAccuracy: true, timeout: 15000, maximumAge: 0/.test(t) && /if \(!attGeoOk\(\)\) return;/.test(t) && /id="att_geo"/.test(t));
  H.ok(a + ": an update is offered only when it is NEWER", /!ewNewer\(v, APP_VERSION\)/.test(t) || a === "visit");
});
H.ok("CRM: Mark your attendance, with the location now", />Mark your attendance<\/button>/.test(S) && /if \(!attGeoOk\(\)\) return;/.test(S));
var NW = H.lift("challan", ["ewNewer"], {});
H.ok("1.159.1 is not newer than 1.163.0; 1.164.0 is; 1.163.10 is", !NW.ewNewer("1.159.1", "1.163.0") && NW.ewNewer("1.164.0", "1.163.0") && NW.ewNewer("1.163.10", "1.163.9"));
H.done();
