process.env.LD_LIBRARY_PATH='/home/claude/tools/chromelibs/usr/lib/x86_64-linux-gnu:/home/claude/tools/chromelibs/lib/x86_64-linux-gnu';
process.env.FONTCONFIG_PATH='/home/claude/tools/chromelibs/etc/fonts';
process.env.FONTCONFIG_FILE='/home/claude/tools/chromelibs/etc/fonts/fonts.conf';
import pw from '/work/youtube-automation-agent/node_modules/playwright/index.js';
import fs from 'fs';
const { chromium } = pw;
const slug = process.argv[2];
if (!slug) { console.error('usage: cartes.mjs <slug>'); process.exit(2); }
const page = fs.readFileSync(`/work/resto-automatisationboost/demo/${slug}/index.html`,'utf8');
const nom  = (page.match(/<h1[^>]*>([^<]+)/)||[])[1]?.trim() || slug;
const ville= (page.match(/Saint[- ][A-Za-zéÉ]+|Le Port|Sainte[- ][A-Za-zé]+/)||[])[0] || '';
fs.mkdirSync(`captures/${slug}`, { recursive:true });

/* Charte FoodBoost relevee sur les pages demo : fond #0b0b0d, or #f0a500,
   texte #f4f4f6, gris #9b9ba4. Aucune generation d'image : on habille LEURS
   photos, ce qui est exactement la promesse (« vos photos a vous »). */
const CSS = `
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;background:transparent;overflow:hidden;
  font-family:Inter,system-ui,sans-serif;color:#f4f4f6;position:relative}
.plein{position:absolute;inset:0;background:#0b0b0d}
.grain{position:absolute;inset:0;opacity:.5;
  background-image:radial-gradient(circle,#1e1e24 1.3px,transparent 1.3px);background-size:30px 30px}
.flamme{position:absolute;width:720px;height:720px;border-radius:50%;filter:blur(150px);
  background:#f0a500;opacity:.16;left:-180px;top:-200px}
.b{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 90px;gap:28px}
.eyebrow{font-size:28px;letter-spacing:.26em;text-transform:uppercase;color:#f0a500;font-weight:700}
.nom{font-size:112px;font-weight:800;letter-spacing:-.035em;line-height:1.02;text-align:center}
.ville{font-size:38px;color:#9b9ba4;font-weight:500}
.pied{position:absolute;bottom:120px;left:0;right:0;text-align:center;font-size:26px;
  letter-spacing:.24em;text-transform:uppercase;color:#6d6d78;font-weight:700}
/* legende posee sur la photo : bandeau degrade, jamais un rectangle plat */
.leg{position:absolute;left:0;right:0;bottom:0;height:640px;
  background:linear-gradient(180deg,rgba(11,11,13,0) 0%,rgba(11,11,13,.72) 46%,rgba(11,11,13,.94) 100%)}
.legt{position:absolute;left:76px;right:76px;bottom:250px}
.legt .n{font-size:26px;letter-spacing:.24em;text-transform:uppercase;color:#f0a500;font-weight:700;margin-bottom:18px}
.legt .p{font-size:66px;font-weight:800;letter-spacing:-.02em;line-height:1.14}
.legt .p em{font-style:normal;color:#f0a500}
`;
const CARTES = {
  ouverture: `<div class="plein"></div><div class="grain"></div><div class="flamme"></div>
    <div class="b"><div class="eyebrow">Feed automatique</div>
      <div class="nom">${nom}</div>${ville?`<div class="ville">${ville}</div>`:''}</div>
    <div class="pied">FoodBoost</div>`,
  l1: `<div class="leg"></div><div class="legt"><div class="n">Publication 1</div>
        <div class="p">Vos photos.<br><em>Pas une banque d'images.</em></div></div>`,
  l2: `<div class="leg"></div><div class="legt"><div class="n">Publication 2</div>
        <div class="p">Légende, hashtags,<br>heure de publication : <em>écrits pour vous</em>.</div></div>`,
  l3: `<div class="leg"></div><div class="legt"><div class="n">Publication 3</div>
        <div class="p">Trois posts programmés.<br><em>Zéro montage.</em></div></div>`,
  fin: `<div class="plein"></div><div class="grain"></div><div class="flamme"></div>
    <div class="b"><div class="eyebrow">Ce que ça change</div>
      <div class="nom">Vous cuisinez.<br><span style="color:#f0a500">On publie.</span></div>
      <div class="ville" style="margin-top:18px">${nom}${ville?' · '+ville:''}</div></div>
    <div class="pied">FoodBoost</div>`,
};
const b = await chromium.launch({ executablePath: process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell', args:['--no-sandbox'] });
for (const [n,h] of Object.entries(CARTES)) {
  const p = await b.newPage({ viewport:{width:1080,height:1920} });
  await p.setContent(`<!doctype html><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
    <style>${CSS}</style>${h}`, { waitUntil:'load' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path:`captures/${slug}/${n}.png`, omitBackground:!n.startsWith('l')===false });
  await p.close();
}
await b.close();
console.log(`cartes ${slug} : ${nom}${ville?' ('+ville+')':''}`);
