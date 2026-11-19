/* Tool Tracking extras - CRM 6.9.1042 + tool app 1.2.0 (TK3 server: t_tk_server.js).
   HIS WORDS: "do all" -> a photo with a damage entry, held-too-long, QR stickers, a tool statement, damage cut from the incentive */
var H = require("./harness.js"), fs = require("fs"), path = require("path");
var ASSOC = [{ id: "AS-7", name: "Ramesh Plumber" }, { id: "AS-9", name: "Sunil Kumar" }];
var DUES = [
  { eid: "TE1", at: "2026-11-16T05:00:00Z", code: "EWT-002", tool: "Pipe punching machine", kind: "Damaged", site: "Green Valley Villa", note: "Motor burnt", amount: 3500, recovered: "", who: "Ramesh Plumber", whoRef: "AS-7" },
  { eid: "TE2", at: "2026-11-17T05:00:00Z", code: "EWT-005", tool: "Drill", kind: "Lost", site: "", note: "left at site", amount: 800, recovered: "", who: "Sunil kumar", whoRef: "" },
  { eid: "TE3", at: "2026-11-17T06:00:00Z", code: "EWT-006", tool: "Grinder", kind: "Damaged", site: "", note: "cracked", amount: 500, recovered: "", who: "Vivek", whoRef: "" },          /* staff: not a partner */
  { eid: "TE4", at: "2026-11-17T07:00:00Z", code: "EWT-007", tool: "Cutter", kind: "Damaged", site: "", note: "bent", amount: 900, recovered: "Y", who: "Ramesh Plumber", whoRef: "AS-7" }];   /* recovered */
var ctx = { S: { data: { audit: [] }, user: "Mukesh Verma" }, dkey: function (s) { return String(s || "").trim().toLowerCase(); }, assocLive: function () { return ASSOC; } };
var F = H.lift("team", ["tkDuePub", "tkDuesOf", "tkCutsFor", "tkSnap"], ctx, ["_tkLive"]);
var d = F.tkDuesOf(DUES);
H.eq("CRM: only amounts due from a PARTNER and not yet recovered are filed", d.map(function (x) { return x.eid; }).join(), "TE1,TE2");
ctx.S.data.audit = [{ action: "tool:held", createdAt: "2026-11-18T05:00:00Z", detail: JSON.stringify({ tools: [], dues: d }) }];
H.eq("CRM: Ramesh's cut, by his id", F.tkCutsFor("Ramesh Plumber").total, 3500);
H.eq("CRM: Sunil's cut, by his name (no id on the line)", F.tkCutsFor("Sunil Kumar").total, 800);
H.eq("CRM: nobody else is cut", F.tkCutsFor("Mahesh").total, 0);
ctx.S.data.audit = [];
H.eq("CRM: with nothing filed, nothing is cut", F.tkCutsFor("Ramesh Plumber").total, 0);
/* the ledger: the cut is a line like a payout, so the balance drops by it */
var L = H.lift("team", ["incLedgerRows"], { S: { data: { commpay: [{ associate: "Ramesh Plumber", amount: 1000, date: "2026-11-10" }] } }, dstr: function (x) { return String(x).slice(0, 10); }, payAmt: function (p) { return Number(p.amount); }, bookFor: function () { return null; } });
var bk = { rows: [{ ymd: "2026-11-01", inc: 5000, rel: 5000, paidShare: 1, no: "EW-1", client: "A" }], toolCuts: [{ at: "2026-11-16T05:00:00Z", code: "EWT-002", tool: "Pipe punching machine", kind: "Damaged", note: "Motor burnt", amt: 3500, site: "Green Valley Villa" }] };
var lr = L.incLedgerRows("Ramesh Plumber", "partner", bk);
H.eq("CRM ledger: earned 5000, paid 1000, tool cut 3500 -> balance 500", lr.ev[lr.ev.length - 1].bal, 500);
H.ok("CRM ledger: the cut line says what it is", lr.ev.some(function (e) { return e.tool && /EWT-002/.test(e.note); }));
H.eq("CRM ledger: an executive's ledger never carries a tool cut", L.incLedgerRows("Ramesh Plumber", "exec", bk).ev.filter(function (e) { return e.tool; }).length, 0);
var C = H.read("team");
H.ok("CRM: partnerBook counts the cut like a payout, so what is due drops by it", /var _tc = tkCutsFor\(name\);\s*if \(_tc\.total\) \{ bk\.toolCut = _tc\.total; bk\.toolCuts = _tc\.rows; bk\.paid \+= _tc\.total; bk\.pending = bk\.payable - bk\.paid; \}/.test(C));
H.ok("CRM: the owner files the dues with the held tools, and keeps the old copy when the server sends none", /auditFact\("tool:held", "all", \{ tools: held, dues: keepD \}\)/.test(C) && /var dues = r\.dues \? tkDuesOf\(r\.dues\) : null;/.test(C));
H.ok("CRM: the ledger shows it as Tool damage recovery", /Tool damage recovery/.test(C));
/* the tool app */
var T = fs.readFileSync(path.join(__dirname, "..", "..", "tooltrack", "index.html"), "utf8");
var src = T.match(/<script>([\s\S]*?)<\/script>/)[1];
function fn(n) { var i = src.indexOf("function " + n + "("), k = src.indexOf("{", i), dd = 0; for (; k < src.length; k++) { if (src[k] === "{") dd++; else if (src[k] === "}") { dd--; if (!dd) break; } } return src.slice(i, k + 1); }
var names = ["days", "dueOf", "isOut", "lateBy", "codeFrom", "qrMatrix", "qrSvg"];
var A = new Function("LATE", names.map(fn).join("\n") + "\nreturn {" + names.map(function (n) { return n + ":" + n; }).join(",") + "};")(30);
var ago = function (n) { return new Date(Date.now() - n * 86400000 - 3600000).toISOString(); };
H.eq("Tool app: out 45 days, the usual 30 -> over by 15", A.lateBy({ hType: "partner", since: ago(45) }), 15);
H.eq("Tool app: its own 'return within 7' -> 10 days out is over by 3", A.lateBy({ hType: "site", since: ago(10), dueDays: 7 }), 3);
H.eq("Tool app: in the godown is never late", A.lateBy({ hType: "godown", since: ago(400) }), 0);
H.eq("Tool app: the sticker's link gives the code", A.codeFrom("https://x/tooltrack/?t=EWT-012"), "EWT-012");
H.eq("Tool app: a bare code too", A.codeFrom("EWT-003"), "EWT-003");
H.ok("Tool app: a sticker's QR is drawn here, no web service", /^<svg/.test(A.qrSvg("https://mukeshenergyworld-ux.github.io/ew-site-crm/tooltrack/?t=EWT-001")) && !/api\.qrserver|chart\.googleapis/.test(T));
H.ok("Tool app: the photo is made small on the phone and sent with the line, or added later", /function shrink\(file\)/.test(T) && /photo: bad && v\.photo \? v\.photo : undefined/.test(T) && /tk\("photo", \{ eid: eid, photo: d \}\)/.test(T));
H.ok("Tool app: Held too long tile, stickers, statement, scan", /"Held too long", 1\)/.test(T) && /data-act="stk-all"/.test(T) && /data-act="stmt"/.test(T) && /BarcodeDetector/.test(T));
H.ok("Tool app: recovered in cash, or waived (owner)", /data-v="cash">Recovered in cash/.test(T) && /data-v="waived">Waive/.test(T));
H.done();
