/* 6.9.1018 - the screens a person never opened fold behind More; a device with no counts folds nothing. */
var H = require("./harness.js");
var audit = [{ action: "nav:use", target: "Gautam", createdAt: "2026-11-10", detail: JSON.stringify({ dev: "d1", t: { billing: 40, challans: 3 } }) },
  { action: "nav:use", target: "Gautam", createdAt: "2026-11-12", detail: JSON.stringify({ dev: "d1", t: { billing: 50, challans: 3 } }) },
  { action: "nav:use", target: "Gautam", createdAt: "2026-11-12", detail: JSON.stringify({ dev: "d2", t: { paylog: 2 } }) }];
var ctx = { S: { user: "Gautam", tab: "billing", data: { audit: audit } }, dkey: function (x) { return String(x || "").toLowerCase(); } };
var F = H.lift("team", ["navMyCounts", "navFold"], ctx, ["_navMine", "_navMineKey"]);
var u = F.navMyCounts();
H.eq("newest row per device, devices added", u.billing + "," + u.challans + "," + u.paylog, "50,3,2");
var f = F.navFold(["billing", "challans", "paylog", "attendance", "payroll", "pricing"]);
H.eq("opened screens stay out", f.show.join(","), "billing,challans,paylog");
H.eq("never-opened ones fold", f.more.join(","), "attendance,payroll,pricing");
ctx.S.tab = "pricing"; ctx.S.data.audit = audit.slice(); 
var F2 = H.lift("team", ["navMyCounts", "navFold"], ctx, ["_navMine", "_navMineKey"]);
H.ok("the screen he is on never folds", F2.navFold(["billing", "challans", "pricing", "attendance", "payroll"]).show.indexOf("pricing") > -1);
ctx.S.user = "Nobody"; ctx.S.tab = "billing";
var F3 = H.lift("team", ["navMyCounts", "navFold"], ctx, ["_navMine", "_navMineKey"]);
H.eq("no counts for this person: nothing folds", F3.navFold(["a", "b", "c", "d"]).more.length, 0);
var S = H.read("team");
H.ok("a saved button says Saved before it takes its label back", /savedTick\(_tc\.t\); unlockBtn\(_tc\.t\)/.test(S) && /t\.innerHTML = "Saved \\u2713"/.test(S));
H.done();
