/* CRM 6.9.1057 / Visit 1.27.0 / Challan 1.167.0 - "add all": the competitor price book, locked figures, print ready, DRP 35% in the phone apps.
   Lifts the REAL cmpFromBook, cmpBook, cmpPrefill, quoteXlsxRows, xlSheet, and the apps' discCeil / qzCap. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var items = [
  { code: "P22", desc: "SS PIPE 22MM", brand: "SANITAAR", unit: "Mtr", qty: 60, price: 1200, bd: 46 },
  { code: "E22", desc: "SS ELBOW 22", brand: "SANITAAR", unit: "Pc", qty: 40, price: 400, bd: 46 },
  { code: "A1", desc: "Clamp", brand: "Accessory", unit: "Nos", qty: 100, price: 50, disc: 0 }];
var Q = { quoteNo: "QT177", client: "Swasthik Ar", items: JSON.stringify(items) };
var ctx = { S: { data: { audit: [] } }, dkey: dk, qNo: function (q) { return q.quoteNo; }, fullDate: function (s) { return s; }, descLines: function (d) { return { title: d }; },
  XL: { BOLD: 7, HEAD: 1, INPUT: 9, BAND: 8, MONEY: 18, MONEYB: 19, INPUTU: 36 } };
var F = H.lift("team", ["cmpFromBook", "cmpBook", "cmpPrefill", "quoteBrandGroups", "quoteXlsxRows", "qLineDisc", "qLineNet", "qItems", "xlCol", "xlSheet", "xlEsc"], ctx);
/* a filled workbook as read back: Viega on line 1 of SANITAAR */
var book = { Summary: { A1: "Energy World · Quotation QT177 · brand summary" },
  SANITAAR: { A1: "Energy World · Quotation QT177 · SANITAAR", A4: "#", B4: "Product", I4: "His MRP", J4: "His disc %", H4: "Competitor product", I3: "Viega",
    A5: 1, H5: "Viega Sanpress 22", I5: 1100, J5: 40, A6: 2 },
  Other: { A1: "Energy World · Quotation QT999 · SANITAAR" } };
var r = F.cmpFromBook(Q, book);
H.eq("only the sheets of THIS quote are read", r.sheets, 1);
H.eq("the priced line is matched back to our product by sheet and #", JSON.stringify(r.rows), JSON.stringify([{ comp: "Viega", ourBrand: "SANITAAR", code: "P22", desc: "SS PIPE 22MM", cprod: "Viega Sanpress 22", mrp: 1100, disc: 40 }]));
ctx.S.data.audit.push({ action: "cmp:import", actor: "Mukesh", createdAt: "2026-11-26T06:00:00Z", detail: JSON.stringify({ quote: "QT177", rows: r.rows }) });
ctx.S.data.audit.push({ action: "cmp:import", actor: "Mukesh", createdAt: "2026-11-20T06:00:00Z", detail: JSON.stringify({ quote: "QT100", rows: [{ comp: "Viega", ourBrand: "SANITAAR", code: "P22", mrp: 999, disc: 10 }] }) });
H.eq("the newest price wins", F.cmpBook()["viega|P22"].mrp, 1100);
var R = F.quoteXlsxRows(Q, JSON.parse(Q.items).slice(0, 2), "SANITAAR");
H.ok("next Excel: the competitor is named from the book", R[2][8].v === "Viega" && /price book/.test(R[2][9]));
H.ok("next Excel: his price for the same product is filled, still a yellow box", R[4][7].v === "Viega Sanpress 22" && R[4][8].v === 1100 && R[4][9].v === 40 && R[4][8].s === 36);
H.ok("a product he never priced stays empty", R[5][8].v === "");
H.ok("a brand with nothing on file is not filled", F.quoteXlsxRows(Q, [JSON.parse(Q.items)[2]], "Accessory")[2][8].v === "");
var x = F.xlSheet([[1]], [5], false, { protect: true, print: true });
H.ok("the sheet is locked (no password)", /<sheetProtection sheet="1"[^>]*\/>/.test(x) && !/password/.test(x));
H.ok("print: landscape, one page wide", /<pageSetUpPr fitToPage="1"\/>/.test(x) && /orientation="landscape" fitToWidth="1" fitToHeight="0"/.test(x));
H.ok("the element order Excel requires", x.indexOf("<sheetPr>") < x.indexOf("<sheetData>") && x.indexOf("</sheetData>") < x.indexOf("<sheetProtection") && x.indexOf("<sheetProtection") < x.indexOf("<pageMargins"));
var TS = H.read("team");
H.ok("style 36 is the unlocked yellow box", /<protection locked="0"\/><\/xf>' \+\s+'<\/cellXfs>'/.test(TS) && /cellXfs count="37"/.test(TS));
var toasts = [];
var V = H.lift("visit", ["discCeil", "qzCap"], { toast: function (m) { toasts.push(m); } }, ["DISC_CEIL"]);
H.eq("Visit: DRP 40 on a quote becomes 35", V.qzCap("DRP", 40), 35);
H.ok("...and he is told", /DRP is 35% at most/.test(toasts[0]));
H.eq("Visit: Heliroma 53 untouched", V.qzCap("Heliroma", 53), 53);
var C = H.lift("challan", ["discCeil"], {}, ["DISC_CEIL"]);
H.eq("Challan: DRP ceiling 35", C.discCeil("DRP"), 35);
H.ok("Challan: refuses above it when added to the hisab", /discCeil\(b\); return !hnon\[b\] && c && Number\(hpct\[b\]\) > c;/.test(H.read("challan")));
H.ok("CRM: refuses above it at finalise and in the preset", /_hCeil = Object\.keys\(hpct\)\.filter\(function \(b\) \{ return !hnon\[b\] && discOverCeil\(b, hpct\[b\]\)/.test(TS) && /if \(!no && discOverCeil\(b, v\)\)/.test(TS));
H.done();
