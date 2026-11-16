/* 6.9.1010 - Items supplied: lifts the real suppliedRows and adds a client's deliveries up item by item. */
var H = require("./harness.js");
var chs = [
  { id: "c1", customerName: "A", status: "Received", challanNo: "1", itemsJson: JSON.stringify([{ code: "P1", desc: "Pipe", brand: "X", qty: 10 }, { code: "M-1", desc: "old total", qty: 1 }]) },
  { id: "c2", customerName: "a ", status: "Dispatched", challanNo: "2", itemsJson: JSON.stringify([{ code: "P1", qty: 5 }]) },
  { id: "c3", customerName: "A", status: "Draft", challanNo: "3", itemsJson: JSON.stringify([{ code: "P1", qty: 99 }]) },
  { id: "c4", customerName: "A", status: "Received", challanNo: "4", itemsJson: JSON.stringify([{ code: "P1", qty: 7 }]) },
  { id: "c5", customerName: "Alias of A", status: "Received", challanNo: "5", itemsJson: JSON.stringify([{ code: "W9", desc: "WC", brand: "Y", qty: 1 }]) }];
var ctx = { S: { data: { challans: chs, returns: [{ id: "r1", customerName: "A", status: "Received", itemsJson: JSON.stringify([{ code: "P1", qty: 3 }]) }, { id: "r2", customerName: "A", status: "Pending", itemsJson: JSON.stringify([{ code: "P1", qty: 50 }]) }] } },
  dupFamily: function (n) { return [n, "Alias of A"]; }, mstSites: function () { return []; }, dkey: function (s) { return String(s || "").trim().toLowerCase(); },
  prodByCode: function () { return null; }, realBrand: function () { return ""; }, isCancelled: function (t, id) { return id === "c4"; },
  isJobLine: function () { return false; }, inHisab: function (c) { return c.id === "c1" || c.id === "c5"; }, isManualLine: function (l) { return /^M-/.test(l.code || ""); } };
var F = H.lift("team", ["suppliedRows"], ctx);
var R = F.suppliedRows("A"), p1 = R.filter(function (r) { return r.code === "P1"; })[0];
H.eq("sent adds finalised deliveries only (10), not one still to finalise, a draft or a cancelled one", p1.sent, 10);
H.eq("a received return comes off; a pending one does not", p1.back, 3);
H.eq("the challans it went on - finalised ones", p1.chs.join(","), "1");
H.ok("a line typed as a money total is not an item", !R.some(function (r) { return /^M-/.test(r.code); }));
H.ok("a name he was merged under counts too", R.some(function (r) { return r.code === "W9"; }));
var S = H.read("team");
H.ok("the HISAB carries the button", /data-act="sup-pdf" data-n="/.test(S) && /act === "sup-pdf"/.test(S));
H.done();
