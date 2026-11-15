/* Edificios de TODA Kennedy -> tools/cache/edif_kennedy.json ({pts, h}, marco «modelo» del simulador)
   buildings.json del simulador (catastro, con alturas) no cubre el sur ni parte del occidente de la localidad.
   Donde no hay catastro se agregan huellas detectadas en imágenes:
     1. Google Open Buildings v3 (tools/cache/ob_kennedy.csv, de tools/ob_descarga.js): casa por casa, confianza >= 0,70.
     2. Microsoft Global ML Building Footprints (baldosa 032232112) solo donde tampoco hay Google.
   El cruce es fino: una huella se agrega si su centro no cae sobre un edificio ya puesto (rejilla de 4 m), así no quedan huecos
   ni duplicados en el borde entre fuentes. Altura sin dato: 6 / 7,5 / 9 m según el tamaño de la huella (casas de 2 a 3 pisos).
   Uso: node --max-old-space-size=4096 tools/edif_merge.js */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SIM = 'C:/Users/ACER/simulador/data3d', G4 = 4;
// latitud/longitud -> marco «modelo»: la misma proyección del simulador (origen 4.640683, -74.149778)
const LC = { x: 5341.33, y: 3161.9 }, OX = 2095.67, OZ = -109.06, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)];
const MXg = 111320 * Math.cos(4.63 * Math.PI / 180), ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const LIM = JSON.parse(fs.readFileSync(path.join(SIM, 'giro_sim.json'))).limite.map(giro);
const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(a) / 2; };
const centro = (P) => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
// ocupación: celdas de 4 m cubiertas por edificios ya puestos
const OC = new Set();
function ocupar(P) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let gx = Math.floor(x0 / G4); gx <= Math.floor(x1 / G4); gx++) for (let gy = Math.floor(y0 / G4); gy <= Math.floor(y1 / G4); gy++) if (dentro((gx + 0.5) * G4, (gy + 0.5) * G4, P)) OC.add(gx * 100003 + gy);
}
const libre = (P) => { const [x, y] = centro(P); return !OC.has(Math.floor(x / G4) * 100003 + Math.floor(y / G4)); };
const altura = (A) => (A < 60 ? 6 : A < 150 ? 7.5 : 9);
const B = JSON.parse(fs.readFileSync(path.join(SIM, 'buildings.json')));
const out = B.map((b) => ({ pts: b.pts, h: b.h || 3 }));
for (const b of B) { const p = b.pts[0]; if (p[0] > 3000 && p[0] < 11500 && p[1] > -2500 && p[1] < 6500) ocupar(b.pts); } // solo cerca de Kennedy
// 1. Google Open Buildings
let ng = 0; const fOB = path.join(__dirname, 'cache', 'ob_kennedy.csv');
if (fs.existsSync(fOB)) {
  const L = fs.readFileSync(fOB, 'utf8').split('\n');
  for (let i = 1; i < L.length; i++) {
    const l = L[i]; const a = l.indexOf('POLYGON(('); if (a < 0) continue; const z = l.indexOf('))', a);
    const pts = l.slice(a + 9, z).split(',').map((s) => { const [lo, la] = s.trim().split(/\s+/).map(Number); return ll2l(la, lo).map((v) => Math.round(v * 10) / 10); });
    if (pts.length < 4) continue; const c = centro(pts); if (!dentro(c[0], c[1], LIM) || !libre(pts)) continue;
    out.push({ pts, h: altura(area(pts)) }); ocupar(pts); ng++;
  }
}
// 2. Microsoft, solo donde no hay nada
let nm = 0; const LM = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'cache', 'ms_032232112.gz'))).toString().split('\n');
for (const l of LM) {
  if (!l) continue; const f = JSON.parse(l), ring = f.geometry.coordinates[0]; if (!ring || ring.length < 4) continue;
  const pts = ring.map(([lon, lat]) => ll2l(lat, lon).map((v) => Math.round(v * 10) / 10)), c = centro(pts);
  if (!dentro(c[0], c[1], LIM) || !libre(pts)) continue;
  out.push({ pts, h: f.properties.height > 0 ? f.properties.height : altura(area(pts)) }); ocupar(pts); nm++;
}
fs.writeFileSync(path.join(__dirname, 'cache', 'edif_kennedy.json'), JSON.stringify(out));
console.log({ catastro: B.length, google: ng, microsoft: nm, total: out.length });
