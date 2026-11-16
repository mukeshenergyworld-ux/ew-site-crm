/* 6.9.1000 - a master account is tagged as one in every search box, with its site count. */
var H = require("./harness.js");
var ctx = { S: { data: { clients: [
  { name: "Space Constructions - Gurpreet Ji" },
  { name: "Gurpreet Singh - 1397 Sec 25", billedThrough: "Space Constructions - Gurpreet Ji" },
  { name: "Space Construction - MT Site", billedThrough: "space constructions - gurpreet ji " },
  { name: "Space Construction - Sec 12 Site" }] } },
  alpha: function (a, b) { return a < b ? -1 : 1; } };
var F = H.lift("team", ["mstKey", "mstSites"], ctx);
H.eq("the master has its two sites (spelling and case forgiven)", F.mstSites("Space Constructions - Gurpreet Ji").length, 2);
H.eq("a plain client has none, so it keeps its code", F.mstSites("Space Construction - Sec 12 Site").length, 0);
var S = H.read("team").replace(/\/\*[\s\S]*?\*\//g, " ");
var i = S.indexOf("function taShow("), body = S.slice(i, S.indexOf("\n  function ", i + 10));
H.ok("the search panel asks mstSites for every row", /mstSites\(it\.v\)\.length/.test(body));
H.ok("…and draws Master account and the count in place of the code", /Master account &middot; ' \+ _mn \+ ' site'/.test(body) && /: \(_tc \? '<span class="ewc">'/.test(body));
H.done();
