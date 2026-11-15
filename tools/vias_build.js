/* Vías reales de Kennedy y flujos reales por ellas -> vias.json
   Uso: node tools/vias_build.js [carpeta data3d del simulador]
   - vias: la red vehicular de OpenStreetMap dentro de Kennedy (giro_sim.json: segmentos con jerarquía j 1-5), en el marco de nube.bin.
   - flujos.A: rutas por las calles (camino más corto, prefiriendo vías principales) desde Corabastos hasta cada plaza de mercado
     de OpenStreetMap: las plazas de mercado se abastecen en Corabastos. Es el único problema con un flujo físico documentado;
     los demás solo se marcan donde ocurren. */
const fs = require('fs'), path = require('path');
const DATA = process.argv[2] || 'C:/Users/ACER/simulador/data3d';
const R = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => [LC.x + (lng + 74.153) * 110955, LC.y + (lat - 4.636) * 110540];
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const G = R('giro_sim.json');
const vias = []; for (const s of G.seg) if (s.v && s.k) vias.push([s.j, ...s.p.map(giro).map(rel).flat()]);
// grafo vehicular
const PT = G.nodos.map(giro), ADJ = PT.map(() => []), COSTO = [1.8, 1.8, 1.3, 1.1, 1, 1];
G.seg.forEach((s, i) => { if (!s.v) return; ADJ[s.a].push(i); ADJ[s.b].push(i); });
function ruta(a, b) {
  const dist = new Float64Array(PT.length).fill(Infinity), prev = new Int32Array(PT.length).fill(-1); dist[a] = 0; const H = [[0, a]];
  while (H.length) { H.sort((p, q) => p[0] - q[0]); const [d, u] = H.shift(); if (u === b) break; if (d > dist[u]) continue;
    for (const i of ADJ[u]) { const s = G.seg[i], v = s.a === u ? s.b : s.a, nd = d + s.L * COSTO[s.j]; if (nd < dist[v]) { dist[v] = nd; prev[v] = i; H.push([nd, v]); } } }
  if (!isFinite(dist[b])) return null; const pts = []; let u = b;
  while (u !== a) { const s = G.seg[prev[u]], p = s.p.map(giro); const fw = s.b === u; (fw ? p.slice().reverse() : p).forEach((q, k) => { if (k || !pts.length) pts.push(q); }); u = s.a === u ? s.b : s.a; }
  return pts.reverse().map(rel).flat();
}
const cercano = ([x, y]) => { let b = -1, bd = Infinity; PT.forEach((p, i) => { if (!ADJ[i].length) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = i; } }); return b; };
const CO = R('corabastos.json'); const cora = [CO.poly.reduce((s, p) => s + p[0], 0) / CO.poly.length, CO.poly.reduce((s, p) => s + p[1], 0) / CO.poly.length];
const OSM = JSON.parse(fs.readFileSync('C:/Users/ACER/simulador/tools/cache/kennedy_osm.json', 'utf8')).elements;
let plazas = OSM.filter(e => e.tags && e.tags.amenity === 'marketplace').map(e => e.geometry ? e.geometry.map(g => ll2l(g.lat, g.lon)) : [ll2l(e.lat, e.lon)]).map(P => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]);
// plazas distritales oficiales de Kennedy (tools/plazas_build.js): reemplazan a la de OSM que coincide
{ const f = path.join(__dirname, '..', 'plazas_distritales.json'); if (fs.existsSync(f)) { const K = JSON.parse(fs.readFileSync(f, 'utf8')).plazas.filter(p => p.loc === 8).map(p => [p.c[0] + cx, cy - p.c[1]]);
  plazas = plazas.filter(p => !K.some(k => Math.hypot(k[0] - p[0], k[1] - p[1]) < 150)).concat(K); } }
const a = cercano(cora), flujosA = [];
for (const p of plazas) { const r = ruta(a, cercano(p)); if (r) flujosA.push(r); }
fs.writeFileSync(path.join(__dirname, '..', 'vias.json'), JSON.stringify({ fuente: 'OpenStreetMap (red vehicular de giro_sim.json del simulador)', vias, flujos: { A: flujosA } }));
console.log({ vias: vias.length, flujosA: flujosA.length, kb: Math.round(fs.statSync(path.join(__dirname, '..', 'vias.json')).size / 1024) });
