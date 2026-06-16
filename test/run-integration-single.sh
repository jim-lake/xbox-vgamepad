#!/bin/sh
OUT="/tmp/test-integration-$(date +%s)-$$.log"
(npx vite build --mode test && node test/gamepad-single.test.cjs "$@") > "$OUT" 2>&1
echo "$OUT"
