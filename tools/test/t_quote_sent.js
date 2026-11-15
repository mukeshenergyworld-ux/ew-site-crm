/* A quotation remembers what has gone  (6.9.997)
   Lifts the real quoteSentBook / quoteLeft / qcKey / qcQuoted and drives them with a
   quotation, quote:sent audit rows and live challans. */
var H = require("./harness.js");
var cancelled = {};
var ctx = {
  S: { data: { audit: [], challans: [], quotes: [] } },
  _qsCache: null, _qsKey: "",
  dkey: function (s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); },
  isCancelled: function (t, id) { return !!cancelled[t + "|" + id]; }
};
var F = H.lift("team", ["qcKey", "qcQuoted", "quoteSentBook", "quoteLeft"], ctx);
function reset() { ctx._qsCache = null; ctx._qsKey = ""; }
var Q1 = { id: "Q1", quoteNo: "EWQ/26/118", client: "Sharma", items: JSON.stringify([
  { code: "P100", desc: "Pipe", qty: 20, price: 500, disc: 40 },
  { code: "E1", desc: "Elbow", qty: 10, price: 50, disc: 0 },
  { code: "E1", desc: "Elbow (bath 2)", qty: 5, price: 50, disc: 0 },
  { code: "WC9", desc: "Closet", qty: 2, price: 9000, disc: 45 }]) };
var Q2 = { id: "Q2", quoteNo: "EWQ/26/121", client: "Sharma", items: JSON.stringify([{ code: "P100", desc: "Pipe", qty: 10, price: 500, disc: 40 }]) };
ctx.S.data.quotes = [Q1, Q2];
function ch(no, id, lines) { return { id: id, challanNo: no, itemsJson: JSON.stringify(lines) }; }
function sent(no, q, at) { return { id: "A" + no, action: "quote:sent", createdAt: at, detail: JSON.stringify({ q: q, ch: no }) }; }

/* nothing sent yet */
reset();
var L = F.quoteLeft(Q1);
H.eq("an untouched quote has every line left", L.lines.length, 4);
H.ok("and is neither part-sent nor all-sent", !L.part && !L.none);

/* first lot: 12 pipes, 12 elbows, plus a valve the quote never had */
ctx.S.data.challans = [ch("SHARMA/01", "C1", [{ code: "P100", qty: 12 }, { code: "E1", qty: 12 }, { code: "V7", qty: 3 }])];
ctx.S.data.audit = [sent("SHARMA/01", ["Q1"], "2026-11-01T10:00:00Z")];
reset(); L = F.quoteLeft(Q1);
H.ok("after a part challan the quote is part-sent", L.part && !L.none);
H.eq("pipes left: 20 - 12", L.lines.filter(function (x) { return x.code === "P100"; })[0].qty, 8);
var el = L.lines.filter(function (x) { return x.code === "E1"; });
H.eq("12 elbows fill the first elbow line (10) then 2 of the second", el.map(function (x) { return x.qty; }).join(","), "3");
H.eq("closets untouched", L.lines.filter(function (x) { return x.code === "WC9"; })[0].qty, 2);
H.eq("the challan is named", L.on.join(","), "SHARMA/01");
H.ok("the valve that was never quoted counts against nothing", !L.lines.some(function (x) { return x.code === "V7"; }));
H.eq("the discount on a line is kept as quoted", L.lines.filter(function (x) { return x.code === "WC9"; })[0].disc, 45);

/* a challan carrying both quotes fills the earlier one first */
ctx.S.data.challans.push(ch("SHARMA/02", "C2", [{ code: "P100", qty: 15 }, { code: "E1", qty: 3 }, { code: "WC9", qty: 2 }]));
ctx.S.data.audit.push(sent("SHARMA/02", ["Q1", "Q2"], "2026-11-05T10:00:00Z"));
reset();
var L1 = F.quoteLeft(Q1), L2 = F.quoteLeft(Q2);
H.ok("Q1 is now all sent", L1.none && L1.lines.length === 0);
H.eq("Q1 went on two challans", L1.on.join(","), "SHARMA/01,SHARMA/02");
H.eq("15 pipes: 8 finish Q1, 7 go to Q2", L2.lines[0].qty, 3);

/* cancelling a challan gives its quantities back */
cancelled["challans|C2"] = 1; reset();
L1 = F.quoteLeft(Q1); L2 = F.quoteLeft(Q2);
H.ok("a cancelled challan no longer counts", L1.part && L2.on.length === 0 && L2.lines[0].qty === 10);
delete cancelled["challans|C2"];

/* an edit before dispatch is read live, not from the audit row */
ctx.S.data.challans[0] = ch("SHARMA/01", "C1", [{ code: "P100", qty: 5 }]);
ctx.S.data.audit.push({ id: "x", action: "nav:use", createdAt: "2026-11-06" }); reset();
L1 = F.quoteLeft(Q1);
H.eq("an edited challan moves the count by itself", L1.lines.filter(function (x) { return x.code === "P100"; }).length, 0);
H.eq("…and the elbows it no longer carries are back on the quote", L1.lines.filter(function (x) { return x.code === "E1"; }).reduce(function (a, x) { return a + x.qty; }, 0), 12);

/* the same challan written twice is counted once */
ctx.S.data.audit.push(sent("SHARMA/02", ["Q1", "Q2"], "2026-11-07T10:00:00Z")); reset();
H.eq("a repeated quote:sent row does not count twice", F.quoteLeft(Q2).lines[0].qty, 10 - Math.max(0, 15 - 20 + 5));

/* the source: Create writes the row, and the quote button reads it */
var SRC = H.read("team").replace(/\/\*[\s\S]*?\*\//g, " ");
H.ok("Create writes quote:sent from the draft", SRC.indexOf("quoteSentWrite(chDraft.fromQuoteIds, chDraft.fromQuote, no") > 0);
H.ok("Make challan offers only what is left", SRC.indexOf("if (_qleft.part) qcits = _qleft.lines;") > 0);
H.ok("the challan side can pull a quote in", SRC.indexOf('act === "ch-qadd"') > 0 && SRC.indexOf("chQuotePullHtml(z)") > 0);
H.done();
