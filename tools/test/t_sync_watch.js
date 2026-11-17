/* 6.9.1020 - the sync watchdog: a 5-minute-old book on a visible tab pulls through refresh(), whatever guard is held. */
var H = require("./harness.js");
var calls = [], notes = [];
var ctx = { document: { hidden: false, addEventListener: function () { } }, S: { user: "M", data: {}, pending: 1 }, syncAt: Date.now() - 6 * 60000, _moving: 1, syncing: true, _beatBusy: true,
  pendCount: function () { return 2; }, logCrash: function (w, e) { notes.push(e.message); }, refresh: function () { calls.push("refresh"); }, setInterval: function () { return 1; } };
var F = H.lift("team", ["syncWatch"], ctx, ["WATCH_STALE_MS", "_watchOn", "_watchLast"]);
F.syncWatch();
H.eq("a stale book is pulled even with a save, a move, a sync and a heartbeat all 'in flight'", calls.join(","), "refresh");
H.ok("and the crash log says what was holding it", /pending=1 moving=1 syncing beatBusy journal=2/.test(notes[0] || ""));
F.syncWatch();
H.eq("not pulled twice in the same stale spell", calls.length, 1);
var ctx2 = Object.assign({}, ctx, { syncAt: Date.now() - 60000 }); calls.length = 0;
H.lift("team", ["syncWatch"], ctx2, ["WATCH_STALE_MS", "_watchOn", "_watchLast"]).syncWatch();
H.eq("a fresh book is left alone", calls.length, 0);
var ctx3 = Object.assign({}, ctx, { document: { hidden: true, addEventListener: function () { } } }); calls.length = 0;
H.lift("team", ["syncWatch"], ctx3, ["WATCH_STALE_MS", "_watchOn", "_watchLast"]).syncWatch();
H.eq("a hidden tab is left alone", calls.length, 0);
var B = H.lift("team", ["bookAge"], {});
H.eq("the header goes amber at 10 minutes", B.bookAge(Date.now() - 11 * 60000).tone, "warn");
H.eq("and red at 30", B.bookAge(Date.now() - 31 * 60000).tone, "bad");
H.done();
