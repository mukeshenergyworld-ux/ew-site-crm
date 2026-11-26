/* CRM 6.9.1063 - payment speed for the executives: "a little incentive scheme for timely payment ... and vice versa for late payment",
   slabs 15/30/45/60 days at his rates 0.5 / 0.25 / 0.1 / 0 / -0.25, -0.5 unpaid at 90 days, from 1 Dec 2026.
   Lifts the REAL xpsRate, xpsEvents, xpSpeed, xpTotal. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var CH = [
  { id: "c0", challanNo: "OLD", customerName: "Gupta", status: "Received", createdAt: "2026-11-20", amt: 11800 },      /* before the start - paid first, earns nothing */
  { id: "c1", challanNo: "D1", customerName: "Gupta", status: "Received", createdAt: "2026-12-01", amt: 118000 }];
var PAY = [{ id: "p1", client: "Gupta", date: "2026-12-10", amount: 70800 },    /* 11,800 clears OLD, 59,000 to D1 at 9 days */
           { id: "p2", client: "Gupta", date: "2026-12-31", amount: 29500 }];   /* 30 days */
var ctx = { S: { data: { challans: CH, payments: PAY, returns: [], audit: [] } }, dkey: dk, today: function () { return "2027-03-15"; },
  xpMine: function () { return { gupta: 1 }; }, dedupeChallans: function (a) { return a; }, isCancelled: function () { return false; },
  dupMainName: function (n) { return n; }, dupFamily: function (n) { return [n]; }, challanNet: function (c) { return c.amt; },
  localDay: function (s) { return String(s).slice(0, 10); }, dstr: function (s) { return String(s).slice(0, 10); }, payAmt: function (p) { return p.amount; },
  payIsDisc: function () { return false; }, returnNet: function () { return 0; }, clientOpening: function () { return 0; },
  xpRule: function (ym) { return { trial: ym === "2026-12" }; },
  XPS_FROM: "2026-12-01", XPS_SLABS: [[15, 0.5], [30, 0.25], [45, 0.1], [60, 0], [90, -0.25]], XPS_LATE: -0.5, _xpsC: { k: "", m: {} }, XP_START: "2026-12" };
var F = H.lift("team", ["xpsRate", "xpsEvents", "xpSpeed", "xpTotal", "daysBetweenXp", "xYm"], ctx, []);
H.eq("slab rates", [0, 15, 16, 30, 31, 45, 46, 60, 61, 90].map(F.xpsRate).join(","), "0.5,0.5,0.25,0.25,0.1,0.1,0,0,-0.25,-0.25");
var d = F.xpSpeed("Vivek Verma", "2026-12");
H.eq("Dec: 50,000 paid in 9 days (+0.5%) and 25,000 in 30 days (+0.25%) = +312.50", Math.round(d.net * 100) / 100, 312.5);
H.ok("the old (November) bill is cleared first and earns nothing", d.n === 2);
H.ok("December is the trial", d.trial);
var m = F.xpSpeed("Vivek Verma", "2027-03");
H.eq("still unpaid on 1 Mar 2027 (day 90): -0.5% on 25,000 = -125", Math.round(m.net * 100) / 100, -125);
H.eq("a cut never takes the month below zero (salary untouched)", F.xpTotal({ inc: 0, sep: 0 }, m), 0);
H.eq("...but comes off incentive when there is some", F.xpTotal({ inc: 1000, sep: 0 }, m), 875);
PAY.push({ id: "p3", client: "Gupta", date: "2027-03-10", amount: 29500 });
ctx.S.data.payments = PAY.slice(); var F2 = H.lift("team", ["xpsRate", "xpsEvents", "xpSpeed", "xpTotal", "daysBetweenXp", "xYm"], ctx, []);
H.eq("paid after 90 days: no second cut (it was taken at day 90 on what was unpaid... now nothing is unpaid)", Math.round(F2.xpSpeed("Vivek Verma", "2027-03").net), 0);
var S = H.read("team");
H.ok("the app's own rates are the ones tested", /var XPS_SLABS = \[\[15, 0\.5\], \[30, 0\.25\], \[45, 0\.1\], \[60, 0\], \[90, -0\.25\]\], XPS_LATE = -0\.5;/.test(S) && /var XPS_FROM = "2026-12-01";/.test(S));
H.ok("the plan card has the column and the team PDF button", /th\("Payment speed"\)/.test(S) && /data-act="xp-team-pdf"/.test(S));
H.ok("statement PDF and WhatsApp carry the line", /row\("Payment speed - "/.test(S) && /L\.push\("Payment speed: "/.test(S));
H.done();
