/* UPZ de Kennedy con población y densidad -> upz.json
   Fuente: capa «Arbolado por UPZ» del Jardín Botánico de Bogotá (geoportal.jbb.gov.co, PlanDesarrollo/ArboladoTerritorio/MapServer/1),
   que trae el polígono de cada UPZ, su área (ha) y la población proyectada 2023 y 2024.
   Uso: node tools/upz_build.js   (descarga si no está en tools/cache/upz_kennedy.geojson) */
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, 'cache', 'upz_kennedy.geojson');
const URL = 'https://geoportal.jbb.gov.co/agc/rest/services/PlanDesarrollo/ArboladoTerritorio/MapServer/1/query?where=Codigo_localidad%3D%2708%27&outFields=Codigo_UPZ,Nombre_UPZ,Poblacion_Anio_2023,Poblacion_Anio_2024,Hectarea&returnGeometry=true&outSR=4326&f=geojson';
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, MXg = 111320 * Math.cos(4.63 * Math.PI / 180);
const giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)], ll2l = (lat, lng) => giro([(lng + 74.149778) * MXg, -(lat - 4.640683) * 110540]);
(async () => {
  if (!fs.existsSync(F)) { const r = await fetch(URL); fs.mkdirSync(path.dirname(F), { recursive: true }); fs.writeFileSync(F, await r.text()); }
  const G = JSON.parse(fs.readFileSync(F, 'utf8').replace(/^﻿/, ''));
  const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
  const rel = ([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))];
  const nom = (s) => s.replace('Americas', 'Américas');
  const upz = G.features.map((f) => {
    const p = f.properties, anillo = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates.sort((a, b) => b[0].length - a[0].length)[0][0];
    const poly = anillo.map(([lo, la]) => rel(ll2l(la, lo)));
    let a = 0, x = 0, y = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const k = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]; a += k; x += (poly[j][0] + poly[i][0]) * k; y += (poly[j][1] + poly[i][1]) * k; }
    return { cod: p.Codigo_UPZ, n: nom(p.Nombre_UPZ), pob23: p.Poblacion_Anio_2023, pob24: p.Poblacion_Anio_2024, ha: Math.round(p.Hectarea * 10) / 10, dens: Math.round(p.Poblacion_Anio_2024 / p.Hectarea), c: [Math.round(x / (3 * a)), Math.round(y / (3 * a))], poly };
  });
  fs.writeFileSync(path.join(__dirname, '..', 'upz.json'), JSON.stringify({ fuente: 'Jardín Botánico de Bogotá, capa Arbolado por UPZ (población proyectada SDP 2023-2024)', upz }));
  console.log(upz.map((u) => u.n + ' ' + u.dens + ' hab/ha').join('\n'), '\ntotal 2024', upz.reduce((s, u) => s + u.pob24, 0));
})();
