#!/usr/bin/env bash
set -euo pipefail

# Publish everything under ./share as assets in one GitHub Release.
# Folder separators become "__" in asset names, e.g. folder__subfolder__archive.7z.
RELEASE_TAG="${RELEASE_TAG:-shared-files}"
RELEASE_TITLE="${RELEASE_TITLE:-Shared files}"

command -v gh >/dev/null 2>&1 || { echo "GitHub CLI (gh) is required: https://cli.github.com/" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required." >&2; exit 1; }
[[ -d share ]] || { echo "The ./share directory does not exist." >&2; exit 1; }
gh auth status >/dev/null

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
count=0
while IFS= read -r -d '' file; do
  relative="${file#share/}"
  asset_name="$(python3 - "$relative" <<'PY'
import sys
from urllib.parse import quote
parts = sys.argv[1].replace('\\', '/').split('/')
print('__'.join(quote(part, safe='-_.~') for part in parts))
PY
)"
  cp -- "$file" "$stage/$asset_name"
  count=$((count + 1))
done < <(find share -type f -print0)

(( count > 0 )) || { echo "No files found under ./share."; exit 1; }

if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Updating release '$RELEASE_TAG'..."
else
  echo "Creating release '$RELEASE_TAG'..."
  gh release create "$RELEASE_TAG" --title "$RELEASE_TITLE" --notes "Downloadable files published from the repository's share/ directory."
fi

# --clobber replaces assets with the same names; removed local files are not
# automatically removed from the release, so remove obsolete assets manually.
find "$stage" -maxdepth 1 -type f -print0 | while IFS= read -r -d '' asset; do
  gh release upload "$RELEASE_TAG" "$asset" --clobber
done

echo "Published $count file(s) to release '$RELEASE_TAG'."
echo "Review the release at: $(gh repo view --json url -q .url)/releases/tag/$RELEASE_TAG"
