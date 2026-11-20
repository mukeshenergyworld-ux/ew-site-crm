/* CRM 6.9.1052 - "Its not showing billing details as its saved with name of GC and Co, its also not fetching vechile details".
   Lifts the REAL modalBillAsk, billPick, billProfiles, billAskDrv, billAskDrvLine, billAskNote, billVehSrc. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var CH = [
  { id: "c296", challanNo: "17/10/2026/296", customerName: "Karan Chawla - Karnal", driver: "Sarwan Singh", vehicle: "", freight: 800, createdAt: "2026-10-17" },
  { id: "c299", challanNo: "16/10/2026/299", customerName: "Karan Chawla - Karnal", billTo: "G.C. & Company - 06AUMPG8989N1ZJ", billNo: "299", billedAt: "2026-10-16", createdAt: "2026-10-16" },
  { id: "c300", challanNo: "18/10/2026/300", customerName: "New Man", createdAt: "2026-10-18" }];
var ctx = { S: { data: { challans: CH, audit: [], drivers: [{ id: "D1", name: "Sarwan Singh", vehicle: "HR67D1234" }] } },
  esc: function (s) { return String(s == null ? "" : s); }, money: function (v) { return "Rs" + v; }, chValue: function () { return 153335; },
  clientByName: function () { return {}; }, billNameFacts: function () { return []; }, dkey: dk, drvKey: dk,
  billVehNeed: function () { return true; }, isCancelled: function () { return false; }, dmy: function (s) { return s; } };
var F = H.lift("team", ["billAskMap", "billAskOf", "billProfiles", "billPick", "billVehSrc", "billAskDrv", "billAskDrvLine", "billAskNote", "modalBillAsk"], ctx);
var h = F.modalBillAsk("c296");
H.ok("the name he was billed under is a button: G.C. & Company with its GSTIN", /G\.C\. &amp; Company|G\.C\. & Company/.test(h) && /06AUMPG8989N1ZJ/.test(h));
H.ok("...and already picked (the only one)", /<option value="G\.C\. & Company - 06AUMPG8989N1ZJ" selected>/.test(h));
H.ok("+ New billing name is there for another", /\+ New billing name/.test(h));
H.ok("the driver and his vehicle are fetched (register)", /Sarwan Singh/.test(h) && /HR67D1234/.test(h) && /driver’s register/.test(h));
H.ok("the freight is shown", /freight Rs800/.test(h));
H.ok("remarks are optional now", /optional/.test(h));
var n = F.billAskNote("G.C. & Company - 06AUMPG8989N1ZJ", CH[0], "PO 45");
H.eq("the note accounts reads", n, "Bill to: G.C. & Company - 06AUMPG8989N1ZJ\nDelivery: Sarwan Singh · HR67D1234 · freight 800\nPO 45");
var h2 = F.modalBillAsk("c300");
H.ok("a client never billed: + New name open, no driver -> accounts picks him", /Nothing billed for New Man yet/.test(h2) && /No driver on this challan/.test(h2));
ctx.S.data.audit.push({ action: "bill:ask", target: "c296", createdAt: "2026-11-20T10:00:00", actor: "Mukesh", detail: JSON.stringify({ on: 1, note: n, billTo: "Other Name" }) });
var h3 = F.modalBillAsk("c296");
H.ok("re-opened: the name sent is picked, remarks show only the extra", /<option value="Other Name" selected>/.test(h3) && />PO 45<\/textarea>/.test(h3));
H.done();
