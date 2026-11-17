/* 6.9.1021 - the page-wide code tagger: a joined duplicate keeps the main row's code; two unjoined same-name rows stay untagged. */
var H = require("./harness.js");
var S = H.read("team");
var a = S.indexOf("function ewcBuild()"), b = S.indexOf("function ewcSkip(el)");
var src = S.slice(a, b);
var MAP = null, KEY = "", SHORT = {};
var mk = function (data) { MAP = null; KEY = ""; var f = new Function("ewcLow", "ewcData", "MAPREF", src.replace("var d = ewcData();", "var d = ewcData(); MAP = null; KEY = '';") + "\nreturn ewcBuild();");
  return f(function (s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); }, function () { return data; }, null); };
var vin = [{ id: "A", name: "Vinay Gupta", code: "CL072" }, { id: "B", name: "Vinay Gupta", code: "CL073" }, { id: "C", name: "Modern Plumbing Solutions", code: "CL074" }];
var joined = { clients: vin, associates: [], team: [], audit: [{ action: "dup:fix", detail: JSON.stringify({ main: "A", mainName: "Vinay Gupta", aliases: [{ id: "B", name: "Vinay Gupta" }] }) }] };
var m1 = mk(joined);
H.eq("joined duplicate: the main row's code wins", m1["vinay gupta"], "CL072");
H.eq("other clients unaffected", m1["modern plumbing solutions"], "CL074");
var m2 = mk({ clients: vin, associates: [], team: [], audit: [] });
H.eq("two rows nobody joined: still ambiguous, no tag", m2["vinay gupta"], undefined);
var m3 = mk({ clients: vin, associates: [], team: [], audit: [{ action: "dup:fix", detail: JSON.stringify({ main: "B", aliases: [{ id: "A" }] }) }] });
H.eq("joined the other way: that main's code wins", m3["vinay gupta"], "CL073");
H.done();
