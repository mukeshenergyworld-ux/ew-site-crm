/* Visit & Quote 1.25.0 - "first we have to enter mobile no, if its duplicate it will show its already registered with such name and by this executive".
   Lifts the REAL dupByMobile, dupHtml, siteNewSheet and clNewSheet. */
var H = require("./harness.js");
var ctx = {
  S: { user: "Imran", data: {
    sites: [{ id: "s1", name: "Model Town house", client: "Ashish Bhuker", mobile: "8168306759", createdBy: "Rajiv", createdAt: "2026-10-02", stage: "Plumbing" },
            { id: "s2", name: "Old site", client: "Gone", mobile: "9000000001", createdBy: "Rajiv", createdAt: "2026-09-01" }],
    clients: [{ id: "c1", code: "EW101", name: "Ashish Bhuker", mobile: "8168306759", ownedBy: "Imran", createdAt: "2026-10-01" }],
    associates: [{ id: "a1", code: "PL07", name: "Ramesh Plumber", role: "Plumber", mobile: "9813562642" }],
    team: [{ name: "Sonu", role: "sales", mobile: "9999900000" }] } },
  mob10: function (m) { var d = String(m || "").replace(/\D/g, ""); return d.length > 10 ? d.slice(-10) : d; },
  isCancelled: function (t, id) { return id === "s2"; },
  siteOwner: function (st) { return { by: st.createdBy, at: st.createdAt }; },
  esc: function (s) { return String(s == null ? "" : s); }, fd: function (s) { return s; },
  dl: function () { return ""; }, districts: function () { return []; }, areasFor: function () { return []; },
  partners: function () { return []; }, stageOpts: function () { return ""; }, myClients: function () { return []; }, STAGES: [], stages: function () { return []; }
};
var F = H.lift("visit", ["dupByMobile", "dupHtml", "siteNewSheet", "clNewSheet"], ctx, []);
var d = F.dupByMobile("8168306759");
H.eq("a number on a site and a client - both found", d.map(function (x) { return x.kind; }).join(","), "site,client");
H.ok("the card names him and who entered it", /Ashish Bhuker/.test(F.dupHtml(d)) && /by <b>Rajiv<\/b>/.test(F.dupHtml(d)) && /by <b>Imran<\/b>/.test(F.dupHtml(d)));
H.ok("the site has an Open button", /data-act="site-open" data-id="s1"/.test(F.dupHtml(d)));
var p = F.dupByMobile("9813562642");
H.eq("a partner's number is found", p.length && p[0].kind, "partner");
H.ok("and called out as not a client's number", /not a client/.test(F.dupHtml(p)) && /owner’s own mobile/.test(F.dupHtml(p)));
H.eq("a staff member's number is found", F.dupByMobile("9999900000")[0].kind, "staff");
H.eq("a cancelled site is not counted", F.dupByMobile("9000000001").length, 0);
H.eq("a new number - nothing", F.dupByMobile("7000000000").length, 0);
ctx.S.sn = { mobile: "81683" };
var h1 = F.siteNewSheet();
H.ok("new site opens with the mobile alone", /id="sn_mob"/.test(h1) && !/id="sn_name"/.test(h1));
ctx.S.sn = { mobile: "8168306759" };
var h2 = F.siteNewSheet();
H.ok("10 digits - the rest of the form appears, mobile on top", h2.indexOf('id="sn_mob"') >= 0 && h2.indexOf('id="sn_mob"') < h2.indexOf('id="sn_name"'));
ctx.S.cn = {};
H.ok("new client opens with the mobile alone", /id="cn_mob"/.test(F.clNewSheet()) && !/id="cn_name"/.test(F.clNewSheet()));
ctx.S.cn = { mobile: "7000000000" };
H.ok("10 digits - name and the rest appear", /id="cn_name"/.test(F.clNewSheet()));
H.done();
