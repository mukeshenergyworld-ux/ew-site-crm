/* 6.9.1003 - Send for billing, with remarks: lifts the real billAskMap / billAskOf / billAskBox / modalBillAsk. */
var H = require("./harness.js");
var ctx = { S: { data: { challans: [{ id: "C1", challanNo: "14/11/2026/408", customerName: "Sanjay Ji", billNo: "" }, { id: "C2", challanNo: "X", customerName: "Y", billNo: "323" }], audit: [] } },
  esc: function (s) { return String(s == null ? "" : s); }, dmy: function (s) { return s; }, money: function (n) { return "Rs " + n; }, chValue: function () { return 1000; } };
var F = H.lift("team", ["billAskMap", "billAskOf", "billAskBox", "modalBillAsk"], ctx);
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
H.done();
