/* 6.9.1035 - a changed salary does not reach back into months already made; advance recovery + additional recovery */
var H = require("./harness.js");
var A = [];
function row(action, at, d) { A.push({ action: action, createdAt: at, actor: "Gautam", detail: JSON.stringify(d) }); }
/* Sachin as on the live book: 4,000 written 4 Nov, 4,500 written 17 Nov; October made on 4 Nov, 22 days */
row("hr:emp", "2026-11-04T10:23:55Z", { eid: "E1", name: "SACHIN SWEEPER", kind: "Other", monthly: 4000 });
row("hr:emp", "2026-11-17T05:58:56Z", { eid: "E1", name: "SACHIN SWEEPER", kind: "Other", monthly: 4500 });
row("hr:pay", "2026-11-04T10:25:27Z", { pid: "E1|2026-10", eid: "E1", month: "2026-10", days: 22 });
/* Ram: 10,000; an advance of 9,000 at 3,000 a month; he pays 2,000 more in December */
row("hr:emp", "2026-09-01T10:00:00Z", { eid: "E2", name: "RAM", kind: "Office", monthly: 10000, salFrom: "0000-00" });
row("hr:emp", "2026-11-17T10:00:00Z", { eid: "E2", name: "RAM", kind: "Office", monthly: 12000, salFrom: "2026-12" });
row("hr:adv", "2026-10-01T10:00:00Z", { aid: "A1", eid: "E2", date: "2026-10-01", amount: 9000, perMonth: 3000 });
row("hr:pay", "2026-11-01T10:00:00Z", { pid: "E2|2026-10", eid: "E2", month: "2026-10", advCut: 3000, paidOn: "2026-11-01", monthly: 10000 });
row("hr:pay", "2026-12-01T10:00:00Z", { pid: "E2|2026-11", eid: "E2", month: "2026-11", advCut: 3000, advX: 2000, paidOn: "2026-12-01", monthly: 10000 });
var ctx = { hrNum: function (v) { return v != null && v !== "" && v !== "auto" ? Number(v) || 0 : null; }, S: { data: { audit: A } }, ymLocal: function (d) { return d.toISOString().slice(0, 7); } };
var F = H.lift("team", ["hrRows", "hrLatest", "hrSet", "hrStaff", "hrPay", "hrAdvs", "hrDim", "hrIncs", "hrSalSteps", "hrMonthlyAt", "hrAdvState", "hrCarry", "hrPick", "hrCalc", "hrEmp"], ctx, ["HR_DEF", "HR_NONSTAFF"]);
var sachin = F.hrEmp("E1"), ram = F.hrEmp("E2");
H.eq("Sachin's October keeps 4,000 (it read 4,500 after November was raised)", F.hrMonthlyAt(sachin, "2026-10"), 4000);
H.eq("...so his 22 days of October are 2,839, not 3,194", F.hrCalc(sachin, "2026-10").earned, 2839);
H.eq("Sachin's November is 4,500", F.hrMonthlyAt(sachin, "2026-11"), 4500);
H.eq("Ram: a raise set from December leaves November alone", F.hrMonthlyAt(ram, "2026-11"), 10000);
H.eq("Ram: December takes the raise", F.hrMonthlyAt(ram, "2026-12"), 12000);
var d = F.hrCalc(ram, "2026-12");
H.eq("Advance: 9,000 - 3,000 - (3,000 + 2,000 additional) = 1,000 still owed", d.adv.owed, 1000);
H.eq("Advance recovery stops at what is left", d.advMon, 1000);
A.push({ action: "hr:pay", createdAt: "2027-01-01T10:00:00Z", actor: "Gautam", detail: JSON.stringify({ pid: "E2|2026-12", eid: "E2", month: "2026-12", advCut: 1000, paidOn: "2027-01-01", monthly: 12000 }) });
H.eq("...and once it is recovered nothing more is cut", F.hrCalc(ram, "2027-01").advCut, 0);
var S = H.read("team");
H.ok("the sheet has Advance recovery and Additional recovery columns", /\["Advance recovery", "right"\], \["Additional recovery", "right"\], \["Other cut", "right"\]/.test(S) && /hr-advx/.test(S));
H.ok("a changed salary asks from which month it counts", /Choose from which month the new salary counts/.test(S) && /function hrSalFromHtml\(/.test(S));
H.done();
