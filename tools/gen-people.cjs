// Uso: (desde un directorio con sharp instalado) node tools/gen-people.cjs
// Genera site/js/people-data.js: posiciones de exactamente 3.500 figuras (una por
// persona) dentro de la silueta del isologo, con el color de la pieza del logo
// donde cae cada una (0 = carmesí, 1 = naranja, 2 = amarillo).
const path = require('path');
const sharp = require(require.resolve('sharp', { paths: [process.cwd(), __dirname] }));
const PEOPLE = 3500;
const SRC = path.join(__dirname, '../project/assets/isologo-3d.png');
const OUT = path.join(__dirname, '../site/js/people-data.js');

function hue(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = (x, y) => { const i = ((y | 0) * W + (x | 0)) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  // Recorte al contenido opaco
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px(x, y)[3] > 160) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0, bh = y1 - y0;
  // Rejilla escalonada: se busca el paso que deja al menos 3.500 puntos dentro de la silueta
  function sample(step) {
    const pts = [];
    for (let j = 0, y = y0 + step / 2; y < y1; y += step * 0.88, j++) {
      for (let x = x0 + step / 2 + (j % 2 ? step / 2 : 0); x < x1; x += step) {
        const [r, g, b, a] = px(x, y);
        if (a < 200) continue;
        const h = hue(r, g, b);
        const tone = (h >= 330 || h < 22) ? 0 : h < 42 ? 1 : 2;
        pts.push({ x, y, tone, a });
      }
    }
    return pts;
  }
  let lo = 2, hi = 60, best = null;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; const p = sample(mid); if (p.length >= PEOPLE) { best = p; lo = mid; } else hi = mid; }
  // Exactamente 3.500: se descartan los sobrantes repartidos de forma uniforme
  const extra = best.length - PEOPLE;
  const drop = new Set(); for (let i = 0; i < extra; i++) drop.add(Math.floor((i + 0.5) * best.length / extra));
  const pts = best.filter((_, i) => !drop.has(i)).slice(0, PEOPLE);
  const S = Math.max(bw, bh);
  const flat = [];
  pts.forEach(p => flat.push(Math.round((p.x - x0) / S * 1000), Math.round((p.y - y0) / S * 1000), p.tone));
  const tones = [0, 1, 2].map(t => pts.filter(p => p.tone === t).length);
  const out = `/* GENERADO por tools/gen-people.cjs a partir de project/assets/isologo-3d.png. No editar a mano.
   ${PEOPLE} figuras, una por persona: [x, y, tono]… en milésimas del lado mayor del isologo. */
window.KM_PEOPLE = ${JSON.stringify({ count: PEOPLE, w: Math.round(bw / S * 1000), h: Math.round(bh / S * 1000), cell: Math.round(lo / S * 1000 * 100) / 100, p: flat })};
`;
  require('fs').writeFileSync(OUT, out);
  console.log('figuras', pts.length, 'paso', lo.toFixed(2), 'px de', S, '· tonos', tones, '· bytes', out.length);
})();
