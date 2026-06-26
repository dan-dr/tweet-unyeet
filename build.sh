#!/usr/bin/env bash
set -euo pipefail
VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
ZIP_NAME="tweet-unyeet-v${VERSION}.zip"
python3 /Users/dan/.grok/skills/chrome-store-publish/scripts/build_extension_zip.py . --output "$ZIP_NAME"
echo "Built: $ZIP_NAME"