/* Edificios de servicio resaltados -> destacados.json
   Uso: node tools/destacados_build.js   (necesita edif.bin, nube.bin, plazas_distritales.json y tools/cache/servicios_osm.json)
   Para cada equipamiento (tools/servicios.js):
     - si tiene predio (área en OSM o polígono oficial): todos los edificios de edif.bin cuyo centro cae dentro, y el contorno del predio;
     - si es un punto: el edificio que lo contiene o, si no hay, el más cercano a menos de 20 m.
   Formato: cats [{id, n, col, lugares, edificios}], b [[x, z, w, d, ángulo×1000, alto, cat]] y o [[cat, x1, z1, x2, z2, ...]] (contornos),
   en metros relativos al centro de nube.bin (x este, z sur). */
const fs = require('fs'), path = require('path');
const { servicios, CATS } = require('./servicios.js');
const R = (f) => path.join(__dirname, '..', f);
const nube = fs.readFileSync(R('nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [x - cx, -(y - cy)];
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
// edificios y rejilla de búsqueda (celdas de 20 m)
const eb = fs.readFileSync(R('edif.bin')), n = eb.readUInt32LE(4), E = [], GR = new Map(), C = 20;
for (let i = 0; i < n; i++) { const o = 8 + i * 12; const e = [eb.readInt16LE(o) / 2, eb.readInt16LE(o + 2) / 2, eb.readInt16LE(o + 4) / 2, eb.readInt16LE(o + 6) / 2, eb.readInt16LE(o + 8) / 10000, eb.readInt16LE(o + 10) / 2]; E.push(e);
  const k = Math.floor(e[0] / C) + ',' + Math.floor(e[1] / C); if (!GR.has(k)) GR.set(k, []); GR.get(k).push(i); }
const cerca = (x0, z0, x1, z1) => { const r = []; for (let gx = Math.floor(x0 / C); gx <= Math.floor(x1 / C); gx++) for (let gz = Math.floor(z0 / C); gz <= Math.floor(z1 / C); gz++) { const L = GR.get(gx + ',' + gz); if (L) r.push(...L); } return r; };
const contiene = (e, x, z) => { const dx = x - e[0], dz = z - e[1], c = Math.cos(e[4]), s = Math.sin(e[4]); const u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) <= e[2] / 2 + 1 && Math.abs(v) <= e[3] / 2 + 1; };
const ci = Object.fromEntries(CATS.map((c, i) => [c.id, i])), usados = new Map(), O = [], lug = CATS.map(() => 0);
for (const s of servicios()) {
  const k = ci[s.cat]; lug[k]++;
  if (s.poly) {
    const P = s.poly.map(rel); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (const i of cerca(x0, z0, x1, z1)) if (!usados.has(i) && dentro(E[i][0], E[i][1], P)) usados.set(i, k);
    O.push([k, ...P.flat().map(Math.round)]);
  } else {
    const [x, z] = rel(s.p); let best = -1, bd = 20;
    for (const i of cerca(x - 25, z - 25, x + 25, z + 25)) { if (contiene(E[i], x, z)) { best = i; break; } const d = Math.hypot(E[i][0] - x, E[i][1] - z); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && !usados.has(best)) usados.set(best, k);
  }
}
const b = [...usados].map(([i, k]) => { const e = E[i]; return [Math.round(e[0] * 2) / 2, Math.round(e[1] * 2) / 2, Math.round(e[2] * 2) / 2, Math.round(e[3] * 2) / 2, Math.round(e[4] * 1000), Math.round(e[5] * 2) / 2, k]; });
const ed = CATS.map(() => 0); for (const x of b) ed[x[6]]++;
const out = { fuente: 'Plazas distritales IDECA/IPES; equipamientos de OpenStreetMap; edificios de edif.bin', cats: CATS.map((c, i) => ({ ...c, lugares: lug[i], edificios: ed[i] })), b, o: O };
fs.writeFileSync(R('destacados.json'), JSON.stringify(out));
console.log(out.cats.map((c) => c.id + ': ' + c.lugares + ' lugares, ' + c.edificios + ' edificios').join('\n'), '\nkb', Math.round(fs.statSync(R('destacados.json')).size / 1024));
