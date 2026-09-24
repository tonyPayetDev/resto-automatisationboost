#!/usr/bin/env node
/*
 * infos.mjs <slug> — les VRAIES informations d'un etablissement.
 *
 * Tony, le 2026-09-24 : « rajoute des animations sur les titres et vraies
 * infos sur l'entreprise ». Les cartons disaient « Vos photos. Pas une banque
 * d'images. » — vrai, mais ca parle de FoodBoost, pas d'eux.
 *
 * Regle unique : on n'affiche QUE ce qu'un fichier porte. Pas d'horaires
 * inventes, pas de note Google devinee, pas de specialite deduite du nom.
 * Chaque champ sort avec sa source, et `manquants` dit ce qu'on n'a pas —
 * parce qu'un carton qui affirme une chose fausse sur l'etablissement de
 * quelqu'un est pire qu'un carton generique.
 *
 * Sources, dans l'ordre de confiance :
 *   1. demo/<slug>/index.html        — le nom tel qu'ecrit sur la page
 *   2. foodboost-editeur/clients.json — le domaine de leur site
 *   3. leads-restaurants/leads.json   — 565 fiches (nom, tel, genre, ville…)
 *   4. restaurants-reunion-osm.csv    — 1519 fiches OpenStreetMap
 */
import fs from 'node:fs';

const slug = process.argv[2];
if (!slug) { console.error('usage: infos.mjs <slug> [--json]'); process.exit(2); }

const lire = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const lireJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

/* Comparaison de noms : on retire accents, ponctuation et mots vides, sinon
   « L'Arbra Delis' » et « Arbradelis » ne se rencontrent jamais. */
const clef = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(le|la|les|l|du|de|des|chez|restaurant|resto|snack|hotel)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

const sources = [];
const info = { slug, manquants: [] };

/* ── 1. La page demo : le nom fait foi ─────────────────────────────────── */
const page = lire(`/work/resto-automatisationboost/demo/${slug}/index.html`);
if (page) {
  info.nom = (page.match(/<h1[^>]*>([^<]+)/) || [])[1]?.trim() || null;
  const v = page.match(/Saint[- ][A-Za-zéÉè]+|Le Port|Sainte[- ][A-Za-zé]+|Le Tampon|La Possession|Salazie|Cilaos|Entre[- ]Deux/);
  if (v) info.ville = v[0];
  sources.push('page demo');
}
if (!info.nom) info.nom = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ── 2. Le domaine de leur site ────────────────────────────────────────── */
const clients = lireJSON('/work/resto-automatisationboost/foodboost-editeur/clients.json');
if (clients) {
  const c = Array.isArray(clients) ? clients.find((x) => x.slug === slug)
    : (clients[slug] || Object.values(clients).find((x) => x && x.slug === slug));
  if (c && c.source) { info.domaine = String(c.source).replace(/^www\./, ''); sources.push('clients.json'); }
}

/* ── 3. La fiche lead ──────────────────────────────────────────────────── */
const leads = lireJSON('/work/previsualisation/leads-restaurants/leads.json');
if (Array.isArray(leads)) {
  /* Rapprochement STRICT. Le repli « l'un contient l'autre » a colle le meme
     numero (+262 262 23 04 06) a quatre etablissements differents le
     2026-09-24 : « Bodega saint pierre » attrapait une fiche dont la clef
     reduite etait incluse dans la sienne. Sur une video envoyee a un
     restaurateur, un faux numero est pire qu'un carton generique — on prefere
     ne rien afficher. */
  const k = clef(info.nom);
  const l = leads.find((x) => x && clef(x.nom) === k && k.length > 3);
  if (l) {
    if (l.genre && !info.genre) info.genre = l.genre;
    if (l.ville && !info.ville) info.ville = l.ville;
    if (l.rue) info.rue = l.rue;
    if (l.tel) info.tel = l.tel;
    if (l.insta) info.insta = l.insta;
    if (l.site && !info.domaine) info.domaine = String(l.site).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    sources.push('leads-restaurants');
  }
}

/* ── 4. OpenStreetMap : le type de cuisine, qu'on n'a nulle part ailleurs ─ */
const csv = lire('/work/prospection-formation/restaurants-reunion-osm.csv');
if (csv) {
  /* Decoupage qui respecte les guillemets. Un simple split(';') donnait
     `cuisine = "italian` et `rue = "Saint-Denis"` pour Mediterraneo : son
     champ cuisine contient un point-virgule a l'interieur des guillemets
     ("italian;pizza"), donc toutes les colonnes suivantes glissaient d'un
     cran. Mesure du 2026-09-24. */
  const decouper = (ligne) => {
    const out = []; let cur = '', dans = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (c === '"') { if (dans && ligne[i + 1] === '"') { cur += '"'; i++; } else dans = !dans; }
      else if (c === ';' && !dans) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const lignes = csv.split('\n');
  const entete = decouper(lignes[0]);
  const iNom = entete.indexOf('nom'), iCui = entete.indexOf('cuisine'),
        iTyp = entete.indexOf('type'), iCom = entete.indexOf('commune'),
        iAdr = entete.indexOf('adresse'), iTel = entete.indexOf('telephone');
  const k = clef(info.nom);
  for (let i = 1; i < lignes.length; i++) {
    const c = decouper(lignes[i]);
    if (!c[iNom]) continue;
    if (clef(c[iNom]) !== k) continue;
    if (iCui >= 0 && c[iCui] && !info.cuisine) info.cuisine = c[iCui].trim();
    if (iTyp >= 0 && c[iTyp] && !info.genre) info.genre = c[iTyp].trim();
    if (iCom >= 0 && c[iCom] && !info.ville) info.ville = c[iCom].trim();
    if (iAdr >= 0 && c[iAdr] && !info.rue) info.rue = c[iAdr].trim();
    if (iTel >= 0 && c[iTel] && !info.tel) info.tel = c[iTel].trim();
    sources.push('OSM');
    break;
  }
}

for (const champ of ['ville', 'genre', 'cuisine', 'domaine', 'tel', 'rue', 'insta']) {
  if (!info[champ]) info.manquants.push(champ);
}
info.sources = [...new Set(sources)];

/* Les trois lignes des cartons, construites UNIQUEMENT sur ce qu'on a.
   Chacune a un repli : si l'info manque, on ne laisse pas un trou, on dit
   autre chose de vrai. */
const cuisineLisible = info.cuisine
  ? info.cuisine.replace(/_/g, ' ').replace(/;/g, ', ').replace(/\b\w/g, (c) => c.toUpperCase())
  : null;

/* Une valeur ne sert QU'UNE FOIS. Sans ce garde, un etablissement dont on ne
   connait que le domaine l'affichait sur deux cartons d'affilee — vu sur
   Le Nautile le 2026-09-24. On prend le premier repli encore libre. */
const pris = new Set();
const premier = (...candidats) => {
  for (const c of candidats) {
    if (!c) continue;
    const k = String(c).toLowerCase();
    if (pris.has(k)) continue;
    pris.add(k);
    return c;
  }
  return null;
};

/* Tony, 2026-09-24 : « pas de numéro, des infos croustillantes qui donneraient
   aux gens de venir et de goûter ». Une adresse et un téléphone sont vrais
   mais administratifs : personne n'a faim en lisant un numéro.
   Les accroches sont DÉJÀ dans la page démo — « FAIT SUR PLACE. »,
   « ON T'ATTEND CE SOIR. » — choisies selon la famille de cuisine par
   l'éditeur. On les reprend plutôt que d'en inventer : ce sont des phrases
   d'ambiance, jamais une affirmation verifiable sur l'établissement (aucune
   note, aucune specialite, aucun horaire — on ne les a pas). */
if (page) {
  const h = [...page.matchAll(/class="hk">([\s\S]{0,90}?)<\/p>/g)]
    .map((m) => m[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 3);
  if (h.length) { info.accroches = [...new Set(h)]; sources.push('accroches de la page démo'); }
}
const acc = info.accroches || [];
info.sources = [...new Set(sources)];

info.cartons = {
  l1: {
    sur: 'Publication 1',
    a: info.nom,
    b: premier([cuisineLisible, info.ville].filter(Boolean).join(' · ') || null,
               'Vos photos, pas une banque d’images'),
  },
  l2: {
    sur: 'Publication 2',
    a: premier(acc[0], 'Ce qui sort de la cuisine.'),
    b: premier(acc[1], cuisineLisible ? `Cuisine ${cuisineLisible.toLowerCase()}` : null,
               'Légende et hashtags écrits pour vous'),
  },
  l3: {
    sur: 'Publication 3',
    a: premier(acc[2], 'Trois posts programmés.'),
    b: premier('Trois publications prêtes. Zéro montage.'),
  },
};

if (process.argv.includes('--json')) { console.log(JSON.stringify(info, null, 1)); process.exit(0); }
console.log(`${slug}`);
console.log(`  nom      ${info.nom}`);
for (const c of ['ville', 'genre', 'cuisine', 'rue', 'tel', 'domaine', 'insta'])
  console.log(`  ${c.padEnd(8)} ${info[c] || '—'}`);
console.log(`  sources  ${info.sources.join(', ') || 'aucune'}`);
console.log(`  manque   ${info.manquants.join(', ') || 'rien'}`);
