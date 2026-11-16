/* 6.9.1008 - a man joined under two names is ONE row on the money lists (lifts the real payLedgerList). */
var H = require("./harness.js");
var ctx = {
  S: { data: { challans: [{ customerName: "Jatin Gupta", receiptReceived: "Y" }, { customerName: "Jitin Gupta - A188 TDI 24", receiptReceived: "Y" }, { customerName: "Ram", receiptReceived: "Y" }],
               clients: [], payments: [{ client: "Jatin Gupta" }] } },
  nAmt: Number, seesAllClients: function () { return true; }, isMineClient: function () { return true; },
  dupMainName: function (n) { return /jitin gupta/i.test(n) ? "Jatin Gupta" : n; },
  clientLedger: function (n) { return { due: n === "Ram" ? 100 : 22759 }; }, payAge: function () { return 51; }
};
var F = H.lift("team", ["payLedgerList"], ctx);
var L = F.payLedgerList();
H.eq("two names, one man: one row", L.filter(function (x) { return /gupta/i.test(x.name); }).length, 1);
H.eq("…under his main name", L.filter(function (x) { return /gupta/i.test(x.name); })[0].name, "Jatin Gupta");
H.eq("the total counts his money once", L.reduce(function (a, x) { return a + x.l.due; }, 0), 22759 + 100);
var SRC = H.read("team");
H.ok("nobody is chased for less than a rupee", (SRC.match(/x\.l\.due >= PAY_OWED && x\.age >= PAY_MIN/g) || []).length === 3 && /var PAY_OWED = 1;/.test(SRC));
H.done();
