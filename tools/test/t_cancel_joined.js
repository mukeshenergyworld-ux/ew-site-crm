/* 6.9.1022 - a client row joined as a duplicate can be set aside; an unjoined one with challans cannot. */
var H = require("./harness.js");
var D = { clients: [{ id: "A", name: "Vinay Gupta", code: "CL072" }, { id: "B", name: "Vinay Gupta", code: "CL073" }, { id: "C", name: "Mr Vinay Gupta", code: "LD100" }],
  challans: [{ customerName: "Vinay Gupta" }, { customerName: "Vinay Gupta" }], payments: [{ client: "Vinay Gupta" }], quotes: [{ client: "Mr Vinay Gupta", status: "Sent" }], installs: [], sites: [], returns: [] };
var ctx = { S: { data: D }, cxRows: function (t) { return D[t]; }, money: function (x) { return x; }, payAmt: function () { return 0; }, dpAmt: function () { return 0; }, CX_OPENQ: ["Sent"],
  isCancelled: function () { return false; },
  dupDecisions: function () { return [{ kind: "fix", det: { main: "A", aliases: [{ id: "B" }, { id: "C" }] } }]; } };
var F = H.lift("team", ["cancelBlockers"], ctx);
H.eq("the main row with challans is still stopped", F.cancelBlockers("clients", "A").stop.length > 0, true);
var b = F.cancelBlockers("clients", "B");
H.ok("the joined spare row is not stopped, and the note says its records stay with the main", !b.stop.length && b.warn[0].indexOf("joined to Vinay Gupta (CL072); 3 records under this name stay with him") > -1);
var c = F.cancelBlockers("clients", "C");
H.ok("Mr Vinay Gupta too", !c.stop.length && /1 record under this name/.test(c.warn[0] || ""));
ctx.dupDecisions = function () { return []; };
H.eq("with no join, the same-name spare is stopped as before", H.lift("team", ["cancelBlockers"], ctx).cancelBlockers("clients", "B").stop.length > 0, true);
H.done();
