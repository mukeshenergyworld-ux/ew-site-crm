/* ------------------------------------------------------------------
   Energy World - the one address every companion app talks to.

   Put the /exec URL of the INCENTIVE ENGINE Apps Script deployment
   between the quotes below. Not the CRM's URL - the other one, the
   project that holds EW_Companion_API.gs.

   Deploy > Manage deployments > copy the Web app URL. It ends /exec.

   This is the only file you edit when that URL changes, and the only
   file the apps refuse to cache - so a change here is live at once.
   Nothing secret goes in here. No PIN, no token, no bot key. Those
   live in Script Properties on the server and nowhere else.
------------------------------------------------------------------ */
window.EW_GAS = "https://script.google.com/macros/s/AKfycbxXTOOJNJL3uQyuf7z81sSkFCVVXvt8MPuWHb5H8G09PFsCt-I-7esIDJ-tvuT1AP0A/exec";

/* 16 Nov 2026 - the Google review link. Paste the "Ask for reviews" link from the Google Business
   Profile (it looks like https://g.page/r/..../review). While it is blank, the CRM draws no
   "Ask for a Google review" button. Not a secret. */
window.EW_REVIEW_URL = "https://g.page/r/CQ6kBwH01QxFEBE/review";   /* Energy World, SCO 132 TDI City Panipat - the Business Profile's own review link (Get more reviews), 19 Nov 2026; it carries the same place (CID 0x450cd5f40107a40e) as the placeid link it replaces */
