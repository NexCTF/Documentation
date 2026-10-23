#!/usr/bin/env bash
# Refresh the API reference from a running NexCTF backend: both OpenAPI specs, and
# the version the reference pages say they were rendered at. The admin spec takes a
# session, not a token: it signs in as NEXCTF_ADMIN_USERNAME / NEXCTF_ADMIN_PASSWORD,
# by default the admin of the development fixtures.
#
#   scripts/update-openapi.sh http://localhost:8000 0.12.2

set -euo pipefail

api="${1:?usage: $0 <backend url> <version>}"
version="${2:?usage: $0 <backend url> <version>}"
version="${version#v}"
docs="$(cd "$(dirname "$0")/.." && pwd)/docs/api"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

curl -fsS -c "$work/cookies" -o /dev/null "$api/api/v1/auth/token" \
    --data-urlencode "username=${NEXCTF_ADMIN_USERNAME:-admin}" \
    --data-urlencode "password=${NEXCTF_ADMIN_PASSWORD:-admin}"

# Same layout as the committed specs, so a release only shows what changed in the API.
fetch() {
    curl -fsS -b "$work/cookies" "$api$1" | python3 -I -c '
import json, sys
json.dump(json.load(sys.stdin), sys.stdout, indent=2, ensure_ascii=False)
print()' > "$work/$2"
}

fetch /api/openapi.json openapi-user.json
fetch /api/admin/openapi.json openapi-admin.json
mv "$work/openapi-user.json" "$work/openapi-admin.json" "$docs/"

sed -i -E "s/^(\*Rendered from .* at NexCTF )[^ ]+\.\*$/\1$version.*/" \
    "$docs/user.md" "$docs/admin.md"

echo "API reference updated to NexCTF $version"
