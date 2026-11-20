/* CRM 6.9.1050 - a new lead asks the mobile first and says who already has it. Lifts the REAL mobHits and mobChkHtml. */
var H = require("./harness.js");
var ctx = { S: { data: {
    clients: [{ id: "c1", code: "EW101", name: "Ashish Bhuker", mobile: "+91 81683 06759", ownedBy: "Rajiv", createdAt: "2026-10-01", stage: "Plumbing" }],
    sites: [{ id: "s1", name: "Sector 13 house", client: "Ashish Bhuker", mobile: "8168306759", createdBy: "Imran", createdAt: "2026-10-05" }],
    associates: [{ id: "a1", code: "PL07", name: "Ramesh", role: "Plumber", mobile: "9813562642" }],
    team: [{ name: "Sonu", role: "sales", mobile: "9999900000" }] } },
  isCancelled: function () { return false; }, esc: function (s) { return String(s == null ? "" : s); }, dmy: function (s) { return s; } };
var F = H.lift("team", ["mobHits", "mobChkHtml"], ctx);
var L = F.mobHits("8168306759", "");
H.eq("client and site both found (a +91 number matches)", L.map(function (x) { return x.kind; }).join(","), "client,site");
var h = F.mobChkHtml("8168306759", "");
H.ok("says Already registered, the name and who entered it", /Already registered/.test(h) && /EW101 Ashish Bhuker/.test(h) && /by <b>Rajiv<\/b>/.test(h) && /by <b>Imran<\/b>/.test(h));
H.ok("a partner's number is called out", /Not a client/.test(F.mobChkHtml("9813562642", "")) && /PL07 Ramesh/.test(F.mobChkHtml("9813562642", "")));
H.ok("a staff number is called out", /our staff member/.test(F.mobChkHtml("9999900000", "")));
H.ok("a new number says so", /New mobile/.test(F.mobChkHtml("7000000000", "")));
H.ok("short number counts digits", /7 of 10/.test(F.mobChkHtml("8168306", "")));
H.done();
