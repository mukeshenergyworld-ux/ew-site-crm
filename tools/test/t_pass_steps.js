/* CRM 6.9.1070 / Challan 1.169.0 - his words: "Challan above showing not passed, below its showing passed".
   28/11/2026/456 went Draft -> Received without a pass. Lifts the REAL chSteps from both apps. */
var H = require("./harness.js");
var ctx = { inHisab: function () { return false; }, hisabCounts: function () { return false; }, chHasProof: function () { return false; } };
["team", "challan"].forEach(function (app) {
  var F = H.lift(app, ["chSteps"], ctx, []);
  var pass = function (c) { return F.chSteps(c).filter(function (s) { return s.k === "pass"; })[0].done; };
  H.eq(app + ": received with no pass on record is NOT passed", pass({ status: "Received", receiptReceived: "Y", approvedBy: "" }), false);
  H.eq(app + ": received and passed by a name is passed", pass({ status: "Received", approvedBy: "Mukesh Verma" }), true);
  H.eq(app + ": Approved is passed", pass({ status: "Approved" }), true);
  H.eq(app + ": a Draft is not passed, even with an old name on it", pass({ status: "Draft", approvedBy: "Mukesh Verma" }), false);
});
var src = H.read("team/app.src.js").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("Mark as received refuses a Draft", /to === "Received" && String\(ch2\.status \|\| "Draft"\) === "Draft"/.test(src));
H.ok("Not counted yet offers Pass & Dispatch for a Draft, not Mark as received", /Not passed yet &mdash; Pass &amp; Dispatch/.test(src));
H.ok("the owner can record a missing pass, audited", /data-act="ch-passlate"/.test(src) && /challan:pass-late/.test(src));
var csrc = H.read("challan/index.src.html");
H.ok("Challan app detail shows the item name (desc), not just the brand", /esc\(x\.name \|\| x\.desc \|\| x\.product/.test(csrc));
H.done();
