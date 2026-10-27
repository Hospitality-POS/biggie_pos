#!/usr/bin/env sh
set -e

: "${APP_PREFIX:?APP_PREFIX must be set (e.g. APP_PREFIX='APP_PREFIX_')}"
: "${ASSET_DIR:?ASSET_DIR must be set}"

if [ ! -d "$ASSET_DIR" ]; then
    echo "Warning: directory '$ASSET_DIR' not found, skipping."
    exit 0
fi

echo "Scanning directory: $ASSET_DIR"

# Longest names first so a key that prefixes another can't clobber it
env | grep "^${APP_PREFIX}" | awk -F= '{ print length($1) " " $0 }' | sort -rn | cut -d' ' -f2- |
while IFS='=' read -r key value; do
    echo "  • Replacing ${key}"   # avoid logging values if they may be secrets

    # Escape characters special to sed's replacement side
    escaped=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')

    find "$ASSET_DIR" -type f \
        \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.json' \) \
        -exec sed -i "s|${key}|${escaped}|g" {} +
done