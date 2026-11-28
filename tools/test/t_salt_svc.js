/* CRM 6.9.1069 - his rule: "at the time of challan finalization, if item included tablet salt, always ask to add service charge",
   and "master account and sites under it can have different owners ... all sites can also have different owners".
   Lifts the REAL hsbSaltSvc, chSaltBags, isSaltLine, isJobLine, jobLine, num from the CRM. */
var H = require("./harness.js");
var cover = null;
var ctx = {
  JOB_CODE: "JOBWORK", SALT_BAG_KG: 25,
  softenerFor: function (cl) { return cl === "Has Softener" ? { id: "I1", client: cl } : null; },
  visitChargeFor: function (ins) { return cover ? { amt: 0, why: "covered", cv: { txt: "AMC till 03/2027" } } : { amt: 600, why: "card", cv: {} }; },
  cmpRates: function () { return { r: { "Visit / inspection": 500 } }; },
  clientVisitCharge: function () { return 0; }, nAmt: function (v) { return Number(String(v).replace(/[^0-9.\-]/g, "")) || 0; }
};
var F = H.lift("team", ["isJobLine", "num", "jobLine", "isSaltLine", "chSaltBags", "hsbSaltSvc"], ctx, []);
var ch = function (items, cl) { return { customerName: cl || "Ram Lal", itemsJson: JSON.stringify(items) }; };
var salt = { code: "TABSALT", desc: "Tablet salt", qty: 50, unit: "Kg", rate: 48 };
H.eq("no salt: not asked", F.hsbSaltSvc(ch([{ code: "HT110", qty: 2 }])), null);
var x = F.hsbSaltSvc(ch([salt]));
H.eq("50 kg of tablet salt = 2 bags, asked", !!x && x.bags === 2, true);
H.eq("no softener on the book: the rate card's visit charge is offered", x.amt, 500);
H.eq("a softener on the book: its salt-delivery charge", F.hsbSaltSvc(ch([salt], "Has Softener")).amt, 600);
cover = true;
var c2 = F.hsbSaltSvc(ch([salt], "Has Softener"));
H.eq("under AMC / warranty: covered, Rs 0 offered", c2.covered === true && c2.amt === 0 && /AMC/.test(c2.cover), true);
cover = null;
H.eq("a service line already on it: not asked again", F.hsbSaltSvc(ch([salt, F.jobLine("Service charge - salt delivery (2 bags)", 500)])), null);
H.eq("the line added is a job line: no brand, no discount", JSON.stringify(F.jobLine("x", 500)), JSON.stringify({ code: "JOBWORK", desc: "x", unit: "job", qty: 1, rate: 500, brand: "", disc: 0, job: true }));
var src = H.read("team/app.src.js").replace(/\/\*[\s\S]*?\*\//g, " ");
var conf = src.slice(src.indexOf('if (act === "hsb-confirm")'), src.indexOf('var hGap = chDiscGap(hc);'));
H.ok("finalise refuses until the charge is in or the reason is given", /put the service charge in, or tick No service charge/.test(conf) && /no service charge - say why in one line/.test(conf));
H.ok("both answers are audited", /challan:svc-add/.test(src) && /challan:svc-none/.test(src));
H.ok("the question is on the finalise screen", /hsbSaltSvcHtml\(c\)/.test(src));
H.ok("master card: each site's owner, changed by the owner's PIN-checked sheet", /\['SITE', 'OWNER', 'AREA'/.test(src) && /data-act="crl-edit"[^]{0,200}data-r="exec" title="Change whose site this is"/.test(src));
H.ok("a new site under a master asks whose it is", /id="ms_own"/.test(src) && /msOpenSite\(_mm, _mt, String\(val\("ms_own"\)/.test(src) && /ownedBy: String\(owner \|\| m\.ownedBy/.test(src));
H.ok("HISAB list: a site owned by someone else says whose", /sites also: /.test(src));
H.done();
