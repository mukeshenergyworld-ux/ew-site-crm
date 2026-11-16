/* Visit & Quote 1.19.0 - the month calendar and the 7-day grid read the salary rule: present = a visit marked.
   Lifts the REAL shared attendance block (attDay, attVisitDays, attMarks) and the new calendar. */
var H = require("./harness.js");
var TODAY = "2026-11-16";
var ctx = {
  S: { user: "Imran", ex: "", data: {
    sitevisits: [{ createdBy: "Imran", createdAt: "2026-11-02T10:00:00+05:30" }, { createdBy: "Imran", createdAt: "2026-11-09T10:00:00+05:30" }],
    audit: [
      { action: "visit:mark", actor: "Imran", createdAt: "2026-11-03T11:00:00+05:30", detail: JSON.stringify({ kind: "plumber", netAt: "2026-11-03T11:00:00+05:30", tchk: 1 }) },
      { action: "att:mark", actor: "Mukesh", createdAt: "2026-11-05T09:00:00+05:30", detail: JSON.stringify({ day: "2026-11-05", who: "Imran", kind: "leave" }) }],
    quotes: [{ id: "q1", createdBy: "Imran", createdAt: "2026-11-04T12:00:00+05:30" }], team: [{ name: "Imran", role: "sales" }] } },
  ATT_FROM: "2026-10-16", ATT_SAY: { P: "Present", A: "Absent", L: "Leave", H: "Holiday", O: "Sunday", W: "Worked on a day off", T: "Today - no visit yet" },
  today: function () { return TODAY; }, dkey: function (s) { return String(s || "").trim().toLowerCase(); },
  dstr: function (s) { return String(s || "").slice(0, 10); }, esc: function (s) { return String(s); }, fd: function (s) { return s; },
  roleIs: function (r) { return r === "sales"; }, isCancelled: function () { return false; },
  ymdLocal: function (d) { return d.toISOString().slice(0, 10); }, execNames: function () { return ["Imran"]; }
};
var F = H.lift("visit", ["attDow", "attMarks", "attVisitDays", "attDay", "attYmShift", "attMonthHtml"], ctx,
  ["ATT_CAL_C", "ATT_MON"]);
var h = F.attMonthHtml("Imran", "2026-11");
function cell(d) { var m = h.match(new RegExp('title="2026-11-' + d + ' \\u00b7 ([^"]*)"')); return m ? m[1] : null; }
H.ok("November 2026 is drawn", /November 2026/.test(h));
H.eq("2 Nov - a site visit - present", cell("02"), "Present · 1 visit");
H.eq("3 Nov - a plumber visit - present", cell("03"), "Present · 1 visit");
H.eq("4 Nov - only a quote - ABSENT (present is a visit)", cell("04"), "Absent");
H.eq("5 Nov - leave marked in the CRM", cell("05"), "Leave");
H.eq("1 Nov - Sunday", cell("01"), "Sunday");
H.eq("16 Nov - today, nothing yet", cell("16"), "Today - no visit yet");
H.ok("the counts are shown", /Present 3/.test(h) && /Absent/.test(h));
H.ok("next month is shut while this is the current month", /data-k="2026-12"[^>]*disabled/.test(h));
H.eq("months step across a year", F.attYmShift("2026-01", -1), "2025-12");
var SRC = H.read("visit").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("the 7-day grid reads attDay, not 'a visit or a quote'", /var st = attDay\(n, dy, vd, _mk\)/.test(SRC) && !/var on = !!\(\(vd\[dy\] && vd\[dy\]\.n > 0\) \|\| qd\[dy\]\)/.test(SRC));
H.ok("every site row has Log visit", /data-act="sv-log" data-id="' \+ esc\(st\.id\) \+ '" style="min-height:44px">&#10003; Log visit/.test(SRC));
H.ok("the stage starts at the last one marked", /stage: String\(st2\.stage \|\| ""\)/.test(SRC));
H.ok("an executive's daily report is his own", /var names = roleIs\("admin"\) \? execNames\(\) : \[S\.user\]/.test(SRC));
H.done();
