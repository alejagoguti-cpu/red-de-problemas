/* Descarga los equipamientos de servicio de Kennedy desde OpenStreetMap (Overpass) -> tools/cache/servicios_osm.json
   Uso: node tools/servicios_osm.js   (después: tools/lugares_build.js y tools/destacados_build.js) */
const fs = require('fs'), path = require('path');
const BB = '4.592,-74.19,4.668,-74.114';
const q = `[out:json][timeout:120];(nwr["amenity"~"^(school|kindergarten|college|university|library|hospital|clinic|doctors|dentist|police|fire_station|townhall|community_centre|social_facility|arts_centre|theatre|marketplace|place_of_worship|courthouse|post_office)$"](${BB});nwr["healthcare"](${BB});nwr["leisure"="sports_centre"](${BB});nwr["office"="government"](${BB}););out geom tags;`;
(async () => {
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'red-de-problemas-build' } });
  const j = await r.json(); fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'cache', 'servicios_osm.json'), JSON.stringify(j)); console.log({ elementos: j.elements.length });
})();
