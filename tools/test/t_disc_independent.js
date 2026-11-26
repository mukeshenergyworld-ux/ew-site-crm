/* CRM 6.9.1054 / core - "all discounts must be independent never to be interlinked", "drp is always from 32 % to 35% maximum",
   and the quote in Excel for comparing a competitor brand. Lifts the REAL discRowsFor, discCeil, discOverCeil, quoteXlsxRows. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var ROWS = [{ client: "Sachin Bansal", brand: "Heliroma", pct: 55 }, { client: "Unnat Hotel", brand: "Huliot HT PRO", pct: 51 }];
var ix = {}; ROWS.forEach(function (r) { (ix[dk(r.client) + "||" + dk(r.brand)] = ix[dk(r.client) + "||" + dk(r.brand)] || []).push(r); });
var ctx = { dkey: dk, dscIndex: function () { return ix; }, dupAliasMap: function () { return { byName: {}, aliasOf: {} }; }, dgKey: dk,
  dscFamIndex: function () { throw new Error("the family index must not be read"); }, discFam: function () { return "heliroma"; } };
var F = H.lift("team", ["discRowsFor", "discCeil", "discOverCeil"], ctx, ["DISC_CEIL"]);
H.eq("Heliroma reads its own row", F.discRowsFor("Sachin Bansal", "Heliroma").length, 1);
H.eq("DRP does NOT borrow Heliroma's 55%", F.discRowsFor("Sachin Bansal", "DRP").length, 0);
H.eq("Ultra Silent does NOT borrow HT PRO's 51%", F.discRowsFor("Unnat Hotel", "Huliot ULTRA SILENT").length, 0);
H.eq("DRP ceiling is 35", F.discCeil("DRP"), 35);
H.ok("DRP 36% is refused, 35% is fine", F.discOverCeil("DRP", 36) === 35 && !F.discOverCeil("DRP", 35));
H.ok("Heliroma has no ceiling", !F.discOverCeil("Heliroma", 55));
var Q = { quoteNo: "QT177", client: "Swasthik Ar", createdAt: "2026-11-25", items: JSON.stringify([
  { code: "SN1", desc: "Sink", brand: "SANITAAR", unit: "Nos", qty: 2, price: 1000, bd: 46 },
  { code: "OP1", desc: "Option", brand: "Accessory", unit: "Nos", qty: 1, price: 500, disc: 0, optional: 1 }]) };
var G = H.lift("team", ["quoteXlsxRows", "qLineDisc", "qLineNet", "qItems", "xlCol"], { XL: { BOLD: 7, HEAD: 1, INPUT: 9, BAND: 8, MONEY: 18, MONEYB: 19 },
  qNo: function (q) { return q.quoteNo; }, fullDate: function (s) { return s; }, descLines: function (d) { return { title: d }; } });
var R = G.quoteXlsxRows(Q);
var line = R[4], vv = function (c) { return c && typeof c === "object" ? c.v : c; };
/* 6.9.1056 layout: # | Product | Qty | MRP | Disc % | Net rate | Amount | Competitor product | His MRP | His disc % | His net rate | His amount | Difference */
H.eq("no product code, no brand, no unit column", R[3].map(vv).join("|"), "#|Product|Qty|MRP|Disc %|Net rate|Amount|Competitor product|His MRP|His disc %|His net rate|His amount|Difference (his - ours)");
H.eq("line 1: MRP, disc, net rate, amount as the PDF prices them", [vv(line[3]), line[4], vv(line[5]), vv(line[6])].join(","), "1000,46,540,1080");
H.ok("the unit rides after the product name", line[1] === "Sink (Nos)");
H.ok("yellow input boxes for the competitor", line[7].s === 9 && line[8].s === 9 && line[9].s === 9);
H.eq("his net rate is worked out by Excel", line[10].f, 'IF(I5="","",ROUND(I5*(1-N(J5)/100),0))');
H.eq("the difference is his minus ours", line[12].f, 'IF(L5="","",L5-G5)');
H.eq("an optional line is not in our amount", vv(R[5][6]), 0);
var tot = R.filter(function (r) { return r[0] && r[0].v === "Total (net, before GST)"; })[0];
H.ok("totals are SUM formulas over the lines", tot[6].f === "SUM(G5:G6)" && tot[6].v === 1080 && tot[11].f === "SUM(L5:L6)");
H.done();
