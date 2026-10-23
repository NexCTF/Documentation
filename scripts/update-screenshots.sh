#!/usr/bin/env bash
# Convert the documentation screenshots NexCTF captures (`task dev:screenshots`,
# written to frontend/docshots/) into the lossless WebP images the docs use.
#
#   scripts/update-screenshots.sh ../NexCTF/frontend/docshots

set -euo pipefail

src="${1:?usage: $0 <docshots directory>}"
dest="$(cd "$(dirname "$0")/.." && pwd)/docs/assets/images"

count=0
while IFS= read -r -d '' png; do
    rel="${png#"$src"/}"
    out="$dest/${rel%.png}.webp"
    mkdir -p "$(dirname "$out")"
    cwebp -quiet -lossless "$png" -o "$out"
    count=$((count + 1))
done < <(find "$src" -name '*.png' -print0)

echo "converted $count screenshot(s) into $dest"
