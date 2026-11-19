/* CRM 6.9.1045 - Partner Club v3, approved 19 Nov 2026: 3% of collected pre-GST, bar set by the prize */
var H = require("./harness.js");
var BOOKS = {
  "Mahabir": [{ ymd: "2026-03-01", amount: 2200000 * 1.18, paidShare: 1 }, { ymd: "2025-12-31", amount: 999999, paidShare: 1 }],
  "Aseem Chugh": [{ ymd: "2026-05-01", amount: 1600000 * 1.18, paidShare: 1 }],
  "Small": [{ ymd: "2026-05-01", amount: 200000 * 1.18, paidShare: 0.5 }],
  "Nitin": [{ ymd: "2026-06-01", amount: 900000 * 1.18, paidShare: 1 }, { ymd: "2026-07-01", amount: 50000 * 1.18, ret: true }]
};
var A = [{ name: "Mahabir", role: "Plumber" }, { name: "Aseem Chugh", role: "Builder" }, { name: "Small", role: "Plumber" }, { name: "Nitin", role: "Architect" }];
var AUD = [];
var ctx = { S: { data: { audit: AUD } }, assocLive: function () { return A; }, partnerBook: function (n) { return { rows: BOOKS[n] || [] }; },
  dkey: function (s) { return String(s || "").trim().toLowerCase(); }, nAmt: function (v) { return Number(String(v).replace(/[^0-9.-]/g, "")) || 0; },
  cmpJ: function (s) { try { return JSON.parse(s); } catch (e) { return null; } } };
var F = H.lift("team", ["clubScheme", "clubMenu", "clubRewards", "clubRows"], ctx, ["CLUB_GST", "CLUB_PCT", "CLUB_TIERS", "CLUB_TRIPS"]);
var R = F.clubRows("2026"), by = {}; R.forEach(function (r) { by[r.name] = r; });
H.eq("collected is counted before GST, inside the year only", by.Mahabir.coll, 2200000);
H.eq("Mahabir at 22 L is Gold (bar 15 L)", by.Mahabir.tierK, "Gold");
H.eq("his 3% is 66,000", by.Mahabir.earned, 66000);
H.eq("the Goa trip costs Energy World 42,640; the balance 23,360 comes as a coin", by.Mahabir.coin, 23360);
H.ok("Goa is on a plumber's Gold menu, not a builder's", by.Mahabir.menu.some(function (s) { return /goa/i.test(s); }) && !by["Aseem Chugh"].menu.some(function (s) { return /goa/i.test(s); }));
H.ok("the highest collector is Partner of the Year", by.Mahabir.poty === true && !by["Aseem Chugh"].poty);
H.eq("half paid counts half: 1 L, Member", by.Small.tierK, "Member");
H.eq("a return does not reduce what was paid", by.Nitin.coll, 900000);
H.eq("Nitin at 9 L is Silver; 6 L to Gold", by.Nitin.tierK + " " + by.Nitin.gap, "Silver 600000");
H.ok("every default tier's EW cost is inside 3% of its bar", F.clubScheme().tiers.every(function (t) { return t.ew <= t.cut * 0.03 + 0.5; }));
AUD.push({ action: "club:set", createdAt: "2026-11-10T00:00:00Z", detail: JSON.stringify({ tiers: [{ k: "Platinum", cut: 1000000, bonus: 0.75 }] }) });
H.eq("an old v1 slab scheme is not read as v3", F.clubScheme().tiers.length, 5);
AUD.push({ action: "club:reward", target: "Mahabir", createdAt: "2026-11-19T05:00:00Z", detail: JSON.stringify({ year: "2026", partner: "Mahabir", state: "chosen", item: "Goa trip, 4N/5D (plumbers)" }) });
AUD.push({ action: "club:reward", target: "Mahabir", createdAt: "2026-11-19T06:00:00Z", detail: JSON.stringify({ year: "2026", partner: "Mahabir", state: "given", item: "Goa trip, 4N/5D (plumbers)" }) });
H.eq("earned -> chosen -> given: the newest row counts", F.clubRows("2026").filter(function (r) { return r.name === "Mahabir"; })[0].state, "given");
BOOKS["Plat"] = [{ ymd: "2026-04-01", amount: 3000000 * 1.18, paidShare: 1 }]; A.push({ name: "Plat", role: "Architect" });
var P = F.clubRows("2026").filter(function (r) { return r.name === "Plat"; })[0];
H.ok("6.9.1046 - FIMA funds half the international trip: EW pays 55,250, FIMA 55,250, the bar stays 30 L", P.tierK === "Platinum" && P.prize === 55250 && P.tier.brand === 55250 && P.tier.brandName === "FIMA");
H.eq("...so a Platinum partner at the bar gets 34,750 as his coin", P.coin, 34750);
H.ok("Goa stays 80/20", F.clubScheme().tiers.filter(function (t) { return t.k === "Gold"; })[0].ew === 42640);
H.done();
