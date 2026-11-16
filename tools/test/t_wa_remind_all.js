/* One click: Remind all on WhatsApp (6.9.998) - lifts the real wrmSuggest and checks the button's wiring. */
var H = require("./harness.js");
var F = H.lift("team", ["wrmSuggest"], {});
H.ok("30+ days, a mobile, never reminded: suggested", F.wrmSuggest({ days: 31, num: "919800000000", lastDays: null }));
H.ok("reminded 2 days ago: not suggested", !F.wrmSuggest({ days: 90, num: "919800000000", lastDays: 2 }));
H.ok("no mobile: not suggested", !F.wrmSuggest({ days: 90, num: "", lastDays: null }));
H.ok("29 days: not yet", !F.wrmSuggest({ days: 29, num: "919800000000", lastDays: null }));
var S = H.read("team").replace(/\/\*[\s\S]*?\*\//g, " ");
var i = S.indexOf('if (act === "wrm-all") {'), body = S.slice(i, S.indexOf("\n    }", i));
H.ok("Remind all takes exactly the suggested ones", /wrmRows\(\)\.filter\(wrmSuggest\)/.test(body));
H.ok("…and goes straight into the send walk-through", /wrmSend\(\); return;/.test(body));
H.ok("the button is on the reminders screen and on Today", (S.match(/data-act="wrm-all"/g) || []).length >= 2);
H.done();
