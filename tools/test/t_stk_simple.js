/* CRM 6.9.1067 - his words: "Stock in hand section is very confusing ... i want to check current TOTO stock in hand its not
   showing any option, want proper display in table format with product pics". Lifts the REAL stkSimpleRows and stkSimpleFilter. */
var H = require("./harness.js");
var pos = {
  T1: { onhand: 4, held: 1, free: 3, counted: true, desc: "" }, T2: { onhand: 0, held: 0, free: 0, counted: true }, T3: { onhand: -2, held: 0, free: -2, counted: true },
  H1: { onhand: 10, held: 0, free: 10, counted: false }, X0: { onhand: 0, held: 0, free: 0 }
};
var pmap = {
  T1: { code: "T1", desc: "TOTO Wall hung WC CW812", brand: "TOTO", cat: "WC", pic: "https://drive.google.com/x1", unit: "Pcs" },
  T2: { code: "T2", desc: "TOTO Basin LW1505", brand: "TOTO", cat: "Basin" }, T3: { code: "T3", desc: "TOTO Seat cover", brand: "Toto", cat: "WC" },
  H1: { code: "H1", desc: "HT PRO pipe 110", brand: "Huliot HT PRO", cat: "Pipes" }
};
var ctx = {
  S: {}, stkCtx: function () { return { pos: pos, pmap: pmap }; }, rateByCode: function () { return { T1: 25000, H1: 300 }; },
  prodByCode: function () { return null; }, realBrand: function (p) { return p.brand; },
  brandGroup: function (b) { return /toto/i.test(b) ? "TOTO" : /huliot/i.test(b) ? "HULIOT" : b; }
};
var F = H.lift("team", ["stkSimpleRows", "stkSimpleFilter"], ctx, []);
var all = F.stkSimpleRows();
H.eq("a product with nothing in hand and nothing on challans is left out", all.some(function (x) { return x.code === "X0"; }), false);
H.eq("every spelling of TOTO is one brand", all.filter(function (x) { return x.brand === "TOTO"; }).length, 3);
ctx.S.stkBr = "TOTO";
var L = F.stkSimpleFilter(all);
H.eq("TOTO, in hand only: the one with stock", L.map(function (x) { return x.code; }).join(), "T1");
H.eq("...with its picture, rate and value", !!L[0].pic && L[0].value === 100000 && L[0].free === 3, true);
ctx.S.stkZero = true;
H.eq("show zero / minus too: all three TOTO lines", F.stkSimpleFilter(all).length, 3);
ctx.S.stkCat = "WC";
H.eq("category WC inside TOTO", F.stkSimpleFilter(all).map(function (x) { return x.code; }).sort().join(), "T1,T3");
ctx.S = { stkQ: "ht pro 110" };
H.eq("search by words in any order across brands", F.stkSimpleFilter(all).map(function (x) { return x.code; }).join(), "H1");
var src = H.read("team/app.src.js").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("Stock in hand is the first view; the old table is the Ordering sheet", /if \(!S\.stkView\) return h \+ stkSimpleHtml\(\)/.test(src) && /chip\("sheet", "Ordering sheet"/.test(src));
H.ok("a picture on every row", /driveImg\(x\.pic, 120\)/.test(src.slice(src.indexOf("function stkSimpleTable"), src.indexOf("function stkSimpleSum"))));
H.done();
