#!/bin/sh
# Every check this repo can make, in the order that fails fastest.
# Run before every upload:   sh tools/test/run.sh
cd "$(dirname "$0")/../.." || exit 1
fail=0

echo "== 1. the apps build, and nothing changed that should not have =="
python3 tools/build_core.py --check || fail=1

echo ""
echo "== 2. the files parse =="
node --check team/app.js || fail=1
for a in challan collect visit service; do
  [ -f "$a/index.html" ] || continue
  python3 - "$a" <<'PY' || fail=1
import re, io, sys, subprocess
a = sys.argv[1]
h = io.open(a + "/index.html", encoding="utf-8").read()
b = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', h)
io.open("/tmp/_chk_" + a + ".js", "w", encoding="utf-8").write("\n;\n".join(b))
sys.exit(subprocess.call(["node", "--check", "/tmp/_chk_" + a + ".js"]))
PY
  echo "   $a parses"
done

echo ""
echo "== 3. the apps agree about money =="
node tools/test/t_money_agrees.js || fail=1
node tools/test/t_nav_order.js || fail=1
node tools/test/t_quote_sent.js || fail=1
node tools/test/t_driver_payouts.js || fail=1
node tools/test/t_wa_remind_all.js || fail=1
node tools/test/t_visit_quote3.js || fail=1
node tools/test/t_visit_month.js || fail=1
node tools/test/t_master_tag.js || fail=1
node tools/test/t_bill_ask.js || fail=1
node tools/test/t_bill_vehicle.js || fail=1
node tools/test/t_bill_pick.js || fail=1
node tools/test/t_salary_history.js || fail=1
node tools/test/t_cancel_driverpay.js || fail=1
node tools/test/t_tk_server.js || fail=1
node tools/test/t_tooltrack.js || fail=1
node tools/test/t_alias_once.js || fail=1
node tools/test/t_items_supplied.js || fail=1
node tools/test/t_challan_catalog.js || fail=1
node tools/test/t_challan_brand_disc.js || fail=1
node tools/test/t_off_preset.js || fail=1
node tools/test/t_search_all.js || fail=1
node tools/test/t_nav_more.js || fail=1
node tools/test/t_review_qr.js || fail=1
node tools/test/t_today_one.js || fail=1
node tools/test/t_sync_watch.js || fail=1
node tools/test/t_core_vars.js || fail=1
node tools/test/t_code_tag_joined.js || fail=1
node tools/test/t_cancel_joined.js || fail=1
node tools/test/t_attendance_all.js || fail=1
node tools/test/t_saathi_sites.js || fail=1
node tools/test/t_partner_picker.js || fail=1
node tools/test/t_ptn_passon.js || fail=1
node tools/test/t_att_system.js || fail=1
node tools/test/t_brand_followup.js || fail=1
node tools/test/t_bx_server.js || fail=1

echo ""
if [ "$fail" = "0" ]; then echo "ALL CLEAR — safe to build and upload"; else echo "SOMETHING FAILED — do not upload"; fi
exit $fail
