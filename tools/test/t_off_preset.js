/* 6.9.1015 - a line off the client's preset: lifts the real offPresetLines / offPresetSummary / offPresetBanner. */
var H = require("./harness.js");
var c = { id: "C1", challanNo: "D-1", createdAt: "2026-11-05T05:00:00Z" };
var lines = [
  { code: "S1", desc: "WC", brand: "SAN", disc: 53, preset: false }, { code: "S2", brand: "SAN", disc: 50, preset: true },
  { code: "D1", brand: "DRP", disc: 32, preset: false }, { code: "D2", brand: "DRP", disc: 32, preset: false },
  { code: "K1", brand: "KAN", disc: 32, preset: false },
  { code: "J1", brand: "", disc: 0, job: true }, { code: "N1", brand: "", disc: 5, nb: true }];
var ctx = { pricedLines: function () { return lines; }, localDay: function (x) { return String(x).slice(0, 10); },
  clientDiscountOn: function (cl, b, d) { return b === "SAN" ? 53 : 0; }, roleIs: function () { return true; },
  clientDiscount: function (cl, b) { return b === "SAN" ? 53 : (b === "KAN" ? 32 : 0); },
  plural: function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); }, esc: function (x) { return String(x); },
  chNoShort: function (n) { return n; }, d10: function (x) { return x; } };
var F = H.lift("team", ["offPresetLines", "offPresetSummary", "offPresetBanner"], ctx, ["_offPre"]);
var L = F.offPresetLines(c, "A");
H.eq("only the lines with their own discount that is not the day's preset", L.map(function (x) { return x.code; }).join(","), "D1,D2");
H.ok("a line on TODAY's preset is not flagged, though its day's preset was 0 (Dr Kanav Gupta, DRP 32)", !L.some(function (x) { return x.code === "K1"; }));
H.eq("said by brand, once", F.offPresetSummary(L), "DRP 32% (preset 0%)");
var S = H.read("team");
H.ok("owner only: the map is filled for admin and the banner checks the role", /if \(roleIs\("admin"\)\) chs\.forEach\(function \(c\) \{ _offPre\[c\.id\] = offPresetLines/.test(S) && /function offPresetBanner\(chs, cl\) \{\s*if \(!roleIs\("admin"\)\) return "";/.test(S));
H.ok("the map is filled before the account table draws", S.indexOf("_offPre = {};   /* 6.9.1015") < S.indexOf("var _acct = hisabSummaryCard(cl);"));
H.ok("the row carries the tag and the line is drawn amber", /Not at preset &middot; /.test(S) && /\\u2713 At preset/.test(S) && /_offIx\[x\.code \+ "\|" \+ x\.disc\] != null/.test(S));
H.done();
