# 4 Nov 2026 - HIS WORDS: "apply set 2 everywhere ... in branding, in crm, website, all apps, all quotes, all challans,
# all pdf all bar codes". Set 2 = Energy World with "World"+leaf raised (registered artwork from the app's own EW_LEAF),
# GHP+ (P1-b) with TM in the plus corner (GHP+ is NOT registered - no (R)). Images are padded to the OLD pixel sizes
# (594x312 and 900x402) so every addImage/_box call that hard-codes those ratios draws them unstretched.
# The PDF logo file moves to assets/logo_set2.jpg (new name) because team/sw.js keeps logo_r.jpg in its shelf cache.
import re, sys
D='/tmp/claude-0/-home-claude/d118efb7-c3a1-59db-acaf-0151a362fd7d/scratchpad/logo/'
LEAF='data:image/jpeg;base64,'+open(D+'EW_LEAF_new.b64').read().strip()
GHP='data:image/jpeg;base64,'+open(D+'EW_GHP_new.b64').read().strip()
def must(c,m):
    if not c: sys.exit('ABORT: '+m)
out={}
def sub_const(s,name,new):
    pat=re.compile(r'(var '+name+r' = ")data:image/jpeg;base64,[A-Za-z0-9+/=]+(")')
    must(len(pat.findall(s))==1, name+' once')
    return pat.sub(lambda m: m.group(1)+new+m.group(2), s)
def ver(s,old,new,note):
    a='var APP_VERSION = "'+old+'";'
    must(s.count(a)==1,'version '+old)
    return s.replace(a,'var APP_VERSION = "'+new+'";   /* '+new+' (4 Nov 2026) - '+note+' */')
NOTE='Set 2 logos: Energy World (World raised), GHP+ with TM; PDFs, quotes, challans and every QR centre'
# CRM
s=open('team/app.src.js',encoding='utf8').read()
must(s.count('../assets/logo_r.jpg')==2,'crm logo_r x2'); s=s.replace('../assets/logo_r.jpg','../assets/logo_set2.jpg')
s=sub_const(s,'EW_LEAF',LEAF); s=sub_const(s,'EW_GHP',GHP); s=ver(s,'6.9.927','6.9.928',NOTE); out['team/app.src.js']=s
# Visit
s=open('visit/index.src.html',encoding='utf8').read()
must(s.count('../assets/logo_r.jpg')==1,'visit logo_r'); s=s.replace('../assets/logo_r.jpg','../assets/logo_set2.jpg')
s=sub_const(s,'EW_LEAF',LEAF); s=sub_const(s,'EW_GHP',GHP); s=ver(s,'1.10.0','1.10.1',NOTE); out['visit/index.src.html']=s
# Payment (collect)
s=open('collect/index.src.html',encoding='utf8').read()
must(s.count('../assets/logo_r.jpg')==1,'collect logo_r'); s=s.replace('../assets/logo_r.jpg','../assets/logo_set2.jpg')
s=sub_const(s,'EW_GHP',GHP); s=ver(s,'1.73.0','1.73.1',NOTE); out['collect/index.src.html']=s
# Care, Complaint (single files)
for f in ('care/index.html','complaint/index.html'):
    s=open(f,encoding='utf8').read(); must(s.count('../assets/logo_r.jpg')==1,f+' logo_r')
    out[f]=s.replace('../assets/logo_r.jpg','../assets/logo_set2.jpg')
must(out['care/index.html'].count('var VER = "1.1.0"')==1,'care ver'); out['care/index.html']=out['care/index.html'].replace('var VER = "1.1.0"','var VER = "1.1.1"')
for f,s in out.items(): open(f,'w',encoding='utf8').write(s)
print('patched',list(out))
