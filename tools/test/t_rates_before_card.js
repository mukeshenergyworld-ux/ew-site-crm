/* CRM 6.9.1044 - "rates already preset and above challan saying rates not set, also not able to edit rates?"
   A delivery from before the incentive card (5 Oct 2026) pays the client's own rate of its day; Set rates now opens those boxes. */
var H = require("./harness.js");
var ROWS = [{ id: "D1", client: "Sanjeev Aggarwal", brand: "Huliot HT PRO", pct: "44", notes: JSON.stringify({ from: "2026-09-26" }) }];
var ctx = { discRowOn: function (cl, b, day) { return day >= "2026-09-26" ? ROWS[0] : null; }, incMap: function (r) { try { return JSON.parse(r.notes || "{}"); } catch (e) { return {}; } },
  incRoleLabel: function (r) { return r; } };
var F = H.lift("team", ["admOldRows"], ctx);
var r = F.admOldRows("Sanjeev Aggarwal", "2026-09-26", { "huliot ht pro": { brand: "Huliot HT PRO", vals: { architect: "3", exec: "1" } } });
var n = JSON.parse(r.rows[0].notes);
H.ok("the rates go onto the rate row of that day, its start date and discount kept", r.rows.length === 1 && r.rows[0].id === "D1" && r.rows[0].pct === "44" && n.from === "2026-09-26" && n.architect === 3 && n.exec === 1 && n.execOn === 1);
H.ok("a percent over 100 is refused", F.admOldRows("Sanjeev Aggarwal", "2026-09-26", { k: { brand: "Huliot HT PRO", vals: { architect: "300" } } }).bad.length === 1);
H.eq("no row on that day: nothing is written", F.admOldRows("Sanjeev Aggarwal", "2026-09-01", { k: { brand: "Huliot HT PRO", vals: { architect: "3" } } }).rows.length, 0);
ROWS[0].notes = JSON.stringify({ from: "2026-09-26", architect: 3 });
H.eq("unchanged: nothing is written", F.admOldRows("Sanjeev Aggarwal", "2026-09-26", { k: { brand: "Huliot HT PRO", vals: { architect: "3" } } }).rows.length, 0);
var S = H.read("team");
H.ok("Set rates on a delivery before the card opens its own sheet, boxes open", /if \(_old\) return modalAdmChallanOld\(c, cl, brands, line, _old\);/.test(S) && /admCell\(cl, b, m\.role, v, false, day\)/.test(S) && /incCardLive\(""\) && !oldDay\) ro = true/.test(S));
H.ok("the save is logged", /auditFact\("rate:before-card", aoCl/.test(S));
H.done();
