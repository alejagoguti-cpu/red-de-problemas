/* Plazas de mercado distritales (capa oficial Plaza_mercado_20211229, IDECA / IPES) -> plazas_distritales.json
   Uso: node tools/plazas_build.js [ruta sin extensión del shapefile]   (después: tools/lugares_build.js y tools/vias_build.js)
   Lee el shapefile (MAGNA-SIRGAS Bogotá), pasa cada predio a latitud/longitud y luego al marco de nube.bin
   con la misma proyección del simulador (origen 4.640683, -74.149778). Guarda las 38 de Bogotá; loc 8 = Kennedy. */
const fs = require('fs'), path = require('path');
const { leerDbf, leerShp, magnaBogotaALatLon } = require('./shp.js');
const SHP = process.argv[2] || 'C:/Users/ACER/Downloads/plaza_mercado/Plaza_mercado_20211229';
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const D = leerDbf(SHP + '.dbf').filas, G = leerShp(SHP + '.shp');
const nombre = (s) => s.replace(/^PLAZA DE MERCADO\s+/i, '').toLowerCase().replace(/(^|[\s.(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\bDe\b/g, 'de').replace(/\bDel\b/g, 'del');
// centroide de área del polígono (no el promedio de vértices, que se sesga hacia los lados con más puntos)
const centroide = (P) => { let a = 0, x = 0, y = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const f = P[j][0] * P[i][1] - P[i][0] * P[j][1]; a += f; x += (P[j][0] + P[i][0]) * f; y += (P[j][1] + P[i][1]) * f; } return a ? [x / (3 * a), y / (3 * a)] : P[0]; };
const plazas = D.map((r, i) => {
  const xy = G[i].partes[0].map(([E, N]) => rel(ll2l(...magnaBogotaALatLon(E, N))));
  return { n: nombre(r.NOMBRE), dir: r.DIRECCION, loc: +r.CODIGO_LOC, area: Math.round(r.AREA_PREDI || 0), c: centroide(xy).map(Math.round), poly: xy };
});
fs.writeFileSync(path.join(__dirname, '..', 'plazas_distritales.json'), JSON.stringify({ fuente: 'Plazas de mercado distritales, IDECA / IPES (Plaza_mercado_20211229)', plazas }));
console.log({ plazasBogota: plazas.length, enKennedy: plazas.filter((p) => p.loc === 8).map((p) => p.n + ' ' + JSON.stringify(p.c)) });
