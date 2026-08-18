# -*- coding: utf-8 -*-
"""
LIFT THE SHARED CODE INTO core/ew-core.js.

Only functions that are (a) genuinely TOP-LEVEL in every app that has them — decided by
brace depth, never by indentation — and (b) already BYTE-IDENTICAL across those apps.
Anything failing either test is refused, loudly, and left where it is.

`upFrom` is why (a) exists: it is indented exactly like a top-level function and is in fact
defined inside bottomFurniture. Lifting it changed its parent, and the equivalence proof
caught it.
"""
import io, json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ewbuild as B

APPS = {'CRM': 'team/app.js', 'Challan': 'challan/index.html', 'Payment': 'collect/index.html'}
S  = {a: B.js_of(p) for a, p in APPS.items()}
TL = {a: B.top_level(S[a]) for a in APPS}

SECTIONS = [
  ("idb",      "The IndexedDB door.", "CRM",     ["idbOpen", "idbSet", "idbGet", "idbDel"]),
  ("bigbox",   "The big box: what will not fit in the shared 5 MB of localStorage.", "Challan", ["bigGet", "bigDel", "bigSetX"]),
  ("webauthn", "Face ID / fingerprint plumbing. No PIN passes through any of it.", "CRM", ["b64u", "randBytes", "bioSaved", "bioAvailable"]),
  ("tiny",     "The three-line helpers every app rewrote.", "Challan", ["el", "lower", "flushNow"]),
  ("drive",    "Google Drive picture links, repaired to the one form that renders.", "CRM", ["driveImg"]),
  ("crash",    "The app may not die silently. Found the hard way, 17 Aug.", "Challan", ["painted", "crashPut", "crashLast", "crashHandle"]),
  ("refresh",  "One tap: the latest book AND the latest build.", "Challan", ["liveVersion", "refreshNow", "updateNow", "newVerBar"]),
  ("book",     "Pulling the book, and saying so when it comes back unusable.", "Challan", ["usableBook", "bookSay", "getBook", "slimBook"]),
  ("journal",  "The write journal's shared parts.", "Challan", ["jrnLoad", "jrnCount", "jrnLanded", "jrnMark", "jrnDrop"]),
  ("sw",       "Registering the service worker.", "Challan", ["regSW"]),
]

HEAD = io.open(B.R + 'core/ew-core.js', encoding='utf-8').read().split("*/", 1)[0] + "*/\n" \
       if os.path.exists(B.R + 'core/ew-core.js') else ""

def withdoc(app, name):
    src = S[app]; a, z = TL[app][name]
    return src[B.doc_start(src, a):z].rstrip()

out, man, refused = [HEAD], {}, []
for key, why, home, names in SECTIONS:
    body = []
    for n in names:
        homes = sorted([a for a in APPS if n in TL[a]])
        if len(homes) < 2:
            refused.append("%s: top-level in only %s — nothing to share" % (n, homes)); continue
        variants = set(B.norm(S[a][TL[a][n][0]:TL[a][n][1]]) for a in homes)
        if len(variants) != 1:
            refused.append("%s: differs across %s — stays where it is" % (n, homes)); continue
        if home not in homes:
            refused.append("%s: not top-level in the section's home app %s" % (n, home)); continue
        body.append(withdoc(home, n))
        man.setdefault(key, {"why": why, "fns": [], "apps": homes})
        man[key]["fns"].append(n)
        man[key]["apps"] = sorted(set(man[key]["apps"]) & set(homes))
    if body:
        out.append("\n/* ==EWCORE:%s== %s */" % (key, why))
        out.extend(body)
        out.append("/* ==EWCORE:%s:END== */" % key)

io.open(B.R + 'core/ew-core.js', 'w', encoding='utf-8').write("\n".join(out) + "\n")
io.open(B.R + 'core/manifest.json', 'w', encoding='utf-8').write(json.dumps(man, indent=2) + "\n")
print("core: %d sections, %d functions" % (len(man), sum(len(m["fns"]) for m in man.values())))
for k, m in man.items():
    print("   %-9s %-40s %s" % (k, ",".join(m["fns"])[:40], "+".join(m["apps"])))
if refused:
    print("\nREFUSED (left in their apps, on purpose):")
    for r in refused: print("   " + r)
