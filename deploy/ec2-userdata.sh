#!/usr/bin/env bash
# ============================================================================
# user-data: corre UNA vez al primer boot del EC2 (Ubuntu 24.04).
# Instala la base: Node 20, build tools (Baileys usa módulos nativos), Caddy
# (TLS automático) y git. NO trae secretos ni construye la app: eso lo hace
# 04-deploy-app.sh por SSH.
# ============================================================================
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y curl git build-essential ca-certificates gnupg lsb-release

# --- Cliente PostgreSQL 17 (repo oficial PGDG) ------------------------------
# Necesario: Supabase corre PG 17.x y pg_dump se niega a dumpear de un server
# más nuevo que el cliente. El client-16 de Ubuntu 24.04 NO sirve para migrar.
install -d /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-client-17 || apt-get install -y postgresql-client

# --- Node 20 LTS (NodeSource) ----------------------------------------------
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- Caddy (reverse proxy con HTTPS automático via Let's Encrypt) ----------
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

# --- Directorios de la app y del disco persistente -------------------------
# /var/data/baileys-sessions = sesiones de WhatsApp (BAILEYS_SESSIONS_DIR).
# Vive en el volumen root (gp3) que sobrevive reinicios stop/start.
mkdir -p /opt/agentenuro /var/data/baileys-sessions
chown -R ubuntu:ubuntu /opt/agentenuro /var/data

echo "user-data OK" > /var/log/agentenuro-bootstrap.done
