#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

MODE="${1:-production}"

# 1. Build popup JS (IIFE) — clears dist/
BUILD_TARGET=popup npx vite build --mode "$MODE"

# 2. Build content script (IIFE) — appends to dist/
BUILD_TARGET=content npx vite build --mode "$MODE"

# 3. Copy static assets into dist/
cp popup.html dist/
cp src/popup.css dist/
cp manifest.json dist/
cp -r icons dist/

echo "Extension built in $DIR/dist/"
