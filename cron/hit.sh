#!/usr/bin/env bash
# Golpea un endpoint cron local con UA "limpio" (pasa el anti-bot del middleware)
# y el CRON_SECRET. Uso: hit.sh <GET|POST> <ruta>
S=$(grep -m1 '^CRON_SECRET=' /opt/agentenuro/.env | cut -d= -f2-)
CODE=$(curl -s -X "$1" -A "AgenteNuroCron/1.0" \
  -H "Authorization: Bearer $S" -H "x-cron-secret: $S" \
  --max-time 120 -o /dev/null -w "%{http_code}" "http://localhost:3000$2")
echo "$(date -u +%FT%TZ) $1 $2 -> $CODE"
