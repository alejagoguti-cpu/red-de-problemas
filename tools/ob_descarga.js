/* Google Open Buildings v3 (CC BY 4.0 / ODbL) -> tools/cache/ob_kennedy.csv
   Descarga en flujo la baldosa S2 «8e3» (Bogotá, ~683 MB comprimidos) y guarda solo las huellas dentro del recuadro de Kennedy
   con confianza >= 0,70. No guarda el archivo completo.
   Uso: node tools/ob_descarga.js */
const https = require('https'), zlib = require('zlib'), fs = require('fs'), path = require('path'), readline = require('readline');
const URL = 'https://storage.googleapis.com/open-buildings-data/v3/polygons_s2_level_4_gzip/8e3_buildings.csv.gz';
const BB = { la0: 4.592, la1: 4.668, lo0: -74.19, lo1: -74.114 };
const out = fs.createWriteStream(path.join(__dirname, 'cache', 'ob_kennedy.csv'));
let n = 0, k = 0;
https.get(URL, (res) => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  const rl = readline.createInterface({ input: res.pipe(zlib.createGunzip()), crlfDelay: Infinity });
  rl.on('line', (l) => {
    n++; if (n === 1) { out.write(l + '\n'); return; }
    const c1 = l.indexOf(','), c2 = l.indexOf(',', c1 + 1), c3 = l.indexOf(',', c2 + 1), c4 = l.indexOf(',', c3 + 1);
    const la = +l.slice(0, c1), lo = +l.slice(c1 + 1, c2), conf = +l.slice(c3 + 1, c4);
    if (la < BB.la0 || la > BB.la1 || lo < BB.lo0 || lo > BB.lo1 || conf < 0.7) return;
    out.write(l + '\n'); k++;
    if (k % 20000 === 0) console.log('guardados', k, 'de', n);
  });
  rl.on('close', () => { out.end(); console.log({ leidos: n, enKennedy: k }); });
}).on('error', (e) => { console.error(e); process.exit(1); });
