#!/bin/bash
set -e

PROJECT_DIR="/mnt/c/Users/matys/OneDrive - Gymnázium Jaroslava Vrchlického, Klatavy/Dokumenty/GitHub/training-calendar"
BUILD_DIR="/tmp/SachoveTreninkyApp"

echo "=== Sestavení iOS aplikace (IPA) pomocí xtool v Arch Linuxu ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cp -r "$PROJECT_DIR/ios/"* "$BUILD_DIR/"

cd "$BUILD_DIR"
echo "Kompilace pro iOS ARM64..."
xtool dev build --ipa --configuration release

echo "Kopírování výsledného .ipa do projektu..."
IPA_FILE=$(ls "$BUILD_DIR/xtool/"*.ipa | head -n 1)
cp "$IPA_FILE" "$PROJECT_DIR/SachoveTreninky.ipa"

echo "Hotovo! IPA soubor vytvořen: $PROJECT_DIR/SachoveTreninky.ipa"
ls -lh "$PROJECT_DIR/SachoveTreninky.ipa"
