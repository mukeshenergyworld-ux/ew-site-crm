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
const SHARED = ["hisabOwed", "clientDiscountOn", "discFrom", "incMap", "payAmt",
                "isJobLine", "discRowsFor", "discRowOn", "hisabStampMap"];
const FIELD  = ["rnLines", "dedupe", "hisabExtraOf"];

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
console.log("\nThe field apps' own shared rules");
FIELD.forEach(n => {
  const c = bodyOf("challan", n), p = bodyOf("collect", n);
  H.ok(n + " reads the same in both field apps", c !== null && c === p);
});

/* ---- 2. the nine that have NOT been converged yet, named so the list cannot rot ---- */
const OPEN = ["returnNet", "rnPriceOf", "pricedLines", "challanNet", "clientDue", "chValue"];
console.log("\nStill apart, on purpose — this list shrinks, never grows");
OPEN.forEach(n => {
  const t = bodyOf("team", n), c = bodyOf("challan", n), p = bodyOf("collect", n);
  const same = [t, c, p].filter(Boolean);
  const agreed = same.length > 1 && same.every(x => x === same[0]);
  console.log("  " + (agreed ? "NOW AGREES — promote it" : "apart      ") + "  " + n +
              "   CRM " + (t ? "yes" : "-") + " · Challan " + (c ? "yes" : "-") + " · Payment " + (p ? "yes" : "-"));
});

/* ---- 3. every app must define each shared rule exactly ONCE ---- */
console.log("\nNo app defines a shared rule twice");
["team", "challan", "collect"].forEach(app => {
  const src = H.read(app);
  const twice = SHARED.filter(n => (src.match(new RegExp("function " + n + "\\s*\\(", "g")) || []).length > 1);
  H.ok(app + " defines each of the " + SHARED.length + " once", twice.length === 0, twice.join(", "));
});

H.done();
