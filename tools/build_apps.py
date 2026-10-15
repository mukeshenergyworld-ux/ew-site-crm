#!/usr/bin/env python3
"""15 Oct 2026 - the field apps are EDITED in <app>/index.src.html and SHIPPED as <app>/index.html: the same page with
the comments taken out of every inline script (terser: no compress, no mangle - names and logic untouched), out of
the <style> blocks and out of the HTML. The CRM has shipped this way since 6.9.820.
Usage, from the repo root:  python3 tools/build_apps.py challan collect service visit"""
import re, subprocess, sys, os, tempfile

def strip_js(code):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(code); src = f.name
    out = src + '.min.js'
    subprocess.run(['npx', '--yes', 'terser@5.31.0', src, '--format', 'comments=false', '-o', out], check=True)
    r = open(out, encoding='utf-8').read(); os.unlink(src); os.unlink(out)
    return r

def build(app):
    src = open(app + '/index.src.html', encoding='utf-8').read()
    def js(m):
        open_tag, body = m.group(1), m.group(2)
        if 'src=' in open_tag or not body.strip(): return m.group(0)
        return open_tag + strip_js(body) + '</script>'
    out = re.sub(r'(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)</script>', js, src)
    out = re.sub(r'(<style[^>]*>)([\s\S]*?)(</style>)', lambda m: m.group(1) + re.sub(r'/\*[\s\S]*?\*/', '', m.group(2)) + m.group(3), out)
    # HTML comments outside scripts (scripts no longer hold any)
    parts = re.split(r'(<script[\s\S]*?</script>)', out)
    out = ''.join(p if p.startswith('<script') else re.sub(r'<!--(?!\[)[\s\S]*?-->', '', p) for p in parts)
    open(app + '/index.html', 'w', encoding='utf-8').write(out)
    js_all = '\n;\n'.join(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', out))
    open('/tmp/_chk.js', 'w').write(js_all)
    subprocess.run(['node', '--check', '/tmp/_chk.js'], check=True)
    v = re.search(r'APP_VERSION ?= ?"([^"]+)"', out)
    print(app, len(src), '->', len(out), v.group(1) if v else '')

for a in sys.argv[1:]: build(a)
