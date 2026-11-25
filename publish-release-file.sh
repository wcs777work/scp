#!/usr/bin/env bash
#
# Create an encrypted 7z archive from a file or directory and upload it
# as an asset to a GitHub Release.
#
# Usage:
#   ./publish-release-file.sh <path> <release-tag> <release-title>
#
# Examples:
#   ./publish-release-file.sh ./share/program-server v1.0 "Program server"
#   ./publish-release-file.sh ./share/program-client/my-program.7z shared-files "Shared files"
#
# Requirements:
#   - GitHub CLI (`gh`), authenticated with permission to manage repository releases
#   - 7-Zip command-line tool (`7z` or `7zz`)
#
# The 7z password is requested interactively by 7-Zip. Filenames are encrypted
# too (-mhe=on). The password is not stored in this script or passed as an
# explicit command-line argument.

set -Eeuo pipefail

usage() {
    cat <<'EOF'
Usage:
  publish-release-file.sh <path> <release-tag> <release-title>

Arguments:
  path           Existing file or directory to archive.
  release-tag    GitHub Release tag (for example: shared-files).
  release-title  Release title (quote it if it contains spaces).

The script creates <path-basename>.7z with AES-256 encryption and encrypted
filenames, then creates the release if it does not exist or replaces the
same-named asset if it already exists.
EOF
}

die() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

if [[ $# -ne 3 ]]; then
    usage >&2
    exit 2
fi

input_path=$1
release_tag=$2
release_title=$3

[[ -e "$input_path" ]] || die "Path does not exist: $input_path"
[[ -f "$input_path" || -d "$input_path" ]] || die "Path must be a regular file or directory: $input_path"
[[ -n "$release_tag" ]] || die "Release tag cannot be empty."
[[ -n "$release_title" ]] || die "Release title cannot be empty."

command -v gh >/dev/null 2>&1 || die "GitHub CLI (gh) is not installed. See https://cli.github.com/"
gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated. Run: gh auth login"

seven_zip=""
if command -v 7zz >/dev/null 2>&1; then
    seven_zip=$(command -v 7zz)
elif command -v 7z >/dev/null 2>&1; then
    seven_zip=$(command -v 7z)
else
    die "7-Zip command-line tool not found. Install 7-Zip (7z or 7zz) and try again."
fi

# Resolve the input and retain only its basename inside the archive.
input_dir=$(cd -- "$(dirname -- "$input_path")" && pwd)
input_name=$(basename -- "$input_path")
# For Windows executables, omit the .exe suffix from the archive name.
archive_base=$input_name
if [[ "$archive_base" == *.exe ]]; then
    archive_base=${archive_base%.exe}
fi
archive_name="${archive_base}.7z"

tmp_dir=$(mktemp -d)
cleanup() {
    rm -rf -- "$tmp_dir"
}
trap cleanup EXIT

archive_path="$tmp_dir/$archive_name"

printf 'Source:  %s\n' "$input_path"
printf 'Archive: %s\n' "$archive_name"
printf 'Release: %s (%s)\n\n' "$release_title" "$release_tag"
printf '7-Zip will now prompt for the archive password.\n'
printf 'Use a strong, unique password and keep it safe; it cannot be recovered.\n\n'

# Run from the source's parent directory so the archive contains only the
# selected file/directory name, not its full local path.
(
    cd -- "$input_dir"
    "$seven_zip" a -t7z -mhe=on -p "$archive_path" "$input_name"
)

[[ -s "$archive_path" ]] || die "7-Zip did not produce the expected archive."

printf '\nCreated encrypted archive: %s\n' "$archive_name"

# Create the release if needed; otherwise replace the asset with this name.
if gh release view "$release_tag" >/dev/null 2>&1; then
    printf 'Release exists. Uploading/replacing asset...\n'
    gh release upload "$release_tag" "$archive_path" --clobber
else
    printf 'Release does not exist. Creating it and uploading the asset...\n'
    gh release create "$release_tag" "$archive_path" \
        --title "$release_title" \
        --generate-notes
fi

printf '\nUpload completed successfully.\n'
printf 'Release: %s\n' "$(gh release view "$release_tag" --json url --jq .url)"
printf 'Asset:   %s\n' "$archive_name"
