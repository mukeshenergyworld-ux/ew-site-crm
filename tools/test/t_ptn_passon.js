/* 6.9.1026 - a partner changed from the start: every finalised delivery of the client is re-lined to him, nothing deleted. */
var H = require("./harness.js");
var stamps = {
  c1: { set: ["Heliroma"], ignored: [], inc: [{ role: "architect", name: "Roshan Lal" }, { role: "exec", name: "Mukesh Verma" }], extra: 0, extraNote: "", noProof: "", offBrand: "" },
  c2: { set: [], ignored: [], inc: [{ role: "exec", name: "Mukesh Verma" }], extra: 500, extraNote: "cash", noProof: "lost", offBrand: "" },
  c3: { set: [], ignored: [], inc: null, extra: 0 },
  c4: { set: [], ignored: [], inc: [{ role: "architect", name: "Roshan Lal - Radiant" }], extra: 0, extraNote: "", noProof: "", offBrand: "" } };
var written = [], audits = [];
var ctx = { S: { user: "Mukesh Verma", data: { challans: [
    { id: "c1", challanNo: "N/001", customerName: "Nitin Jain", createdAt: "2026-08-03T10:00:00Z" },
    { id: "c2", challanNo: "N/002", customerName: "Nitin Jain", createdAt: "2026-09-01T10:00:00Z" },
    { id: "c3", challanNo: "N/003", customerName: "Nitin Jain", createdAt: "2026-11-12T10:00:00Z" },
    { id: "c4", challanNo: "N/004", customerName: "Nitin  Jain", createdAt: "2026-10-01T10:00:00Z" },
    { id: "x1", challanNo: "X/001", customerName: "Somebody Else", createdAt: "2026-07-01T10:00:00Z" }], clients: [{ name: "Nitin Jain", createdAt: "2026-08-01T00:00:00Z" }] } },
  dkey: function (x) { return String(x || "").trim().toLowerCase(); }, today: function () { return "2026-11-17"; },
  localDay: function (v) { return String(v || "").slice(0, 10); }, dupFamily: function (n) { return ["Nitin Jain", "Nitin  Jain"]; },
  clientByName: function (n) { return ctx.S.data.clients[0]; }, chIncStamp: function (c) { var st = stamps[c.id]; return st && st.inc ? st.inc : null; },
  hisabStamp: function (c) { return stamps[c.id] || null; },
  hisabStampSave: function (c, set, ign, x) { written.push({ id: c.id, set: set, ign: ign, x: x }); return Promise.resolve(1); },
  save: function (tab, row) { audits.push(row); return Promise.resolve(row); }, bustCaches: function () { }, incRoleLabel: function (r) { return r; }, esc: function (x) { return String(x); } };
var F = H.lift("team", ["ptnStartDay", "ptnStampedCount", "ptnPassOn"], ctx, ["_hsbCache"]);
H.eq("the start is the client's first delivery day, merged names included", F.ptnStartDay("Nitin Jain"), "2026-08-03");
H.eq("finalised deliveries of the family: three carry a line-up", F.ptnStampedCount("Nitin Jain", "architect"), 3);
F.ptnPassOn("Nitin Jain", "architect", "Roshan Lal", "Roshan Lal - Radiant").then(function (n) {
  H.eq("two re-lined: the one with the wrong man and the one with no architect; the one already right is left alone", n, 2);
  var w1 = written.filter(function (w) { return w.id === "c1"; })[0], w2 = written.filter(function (w) { return w.id === "c2"; })[0];
  H.ok("c1: architect renamed, executive kept, brands kept", w1 && w1.x.inc[0].name === "Roshan Lal - Radiant" && w1.x.inc[1].name === "Mukesh Verma" && w1.set[0] === "Heliroma");
  H.ok("c2: architect added; extra discount, its note and the no-receipt reason carried as they were", w2 && w2.x.inc.length === 2 && w2.x.inc[1].role === "architect" && w2.x.extra === 500 && w2.x.extraNote === "cash" && w2.x.noProof === "lost");
  H.ok("the unstamped delivery and the other client are not touched", !written.some(function (w) { return w.id === "c3" || w.id === "x1"; }));
  var a = audits.filter(function (r) { return r.action === "ptn:passon"; })[0], d = a && JSON.parse(a.detail);
  H.ok("one ptn:passon row names the deliveries moved and the start day", d && d.challans.join(",") === "N/001,N/002" && d.from === "2026-08-03" && d.was === "Roshan Lal");
  H.done();
});
