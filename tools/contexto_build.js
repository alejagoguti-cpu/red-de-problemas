/* Contexto para los pasos del mapa -> contexto.json
   Uso: node tools/contexto_build.js
   - metro: trazado de la Línea 1 del Metro (OpenStreetMap, en obra; tools/cache/metro_osm.json) y sus estaciones en Kennedy,
     ubicadas donde la línea cruza las calles de las fichas oficiales (Empresa Metro / Alcaldía): Villavicencio × Kr 94-93, × Kr 86B,
     × Kr 80; Primero de Mayo × Cl 42 Sur, Hospital de Kennedy, × Av. Boyacá; × Av. 68.
   - obras: polígonos landuse=construction de OpenStreetMap dentro de Kennedy, con nombre cuando lo tienen.
   - huerta: huerta Vive Vibra Verde, sede de la JAC de Carvajal Osorio (Kr 68L # 37D Sur), ruta agroecológica del Jardín Botánico.
   - iso: distancia a pie por la red de calles (giro_sim.json del simulador, todos los tramos) desde cada plaza distrital, hasta 1.125 m
     (15 min a 4,5 km/h). Cálculo propio: Dijkstra sobre la red, no círculos. */
const fs = require('fs'), path = require('path');
const R = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const G = R('C:/Users/ACER/simulador/data3d/giro_sim.json'), LIM = G.limite.map(giro);
const OSM = R('C:/Users/ACER/simulador/tools/cache/kennedy_osm.json').elements;
// --- metro ---
const M = R(path.join(__dirname, 'cache', 'metro_osm.json')).elements.filter((e) => e.type === 'way' && e.tags && e.tags.name === 'Línea 1' && e.geometry);
// une los tramos en una sola polilínea (orden por cercanía de extremos)
let tramos = M.map((w) => w.geometry.map((g) => ll2l(g.lat, g.lon)));
const lin = tramos.shift();
while (tramos.length) { let bi = -1, bd = 1e9, rev = false, alInicio = false; tramos.forEach((t, i) => { const c = [[t[0], lin[lin.length - 1], false, false], [t[t.length - 1], lin[lin.length - 1], true, false], [t[t.length - 1], lin[0], false, true], [t[0], lin[0], true, true]]; for (const [a, b, r, ini] of c) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < bd) { bd = d; bi = i; rev = r; alInicio = ini; } } });
  let t = tramos.splice(bi, 1)[0]; if (rev) t = t.slice().reverse(); if (bd > 400) continue; alInicio ? lin.unshift(...t) : lin.push(...t); }
const cerca = (p, d) => Math.min(...LIM.map((q, i) => { const b = LIM[(i + 1) % LIM.length], dx = b[0] - q[0], dy = b[1] - q[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / L)); return Math.hypot(p[0] - q[0] - t * dx, p[1] - q[1] - t * dy); })) < d;
const linK = lin.filter((p) => dentro(p[0], p[1], LIM) || cerca(p, 900));
// puntos de la calle cada ~15 m (los vértices de OSM pueden quedar lejos del cruce)
const calle = (re) => OSM.filter((w) => w.type === 'way' && w.tags && w.tags.highway && w.tags.name && re.test(w.tags.name) && w.geometry).flatMap((w) => { const g = w.geometry.map((q) => ll2l(q.lat, q.lon)), o = [];
  for (let i = 0; i + 1 < g.length; i++) { const n = Math.max(1, Math.ceil(Math.hypot(g[i + 1][0] - g[i][0], g[i + 1][1] - g[i][1]) / 15)); for (let k = 0; k < n; k++) o.push([g[i][0] + (g[i + 1][0] - g[i][0]) * k / n, g[i][1] + (g[i + 1][1] - g[i][1]) * k / n]); } return o; });
const sobreLinea = (pts) => { let bp = null, bd = 1e9; for (const p of pts) for (let i = 0; i + 1 < linK.length; i++) { const a = linK[i], b = linK[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)), q = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bp = q; } } return bd < 250 ? bp : null; };
const hosp = [ll2l(4.6172717, -74.1516678), ll2l(4.6162674, -74.1535247)].concat(OSM.filter((e) => e.tags && /Hospital.*Kennedy|Occidente de Kennedy/i.test(e.tags.name || '')).map((e) => e.geometry ? ll2l(e.geometry[0].lat, e.geometry[0].lon) : ll2l(e.lat, e.lon))); // Hospital de Kennedy: OpenStreetMap (Overpass)
const EST = [
  ['Estación 1', 'Av. Villavicencio × Kr 94', calle(/^Carrera 9[34]$/)], ['Estación 2', 'Villavicencio × Kr 86B · Portal Américas', calle(/^Carrera 86 ?B$/)],
  ['Estación 3', 'Villavicencio × Kr 80', calle(/^(Avenida )?Carrera 80$/)], ['Estación 4', 'Primero de Mayo × Cl 42 Sur', calle(/^Calle 42 ?C? Sur$/)],
  ['Estación 5', 'Hospital de Kennedy', hosp], ['Estación 6', 'Primero de Mayo × Av. Boyacá', calle(/^Avenida Carrera 72$/)], ['Estación 7', 'Primero de Mayo × Av. 68', calle(/^Avenida Carrera 68$/)]];
const estaciones = EST.map(([n, sub, pts]) => { const p = pts.length ? sobreLinea(pts) : null; return p && { n, sub, p: rel(p) }; }).filter(Boolean);
// --- obras en construcción ---
const cen = (P) => [P.reduce((s, q) => s + q[0], 0) / P.length, P.reduce((s, q) => s + q[1], 0) / P.length];
const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(a) / 2; };
const obras = OSM.filter((e) => e.tags && (e.tags.landuse === 'construction' || (e.tags.building === 'construction')) && e.geometry).map((e) => ({ n: e.tags.name || '', t: e.tags.construction || '', poly: e.geometry.map((g) => ll2l(g.lat, g.lon)) }))
  .filter((o) => { const c = cen(o.poly); return dentro(c[0], c[1], LIM); }).map((o) => ({ n: o.n, t: o.t, a: Math.round(area(o.poly)), poly: o.poly.map(rel) }));
// --- huerta de Carvajal Osorio: cruce Kr 68L × Cl 37D Sur ---
const kr = calle(/^Carrera 68 ?L$/), cl = calle(/^Calle 37 ?D Sur$/); let huerta = null, hd = 1e9;
for (const a of kr) for (const b of cl) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < hd) { hd = d; huerta = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; } }
// --- isócronas a pie desde las plazas distritales ---
const PT = G.nodos.map(giro), ADJ = PT.map(() => []);
G.seg.forEach((s, i) => { ADJ[s.a].push(i); ADJ[s.b].push(i); });
const PZ = R(path.join(__dirname, '..', 'plazas_distritales.json')).plazas.filter((p) => p.loc === 8);
const MAXD = 1125, mejor = new Float64Array(PT.length).fill(Infinity);
for (const pz of PZ) {
  const c = [pz.c[0] + cx, cy - pz.c[1]]; // de vuelta al marco del modelo
  const ini = PT.map((p, i) => [Math.hypot(p[0] - c[0], p[1] - c[1]), i]).filter(([d, i]) => ADJ[i].length).sort((a, b) => a[0] - b[0]).slice(0, 4);
  const dist = new Float64Array(PT.length).fill(Infinity), H = []; for (const [d, i] of ini) { dist[i] = d; H.push([d, i]); }
  while (H.length) { H.sort((a, b) => a[0] - b[0]); const [d, u] = H.shift(); if (d > dist[u] || d > MAXD) continue;
    for (const si of ADJ[u]) { const s = G.seg[si], v = s.a === u ? s.b : s.a, nd = d + s.L; if (nd < dist[v]) { dist[v] = nd; H.push([nd, v]); } } }
  for (let i = 0; i < PT.length; i++) mejor[i] = Math.min(mejor[i], dist[i]);
}
const iso = [];
G.seg.forEach((s) => { const da = mejor[s.a], db = mejor[s.b]; const d = Math.min(da, db); if (d > MAXD) return; iso.push([Math.round(Math.max(da === Infinity ? db + s.L : da, db === Infinity ? da + s.L : db) / 10) * 10, ...s.p.map(giro).map(rel).flat()]); });
const out = { fuente: 'OpenStreetMap (Línea 1 en obra, obras, calles); estaciones según fichas de la Empresa Metro y la Alcaldía; huerta: Jardín Botánico de Bogotá; isócronas: cálculo propio sobre la red de giro_sim.json', metro: linK.map(rel), estaciones, obras, huerta: huerta && { p: rel(huerta), n: 'Huerta Vive Vibra Verde', sub: 'JAC Carvajal Osorio · compostaje y cultivo' }, iso };
fs.writeFileSync(path.join(__dirname, '..', 'contexto.json'), JSON.stringify(out));
console.log({ metroPts: linK.length, estaciones: estaciones.map((e) => e.n + ' ' + e.p), obras: obras.length, conNombre: obras.filter((o) => o.n).map((o) => o.n).slice(0, 12), huerta: huerta && Math.round(hd) + ' m', iso: iso.length, kb: Math.round(fs.statSync(path.join(__dirname, '..', 'contexto.json')).size / 1024) });
