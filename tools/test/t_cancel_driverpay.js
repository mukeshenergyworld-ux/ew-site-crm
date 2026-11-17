/* 6.9.1036 - a driver payout can be cancelled, and accounts can ask for it: the row is found where it lives */
var H = require("./harness.js");
var pays = [{ id: "DP9", driver: "Surender", amount: 19400, createdAt: "2026-11-12T10:00:00Z" }];
var ctx = { S: { data: { audit: [], challans: [{ id: "C1" }] } }, dpAll: function () { return pays; },
  dpLive: function (rows, audit, keep) { return rows.slice(); } };
var F = H.lift("team", ["cxLiveRow"], ctx);
H.ok("the driver payout is found (it is not in S.data)", F.cxLiveRow("driverpay", "DP9") && F.cxLiveRow("driverpay", "DP9").amount === 19400);
H.ok("a challan is still found in S.data", !!F.cxLiveRow("challans", "C1"));
var S = H.read("team");
H.ok("Cancel, Ask, Withdraw, Refuse and the owner's waiting list all use it", (S.match(/= cxLiveRow\(/g) || []).length === 5 && !/\(\(S\.data \|\| \{\}\)\[_c[a-z]t\] \|\| \[\]\)\.filter/.test(S));
H.done();
