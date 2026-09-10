#!/bin/bash
# Une video de demonstration a partir des PHOTOS DU RESTAURANT. Aucune image
# generee, aucun credit consomme : c'est la promesse FoodBoost, « vos photos ».
# UN SEUL overlay par passe.
set -e
export PATH="/home/claude/tools/node/bin:/home/claude/tools/ffmpeg-build/ffmpeg-7.0.2-amd64-static:$PATH"
export LD_LIBRARY_PATH="/home/claude/tools/chromelibs/usr/lib/x86_64-linux-gnu:/home/claude/tools/chromelibs/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
export FONTCONFIG_PATH=/home/claude/tools/chromelibs/etc/fonts
export FONTCONFIG_FILE=/home/claude/tools/chromelibs/etc/fonts/fonts.conf
FF=ffmpeg
SLUG="$1"; [ -n "$SLUG" ] || { echo "usage: faire-video.sh <slug>"; exit 2; }
cd /work/resto-automatisationboost/video-demo
PH="/work/resto-automatisationboost/demo/$SLUG/photos"
C="captures/$SLUG"; T="work/tmp/$SLUG"; mkdir -p "$T" rendus
BGM=/work/autoboost-neon-videos/_shared/bgm/food-sunny-groove-120.mp3

carte(){ $FF -y -loglevel error -loop 1 -i "$2" -t "$3" -vf "setsar=1,fps=30" \
  -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$T/$1"; }

# La photo remplit le cadre 9:16 avec un leger travelling. Le recadrage part du
# HAUT (y=0) : sur une assiette, le sujet est en haut, pas au centre.
photo(){ # 1:sortie 2:image 3:duree 4:sens
  # Leurs photos sont tantot paysage (1600x1067) tantot portrait (1067x1600).
  # scale=LARGEUR:-1 donnait 787 px de haut sur une paysage : impossible d'y
  # decouper 1920. force_original_aspect_ratio=increase garantit la couverture,
  # et on se donne 18 % de marge pour avoir de quoi faire bouger le cadre.
  local A B
  if [ "$4" = "bas" ]; then A="min(1,t/$3)"; else A="(1-min(1,t/$3))"; fi
  $FF -y -loglevel error -loop 1 -i "$2" -t "$3" \
    -vf "scale=1274:2266:force_original_aspect_ratio=increase,crop=1080:1920:'(iw-1080)*$A':'(ih-1920)*$A',setsar=1,fps=30" \
    -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$T/$1"; }

echo "== plans"
carte c0.mp4 "$C/ouverture.png" 2.60
carte c4.mp4 "$C/fin.png"       2.80
# Les dossiers ne nomment pas leurs photos pareil : p01.jpg chez les uns,
# eux1.jpg chez les autres. On prend les TROIS PREMIERES, triees, quel que
# soit leur nom — sinon la moitie des clients echoue.
# Certains dossiers contiennent un SVG renomme .jpg (Mediterraneo) : ffmpeg
# n'a pas de decodeur SVG et la passe meurt. On verifie l'ENTETE, pas le nom.
mapfile -t TOUTES < <(ls "$PH"/*.jpg "$PH"/*.jpeg "$PH"/*.png 2>/dev/null | sort)
PHOTOS=()
for f in "${TOUTES[@]}"; do
  h=$(head -c 4 "$f" | od -An -tx1 | tr -d ' \n')
  case "$h" in ffd8ff*|89504e47) PHOTOS+=("$f");; esac
  [ "${#PHOTOS[@]}" -ge 3 ] && break
done
[ "${#PHOTOS[@]}" -ge 3 ] || { echo "moins de 3 photos pour $SLUG (${#PHOTOS[@]})"; exit 3; }
i=1
for p in "${PHOTOS[@]}"; do
  sens=$([ $((i%2)) -eq 1 ] && echo bas || echo haut)
  photo "b$i.mp4" "$p" 3.40 "$sens"
  $FF -y -loglevel error -i "$T/b$i.mp4" -i "$C/l$i.png" \
    -filter_complex "[0:v][1:v]overlay=0:0:format=auto[o]" -map "[o]" -an -t 3.40 \
    -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p "$T/c$i.mp4"
  i=$((i+1))
done

: > "$T/l.txt"; for f in c0 c1 c2 c3 c4; do echo "file '$(pwd)/$T/$f.mp4'" >> "$T/l.txt"; done
$FF -y -loglevel error -f concat -safe 0 -i "$T/l.txt" -c copy "$T/muet.mp4"

DUR=$($FF -y -loglevel error -i "$T/muet.mp4" -f null - 2>&1 >/dev/null; ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/muet.mp4")
$FF -y -loglevel error -stream_loop -1 -i "$BGM" -t "$DUR" \
  -af "volume=0.5,afade=t=in:st=0:d=1.2,afade=t=out:st=$(node -e "process.stdout.write(String(Math.max(0,$DUR-1.6)))"):d=1.6,loudnorm=I=-15:TP=-1.5:LRA=9" \
  -ar 48000 -ac 2 "$T/mus.wav"
$FF -y -loglevel error -i "$T/muet.mp4" -i "$T/mus.wav" -map 0:v -map 1:a -shortest \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 160k -movflags +faststart "rendus/$SLUG.mp4"
echo "✅ rendus/$SLUG.mp4 · $(ffprobe -v error -show_entries format=duration -of csv=p=0 "rendus/$SLUG.mp4") s"
