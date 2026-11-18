/* Agua de Kennedy para la portada -> agua.json
   Uso: node tools/agua_build.js
   Fuentes: humedales de giro_sim.json (simulador) y polígonos natural=water / wetland de OpenStreetMap
   (caché tools/cache/kennedy_osm.json del simulador): Río Bogotá, humedales La Vaca, El Burro y Techo, Lago Timiza, pondajes.
   Marco: metros relativos al centro de nube.bin (x este, z sur). */
const fs = require('fs'), path = require('path');
const R = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const G = R('C:/Users/ACER/simulador/data3d/giro_sim.json'), LIM = G.limite.map(giro);
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; LIM.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
const cerca = (P) => P.some(([x, y]) => x > x0 - 700 && x < x1 + 700 && y > y0 - 700 && y < y1 + 700);
const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(a) / 2; };
const out = [];
for (const e of R('C:/Users/ACER/simulador/tools/cache/kennedy_osm.json').elements) {
  const t = e.tags || {}; if (!(t.natural === 'water' || t.natural === 'wetland' || t.water || t.wetland)) continue;
  const g = e.geometry || (e.members ? (e.members.find((m) => m.role === 'outer' && m.geometry) || {}).geometry : null); if (!g || g.length < 4) continue;
  const P = g.map((q) => ll2l(q.lat, q.lon)); if (!cerca(P) || area(P) < 1500) continue;
  out.push({ n: t.name || '', t: /r[ií]o/i.test(t.name || '') ? 'rio' : t.natural === 'wetland' || t.wetland ? 'humedal' : 'agua', poly: P.map(rel) });
}
for (const h of G.humedales) out.push({ n: h.n, t: 'humedal', poly: h.poly.map(giro).map(rel) });
fs.writeFileSync(path.join(__dirname, '..', 'agua.json'), JSON.stringify({ fuente: 'giro_sim.json (simulador) y OpenStreetMap (natural=water/wetland)', agua: out }));
console.log(out.length, out.filter((o) => o.n).map((o) => o.t + ':' + o.n));
