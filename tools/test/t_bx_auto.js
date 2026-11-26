/* CRM 6.9.1064 + Brand Followup 1.3.0 - his words: "check by entering phone no initially, site added by brand executives will
   auto add to our CRM if ... found its there in our record, show him he is our client for which brand and quoted for which brand".
   Lifts the REAL bxBrandsOf, bxLeadsAuto, bxLeadAddNow, bxMatch from the CRM, and reads the Brand app's real source. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var saved = [], decided = [], synced = 0;
var CL = [{ id: "1", name: "Vinay Gupta", code: "CL004", mobile: "9466600611" }, { id: "2", name: "Ram Lal", code: "LD9", mobile: "9800000002" }];
var ctx = {
  S: { user: "Mukesh Verma", data: { clients: CL }, bxLeads: [
    { lid: "L3", at: "2026-11-26T10:03", status: "new", client: "Ram Lal", mobile: "9811112222", bxName: "Naveen", brand: "OYSTER" },            /* name only: waits */
    { lid: "L1", at: "2026-11-26T10:01", status: "new", client: "V Gupta", mobile: "+91 94666 00611", bxName: "Naveen", brand: "OYSTER" },      /* mobile: link */
    { lid: "L2", at: "2026-11-26T10:02", status: "new", client: "Suresh Kumar", mobile: "9800000001", city: "Karnal", bxName: "Naveen", brand: "OYSTER" }, /* new: lead */
    { lid: "L0", at: "2026-11-25T10:00", status: "rejected", client: "Old", mobile: "9800000003" }] },
  roleIs: function (r) { return r === "admin"; }, isCancelled: function () { return false; }, dmy: function (s) { return s; },
  nmTitle: function (s) { return s; }, shortNameOf: function (n) { return n; }, saveClientStage: function () { },
  save: function (tab, row) { saved.push(row); var r = { name: row.name, code: "LD10" }; CL.push({ id: "n", name: row.name, mobile: row.mobile }); return Promise.resolve(r); },
  bxLeadDecide: function (x, st, note, client, noSync) { decided.push([x.lid, st, client, !!noSync]); x.status = st; return Promise.resolve(); },
  bxSyncRun: function () { synced++; return Promise.resolve(); }, render: function () { }, _bxIx: null,
  clientWonBrands: function (n) { return n === "Vinay Gupta" ? ["HT PRO", "Hindware Italian"] : []; },
  brandGroup: function (b) { return /ht pro/i.test(b) ? "HULIOT" : /hindware/i.test(b) ? "HINDWARE" : b; },
  clientQuotes: function (n) { return n === "Vinay Gupta" ? [{ id: "q1", brand: "DRP, HT PRO" }, { id: "q2", brand: "Hindware Italian" }] : []; },
  quoteBrands: function (q) { return String(q.brand).split(/,\s*/); }
};
var F = H.lift("team", ["bxNameKey", "bxMatch", "bxBrandsOf", "bxLeadAddNow", "bxLeadsAuto"], ctx, []);
var b = F.bxBrandsOf("Vinay Gupta");
H.eq("brands bought, as groups", b.w.join(","), "HINDWARE,HULIOT");
H.eq("brands quoted and not bought", b.q.join(","), "DRP");
F.bxLeadsAuto().then(function (n) {
  H.eq("two of three handled by themselves", n, 2);
  H.eq("oldest first: the mobile match is linked to the client on the book", JSON.stringify(decided[0]), JSON.stringify(["L1", "linked", "Vinay Gupta", true]));
  H.eq("the new mobile becomes a lead, owner's", saved.length === 1 && saved[0].name === "Suresh Kumar" && saved[0].ownedBy === "Mukesh Verma" && /added by itself/.test(saved[0].notes), true);
  H.eq("...and he is put on it", JSON.stringify(decided[1]), JSON.stringify(["L2", "accepted", "Suresh Kumar", true]));
  H.ok("a name-only match waits for the owner", ctx.S.bxLeads.filter(function (x) { return x.lid === "L3"; })[0].status === "new");
  H.eq("one send to the brand app at the end", synced, 1);
  var src = H.read("brand/index.html");
  H.ok("brand app: the Add button shows with no site given yet", /No site in your list yet[\s\S]{0,200}addsHtml\(\)/.test(src));
  H.ok("brand app: the mobile is checked first (bxCheck)", /call\("bxCheck"/.test(src) && /data-act="add-chk"/.test(src));
  H.ok("brand app: found shows brands bought and quoted", /Bought from Energy World/.test(src) && /Quoted by Energy World/.test(src));
  var code = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  H.ok("brand app: no download for the brand executive's own screens", !/download/i.test(code.slice(code.indexOf("function viewHome"), code.indexOf("function readFile"))));
  H.done();
});
