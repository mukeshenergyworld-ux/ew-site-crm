# 11 Nov 2026 - HIS WORDS: "make sure everywhere ghp and green heat logo should be of same color, its different everywhere".
# Measured: Green Heat+ (registered artwork) is blue #00539F / red #ED1D24; the GHP+ mark was drawn in #04539A / #E81F26
# (and the card copy of Green Heat in those too). GHP+ now uses the registered Green Heat+ colours exactly.
# Same artwork and pixel size (900x402) as the 4 Nov Set 2 swap - only the two colours move.
import re, sys
D = '/tmp/claude-0/-home-claude/d118efb7-c3a1-59db-acaf-0151a362fd7d/scratchpad/logo11/'
GHP = 'data:image/jpeg;base64,' + open(D + 'EW_GHP_c.b64').read().strip()
def must(c, m):
    if not c: sys.exit('ABORT: ' + m)
def sub_const(s, name, new):
    pat = re.compile(r'(var ' + name + r' = ")data:image/jpeg;base64,[A-Za-z0-9+/=]+(")')
    must(len(pat.findall(s)) == 1, name + ' once')
    return pat.sub(lambda m: m.group(1) + new + m.group(2), s)
def ver(s, old, new, note):
    a = 'var APP_VERSION = "' + old + '";'
    must(s.count(a) == 1, 'version ' + old)
    return s.replace(a, 'var APP_VERSION = "' + new + '";   /* ' + new + ' (11 Nov 2026) - ' + note + ' */')
NOTE = 'GHP+ logo in the registered Green Heat+ colours (#00539F / #ED1D24) on PDFs, quotes, challans and QR centres'
out = {}
for f, old, new in (('team/app.src.js', '6.9.966', '6.9.967'), ('visit/index.src.html', '1.17.5', '1.17.6'), ('collect/index.src.html', '1.74.0', '1.74.1')):
    s = open(f, encoding='utf8').read(); s = sub_const(s, 'EW_GHP', GHP); out[f] = ver(s, old, new, NOTE)
s = open('saathi/index.html', encoding='utf8').read(); must(s.count('install-qr.png?v=ghp"') == 1, 'saathi qr'); out['saathi/index.html'] = s.replace('install-qr.png?v=ghp"', 'install-qr.png?v=ghp2"')
for f, s in out.items(): open(f, 'w', encoding='utf8').write(s)
print('patched', list(out))
