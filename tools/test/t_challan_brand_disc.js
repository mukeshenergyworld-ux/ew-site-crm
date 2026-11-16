/* 6.9.1013 - a brand's discount on one challan: lifts the real cbdBrands / cbdAmtAt / cbdApplyNow and checks what is
   worked out, what is written, and what is logged. */
var H = require("./harness.js");
var ch = { id: "CH1", challanNo: "D-9", customerName: "A", createdAt: "2026-11-10T05:00:00Z", itemsJson: JSON.stringify([
  { code: "H1", brand: "Heli", qty: 2, rate: 1000, disc: 56 }, { code: "H2", brand: "Heli", qty: 1, rate: 500 },
  { code: "K1", brand: "Kag", qty: 4, rate: 100, disc: 30 }, { code: "J1", desc: "fitting labour", qty: 1, rate: 300, job: 1 }]) };
var saved = [], facts = [];
function priced(c) { return JSON.parse(c.itemsJson).map(function (i) { var job = !!i.job, d = job ? 0 : (i.disc != null ? Number(i.disc) : 50), dr = Math.round(i.rate * (1 - d / 100));
  return { code: i.code, brand: job ? "" : i.brand, qty: i.qty, rate: i.rate, disc: d, dr: dr, amt: i.qty * dr, job: job, nb: false }; }); }
var ctx = { S: { data: { challans: [ch], audit: [] } }, pricedLines: priced,
  clientDiscount: function (cl, b) { return b === "Heli" ? 50 : 30; }, clientDiscountOn: function () { return 50; },
  isJobLine: function (i) { return !!i.job; }, noBrandLine: function () { return false; }, productBrandByCode: function () { return ""; },
  localDay: function (x) { return String(x).slice(0, 10); }, save: function (k, r) { saved.push(k); return Promise.resolve(); },
  auditFact: function (a, t, d) { facts.push({ a: a, t: t, d: d }); return Promise.resolve(); }, bustCaches: function () { }, toast: function () { },
  money: function (n) { return "Rs" + Math.round(n); }, render: function () { }, keepScroll: false };
var F = H.lift("team", ["cbdBrands", "cbdAmtAt", "cbdApplyNow"], ctx);
var B = F.cbdBrands(ch, "A");
H.eq("two brands on this challan; the labour line is not one", B.map(function (b) { return b.brand; }).join(","), "Heli,Kag");
H.ok("Heli is mixed (50 and 56), Kag is at 30 = its preset", B[0].now === null && B[0].lo === 50 && B[0].hi === 56 && B[1].now === 30 && B[1].preset === 30);
H.eq("working out Heli at 60% is the sum of its lines at 60%", F.cbdAmtAt(B[0], 60), 2 * 400 + 200);
F.cbdApplyNow("CH1", "Heli", 60, false);
var it = JSON.parse(ch.itemsJson);
H.ok("Apply writes every Heli line, and leaves Kag and labour alone", it[0].disc === 60 && it[1].disc === 60 && it[2].disc === 30 && it[3].disc == null);
H.eq("the challan is saved once", saved.join(","), "challans");
var f = facts[0];
H.ok("one audit row pin:disc-brand on that challan", facts.length === 1 && f.a === "pin:disc-brand" && f.t === "CH1");
H.ok("it carries each line's old and new rate", f.d.lines.length === 2 && f.d.lines[0].was === 56 && f.d.lines[1].was === 50 && f.d.lines[0].now === 60);
H.ok("and the total before and after", f.d.before === 880 + 250 + 280 + 300 && f.d.after === 800 + 200 + 280 + 300);
facts.length = 0; F.cbdApplyNow("CH1", "", null, true);
it = JSON.parse(ch.itemsJson);
H.ok("All brands to preset puts each brand back on its own preset", it[0].disc === 50 && it[1].disc === 50 && it[2].disc === 30);
H.ok("and logs one row per brand, marked as preset", facts.length === 2 && facts[0].d.preset === 1 && facts[0].d.to === 50);
var S = H.read("team");
H.ok("Apply and preset ask for the PIN every time - no 3-minute window", /act === "cbd-apply" \|\| act === "cbd-preset"/.test(S) && /sheetMoneyPin\("Your PIN to change the discount on this challan"/.test(S) && !/cbdPend[\s\S]{0,400}discPinAt/.test(S));
H.ok("owner only, in the drawing and the handlers", /function cbdStripHtml\(c, cl\) \{\s*if \(!roleIs\("admin"\)\) return "";/.test(S) && /act === "cbd-pin-go"\) \{[^\n]*\n\s*if \(!roleIs\("admin"\)\) return;/.test(S));
H.ok("a line typed in the table is logged too", /auditFact\("pin:disc-line"/.test(S));
H.ok("the strip sits above the item table", /_ctbl = cbdStripHtml\(c, cl\) \+ _swipe/.test(S));
H.done();
