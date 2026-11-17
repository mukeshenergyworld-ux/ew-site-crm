/* 6.9.1033 - "show click to select for previous bill name, else add new" */
var H = require("./harness.js");
var ctx = { S: { data: { clients: [], audit: [], challans: [
  { id: "a", customerName: "Infinite Constructions", billTo: "Infinite Constructions - 06ADWPL4708R1ZM", billedAt: "2026-11-17" },
  { id: "b", customerName: "Infinite Constructions", billTo: "Rakesh Kumar", billedAt: "2026-10-01" },
  { id: "c", customerName: "Infinite Constructions", billTo: "", createdAt: "2026-09-17" }] } },
  dkey: function (s) { return String(s || "").trim().toLowerCase(); }, clientByName: function () { return { billingJson: "[]" }; },
  esc: function (s) { return String(s); }, billNameFacts: function () { return []; } };
var F = H.lift("team", ["billProfiles", "billPick"], ctx);
var c = ctx.S.data.challans[2];
var pr = F.billProfiles(c);
H.eq("both names his past bills went under are offered, newest first", pr.map(function (p) { return p.name; }).join("|"), "Infinite Constructions|Rakesh Kumar");
H.eq("the GSTIN is read off the past bill", pr[0].gstin, "06ADWPL4708R1ZM");
var h = F.billPick(c, "b", "");
H.ok("each is a button to tap, plus + New", (h.match(/data-act="bpick"/g) || []).length === 3 && /\+ New billing name/.test(h));
H.ok("with two names none is chosen for him, and the new-name boxes stay shut", /<option value="" selected>/.test(h) && /id="b_newbox"[^>]*display:none/.test(h));
var h0 = F.billPick({ customerName: "Nobody" }, "bs", "");
H.ok("a client never billed opens on + New with the boxes open", /value="__new" selected/.test(h0) && !/id="bs_newbox"[^>]*display:none/.test(h0));
H.done();
