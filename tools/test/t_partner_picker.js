/* 6.9.1025 - the partner picker: number on every option, one search over name / number / mobile / town; coloured category tags. */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var assoc = [
  { id: "a1", name: "Roshan Lal - Radiant", role: "Architect", code: "AR001", mobile: "9896943434", location: "Panipat" },
  { id: "a2", name: "Roshan Lal", role: "Plumber", code: "PL002", mobile: "8053141561", location: "Sonipat" },
  { id: "a3", name: "Suresh - Snp", role: "Builder", code: "BL014", mobile: "9000000001", location: "Sonipat" },
  { id: "a4", name: "Sachin - Snp", role: "PMC", code: "PMC001", mobile: "9000000002", location: "Sonipat" }];
var ctx = { tkHeldTag: function (a) { return a && a.name === "Ramesh Plumber" ? "2 tools with him" : ""; }, S: { data: { associates: assoc, clients: [], sites: [] } }, esc: function (x) { return String(x); }, alpha: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; },
  partnerLabel: function (r) { return r === "architect" ? "Architects" : r === "plumber" ? "Plumbers" : r === "builder" ? "Builders" : "PMCs"; },
  partnerNames: function () { return { named: [], unknown: [] }; }, ppkLoc: function (a) { return String(a.location || ""); } };
var F = H.lift("team", ["ppkLabel", "ppkHit", "ppkOptions", "partnerAnyOptions"], ctx);
var all = F.ppkOptions("architect", "", "", true, "", "client", "");
H.ok("every option reads number · name · town", /AR001 · Roshan Lal - Radiant · Panipat/.test(all) && /PL002 · Roshan Lal · Sonipat/.test(F.ppkOptions("plumber", "", "", true, "", "client", "")));
H.ok("the value stays the plain name", /value="Roshan Lal - Radiant"/.test(all));
H.ok("6.9.1026: the architect slot offers architects only - no plumber, no Other partners group", !/PL002/.test(all) && !/Other partners/.test(all) && /AR001/.test(all));
var byCode = F.ppkOptions("builder", "Panipat", "", true, "", "client", "bl014");
H.ok("typing a number finds him in any district", /Suresh - Snp/.test(byCode) && !/Roshan/.test(byCode));
H.ok("a builder's number typed in the plumber slot finds nobody, and says so", /No plumber matches/.test(F.ppkOptions("plumber", "", "", true, "", "client", "bl014")));
var byMob = F.ppkOptions("plumber", "", "", true, "", "client", "1415");
H.ok("part of a mobile finds him", /value="Roshan Lal"/.test(byMob) && !/Radiant/.test(byMob));
var byTown = F.ppkOptions("builder", "", "", true, "", "client", "sonipat snp");
H.ok("two words: both must match (town + name part), his trade only", /Suresh - Snp/.test(byTown) && !/Sachin - Snp/.test(byTown) && !/Roshan Lal · Sonipat/.test(byTown));
var none = F.ppkOptions("builder", "", "", true, "", "client", "zzz");
H.ok("nothing matching says so and still offers Add new", /No builder matches/.test(none) && /__new__/.test(none));
H.ok("the referral list carries the numbers too", /PMC001 · Sachin - Snp · Sonipat/.test(F.partnerAnyOptions("")));
var src = fs.readFileSync(path.join(__dirname, "..", "..", "team", "app.src.js"), "utf8");
H.ok("the tag wears its category's colour", /\.ewc-AR\{/.test(src) && /\.ewc-PL\{/.test(src) && /\.ewc-BL\{/.test(src) && /\.ewc-PMC\{/.test(src) && /\.ewc-EX\{/.test(src) && /s\.className = "ewc ewc-" \+/.test(src));
H.ok("executives are tagged EX + user number", /ewcPut\(u\.name, "EX" \+/.test(src));
H.ok("every picker has the search box and it refills the list", /class="ppk-q"/.test(src) && /classList\.contains\("ppk-q"\)/.test(src));
H.done();
