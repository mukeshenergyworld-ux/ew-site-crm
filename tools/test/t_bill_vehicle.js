/* 6.9.1007 - the bill takes the vehicle from the delivery; asks only when none is known. */
var H = require("./harness.js");
var ctx = { S: { data: { drivers: [{ name: "Ramesh", vehicle: "hr06ab1111" }, { name: "Sarvan Singh", vehicle: "" }], challans: [
  { id: "X1", driver: "Sarvan Singh", vehicle: "HR67D9999", challanNo: "A/1", createdAt: "2026-11-01T10:00:00Z" },
  { id: "X2", driver: "Sarvan Singh", vehicle: "HR67D5555", challanNo: "A/2", createdAt: "2026-11-13T10:00:00Z" }] } },
  esc: function (s) { return String(s); }, money: function (n) { return "Rs " + n; }, drvResolve: function (k) { return k; },
  dkey: function (s) { return String(s || "").trim().toLowerCase(); } };
var F = H.lift("team", ["billNoVeh", "billFreightOf", "billVehNeed", "drvKey", "billVehSrc", "billVehPicks", "billDrvList", "billDrvHtml"], ctx);
H.eq("on the challan: taken from there", F.billVehSrc({ id: "c", driver: "Ramesh", vehicle: "hr01x2" }).v, "HR01X2");
H.eq("not on the challan: the driver's register", F.billVehSrc({ id: "c", driver: "Ramesh", vehicle: "" }).v, "HR06AB1111");
var s = F.billVehSrc({ id: "c", driver: "Sarvan Singh", vehicle: "", createdAt: "2026-11-14T09:00:00Z" });
H.eq("register blank: his nearest other challan", s.v, "HR67D5555");
H.ok("…and it says where it came from", /challan A\/2/.test(s.from));
H.eq("no driver, no freight: nothing known", F.billVehSrc({ id: "c", driver: "", vehicle: "" }).v, "");
H.ok("…so accounts is asked for it", F.billVehNeed({ driver: "", freight: 0 }));
H.ok("Porter / Rapido: no vehicle needed", !F.billVehNeed({ driver: "Porter" }));
var S = H.read("team");

H.eq("6.9.1032: Sarwan singh on the challan is Sarvan Singh of the register", F.drvKey("Sarwan singh"), F.drvKey("Sarvan Singh"));
var s2 = F.billVehSrc({ id: "c9", driver: "Sarwan singh", vehicle: "", createdAt: "2026-11-14T09:00:00Z" });
H.eq("6.9.1032: ...so his other challans give the vehicle and the bill does not ask", s2.v, "HR67D5555");
H.ok("6.9.1032: the box offers the vehicles we run to tap", F.billVehPicks().some(function (k) { return k.v === "HR06AB1111"; }));
H.ok("6.9.1032: a vehicle typed for a driver with none is kept on his register", /a vehicle typed for a driver whose register has none is kept on the register/.test(S));
var h1 = F.billDrvHtml({ id: "c1", driver: "Ramesh", vehicle: "hr01x2", freight: 300 });
H.ok("6.9.1034: driver on the challan - driver and vehicle fetched, nothing to choose", /Ramesh/.test(h1) && /HR01X2/.test(h1) && /type="hidden" value="HR01X2"/.test(h1) && !/data-act="bdrv-pick"|data-act="bveh-pick"|bveh-edit/.test(h1));
var h2 = F.billDrvHtml({ id: "c2", driver: "", vehicle: "", freight: 300 });
H.ok("6.9.1034: freight but no driver - the DRIVER is tapped, his vehicle comes with him; no SELF, no loose vehicle", /data-act="bdrv-pick" data-n="Ramesh"[^>]*data-v="HR06AB1111"/.test(h2) && !/data-n="SELF"/.test(h2) && !/bveh-pick/.test(h2) && /freight Rs 300/.test(h2));
var h3 = F.billDrvHtml({ id: "c3", driver: "", vehicle: "", freight: 0 });
H.ok("6.9.1034: no freight, no driver - the driver or SELF", /data-n="SELF"/.test(h3));
H.ok("6.9.1034: the driver tapped goes on the challan and in the bill fact, and is laid back over it", /var _bdset = _bdrv \? \{ driver: _bdrv, driverId: _bdrvId \}/.test(S) && /_bdrv \? \{ driver: _bdrv, driverId: _bdrvId \} : \{\}\)\)/.test(S) && /if \(f\.driver && !String\(c\.driver \|\| ""\)\.trim\(\)\)/.test(S));
var C = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "challan", "index.src.html"), "utf8");
H.ok("Challan 1.162.0: the billing driver is laid over the challan for the freight hisab", /function frBillDrv\(\)/.test(C) && /frBillDrv\(\);   \/\* CRM 6\.9\.1034/.test(C));
H.done();
