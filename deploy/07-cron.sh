#!/usr/bin/env bash
# 07 · Instala los crons externos en el EC2 (los in-process ya los corre la app).
# Idempotente: reemplaza el crontab del usuario ubuntu.
source "$(dirname "$0")/config.sh"
EIP="$(cat "$SECRETS_DIR/eip")"; KEY="$SECRETS_DIR/${EC2_KEY_NAME}.pem"
scp -i "$KEY" -o StrictHostKeyChecking=no "$DEPLOY_DIR/crontab.agentenuro" ubuntu@"$EIP":/tmp/ct
ssh -i "$KEY" -o StrictHostKeyChecking=no ubuntu@"$EIP" \
  'sudo systemctl enable --now cron; chmod +x /opt/agentenuro/cron/hit.sh; crontab /tmp/ct; echo "crontab instalado:"; crontab -l | grep -v "^#"'
