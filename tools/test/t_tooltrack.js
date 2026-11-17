/* Tool Tracking app 1.0.0 + CRM 6.9.1037 + Saathi -4 + the field apps' link */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var R = function (p) { return fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8"); };
var t = R("tooltrack/index.html"), c = R("team/app.src.js"), sa = R("saathi/index.html");
H.ok("Tool app: signs in with the CRM's own name + PIN, and keeps the token - never the PIN", /action: "teamAuth", user: user, pin: pin, keep: 1/.test(t) && /lsPut\(STORE, \{ user: S\.user, tok: S\.tok/.test(t) && !/lsPut\([^)]*pin/i.test(t));
H.ok("Tool app: a man signed in to the CRM / Challan / Visit / Service app is offered one tap", /ew_team_session/.test(t) && /ew_challan_session/.test(t) && /ew_vq_session/.test(t) && /ew_service_session/.test(t) && /Continue as /.test(t));
H.ok("Tool app: a holder is picked from the list, never typed", /Pick the name from the list/.test(t) && /data-act="pk"/.test(t) && /Pick the site from the list, or leave it blank/.test(t));
H.ok("Tool app: several tools can go in one hand-over", /Select several/.test(t) && /tids: m\.tids/.test(t));
H.ok("Tool app: damage carries the site, the man and the amount to recover", /At which site/.test(t) && /By whom \/ who was holding it/.test(t) && /Amount to recover/.test(t) && /Mark recovered/.test(t));
H.ok("Tool app: only the owner and accounts see the Tool list tab", /concat\(boss\(\) \? \[\["list", "Tool list"\]\] : \[\]\)/.test(t));
H.ok("Tool app: a sticker's link opens its tool later (?t=EWT-001)", /\[\?&\]t=/.test(t));
H.ok("Tool app: the version is at the top", /v' \+ APP_VERSION \+ \(S\.busy/.test(t));
H.ok("CRM 6.9.1037: Tools opens the app; the owner's CRM sends the names once a day, no phone in them", /href="\.\.\/tooltrack\/"/.test(c) && /function tkDaily\(\)/.test(c) && /try \{ tkDaily\(\); \}/.test(c) && !/mobile/.test(c.slice(c.indexOf("  function tkDir()"), c.indexOf("  function tkDirSend("))));
["challan", "visit", "service"].forEach(function (a) { H.ok(a + ": the menu opens Tool Tracking", /href="\.\.\/tooltrack\/"/.test(R(a + "/index.src.html"))); });
H.ok("Saathi -4: a partner sees the tools in his name; staff see them when they open him", /call\('tkMine', ref \? \{ refId: ref, refName: name \|\| '' \} : null/.test(sa) && /var h = toolsCard\(\);/.test(sa) && /toolsLoad\(ref, p\.name\)/.test(sa));
H.done();
