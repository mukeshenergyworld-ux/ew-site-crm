/* Payment app 1.79.0 - a discount is not money, the same test as the CRM */
var H = require("./harness.js");
var C = H.lift("collect", ["payIsDisc"], {}), T = H.lift("team", ["payIsDisc"], {});
var cases = [{ mode: "Cash", ref: "Extra Discount" }, { mode: "Cash", notes: "Extra Dist for settlement" }, { mode: "Discount" }, { mode: "Cash", notes: "Discount allowed - x" },
  { mode: "Cash", notes: "part payment" }, { mode: "UPI", ref: "UTR 1" }, { mode: "Cheque", notes: "after discount on bill" }];
H.ok("the Payment app and the CRM call the same lines a discount", cases.every(function (p) { return C.payIsDisc(p) === T.payIsDisc(p); }) && C.payIsDisc(cases[0]) && !C.payIsDisc(cases[4]));
var S = H.read("collect");
H.ok("Collected today leaves a discount out, and says it apart", /if \(payIsDisc\(p\)\) \{ dsc \+= a; return; \}/.test(S) && /Discount allowed today/.test(S));
H.ok("a discount keeps no promise and is not his last payment", /return !payIsDisc\(p\) && String\(p\.client/.test(S) && /var _money = payments\.filter\(function \(p\) \{ return !payIsDisc\(p\)/.test(S));
H.ok("his list says Discount - not money", /disc: payIsDisc\(p\)/.test(S) && /Discount \\u2014 not money/.test(S));
H.done();
