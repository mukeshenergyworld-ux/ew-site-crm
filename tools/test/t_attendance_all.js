/* 6.9.1023 - attendance for everyone: the staff list, the roll-call, the one-tap button; and the apps' own tap. */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var team = [{ name: "Mukesh Verma", role: "admin", active: "Y" }, { name: "Ashish Jha", role: "godown", active: "Y" }, { name: "Gautam", role: "accounts", active: "Y" },
  { name: "Vivek Verma", role: "sales", active: "Y" }, { name: "Old Man", role: "sales", active: "N" }, { name: "Manoj", role: "godown,service", active: "Y" }];
var audit = [{ action: "att:mark", actor: "Ashish Jha", createdAt: "2026-11-17T04:22:00Z", detail: JSON.stringify({ day: "2026-11-17", who: "Ashish Jha", kind: "present", note: "self 09:52 @29.43,76.95", self: 1 }) },
  { action: "att:mark", actor: "Mukesh Verma", createdAt: "2026-11-16T04:00:00Z", detail: JSON.stringify({ day: "2026-11-17", who: "Gautam", kind: "leave" }) }];
var ctx = { S: { user: "Ashish Jha", data: { team: team, audit: audit, sitevisits: [{ createdBy: "Vivek Verma", createdAt: "2026-11-17T05:00:00Z" }] } },
  today: function () { return "2026-11-17"; }, dkey: function (x) { return String(x || "").trim().toLowerCase(); }, dstr: function (x) { return String(x || "").slice(0, 10); },
  dmy: function (d) { return d.slice(8) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4); }, esc: function (x) { return String(x); }, roleIs: function (r) { return r === "godown"; },
  ATT_FROM: "2026-10-16", attDow: function (d) { return new Date(d + "T12:00:00").getDay(); } };
var F = H.lift("team", ["attStaff", "attMarks", "attVisitDays", "attDay", "attSelfMark", "attRollCall", "attMeHtml"], ctx);
H.eq("everyone active except the owner, inactive left out", F.attStaff().join(","), "Ashish Jha,Gautam,Vivek Verma,Manoj");
var rc = F.attRollCall("2026-11-17");
H.eq("present: the tap with its time, and the man who logged a visit", rc.P.join(" | "), "Ashish Jha 09:52 | Vivek Verma");
H.eq("not yet: the one with nothing", rc.N.join(","), "Manoj");
H.eq("on leave: Gautam", rc.L.join(","), "Gautam");
H.ok("the message reads for the group", /^Roll-call 17\/11\/2026\nPresent \(2\): Ashish Jha 09:52, Vivek Verma\nNot yet marked \(1\): Manoj\nOn leave: Gautam$/.test(rc.text));
H.ok("Ashish's header shows he is marked, no button", /Present 09:52/.test(F.attMeHtml()) && !/data-act="att-me"/.test(F.attMeHtml()));
ctx.S.user = "Manoj";
H.ok("Manoj gets the button", /data-act="att-me"/.test(H.lift("team", ["attStaff", "attMarks", "attVisitDays", "attDay", "attSelfMark", "attRollCall", "attMeHtml"], ctx).attMeHtml()));
["challan/index.src.html", "service/index.src.html"].forEach(function (f) {
  var s = fs.readFileSync(path.join(__dirname, "..", "..", f), "utf8");
  H.ok(f + ": header carries the Present tap and it writes att:mark through saveRow", /attMeBtn\(\)/.test(s) && /action: "att:mark"/.test(s) && /saveRow\("audit", row\)/.test(s) && /act === "att-me"/.test(s));
});
H.done();
