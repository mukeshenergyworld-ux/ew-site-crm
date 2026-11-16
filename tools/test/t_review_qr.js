/* 6.9.1018 - the review button draws only with a link and a mobile, once per client; the challan sheet carries a QR. */
var H = require("./harness.js");
var ctx = { window: { EW_REVIEW_URL: "https://g.page/r/abc/review" }, S: { user: "Mukesh", data: { audit: [] } },
  clientByName: function (n) { return n === "A" ? { name: "A", mobile: "98765 43210" } : (n === "B" ? { name: "B", mobile: "" } : null); },
  dkey: function (x) { return String(x || "").toLowerCase(); }, esc: function (x) { return String(x); }, dmy: function (x) { return x; } };
var F = H.lift("team", ["reviewAskedOn", "reviewAskBtn"], ctx);
H.ok("a client with a mobile gets the WhatsApp button with the link in the text", /wa\.me\/919876543210\?text=.*g\.page/.test(F.reviewAskBtn("A")));
H.eq("no mobile, no button", F.reviewAskBtn("B"), "");
ctx.S.data.audit.push({ action: "review:ask", target: "a", createdAt: "2026-11-16T10:00:00Z" });
H.ok("asked once: the button becomes the date", /Review asked on 2026-11-16/.test(F.reviewAskBtn("A")));
ctx.window.EW_REVIEW_URL = "";
H.eq("no link in ew-config: nothing drawn", F.reviewAskBtn("A"), "");
var S = H.read("team");
H.ok("the 15x21 challan sheet carries the complaint QR with the challan no", /pdfQr\(doc, new URL\("\.\.\/complaint\/\?ch=" \+ encodeURIComponent\(String\(c\.challanNo/.test(S));
H.ok("ew-config carries the review link setting", /window\.EW_REVIEW_URL = "https:\/\/search\.google\.com\/local\/writereview\?placeid=ChIJ/.test(require("fs").readFileSync(__dirname + "/../../ew-config.js", "utf8")));
H.ok("the complaint form reads ?ch=", /_qp\.get\("ch"\)/.test(require("fs").readFileSync(__dirname + "/../../complaint/index.html", "utf8")));
H.done();
