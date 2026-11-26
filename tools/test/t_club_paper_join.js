/* CRM 6.9.1060 - "download pdf of partners scheme, for all builders, executives, contractors, architects every one, and ways to
   register all in scheme". Lifts the REAL clubMenu, clubAudOf, clubJoinMap, clubJoined, clubJoinUrl, clubJoinCard, modalClubJoin. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var AUD = [];
var ctx = { S: { data: { audit: AUD } }, dkey: dk, esc: function (s) { return String(s == null ? "" : s); }, money: function (n) { return "Rs" + n; },
  dmy: function (s) { return s; }, localDay: function (s) { return String(s).slice(0, 10); },
  pevTable: function (h, rows) { return rows.map(function (r) { return r.join("|"); }).join("\n"); } };
var F = H.lift("team", ["clubMenu", "clubAudOf", "clubJoinMap", "clubJoined", "clubJoinUrl", "clubJoinText", "clubJoinCard", "modalClubJoin", "cmpJ"], ctx, ["CLUB_AUD", "CLUB_OFFICE", "CLUB_SAATHI"]);
var gold = { k: "Gold", menu: "Goa trip, 4N/5D (plumbers) / 3.2 g gold coin / a machine for his trade / an appliance" };
H.eq("FIX: an architect's Gold menu - no stray '5D' prize", F.clubMenu(gold, "Architect").join(" | "), "3.2 g gold coin | a machine for his trade | an appliance");
H.eq("a plumber's Gold menu keeps Goa whole", F.clubMenu(gold, "Plumber")[0], "Goa trip, 4N/5D (plumbers)");
H.eq("trades map to their paper", ["Plumber", "Architect", "Builder", "PMC", "Contractor", "Interior Designer", ""].map(F.clubAudOf).join(","), "plumber,architect,builder,contractor,contractor,architect,all");
H.ok("the join QR goes to the office WhatsApp with his trade filled in", /^https:\/\/wa\.me\/919466600611\?text=/.test(F.clubJoinUrl("architect")) && /Architect/.test(decodeURIComponent(F.clubJoinUrl("architect"))));
var rows = [{ name: "Ramesh", role: "Plumber", loc: "Panipat", mob: "9812345678", coll: 500000 }, { name: "Ar Kanika", role: "Architect", loc: "", mob: "", coll: 0 }];
var c0 = F.clubJoinCard(rows);
H.ok("nobody enrolled yet: both listed with Enrol; Send scheme only with a mobile", /data-act="club-join" data-n="Ramesh"/.test(c0) && /data-act="club-send" data-n="Ramesh"/.test(c0) && !/data-act="club-send" data-n="Ar Kanika"/.test(c0));
H.ok("a PDF button for every trade and the executive briefing", ["plumber", "architect", "builder", "contractor", "all", "exec"].every(function (k) { return c0.indexOf('data-act="club-pdf" data-k="' + k + '"') >= 0; }));
AUD.push({ action: "club:join", target: "Ramesh", actor: "Mukesh", createdAt: "2026-11-26T10:00:00Z", detail: JSON.stringify({ partner: "Ramesh", how: "Executive", on: 1 }) });
H.eq("enrolled: a dated record, how and by whom", F.clubJoined("Ramesh").how + "/" + F.clubJoined("Ramesh").by, "Executive/Mukesh");
H.ok("...and off the not-yet list", !/data-act="club-join" data-n="Ramesh"/.test(F.clubJoinCard(rows)) && /<b style="color:#166534">1<\/b> in/.test(F.clubJoinCard(rows)));
AUD.push({ action: "club:join", target: "Ramesh", actor: "Mukesh", createdAt: "2026-11-27T10:00:00Z", detail: JSON.stringify({ partner: "Ramesh", on: 0 }) });
H.ok("left the club: a newer row, the earlier kept", !F.clubJoined("Ramesh") && AUD.length === 2);
H.ok("the enrol sheet offers 'He has left' only to one who is in", !/data-on="0"/.test(F.modalClubJoin("Ramesh")));
var S = H.read("team");
H.ok("the paper never prints EW's cost or the brand funding a seat", (function () { var i = S.indexOf("function clubSchemePdf("), j = S.indexOf("function clubJoinCard("); var b = S.slice(i, j); return !/t\.ew\b[^)]*doc\.text|brandName|\.brand\b/.test(b) && /pdfQr\(doc, clubJoinUrl\(aud\)/.test(b) && /pdfQr\(doc, CLUB_SAATHI/.test(b); })());
H.ok("the paper is printed from the scheme on file", /function clubSchemePdf\(aud, lang\) \{[\s\S]{0,300}var SC = clubScheme\(\)/.test(S) && /function clubSchemePdfHi\(aud\) \{[\s\S]{0,200}var SC = clubScheme\(\)/.test(S));
H.done();
