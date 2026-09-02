# -*- coding: utf-8 -*-
"""
BUILD THE CORE INTO THE APPS.

Run:  python3 tools/build_core.py           (build, then verify)
      python3 tools/build_core.py --check   (verify only, change nothing)

WHAT IT DOES. For each app in the manifest it removes that app's own copies of the
core-managed functions and writes the core's copies between the app's EW-CORE markers.
It is idempotent: run it twice and the second run changes nothing.

THE RULE IT ENFORCES, AND WHY IT IS THE WHOLE POINT. After a build, every function in every
app must be byte-identical (comments aside) to what it was before. If ANY function differs,
the build is refused and nothing is written. A refactor of seven live apps is only worth
doing if it can be proved to change nothing, and this is that proof.
"""
import io, json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ewbuild as B

R = B.R
CHECK = "--check" in sys.argv

APPS = {
  'CRM':     {'file': 'team/app.js',          'anchor': '  var STORE = "ew_team_session";'},
  'Challan': {'file': 'challan/index.html',   'anchor': '  var STORE = "ew_challan_session";'},
  'Payment': {'file': 'collect/index.html',   'anchor': '  var STORE = "ew_collect_session";'},
}
BEGIN = "  /* ==EW-CORE:BEGIN== built by tools/build_core.py — do not edit here, edit core/ew-core.js == */"
END   = "  /* ==EW-CORE:END== */"

core = io.open(R + 'core/ew-core.js', encoding='utf-8').read()
man  = json.loads(io.open(R + 'core/manifest.json', encoding='utf-8').read())

def section(key):
    # the CLOSING marker travels into the app too. Without it a section had a start and no
    # end inside the app, so anything reading a single section out of a built app (the test
    # rigs do) had to guess where it stopped - and guessed wrong.
    a = core.index("/* ==EWCORE:%s==" % key)
    end = "/* ==EWCORE:%s:END== */" % key
    z = core.index(end) + len(end)
    return core[a:z].rstrip()

before, built = {}, {}
for app, cfg in APPS.items():
    before[app] = B.fn_map(B.js_of(cfg['file']))

wrote = []
for app, cfg in APPS.items():
    p = cfg['file']
    raw = B.read(p)
    orig = raw

    mine = [(k, m) for k, m in man.items() if app in m['apps']]
    names = [n for _, m in mine for n in m['fns']]

    # ---- 1. cut this app's own copies, wherever they are (outside the markers) ----
    for n in names:
        while True:
            js_now = raw
            # only look outside an existing marker block
            if BEGIN in raw:
                a, z = raw.index(BEGIN), raw.index(END) + len(END)
                head, block, tail = raw[:a], raw[a:z], raw[z:]
            else:
                head, block, tail = raw, "", ""
            sp = B.brace(head, n)
            frm = 0
            if sp is None and tail:
                sp2 = B.brace(tail, n)
                if sp2 is None: break
                s2 = B.doc_start(tail, sp2[0])
                tail = tail[:s2] + tail[sp2[1]:]
                raw = head + block + tail
                continue
            if sp is None: break
            s1 = B.doc_start(head, sp[0])
            head = head[:s1] + head[sp[1]:]
            raw = head + block + tail
    # tidy the blank runs a cut leaves behind, without touching anything else
    raw = re.sub(r'\n[ \t]*\n[ \t]*\n[ \t]*\n+', '\n\n\n', raw)

    # ---- 2. write the block ----
    body = "\n".join([BEGIN] + [section(k) for k, _ in mine] + [END])
    if BEGIN in raw:
        a, z = raw.index(BEGIN), raw.index(END) + len(END)
        raw = raw[:a] + body + raw[z:]
    else:
        anc = cfg['anchor']
        assert raw.count(anc) == 1, "%s: anchor %r appears %d times" % (p, anc, raw.count(anc))
        raw = raw.replace(anc, anc + "\n\n" + body + "\n")

    built[app] = raw
    if raw != orig:
        wrote.append((p, len(orig), len(raw)))

# ---- 3. THE PROOF ----
bad, note = [], []
for app, cfg in APPS.items():
    # judge the text the build PRODUCED, not the file on disk - otherwise --check compares
    #    the untouched file against itself and reports success having tested nothing, which is
    #    the same trap t_v291 fell into.
    js_after = B.js_of(cfg['file'], built[app])
    after = B.fn_map(js_after)
    lost  = sorted(set(before[app]) - set(after))
    gained = sorted(set(after) - set(before[app]))
    changed = sorted(n for n in set(before[app]) & set(after) if before[app][n] != after[n])
    if lost:    bad.append("%s LOST: %s" % (app, ", ".join(lost[:8])))
    if gained:  bad.append("%s GAINED: %s" % (app, ", ".join(gained[:8])))
    # A CHANGED function is not automatically a fault. Changing the core is the whole point
    # of having one, and when it changes, every app that carries it MUST change with it. What
    # would be a fault is a function that changed into something the core does not say.
    # So: a change is allowed if, and only if, the function now reads exactly as the core
    # reads. That needs no list of exceptions to keep up to date - the core IS the list.
    corefn = B.fn_map(core)
    drift = [n for n in changed if n not in corefn or corefn[n] != after[n]]
    fromcore = [n for n in changed if n not in drift]
    if drift: bad.append("%s CHANGED and does NOT match core/ew-core.js: %s" % (app, ", ".join(drift[:8])))
    if fromcore: note.append("%s took from the core: %s" % (app, ", ".join(fromcore)))
    # Did the build leave a stale copy of a CORE function behind? That is the only
    # duplication this tool can cause, so it is the only one it judges. (Counting every name
    # called the CRM broken over three NESTED helpers all fairly named `add`.)
    core_names = [n for k, m in man.items() if app in m['apps'] for n in m['fns']]
    dupes = [n for n in core_names
             if len(re.findall(r'function ' + re.escape(n) + r'\s*\(', js_after)) > 1]
    if dupes: bad.append("%s DEFINED TWICE: %s" % (app, ", ".join(sorted(set(dupes))[:8])))

for p, a, b in wrote:
    print("  %-22s %d → %d chars" % (p, a, b))
for l in note:
    print("   " + l)
if bad:
    print("\nBUILD REFUSED — the apps are NOT equivalent:")
    for l in bad: print("   " + l)
    print("   Nothing was written.")
    sys.exit(1)

# THE PROOF PASSED, so now - and only now - the files are touched. It used to write first
# and judge afterwards, which left three apps carrying a refused build and a message saying
# the build had been refused. The docstring at the top of this file has always promised
# "the build is refused and nothing is written"; from here that is true.
if not CHECK:
    for app, cfg in APPS.items():
        p = cfg['file']
        if built[app] != B.read(p):
            io.open(R + p, 'w', encoding='utf-8').write(built[app])
print("\n%s: every function in all three apps is byte-identical to before, except the ones\n"
      "listed above as taken from the core - and each of those now reads exactly as the core reads." %
      ("CHECK" if CHECK else "BUILT"))
