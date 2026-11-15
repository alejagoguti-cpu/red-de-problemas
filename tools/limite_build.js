/* Límite de la localidad de Kennedy -> limite.json (para dibujar el borde nítido en el recorrido)
   Uso: node tools/limite_build.js [carpeta data3d del simulador]
   Fuente: giro_sim.json del simulador (límite oficial de la localidad). Mismo marco que nube.bin y edif.bin:
   x este, z sur, en metros desde el centro de la nube. */
const fs = require('fs'), path = require('path');
const SRC = process.argv[2] || 'C:/Users/ACER/simulador/data3d';
const OX = 2095.67, OZ = -109.06, LC = { x: 5341.33, y: 3161.9 }, giro = ([x, y]) => [x + OX + LC.x, LC.y - (y + OZ)];
const nube = fs.readFileSync(path.join(__dirname, '..', 'nube.bin')), cx = nube.readFloatLE(8), cy = nube.readFloatLE(12);
const G = JSON.parse(fs.readFileSync(path.join(SRC, 'giro_sim.json'), 'utf8'));
const pts = G.limite.map(giro).map(([x, y]) => [Math.round(x - cx), Math.round(-(y - cy))]);
let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
fs.writeFileSync(path.join(__dirname, '..', 'limite.json'), JSON.stringify({ fuente: 'Límite de la localidad 8 (giro_sim.json del simulador)', pts }));
console.log({ vertices: pts.length, areaHa: Math.round(Math.abs(a) / 2 / 1e4) });
