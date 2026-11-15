# -*- coding: utf-8 -*-
"""Shared helpers for the core build. Kept in one place so the one-time extraction and the
   repeatable build cannot disagree about what a function IS."""
import io, re

R = '/home/claude/ew-site-crm/'

def scripts(h):
    return "\n;\n".join(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', h))

def read(p):
    return io.open(R + p, encoding='utf-8').read()

def js_of(p, raw=None):
    raw = raw if raw is not None else read(p)
    return raw if p.endswith('.js') else scripts(raw)

def brace(src, name, frm=0):
    """the function only, brace-matched. Returns (start, end_exclusive) or None."""
    key = "function " + name + "("
    i = src.find(key, frm)
    if i < 0: return None
    d = 0; k = src.find("{", i)
    if k < 0: return None
    while k < len(src):
        if src[k] == "{": d += 1
        elif src[k] == "}":
            d -= 1
            if not d: return (i, k + 1)
        k += 1
    return None

def doc_start(src, i):
    """walk back over a comment block that sits DIRECTLY above index i with no blank line
       between - that comment is the reason for this function and travels with it."""
    ls = src.rfind("\n", 0, i) + 1
    start = ls
    j = ls
    while j > 0:
        pe = src.rfind("\n", 0, j - 1) + 1
        line = src[pe:j - 1]
        st = line.strip()
        if st == "":                       # a blank line ends the attachment
            break
        if st.endswith("*/"):
            o = src.rfind("/*", 0, j)
            if o >= 0 and src.count("*/", o, j) <= 1:
                start = src.rfind("\n", 0, o) + 1
            break
        if st.startswith("//"):
            start = pe; j = pe; continue
        break
    return start

def bare(s, blank=False):
    r"""comments out, strings and regexes intact - the same rule the test rig uses, because a
       naive stripper reads `"image/*"` as a comment opener and eats real code.

       blank=True also empties what is INSIDE a string or a regex, one space per character so
       every offset still lines up. depths() needs that and nothing else does.

       WHY (15 Nov 2026). An escaped brace inside a regex was being emitted whole: this line,
           var cut = d.search(/\s[\u2014\u2013-]\s|[\u2600-\u27bf]|:|\{|\(|\s\|\s/);
       put a lone `{` into the counted text, so from character 600,578 onward EVERY function in
       the CRM read one brace deeper than it is. top_level() picks the depth most functions sit
       at, so it chose 2 - and the EW-CORE block, which sits above that line at the real depth 1,
       fell outside the map. The build could therefore not see a single core function in the CRM,
       and the one time it mattered it refused to let any money rule in, reporting them LOST.
       There are 13 escaped opening braces and 12 closing ones in that file. The apps were never
       wrong; the ruler was."""
    out, i, n, prev = [], 0, len(s), ""
    def can_regex():
        return prev == "" or prev in "(,=:[!&|?{};+-*%<>~^" or \
               re.search(r'\b(return|typeof|case|in|of|new|delete|void|instanceof)$', "".join(out[-12:]))
    while i < n:
        c = s[i]; d = s[i+1] if i+1 < n else ''
        if c in '"\'`':
            q = c; out.append(' ' if blank else c); i += 1
            while i < n:
                if s[i] == '\\': out.append('  ' if blank else s[i:i+2]); i += 2; continue
                out.append(' ' if blank else s[i])
                if s[i] == q: i += 1; break
                i += 1
            prev = q; continue
        if c == '/' and d == '*':
            e = s.find('*/', i+2); out.append(' '); i = n if e < 0 else e+2; continue
        if c == '/' and d == '/':
            e = s.find('\n', i); out.append(' '); i = n if e < 0 else e; continue
        if c == '/' and can_regex():
            out.append(' ' if blank else c); i += 1; cls = False
            while i < n:
                if s[i] == '\\': out.append('  ' if blank else s[i:i+2]); i += 2; continue
                if s[i] == '[': cls = True
                elif s[i] == ']': cls = False
                elif s[i] == '/' and not cls: out.append(' ' if blank else s[i]); i += 1; break
                elif s[i] == '\n': break
                out.append(' ' if blank else s[i]); i += 1
            prev = '/'; continue
        out.append(c)
        if not c.isspace(): prev = c
        i += 1
    return "".join(out)

def norm(s):
    return re.sub(r'\s+', ' ', bare(s)).strip()

def depths(js):
    """brace depth at every character, comments and strings removed first. Indentation is a
       convention; braces are the truth. `upFrom` is indented like a top-level function and is
       in fact defined INSIDE bottomFurniture - cutting it changed its parent, which is how
       this was found."""
    b = bare(js, blank=True)   # 15 Nov 2026 - a brace inside a string or a regex is not a brace
    d, out = 0, [0] * (len(b) + 1)
    for i, c in enumerate(b):
        if c == '{': d += 1
        elif c == '}': d -= 1
        out[i + 1] = d
    return b, out

def top_level(js):
    """{name: (start, end)} for functions at the app's OWN top level - the depth almost all
       of them sit at, which for these apps is 1 (inside the one wrapping IIFE)."""
    b, dep = depths(js)
    found = []
    for m in re.finditer(r'function ([A-Za-z_$][\w$]*)\s*\(', b):
        found.append((m.group(1), m.start(), dep[m.start()]))
    if not found: return {}
    counts = {}
    for _, _, d in found: counts[d] = counts.get(d, 0) + 1
    lvl = max(counts, key=lambda k: counts[k])
    out = {}
    for n, pos, d in found:
        if d != lvl or n in out: continue
        sp = brace(js, n)
        if sp: out[n] = sp
    return out

def fn_map(js):
    """every top-level function, normalised - the fingerprint a build must not change.
       Keeps nested helpers OUT, because moving one changes its parent."""
    tl = top_level(js)
    return {n: norm(js[a:z]) for n, (a, z) in tl.items()}
