/* Tool Tracking app 1.0.0 + CRM 6.9.1037 + Saathi -4 + the field apps' link */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var R = function (p) { return fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8"); };
var t = R("tooltrack/index.html"), c = R("team/app.src.js"), sa = R("saathi/index.html");
H.ok("Tool app 1.1.0: signs in on the tool server with the CRM name + PIN, and keeps that server's token - never the PIN, never the CRM's token", /action: "tkLogin", user: user, pin: pin/.test(t) && /lsPut\(STORE, \{ user: S\.user, tok: S\.tok \}/.test(t) && !/lsPut\([^)]*pin/i.test(t) && !/crmTok|teamAuth|S\.pin/.test(t));
H.ok("Tool app: the name signed in to another Energy World app on the phone is filled in", /ew_team_session/.test(t) && /ew_challan_session/.test(t) && /function sibName\(\)/.test(t));
H.ok("Tool app: a holder is picked from the list, never typed", /Pick the name from the list/.test(t) && /data-act="pk"/.test(t) && /Pick the site from the list, or leave it blank/.test(t));
H.ok("Tool app: several tools can go in one hand-over", /Select several/.test(t) && /tids: m\.tids/.test(t));
H.ok("Tool app: damage carries the site, the man and the amount to recover", /At which site/.test(t) && /By whom \/ who was holding it/.test(t) && /Amount to recover/.test(t) && /Mark recovered/.test(t));
H.ok("Tool app: only the owner and accounts see the Tool list tab", /concat\(boss\(\) \? \[\["list", "Tool list"\]\] : \[\]\)/.test(t));
H.ok("Tool app: a sticker's link opens its tool later (?t=EWT-001)", /\[\?&\]t=/.test(t));
H.ok("Tool app: the version is at the top", /v' \+ APP_VERSION \+ \(S\.busy/.test(t));
H.ok("CRM 6.9.1038: Tools opens the app; the owner's CRM sends the names every 2 hours through the owner check, no phone in them", /href="\.\.\/tooltrack\/"/.test(c) && /action: "tkAdmin", op: "dirSync"/.test(c) && /function tkDaily\(\)/.test(c) && /try \{ tkDaily\(\); \}/.test(c) && !/mobile/.test(c.slice(c.indexOf("  function tkDir()"), c.indexOf("  function tkDirSend("))));
["challan", "visit", "service"].forEach(function (a) { H.ok(a + ": the menu opens Tool Tracking", /href="\.\.\/tooltrack\/"/.test(R(a + "/index.src.html"))); });
H.ok("Saathi -4: a partner sees the tools in his name; staff see them when they open him", /call\('tkMine', ref \? \{ refId: ref, refName: name \|\| '' \} : null/.test(sa) && /var h = toolsCard\(\);/.test(sa) && /toolsLoad\(ref, p\.name\)/.test(sa));
H.done();
