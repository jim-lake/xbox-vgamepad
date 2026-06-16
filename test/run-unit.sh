#!/bin/sh
OUT="/tmp/test-unit-$(date +%s)-$$.log"
npx tsx --tsconfig tsconfig.test.json --import ./test/unit/setup.mjs --test 'test/unit/*.test.ts' > "$OUT" 2>&1
echo "$OUT"
