/* Edificios de TODA Kennedy -> tools/cache/edif_kennedy.json ({pts, h}, marco «modelo» del simulador)
   buildings.json del simulador (catastro, con alturas) no cubre el sur ni el occidente de la localidad. En las celdas de 200 m sin
   ningún edificio de buildings.json se agregan las huellas de Microsoft Global ML Building Footprints (ODbL, baldosa 032232112);
   altura: la de Microsoft si existe, si no 7,5 m (casa de 2-3 pisos, lo típico de esos barrios).
   Uso: node --max-old-space-size=4096 tools/edif_merge.js */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SIM = 'C:/Users/ACER/simulador/data3d', C = 200;
const LC = { x: 5341.33, y: 3161.9 }, ll2l = (lat, lng) => [LC.x + (lng + 74.153) * 110955, LC.y + (lat - 4.636) * 110540];
const OX = 2095.67, OZ = -109.06, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)];
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const LIM = JSON.parse(fs.readFileSync(path.join(SIM, 'giro_sim.json'))).limite.map(giro);
const B = JSON.parse(fs.readFileSync(path.join(SIM, 'buildings.json')));
const cel = new Set(); for (const b of B) { const p = b.pts[0]; cel.add(Math.floor(p[0] / C) + ',' + Math.floor(p[1] / C)); }
const out = B.map(b => ({ pts: b.pts, h: b.h || 3 }));
const L = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'cache', 'ms_032232112.gz'))).toString().split('\n');
let n = 0;
for (const l of L) {
  if (!l) continue; const f = JSON.parse(l), ring = f.geometry.coordinates[0]; if (!ring || ring.length < 4) continue;
  const pts = ring.map(([lon, lat]) => ll2l(lat, lon).map(v => Math.round(v * 10) / 10)), p = pts[0];
  if (cel.has(Math.floor(p[0] / C) + ',' + Math.floor(p[1] / C)) || !dentro(p[0], p[1], LIM)) continue;
  out.push({ pts, h: f.properties.height > 0 ? f.properties.height : 7.5 }); n++;
}
fs.writeFileSync(path.join(__dirname, 'cache', 'edif_kennedy.json'), JSON.stringify(out));
console.log({ catastro: B.length, microsoft: n, total: out.length });
