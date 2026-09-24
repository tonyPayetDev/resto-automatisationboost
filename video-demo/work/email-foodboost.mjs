/*
 * email-foodboost.mjs — le gabarit d'email à la charte FoodBoost.
 *
 *   import { emailDemo, SUJETS } from './email-foodboost.mjs';
 *   const html = emailDemo({ slug:'le-nautile-beach-hotel', nom:'Le Nautile beach Hotel' });
 *
 * Pourquoi un gabarit et pas du texte brut : les envois du 10/09 partaient en
 * texte nu depuis Gmail. Tony veut la charte du site — fond #0b0b0d, ambre
 * #f0a500 — pour que le mail et la page d'arrivée soient visiblement la même
 * maison.
 *
 * Les contraintes d'email, qui ne sont pas celles d'une page web :
 *
 * · TABLEAUX, pas de flexbox ni de grid. Outlook rend le HTML avec le moteur
 *   de Word : `display:flex` n'y existe pas, la mise en page s'effondre.
 * · STYLES EN LIGNE. Gmail supprime purement et simplement les blocs <style>
 *   dans certaines vues (notamment l'appli mobile).
 * · `bgcolor` EN PLUS de `background-color`. Sur un gabarit sombre, le client
 *   qui ignore la CSS affiche du texte clair sur fond blanc — illisible.
 * · AUCUNE IMAGE INDISPENSABLE. Les images sont bloquées par défaut chez
 *   beaucoup de destinataires : le message doit se tenir sans elles, et le
 *   bouton doit rester un vrai lien texte, jamais une image cliquable.
 * · PAS DE `background-image` pour le bouton — non rendu par Outlook.
 *
 * Le lien passe toujours par /v/<slug>/, qui enregistre le clic avant de
 * rediriger. (Il n'empêche PAS Gmail d'envelopper l'adresse dans
 * google.com/url — vérifié le 2026-09-24, Gmail enveloppe tous les liens.)
 */

const R = 'https://resto.automatisationboost.com';

const OR = '#f0a500';
const NUIT = '#0b0b0d';
const CARTE = '#141418';
const BORD = '#26262c';
const TEXTE = '#edeff1';
const DOUX = '#a0a0ac';

/* Deux objets par avatar, pour pouvoir les opposer en A/B. Le nom de
   l'établissement est en tête : c'est le seul mot que le destinataire
   reconnaît dans une liste de non-lus. */
export const SUJETS = {
  preuve: (nom) => `${nom} — j'ai monté 3 publications avec vos photos`,
  temps:  (nom) => `${nom} — vos 3 prochaines publications sont déjà prêtes`,
};

const echapper = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function emailDemo({ slug, nom, ville = '', signature = 'Tony PAYET', tel = '' }) {
  const n = echapper(nom);
  const lien = `${R}/v/${slug}/`;
  const poster = `${R}/video-demo/posters/${slug}.jpg`;

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${n} — vos publications</title>
</head>
<body style="margin:0;padding:0;background-color:${NUIT};" bgcolor="${NUIT}">

<!-- Le texte que certains clients affichent en aperçu, sous l'objet. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
Faites avec vos propres photos. Rien n'a été publié.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       bgcolor="${NUIT}" style="background-color:${NUIT};margin:0;padding:0;">
<tr><td align="center" style="padding:26px 14px 40px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="width:600px;max-width:100%;">

    <!-- Bandeau de marque -->
    <tr><td style="padding:0 0 18px;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;
                   letter-spacing:.22em;color:${OR};">FOOD</span><span
            style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;
                   letter-spacing:.22em;color:${TEXTE};">BOOST</span>
    </td></tr>

    <!-- La carte -->
    <tr><td bgcolor="${CARTE}" style="background-color:${CARTE};border:1px solid ${BORD};
            border-radius:14px;padding:30px 28px 26px;">

      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                letter-spacing:.16em;text-transform:uppercase;color:${OR};">Un exemple, pour vous</p>

      <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:25px;
                 line-height:1.22;color:${TEXTE};font-weight:bold;">
        ${n},<br>vos 3 publications sont prêtes.</h1>

      <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                line-height:1.6;color:${DOUX};">
        Je suis ${echapper(signature)}, je suis à La Réunion et je monte des publications
        Instagram pour les restaurants${ville ? ` de ${echapper(ville)}` : ''}.
        J'ai pris trois photos sur votre site et j'en ai fait une vidéo, pour vous montrer
        concrètement plutôt que de vous l'expliquer.
      </p>

      <!-- L'image est un PLUS : bloquée, le message tient toujours. -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding:0 0 22px;">
        <a href="${lien}" target="_blank" style="text-decoration:none;display:block;">
          <img src="${poster}" width="544" alt="Aperçu de la vidéo faite pour ${n}"
               style="width:100%;max-width:544px;height:auto;display:block;
                      border-radius:10px;border:1px solid ${BORD};">
        </a>
      </td></tr></table>

      <!-- Le bouton : un lien avec du remplissage, jamais une image. -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr><td bgcolor="${OR}" style="background-color:${OR};border-radius:9px;">
        <a href="${lien}" target="_blank"
           style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;
                  font-size:16px;font-weight:bold;color:#15150d;text-decoration:none;">
          Voir mes 3 publications</a>
      </td></tr></table>

      <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                line-height:1.6;color:${DOUX};text-align:center;">
        Ce sont <strong style="color:${TEXTE};">vos photos</strong>, pas une banque d'images.<br>
        <strong style="color:${TEXTE};">Rien n'a été publié nulle part.</strong>
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:22px 0 0;border-top:1px solid ${BORD};margin-top:22px;">
        <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                  line-height:1.65;color:${DOUX};">
          Sur la page, un bouton vous laisse refaire l'essai avec vos autres photos,
          gratuitement et sans inscription. Si ça vous plaît, on en parle.
        </p>
      </td></tr></table>

    </td></tr>

    <!-- Signature -->
    <tr><td style="padding:22px 4px 0;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                line-height:1.6;color:${DOUX};">
        ${echapper(signature)}${tel ? `<br>${echapper(tel)}` : ''}<br>
        <a href="https://automatisationboost.com" style="color:${OR};text-decoration:none;">automatisationboost.com</a>
      </p>
    </td></tr>

    <!-- La sortie. Elle reste en clair, et elle est tenue : une réponse suffit. -->
    <tr><td style="padding:20px 4px 0;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                line-height:1.6;color:#6a6a76;">
        Vous recevez ce message parce que votre établissement est référencé publiquement
        à La Réunion. Répondez « stop » et je vous retire le jour même.
      </p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

/* La version texte, envoyée en parallèle du HTML. Ce n'est pas une politesse :
   un message HTML sans équivalent texte est noté comme suspect par les filtres,
   et certains destinataires lisent en texte seul. */
export function texteDemo({ slug, nom, signature = 'Tony PAYET' }) {
  return `Bonjour,

Je suis ${signature}, je suis à La Réunion et je monte des publications Instagram
pour les restaurants.

J'ai pris trois photos sur votre site et j'en ai fait une vidéo, pour vous montrer
concrètement plutôt que de vous l'expliquer :

${R}/v/${slug}/

Ce sont vos photos, pas une banque d'images. Rien n'a été publié nulle part.

Sur la page, un bouton vous laisse refaire l'essai avec vos autres photos,
gratuitement et sans inscription.

Si ça ne vous intéresse pas, répondez « stop » et je vous retire le jour même.

${signature}
automatisationboost.com`;
}
