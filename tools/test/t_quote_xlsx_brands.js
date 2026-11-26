/* CRM 6.9.1055 - "Quote in excel will be brand wise sheet and brand summary of all in one sheet, if viega only comparison
   enter show of that only, that of each quoted brand". Lifts the REAL quoteXlsxBook, quoteXlsxRows, quoteBrandGroups, xlSheetName. */
var H = require("./harness.js");
var items = [
  { code: "P22", desc: "SS PIPE 22MM", brand: "SANITAAR", unit: "Mtr", qty: 60, price: 1200, bd: 46 },
  { code: "E22", desc: "SS ELBOW 22", brand: "SANITAAR", unit: "Pc", qty: 40, price: 400, bd: 46 },
  { code: "A1", desc: "Clamp", brand: "Accessory", unit: "Nos", qty: 100, price: 50, disc: 0 },
  { code: "U110", desc: "US PIPE 110", brand: "Huliot ULTRA SILENT", unit: "Pipe", qty: 20, price: 1417, bd: 50 }];
var Q = { quoteNo: "QT177", client: "Swasthik Ar", createdAt: "2026-11-25", items: JSON.stringify(items) };
var G = H.lift("team", ["quoteXlsxBook", "quoteXlsxRows", "quoteBrandGroups", "xlSheetName", "qLineDisc", "qLineNet", "qItems", "xlCol"],
  { XL: { BOLD: 7, HEAD: 1, INPUT: 9, BAND: 8, MONEY: 18, MONEYB: 19 }, qNo: function (q) { return q.quoteNo; }, fullDate: function (s) { return s; }, descLines: function (d) { return { title: d }; } });
var B = G.quoteXlsxBook(Q);
H.eq("Summary first, then one sheet per quoted brand", B.map(function (s) { return s.name; }).join("|"), "Summary|SANITAAR|Accessory|Huliot ULTRA SILENT");
var san = B[1].rows;
H.eq("the SANITAAR sheet carries only SANITAAR lines", san.filter(function (r) { return typeof r[0] === "number"; }).length, 2);
H.ok("each brand sheet names its competitor once (yellow box, row 3)", san[2][8].s === 9 && san.meta.name === "I3");
H.eq("SANITAAR net on its sheet", san.meta.ours, 47520);
var sumRow = B[0].rows[4];
H.eq("summary row reads the brand sheet's total", sumRow[2].f, "'SANITAAR'!G" + san.meta.tr);
H.ok("a brand not compared says so (worked out by Excel, no stored value)", /not compared/.test(sumRow[9].f) && sumRow[9].v === "");
H.ok("a part comparison is named and set against our amount on the same lines", /part - /.test(sumRow[9].f) && sumRow[6].f === "IF(F5=0,\"\",'SANITAAR'!G" + san.meta.cmp + ")");
H.ok("ours on compared lines = SUMPRODUCT over lines with a competitor MRP", /SUMPRODUCT\(\(I5:I6<>""\)\*G5:G6\)/.test(san[san.meta.cmp - 1][6].f));
var all = B[0].rows.filter(function (r) { return r[0] && r[0].v === "All brands"; })[0];
H.eq("all brands total", all[2].v, 66700);
H.eq("a sheet name loses characters Excel refuses", G.xlSheetName("A/B: [x]?", {}), "A B x");
var Bc = B[0].chart;
H.ok("the summary carries a chart: ours whole, ours on compared lines, his", Bc && Bc.series.length === 3 && Bc.series[2].ref === "$H$5:$H$7" && Bc.cats === "$A$5:$A$7");
var Q2 = { quoteNo: "Q2", items: JSON.stringify([{ code: "X", desc: "Basin", brand: "TOTO", qty: 1, price: 100, rq: { "Master Bath": 1 } }]) };
H.eq("Room appears only when the quote has rooms", G.quoteXlsxRows(Q2)[3][1].v, "Room");
H.done();
