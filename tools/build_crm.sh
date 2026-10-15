#!/bin/sh
# CRM 6.9.820 - the CRM is EDITED in team/app.src.js (every comment, every reason) and SHIPPED as team/app.js:
# the same code with the comments and blank space taken out (terser, no compress, no mangle - names and
# logic untouched). Measured 15 Oct 2026: 4.69 MB -> 2.82 MB, gzip 1.46 MB -> 0.89 MB on the wire
# (his line: 129 s -> about 80 s for a fresh download).
# Usage, from the repo root:  sh tools/build_crm.sh
set -e
npx --yes terser@5.31.0 team/app.src.js --format comments=false -o team/app.js
node --check team/app.js
grep -oE 'APP_VERSION ?= ?"[^"]*"' team/app.js | head -1
