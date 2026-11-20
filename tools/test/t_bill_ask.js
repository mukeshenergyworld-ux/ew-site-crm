/* 6.9.1003 - Send for billing, with remarks: lifts the real billAskMap / billAskOf / billAskBox / modalBillAsk. */
var H = require("./harness.js");
var ctx = { S: { data: { challans: [{ id: "C1", challanNo: "14/11/2026/408", customerName: "Sanjay Ji", billNo: "" }, { id: "C2", challanNo: "X", customerName: "Y", billNo: "323" }], audit: [] } },
  esc: function (s) { return String(s == null ? "" : s); }, dmy: function (s) { return s; }, money: function (n) { return "Rs " + n; }, chValue: function () { return 1000; },
  /* 6.9.1052 - the sheet now carries the name picker and the fetched delivery */
  billProfiles: function () { return []; }, billVehSrc: function () { return { v: "", from: "" }; }, billVehNeed: function () { return true; } };
var F = H.lift("team", ["billAskMap", "billAskOf", "billAskBox", "billPick", "billAskDrv", "billAskDrvLine", "modalBillAsk"], ctx);
var c1 = ctx.S.data.challans[0], c2 = ctx.S.data.challans[1];
H.ok("nothing sent: nothing shown", !F.billAskOf(c1));
ctx.S.data.audit.push({ action: "bill:ask", target: "C1", actor: "Mukesh", createdAt: "2026-11-16T05:00:00Z", detail: JSON.stringify({ on: 1, note: "Bill to Maa Collection, GSTIN 06ABC" }) });
H.eq("sent: the remarks travel with it", F.billAskOf(c1).note, "Bill to Maa Collection, GSTIN 06ABC");
H.ok("the box shows who and the remarks", /Sent for billing<\/b> by Mukesh/.test(F.billAskBox(F.billAskOf(c1))) && /GSTIN 06ABC/.test(F.billAskBox(F.billAskOf(c1))));
H.ok("the sheet offers Take it back once sent", /data-act="ba-off"/.test(F.modalBillAsk("C1")) && /Save the remarks/.test(F.modalBillAsk("C1")));
ctx.S.data.audit.push({ action: "bill:ask", target: "C2", actor: "Mukesh", createdAt: "2026-11-16T05:00:00Z", detail: JSON.stringify({ on: 1, note: "x" }) });
H.ok("a challan already billed is not shown as waiting", !F.billAskOf(c2));
ctx.S.data.audit.push({ action: "bill:ask", target: "C1", actor: "Mukesh", createdAt: "2026-11-16T06:00:00Z", detail: JSON.stringify({ on: 0, note: "" }) });
H.ok("taken back: the latest row wins", !F.billAskOf(c1));
H.ok("not sent: the sheet says Send to accounts", /Send to accounts/.test(F.modalBillAsk("C1")));
var S = H.read("team");   /* raw: these are lines of code, and a stripper can eat across a "/*" inside a string */
H.ok("the HISAB row has Send for billing", /data-act="ba-open"[^>]*title="Send this delivery to accounts for billing/.test(S));
H.ok("the desk lists sent ones after bill-with-material", /billAskOf\(c, _bam\); \}\)\.sort/.test(S) && /billAskBox\(billAskOf\(c, _bam\)\)/.test(S));
H.ok("the billing sheet opens with the remarks", /billAskBox\(billAskOf\(c\)\) \+/.test(S));

/* 6.9.1004 - once billed, the row shows the bill */
var ctx2 = { S: { data: { challans: [], audit: [{ action: "bill:ask", target: "C9", actor: "Mukesh", createdAt: "2026-11-16T05:00:00Z", detail: JSON.stringify({ on: 1, note: "Bill to Maa Collection" }) }] } },
  esc: function (s) { return String(s == null ? "" : s); }, canBill: function () { return true; }, canHisabRole: function () { return true; }, billAskOf: function () { return null; } };
var G = H.lift("team", ["billAskMap", "miniBillCell"], ctx2);
var cell = G.miniBillCell({ kind: "ch", id: "C9", bill: { no: "295", at: "15/10/2026", to: "Maa Collection GST 06ABC", by: "Ashish Jha", st: "Billed" } });
H.ok("billed: the number and date", /Bill 295<\/b>/.test(cell) && /15\/10\/2026/.test(cell));
H.ok("billed: the name it was billed under", /Maa Collection GST 06ABC/.test(cell));
H.ok("billed: who billed it", /by Ashish/.test(cell));
H.ok("billed: the remarks it was sent with", /Bill to Maa Collection/.test(cell));
ctx2.canBill = function () { return false; };
var G2 = H.lift("team", ["billAskMap", "miniBillCell"], ctx2);
var cell2 = G2.miniBillCell({ kind: "ch", id: "C9", bill: { no: "295", at: "15/10/2026", to: "Maa Collection GST 06ABC", by: "Ashish Jha", st: "Billed" } });
H.ok("someone who does not bill sees the number, not the billing name", /Bill 295/.test(cell2) && !/GST 06ABC/.test(cell2));
H.done();
