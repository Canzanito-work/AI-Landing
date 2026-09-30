import re,base64,subprocess,os
# Uso: python3 tools/build-single.py  →  landing-ia.html (todo en un archivo, funciona sin conexión)
CA=os.environ.get('CURL_CA_BUNDLE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else '')
CURL_CA=['--cacert',CA] if CA else []
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
S=os.path.join(ROOT,'site')+'/'
def uri(p):
    mt={'webp':'image/webp','png':'image/png'}[p.rsplit('.',1)[1]]
    return f"data:{mt};base64,"+base64.b64encode(open(S+p,'rb').read()).decode()
html=open(S+'index.html').read(); css=open(S+'css/styles.css').read()
css=re.sub(r'url\(\.\./(assets/[^)]+)\)',lambda m:f'url("{uri(m.group(1))}")',css)
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
FONT_URL=re.search(r'rel="stylesheet" href="(https://fonts.googleapis.com/css2[^"]*)"',html).group(1)
font=subprocess.run(['curl','-sS','-A',UA,FONT_URL]+CURL_CA,capture_output=True,check=True).stdout.decode()
for u in sorted(set(re.findall(r'url\((https://[^)]+\.woff2)\)',font))):
    d=subprocess.run(['curl','-sS',u]+CURL_CA,capture_output=True,check=True).stdout
    font=font.replace(u,'data:font/woff2;base64,'+base64.b64encode(d).decode())
html=re.sub(r'<link rel="(preload|preconnect)"[^>]*>\n','',html)
html=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^"]*">',lambda m:'<style>\n'+font+'\n</style>',html)
html=html.replace('<link rel="stylesheet" href="css/styles.css">','<style>\n'+css+'\n</style>')
scripts=re.findall(r'<script defer src="(js/[^"]+)"></script>\n?',html)
html=re.sub(r'<script defer src="js/[^"]+"></script>\n?','',html)
html=html.replace('</body>',''.join('<script>\n'+open(S+p).read()+'\n</script>\n' for p in scripts)+'</body>')
html=re.sub(r'(src|srcset)="(assets/[^"]+)"',lambda m:f'{m.group(1)}="{uri(m.group(2))}"',html)
assert 'font/woff2;base64' in html, 'Figtree no embebida'
assert not re.findall(r'(?:href|src)="(?:https?://|assets/|css/|js/)[^"]*"',html)
open(os.path.join(ROOT,'landing-ia.html'),'w').write(html)
print(os.path.getsize(os.path.join(ROOT,'landing-ia.html'))//1024,'KB')
