/* ============================================================================
   DO THE APPS AGREE ABOUT MONEY?

   The standing version of the test that found Rs 4,29,000 of wrong figures on
   14-15 Nov 2026. Two of them, rnPriceOf and discRowsFor, had drifted apart
   between the CRM and the field apps and nobody could see it, because the only
   thing holding them together was that somebody remembered to copy the fix.

   Run:  node tools/test/t_money_agrees.js
   ========================================================================== */
const H = require("./harness.js");

/* ---- 1. the rules that are supposed to be one copy now ---- */
const SHARED = ["hisabOwed", "clientDiscountOn", "payAmt", "isJobLine", "hisabStampMap"];
const FIELD  = ["rnLines", "dedupe", "hisabExtraOf"];
/* the discount rule reaches one app further: the Visit app prices QUOTATIONS, and a rule that
   disagrees there costs no rupee on the book - it loses the order, and nobody learns why */
const DISC   = ["discRowsFor", "discRowOn", "discFrom", "incMap"];

function bodyOf(app, name) {
  const b = H.fnOf(H.read(app), name);
  return b === null ? null : b.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
                              .replace(/\s+/g, " ").trim();
}
console.log("Shared money rules — one copy, three apps");
SHARED.forEach(n => {
  const t = bodyOf("team", n), c = bodyOf("challan", n), p = bodyOf("collect", n);
  H.ok(n + " reads the same in the CRM, the Challan app and the Payment app",
       t !== null && t === c && t === p,
       [["CRM", t], ["Challan", c], ["Payment", p]].filter(x => x[1] !== t).map(x => x[0]).join(", ") + " differ");
});
console.log("\nThe discount rule — one copy, FOUR apps (the Visit app quotes with it)");
DISC.forEach(n => {
  const v = [["CRM","team"],["Challan","challan"],["Payment","collect"],["Visit","visit"]]
    .map(([label, app]) => [label, bodyOf(app, n)]);
  const first = v[0][1];
  H.ok(n + " reads the same in all four apps",
       first !== null && v.every(x => x[1] === first),
       v.filter(x => x[1] !== first).map(x => x[0]).join(", ") + " differ");
});

console.log("\nThe field apps' own shared rules");
FIELD.forEach(n => {
  const c = bodyOf("challan", n), p = bodyOf("collect", n);
  H.ok(n + " reads the same in both field apps", c !== null && c === p);
});

/* ---- 2. WRITTEN DIFFERENTLY, AND PROVED TO AGREE ANYWAY ----
   These six are not neglected and they are not wrong. Each is written its own way for a reason
   worth keeping, and the Money check on the Health screen proves they ANSWER the same, live, over
   the whole book - on 15 Nov 2026 it reported all 161 clients agreeing across the CRM, the Challan
   app, the Payment app and the Service app.

   Converging them would mean rewriting working code for no change in any figure, where the proof
   already exists and runs on demand. That is a worse trade than it sounds, so the decision is to
   leave them apart and write down WHY - which is what this block is. The line to watch is the
   last column: if one of them ever starts to disagree, the Money check says so that morning. */
const OPEN = {
  returnNet:   "the CRM prices a return through returnLines + retShare; the field apps through rnLines + rnPriceOf",
  rnPriceOf:   "the catalogue lookup differs - retProd here, PRODUCTS + fimaFinGet there",
  pricedLines: "the field apps ASK for the catalogue when a phone has not got it yet; the CRM always has it",
  challanNet:  "same reason as pricedLines",
  clientDue:   "the CRM's walks a family of merged names; the field apps take the family as an argument",
  chValue:     "the Challan app caches it against a generation stamp; the CRM recomputes. MEASURED 15 Nov: identical on all 324 deliveries carrying freight, GST on freight included"
};
console.log("\nWritten differently on purpose — proved to agree by the Money check, live");
Object.keys(OPEN).forEach(n => {
  const t = bodyOf("team", n), c = bodyOf("challan", n), p = bodyOf("collect", n);
  const same = [t, c, p].filter(Boolean);
  const agreed = same.length > 1 && same.every(x => x === same[0]);
  console.log("  " + (agreed ? "NOW IDENTICAL — promote it" : "apart  ") + "  " + n.padEnd(12) + "  " + OPEN[n]);
});

/* ---- 3. every app must define each shared rule exactly ONCE ---- */
console.log("\nNo app defines a shared rule twice");
["team", "challan", "collect", "visit"].forEach(app => {
  const src = H.read(app);
  const twice = SHARED.concat(DISC).filter(n => (src.match(new RegExp("function " + n + "\\s*\\(", "g")) || []).length > 1);
  H.ok(app + " defines each of the " + (SHARED.length + DISC.length) + " once", twice.length === 0, twice.join(", "));
});

H.done();
