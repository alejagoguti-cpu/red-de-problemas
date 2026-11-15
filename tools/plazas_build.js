/* Plazas de mercado distritales (capa oficial Plaza_mercado_20211229, IDECA / IPES) -> plazas_distritales.json y lugares.json
   Uso: node tools/plazas_build.js [ruta sin extensión del shapefile]
   - Lee el shapefile (MAGNA-SIRGAS Bogotá), pasa cada predio a latitud/longitud y luego al marco de nube.bin.
   - Las plazas de la localidad 8 (Kennedy) entran al problema A (Dependencia de alimentos) y F (Centralización), con su nombre.
     Las plazas de OpenStreetMap (tools/plazas_osm.json) que coinciden (a menos de 150 m) se reemplazan por la oficial;
     las demás quedan como «otros mercados de barrio».
   - plazas_distritales.json guarda las 38 de Bogotá (para las rutas desde Corabastos en tools/vias_build.js). */
const fs = require('fs'), path = require('path');
const { leerDbf, leerShp, magnaBogotaALatLon } = require('./shp.js');
const SHP = process.argv[2] || 'C:/Users/ACER/Downloads/plaza_mercado/Plaza_mercado_20211229';
const LC = { x: 5341.33, y: 3161.9 }, ll2l = (lat, lng) => [LC.x + (lng + 74.153) * 110955, LC.y + (lat - 4.636) * 110540];
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
const D = leerDbf(SHP + '.dbf').filas, G = leerShp(SHP + '.shp');
const nombre = (s) => s.replace(/^PLAZA DE MERCADO\s+/i, '').toLowerCase().replace(/(^|[\s.(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\bDe\b/g, 'de').replace(/\bDel\b/g, 'del');
const plazas = D.map((r, i) => {
  const anillo = G[i].partes[0]; const xy = anillo.map(([E, N]) => rel(ll2l(...magnaBogotaALatLon(E, N))));
  const c = [Math.round(xy.reduce((s, p) => s + p[0], 0) / xy.length), Math.round(xy.reduce((s, p) => s + p[1], 0) / xy.length)];
  return { n: nombre(r.NOMBRE), dir: r.DIRECCION, loc: +r.CODIGO_LOC, area: Math.round(r.AREA_PREDI || 0), c, poly: xy };
});
fs.writeFileSync(path.join(__dirname, '..', 'plazas_distritales.json'), JSON.stringify({ fuente: 'Plazas de mercado distritales, IDECA / IPES (Plaza_mercado_20211229)', plazas }));
const K = plazas.filter((p) => p.loc === 8);
// lugares.json: plazas oficiales de Kennedy en A y F
const LG = path.join(__dirname, '..', 'lugares.json'), L = JSON.parse(fs.readFileSync(LG, 'utf8'));
const osm = JSON.parse(fs.readFileSync(path.join(__dirname, 'plazas_osm.json'), 'utf8'));
const otros = osm.filter((p) => !K.some((o) => Math.hypot(o.c[0] - p[0], o.c[1] - p[1]) < 150));
for (const [k, peso, sub] of [['A', 3.2, 'plaza distrital · abastece el barrio'], ['F', 2.6, 'plaza distrital']]) {
  const g = L[k]; g.pts = g.pts.filter((q) => q[3] !== 2 && q[3] !== 4); // quita plazas anteriores (OSM y oficiales de una corrida previa)
  g.pts.push(...K.map((p) => [p.c[0], p.c[1], peso, 4]), ...otros.map((p) => [p[0], p[1], peso * 0.6, 2]));
  g.cuenta = g.cuenta.filter((c) => !/plaza|mercado/i.test(c[0]));
  g.cuenta.push(['plazas de mercado distritales', K.length], ['otros mercados de barrio', otros.length]);
  g.hitos = g.hitos.filter((h) => !h.plaza).concat(K.map((p) => ({ n: 'Plaza ' + p.n, sub, p: p.c, plaza: 1 })));
}
L.A.vista = 'hitos'; // en «Dependencia de alimentos» la cámara encuadra Corabastos y las plazas distritales
fs.writeFileSync(LG, JSON.stringify(L));
console.log({ plazasBogota: plazas.length, enKennedy: K.map((p) => p.n + ' (' + p.area + ' m2)'), otrosMercados: otros.length });
