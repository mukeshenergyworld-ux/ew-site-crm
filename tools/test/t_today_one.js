/* 6.9.1019 - one "what needs me today" screen: Today carries My day; the My day key lands on Today. */
var H = require("./harness.js");
var S = H.read("team");
H.ok("Today draws My day's sections in place of its own to-call list", /try \{ h \+= viewMyDay\(\); \}/.test(S) && !/Today: ' \+ todo\.length \+ ' to call/.test(S));
H.ok("the My day chip is out of the Today group", /\["Today",\s+\["dash", "followups", "pending"\]\]/.test(S));
H.ok("the old key still opens the one screen", /if \(S\.tab === "myday"\) S\.tab = "dash";/.test(S) && /myday: "dash",/.test(S));
H.done();
