#!/bin/sh
if [ -z "$1" ]; then
  echo "Usage: npm run test:unit:single -- <file>" >&2
  exit 1
fi
OUT="/tmp/test-unit-single-$(date +%s)-$$.log"
npx tsx --tsconfig tsconfig.test.json --import ./test/unit/setup.mjs --test "$1" > "$OUT" 2>&1
echo "$OUT"
