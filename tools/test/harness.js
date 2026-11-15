/* ============================================================================
   THE HARNESS — lift the REAL function out of the REAL file and run it.

   WHY THIS EXISTS. Every test written in this repo until 15 Nov 2026 was written from
   scratch, run once, and thrown away. Two of them were wrong in the same way and both
   shipped: 6.9.972's test drove rtTryLine in isolation and passed while the Finalise
   card it lived on threw before it drew, and 6.9.980's drove the merge helper, not the
   caller. A helper correct on its own says NOTHING about the screen that calls it.

   THE RULE THIS FILE ENFORCES: never re-implement the logic in the test. Pull the
   function out of the shipped source by brace matching, hand it stubs, and run THAT.
   If it cannot be lifted and run, the test is not testing the app.
   ========================================================================== */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");

const APPS = {
  team:    "team/app.src.js",
  challan: "challan/index.src.html",
  collect: "collect/index.src.html",
  visit:   "visit/index.src.html",
  service: "service/index.src.html"
};

function read(app) {
  const p = path.join(ROOT, APPS[app] || app);
  const raw = fs.readFileSync(p, "utf8");
  if (p.endsWith(".js")) return raw;
  /* the inline scripts only — a <script src> is somebody else's file */
  return (raw.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g) || [])
    .map(s => s.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "")).join("\n;\n");
}

/* the function only, brace-matched — the same rule tools/ewbuild.py uses */
function fnOf(src, name) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) return null;
  let d = 0, k = src.indexOf("{", i);
  if (k < 0) return null;
  for (; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); }
  }
  return null;
}
function varOf(src, name) {
  const i = src.indexOf("var " + name + " = ");
  if (i < 0) return "";
  const open = src[src.indexOf("=", i) + 2];
  const close = open === "[" ? "];" : open === "{" ? "};" : ";";
  const e = src.indexOf(close, i);
  return e < 0 ? "" : src.slice(i, e + close.length);
}

/* Build a live copy of `names` out of `app`, with `stubs` standing in for everything
   they reach that this test does not care about. Missing names are reported, never
   silently shimmed: a stub that hides a real dependency is how a green test lies. */
function lift(app, names, stubs, extraVars) {
  const src = read(app);
  const missing = [], code = [];
  (extraVars || []).forEach(v => { const b = varOf(src, v); if (b) code.push(b); });
  names.forEach(n => { const b = fnOf(src, n); if (b) code.push(b); else missing.push(n); });
  if (missing.length) throw new Error(app + " has no " + missing.join(", "));
  const api = "return {" + names.map(n => n + ":" + n).join(",") + "};";
  return new Function("ctx", `with (ctx) { ${code.join("\n")}\n${api} }`)(stubs);
}

/* ---- the little assert library; a failure names the app and the function ---- */
let pass = 0, fail = 0;
function ok(what, cond, detail) {
  if (cond) { pass++; console.log("  ok    " + what); }
  else { fail++; console.log("  FAIL  " + what + (detail ? "  — " + detail : "")); }
}
function eq(what, a, b) { ok(what, a === b, "got " + JSON.stringify(a) + ", wanted " + JSON.stringify(b)); }
function done() {
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
/* the book, as the apps see it — read once, shared by every test */
function book() {
  const p = path.join(ROOT, "tools/test/book.json");
  if (!fs.existsSync(p)) throw new Error("tools/test/book.json is not here — see its README");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
module.exports = { APPS, read, fnOf, varOf, lift, ok, eq, done, book, ROOT };
