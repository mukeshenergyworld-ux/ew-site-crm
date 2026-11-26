/* CRM 6.9.1053 - "changing drp discount changed heliroma also and vice versa". A save writes over a row only
   when it is that brand's OWN row; a family-borrowed row (DRP reading Heliroma's) is copied, never rewritten. */
var H = require("./harness.js");
var dk = function (s) { return String(s || "").trim().toLowerCase(); };
var HEL = { id: "D-HEL", client: "Sanjay Ji - Maa Collection", brand: "Heliroma", pct: 53, notes: JSON.stringify({ plumber: 5 }) };
var n = 0;
var ctx = { dkey: dk, mintId: function () { return "D-NEW" + (++n); }, incRoleLabel: function (r) { return r; },
  incMap: function (r) { try { return JSON.parse(r.notes || "{}"); } catch (e) { return {}; } },
  discRowOn: function (cl, b) { return HEL; } };   /* DRP has no row: it borrows Heliroma's */
var F = H.lift("team", ["discOwn", "admOldRows"], ctx);
H.ok("Heliroma's row is Heliroma's own", F.discOwn(HEL, "Heliroma"));
H.ok("...and NOT DRP's, though DRP reads it", !F.discOwn(HEL, "DRP"));
var r = F.admOldRows("Sanjay Ji - Maa Collection", "2026-10-01", { drp: { brand: "DRP", vals: { plumber: "7" } } });
H.eq("a DRP change makes a NEW row", r.rows[0].id, "D-NEW1");
H.eq("...under DRP", r.rows[0].brand, "DRP");
H.eq("...Heliroma's row untouched", HEL.brand + " " + HEL.notes, 'Heliroma {"plumber":5}');
var r2 = F.admOldRows("Sanjay Ji - Maa Collection", "2026-10-01", { heliroma: { brand: "Heliroma", vals: { plumber: "6" } } });
H.eq("a Heliroma change edits its own row", r2.rows[0].id, "D-HEL");
var S = H.read("team");
H.ok("Save rates (owner corner) reuses an id only for the brand's own row", /discOwn\(exd, g\.brand\) \? exd\.id : ""\) \|\| mintId\("D"\)\)\),\s+\/\* 6\.9\.1053 \*\/\s+client: admCl/.test(S));
H.ok("the discount screen does the same", /discOwn\(exd, g\.brand\) \? exd\.id : ""\) \|\| mintId\("D"\)\)\),\s+\/\* 6\.9\.1053 \*\/\s+client: g\.client/.test(S));
H.ok("a rate set from a delivery does the same", /if \(discOwn\(exd, x\.brand\)\) save\("discounts"/.test(S));
H.ok("no save left that reuses exd.id without asking", !/\(exd \? exd\.id : ""\)/.test(S));
H.done();
