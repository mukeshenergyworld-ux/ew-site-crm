# Builds brand/sig/index.html: Energy World email signatures (copy-paste ready for Gmail, Zoho, Apple Mail, iCloud, Outlook, Yahoo).
IMG = 'https://mukeshenergyworld-ux.github.io/ew-site-crm/brand/sig/ew_ghp_sig.png'
PEOPLE = [
    ('mukesh', 'Mukesh Verma', 'Director', '+91 94666 00611', 'mukesh@energyworld.co.in'),
    ('dinesh', 'Dinesh Verma', 'Director', '+91 94667 01242', 'dinesh@energyworld.co.in'),
]
F = "font-family:Arial,Helvetica,sans-serif;"
B = 'https://mukeshenergyworld-ux.github.io/ew-site-crm/brand/sig/'
SOC = [('facebook', 'https://www.facebook.com/energywrld', 'Facebook'), ('instagram', 'https://www.instagram.com/energyworld007', 'Instagram'),
       ('linkedin', 'https://www.linkedin.com/company/energywrld', 'LinkedIn'), ('youtube', 'https://www.youtube.com/@energyworldplumbing', 'YouTube'),
       ('x', 'https://x.com/EnergyWrld', 'X'), ('whatsapp', 'https://wa.me/919466600611', 'WhatsApp'), ('maps', 'https://g.page/r/CQ6kBwH01QxFEBE', 'Google Maps')]
def ic(n, s=16):
    return f'<img src="{B}i/{n}.png" width="{s}" height="{s}" alt="" style="display:inline-block;vertical-align:middle;border:0;width:{s}px;height:{s}px">'
def row(icon, html):
    return f'<tr><td style="padding:2px 8px 2px 0;vertical-align:middle;width:18px">{ic(icon)}</td><td style="padding:2px 0;font-size:12.5px;color:#1f2a44;vertical-align:middle">{html}</td></tr>'
A = 'style="color:#1f2a44;text-decoration:none"'
def sig(name, title, phone, email):
    soc = ''.join(f'<a href="{u}" title="{t}" style="text-decoration:none;display:inline-block;margin:0 5px 0 0">{ic(k, 20)}</a>' for k, u, t in SOC)
    L = 'style="color:#1d5fbf;text-decoration:none"'
    return f'''<table cellpadding="0" cellspacing="0" border="0" width="544" style="{F}width:544px;border-collapse:collapse;color:#1f2a44">
<tr>
<td width="150" style="width:150px;padding:4px 14px 8px 0;vertical-align:middle;border-right:3px solid #1b8a3c">
<a href="https://www.energyworld.co.in" style="text-decoration:none"><img src="{B}ew_ghp_sig.png" width="150" height="42" alt="Energy World and GHP+" style="display:block;border:0;width:150px;height:42px"></a>
<div style="font-size:9.5px;color:#1b8a3c;font-weight:bold;padding-top:6px;letter-spacing:.3px">SINCE 2009</div>
</td>
<td style="padding:2px 0 8px 14px;vertical-align:top;font-size:12px;line-height:1.55">
<span style="font-size:16px;font-weight:bold;color:#13294b">{name}</span> <span style="color:#5a6478">&nbsp;{title}, <b style="color:#1b8a3c">Energy World</b></span><br>
{ic('phone', 13)} <a href="tel:+919466600611" {A}>94666 00611</a> · <a href="tel:+919466701242" {A}>94667 01242</a> <span style="color:#5a6478">(Panipat)</span> · <a href="tel:+919050444139" {A}>90504 44139</a> <span style="color:#5a6478">(Sonipat)</span><br>
{ic('mail', 13)} <a href="mailto:{email}" {L}>{email}</a> &nbsp;{ic('web', 13)} <a href="https://www.energyworld.co.in" {L}><b>energyworld.co.in</b></a><br>
{ic('pin', 13)} <span style="font-size:11px;color:#5a6478">SCO 132, TDI Town Centre, TDI City, Panipat · Sec. 15, Sonipat</span><br>
<div style="padding-top:4px">{soc}</div>
</td></tr>
<tr><td colspan="2" style="padding:6px 0 0;border-top:1px solid #e3e9f0">
<div style="font-size:9.5px;letter-spacing:.8px;color:#5a6478;font-weight:bold;padding-bottom:4px">PLUMBING · SOLAR · AIR SOLUTIONS — ALL UNDER ONE ROOF</div>
<a href="https://www.energyworld.co.in" style="text-decoration:none"><img src="{B}brands_compact.png" width="544" height="68" alt="Huliot, FIMA, Oyster, Heliroma, TOTO, Green Heat+, Pentair, Grundfos, MEA, InAir, Leo, Stellar Sanitär, Geberit, Adani, Eureka Forbes" style="display:block;border:0;width:544px;height:68px"></a>
</td></tr>
</table>'''
cards = ''
for k, n, t, p, e in PEOPLE:
    cards += f'''<section class="card"><h2>{n}</h2><div class="sig" id="sig-{k}">{sig(n, t, p, e)}</div>
<button data-k="{k}">Copy signature</button> <span class="ok" id="ok-{k}"></span></section>'''
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Energy World email signatures</title>
<style>body{{font-family:Arial,sans-serif;background:#eef2f6;margin:0;padding:24px 16px;color:#13294b}}main{{max-width:640px;margin:auto}}
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
