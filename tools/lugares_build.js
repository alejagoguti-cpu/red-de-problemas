/* Dónde ocurre cada problema -> lugares.json (para el recorrido con scroll)
   Uso: node tools/lugares_build.js [carpeta data3d del simulador] [carpeta tools/cache del simulador]
   Coordenadas en metros, relativas al centro de nube.bin (x este, z sur), igual que la nube de puntos.
   A Dependencia de alimentos: Corabastos, plazas de mercado (OSM) y tiendas de barrio (propuesta.json)
   B Crecimiento poblacional: edificios de 5 pisos o más (buildings.json, altura >= 15 m)
   C Valorización del suelo: obras en construcción (OSM landuse=construction)
   D Especulación: lotes vacíos o abandonados (OSM landuse=brownfield), predio de Bavaria y lotes baldíos (estrategias E8)
   E Residuos sólidos: contenedores de la UAESP (residuos.json)
   F Centralización de servicios: Corabastos, colegios y jardines (OSM), plazas de mercado y salud (OSM, Overpass) */
const fs = require('fs'), path = require('path');
const DATA = process.argv[2] || 'C:/Users/ACER/simulador/data3d', CACHE = process.argv[3] || 'C:/Users/ACER/simulador/tools/cache';
const R = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 };
// latitud/longitud -> marco del modelo: la misma proyección del simulador (origen 4.640683, -74.149778; tools/*_build.py del simulador)
const MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const G = R('giro_sim.json'), LIM = G.limite.map(giro);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const centro = (P) => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
const enK = (p) => dentro(p[0], p[1], LIM);
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// OpenStreetMap (caché del simulador)
const OSM = JSON.parse(fs.readFileSync(path.join(CACHE, 'kennedy_osm.json'), 'utf8')).elements;
const osm = (k, v) => OSM.filter(e => e.tags && e.tags[k] === v).map(e => { const p = e.geometry ? centro(e.geometry.map(g => ll2l(g.lat, g.lon))) : e.lat ? ll2l(e.lat, e.lon) : null; return p && { p, n: e.tags.name || '' }; }).filter(x => x && enK(x.p));
const colegios = osm('amenity', 'school'), jardines = osm('amenity', 'kindergarten'), obras = osm('landuse', 'construction'), lotes = osm('landuse', 'brownfield');
// plazas de mercado: solo las distritales oficiales (plazas_distritales.json, tools/plazas_build.js). Las «marketplace» de OSM en Kennedy
// son en su mayoría fruvers, supermercados y distribuidoras, no plazas de mercado.
const plazas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'plazas_distritales.json'), 'utf8')).plazas.filter(p => p.loc === 8).map(p => ({ p: [p.c[0] + cx, cy - p.c[1]], n: 'Plaza ' + p.n }));
const CO = R('corabastos.json'), cora = centro(CO.poly), BV = R('bavaria.json'), bav = centro(BV.sitio);
const tiendas = R('propuesta.json').nodos.filter(n => n.t === 'tienda').map(n => [n.x + LC.x, LC.y - n.z]).filter(enK);
const residuos = R('residuos.json').p.map(q => [q[0], q[1]]).filter(enK);
const E8 = R('estrategias.json').estrategias.find(e => e.id === 'E8'), baldios = [];
for (const c of E8.capas) if (/bald/i.test(c.n)) for (const l of c.lotes) { const P = []; for (let i = 0; i + 1 < l.length; i += 2) P.push([l[i] / 2, l[i + 1] / 2]); if (P.length > 2) baldios.push(centro(P)); }
// edificios altos (5 pisos o más): una muestra
const altos = []; for (const b of R('buildings.json')) { if ((b.h || 0) < 15) continue; const p = b.pts[0]; if (enK(p)) altos.push([p[0], p[1], b.h]); }
const muestraAltos = altos.filter(() => rnd() < Math.min(1, 1800 / altos.length));

(async () => {
  // salud (OpenStreetMap vía Overpass): hospitales, clínicas, centros de salud
  let salud = [];
  try {
    const q = '[out:json][timeout:60];(nwr["amenity"~"hospital|clinic|doctors"](4.56,-74.21,4.68,-74.10);nwr["healthcare"~"hospital|clinic|centre|doctor"](4.56,-74.21,4.68,-74.10););out center tags;';
    const r = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q), { headers: { 'User-Agent': 'red-de-problemas-build' } });
    const j = await r.json(); const vistos = new Set();
    salud = j.elements.map(e => { const ll = e.center || e; const p = ll2l(ll.lat, ll.lon); return { p, n: (e.tags && e.tags.name) || '' }; }).filter(x => enK(x.p) && !vistos.has(Math.round(x.p[0] / 30) + ',' + Math.round(x.p[1] / 30)) && vistos.add(Math.round(x.p[0] / 30) + ',' + Math.round(x.p[1] / 30)));
  } catch (e) { console.warn('Overpass no respondió:', e.message); }
  const pts = (L, peso = 1, tipo = 0) => L.map(x => { const p = x.p || x; const [a, b] = rel(p); return [a, b, peso, tipo]; });
  const hito = (n, p, sub) => ({ n, sub, p: rel(p) });
  const out = {
    fuente: 'OpenStreetMap (caché del simulador y Overpass), buildings.json, corabastos.json, bavaria.json, residuos.json (UAESP), propuesta.json, estrategias.json',
    A: { pts: pts([cora], 6, 1).concat(pts(plazas, 3.2, 2), pts(tiendas, 1, 0)), hitos: [hito('Corabastos', cora, 'abasto de toda la ciudad')].concat(plazas.map(q => hito(q.n, q.p, 'plaza distrital · abastece el barrio'))), vista: 'hitos', cuenta: [['plazas de mercado distritales', plazas.length], ['tiendas de barrio', tiendas.length]] },
    B: { pts: muestraAltos.map(([x, y, h]) => { const [a, b] = rel([x, y]); return [a, b, Math.min(4, h / 15), 0]; }), hitos: [], cuenta: [['edificios de 5 pisos o más', altos.length]] },
    C: { pts: pts(obras, 2, 0), hitos: [], cuenta: [['obras en construcción', obras.length]] },
    D: { pts: pts(lotes, 2.4, 0).concat(pts([bav], 6, 1), pts(baldios, 2.4, 2)), hitos: [hito('Bavaria', bav, 'predio de 71 ha')], cuenta: [['lotes vacíos o abandonados', lotes.length + baldios.length]] },
    E: { pts: pts(residuos, 1, 0), hitos: [], cuenta: [['contenedores de basura', residuos.length]] },
    F: { pts: pts([cora], 6, 1).concat(pts(colegios, 1.3, 0), pts(jardines, 1, 0), pts(plazas, 2.6, 2), pts(salud, 2, 3)), hitos: [hito('Corabastos', cora, 'abastos centralizados')].concat(plazas.map(q => hito(q.n, q.p, 'plaza distrital'))), cuenta: [['colegios', colegios.length], ['jardines', jardines.length], ['servicios de salud', salud.length], ['plazas de mercado distritales', plazas.length]] }
  };
  fs.writeFileSync(path.join(__dirname, '..', 'lugares.json'), JSON.stringify(out));
  for (const k of 'ABCDEF') console.log(k, out[k].pts.length, JSON.stringify(out[k].cuenta));
})();
