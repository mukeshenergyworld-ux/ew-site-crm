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

/* 6.9.1006 - a master account is reminded once, with the combined statement */
var R = H.read("team"), wl = H.fnOf(R, "wrmLink");
H.ok("a master's reminder carries the combined statement", /r\.sites \? masterPdf\(r\.name\) : hisabPdf\(r\.name, false, false\)/.test(wl));
var G = H.lift("team", ["wrmClientText"], { wrmMsg: function () { return "MSG"; } });
H.ok("…and the link says it is all his sites", /combined statement, all 4 sites/.test(G.wrmClientText({ sites: 4 }, "http://x")));
H.ok("a plain client still gets his hisab", /Your hisab \(PDF\)/.test(G.wrmClientText({ sites: 0 }, "http://x")));
H.ok("the reminder list is built on rdrRows, which folds sites under their master (mstFold)", /var out = mstFold\(payLedgerList\(\)\)/.test(H.fnOf(R, "rdrRows")) && /rows = rdrRows\(\)/.test(H.fnOf(R, "wrmRows")));
H.done();
