/* Challan 1.159.0 - the product list: a time limit, one retry, a reason, and the open picker fills itself. */
var H = require("./harness.js");
function mk(responses) {
  var calls = 0, painted = 0, stored = null;
  var ctx = {
    S: { pick: { into: "ch" } }, PRODUCTS: [], _catP: null, _pcbCache: null, _valGen: 0, GAS: "G", CAT_KEY: "k", CAT_V: 2,
    bigGet: function () { return null; }, bigSet: function (k, v) { stored = v; },
    parseCatalog: function (rows) { return rows.length > 1 ? [{ code: "P1" }] : []; },
    el: function () { return {}; }, repaintPicker: function () { painted++; },
    AbortController: function () { this.signal = {}; this.abort = function () { }; },
    setTimeout: function (f) { f && f.length === 0 && false; return 0; }, clearTimeout: function () { },
    fetch: function () { var r = responses[Math.min(calls, responses.length - 1)]; calls++;
      if (r === "fail") return Promise.reject(new Error("net"));
      return Promise.resolve({ ok: true, text: function () { return Promise.resolve(r); } }); }
  };
  /* the retry waits 3 s with setTimeout(res, 3000) - run it at once */
  ctx.setTimeout = function (f, ms) { if (ms === 3000) Promise.resolve().then(f); return 0; };
  var F = H.lift("challan", ["loadCatalog"], ctx);
  return { F: F, ctx: ctx, calls: function () { return calls; }, painted: function () { return painted; } };
}
var A = mk(["fail", JSON.stringify([["h"], ["p"]])]);
var p = A.F.loadCatalog();
H.ok("while it comes, the picker can say it is loading", A.ctx.S.catBusy === true);
p.then(function (P) {
  H.eq("a first failure is tried once more, and the list lands", A.ctx.PRODUCTS.length, 1);
  H.eq("…two calls, not more", A.calls(), 2);
  H.ok("the open picker redrew itself when it landed", A.painted() >= 1);
  H.ok("not busy any more", A.ctx.S.catBusy === false);
  var B = mk(["fail", "fail"]);
  return B.F.loadCatalog().then(function () {
    H.eq("two failures: nothing invented", B.ctx.PRODUCTS.length, 0);
    H.ok("…and the reason is kept for the screen", /no signal/.test(B.ctx.S.catErr));
    var C = mk(['{"ok":false,"error":"Service invoked too many times"}']);
    return C.F.loadCatalog().then(function () {
      H.ok("a server error is named, not swallowed", /too many times/.test(C.ctx.S.catErr));
      var SRC = H.read("challan");
      H.ok("the picker offers Load now when it failed", /data-act="cat-load"/.test(SRC) && /act === "cat-load"/.test(SRC));
      H.done();
    });
  });
});
