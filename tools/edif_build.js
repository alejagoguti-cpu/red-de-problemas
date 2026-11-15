/* Volúmenes de los edificios de Kennedy -> edif.bin (para verlos sólidos en el recorrido)
   Uso: node tools/edif_build.js [carpeta data3d del simulador]
   Cada edificio de buildings.json dentro de Kennedy se reduce a una caja orientada (eje principal de su huella).
   Mismo marco que nube.bin: x este, z sur, en metros desde el centro de la nube.
   Formato: 'EDIF' · uint32 n · por edificio int16 x, z, ancho, fondo (medios metros), int16 ángulo (×10.000 rad), int16 altura (medios metros).
   Ordenados de mayor a menor volumen: la página puede dibujar solo los primeros en celular. */
const fs = require('fs'), path = require('path');
const SRC = process.argv[2] || 'C:/Users/ACER/simulador/data3d';
const R = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)];
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const LIM = R('giro_sim.json').limite.map(giro);
const out = [];
for (const b of R('buildings.json')) {
  const P = b.pts.map(([x, y]) => [x - cx, -(y - cy)]); if (P.length < 3) continue;
  const p0 = b.pts[0]; if (!dentro(p0[0], p0[1], LIM)) continue;
  let mx = 0, mz = 0; for (const [x, z] of P) { mx += x; mz += z; } mx /= P.length; mz /= P.length;
  let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of P) { const dx = x - mx, dz = z - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const a = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(a), uz = Math.sin(a);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, z] of P) { const u = (x - mx) * ux + (z - mz) * uz, v = -(x - mx) * uz + (z - mz) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const w = Math.max(1.5, u1 - u0), d = Math.max(1.5, v1 - v0), uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
  const x = mx + uc * ux - vc * uz, z = mz + uc * uz + vc * ux, h = Math.max(3, b.h || 3);
  out.push([x, z, w * 0.94, d * 0.94, Math.atan2(-uz, ux), h, w * d * h]); // 0,94: deja una calle visible entre casas pegadas
}
out.sort((p, q) => q[6] - p[6]);
const buf = Buffer.alloc(8 + out.length * 12); buf.write('EDIF', 0); buf.writeUInt32LE(out.length, 4);
const c16 = (v) => Math.max(-32767, Math.min(32767, Math.round(v)));
out.forEach(([x, z, w, d, a, h], i) => { const o = 8 + i * 12; buf.writeInt16LE(c16(x * 2), o); buf.writeInt16LE(c16(z * 2), o + 2); buf.writeInt16LE(c16(w * 2), o + 4); buf.writeInt16LE(c16(d * 2), o + 6); buf.writeInt16LE(c16(a * 10000), o + 8); buf.writeInt16LE(c16(h * 2), o + 10); });
fs.writeFileSync(path.join(__dirname, '..', 'edif.bin'), buf);
console.log({ edificios: out.length, kb: Math.round(buf.length / 1024) });
