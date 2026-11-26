/* CRM 6.9.1061 + Saathi 2026.11.26-2 - "ok do all": the club standing on the partner's card and in Saathi, Join from Saathi, the scheme in Hindi.
   Lifts the REAL clubRowOf, clubCardStrip; reads Saathi's clubCard / renderJoin / sendJoin and the Hindi builder. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var T = [{ k: "Platinum", cut: 3000000, menu: "International trip", ew: 55250 }, { k: "Gold", cut: 1500000, menu: "Goa trip, 4N/5D (plumbers) / 3.2 g gold coin", ew: 42640 },
  { k: "Silver", cut: 800000, menu: "1.7 g gold coin", ew: 24000 }, { k: "Bronze", cut: 300000, menu: "41 g silver coin", ew: 9000 }, { k: "Member", cut: 100000, menu: "tool kit", ew: 3000 }];
var AUD = [];
var bk = { rows: [{ ymd: "2026-05-01", amount: 2360000, paidShare: 1 }, { ymd: "2025-12-30", amount: 999999, paidShare: 1 }] };   /* 20,00,000 pre-GST in 2026 */
var ctx = { S: { data: { audit: AUD } }, dkey: dk, esc: function (s) { return String(s == null ? "" : s); }, money: function (n) { return "Rs" + n; },
  dmy: function (s) { return s; }, localDay: function (s) { return String(s).slice(0, 10); }, roleIs: function () { return true; }, clubYear: function () { return "2026"; },
  clubScheme: function () { return { tiers: T }; }, clubRewards: function () { return {}; }, partnerBook: function () { return bk; },
  clubPill: function (k) { return "[" + k + "]"; } };
var F = H.lift("team", ["clubRowOf", "clubMenu", "clubCardStrip", "clubJoinMap", "clubJoined", "cmpJ"], ctx, ["CLUB_GST", "CLUB_PCT"]);
var a = { name: "Mahabir", role: "Plumber", mobile: "9812345678" };
var r = F.clubRowOf(a, "2026");
H.eq("collected inside the year, before GST", r.coll, 2000000);
H.eq("tier Gold, 3% = 60,000, 10,00,000 to Platinum", [r.tierK, r.earned, r.gap, r.next.k].join("/"), "Gold/60000/1000000/Platinum");
var c = F.clubCardStrip(a, bk);
H.ok("his card: tier, not enrolled, what was paid, how far to the next", /\[Gold\]/.test(c) && /not enrolled/.test(c) && /Rs2000000/.test(c) && /Rs1000000<\/b> more to \[Platinum\]/.test(c));
H.ok("his card: Send scheme and Enrol for the owner", /data-act="club-send" data-n="Mahabir"/.test(c) && /data-act="club-join" data-n="Mahabir">Enrol</.test(c));
AUD.push({ action: "club:join", target: "Mahabir", actor: "Mukesh", createdAt: "2026-11-26T10:00:00Z", detail: JSON.stringify({ partner: "Mahabir", how: "Office", on: 1 }) });
H.ok("enrolled shows the date", /enrolled 2026-11-26/.test(F.clubCardStrip(a, bk)));
var S = H.read("team");
H.ok("clubRows is built on clubRowOf - one arithmetic for the screen, the card and Saathi", /out = assocLive\(\)\.map\(function \(a\) \{ return clubRowOf\(a, ym, null, T, RW\); \}\)/.test(S));
H.ok("Saathi is sent the club standing", /club: \(function \(\) \{ try \{ var cr = clubRowOf\(a, _cy, b, _cT, _cRW\)/.test(S) && /joined: cj \? localDay\(cj\.at\) : ""/.test(S));
H.ok("the PDF comes in Hindi: canvas-set Devanagari, not jsPDF letters", /function clubSchemePdfHi\(aud\)/.test(S) && /if \(lang === "hi"\) return clubSchemePdfHi\(aud\)/.test(S) && /c\.toDataURL\("image\/png"\)/.test(S));
H.ok("Hindi and English buttons on the club card", /data-act="club-lang"/.test(S));
var SA = H.read("saathi/index.html");
H.ok("Saathi: the club card on his home", /h \+= clubCard\(b\);/.test(SA) && /function clubCard\(b\)/.test(SA));
H.ok("Saathi: Join the Partner Club from the sign-in screen, to the office WhatsApp", /onclick="renderJoin\(\)"/.test(SA) && /var OFFICE_WA = '919466600611'/.test(SA) && /function sendJoin\(\)/.test(SA));
H.done();
