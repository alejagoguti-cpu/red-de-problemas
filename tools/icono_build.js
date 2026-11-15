/* Ícono de la pestaña: vista aérea de Kennedy recortada con la forma de la localidad -> icono-32.png, icono-64.png, icono-180.png
   Uso: node tools/icono_build.js
   Fuentes del propio repositorio: limite.json (forma), edif.bin (huella y altura de cada edificio), vias.json (avenidas).
   Se dibuja a 1024 px (norte arriba), fuera del límite queda transparente, y se reduce promediando a cada tamaño. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = (f) => path.join(__dirname, '..', f);
const LIM = JSON.parse(fs.readFileSync(R('limite.json'), 'utf8')).pts; // [x este, z sur] en metros
const S = 1024, PAD = 0.035;
let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of LIM) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
const esc = (S * (1 - 2 * PAD)) / Math.max(x1 - x0, z1 - z0), ox = S / 2 - ((x0 + x1) / 2) * esc, oz = S / 2 - ((z0 + z1) / 2) * esc;
const px = (x, z) => [x * esc + ox, z * esc + oz];
const poly = LIM.map(([x, z]) => px(x, z));
// capas: L = luz (0..1) del terreno; mascara dentro/fuera
const L = new Float32Array(S * S), M = new Uint8Array(S * S);
function relleno(P, cb) { // polígono por barrido
  let ya = 1e9, yb = -1e9; for (const p of P) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
  for (let y = Math.max(0, Math.floor(ya)); y <= Math.min(S - 1, Math.ceil(yb)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i]; if ((ay > yc) !== (by > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(S - 1, Math.floor(xs[k + 1] - 0.5)); x++) cb(x, y);
  }
}
relleno(poly, (x, y) => { M[y * S + x] = 1; L[y * S + x] = 0.07; }); // suelo oscuro
// edificios: más claros cuanto más altos
const eb = fs.readFileSync(R('edif.bin')), n = eb.readUInt32LE(4);
for (let i = n - 1; i >= 0; i--) { // del más pequeño al más grande: los grandes quedan encima
  const o = 8 + i * 12, x = eb.readInt16LE(o) / 2, z = eb.readInt16LE(o + 2) / 2, w = eb.readInt16LE(o + 4) / 2, d = eb.readInt16LE(o + 6) / 2, a = eb.readInt16LE(o + 8) / 10000, h = eb.readInt16LE(o + 10) / 2;
  const c = Math.cos(a), s = Math.sin(a), q = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => px(x + u * c + v * s, z - u * s + v * c));
  const luz = 0.34 + 0.6 * Math.min(1, Math.pow(h / 36, 0.7));
  relleno(q, (X, Y) => { const k = Y * S + X; if (M[k]) L[k] = Math.max(L[k], luz); });
}
// avenidas: líneas claras (jerarquía 4-5)
const V = JSON.parse(fs.readFileSync(R('vias.json'), 'utf8')).vias;
function linea(a, b, r, luz) { const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]), N = Math.max(1, Math.ceil(L2)); for (let t = 0; t <= N; t++) { const cx = a[0] + ((b[0] - a[0]) * t) / N, cy = a[1] + ((b[1] - a[1]) * t) / N; for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { if (x < 0 || y < 0 || x >= S || y >= S || (x - cx) ** 2 + (y - cy) ** 2 > r * r) continue; const k = y * S + x; if (M[k]) L[k] = Math.max(L[k], luz); } } }
for (const v of V) { const j = v[0]; if (j < 4) continue; for (let i = 1; i + 3 < v.length; i += 2) linea(px(v[i], v[i + 1]), px(v[i + 2], v[i + 3]), j >= 5 ? 3.2 : 2.2, 0.9); }
// a RGBA: gris cálido como la tinta de la página; borde de la forma más claro y grueso para que se lea pequeño
function aRGBA(borde) {
  const P = new Float32Array(S * S * 4);
  for (let k = 0; k < S * S; k++) { if (!M[k]) continue; const l = L[k]; P[k * 4] = 0.84 * l + 0.02; P[k * 4 + 1] = 0.89 * l + 0.025; P[k * 4 + 2] = 0.87 * l + 0.03; P[k * 4 + 3] = 1; }
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], LL = Math.hypot(b[0] - a[0], b[1] - a[1]), N = Math.max(1, Math.ceil(LL)); for (let t = 0; t <= N; t++) { const cx = a[0] + ((b[0] - a[0]) * t) / N, cy = a[1] + ((b[1] - a[1]) * t) / N; for (let y = Math.floor(cy - borde); y <= Math.ceil(cy + borde); y++) for (let x = Math.floor(cx - borde); x <= Math.ceil(cx + borde); x++) { if (x < 0 || y < 0 || x >= S || y >= S || (x - cx) ** 2 + (y - cy) ** 2 > borde * borde) continue; const k = y * S + x; P[k * 4] = 0.86; P[k * 4 + 1] = 0.9; P[k * 4 + 2] = 0.88; P[k * 4 + 3] = 1; } } }
  return P;
}
function reducir(P, T) { // promedio por bloques, con alfa premultiplicado
  const f = S / T, out = Buffer.alloc(T * T * 4);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { let r = 0, g = 0, b = 0, a = 0, c = 0; for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++) for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) { const k = (yy * S + xx) * 4, al = P[k + 3]; r += P[k] * al; g += P[k + 1] * al; b += P[k + 2] * al; a += al; c++; }
    const o = (y * T + x) * 4; if (a > 0) { out[o] = Math.round((r / a) * 255); out[o + 1] = Math.round((g / a) * 255); out[o + 2] = Math.round((b / a) * 255); } out[o + 3] = Math.round((a / c) * 255); }
  return out;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const trozo = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(px4, T) { const ih = Buffer.alloc(13); ih.writeUInt32BE(T, 0); ih.writeUInt32BE(T, 4); ih[8] = 8; ih[9] = 6; const raw = Buffer.alloc(T * (T * 4 + 1)); for (let y = 0; y < T; y++) { raw[y * (T * 4 + 1)] = 0; px4.copy(raw, y * (T * 4 + 1) + 1, y * T * 4, (y + 1) * T * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ih), trozo('IDAT', zlib.deflateSync(raw, { level: 9 })), trozo('IEND', Buffer.alloc(0))]); }
for (const [T, borde] of [[32, 22], [64, 13], [180, 6]]) { const out = R('icono-' + T + '.png'); fs.writeFileSync(out, png(reducir(aRGBA(borde), T), T)); console.log(out, fs.statSync(out).size + ' B'); }
