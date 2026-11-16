/* Visit & Quote 1.18.0 - a quote in three steps; the discount sits on the check.
   Lifts the real viewQz / qzDisc / qzReview / qzReviewTable / qzTot / qzProducts and paints each step. */
var H = require("./harness.js");
var z = { step: 1, client: "Sharma Ji", items: [], brandDiscs: {}, brand: "", gst: false, noTotal: false, pq: "", cq: "" };
var ctx = {
  S: { qz: z, data: { quotes: [] } }, GST: 0.18, PRODUCTS: [],
  esc: function (s) { return String(s == null ? "" : s); }, money: function (n) { return "Rs " + n; }, lower: function (s) { return String(s || "").toLowerCase(); },
  dkey: function (s) { return String(s || "").trim().toLowerCase(); }, alpha: function (a, b) { return a < b ? -1 : 1; },
  clientByName: function () { return { mobile: "", area: "" }; }, codeTag: function () { return ""; }, clientWho: function () { return ""; },
  histHtml: function () { return "<!--hist-->"; }, myClients: function () { return []; }, brandList: function () { return ["Geberit"]; },
  realBrand: function (p) { return p.brand; }, brandProducts: function () { return [{ code: "G1" }]; }, fimaPicWrap: function (c, h) { return h; },
  canQuoteDiscount: function () { return true; }, brandHist: function () { return {}; }, clientDiscount: function () { return 40; },
  brandTotals: function () { return { gross: 1000, net: 600 }; }, fd: function (s) { return s; }, qShow: function (n) { return String(n); },
  xpLimitHtml: function () { return ""; }, brandByCode: function () { return "Geberit"; }, totCard: function (t) { return "<!--tot " + t.net + "-->"; },
  lineDisc: function (i, zz) { return i.disc != null && i.disc !== "" ? Number(i.disc) : (Number(zz.brandDiscs[i.brand]) || 0); },
  viewQuotes: function () { return "quotes"; }, qzProdHits: function () { return ""; }
};
var F = H.lift("visit", ["viewQz", "qzClient", "qzHits", "qzProducts", "qzBrandsOf", "qzTot", "qzDisc", "qzReviewTable", "qzReview"], ctx);
var h1 = F.viewQz();
H.ok("step 1 says 1 of 3", /Step 1 of 3/.test(h1));
z.step = 2; z.items.push({ code: "G1", desc: "Cistern", price: 1000, qty: 1, brand: "Geberit" }); z.brandDiscs.Geberit = 40;
var h2 = F.viewQz();
H.ok("step 2 goes straight to the check", /data-k="3"[^>]*>Next: check and save/.test(h2));
z.step = 3;
var h3 = F.viewQz();
H.ok("step 3 is the last, and says so", /Step 3 of 3 &middot; discount, check and save/.test(h3));
H.ok("the brand discount box is on the check", /class="qz-bd"/.test(h3) && /Discount by brand/.test(h3));
H.ok("the line discounts are on the same screen", /class="qz-id"/.test(h3));
H.ok("Save is on it, and Back goes to products", /data-act="qz-save"/.test(h3) && /data-act="qz-step" data-k="2">Back/.test(h3));
H.ok("no old 'Next: check' button left", !/Next: check<\/button>/.test(h3) && !/data-k="4"/.test(h3));
H.ok("the total uses the brand's 40%", /<!--tot 600-->/.test(h3));
z.step = 4;
H.ok("a phone still holding step 4 lands on the check", /Step 3 of 3/.test(F.viewQz()));
var SRC = H.read("visit").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("a step above 3 is clamped", SRC.indexOf("var n = Math.min(Number(k), 3);") > 0);
H.ok("the app counts taps and sends them weekly", /vqUse\(act, k, t\);/.test(SRC) && /action: "vq:use"/.test(SRC));
H.done();
