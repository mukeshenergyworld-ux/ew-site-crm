/* CRM 6.9.1055 - "Quote in excel will be brand wise sheet and brand summary of all in one sheet, if viega only comparison
   enter show of that only, that of each quoted brand". Lifts the REAL quoteXlsxBook, quoteXlsxRows, quoteBrandGroups, xlSheetName. */
var H = require("./harness.js");
var items = [
  { code: "P22", desc: "SS PIPE 22MM", brand: "SANITAAR", unit: "Mtr", qty: 60, price: 1200, bd: 46 },
  { code: "E22", desc: "SS ELBOW 22", brand: "SANITAAR", unit: "Pc", qty: 40, price: 400, bd: 46 },
  { code: "A1", desc: "Clamp", brand: "Accessory", unit: "Nos", qty: 100, price: 50, disc: 0 },
  { code: "U110", desc: "US PIPE 110", brand: "Huliot ULTRA SILENT", unit: "Pipe", qty: 20, price: 1417, bd: 50 }];
var Q = { quoteNo: "QT177", client: "Swasthik Ar", createdAt: "2026-11-25", items: JSON.stringify(items) };
var G = H.lift("team", ["quoteXlsxBook", "quoteXlsxRows", "quoteBrandGroups", "xlSheetName", "qLineDisc", "qLineNet", "qItems"],
  { XL: { BOLD: 7, HEAD: 1, INPUT: 9, BAND: 8 }, qNo: function (q) { return q.quoteNo; }, fullDate: function (s) { return s; }, descLines: function (d) { return { title: d }; } });
var B = G.quoteXlsxBook(Q);
H.eq("Summary first, then one sheet per quoted brand", B.map(function (s) { return s.name; }).join("|"), "Summary|SANITAAR|Accessory|Huliot ULTRA SILENT");
var san = B[1].rows;
H.eq("the SANITAAR sheet carries only SANITAAR lines", san.filter(function (r) { return typeof r[0] === "number"; }).length, 2);
H.ok("each brand sheet names its competitor once (yellow N3)", san[2][13].s === 9);
H.eq("SANITAAR net on its sheet", san.meta.ours, 47520);
var sumRow = B[0].rows[4];
H.eq("summary row reads the brand sheet's total", sumRow[2].f, "'SANITAAR'!K" + san.meta.tr);
H.ok("a brand not compared says so", /not compared/.test(sumRow[9].f) && sumRow[9].v === "not compared");
H.ok("a part comparison is named and set against our amount on the same lines", /part - /.test(sumRow[9].f) && sumRow[6].f === "IF(F5=0,\"\",'SANITAAR'!K" + san.meta.cmp + ")");
H.ok("ours on compared lines = SUMPRODUCT over lines with a competitor MRP", /SUMPRODUCT\(\(O5:O6<>""\)\*K5:K6\)/.test(san[san.meta.cmp - 1][10].f));
var all = B[0].rows.filter(function (r) { return r[0] && r[0].v === "All brands"; })[0];
H.eq("all brands total", all[2].v, 66700);
H.eq("a sheet name loses characters Excel refuses", G.xlSheetName("A/B: [x]?", {}), "A B x");
H.done();
