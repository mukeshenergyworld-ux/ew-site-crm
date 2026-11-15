/* Driver payouts as they stand - one rule in the CRM and the Challan app  (6.9.997 / 1.158.0)
   Lifts the real dpLive out of BOTH apps and drives each with the same server list and audit. */
var H = require("./harness.js");
var rows = [
  { id: "DP1", createdAt: "2026-11-01T10:00:00Z", driver: "Satish", amount: 1500, mode: "Cash", ref: "", note: "" },
  { id: "DP2", createdAt: "2026-11-02T10:00:00Z", driver: "Satish", amount: 2000, mode: "Cash", ref: "", note: "" },
  { id: "DP3", createdAt: "2026-11-03T10:00:00Z", driver: "Raju", amount: 900, mode: "UPI", ref: "", note: "" }];
var audit = [
  { id: "a1", action: "rec:cancel", createdAt: "2026-11-04T10:00:00Z", detail: JSON.stringify({ tab: "driverpay", recId: "DP2", reason: "Entered twice" }) },
  { id: "a2", action: "pin:row-edit", createdAt: "2026-11-05T10:00:00Z", detail: JSON.stringify({ kind: "driverpay", recId: "DP3", changed: [{ field: "amount", was: 900, now: 1900 }, { field: "mode", was: "UPI", now: "Cash" }] }) },
  { id: "a3", action: "pin:row-edit", createdAt: "2026-11-05T09:00:00Z", detail: JSON.stringify({ kind: "payments", recId: "DP1", changed: [{ field: "amount", now: 1 }] }) },
  { id: "a4", action: "rec:cancel", createdAt: "2026-11-04T11:00:00Z", detail: JSON.stringify({ tab: "payments", recId: "DP1" }) }];
["team", "challan"].forEach(function (app) {
  var F = H.lift(app, ["dpLive"], {});
  var live = F.dpLive(rows, audit, false);
  var tot = live.reduce(function (a, p) { return a + Number(p.amount); }, 0);
  H.eq(app + ": the cancelled payout is out, the edited one counts its new amount", tot, 1500 + 1900);
  H.eq(app + ": the edit keeps the day it was paid", live.filter(function (p) { return p.id === "DP3"; })[0].createdAt, "2026-11-03T10:00:00Z");
  H.eq(app + ": the edited mode", live.filter(function (p) { return p.id === "DP3"; })[0].mode, "Cash");
  H.ok(app + ": another tab's cancel or edit touches nothing", live.filter(function (p) { return p.id === "DP1"; })[0].amount === 1500);
  H.eq(app + ": the Bin view keeps the cancelled one", F.dpLive(rows, audit, true).length, 3);
  H.ok(app + ": the server rows are never changed", rows[2].amount === 900);
  var back = audit.concat([{ id: "a5", action: "rec:cancel", createdAt: "2026-11-06T10:00:00Z", detail: JSON.stringify({ tab: "driverpay", recId: "DP2", undo: true }) }]);
  H.eq(app + ": brought back, it counts again", F.dpLive(rows, back, false).length, 3);
});
var crm = H.read("team").replace(/\/\*[\s\S]*?\*\//g, " "), ch = H.read("challan").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("the CRM's payouts() goes through dpLive", /function payouts\(\) \{ return dpLive\(dpAll\(\)/.test(crm));
H.ok("the Challan app's payouts() goes through dpLive", /function payouts\(\) \{ return dpLive\(\(S\.dp && S\.dp\.rows\)/.test(ch));
H.ok("a driver payout is editable, and the edit writes no server row", /driverpay: \{ what: "driver payout", tab: "driverpay", overlay: 1/.test(crm) && crm.indexOf("if (!_d2.overlay) save(_d2.tab, _next, true);") > 0);
H.done();
