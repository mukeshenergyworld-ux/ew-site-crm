/* CRM 6.9.1058 - "Make provision to add partner old balance with old hisab attached ... professional incentive calculation and payout system".
   Sandeep Bhardwaj (LD133): earned Rs 1,131 in the app, client not yet paid, Rs 28,000 paid in cash for the old books.
   Lifts the REAL partnerObMap, partnerOb, partnerObDocs, partnerBook, incWaitTotal, incLedgerRows, modalPoOver. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var AUD = [];
var ctx = { S: { data: { audit: AUD, clients: [], commpay: [{ associate: "Sandeep Bhardwaj", amount: 28000, date: "2026-11-26", mode: "Cash", notes: "Cash by Imran" }] } },
  dkey: dk, dstr: function (s) { return String(s || "").slice(0, 10); }, payAmt: function (p) { return Number(p.amount) || 0; },
  incStampClients: function () { return {}; }, incHistClients: function () { return {}; }, clientRolesOf: function () { return []; }, famAnyKey: function () { return false; },
  incentiveBook: function () { return { rows: [{ ymd: "2026-10-16", no: "16/10/2026/293", client: "Akhil Khurana", brand: "Huliot ULTRA SILENT", inc: 1131, rel: 0, paidShare: 0 }], earned: 1131, payable: 0, paid: 28000, pending: -28000 }; },
  partnerSites: function () { return []; }, tkCutsFor: function () { return { total: 0, rows: [] }; }, partnerBookRate: function () { return 0; },
  roleIs: function () { return true; }, esc: function (s) { return String(s == null ? "" : s); }, money: function (n) { return "Rs" + Math.round(n); } };
var F = H.lift("team", ["partnerObMap", "partnerOb", "partnerObDocs", "partnerBook", "incWaitTotal", "incLedgerRows", "modalPoOver"], ctx);
var b0 = F.partnerBook("Sandeep Bhardwaj");
H.eq("before: no old balance, due now reads -28,000 (the screenshot)", b0.pending, -28000);
AUD.push({ action: "partner:ob", target: "Sandeep Bhardwaj", actor: "Mukesh", createdAt: "2026-11-26T10:00:00Z", detail: JSON.stringify({ name: "Sandeep Bhardwaj", amt: 25000, asOn: "2026-10-01", note: "old register", on: 1 }) });
AUD.push({ action: "partner:ob", target: "Sandeep Bhardwaj", actor: "Mukesh", createdAt: "2026-11-26T11:00:00Z", detail: JSON.stringify({ name: "Sandeep Bhardwaj", amt: 28000, asOn: "2026-10-01", note: "old register p.14", on: 1 }) });
AUD.push({ action: "partner:hisab", target: "Sandeep Bhardwaj", actor: "Mukesh", createdAt: "2026-11-26T11:01:00Z", detail: JSON.stringify({ name: "Sandeep Bhardwaj", url: "https://x/old.pdf", file: "old hisab.pdf" }) });
H.eq("the newest old balance wins", F.partnerOb("Sandeep Bhardwaj").amt, 28000);
var b = F.partnerBook("Sandeep Bhardwaj");
H.eq("old balance 28,000 + released 0 - paid 28,000 = nothing due now", b.pending, 0);
H.eq("earned here is unchanged - the old balance is not incentive earned in the app", b.earned, 1131);
H.eq("the 1,131 still waits for Akhil Khurana's payment", F.incWaitTotal(b), 1131);
H.eq("the old hisab is on file", F.partnerObDocs("Sandeep Bhardwaj")[0].file, "old hisab.pdf");
var L = F.incLedgerRows("Sandeep Bhardwaj", "partner", b);
H.eq("ledger: old balance first, then the delivery, then the payout", L.ev.map(function (e) { return e.t; }).join(","), "ob,earn,pay");
H.eq("ledger: running balance ends at the 1,131 he earned, still waiting", L.ev[L.ev.length - 1].bal, 1131);
AUD.push({ action: "partner:ob", target: "Sandeep Bhardwaj", actor: "Mukesh", createdAt: "2026-11-26T12:00:00Z", detail: JSON.stringify({ name: "Sandeep Bhardwaj", amt: 0, on: 0 }) });
H.ok("set to nil: no old balance (the rows before are kept)", !F.partnerOb("Sandeep Bhardwaj") && AUD.length === 4);
AUD.push({ action: "partner:ob", target: "X", actor: "Mukesh", createdAt: "2026-11-26T12:00:00Z", detail: JSON.stringify({ name: "Ramesh", amt: -5000, asOn: "2026-09-01", on: 1 }) });
ctx.incentiveBook = function () { return { rows: [], earned: 3000, payable: 3000, paid: 0, pending: 3000 }; };
var F2 = H.lift("team", ["partnerObMap", "partnerOb", "partnerObDocs", "partnerBook", "incWaitTotal"], ctx);
H.eq("an advance he holds is set off against what he earns", F2.partnerBook("Ramesh").pending, -2000);
var m = F.modalPoOver("Sandeep Bhardwaj", "partner", 28000, 0);
H.ok("a payout above what is due asks: old balance, or advance", /It is his old balance/.test(m) && /Record as an advance/.test(m) && /data-amt="28000"/.test(m));
var S = H.read("team");
H.ok("the old balance needs the PIN every time", /sheetMoneyPin\("Your PIN to set the old balance"/.test(S) && /act === "pob-pin-go"/.test(S));
H.ok("the statement PDF carries the old balance line", /Old balance brought forward/.test(S));
H.ok("Saathi is sent the old balance", /ob: Math\.round\(Number\(b\.opening\) \|\| 0\), obOn:/.test(S) && /Purana hisab/.test(H.read("saathi/index.html")));
H.done();
