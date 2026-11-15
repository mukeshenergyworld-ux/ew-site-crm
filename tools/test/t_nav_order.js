/* Does the nav really order each group by what the team opened?  (6.9.996)
   Lifts the real navUseCounts + navItemsOf out of the CRM and drives them with
   audit rows shaped exactly like the ones the devices publish. */
var H = require("./harness.js");

var LAB = { billing: "HISAB", discounts: "Discounts", payments: "Payments", statements: "Statements", dues: "Dues" };
var G = ["HISAB", ["billing", "discounts", "payments", "statements", "dues"]];

var ctx = {
  S: { data: { audit: [] } },
  _navUse: null, _navUseKey: "",
  dkey: function (s) { if (s && typeof s === "object") s = s.name; return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); },
  canSee: function () { return true; },
  alphaBy: function (f) { return function (a, b) { return String(f(a)).localeCompare(String(f(b))); }; }
};
var F = H.lift("team", ["navUseCounts", "navItemsOf"], ctx);
function order() { return F.navItemsOf(G, LAB).join(","); }
function reset() { ctx._navUse = null; ctx._navUseKey = ""; }

/* 1. no device has reported -> nothing moves, still alphabetical after the home */
reset();
H.eq("with no counts the order is the old alphabetical one", order(), "billing,discounts,dues,payments,statements");

/* 2. two devices, the newest row per device wins, counts add up */
ctx.S.data.audit = [
  { action: "nav:use", target: "Mukesh", createdAt: "2026-09-01T00:00:00Z", detail: JSON.stringify({ dev: "d1", t: { statements: 999 } }) },
  { action: "nav:use", target: "Mukesh", createdAt: "2026-11-01T00:00:00Z", detail: JSON.stringify({ dev: "d1", t: { discounts: 20, payments: 10, statements: 5 } }) },
  { action: "nav:use", target: "Gautam", createdAt: "2026-11-02T00:00:00Z", detail: JSON.stringify({ dev: "d2", t: { payments: 40, dues: 1 } }) },
  { action: "pitch:call", target: "Mukesh", createdAt: "2026-11-03T00:00:00Z", detail: JSON.stringify({ dev: "d3", t: { dues: 500 } }) }
];
reset();
var u = F.navUseCounts();
H.eq("the superseded 999 is gone - only the newest row per device counts", u.statements, 5);
H.eq("two devices add up (10 + 40)", u.payments, 50);
H.eq("a row that is not nav:use is ignored", u.dues, 1);
H.eq("most-opened first, group home still pinned", order(), "billing,payments,discounts,statements,dues");

/* 3. a screen nobody opened sorts last, and equal counts stay alphabetical */
ctx.S.data.audit = [{ action: "nav:use", target: "M", createdAt: "2026-11-01T00:00:00Z", detail: JSON.stringify({ dev: "d1", t: { payments: 7, statements: 7 } }) }];
reset();
H.eq("equal counts fall back to the label, unopened screens last", order(), "billing,payments,statements,discounts,dues");

/* 4. the cache keys on the book, so a reload is seen without anyone resetting it */
ctx.S.data.audit.push({ action: "nav:use", target: "G", createdAt: "2026-11-05T00:00:00Z", id: "x9", detail: JSON.stringify({ dev: "d2", t: { dues: 300 } }) });
H.eq("a new audit row re-reads the counts with no reset", order(), "billing,dues,payments,statements,discounts");

/* 5. the duplicate label is gone - no two tabs may share a name */
var SRC = H.read("team").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok('the second tab called "Payments" is renamed', SRC.indexOf('["collections", "Payments"]') < 0);
H.ok("collections now says what it is", SRC.indexOf('["collections", "Money in & out"]') > 0);
H.done();
