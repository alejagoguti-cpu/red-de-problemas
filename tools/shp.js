/* Lector mínimo de shapefile (.shp + .dbf) y paso de MAGNA-SIRGAS Bogotá (cartesiana local) a latitud/longitud.
   Lo usan tools/plazas_build.js y otros scripts que lean capas de datos abiertos de Bogotá. */
const fs = require('fs');
function leerDbf(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10), F = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) F.push({ n: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), t: String.fromCharCode(b[o + 11]), l: b[o + 16] });
  const R = [];
  for (let i = 0; i < n; i++) { let o = hl + i * rl + 1; const r = {}; for (const f of F) { const s = b.toString('utf8', o, o + f.l).trim(); r[f.n] = f.t === 'N' || f.t === 'F' ? (s === '' ? null : +s) : s; o += f.l; } R.push(r); }
  return { campos: F, filas: R };
}
function leerShp(file) {
  const b = fs.readFileSync(file), out = []; let o = 100;
  while (o < b.length) {
    const len = b.readInt32BE(o + 4) * 2; const c = o + 8, t = b.readInt32LE(c);
    if (t === 1) out.push({ tipo: 'punto', partes: [[[b.readDoubleLE(c + 4), b.readDoubleLE(c + 12)]]] });
    else if (t === 5 || t === 3) { const np = b.readInt32LE(c + 36), nn = b.readInt32LE(c + 40), P = []; for (let i = 0; i < np; i++) P.push(b.readInt32LE(c + 44 + i * 4)); const pb = c + 44 + np * 4, partes = []; for (let i = 0; i < np; i++) { const a = P[i], z = i + 1 < np ? P[i + 1] : nn, q = []; for (let k = a; k < z; k++) q.push([b.readDoubleLE(pb + k * 16), b.readDoubleLE(pb + k * 16 + 8)]); partes.push(q); } out.push({ tipo: t === 5 ? 'poligono' : 'linea', partes }); }
    else out.push({ tipo: 'otro', partes: [] });
    o = c + len;
  }
  return out;
}
// Transversa de Mercator inversa (Snyder) con los parámetros de MAGNA-SIRGAS / Bogotá urbana (CarMAGBOG)
function magnaBogotaALatLon(E, N, prm = { a: 6380687.0, f: 1 / 298.257222101, E0: 92334.879, N0: 109320.965, lon0: -74.14659167, lat0: 4.680486111, k0: 1 }) {
  const { a, f, E0, N0, k0 } = prm, e2 = f * (2 - f), ep2 = e2 / (1 - e2), rad = Math.PI / 180;
  const M = (p) => a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * p - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p) - (35 * e2 ** 3 / 3072) * Math.sin(6 * p));
  const m = M(prm.lat0 * rad) + (N - N0) / k0, mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256)), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), R1 = a * (1 - e2) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5, D = (E - E0) / (N1 * k0);
  const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24);
  const lon = prm.lon0 * rad + (D - (1 + 2 * T1 + C1) * D ** 3 / 6) / Math.cos(p1);
  return [lat / rad, lon / rad];
}
module.exports = { leerDbf, leerShp, magnaBogotaALatLon };
