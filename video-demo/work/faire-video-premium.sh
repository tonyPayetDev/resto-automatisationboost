#!/bin/bash
# Variante PREMIUM de faire-video.sh. Trois differences, toutes demandees par
# Tony le 2026-09-24 (« la music j'aime pas et l'effet transition image aussi,
# je veux quelque chose de plus premium ») :
#
#   1. FONDU ENCHAINE entre les plans (xfade) au lieu d'un concat bout a bout.
#      L'original collait les plans avec `-c copy` : aucune transition, l'oeil
#      lit un diaporama. C'est le defaut le plus visible sur la planche contact.
#   2. MOUVEMENT AVEC INERTIE (zoompan + lissage smoothstep) au lieu d'un
#      panoramique a vitesse constante. Un travelling qui demarre et s'arrete
#      net se voit ; celui qui accelere et ralentit ne se voit pas.
#   3. ETALONNAGE + VOILE DEGRADE sous le texte. Le texte etait pose a nu sur
#      la photo : sur une image claire (la piscine du Nautile) il devient
#      illisible. Un degrade sombre le porte sans cacher la photo.
#
# usage: faire-video-premium.sh <slug> [A|B|C]
set -e
export PATH="/home/claude/tools/node/bin:/home/claude/tools/ffmpeg-build/ffmpeg-7.0.2-amd64-static:$PATH"
FF=ffmpeg
SLUG="$1"; [ -n "$SLUG" ] || { echo "usage: faire-video-premium.sh <slug> [A|B|C]"; exit 2; }
LOOK="${2:-A}"
cd /work/resto-automatisationboost/video-demo
PH="/work/resto-automatisationboost/demo/$SLUG/photos"
C="captures/$SLUG"; T="work/tmp/$SLUG-$LOOK"; mkdir -p "$T" rendus-premium
BGMDIR=/work/autoboost-neon-videos/_shared/bgm

# ---- Les trois looks -------------------------------------------------------
# Chacun change la MUSIQUE et la TRANSITION ensemble : ce sont les deux choses
# qu'on compare. Le reste (etalonnage, voile, inertie) est commun, c'est la
# base premium.
case "$LOOK" in
  A) # Editorial — la seule piste taguee « luxe » dans le manifeste BGM
     BGM="$BGMDIR/vsl-voxscape-ambient.mp3"; VOL=0.42
     XF=fade;      XDUR=0.80          # fondu long, posé
     DPHOTO=4.00;  DOUV=3.00; DFIN=3.20
     ZAMP=0.10;    ZSENS=avant        # lent rapproche
     GRADE="eq=contrast=1.05:saturation=0.96:gamma=1.02,colorbalance=rs=0.02:bs=-0.02,vignette=PI/4.5"
     ;;
  B) # House chic — plus rythme, plus chaud
     BGM="$BGMDIR/food-deep-urban-122.mp3"; VOL=0.38
     # `dissolve` melange les deux plans pixel par pixel au hasard : l'encodeur
     # paie ce bruit plein tarif (23,7 Mo contre 5,3 Mo pour le look A a duree
     # egale, mesure du 2026-09-24) et le grain se voit sur une photo de plat.
     # `fade` court donne le meme enchainement nerveux, propre et leger.
     XF=fade;      XDUR=0.35          # enchainement court, nerveux
     DPHOTO=3.40;  DOUV=2.60; DFIN=2.80
     ZAMP=0.13;    ZSENS=avant
     GRADE="eq=contrast=1.10:saturation=1.06:gamma=0.99,colorbalance=rs=0.04:bs=-0.03,vignette=PI/5"
     ;;
  C) # Signature — volet lumineux vertical, image plus froide, on s'ecarte
     BGM="$BGMDIR/food-cat-walk-128.mp3"; VOL=0.38
     XF=smoothup;  XDUR=0.60
     DPHOTO=3.80;  DOUV=2.80; DFIN=3.00
     ZAMP=0.12;    ZSENS=arriere      # part serre et s'ecarte
     GRADE="eq=contrast=1.08:saturation=1.00:gamma=1.00,colorbalance=rs=-0.02:bs=0.03,vignette=PI/4.5"
     ;;
  # D, E, F : Tony n'aimait aucune des trois premieres musiques. Ces trois-la
  # ne changent QUE la piste — meme fondu, meme mouvement, meme etalonnage que
  # le look A. C'est voulu : il juge la musique, on ne fait donc varier qu'elle.
  # Pistes relevees chez Mixkit le 2026-09-24 (meme licence libre que le reste
  # de la banque), choisies sur leur BRILLANCE mesuree — l'energie au-dessus de
  # 4 kHz rapportee au total, qui separe une piste feutree d'une claquante.
  # Leur titre n'est pas connu : le site ne publie pas l'identifiant numerique
  # de son CDN, et les fichiers ne portent aucune metadonnee. On les nomme donc
  # par leur mesure, pas par un titre invente.
  D) # la plus feutree des quinze mesurees : -35,0 dB de brillance
     BGM="$BGMDIR/food-lounge-mixkit550.mp3"; VOL=0.42
     XF=fade;      XDUR=0.80
     DPHOTO=4.00;  DOUV=3.00; DFIN=3.20
     ZAMP=0.10;    ZSENS=avant
     GRADE="eq=contrast=1.05:saturation=0.96:gamma=1.02,colorbalance=rs=0.02:bs=-0.02,vignette=PI/4.5"
     ;;
  E) # -27,2 dB, feutree mais plus presente
     BGM="$BGMDIR/food-feutre-mixkit750.mp3"; VOL=0.42
     XF=fade;      XDUR=0.80
     DPHOTO=4.00;  DOUV=3.00; DFIN=3.20
     ZAMP=0.10;    ZSENS=avant
     GRADE="eq=contrast=1.05:saturation=0.96:gamma=1.02,colorbalance=rs=0.02:bs=-0.02,vignette=PI/4.5"
     ;;
  F) # -26,3 dB, et la plus basse en niveau : -14,5 LUFS, donc la plus discrete
     BGM="$BGMDIR/food-doux-mixkit500.mp3"; VOL=0.50
     XF=fade;      XDUR=0.80
     DPHOTO=4.00;  DOUV=3.00; DFIN=3.20
     ZAMP=0.10;    ZSENS=avant
     GRADE="eq=contrast=1.05:saturation=0.96:gamma=1.02,colorbalance=rs=0.02:bs=-0.02,vignette=PI/4.5"
     ;;
  *) echo "look inconnu : $LOOK (A à F)"; exit 2;;
esac
[ -f "$BGM" ] || { echo "musique introuvable : $BGM"; exit 5; }

# ---- Le voile degrade ------------------------------------------------------
# Fabrique une fois, reutilise partout. Transparent en haut, 72 % de noir en
# bas sur les 760 derniers pixels — la zone ou `cartes.mjs` pose le texte.
SCRIM="$T/voile.png"
$FF -y -loglevel error -f lavfi -i color=c=black:s=1080x1920 \
  -vf "format=rgba,geq=r='0':g='0':b='0':a='if(lt(Y,1160),0,184*pow((Y-1160)/760,1.6))'" \
  -frames:v 1 "$SCRIM"

# ---- Un plan photo, avec inertie ------------------------------------------
# zoompan travaille sur une source 2160x3840 (2x la sortie) : ses coordonnees
# sont arrondies au pixel SOURCE, donc le tremblement reste sous le demi-pixel
# de sortie. Sur une source a la taille finale, le mouvement saccade.
# Lissage : p = on/frames ; e = p²(3-2p). Depart et arrivee a vitesse nulle.
plan(){ # 1:sortie 2:image 3:duree
  local N E Z
  N=$(awk -v d="$3" 'BEGIN{printf "%d", d*30}')
  E="pow(on/$N,2)*(3-2*(on/$N))"
  if [ "$ZSENS" = "avant" ]; then Z="1+$ZAMP*($E)"; else Z="1+$ZAMP-$ZAMP*($E)"; fi
  # y=0.34 : sur une assiette comme sur une facade, le sujet est au-dessus du
  # centre geometrique. Le cadrage centre coupait les tetes et les assiettes.
  $FF -y -loglevel error -loop 1 -framerate 30 -i "$2" -i "$SCRIM" \
    -filter_complex "[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,\
zoompan=z='$Z':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.34':d=$N:s=1080x1920:fps=30,\
$GRADE,setsar=1[v];[v][1:v]overlay=0:0:format=auto[o]" \
    -map "[o]" -frames:v "$N" -an \
    -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$T/$1"; }

# ---- Une carte de texte plein cadre ---------------------------------------
carte(){ $FF -y -loglevel error -loop 1 -framerate 30 -i "$2" -t "$3" \
  -vf "setsar=1,fps=30" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$T/$1"; }

# ---- Le texte par-dessus un plan, en fondu --------------------------------
# UN SEUL overlay par passe : empiler les overlays fait tuer le processus par
# le noyau, sans erreur et sans image produite (lecon reel-nexeus).
# ---- Le texte ANIME par-dessus un plan ------------------------------------
# `cartes-anim.mjs` sort une seconde d'animation (30 images transparentes) par
# legende. On la joue, puis `tpad=stop_mode=clone` GELE la derniere image pour
# le reste du plan : animer les 120 images couterait quatre fois le rendu pour
# trois secondes ou plus rien ne bouge.
# Si le dossier n'existe pas, on retombe sur le PNG fige de cartes.mjs —
# le montage ne doit pas echouer parce qu'une animation manque.
texte_anime(){ # 1:sortie 2:plan 3:dossier images 4:duree
  local reste; reste=$(awk -v d="$4" 'BEGIN{printf "%.2f", d-1.0}')
  $FF -y -loglevel error -i "$T/$2" -framerate 30 -i "$3/%04d.png" \
    -filter_complex "[1:v]tpad=stop_mode=clone:stop_duration=$reste,format=rgba[t];\
[0:v][t]overlay=0:0:format=auto:shortest=1[o]" -map "[o]" -an \
    -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$T/$1"; }

texte(){ # 1:sortie 2:plan 3:png texte 4:duree
  # `-loop 1 -framerate 30` sur le PNG n'est PAS decoratif : sans lui l'image
  # se decode en UNE seule frame, le fondu d'alpha l'attrape a t=0 ou elle est
  # encore transparente, et l'overlay repete cette image vide pendant tout le
  # plan. Resultat : aucune legende a l'ecran, et pas la moindre erreur ffmpeg.
  # Constate le 2026-09-24 sur le premier rendu premium.
  local S; S=$(awk -v d="$4" 'BEGIN{printf "%.2f", d-0.55}')
  $FF -y -loglevel error -i "$T/$2" -loop 1 -framerate 30 -i "$3" \
    -filter_complex "[1:v]format=rgba,fade=t=in:st=0.20:d=0.45:alpha=1,fade=t=out:st=$S:d=0.45:alpha=1[t];\
[0:v][t]overlay=0:0:format=auto:shortest=1[o]" -map "[o]" -an \
    -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$T/$1"; }

echo "== $SLUG · look $LOOK · $XF ${XDUR}s · $(basename "$BGM")"

# ---- Le choix des photos : repris tel quel de faire-video.sh --------------
mapfile -t TOUTES < <(ls "$PH"/* 2>/dev/null | sort)
VALIDES=()
for f in "${TOUTES[@]}"; do
  h=$(head -c 12 "$f" | od -An -tx1 | tr -d ' \n')
  case "$h" in
    ffd8ff*|89504e47*) VALIDES+=("$f");;
    52494646*) [ "${h:16:8}" = "57454250" ] && VALIDES+=("$f");;
  esac
done
CH=$(awk -F'\t' -v s="$SLUG" '$1==s{print $2}' work/choix.tsv)
PHOTOS=()
if [ -n "$CH" ]; then
  IFS=',' read -ra IDX <<< "$CH"
  for k in "${IDX[@]}"; do
    f="${VALIDES[$((k-1))]}"
    [ -n "$f" ] && [ -f "$f" ] || { echo "index $k hors bornes pour $SLUG (${#VALIDES[@]} valides)"; exit 4; }
    PHOTOS+=("$f")
  done
else
  PHOTOS=("${VALIDES[@]:0:3}")
fi
N=${#PHOTOS[@]}
[ "$N" -ge 2 ] || { echo "moins de 2 photos exploitables pour $SLUG"; exit 3; }

carte c0.mp4 "$C/ouverture.png" "$DOUV"
carte cf.mp4 "$C/fin.png"       "$DFIN"
i=1
for p in "${PHOTOS[@]}"; do
  plan "b$i.mp4" "$p" "$DPHOTO"
  if [ -d "$C/anim/l$i" ]; then
    texte_anime "c$i.mp4" "b$i.mp4" "$C/anim/l$i" "$DPHOTO"
  else
    echo "   (pas d'animation pour l$i — on reprend le PNG fige)"
    texte "c$i.mp4" "b$i.mp4" "$C/l$i.png" "$DPHOTO"
  fi
  i=$((i+1))
done

# ---- Assemblage en fondus enchaines ---------------------------------------
# xfade ne prend que deux entrees : on enchaine en cascade. Chaque fondu
# RACCOURCIT le film de XDUR — l'offset du k-ieme fondu se calcule donc sur
# les durees deja fondues, pas sur la somme brute. C'est l'erreur classique
# qui fait finir le montage sur du noir.
ENTREES=(-i "$T/c0.mp4"); DUREES=("$DOUV")
for ((k=1;k<=N;k++)); do ENTREES+=(-i "$T/c$k.mp4"); DUREES+=("$DPHOTO"); done
ENTREES+=(-i "$T/cf.mp4"); DUREES+=("$DFIN")

FC=""; PREV="[0:v]"; ACC="${DUREES[0]}"
for ((k=1;k<${#DUREES[@]};k++)); do
  OFF=$(awk -v a="$ACC" -v d="$XDUR" 'BEGIN{printf "%.3f", a-d}')
  OUT="[x$k]"; [ "$k" -eq $((${#DUREES[@]}-1)) ] && OUT="[vout]"
  FC="$FC$PREV[$k:v]xfade=transition=$XF:duration=$XDUR:offset=$OFF$OUT;"
  ACC=$(awk -v a="$ACC" -v n="${DUREES[$k]}" -v d="$XDUR" 'BEGIN{printf "%.3f", a+n-d}')
  PREV="$OUT"
done
FC="${FC%;}"

$FF -y -loglevel error "${ENTREES[@]}" -filter_complex "$FC" -map "[vout]" -an \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p "$T/corps.mp4"

# ---- Le carton de fin FoodBoost -------------------------------------------
# Le meme pour tous : c'est une signature de marque, pas une carte de visite
# d'etablissement. Sa voix est gardee a part pour etre remise SOUS la musique
# au bon instant — un simple concat ecraserait l'une ou l'autre.
OUTRO="rendus-premium/outro-foodboost.mp4"
if [ -f "$OUTRO" ]; then
  DUR_CORPS=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/corps.mp4")
  DUR_OUTRO=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTRO")
  OFF_OUT=$(awk -v a="$DUR_CORPS" -v d="$XDUR" 'BEGIN{printf "%.3f", a-d}')
  $FF -y -loglevel error -i "$T/corps.mp4" -i "$OUTRO" \
    -filter_complex "[0:v][1:v]xfade=transition=fade:duration=$XDUR:offset=$OFF_OUT[v]" \
    -map "[v]" -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p "$T/muet.mp4"
  # La voix du carton, decalee jusqu'a l'endroit ou le carton commence.
  $FF -y -loglevel error -i "$OUTRO" -vn -c:a pcm_s16le -ar 48000 -ac 2 "$T/voix-outro.wav" 2>/dev/null \
    && VOIX_OUTRO="$T/voix-outro.wav" || VOIX_OUTRO=""
  DEB_OUTRO=$(awk -v a="$OFF_OUT" 'BEGIN{printf "%d", a*1000}')
  echo "   carton de fin ajouté (+$(awk -v d="$DUR_OUTRO" -v x="$XDUR" 'BEGIN{printf "%.1f", d-x}') s)"
else
  echo "   ⚠ pas de carton de fin (rendus-premium/outro-foodboost.mp4 absent)"
  cp "$T/corps.mp4" "$T/muet.mp4"; VOIX_OUTRO=""
fi

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/muet.mp4")
FOUT=$(awk -v d="$DUR" 'BEGIN{v=d-1.8; if(v<0)v=0; printf "%.2f", v}')
$FF -y -loglevel error -stream_loop -1 -i "$BGM" -t "$DUR" \
  -af "volume=$VOL,afade=t=in:st=0:d=1.4,afade=t=out:st=$FOUT:d=1.8,loudnorm=I=-16:TP=-1.5:LRA=9" \
  -ar 48000 -ac 2 "$T/mus.wav"
if [ -n "$VOIX_OUTRO" ] && [ -f "$VOIX_OUTRO" ]; then
  # La voix du carton par-dessus la musique. `sidechaincompress` prend la
  # MUSIQUE en PREMIERE entree et la voix en seconde : inverse, il n'y a
  # aucune erreur — c'est la musique qui ecrase la voix, et on ne s'en apercoit
  # qu'au casque. `amix` reste en normalize=0, sinon la voix baisse au moment
  # ou elle entre. `adelay=...:all=1`, sinon seul le canal gauche est decale.
  $FF -y -loglevel error -i "$T/muet.mp4" -i "$T/mus.wav" -i "$VOIX_OUTRO" \
    -filter_complex "[2:a]adelay=${DEB_OUTRO}:all=1,volume=1.0,apad=whole_dur=$DUR,asplit=2[vx1][vx2];\
[1:a][vx1]sidechaincompress=threshold=0.05:ratio=7:attack=5:release=240[duck];\
[duck][vx2]amix=inputs=2:normalize=0:dropout_transition=0,alimiter=limit=0.94[a]" \
    -map 0:v -map "[a]" -t "$DUR" \
    -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.0 \
    -c:a aac -b:a 160k -movflags +faststart "rendus-premium/$SLUG-$LOOK.mp4"
else
  $FF -y -loglevel error -i "$T/muet.mp4" -i "$T/mus.wav" -map 0:v -map 1:a -shortest \
    -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.0 \
    -c:a aac -b:a 160k -movflags +faststart "rendus-premium/$SLUG-$LOOK.mp4"
fi
echo "✅ rendus-premium/$SLUG-$LOOK.mp4 · $(ffprobe -v error -show_entries format=duration -of csv=p=0 "rendus-premium/$SLUG-$LOOK.mp4") s"
