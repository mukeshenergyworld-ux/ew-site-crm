/* 6.9.1024 - the Saathi book carries the CRM's ongoing sites, by the CRM's own rule, not only the sites with incentive. */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var sites = [
  { id: "s1", name: "Amrik", client: "Amrik", stage: "Final Fitout / Handover", architect: "Roshan Lal - Radiant", status: "Active" },
  { id: "s2", name: "Sachin", client: "Sachin", stage: "Structure / Slab", architect: "Roshan Lal - Radiant", status: "Active" },
  { id: "s3", name: "Old Villa", client: "Gopal", stage: "Post-Handover / AMC", architect: "Roshan Lal - Radiant", status: "Active" }];
var ctx = { S: { user: "Mukesh Verma", data: { sites: sites, clients: [] } },
  clubYear: function () { return "2026"; }, clubScheme: function () { return { tiers: [] }; }, clubRewards: function () { return {}; }, clubRowOf: function () { return { tierK: "", coll: 0, earned: 0, next: null, gap: 0, menu: [] }; }, clubJoined: function () { return null; }, localDay: function (s) { return String(s).slice(0, 10); },
  dkey: function (x) { return String(x || "").trim().toLowerCase(); },
  siteFoldFam: function (l) { return l; },
  dupFamily: function (n) { return [n]; }, clientByName: function () { return null; }, isCancelled: function () { return false; },   /* 6.9.1029 - saathiSiteKind */
  pevSupport: function () { return []; },
  assocLive: function () { return [{ id: "AS-1", name: "Roshan Lal - Radiant", role: "Architect", ownedBy: "Mukesh Verma", location: "Panipat" }]; },
  partnerBook: function () { return { rows: [{ client: "Sachin", site: "", inc: 500, rel: 0, ymd: "2026-11-01" }], earned: 500, payable: 0, paid: 0, pending: 0 }; } };
ctx.S.data.challans = [{ customerName: "Sachin" }]; ctx.S.data.pitch = []; ctx.S.data.quotes = [];
var F = H.lift("team", ["partnerSiteIdx", "partnerSiteRows", "partnerOngoing", "saathiSiteKind", "saathiBooks", "incWaitTotal"], ctx, ["PS_DONE", "_psIdx", "_psKey"]);
var b = F.saathiBooks()[0];
var on = b.sites.filter(function (x) { return x.on; });
H.eq("the two ongoing sites the CRM counts are on the book; the handed-over one is not", on.map(function (x) { return x.n; }).sort().join(","), "Amrik,Sachin");
H.ok("Amrik has no material yet: carried with 0 points and its stage", on.some(function (x) { return x.n === "Amrik" && x.e === 0 && /Fitout/.test(x.stage); }));
H.ok("Sachin keeps its incentive and is marked ongoing", on.some(function (x) { return x.n === "Sachin" && x.e === 500; }));
H.ok("6.9.1029: the handed-over site with no delivery goes as a Lead, not ongoing", b.sites.some(function (x) { return x.n === "Gopal — Old Villa" && x.k === "lead" && !x.on; }));
H.ok("6.9.1029: Sachin has a delivery, so he is a Client; Amrik has none, so he is a Lead", b.sites.filter(function (x) { return x.n === "Sachin"; })[0].k === "client" && b.sites.filter(function (x) { return x.n === "Amrik"; })[0].k === "lead");
var sa = fs.readFileSync(path.join(__dirname, "..", "..", "saathi", "index.html"), "utf8");
H.ok("Saathi: a site the CRM says is on is Ongoing, and says No material yet", /if \(x\.on\) return true;/.test(sa) && /No material yet/.test(sa));
H.done();
