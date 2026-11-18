/* 6.9.1027 - attendance as a system: the plan on the tap, the day's work by role, the day sheet; the tap in every app. */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var team = [{ id: "U05", name: "Vivek Verma", role: "sales", active: "Y" }, { id: "U04", name: "Ashish Jha", role: "godown", active: "Y" }, { id: "U07", name: "Ramesh", role: "service", active: "Y" }, { id: "U03", name: "Gautam", role: "accounts", active: "Y" }];
var day = "2026-11-17";
var ctx = { S: { user: "Vivek Verma", data: { team: team,
    sitevisits: [{ createdBy: "Vivek Verma", createdAt: day + "T04:10:00Z", site: "Sachin", city: "Panipat" }, { createdBy: "Vivek Verma", createdAt: day + "T07:00:00Z", client: "Amrik" }, { createdBy: "Vivek Verma", createdAt: "2026-11-16T07:00:00Z", client: "Old" }],
    visits: [{ engineer: "Ramesh", date: day, client: "Gopal", type: "Repair", visitCharge: 500, createdAt: day + "T05:00:00Z" }],
    challans: [{ createdBy: "Ashish Jha", createdAt: day + "T06:00:00Z", challanNo: "17/11/2026/410", customerName: "Nitin Jain", status: "Dispatched", id: "c1" }, { createdBy: "Ashish Jha", createdAt: day + "T08:00:00Z", challanNo: "17/11/2026/411", customerName: "Sachin", id: "c2" }],
    payments: [{ createdBy: "Gautam", createdAt: day + "T09:00:00Z", customerName: "Amrik", amount: 5000, mode: "UPI", id: "p1" }],
    audit: [{ action: "att:mark", actor: "Ashish Jha", createdAt: day + "T03:30:00Z", detail: JSON.stringify({ day: day, who: "Ashish Jha", kind: "present", note: "self 09:00 @29.39,76.97 · Godown Panipat", plan: "Godown Panipat", geo: "29.39,76.97", app: "challan" }) }] } },
  today: function () { return day; }, dkey: function (x) { return String(x || "").trim().toLowerCase(); }, dstr: function (x) { return String(x || "").slice(0, 10); }, localDay: function (x) { return String(x || "").slice(0, 10); },
  isCancelled: function () { return false; }, payAmt: function (p) { return Number(p.amount) || 0; }, esc: function (x) { return String(x); }, locations: function () { return ["Panipat", "Sonipat"]; },
  pevTable: function (cols, rows) { return "<table>" + rows.map(function (r) { return "<tr>" + r.join("|") + "</tr>"; }).join("") + "</table>"; },
  attDayLabel: function (d) { return d; }, ATT_FROM: "2026-10-16", attDow: function (d) { return new Date(d + "T12:00:00").getDay(); } };
var F = H.lift("team", ["attRoleOf", "attWorkLabel", "attWork", "attMarks", "attVisitDays", "attDay", "attSelfMark", "attGeoHtml", "attGeoPaint", "attGeoStart", "attGeoOk", "attPlanSheet", "modalAttDay"], ctx, ["ATT_WORK", "_attGeo"]);
H.eq("roles read from the team", [F.attRoleOf("Vivek Verma"), F.attRoleOf("Ashish Jha"), F.attRoleOf("Ramesh"), F.attRoleOf("Gautam")].join(","), "sales,godown,service,accounts");
H.eq("sales: that day's site visits, not yesterday's", F.attWork("Vivek Verma", day).n, 2);
H.eq("service: his service visits that day", F.attWork("Ramesh", day).n, 1);
H.eq("godown: challans he made that day", F.attWork("Ashish Jha", day).n, 2);
H.eq("accounts: payments he entered that day", F.attWork("Gautam", day).n, 1);
H.eq("the label reads by role", F.attWorkLabel("godown", 2) + " / " + F.attWorkLabel("sales", 1), "2 challans / 1 visit");
var m = F.attSelfMark("Ashish Jha", day);
H.ok("the mark carries plan, place and app", m && m.plan === "Godown Panipat" && m.geo === "29.39,76.97" && m.app === "challan");
var sheet = F.modalAttDay("Ashish Jha", day);
H.ok("the day sheet: present, plan, a map link, and the two challans listed", /Present/.test(sheet) && /Plan:<\/b> Godown Panipat/.test(sheet) && /maps\.google\.com\/\?q=29\.39,76\.97/.test(sheet) && /17\/11\/2026\/410/.test(sheet) && /17\/11\/2026\/411/.test(sheet) && /from the Challan app/.test(sheet));
H.ok("the plan sheet offers the towns and Office", /data-v="Panipat"/.test(F.attPlanSheet()) && /data-v="Office"/.test(F.attPlanSheet()) && /id="att_plan"/.test(F.attPlanSheet()));
["challan/index.src.html", "service/index.src.html", "visit/index.src.html", "collect/index.src.html"].forEach(function (f) {
  var s = fs.readFileSync(path.join(__dirname, "..", "..", f), "utf8"), app = f.split("/")[0] === "collect" ? "payment" : f.split("/")[0];
  H.ok(f + ": Present button in the header, the plan sheet, the mark carries plan / geo / app", /attMeBtn\(\)/.test(s) && /act === "att-go"/.test(s) && /function attPlanSheet/.test(s) && new RegExp('app: "' + app + '"').test(s) && /plan: String\(plan \|\| ""\), geo: where/.test(s));
});
H.done();
