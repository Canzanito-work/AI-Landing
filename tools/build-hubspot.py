# Uso: python3 tools/build-hubspot.py  →  hubspot/landing-ia-hubspot.html
# Plantilla lista para pegar en el administrador de diseño de HubSpot (Design Manager):
# - Anotación de plantilla de página y las etiquetas estándar de HubSpot (seguimiento,
#   banner de cookies), necesarias para la atribución y el consentimiento del oppref.
# - Todo el contenido propio va dentro de {% raw %} para que HubL no interprete nada.
# - CSS y JS en línea; imágenes desde el File Manager de HubSpot (carpeta Landing-IA).
#   Tipografía desde Google Fonts.
import os, re, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S = os.path.join(ROOT, 'site') + '/'
sha = subprocess.run(['git', '-C', ROOT, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
# Imágenes en el File Manager de HubSpot, todas en la carpeta Landing-IA (sin subcarpetas: se enlazan por nombre).
# ASSET_BASE=github → jsDelivr desde el repositorio (solo para pruebas, con la estructura assets/ y bg/).
HUBSPOT_FILES = 'https://145598533.fs1.hubspotusercontent-eu1.net/hubfs/145598533/Landing-IA/'
_base = os.environ.get('ASSET_BASE', '')
if _base == 'github':
    ASSET_BASE, FLAT = f'https://cdn.jsdelivr.net/gh/Canzanito-work/AI-Landing@{sha}/site/', False
else:
    ASSET_BASE = _base or HUBSPOT_FILES
    FLAT = os.environ.get('ASSET_FLAT', '0' if _base else '1') == '1'
import base64
def asset_url(a):
    # Logos de clientes (3–7 KB): incrustados en la plantilla, no hay que subirlos a HubSpot
    if a.startswith('assets/clients/'):
        return 'data:image/webp;base64,' + base64.b64encode(open(S + a, 'rb').read()).decode()
    return ASSET_BASE + (os.path.basename(a) if FLAT else a)
STATIC_HERO = '--fondo-estatico' in sys.argv
TIT = next((a.split('=',1)[1] for a in sys.argv if a.startswith('--titulares=')), '')   # cursiva | serif
INDEX = '--indexar' in sys.argv             # sin noindex: Google puede indexar la página
CLEAN = '--sin-pendientes' in sys.argv      # quita del HTML todos los marcadores [PENDIENTE]

html = open(S + 'index.html').read()
css = open(S + 'css/styles.css').read()
css = re.sub(r'url\(\.\./(assets/[^)]+)\)', lambda m: f'url("{asset_url(m.group(1))}")', css)

head_open = html.index('<head>') + len('<head>'); head_close = html.index('</head>')
body_open = html.index('<body>') + len('<body>'); body_close = html.index('</body>')
head = html[head_open:head_close]; body = html[body_open:body_close]

head = head.replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>')
if INDEX:
    head, k = re.subn(r'<meta name="robots"[^>]*>\n?', '', head); assert k == 1
if CLEAN:
    # bloques que solo contienen el marcador, y marcadores sueltos dentro de un texto
    body, k1 = re.subn(r'\s*<p class="[^"]*\bpend-block\b[^"]*"[^>]*>.*?</p>', '', body, flags=re.S)
    body, k2 = re.subn(r' ?<span class="pend"[^>]*>\[PENDIENTE:[^<]*</span>', '', body)
    assert '[PENDIENTE' not in body, 'quedan marcadores'
    print(f'  sin pendientes: {k1} bloques y {k2} marcadores eliminados')
scripts = re.findall(r'<script defer src="(js/[^"]+)"></script>\n?', head)
head = re.sub(r'<script defer src="js/[^"]+"></script>\n?', '', head)
# título y descripción: los de la configuración de la página en HubSpot, o los de la landing
head = re.sub(r'<title>.*?</title>\n', '', head)
head = re.sub(r'<meta name="description"[^>]*>\n', '', head)
head = re.sub(r'<meta charset="utf-8">\n', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\n', '', head)
body = re.sub(r'(src|srcset)="(assets/[^"]+)"', lambda m: f'{m.group(1)}="{asset_url(m.group(2))}"', body)
js = ''.join('<script>\n' + open(S + p).read() + '\n</script>\n' for p in scripts)

assert '{% endraw %}' not in head + body + js
out = f'''<!--
  templateType: page
  isAvailableForNewContent: true
  label: Landing IA · No es lo mismo
-->
<!DOCTYPE html>
<html lang="es"{(' class="' + ' '.join(c for c in [('hero-static' if STATIC_HERO else ''), ('tit-' + TIT if TIT else '')] if c) + '"') if (STATIC_HERO or TIT) else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{{{ page_meta.html_title|default("knowmad mood · No es lo mismo") }}}}</title>
<meta name="description" content="{{{{ page_meta.meta_description|default("knowmad mood, multinacional tecnológica española: ocho áreas de especialización y una IA aplicada con sentido, de la estrategia a la operación.") }}}}">
<meta name="km-build" content="{sha[:7]}">
{{{{ standard_header_includes }}}}
{{% raw %}}
{head.strip()}
{{% endraw %}}
</head>
<body>
{{% raw %}}
{body.strip()}
{js}{{% endraw %}}
{{{{ standard_footer_includes }}}}
</body>
</html>
'''
os.makedirs(os.path.join(ROOT, 'hubspot'), exist_ok=True)
name = ('landing-ia-hubspot-fondo-estatico' if STATIC_HERO else 'landing-ia-hubspot') + (f'-{TIT}' if TIT else '') + ('-sin-pendientes' if CLEAN else '') + ('-indexable' if INDEX else '') + '.html'
open(os.path.join(ROOT, 'hubspot', name), 'w').write(out)
assets = sorted(set(re.findall(re.escape(ASSET_BASE) + r'([^"\)\s]+)', out)))
print(name, len(out.encode()) // 1024, 'KB ·', len(assets), 'imágenes desde', ASSET_BASE)
for a in assets: print('  ', ASSET_BASE + a)
