#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

MODE="${1:-production}"
VARIANT="${2:-overlay}"  # "overlay" (content script) or "popup" (iframe)

if [ "$VARIANT" = "popup" ]; then
  # Popup build: popup + background only
  BUILD_TARGET=popup npx vite build --mode "$MODE"
  BUILD_TARGET=background npx vite build --mode "$MODE"
  cp manifest.popup.json dist/manifest.json
  cp popup.html dist/
else
  # Overlay build: content script + background
  BUILD_TARGET=content npx vite build --mode "$MODE"
  BUILD_TARGET=background npx vite build --mode "$MODE"
  cp manifest.json dist/
fi

cp -r icons dist/

echo "Extension built ($VARIANT) in $DIR/dist/"
