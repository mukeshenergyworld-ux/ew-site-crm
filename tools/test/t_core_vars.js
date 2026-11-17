/* 17 Nov 2026 - every free name an app's script reads must be declared somewhere in that script.
   The 15 Nov core build dropped `var RAWB` and `var LIVE_TABS` from the Challan and Payment apps, and every pull
   threw "Can't find variable" for two days while the godown's book stood still. This parses each app's script with
   acorn, walks every scope, and lists identifiers read that no scope declares (browser globals aside). */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var acorn = require("/opt/npm-tools/node_modules/acorn"), walk = require("/opt/npm-tools/node_modules/acorn-walk");
var R = path.join(__dirname, "..", "..");
var apps = { challan: "challan/index.src.html", collect: "collect/index.src.html", visit: "visit/index.src.html", service: "service/index.src.html", team: "team/app.src.js" };
var GLOBALS = {};
["window","document","navigator","localStorage","sessionStorage","indexedDB","console","JSON","Math","Date","Object","Array","String","Number","Boolean","Promise","RegExp","Error","TypeError","RangeError","Map","Set","isFinite","isNaN","parseInt","parseFloat","encodeURIComponent","decodeURIComponent","encodeURI","decodeURI","setTimeout","clearTimeout","setInterval","clearInterval","fetch","location","history","crypto","URL","URLSearchParams","Blob","File","FileReader","Image","btoa","atob","undefined","NaN","Infinity","alert","confirm","prompt","TextEncoder","TextDecoder","requestAnimationFrame","cancelAnimationFrame","Intl","AbortController","FormData","Headers","Request","Response","XMLHttpRequest","performance","screen","Event","CustomEvent","KeyboardEvent","MouseEvent","Node","Element","HTMLElement","HTMLInputElement","Uint8Array","Uint16Array","Uint32Array","Int32Array","Float32Array","Float64Array","ArrayBuffer","DataView","escape","unescape","globalThis","self","top","parent","Symbol","Reflect","Proxy","WeakMap","WeakSet","Function","eval","BigInt","Audio","speechSynthesis","SpeechSynthesisUtterance","caches","Notification","MutationObserver","IntersectionObserver","ResizeObserver","getComputedStyle","scrollTo","scrollBy","scrollY","scrollX","innerWidth","innerHeight","outerWidth","devicePixelRatio","matchMedia","structuredClone","queueMicrotask","open","close","focus","blur","print","html2canvas","jspdf","jsPDF","PublicKeyCredential","AuthenticatorAssertionResponse","OffscreenCanvas","createImageBitmap","ImageData","DOMParser","XMLSerializer","Worker","SharedWorker","MessageChannel","BroadcastChannel","WebSocket","EventSource","addEventListener","removeEventListener","dispatchEvent","postMessage","onerror","onunhandledrejection","Touch","TouchEvent","PointerEvent","DragEvent","ClipboardItem","Clipboard","visualViewport","CSS","HTMLCanvasElement","CanvasRenderingContext2D","Path2D","DOMRect","Option","Text","DocumentFragment","NodeList","HTMLCollection","Date","Error","EvalError","ReferenceError","SyntaxError","URIError","AggregateError","arguments","module","require","exports","process","global","Buffer","EW_GAS","EW_REVIEW_URL","EW_GHP","EW_LOGO","EW_SOCIAL","Telegram","ewCrashLog","ewmSharedGet","EW_pdfChoose","QRCode","Chart","CompressionStream","DecompressionStream","ReadableStream","WritableStream","TransformStream","WebAssembly","Atomics","SharedArrayBuffer","FinalizationRegistry","WeakRef","Iterator","AsyncIterator","Generator","isSecureContext","origin","name","status","length","frames","frameElement","locationbar","menubar","personalbar","scrollbars","statusbar","toolbar","opener","closed","customElements","external","ontouchstart","onresize","onscroll","onload","onbeforeunload","onpopstate","onhashchange","onvisibilitychange","onpageshow","onpagehide","onfocus","onblur","onkeydown","onkeyup","onclick","oninput","onchange","onsubmit","onmessage","onstorage","onoffline","ononline","trustedTypes","reportError","showOpenFilePicker","showSaveFilePicker","showDirectoryPicker","scheduler","cookieStore","launchQueue","MediaRecorder","MediaStream","getUserMedia","AudioContext","webkitAudioContext","RTCPeerConnection","Geolocation","DeviceMotionEvent","DeviceOrientationEvent","BarcodeDetector","Sanitizer","TrustedTypePolicy"].forEach(function (g) { GLOBALS[g] = 1; });
function scripts(html) {
  var out = [], re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out.join("\n;\n");
}
Object.keys(apps).forEach(function (k) {
  var src = fs.readFileSync(path.join(R, apps[k]), "utf8");
  var code = /\.html$/.test(apps[k]) ? scripts(src) : src;
  if (k === "team") code = scripts(fs.readFileSync(path.join(R, "team/index.html"), "utf8")) + "\n;\n" + code;   /* the page's own inline helpers (ewm*) */
  var ast; try { ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: "script", allowReturnOutsideFunction: true }); } catch (e) { H.ok(k + ": parses (" + e.message + ")", false); return; }
  /* collect declarations per scope node, then resolve each identifier read up the scope chain */
  var declared = new Map(); /* scope node -> Set */
  function add(node, name) { if (!declared.has(node)) declared.set(node, new Set()); declared.get(node).add(name); }
  function patNames(p, into) { if (!p) return; if (p.type === "Identifier") into.push(p.name); else if (p.type === "ObjectPattern") p.properties.forEach(function (q) { patNames(q.value || q.argument, into); }); else if (p.type === "ArrayPattern") p.elements.forEach(function (q) { patNames(q, into); }); else if (p.type === "AssignmentPattern") patNames(p.left, into); else if (p.type === "RestElement") patNames(p.argument, into); }
  /* pass 1: declarations. var hoists to the nearest function; let/const/class to the block; functions to the enclosing function/program. */
  var fnStack = [ast], blockStack = [ast];
  (function visit(node, parentFn, parentBlock) {
    if (!node || typeof node.type !== "string") return;
    var isFn = /Function/.test(node.type), isBlock = node.type === "BlockStatement" || node.type === "Program" || node.type === "ForStatement" || node.type === "ForInStatement" || node.type === "ForOfStatement" || node.type === "CatchClause" || node.type === "SwitchStatement";
    var fn = isFn ? node : parentFn, blk = (isFn || isBlock) ? node : parentBlock;
    if (node.type === "FunctionDeclaration") add(parentFn, node.id.name);
    if (isFn) { if (node.type === "FunctionExpression" && node.id) add(node, node.id.name); node.params.forEach(function (p) { var ns = []; patNames(p, ns); ns.forEach(function (n) { add(node, n); }); }); }
    if (node.type === "VariableDeclaration") node.declarations.forEach(function (d) { var ns = []; patNames(d.id, ns); ns.forEach(function (n) { add(node.kind === "var" ? fn : blk, n); }); });
    if (node.type === "ClassDeclaration") add(blk, node.id.name);
    if (node.type === "CatchClause" && node.param) { var cs = []; patNames(node.param, cs); cs.forEach(function (n) { add(node, n); }); }
    for (var key in node) { if (key === "type" || key === "loc" || key === "start" || key === "end") continue; var v = node[key]; if (Array.isArray(v)) v.forEach(function (c) { if (c && typeof c.type === "string") visit(c, fn, blk); }); else if (v && typeof v.type === "string") visit(v, fn, blk); }
  })(ast, ast, ast);
  /* pass 2: reads, with the scope chain */
  var missing = {}, guarded = {};
  /* names the script itself tests with typeof before calling - read as optional on purpose */
  (function pre(node) { if (!node || typeof node.type !== "string") return; if (node.type === "UnaryExpression" && node.operator === "typeof" && node.argument.type === "Identifier") guarded[node.argument.name] = 1; for (var key in node) { if (key === "type" || key === "loc" || key === "start" || key === "end") continue; var v = node[key]; if (Array.isArray(v)) v.forEach(pre); else if (v && typeof v.type === "string") pre(v); } })(ast);
  (function visit(node, chain) {
    if (!node || typeof node.type !== "string") return;
    var isFn = /Function/.test(node.type), isBlock = node.type === "BlockStatement" || node.type === "Program" || node.type === "ForStatement" || node.type === "ForInStatement" || node.type === "ForOfStatement" || node.type === "CatchClause" || node.type === "SwitchStatement";
    var ch = (isFn || isBlock) ? chain.concat([node]) : chain;
    if (node.type === "UnaryExpression" && node.operator === "typeof" && node.argument.type === "Identifier") { guarded[node.argument.name] = 1; return; }   /* typeof x is safe on an undeclared x */
    if (node.type === "Identifier") {
      var n = node.name;
      if (!GLOBALS[n] && !guarded[n]) { var ok = false; for (var i = ch.length - 1; i >= 0 && !ok; i--) { var d = declared.get(ch[i]); if (d && d.has(n)) ok = true; } if (!ok) missing[n] = (missing[n] || 0) + 1; }
      return;
    }
    for (var key in node) {
      if (key === "type" || key === "loc" || key === "start" || key === "end") continue;
      if (node.type === "MemberExpression" && key === "property" && !node.computed) continue;
      if ((node.type === "Property" || node.type === "MethodDefinition" || node.type === "PropertyDefinition") && key === "key" && !node.computed) continue;
      if (node.type === "LabeledStatement" && key === "label") continue;
      if ((node.type === "BreakStatement" || node.type === "ContinueStatement") && key === "label") continue;
      if (node.type === "VariableDeclarator" && key === "id") continue;
      if (/Function/.test(node.type) && (key === "id" || key === "params")) continue;
      if (node.type === "ClassDeclaration" && key === "id") continue;
      if (node.type === "CatchClause" && key === "param") continue;
      var v = node[key]; if (Array.isArray(v)) v.forEach(function (c) { if (c && typeof c.type === "string") visit(c, ch); }); else if (v && typeof v.type === "string") visit(v, ch);
    }
  })(ast, []);
  var names = Object.keys(missing).sort();
  H.ok(k + ": every name the script reads is declared somewhere in it" + (names.length ? " - UNDECLARED: " + names.map(function (n) { return n + "(" + missing[n] + ")"; }).join(", ") : ""), !names.length);
});
H.done();
