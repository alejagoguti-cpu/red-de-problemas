/* ============ DEL DIAGNÓSTICO A LA ESTRATEGIA, PASO A PASO (dentro del recorrido de los seis problemas) ============
   Después de cada problema del recorrido se agregan tres pasos con la misma presentación (tarjeta + el mismo mapa fijo):
     2 · criterio y estrategia de diseño, con su sustento y URL;
     3 · escenarios: una barra deslizable («¿qué pasa si se agrega esto?») que cambia la cifra y el mapa;
     4 · plausibilidad: gráficas y literatura científica que muestran si el escenario es posible.
   Primero: 01 · Centralización de servicios. Las cifras de los escenarios son cálculo propio ya publicado en propuesta.html
   (máxima cobertura sobre 77.280 edificios residenciales por la red peatonal), no simulación dinámica. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const fmt=(v,d=0)=>(+v).toLocaleString('es-CO',{maximumFractionDigits:d,minimumFractionDigits:d});
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- fuentes (todas con URL) ---------- */
const F={
 guion:['Guion del proyecto: «28 % tiene una plaza a ≤ 15 min · suroccidente» (SDP 2022). Sin URL: no se usa como línea base hasta aportar el documento de la SDP.',''],
 paso:['Bohannon, R. W. y Andrews, A. W. (2011). Normal walking speed: a descriptive meta-analysis. Physiotherapy, 97(3), 182–189 (23.111 personas; de 0,94 a 1,43 m/s según edad y sexo).','https://pubmed.ncbi.nlm.nih.gov/21820535/'],
 pot:['Alcaldía de Bogotá. Con las Unidades de Planeamiento Local, Bogotá se consolida como la ciudad de 30 minutos (POT Bogotá Reverdece, Decreto 555 de 2021).','https://bogota.gov.co/mi-ciudad/planeacion/pot-reglamentacion-de-33-unidades-de-planeacion-local-30-urbanas'],
 pot15:['El Tiempo. El nuevo POT de Bogotá le apunta a una ciudad de 15 minutos.','https://www.eltiempo.com/bogota/nuevo-pot-de-bogota-le-apunta-a-ciudad-de-15-minutos-536761'],
 cl30:['Alcaldía de Bogotá. «Haremos una ciudad de 30 minutos con vías para bicicletas y peatones»: alcaldesa Claudia López.','https://bogota.gov.co/internacional/como-construir-una-ciudad-sostenible-y-neutra-en-carbono'],
 moreno:['Moreno, C., Allam, Z., Chabaud, D., Gall, C. y Pratlong, F. (2021). Introducing the “15-Minute City”: Sustainability, Resilience and Place Identity in Future Post-Pandemic Cities. Smart Cities, 4(1), 93–111.','https://doi.org/10.3390/smartcities4010006'],
 bruno:['Bruno, M., Monteiro Melo, H. P., Campanelli, B. y Loreto, V. (2024). A universal framework for inclusive 15-minute cities. Nature Cities, 1, 633–641.','https://arxiv.org/abs/2408.03794'],
 mclp:['Localización óptima de oferta de alimentos con el problema de máxima cobertura (supermercados y mercados de productores en Filadelfia), SSRN 2438247.','https://faculty.wharton.upenn.edu/wp-content/uploads/2014/05/SSRN-id2438247.pdf'],
 bcn:['Instituto Municipal de Mercados de Barcelona. Memoria 2023: 39 mercados alimentarios; ningún barrio sin mercado de referencia.','https://ajuntament.barcelona.cat/mercats/sites/default/files/2024-05/Memoria_IMMB_2023.pdf'],
 unal:['Instituto de Estudios Urbanos, UNAL. «En las ciudades latinoamericanas se dificulta implementar el modelo de 15 minutos dada la gran segregación» (C. A. Moreno Luna).','https://ieu.unal.edu.co/divulgacion-academica/en-las-ciudades-latinoamericanas-se-dificulta-implementar-el-modelo-de-15-minutos-dada-la-gran-segregacion-carlos-augusto-moreno-luna'],
 calc:['Casas, Gómez y Trujillo. Distrito Bavaria Común y simulador de Kennedy: acceso a plazas por la red peatonal y máxima cobertura (77.280 edificios residenciales).','https://anasoficasca-code.github.io/simulador/bavaria.html'],
 prop:['Propuesta Bavaria Común: «El comercio llega a todos; el abasto mayorista, a casi nadie».','https://alejagoguti-cpu.github.io/red-de-problemas/propuesta.html#acceso'],
 pob:['Secretaría Distrital de Salud – SaluData. Caracterización de Kennedy 2024 (1.037.929 habitantes).','https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2024/12/Kennedy_MasBienestar_2024_v1_2.pdf']};
let NREF=0;const NUM={};
const ref=(...ks)=>ks.map(k=>{if(!NUM[k])NUM[k]=++NREF;const s=F[k];return s[1]?'<a class="ee-c" href="'+s[1]+'" target="_blank" rel="noopener" title="'+s[0].replace(/"/g,'')+'">['+NUM[k]+']</a>':'<span class="ee-c ee-p" title="'+s[0].replace(/"/g,'')+'">[URL pendiente]</span>'}).join('');
const lista=ks=>'<ul class="ee-src">'+ks.map(k=>{const s=F[k];return '<li>'+(s[1]?'<a href="'+s[1]+'" target="_blank" rel="noopener">'+s[0]+'</a><span class="ee-url">'+s[1].replace(/^https?:\/\//,'')+'</span>':s[0])+'</li>'}).join('')+'</ul>';

/* ---------- datos del escenario de plazas (cálculo propio publicado en propuesta.html) ---------- */
const POP=1037929,PLAZAS=13;
// cobertura (% de viviendas) a 500 m y 800 m por la red peatonal según cuántas plazas nuevas se suman, en orden de mayor ganancia
const CURVA={500:[22.5,33.9,42.1,49.8,55.5,60.4,65.3,70.2,74.4,78.1,81.4,83.9,86.1,87.9,89.4,90.8,92.2,93.5,94.4,95.1],800:[47.3,68.7,78.7,84.8,90,92,93.9,95.4,96.8,98.1,99,99.3,99.6,99.7,99.8,99.8,99.9,99.9,99.9,100]};
// 19 sitios de la malla (marco del análisis) y viviendas de la muestra que gana cada uno; al marco del mapa: + (−7374, −2332)
const SITIOS=[[5530,3474,8841],[5620,1698,6367],[5672,2705,5935],[5028,3063,4355],[6346,3226,3823],[8828,4498,3813],[8060,3704,3739],[8886,3553,3288],[4493,3777,2797],[7006,1626,2577],[6330,4544,1949],[7594,2784,1708],[4763,2143,1398],[7733,1794,1149],[9367,2510,1074],[7429,4116,1059],[5181,3986,1019],[6002,1205,732],[9910,3337,473]].map(([x,y,g])=>[x-7374,y-2332,g]);
const META=75;
const llega=r=>CURVA[r].findIndex(v=>v>=META);

/* ---------- CSS ---------- */
const css=`
#story .card.ee{max-width:500px}
#story .card.ee .num b{color:var(--c);font-weight:500;letter-spacing:.14em}
.ee-big{display:flex;align-items:baseline;gap:14px;margin:16px 0 6px;flex-wrap:wrap}
.ee-big b{font:300 54px/1 var(--letra-titulo,'Barlow Condensed'),sans-serif;color:#f1f2f3}
.ee-big b.m{color:var(--c)}
.ee-big i{font-style:normal;color:#7a8480;font-size:22px}
.ee-big span{font:500 10px var(--letra-dato,'Geist Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:#7a8480;display:block;margin-top:4px}
.ee-tg{display:inline-block;font:500 9.5px var(--letra-dato,'Geist Mono',monospace);letter-spacing:.08em;text-transform:uppercase;padding:3px 6px;border:1px dashed var(--c);color:var(--c);margin-left:6px;vertical-align:2px}
.ee-tg.r{border-style:solid;border-color:#eaefed;color:#eaefed}
.ee-tg.c{border-style:solid;border-color:#eaefed;color:#eaefed;background:repeating-linear-gradient(135deg,rgba(234,239,237,.14) 0 2px,transparent 2px 5px)}
.ee-l{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:9px}
.ee-l li{font-size:13.5px;line-height:1.5;color:var(--tinta-2,#b6bcc0);padding-left:16px;position:relative}
.ee-l li::before{content:'';position:absolute;left:0;top:.6em;width:7px;height:7px;background:var(--c)}
.ee-l li em{font-style:normal;color:#f1f2f3}
.ee-c{font:500 10px var(--letra-dato,'Geist Mono',monospace);color:var(--c);text-decoration:none;margin-left:3px;vertical-align:1px;pointer-events:auto}
.ee-c:hover{text-decoration:underline}
.ee-p{color:#c5b994}
.ee-h{font:500 10px var(--letra-dato,'Geist Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:#7a8480;margin:16px 0 6px}
.ee-src{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px;max-height:190px;overflow:auto;pointer-events:auto;scrollbar-width:thin}
.ee-src li{font-size:11.5px;line-height:1.4;color:#8b9591}
.ee-src a{color:#b6bcc0;text-decoration:none}
.ee-src a:hover{color:#f1f2f3;text-decoration:underline}
.ee-url{display:block;font:400 10px var(--letra-dato,'Geist Mono',monospace);color:#5f6966;word-break:break-all}
.ee-ctl{margin-top:14px;pointer-events:auto}
.ee-ctl label{display:flex;justify-content:space-between;font-size:12.5px;color:#b6bcc0;margin-bottom:6px}
.ee-ctl label b{color:#f1f2f3;font-weight:500}
.ee-ctl input[type=range]{width:100%;accent-color:var(--c);cursor:pointer}
.ee-seg{display:inline-flex;border:1px solid rgba(214,228,222,.22);margin-top:10px}
.ee-seg button{font:500 11.5px Geist,sans-serif;background:none;border:0;color:#a9b3af;padding:7px 11px;cursor:pointer}
.ee-seg button[aria-pressed=true]{background:var(--c);color:#050607}
.ee-bar{position:relative;height:14px;background:rgba(214,228,222,.08);margin:16px 0 4px}
.ee-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--c);transition:width .35s cubic-bezier(.2,.7,.2,1)}
.ee-bar s{position:absolute;top:-5px;bottom:-5px;width:0;border-left:2px dashed #e6c36a}
.ee-bar s::after{content:'meta 75 %';position:absolute;left:4px;top:-15px;font:500 9.5px var(--letra-dato,'Geist Mono',monospace);color:#e6c36a;white-space:nowrap}
.ee-bar u{position:absolute;top:-3px;bottom:-3px;width:0;border-left:2px solid #f1f2f3;opacity:.6}
.ee-kv{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px}
.ee-kv div{border:1px solid rgba(214,228,222,.12);padding:8px}
.ee-kv b{display:block;font:300 24px/1 var(--letra-titulo,'Barlow Condensed'),sans-serif;color:#f1f2f3}
.ee-kv span{display:block;font-size:10.5px;color:#7a8480;margin-top:4px;line-height:1.3}
.ee-ok{margin-top:10px;font-size:13px;color:#f1f2f3;border-left:2px solid var(--c);padding-left:10px}
.ee-ch{width:100%;height:auto;display:block;margin-top:10px}
.ee-ch .g{stroke:rgba(214,228,222,.1)}
.ee-ch .ax{fill:#7a8480;font:400 9.5px 'Geist Mono',monospace}
.ee-ch .l5{fill:none;stroke:var(--c);stroke-width:2.2}
.ee-ch .l8{fill:none;stroke:#eaefed;stroke-width:1.6;stroke-dasharray:4 3}
.ee-ch .mt{stroke:#e6c36a;stroke-dasharray:5 4;stroke-width:1.3}
.ee-ch .mtx{fill:#e6c36a;font:500 9.5px 'Geist Mono',monospace}
.ee-ch .pt{fill:#050607;stroke-width:2}
.ee-ch .lb{fill:#f1f2f3;font:500 10px Geist,sans-serif}
.ee-nt{margin-top:10px;font-size:11.5px!important;line-height:1.45!important;color:#7a8480!important}
/* capa de la estrategia sobre el mapa del recorrido */
#mksvg .ee-g{opacity:0;transition:opacity .6s;pointer-events:none}
#mksvg[data-sub^=F] .ee-g.F{opacity:1}
#mksvg .ee-ring{fill:rgba(207,255,94,.07);stroke:#cfff5e;stroke-width:1.2;stroke-dasharray:4 3;vector-effect:non-scaling-stroke;transition:opacity .4s}
#mksvg .ee-palo{stroke:#cfff5e;stroke-width:1.4;vector-effect:non-scaling-stroke}
#mksvg .ee-pin{fill:#cfff5e;stroke:#050607;stroke-width:1.5;vector-effect:non-scaling-stroke}
#mksvg .ee-s{transition:opacity .4s}
#mksvg .ee-s.off{opacity:0}
.sw.nueva{background:#cfff5e;border:2px solid #050607;box-shadow:0 0 0 1px #cfff5e}
.sw.ring{background:rgba(207,255,94,.12);border:1.5px dashed #cfff5e}
`;

/* ---------- tarjetas ---------- */
function tarjetas(){
 const r5=llega(500),r8=llega(800);
 const T={};
 T.F2='<div class="num"><span>01</span> / 06 · <b>Criterio de diseño</b></div><h2>Hacia el 75 % a 15 minutos</h2><p class="tag">Llevar la plaza a la escala del barrio</p>'+
  '<div class="ee-big"><div><b>47,3 %</b><span>hoy · viviendas a ≤ 800 m</span></div><i>→</i><div><b class="m">75 %</b><span>meta de diseño · ≤ 15 min a pie</span></div></div>'+
  '<p>Hoy el <em>47,3 %</em> de las viviendas de Kennedy tiene una plaza a 800 m o menos por las calles, y el <em>22,5 %</em> a 500 m'+ref('calc','prop')+'. Caminando entre 0,94 y 1,43 m/s, en 15 minutos se recorren al menos 850 m: <em>800 m caben en 15 minutos</em> para cualquier adulto'+ref('paso')+'. El criterio: que al menos <em>tres de cada cuatro viviendas</em> tengan una plaza a esa distancia.</p>'+
  '<p class="ee-nt">El guion cita 28 % de la población del suroccidente a ≤ 15 min (SDP 2022)'+ref('guion')+'; no se usa como línea base porque no tiene URL verificable.</p>'+
  '<div class="ee-h">Por qué 15 minutos</div><ul class="ee-l">'+
  '<li>El POT Bogotá Reverdece (Decreto 555 de 2021) organiza la ciudad en Unidades de Planeamiento Local para la <em>Bogotá de los 15 y 30 minutos</em>: lo cotidiano a 15 min a pie o 30 en bicicleta o transporte público'+ref('pot','pot15')+'.</li>'+
  '<li>La alcaldesa Claudia López lo formuló como <em>ciudad de 30 minutos</em>; los 15 minutos a pie son la escala de barrio dentro de ese modelo'+ref('cl30')+'.</li>'+
  '<li>La «ciudad de 15 minutos» de Carlos Moreno propone que vivir, abastecerse, cuidarse y aprender quede a un cuarto de hora a pie'+ref('moreno')+'.</li></ul>'+
  '<div class="ee-h">Estrategia</div><ul class="ee-l"><li><em>Malla de 19 plazas de barrio</em> más una plaza mayor en Bavaria, ubicadas con máxima cobertura y sintaxis espacial (verde en el mapa)'+ref('calc','prop')+'.</li><li>Barcelona sostiene <em>39 mercados</em> y ningún barrio sin mercado de referencia'+ref('bcn')+'.</li></ul>'+
  '<div class="ee-h">Fuentes</div>'+lista(['calc','prop','paso','pot','pot15','cl30','moreno','bcn']);
 T.F3='<div class="num"><span>01</span> / 06 · <b>Escenarios</b></div><h2>¿Y si sumamos plazas?</h2><p class="tag">Mueve la barra: cada plaza se suma en orden de mayor ganancia</p>'+
  '<div class="ee-ctl"><label for="ee-k">Plazas nuevas <b id="ee-kv">0</b></label><input id="ee-k" type="range" min="0" max="19" step="1" value="0" aria-describedby="ee-out"/>'+
  '<div class="ee-seg" role="group" aria-label="Distancia a pie"><button type="button" data-r="800" aria-pressed="true">800 m · dentro de 15 min</button><button type="button" data-r="500" aria-pressed="false">500 m</button></div></div>'+
  '<div class="ee-bar" aria-hidden="true"><i id="ee-bi"></i><u id="ee-b0"></u><s style="left:75%"></s></div>'+
  '<div class="ee-kv" id="ee-out" aria-live="polite"><div><b id="ee-p">47,3 %</b><span>viviendas con plaza a esa distancia</span></div><div><b id="ee-d">+0,0</b><span>puntos frente a hoy</span></div><div><b id="ee-h">79.800</b><span>habitantes por plaza</span></div></div>'+
  '<p class="ee-ok" id="ee-ok"></p>'+
  '<p class="ee-nt">Cálculo propio por la red peatonal sobre 77.280 edificios residenciales de toda Kennedy'+ref('calc')+'; habitantes por plaza = 1.037.929'+ref('pob')+' ÷ (13 + plazas nuevas). 800 m caben en 15 minutos a pie incluso al paso más lento reportado (0,94 m/s)'+ref('paso')+'.</p>'+
  '<div class="ee-h">Fuentes</div>'+lista(['calc','pob','prop','paso']);
 T.F4='<div class="num"><span>01</span> / 06 · <b>Plausibilidad</b></div><h2>¿Es posible llegar?</h2><p class="tag">La curva del escenario y lo que dice la literatura</p>'+
  grafica(r5,r8)+
  '<ul class="ee-l"><li>A 800 m (dentro de 15 min a pie'+ref('paso')+') bastan <em>'+r8+' plazas nuevas</em> para pasar el 75 %; a 500 m hacen falta <em>'+r5+'</em>. La propuesta plantea 19.'+ref('calc')+'</li>'+
  '<li>Ubicar oferta de alimentos con el <em>modelo de máxima cobertura</em> es un método probado para cerrar desiertos alimentarios'+ref('mclp')+'.</li>'+
  '<li>Un estudio global en <em>Nature Cities</em> mide el tiempo de proximidad en ciudades de todo el mundo: la densidad local de población juega un papel clave y el número de servicios adicionales que hacen falta para llegar a 15 min varía mucho entre ciudades'+ref('bruno')+'.</li>'+
  '<li>Barcelona demuestra que una red de mercados de barrio funciona en una ciudad densa: 39 mercados, ningún barrio sin mercado'+ref('bcn')+'.</li>'+
  '<li><em>Límite:</em> en ciudades latinoamericanas la segregación dificulta el modelo de 15 minutos; la cercanía no garantiza precio ni acceso'+ref('unal')+'.</li></ul>'+
  '<p class="ee-ok">Plausible en distancia: la meta se alcanza antes de completar la malla. Falta validarla con simulación (cálculo geométrico por la red, no dinámico).</p>'+
  '<div class="ee-h">Fuentes</div>'+lista(['calc','paso','mclp','bruno','bcn','unal']);
 return T}

function grafica(r5,r8){const W=420,H=190,l=34,r=10,t=14,b=28,X=k=>l+k*(W-l-r)/19,Y=v=>t+(1-v/100)*(H-t-b);
 const path=a=>a.map((v,k)=>(k?'L':'M')+X(k).toFixed(1)+' '+Y(v).toFixed(1)).join('');
 let s='<svg class="ee-ch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Viviendas con plaza a 500 y 800 m según el número de plazas nuevas">';
 [0,25,50,75,100].forEach(v=>s+='<line class="g" x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="ax" x="'+(l-5)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+v+'%</text>');
 [0,5,10,15,19].forEach(k=>s+='<text class="ax" x="'+X(k)+'" y="'+(H-12)+'" text-anchor="middle">'+k+'</text>');
 s+='<text class="ax" x="'+((l+W-r)/2)+'" y="'+(H-1)+'" text-anchor="middle">plazas nuevas</text>';
 s+='<line class="mt" x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(75)+'" y2="'+Y(75)+'"/><text class="mtx" x="'+(W-r)+'" y="'+(Y(75)-4)+'" text-anchor="end">meta 75 %</text>';
 s+='<path class="l8" d="'+path(CURVA[800])+'"/><path class="l5" d="'+path(CURVA[500])+'"/>';
 s+='<circle class="pt" style="stroke:#eaefed" cx="'+X(r8)+'" cy="'+Y(CURVA[800][r8])+'" r="4"/><text class="lb" x="'+(X(r8)+6)+'" y="'+(Y(CURVA[800][r8])+14)+'">800 m: '+r8+'</text>';
 s+='<circle class="pt" style="stroke:var(--c)" cx="'+X(r5)+'" cy="'+Y(CURVA[500][r5])+'" r="4"/><text class="lb" x="'+(X(r5)+6)+'" y="'+(Y(CURVA[500][r5])+14)+'">500 m: '+r5+'</text>';
 return s+'</svg>'}

/* ---------- capa de la estrategia en el mapa del recorrido ---------- */
function capaMapa(){const svg=document.getElementById('mksvg');if(!svg||typeof MK==='undefined'||!MK.P)return null;let g=svg.querySelector('.ee-g.F');if(g)return g;
 g=document.createElementNS(NS,'g');g.setAttribute('class','ee-g F');
 let h='';SITIOS.forEach(([x,z],i)=>{const ring=[];for(let a=0;a<48;a++){const q=MK.P(x+500*Math.cos(a/48*6.2832),z+500*Math.sin(a/48*6.2832),0);ring.push(q[0].toFixed(1)+' '+q[1].toFixed(1))}
  const b=MK.P(x,z,0),tp=MK.P(x,z,260);
  h+='<g class="ee-s" data-i="'+i+'"><path class="ee-ring" d="M'+ring.join('L')+'Z"/><line class="ee-palo" x1="'+b[0]+'" y1="'+b[1]+'" x2="'+tp[0]+'" y2="'+tp[1]+'"/><circle class="ee-pin" cx="'+tp[0]+'" cy="'+tp[1]+'" r="46"/></g>'});
 g.innerHTML=h;svg.appendChild(g);return g}
function verSitios(k){const g=capaMapa();if(!g)return;g.querySelectorAll('.ee-s').forEach(s=>s.classList.toggle('off',+s.dataset.i>=k))}

const TAG={F2:'criterio: plazas a la escala del barrio',F3:'escenarios: ¿y si sumamos plazas?',F4:'plausibilidad de la malla'};
const LEY2={F2:[['cora','Corabastos · central mayorista'],['plaza','plazas de mercado hoy'],['nueva','19 plazas nuevas de la malla'],['ring','500 m a la redonda (6–7 min)']],
 F3:[['plaza','plazas de mercado hoy'],['nueva','plazas nuevas sumadas'],['ring','500 m a la redonda']],
 F4:[['plaza','plazas de mercado hoy'],['nueva','malla completa: 19 plazas'],['ring','500 m a la redonda']]};
let K=0;
function envolverPaso(){if(typeof pasoMapa!=='function'||pasoMapa.__ee)return typeof pasoMapa==='function';const base=pasoMapa;
 const nuevo=function(id){const m=/^([A-F])(\d)$/.exec(id);const svg=document.getElementById('mksvg');
  if(!m){base(id);if(svg)delete svg.dataset.sub;return}
  base(m[1]);if(!svg)return;svg.dataset.sub=id;capaMapa();verSitios(id==='F3'?K:19);
  const tg=document.getElementById('mktag');if(tg)tg.textContent=TAG[id]||'';
  const ley=document.getElementById('mkley');if(ley&&LEY2[id])ley.innerHTML=LEY2[id].map(([k,t])=>'<span><i class="sw '+k+'"></i>'+t+'</span>').join('')};
 nuevo.__ee=1;pasoMapa=nuevo;return true}

function montar(){
 const pf=document.querySelector('#mk .paso[data-k=F]');if(!pf||typeof PC==='undefined'||!envolverPaso())return false;if(document.querySelector('#mk .paso[data-k=F2]'))return true;
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const T=tarjetas();let ant=pf;
 ['F2','F3','F4'].forEach(k=>{const s=document.createElement('section');s.className='pb paso ee-paso';s.dataset.k=k;
  s.innerHTML='<article class="card esc ee" style="--c:'+PC.F+'" aria-label="'+TAG[k]+'">'+T[k]+'</article>';ant.insertAdjacentElement('afterend',s);ant=s;
  const c=s.querySelector('.card');if(typeof vis!=='undefined'&&vis.observe)vis.observe(c);else c.classList.add('vis')});
 // el mapa sigue al paso visible, igual que los pasos del recorrido
 const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)pasoMapa(e.target.dataset.k)}),{rootMargin:'-45% 0px -45% 0px'});
 document.querySelectorAll('#mk .ee-paso').forEach(p=>obs.observe(p));
 // escenarios
 let R=800;const out=()=>{const p=CURVA[R][K],p0=CURVA[R][0],hab=Math.round(POP/(PLAZAS+K)/100)*100;
  document.getElementById('ee-kv').textContent=K;document.getElementById('ee-p').textContent=fmt(p,1)+' %';document.getElementById('ee-d').textContent='+'+fmt(p-p0,1);document.getElementById('ee-h').textContent=fmt(hab);
  document.getElementById('ee-bi').style.width=p+'%';document.getElementById('ee-b0').style.left=p0+'%';
  const n=llega(R);document.getElementById('ee-ok').textContent=p>=META?'Con '+K+' plazas nuevas se supera la meta del 75 % a '+R+' m.':'Faltan '+(n-K)+' plazas para llegar al 75 % a '+R+' m (se alcanza con '+n+').';
  if(document.getElementById('mksvg')&&document.getElementById('mksvg').dataset.sub==='F3')verSitios(K)};
 const rg=document.getElementById('ee-k');rg.addEventListener('input',()=>{K=+rg.value;out()});
 document.querySelectorAll('.ee-seg button').forEach(b=>b.addEventListener('click',()=>{R=+b.dataset.r;document.querySelectorAll('.ee-seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));out()}));
 out();return true}
if(!montar()){const t=setInterval(()=>{if(montar())clearInterval(t)},200)}
})();
