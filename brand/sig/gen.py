# Builds brand/sig/index.html: Energy World email signatures (copy-paste ready for Gmail, Zoho, Apple Mail, iCloud, Outlook, Yahoo).
IMG = 'https://mukeshenergyworld-ux.github.io/ew-site-crm/brand/sig/ew_ghp_sig.png'
PEOPLE = [
    ('mukesh', 'Mukesh Verma', 'Director', '+91 94666 00611', 'mukesh@energyworld.co.in'),
    ('dinesh', 'Dinesh Verma', 'Director', '+91 94667 01242', 'dinesh@energyworld.co.in'),
]
F = "font-family:Arial,Helvetica,sans-serif;"
def sig(name, title, phone, email):
    return f'''<table cellpadding="0" cellspacing="0" border="0" style="{F}color:#1f2a44;font-size:13px;line-height:1.45;border-collapse:collapse">
<tr><td style="padding:0 0 10px 0"><img src="{IMG}" width="240" height="67" alt="Energy World and GHP+" style="display:block;border:0;width:240px;height:67px"></td></tr>
<tr><td style="border-top:2px solid #1b8a3c;padding:10px 0 0 0">
<span style="font-size:16px;font-weight:bold;color:#13294b">{name}</span><br>
<span style="color:#5a6478">{title}, Energy World</span><br>
<span style="font-size:12px;color:#1b8a3c;font-weight:bold">Plumbing, Solar &amp; Air Solutions — all under one roof · Since 2009</span>
</td></tr>
<tr><td style="padding:8px 0 0 0;font-size:12.5px">
<b style="color:#13294b">Panipat</b>&nbsp;<a href="tel:+919466600611" style="color:#1f2a44;text-decoration:none">94666 00611</a> · <a href="tel:+919466701242" style="color:#1f2a44;text-decoration:none">94667 01242</a>
&nbsp;&nbsp;<b style="color:#13294b">Sonipat</b>&nbsp;<a href="tel:+919050444139" style="color:#1f2a44;text-decoration:none">90504 44139</a> · <a href="tel:+919466701242" style="color:#1f2a44;text-decoration:none">94667 01242</a><br>
<b style="color:#13294b">E</b>&nbsp;<a href="mailto:{email}" style="color:#1d5fbf;text-decoration:none">{email}</a>
&nbsp;·&nbsp;<b style="color:#13294b">W</b>&nbsp;<a href="https://www.energyworld.co.in" style="color:#1d5fbf;text-decoration:none">www.energyworld.co.in</a>
</td></tr>
<tr><td style="padding:6px 0 0 0;font-size:11.5px;color:#5a6478">
Experience Centre: SCO 132, TDI Town Centre, TDI City, Near Toll Plaza, Panipat 132103<br>
Sonipat: 117, Rajiv Colony, Sector 15, Part 4, Sonipat 131001
</td></tr>
<tr><td style="padding:6px 0 0 0;font-size:11px;color:#13294b">
<b>Our brands:</b> Huliot · Heliroma · TOTO · FIMA · Geberit · Oyster · Grundfos · Pentair · MEA · InAir · Leo · Green Heat+ · Adani · Eureka Forbes
</td></tr>
<tr><td style="padding:6px 0 0 0;font-size:11px">
<a href="https://www.facebook.com/energywrld" style="color:#1d5fbf;text-decoration:none">Facebook</a> ·
<a href="https://www.instagram.com/energyworld007" style="color:#1d5fbf;text-decoration:none">Instagram</a> ·
<a href="https://www.linkedin.com/company/energywrld" style="color:#1d5fbf;text-decoration:none">LinkedIn</a> ·
<a href="https://www.youtube.com/@energyworldplumbing" style="color:#1d5fbf;text-decoration:none">YouTube</a> ·
<a href="https://x.com/EnergyWrld" style="color:#1d5fbf;text-decoration:none">X</a>
</td></tr>
</table>'''
cards = ''
for k, n, t, p, e in PEOPLE:
    cards += f'''<section class="card"><h2>{n}</h2><div class="sig" id="sig-{k}">{sig(n, t, p, e)}</div>
<button data-k="{k}">Copy signature</button> <span class="ok" id="ok-{k}"></span></section>'''
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Energy World email signatures</title>
<style>body{{font-family:Arial,sans-serif;background:#eef2f6;margin:0;padding:24px 16px;color:#13294b}}main{{max-width:720px;margin:auto}}
.card{{background:#fff;border-radius:10px;padding:20px;margin:0 0 18px}}.sig{{overflow-x:auto;padding:12px 0}}h1{{font-size:20px}}h2{{font-size:15px;margin:0}}
button{{background:#1b8a3c;color:#fff;border:0;border-radius:6px;padding:10px 16px;font-size:14px;cursor:pointer}}.ok{{color:#1b8a3c;font-size:13px}}
ol{{font-size:13px;line-height:1.6}}</style></head><body><main><h1>Energy World email signatures</h1>
<p style="font-size:13px">Press <b>Copy signature</b>, then paste (Cmd/Ctrl + V) into the signature box of your mail app.</p>
{cards}
<section class="card"><h2>Where to paste</h2><ol>
<li><b>Gmail</b>: Settings ⚙ → See all settings → General → Signature → Create new → paste → set "For new emails" and "On reply" → Save changes.</li>
<li><b>Zoho Mail</b>: Settings → Signature → Add → paste → assign to the address → Save.</li>
<li><b>Outlook.com / Outlook</b>: Settings → Mail → Compose and reply → Email signature → paste → set defaults → Save.</li>
<li><b>Yahoo Mail</b>: Settings → More settings → Writing email → Signature → turn on for the account → paste.</li>
<li><b>iCloud Mail (web)</b>: Settings ⚙ → Composing → Add a signature → paste. (iCloud web keeps plain text only.)</li>
<li><b>Apple Mail (Mac)</b>: Mail → Settings → Signatures → choose account → + → paste → untick "Always match my default message font".</li>
</ol></section></main>
<script>document.querySelectorAll('button[data-k]').forEach(b=>b.onclick=async()=>{{const k=b.dataset.k,el=document.getElementById('sig-'+k),ok=document.getElementById('ok-'+k);
try{{await navigator.clipboard.write([new ClipboardItem({{'text/html':new Blob([el.innerHTML],{{type:'text/html'}}),'text/plain':new Blob([el.innerText],{{type:'text/plain'}})}})]);ok.textContent='Copied';}}
catch(e){{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');ok.textContent='Copied';}}}});</script>
</body></html>'''
open(__file__.replace('gen.py', 'index.html'), 'w').write(html)
for k, n, t, p, e in PEOPLE:
    open(__file__.replace('gen.py', f'signature_{k}.html'), 'w').write(sig(n, t, p, e))
print('ok')
