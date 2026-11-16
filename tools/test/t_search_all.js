/* 6.9.1017 - the top search looks everywhere: lifts the real uniHits / recHay / srchSnip. */
var H = require("./harness.js");
var data = {
  clients: [{ name: "Dr Kanav Gupta", billingJson: "[]" }, { name: "Other Man", billingJson: "[]" }],
  challans: [
    { id: "c1", challanNo: "397", customerName: "Dr Kanav Gupta", billNo: "EW/1234", billTo: "Gupta Healthcare Pvt Ltd - 06ABCDE1234F1Z5", billedBy: "Gautam", createdAt: "2026-11-11", itemsJson: JSON.stringify([{ code: "ST1", desc: "SS Elbow Both Side Female 35" }]) },
    { id: "c2", challanNo: "400", customerName: "Other Man", createdAt: "2026-11-12", itemsJson: JSON.stringify([{ code: "D9", desc: "DRP NRV 32" }]), picUrl: "https://drive.google.com/x" }],
  quotes: [], sites: [], payments: [], drivers: [], associates: [], team: [],
  returns: [{ id: "r1", customerName: "Other Man", reason: "leaking valve", createdAt: "2026-11-13" }],
  audit: [{ action: "bill:ask", target: "c2", createdAt: "2026-11-14", actor: "Mukesh", detail: JSON.stringify({ on: 1, note: "bill to Shree Balaji Traders" }) }] };
var ctx = { S: { data: data }, PRODUCTS: [], clientHay: function (c) { return String(c.name).toLowerCase(); }, manualNoFor: function () { return ""; },
  canSee: function () { return false; }, dkey: function (x) { return String(x || "").trim().toLowerCase(); }, esc: function (x) { return String(x); },
  billAskMap: function () { return { c2: { on: true, note: "bill to Shree Balaji Traders" } }; } };
var F = H.lift("team", ["recHay", "srchBillNotes", "uniHits", "srchSnip"], ctx, ["SRCH_MORE"]);
var o = F.uniHits("healthcare");
H.eq("the name a bill was raised under finds the bill", o.bills.map(function (c) { return c.billNo; }).join(","), "EW/1234");
H.eq("and the client it was billed for, though his own name does not match", o.clients.map(function (c) { return c.name; }).join(","), "Dr Kanav Gupta");
H.eq("the bill's GSTIN finds it too", F.uniHits("06abcde").bills.length, 1);
H.eq("an item on a challan finds the challan", F.uniHits("nrv 32").challans.map(function (c) { return c.challanNo; }).join(","), "400");
H.eq("billing remarks find the challan", F.uniHits("balaji").challans.map(function (c) { return c.challanNo; }).join(","), "400");
H.eq("a return is searched", F.uniHits("leaking").more.length, 1);
H.eq("a link is not a word: 'drive' does not find the Drive link", F.uniHits("drive.google").challans.length, 0);
H.ok("a hit says why, with the word marked", /<b style="background:#fef9c3">Balaji<\/b>/.test(F.srchSnip("bill to Shree Balaji Traders", "balaji")));
H.done();
