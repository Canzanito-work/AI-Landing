// Uso: (desde un directorio con sharp instalado) node tools/clients.cjs <carpeta de logos> site/assets/clients
// Normaliza logos de clientes: silueta blanca con alfa, recortada, tamaño óptico por área.
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const IN = process.argv[2], OUT = process.argv[3];
const MAP = [ // [archivo, slug, nombre, modo]
  ['Logo_Inditex.png', 'inditex', 'Inditex', 'alpha'],
  ['img-portal-2024-10-17-descarga-logo-eci-letras.png', 'el-corte-ingles', 'El Corte Inglés', 'alpha'],
  ['png-clipart-santander-group-logo-brand-banco-santander-brazilian-festivals-text-logo.png', 'santander', 'Santander', 'red'],
  ['Logo_CaixaBank.svg.webp', 'caixabank', 'CaixaBank', 'alpha'],
  ['Logo_Mapfre_2026.svg.webp', 'mapfre', 'Mapfre', 'alpha'],
  ['AXA_Logo.svg.webp', 'axa', 'AXA', 'notblue'],
  ['Logotipo_de_Iberia.svg.webp', 'iberia', 'Iberia', 'alpha'],
  ['Telef#U00f3nica_2021_logo.svg.webp', 'telefonica', 'Telefónica', 'alpha'],
  ['Logo_Iberdrola_(2023).svg.webp', 'iberdrola', 'Iberdrola', 'alpha'],
  ['Boehringer_Ingelheim_Logo.svg.webp', 'boehringer-ingelheim', 'Boehringer Ingelheim', 'alpha'],
  ['Volkswagen_logo_2019.svg.webp', 'volkswagen', 'Volkswagen Group Services', 'alpha'],
  ['Logo_RTVE.svg.webp', 'rtve', 'RTVE', 'alpha'],
];
const AREA = 3000, MAXH = 44, MAXW = 150, RES = 3;   // px CSS; se exporta a 3x
(async () => {
  const meta = [];
  for (const [file, slug, name, mode] of MAP) {
    const { data, info } = await sharp(path.join(IN, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < info.width * info.height; i++) {
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
      let alpha = a;
      if (mode === 'notblue') alpha = (b > r + 60 && b > g + 60) ? 0 : a;                 // quita el cuadrado azul de AXA
      if (mode === 'red') { const red = r - Math.max(g, b); alpha = Math.max(0, Math.min(255, (red - 40) * 2.2)); } // solo el rojo de Santander
      out[i*4] = out[i*4+1] = out[i*4+2] = 255; out[i*4+3] = alpha;
    }
    // margen transparente antes de recortar: trim() toma como fondo el píxel de la esquina (Inditex toca el borde)
    const padded = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
    const trimmed = await sharp(padded).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
    const ratio = trimmed.info.width / trimmed.info.height;
    let h = Math.sqrt(AREA / ratio), w = h * ratio;
    if (h > MAXH) { h = MAXH; w = h * ratio; }
    if (w > MAXW) { w = MAXW; h = w / ratio; }
    const W = Math.round(w), H = Math.round(h);
    const buf = await sharp(trimmed.data).resize(W * RES, H * RES, { fit: 'fill', kernel: 'lanczos3' }).webp({ lossless: true, effort: 6 }).toBuffer();
    fs.writeFileSync(path.join(OUT, slug + '.webp'), buf);
    meta.push({ slug, name, w: W, h: H, kb: +(buf.length / 1024).toFixed(1) });
  }
  fs.writeFileSync(path.join(OUT, '_meta.json'), JSON.stringify(meta, null, 1));
  console.table(meta);
})();
