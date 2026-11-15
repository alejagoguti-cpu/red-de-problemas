/* Nube de puntos de Kennedy para la entrada de la Red de problemas -> nube.bin
   Uso: node tools/nube_build.js [carpeta data3d del simulador]
   Fuentes (repositorio anasoficasca-code/simulador): buildings.json (243.538 edificios con altura), giro_sim.json (calles de OSM,
   humedales, límite de Kennedy), corabastos.json. Marco "modelo": x este, y norte, metros.
   Formato: 'NUBE' · uint32 n · float32 cx, cy (centro) · por punto int16 x, int16 y(altura), int16 z en medios metros · uint8 tipo
   tipo: 0 edificio · 1 calle · 2 humedal · 3 Corabastos · 4 límite de Kennedy */
const fs = require('fs'), path = require('path');
const SRC = process.argv[2] || 'C:/Users/ACER/simulador/data3d';
const R = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)];
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
let seed = 20261115; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const G = R('giro_sim.json'), LIM = G.limite.map(giro);
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of LIM) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
const P = []; const pon = (x, y, h, t) => P.push([x - cx, h, -(y - cy), t]); // y norte -> -z
const borde = (pts, paso, h, t, prob = 1) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / paso)); for (let k = 0; k < n; k++) if (rnd() < prob) { const f = k / n; pon(ax + (bx - ax) * f, ay + (by - ay) * f, h, t); } } };
// edificios dentro de Kennedy: contorno del techo; los altos, también aristas verticales
const B = R('buildings.json'); let nb = 0;
for (const b of B) {
  const p = b.pts[0]; if (!dentro(p[0], p[1], LIM)) continue; nb++;
  const h = Math.max(3, b.h || 3), alto = h >= 15;
  if (!alto && rnd() > 0.075) continue; // casas: una de cada trece (las torres siempre)
  borde(b.pts, alto ? 6 : 8, h, 0, alto ? 0.75 : 0.6);
  if (alto) for (let i = 0; i < b.pts.length - 1; i += 3) for (let z = 3; z < h; z += 7) pon(b.pts[i][0], b.pts[i][1], z, 0);
}
// calles (red vehicular de OSM) a ras del suelo
for (const s of G.seg) if (s.v && s.k) borde(s.p.map(giro), s.j >= 3 ? 7 : 12, 0, 1, s.j >= 3 ? 1 : 0.55);
// humedales: borde y espejo de agua
for (const h of G.humedales) { const poly = h.poly.map(giro); borde(poly, 3, 0.5, 2); let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const q of poly) { a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); b0 = Math.min(b0, q[1]); b1 = Math.max(b1, q[1]); } for (let i = 0; i < 900; i++) { const x = a0 + rnd() * (a1 - a0), y = b0 + rnd() * (b1 - b0); if (dentro(x, y, poly)) pon(x, y, 0.2, 2); } }
// Corabastos (la centralización) y el límite de la localidad
const CO = R('corabastos.json'); borde(CO.poly, 2.5, 1, 3); for (const n of CO.naves) { const c = Math.cos(n.a), s = Math.sin(n.a), hx = n.L / 2, hy = n.W / 2; const q = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy], [-hx, -hy]].map(([u, v]) => [n.c[0] + u * c - v * s, n.c[1] + u * s + v * c]); borde(q, 3, 9, 3); }
borde(LIM.concat([LIM[0]]), 6, 0, 4);
// recorte final: como máximo ~85 mil puntos de edificios (fluido en la web y en celular)
{ const nE = P.filter(p => p[3] === 0).length, f = Math.min(1, 85000 / nE); for (let i = P.length - 1; i >= 0; i--) if (P[i][3] === 0 && rnd() > f) P.splice(i, 1); }
// a binario
const n = P.length, buf = Buffer.alloc(16 + n * 7); buf.write('NUBE', 0); buf.writeUInt32LE(n, 4); buf.writeFloatLE(cx, 8); buf.writeFloatLE(cy, 12);
const cl = (v) => Math.max(-32767, Math.min(32767, Math.round(v * 2)));
P.forEach(([x, y, z, t], i) => { const o = 16 + i * 7; buf.writeInt16LE(cl(x), o); buf.writeInt16LE(cl(y), o + 2); buf.writeInt16LE(cl(z), o + 4); buf.writeUInt8(t, o + 6); });
fs.writeFileSync(path.join(__dirname, '..', 'nube.bin'), buf);
const tipos = [0, 0, 0, 0, 0]; for (const p of P) tipos[p[3]]++;
console.log({ edificiosEnKennedy: nb, puntos: n, porTipo: tipos, kb: Math.round(buf.length / 1024), ancho: Math.round(x1 - x0), alto: Math.round(y1 - y0) });
