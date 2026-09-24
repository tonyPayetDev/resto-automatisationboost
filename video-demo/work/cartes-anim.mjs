#!/usr/bin/env node
/*
 * cartes-anim.mjs <slug> — les legendes ANIMEES, et remplies de vraies infos.
 *
 * Remplace les trois PNG figes de cartes.mjs par trois SUITES d'images
 * transparentes. Demande de Tony, 2026-09-24 : « rajoute des animations sur
 * les titres et vraies infos sur l'entreprise ».
 *
 * Sortie : captures/<slug>/anim/l1/0000.png … l3/0029.png  (30 images = 1 s)
 * Le montage joue cette seconde d'animation puis GELE la derniere image pour
 * le reste du plan (`tpad=stop_mode=clone`). Animer les 120 images de chaque
 * plan couterait quatre fois le temps de rendu pour trois secondes ou plus
 * rien ne bouge.
 *
 * Les textes viennent de infos.mjs, qui ne renvoie QUE ce qu'un fichier porte.
 *
 * ⚠ FONTCONFIG_PATH : sans lui Chromium ne rastérise aucune police et le texte
 *   disparait sans erreur. On ne s'en apercoit qu'en regardant une image.
 */
process.env.LD_LIBRARY_PATH = '/home/claude/tools/chromelibs/usr/lib/x86_64-linux-gnu:/home/claude/tools/chromelibs/lib/x86_64-linux-gnu';
process.env.FONTCONFIG_PATH = '/home/claude/tools/chromelibs/etc/fonts';
process.env.FONTCONFIG_FILE = '/home/claude/tools/chromelibs/etc/fonts/fonts.conf';
import pw from '/work/youtube-automation-agent/node_modules/playwright/index.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const { chromium } = pw;
const slug = process.argv[2];
if (!slug) { console.error('usage: cartes-anim.mjs <slug>'); process.exit(2); }

const POLICES = '/work/resto-automatisationboost/foodboost-editeur/fonts';
const b64 = (p) => fs.readFileSync(p).toString('base64');

const infos = JSON.parse(execFileSync(process.execPath,
  [new URL('./infos.mjs', import.meta.url).pathname, slug, '--json'], { encoding: 'utf8' }));

const N = 30, FPS = 30;                         // 1 seconde d'animation
const DOSSIER = `captures/${slug}/anim`;
fs.rmSync(DOSSIER, { recursive: true, force: true });

const echapper = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PAGE = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${b64(`${POLICES}/anton-latin-400-normal.woff2`)}) format('woff2')}
@font-face{font-family:S;font-weight:400;src:url(data:font/woff2;base64,${b64(`${POLICES}/sora-latin-400-normal.woff2`)}) format('woff2')}
@font-face{font-family:S;font-weight:700;src:url(data:font/woff2;base64,${b64(`${POLICES}/sora-latin-700-normal.woff2`)}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
/* Le bandeau degrade, pas un rectangle plat : sur une photo claire un aplat
   se voit comme un autocollant, un degrade se pose. */
#voile{position:absolute;left:0;right:0;bottom:0;height:660px;
  background:linear-gradient(180deg,rgba(11,11,13,0) 0%,rgba(11,11,13,.70) 44%,rgba(11,11,13,.95) 100%)}
#bloc{position:absolute;left:76px;right:76px;bottom:252px}
/* Chaque ligne monte DEPUIS SON PROPRE MASQUE : le texte sort de derriere une
   arete nette au lieu d'apparaitre en fondu. C'est ce qui fait « anime » et
   pas « fondu enchaine ». */
.masque{overflow:hidden}
#sur{font-family:S;font-weight:700;font-size:25px;letter-spacing:.24em;text-transform:uppercase;
  color:#f0a500;margin-bottom:16px}
#trait{height:4px;background:#f0a500;border-radius:99px;width:0;margin:0 0 20px}
#a{font-family:A;font-size:74px;line-height:1.06;color:#fff;letter-spacing:.005em}
#b{font-family:S;font-weight:400;font-size:38px;line-height:1.3;color:#e2e2ea;margin-top:14px}
</style></head><body>
<div id="voile"></div>
<div id="bloc">
  <div class="masque"><div id="sur">${echapper(c.sur)}</div></div>
  <div id="trait"></div>
  <div class="masque"><div id="a">${echapper(c.a)}</div></div>
  <div class="masque"><div id="b">${echapper(c.b)}</div></div>
</div>
<script>
function e(p){p=p<0?0:p>1?1:p;return p*p*(3-2*p);}
function monter(el,p,h){
  el.style.transform='translateY('+((1-e(p))*h)+'px)';
  el.style.opacity=e(p);
}
window.poser=function(t){
  document.getElementById('voile').style.opacity=e(t/0.34);
  monter(document.getElementById('sur'),(t-0.06)/0.34,46);
  document.getElementById('trait').style.width=(e((t-0.20)/0.34)*110)+'px';
  /* Decalage entre les lignes : elles montent l'une apres l'autre, jamais
     ensemble. Ensemble, on lit un bloc ; decalees, on lit une phrase. */
  monter(document.getElementById('a'),(t-0.16)/0.40,96);
  monter(document.getElementById('b'),(t-0.34)/0.40,54);
};
</script></body></html>`;

const nav = await chromium.launch({ executablePath: '/home/claude/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox'] });
for (const [cle, carton] of Object.entries(infos.cartons)) {
  const dir = `${DOSSIER}/${cle}`;
  fs.mkdirSync(dir, { recursive: true });
  const p = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(PAGE(carton), { waitUntil: 'load' });
  await p.waitForTimeout(250);
  for (let i = 0; i < N; i++) {
    await p.evaluate((t) => window.poser(t), i / FPS);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png`, omitBackground: true });
  }
  await p.close();
  console.error(`  ${cle} : « ${carton.a} » / « ${carton.b} »`);
}
await nav.close();
console.log(`${Object.keys(infos.cartons).length} légendes animées · ${N} images chacune · ${DOSSIER}`);
if (infos.manquants.length) console.log(`   champs absents des fichiers : ${infos.manquants.join(', ')} — non affichés plutôt qu'inventés`);
