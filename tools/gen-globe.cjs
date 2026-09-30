// Uso: npm i d3-geo topojson-client world-atlas@2 && node tools/gen-globe.cjs
// Genera site/js/globe-data.js: mapa de puntos del mundo (Natural Earth 1:50m vía world-atlas)
// codificado por anillos de latitud en tramos (run-length), con los 14 países de presencia marcados.
const topo = require('topojson-client');
const d3 = require('d3-geo');
const w = require('world-atlas/countries-50m.json');
const PRESENCE = [ // [nombre en world-atlas, nombre ES]
  ['United States of America','Estados Unidos'],['Mexico','México'],['Peru','Perú'],['Chile','Chile'],
  ['Argentina','Argentina'],['Uruguay','Uruguay'],['Ireland','Irlanda'],['United Kingdom','Reino Unido'],
  ['Portugal','Portugal'],['Spain','España'],['Morocco','Marruecos'],['Germany','Alemania'],['Italy','Italia'],['India','India'],
];
const feats = topo.feature(w, w.objects.countries).features.map(f => ({ f, b: d3.geoBounds(f), name: f.properties.name }));
const inBox = (b, lon, lat) => {
  const [[x0, y0], [x1, y1]] = b;
  if (lat < y0 || lat > y1) return false;
  return x0 <= x1 ? (lon >= x0 && lon <= x1) : (lon >= x0 || lon <= x1); // cruza el antimeridiano
};
const code = new Map(PRESENCE.map(([n], i) => [n, i + 1]));
const STEP = 0.9, LAT_MIN = -58, LAT_MAX = 84;
const rings = [];
for (let lat = LAT_MIN; lat <= LAT_MAX + 1e-9; lat += STEP) {
  const n = Math.max(1, Math.round(360 * Math.cos(lat * Math.PI / 180) / STEP));
  const cells = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const lon = -180 + (i + 0.5) * 360 / n;
    for (const c of feats) {
      if (inBox(c.b, lon, lat) && d3.geoContains(c.f, [lon, lat])) { cells[i] = code.get(c.name) || 0; break; }
    }
  }
  const runs = []; // [inicio, longitud, código]
  for (let i = 0; i < n; ) {
    if (cells[i] < 0) { i++; continue; }
    let j = i; while (j < n && cells[j] === cells[i]) j++;
    runs.push(i, j - i, cells[i]); i = j;
  }
  rings.push([+lat.toFixed(2), n, runs]);
}
// Marcador: centroide del polígono principal de cada país (sin territorios lejanos)
const markers = PRESENCE.map(([n]) => {
  const f = feats.find(c => c.name === n).f;
  let best = f;
  if (f.geometry.type === 'MultiPolygon') {
    const polys = f.geometry.coordinates.map(c => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c } }));
    best = polys.sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
  }
  return d3.geoCentroid(best).map(v => +v.toFixed(2));
});
const count = rings.reduce((s, r) => s + r[2].reduce((a, v, k) => a + (k % 3 === 1 ? v : 0), 0), 0);
const hl = PRESENCE.map((_, i) => rings.reduce((s, r) => { let t = 0; for (let k = 0; k < r[2].length; k += 3) if (r[2][k + 2] === i + 1) t += r[2][k + 1]; return s + t; }, 0));
const out = `/* GENERADO por gen-globe (Natural Earth 1:50m vía world-atlas). No editar a mano.
   rings: [latitud, celdas del anillo, [inicio, longitud, país]…] · país 0 = tierra, 1…14 = presencia */
window.KM_GLOBE = ${JSON.stringify({ step: STEP, countries: PRESENCE.map(p => p[1]), markers, rings })};
`;
require('fs').writeFileSync(require('path').join(__dirname, '../site/js/globe-data.js'), out);
console.log('dots', count, 'per country', Object.fromEntries(PRESENCE.map((p, i) => [p[1], hl[i]])), 'bytes', out.length);
