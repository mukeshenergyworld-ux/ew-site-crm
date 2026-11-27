/* Visit & Quote 1.28.0 / CRM 6.9.1065 - his words: "daily visit log with site pic and site location, area wise site details and
   visit log, site location at the time of visit entry, nearby sites, type model town and see how many sites visited and entered,
   sale this month, collection this month, total pending ... show executive score ... salary X 4 time ... timely payment".
   Lifts the REAL vlogItems, arKey, arOfSite, arIndex, pkvPaint-free helpers from the Visit app and xCollPend from the CRM. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var ME = "Ashish";
var sites = [{ id: "S1", name: "Kothi 214", client: "Vinay", city: "Model Town", location: "Panipat", createdBy: ME },
  { id: "S2", name: "Garg House", client: "Kamal", city: "model  town", createdBy: ME },
  { id: "S3", name: "Other", client: "Ram", city: "Sector 11", createdBy: "Vivek" }];
var visits = [{ siteId: "S1", createdBy: ME, createdAt: "2026-11-27T04:40:00Z", lat: 29.39, lng: 76.97, verified: "Verified" },
  { siteId: "S1", createdBy: ME, createdAt: "2026-11-10T04:40:00Z" }, { siteId: "S2", createdBy: ME, createdAt: "2026-11-27T07:10:00Z" },
  { siteId: "S3", createdBy: "Vivek", createdAt: "2026-11-27T07:10:00Z" }];
var audit = [{ action: "visit:photo", actor: ME, createdAt: "2026-11-27T04:42:00Z", detail: JSON.stringify({ siteId: "S1", url: "u1", thumb: "t", by: ME }) },
  { action: "visit:photo", actor: ME, createdAt: "2026-11-26T04:42:00Z", detail: JSON.stringify({ siteId: "S1", url: "u0", by: ME }) },
  { action: "visit:mark", actor: ME, createdAt: "2026-11-27T09:00:00Z", detail: JSON.stringify({ kind: "plumber", who: "Ramesh", lat: 29.4, lng: 76.9 }) }];
var ctx = {
  S: { data: { sites: sites, sitevisits: visits, audit: audit, clients: [] }, user: ME, ex: "" },
  roleIs: function () { return false; }, isMe: function (n) { return dk(n) === dk(ME); }, exOk: function () { return true; },
  dstr: function (v) { return String(v || "").slice(0, 10); }, dkey: dk, lower: dk, alpha: function (a, b) { return String(a).localeCompare(String(b)); },
  siteById: function (id) { return sites.filter(function (s) { return s.id === id; })[0] || null; }, clientByName: function () { return null; },
  isCancelled: function () { return false; }, siteOwner: function (st) { return { by: st.createdBy }; },
  vlVisits: function (st) { return visits.filter(function (v) { return v.siteId === st.id; }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }); }
};
var F = H.lift("visit", ["vlogWho", "vlogItems", "arKey", "arOfSite", "arVisMine", "arEntMine", "arSites", "arIndex"], ctx, []);
var L = F.vlogItems("2026-11-27");
H.eq("the day's log: his three visits, not Vivek's", L.length, 3);
H.eq("a site visit carries where it was marked and 'at the site'", L[0].lat === 29.39 && L[0].ver === "Verified", true);
H.eq("...and only that day's photo of that site", L[0].pics.length === 1 && L[0].pics[0].url === "u1", true);
H.eq("a plumber visit is in the log with its location", L.filter(function (o) { return o.kind === "plumber" && o.lat; }).length, 1);
var A = F.arIndex();
var mt = A.filter(function (g) { return g.k === "model town"; })[0];
H.eq("'Model Town' and 'model  town' are one area", !!mt && mt.sites.length === 2, true);
H.eq("Model Town: 2 entered by him, 2 visited, 3 visits", [mt.ent, mt.vis, mt.nv].join(","), "2,2,3");
H.ok("Vivek's site is not in his areas", !A.some(function (g) { return g.k === "sector 11"; }));
var src = H.read("visit/index.src.html"), code = src.replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("first visit with GPS fixes the site's location", /var _setLoc = !\(Number\(st\.lat\) && Number\(st\.lng\)\) && !!g\.lat/.test(code) && /setLocation: _setLoc/.test(code));
H.ok("near me looks 1 km round, nearest first", /m > 1000/.test(code) && /S\.nearD\[a\.id\] - S\.nearD\[b\.id\]/.test(code));
H.ok("Areas is a tab", /\["area", "&#128506;", "Areas"\]/.test(code) && /t === "area" \? viewArea\(\)/.test(code));
H.ok("partner drop-down by the first digits of the mobile", /mob10\(m\)\.indexOf\(dig\) === 0/.test(code));
H.ok("My day: month table, score, plan with payment speed", /vTopTable\(\) \+/.test(code) && /vScoreCard\(_w\) \+ vPlanCard\(_w\)/.test(code));
H.ok("the plan shows slabs as multiples of salary, never the salary", /m \+ ' &times; salary/.test(code) && !/\.sal\b/.test(code.slice(code.indexOf("function vPlanCard"), code.indexOf("function vlogWho"))));
var crm = H.read("team/app.src.js").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("CRM: the snapshot carries collection, pending, score and payment speed", /sn\.coll = Math\.round/.test(crm) && /sn\.sc = \{ s: Math\.round\(sc\.score\)/.test(crm) && /sn\.sp = \{ net:/.test(crm));
H.ok("CRM: no salary in the snapshot", !/sn\.p\.(sal|salary)\b/.test(crm) && !/sn\.(sal|salary)\b/.test(crm));
H.done();
