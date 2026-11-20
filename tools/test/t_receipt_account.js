/* CRM 6.9.1049 - "after receipt of 2 lac again its showing same amt in receipt pdf, it must show balance amt after receipt" */
var H = require("./harness.js");
var P2L = { id: "P-1-1795152991280-262668", client: "Pawan Narang", amount: 200000, mode: "Cash" };
var STALE = { opening: 0, billed: 532342, freight: 1380, returned: 975, paid: 266151, due: 266596,
  pays: [{ id: "a", amount: 109000, mode: "Cash" }, { id: "b", amount: 7151, mode: "Cash", notes: "Extra Discount" }, { id: "c", amount: 150000, mode: "Cash" }] };
var led = STALE;
var ctx = { clientLedger: function () { return led; }, payAmt: function (p) { return Number(p.amount) || 0; } };
var F = H.lift("team", ["receiptAccount", "payIsDisc"], ctx);
var a = F.receiptAccount(P2L);
H.eq("Pawan Narang: the ledger was worked out before the 2 lakh - the receipt counts it: received 4,59,000", a.money, 459000);
H.eq("...the 7,151 extra discount is shown apart, not as money", a.disc, 7151);
H.eq("...balance after this receipt 66,596 (not 2,66,596)", Math.round(a.due), 66596);
led = { opening: 0, billed: 532342, freight: 1380, returned: 975, pays: STALE.pays.concat([P2L]) };
H.eq("once the ledger has it, it is counted once, not twice", Math.round(F.receiptAccount(P2L).due), 66596);
var S = H.read("team");
H.ok("the receipt reads receiptAccount and says 'after this receipt'", /led = receiptAccount\(p\);/.test(S) && /Balance outstanding after this receipt/.test(S) && /\["Discount allowed", led\.disc \|\| 0, 0\]/.test(S));
H.ok("a save that moves money drops the ledger cache", /payments\|challans\|returns\|discounts\|clients\|commpay\|driverpay\)\$\/\.test\(tab\)\) \{ try \{ bustCaches\(\); \}/.test(S));
H.done();
