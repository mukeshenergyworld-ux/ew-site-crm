/* CRM 6.9.1051 - "arange them catagory / brand wise". Lifts the REAL stkDeadGroups and stkDeadTable. */
var H = require("./harness.js");
var L = [
  { code: "LW3717", desc: "Console Washbasin", brand: "TOTO", cat: "Basin", onhand: 2, rate: 317800, value: 635600, last: "" },
  { code: "SSNRV42", desc: "SS NRV 42 Flap", brand: "SANITAAR", cat: "Valve", onhand: 15, rate: 20699, value: 310485, last: "" },
  { code: "5751100100", desc: "US PIPE 110", brand: "Huliot ULTRA SILENT", cat: "Pipe", onhand: 187, rate: 1417, value: 264979, last: "" },
  { code: "TLP02304B", desc: "Wash Basin Mixture", brand: "TOTO", cat: "Faucet", onhand: 1, rate: 204200, value: 204200, last: "" },
  { code: "X1", desc: "Loose seal", brand: "", cat: "", onhand: 1, rate: 100, value: 100, last: "" }];
var ctx = { esc: function (s) { return String(s == null ? "" : s); }, money: function (v) { return "Rs" + v; }, plural: function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); },
  driveImg: function (p) { return p; }, stkQ: function (n) { return String(n); }, deadBrandPill: function (b) { return '<i>' + b + '</i>'; }, deadAgePill: function () { return ""; } };
var F = H.lift("team", ["stkDeadGroups", "stkDeadTable"], ctx);
var B = F.stkDeadGroups(L, "brand");
H.eq("brand groups, biggest money first", B.map(function (g) { return g.name; }).join("|"), "TOTO|SANITAAR|Huliot ULTRA SILENT|No brand");
H.eq("TOTO carries both its lines, total 8,39,800", B[0].value, 839800);
H.eq("inside TOTO the costliest first", B[0].rows.map(function (x) { return x.code; }).join(","), "LW3717,TLP02304B");
var C = F.stkDeadGroups(L, "cat");
H.eq("category groups", C.map(function (g) { return g.name; }).join("|"), "Basin|Valve|Pipe|Faucet|No category");
H.eq("one list - costliest first", F.stkDeadGroups(L, "none")[0].rows[0].code, "LW3717");
var h = F.stkDeadTable(L, { pmap: {} }, "brand");
H.ok("brand view: a header per brand with count and share", /<i>TOTO<\/i><span[^>]*>2 products/.test(h) && /Rs839800/.test(h));
H.ok("brand view: the column shows the category", /CATEGORY/.test(h) && />Basin</.test(h));
H.ok("numbering runs on across groups", /font-size:12px">5<\/td>/.test(h));
H.ok("category view keeps the brand column", /BRAND/.test(F.stkDeadTable(L, { pmap: {} }, "cat")));
H.done();
