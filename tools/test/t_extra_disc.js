/* CRM 6.9.1043 - "any payment marked as extra discount will be considered cash discount and will effect incentive of all";
   and an extra discount box beside the payment */
var H = require("./harness.js");
var F = H.lift("team", ["payIsDisc"], {});
[["Cash", "", "Extra Discount"], ["Cash", "Extra Dist for settlement till date", ""], ["Bank transfer", "Extra Dist as discussed", ""], ["Cash", "", "extra dist"],
 ["Cash", "", "Extra dist."], ["Cash", "Extra Dist . 10% on Net cost", ""], ["Discount", "", ""], ["Cash", "Discount allowed - x", ""]].forEach(function (c) {
  H.ok("a discount: mode " + c[0] + " / " + (c[1] || c[2]), F.payIsDisc({ mode: c[0], notes: c[1], ref: c[2], amount: 100 }));
});
[["Cash", "part payment", ""], ["UPI", "", "UTR 4455"], ["Cheque", "Payment after discount on bill", ""], ["Cash", "Advance", ""]].forEach(function (c) {
  H.ok("money, not a discount: " + (c[1] || c[2]), !F.payIsDisc({ mode: c[0], notes: c[1], ref: c[2], amount: 100 }));
});
var V = { pi_mode: "Cash", pi_amt: "50,000", pi_date: "2026-11-19", pi_site: "", pi_ref: "", pi_why: "settled", pi_xdisc: "1,500" };
var ctx = { val: function (k) { return V[k] || ""; }, nAmt: function (s) { return Number(String(s || "").replace(/[^0-9.-]/g, "")) || 0; }, today: function () { return "2026-11-20"; },
  clientSiteList: function () { return []; }, mintId: function (p) { return p + Math.random().toString(36).slice(2, 8); }, S: { user: "Gautam" },
  money: function (n) { return "Rs " + n; }, dmy: function (d) { return d; }, PAY_KINDS: { "in": { label: "Payment received", sign: 1, note: "" }, "discount": { label: "Discount", sign: 1, note: "Discount allowed" } } };
var R = H.lift("team", ["readPayIn", "payIsDisc"], ctx);
var r = R.readPayIn("Himanshu Kumawat", "in");
H.ok("payment + extra discount: the money line as typed", r.row.amount === 50000 && r.row.mode === "Cash" && !R.payIsDisc(r.row));
H.ok("...and the discount its own line, filed as a Discount on the same day", r.xrow && r.xrow.amount === 1500 && r.xrow.mode === "Discount" && r.xrow.date === "2026-11-19" && R.payIsDisc(r.xrow) && r.xrow.client === "Himanshu Kumawat");
V.pi_xdisc = ""; H.ok("no extra discount, no second line", R.readPayIn("Himanshu Kumawat", "in").xrow === null);
V.pi_xdisc = "-50"; H.ok("a minus discount is refused", !!R.readPayIn("Himanshu Kumawat", "in").err);
V.pi_xdisc = "900"; H.ok("only on Payment received - an advance takes no extra discount", R.readPayIn("X", "advance").xrow === null);
var S = H.read("team");
H.ok("the form has the box, only for a payment received (not the builder spread)", /if \(_pk === "in" && !_mstN\) h \+= [\s\S]{0,400}pi_xdisc/.test(S));
H.ok("the save writes the discount line after the payment, and the duplicate check carries it", /_payPend = piRow; _payPendX = piX;/.test(S) && /save\("payments", piX\)/.test(S));
H.done();
