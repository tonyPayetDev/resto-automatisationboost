#!/bin/bash
export PATH="/home/claude/tools/node/bin:$PATH"
cd /work/resto-automatisationboost/video-demo
ok=0; ko=0
for d in /work/resto-automatisationboost/demo/*/; do
  s=$(basename "$d"); [ -d "$d/photos" ] || continue
  node work/cartes.mjs "$s" >/dev/null 2>&1 || { echo "  ✗ cartes $s"; ko=$((ko+1)); continue; }
  if bash work/faire-video.sh "$s" >/dev/null 2>&1; then
    echo "  ✓ $s  $(stat -c %s rendus/$s.mp4) o"; ok=$((ok+1))
  else echo "  ✗ rendu $s"; ko=$((ko+1)); fi
done
echo "TOTAL ok=$ok ko=$ko"
