/* Edificios de OpenStreetMap para TODA Kennedy (buildings.json del simulador no cubre el sur ni el occidente) -> tools/cache/osm_edif.json
   Uso: node tools/osm_edif.js   (Overpass, por baldosas; reintenta las que fallan)
   Altura: building:levels × 3 m, o height; si no hay dato, 7,5 m (casa de 2-3 pisos, lo típico en Kennedy). */
const fs = require('fs'), path = require('path');
const LC = { x: 5341.33, y: 3161.9 }, ll2l = (lat, lng) => [LC.x + (lng + 74.153) * 110955, LC.y + (lat - 4.636) * 110540];
const LAT0 = 4.588, LAT1 = 4.662, LNG0 = -74.174, LNG1 = -74.096, NT = 5;
const dir = path.join(__dirname, 'cache'); fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = []; const vistos = new Set();
  for (let i = 0; i < NT; i++) for (let j = 0; j < NT; j++) {
    const a = LAT0 + (LAT1 - LAT0) * i / NT, b = LAT0 + (LAT1 - LAT0) * (i + 1) / NT, c = LNG0 + (LNG1 - LNG0) * j / NT, d = LNG0 + (LNG1 - LNG0) * (j + 1) / NT;
    const q = `[out:json][timeout:120];way["building"](${a},${c},${b},${d});out geom tags;`;
    let ok = false;
    for (let t = 0; t < 4 && !ok; t++) {
      try {
        const r = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q), { headers: { 'User-Agent': 'red-de-problemas-build' } });
        const txt = await r.text(); if (!txt.trimStart().startsWith('{')) throw new Error('respuesta ' + r.status);
        const J = JSON.parse(txt); let n = 0;
        for (const e of J.elements) { if (!e.geometry || vistos.has(e.id)) continue; vistos.add(e.id); const tg = e.tags || {};
          let h = parseFloat(tg.height); if (!(h > 0)) { const lv = parseFloat(tg['building:levels']); h = lv > 0 ? lv * 3 : 7.5; }
          out.push({ pts: e.geometry.map(g => ll2l(g.lat, g.lon).map(v => Math.round(v * 10) / 10)), h }); n++; }
        console.log(`baldosa ${i},${j}: ${n} edificios`); ok = true;
      } catch (e) { console.log(`baldosa ${i},${j} intento ${t + 1}: ${e.message}`); await sleep(8000 * (t + 1)); }
    }
    await sleep(1500);
  }
  fs.writeFileSync(path.join(dir, 'osm_edif.json'), JSON.stringify(out));
  console.log('total', out.length);
})();
