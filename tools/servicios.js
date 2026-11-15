/* Equipamientos de servicio de Kennedy, por categoría (los usan tools/lugares_build.js y tools/destacados_build.js)
   Fuentes: plazas_distritales.json (IDECA / IPES, oficiales) y tools/cache/servicios_osm.json (OpenStreetMap vía Overpass:
   node tools/servicios_osm.js). Solo servicios públicos o colectivos: quedan fuera farmacias, odontólogos e iglesias.
   Devuelve [{cat, n, poly (marco modelo) o null, p (centro, marco modelo)}] dentro del límite de Kennedy. */
const fs = require('fs'), path = require('path');
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const CATS = [
  { id: 'plaza', n: 'plazas de mercado distritales', col: '#a3b845' },
  { id: 'educ', n: 'colegios, jardines y universidades', col: '#f2c879' },
  { id: 'salud', n: 'hospitales, clínicas y centros de salud', col: '#e8735a' },
  { id: 'comun', n: 'salones comunales, bibliotecas y cultura', col: '#c9a6e8' },
  { id: 'segur', n: 'policía, bomberos y justicia', col: '#7fb3d9' },
  { id: 'dep', n: 'polideportivos', col: '#8fd0b5' }];
function categoria(t) {
  const a = t.amenity, h = t.healthcare;
  if (/^(school|kindergarten|college|university)$/.test(a)) return 'educ';
  if (/^(hospital|clinic|doctors)$/.test(a) || /^(hospital|clinic|centre|doctor|yes)$/.test(h || '')) return 'salud';
  if (/^(community_centre|library|arts_centre|theatre|social_facility)$/.test(a)) return 'comun';
  if (/^(police|fire_station|courthouse)$/.test(a) || t.office === 'government' || a === 'townhall') return 'segur';
  if (t.leisure === 'sports_centre') return 'dep';
  return null;
}
function servicios() {
  const LIM = JSON.parse(fs.readFileSync('C:/Users/ACER/simulador/data3d/giro_sim.json', 'utf8')).limite.map(giro);
  const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
  const out = [];
  for (const p of JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'plazas_distritales.json'), 'utf8')).plazas) if (p.loc === 8)
    out.push({ cat: 'plaza', n: 'Plaza ' + p.n, poly: p.poly.map(([x, z]) => [x + cx, cy - z]), p: [p.c[0] + cx, cy - p.c[1]] });
  const vistos = new Set();
  for (const e of JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'servicios_osm.json'), 'utf8')).elements) {
    const cat = categoria(e.tags || {}); if (!cat) continue;
    let poly = null;
    if (e.type === 'way' && e.geometry) poly = e.geometry.map((g) => ll2l(g.lat, g.lon));
    else if (e.type === 'relation' && e.members) { const m = e.members.find((m) => m.role === 'outer' && m.geometry); if (m) poly = m.geometry.map((g) => ll2l(g.lat, g.lon)); }
    const p = poly ? [poly.reduce((s, q) => s + q[0], 0) / poly.length, poly.reduce((s, q) => s + q[1], 0) / poly.length] : e.lat ? ll2l(e.lat, e.lon) : null;
    if (!p || !dentro(p[0], p[1], LIM)) continue;
    const k = cat + Math.round(p[0] / 25) + ',' + Math.round(p[1] / 25); if (vistos.has(k)) continue; vistos.add(k); // mismo lugar como nodo y como área
    out.push({ cat, n: (e.tags && e.tags.name) || '', poly: poly && poly.length > 3 ? poly : null, p });
  }
  return out;
}
module.exports = { servicios, CATS, ll2l };
