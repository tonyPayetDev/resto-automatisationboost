#!/usr/bin/env node
/*
 * faire-outro.mjs — le carton de fin FoodBoost : 4 s, 1080x1920, 30 i/s.
 *
 *   node faire-outro.mjs [--plat 02-vitrine--rougail-saucisse] [--texte "Food Boost."]
 *                        [--out ../../rendus-premium] [--muet]
 *
 * Sort TROIS fichiers :
 *   outro-foodboost.mp4          la vidéo de 4 s
 *   outro-foodboost-fin.png      la DERNIÈRE image, en 1080x1920
 *   outro-foodboost-debut.png    la première, si l'outil en demande une aussi
 *
 * La dernière image est demandée séparément parce que les outils de génération
 * vidéo par image de départ/arrivée veulent un PNG, pas un MP4 : extraire soi-
 * même la frame d'un MP4 la fait passer par le sous-échantillonnage de la
 * chrominance (yuv420p) et les bords du texte en ressortent sales. Celle-ci est
 * capturée directement dans le navigateur, en RGB plein.
 *
 * Pourquoi le navigateur et pas ffmpeg : le build de ffmpeg d'ici n'a pas
 * libfreetype, donc pas de `drawtext`. Tout le texte est rendu par Chrome, avec
 * la vraie police Anton de la charte.
 *
 * ⚠ FONTCONFIG_PATH est obligatoire : sans lui Chromium ne rastérise AUCUNE
 *   police, le texte disparaît sans la moindre erreur, et on ne s'en aperçoit
 *   qu'en regardant une image.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FFDIR = '/home/claude/tools/ffmpeg-build/ffmpeg-7.0.2-amd64-static';
const CHROME = '/home/claude/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BANQUE = '/work/resto-automatisationboost/foodboost-editeur/photos';
const POLICES = '/work/resto-automatisationboost/foodboost-editeur/fonts';

process.env.LD_LIBRARY_PATH = [
  '/home/claude/tools/chromelibs/usr/lib/x86_64-linux-gnu',
  '/home/claude/tools/chromelibs/lib/x86_64-linux-gnu',
  process.env.LD_LIBRARY_PATH || '',
].filter(Boolean).join(':');
process.env.FONTCONFIG_PATH = '/home/claude/tools/chromelibs/etc/fonts';

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const PLAT  = arg('plat', '02-vitrine--rougail-saucisse');
const TEXTE = arg('texte', 'Food Boost.');          // ce qui est DIT
/* La ligne ecrite ne repete pas le logo : « Food Boost. » sous « FOODBOOST »
   occupe de la place et n'apporte rien. Elle dit ce que le logo ne dit pas. */
const SOUS  = arg('sous', 'Vos publications, faites avec vos photos.');
const OUT   = path.resolve(ICI, arg('out', '../../rendus-premium'));
const MUET  = process.argv.includes('--muet');

const W = 1080, H = 1920, FPS = 30, DUREE = 4.0;
const N = Math.round(DUREE * FPS);                     // 120 images
const TMP = '/tmp/outro-foodboost';
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const photo = path.join(BANQUE, PLAT + '.jpg');
if (!fs.existsSync(photo)) {
  console.error(`plat introuvable : ${photo}\nDisponibles :\n  ` +
    fs.readdirSync(BANQUE).filter((f) => f.endsWith('.jpg')).map((f) => f.replace('.jpg', '')).join('\n  '));
  process.exit(2);
}
const b64 = (p) => fs.readFileSync(p).toString('base64');

/* ── La page ────────────────────────────────────────────────────────────────
   Un seul document, rendu 120 fois. L'état est calculé par `poser(t)` à partir
   du temps — jamais par une animation CSS qui avancerait à sa propre vitesse :
   entre deux captures il s'écoule plusieurs secondes de temps réel, et une
   animation libre dériverait. */
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;font-weight:400;src:url(data:font/woff2;base64,${b64(path.join(POLICES, 'anton-latin-400-normal.woff2'))}) format('woff2')}
@font-face{font-family:S;font-weight:400;src:url(data:font/woff2;base64,${b64(path.join(POLICES, 'sora-latin-400-normal.woff2'))}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0b0d}
#plat{position:absolute;inset:0;background:url(data:image/jpeg;base64,${b64(photo)}) center/cover no-repeat;
  transform-origin:50% 42%;filter:saturate(.97) contrast(1.06) brightness(.92)}
/* Le voile : sans lui le texte blanc se pose sur une photo claire et devient
   illisible dès que le plat a du jaune — mesuré sur la piscine du Nautile. */
#voile{position:absolute;inset:0;background:
  radial-gradient(120% 70% at 50% 34%,rgba(0,0,0,0) 30%,rgba(0,0,0,.62) 100%),
  linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 52%,rgba(0,0,0,.86) 100%)}
#bloc{position:absolute;left:0;right:0;bottom:318px;text-align:center}
#mot{font-family:A;font-size:150px;line-height:.94;letter-spacing:.012em;white-space:nowrap;
  display:inline-block;will-change:transform,opacity}
#mot i{font-style:normal;color:#f0a500}
#mot b{font-weight:400;color:#fff}
#trait{height:5px;background:#f0a500;margin:26px auto 0;border-radius:99px;width:0}
#sous{font-family:S;font-size:33px;color:#d8d8e2;margin-top:24px;letter-spacing:.012em}
/* Le grain : deux points de trop et l'image fait « vidéo compressée ». */
#grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
</style></head><body>
<div id="plat"></div><div id="voile"></div>
<div id="bloc">
  <div id="mot"><i>FOOD</i><b>BOOST</b></div>
  <div id="trait"></div>
  <div id="sous"></div>
</div>
<div id="grain"></div>
<script>
var SOUS = ${JSON.stringify(SOUS)};
document.getElementById('sous').textContent = SOUS;
/* Lissage : départ et arrivée à vitesse nulle. Un mouvement à vitesse
   constante se voit démarrer et s'arrêter ; celui-ci non. */
function e(p){ p = p<0?0:p>1?1:p; return p*p*(3-2*p); }
/* Le logo « court vite » puis freine net : dépassement, puis retour. */
function retour(p){ p = p<0?0:p>1?1:p; var c=1.9, s=c+1;
  return 1 + s*Math.pow(p-1,3) + c*Math.pow(p-1,2); }
window.poser = function(t){
  var d = ${DUREE};
  document.getElementById('plat').style.transform = 'scale(' + (1.14 - 0.11*e(t/d)) + ')';
  var m = document.getElementById('mot');
  var p = e((t-0.10)/0.44);            // apparition
  var q = retour((t-0.10)/0.62);       // la course
  m.style.opacity = p;
  m.style.transform = 'translateX(' + ((1-q)*-760) + 'px) scale(' + (0.94 + 0.06*p) + ')';
  /* Le filé : fort tant que ça file, nul dès que c'est posé. */
  var v = Math.max(0, 1 - (t-0.10)/0.52);
  m.style.filter = 'blur(' + (v*v*17) + 'px)';
  document.getElementById('trait').style.width = (e((t-0.62)/0.42)*300) + 'px';
  var s = document.getElementById('sous');
  s.style.opacity = e((t-0.95)/0.5);
  s.style.transform = 'translateY(' + ((1-e((t-0.95)/0.5))*24) + 'px)';
  /* Fondu au noir sur la dernière demi-seconde : le carton doit pouvoir
     s'enchaîner derrière n'importe quel plan. */
  document.body.style.opacity = t > d-0.40 ? (1 - (t-(d-0.40))/0.40) : 1;
};
</script></body></html>`;

fs.writeFileSync(path.join(TMP, 'page.html'), PAGE);

/* ── Les images ─────────────────────────────────────────────────────────── */
const PW = (await import('/work/youtube-automation-agent/node_modules/playwright/index.js')).default;
const nav = await PW.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await nav.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(TMP, 'page.html'), { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
for (let i = 0; i < N; i++) {
  const t = i / FPS;
  await page.evaluate((x) => window.poser(x), t);
  await page.screenshot({ path: path.join(TMP, String(i).padStart(4, '0') + '.png') });
}
/* Les deux images que réclament les outils image-vers-vidéo : capturées ici,
   en RGB plein, pas extraites du MP4 après sous-échantillonnage. */
await page.evaluate(() => window.poser(0.001));
await page.screenshot({ path: path.join(OUT, 'outro-foodboost-debut.png') });
await page.evaluate((d) => window.poser(d - 0.42), DUREE);   // avant le fondu au noir
await page.screenshot({ path: path.join(OUT, 'outro-foodboost-fin.png') });
await nav.close();
console.error(`${N} images rendues`);

/* ── La voix ────────────────────────────────────────────────────────────── */
let piste = null;
if (!MUET) {
  const r = await fetch('https://n7n.automatisationboost.com/webhook/tts-gen', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    /* Le champ s'appelle `text`, PAS `texte`. Avec le mauvais nom le workflow
       répond 200 avec un corps VIDE — et le garde des 5 Ko ci-dessous accuse
       alors le crédit WaveSpeed d'une panne qui vient d'ici. Payé le
       2026-09-24 : « crédit épuisé » annoncé à tort, alors qu'une requête
       correcte rendait 6,5 Ko dans la seconde. */
    body: JSON.stringify({
      text: TEXTE,
      voixUrl: 'https://assets.automatisationboost.com/voix/archiviste_ZIl7EoOf.mp3',
    }),
  }).catch(() => null);
  if (r && r.ok) {
    const buf = Buffer.from(await r.arrayBuffer());
    /* Moins de 5 Ko : soit WaveSpeed est à sec, soit la requête est mauvaise.
       On le DIT, sans trancher entre les deux, au lieu de monter une vidéo
       muette en faisant comme si de rien n'était. */
    if (buf.length > 5000) {
      piste = path.join(TMP, 'voix.mp3');
      fs.writeFileSync(piste, buf);
      console.error(`voix : ${(buf.length / 1024).toFixed(0)} Ko`);
    } else {
      console.error(`⚠ voix NON générée : réponse de ${buf.length} octets (moins de 5 Ko). `
        + `Deux causes possibles, à départager avant d'accuser l'une : crédit WaveSpeed épuisé, `
        + `ou requête mal formée (le champ s'appelle « text »). Carton muet.`);
    }
  } else {
    console.error(`⚠ voix NON générée : ${r ? 'HTTP ' + r.status : 'webhook injoignable'}. Carton muet.`);
  }
}

/* ── Le montage ─────────────────────────────────────────────────────────── */
const ff = (a) => execFileSync(`${FFDIR}/ffmpeg`, a, { stdio: ['ignore', 'pipe', 'pipe'] });
const muet = path.join(TMP, 'muet.mp4');
ff(['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(TMP, '%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', muet]);

const final = path.join(OUT, 'outro-foodboost.mp4');
if (piste) {
  ff(['-y', '-loglevel', 'error', '-i', muet, '-i', piste,
    '-filter_complex', `[1:a]adelay=260:all=1,volume=1.0,apad=whole_dur=${DUREE}[v]`,
    '-map', '0:v', '-map', '[v]', '-t', String(DUREE),
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', final]);
} else {
  ff(['-y', '-loglevel', 'error', '-i', muet, '-c:v', 'copy', '-movflags', '+faststart', final]);
}
const d = execFileSync(`${FFDIR}/ffprobe`,
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final], { encoding: 'utf8' }).trim();
console.log(`✅ ${final} · ${Number(d).toFixed(2)} s${piste ? ' · avec voix' : ' · MUET'}`);
console.log(`   ${path.join(OUT, 'outro-foodboost-fin.png')}   ← la dernière image (end frame)`);
console.log(`   ${path.join(OUT, 'outro-foodboost-debut.png')} ← la première`);
