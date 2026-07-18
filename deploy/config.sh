#!/usr/bin/env bash
# ============================================================================
# CONFIG CENTRAL de la migración de agentenuro a AWS.
# Todo lo demás (provisión, deploy, migración de datos) lee de acá.
#
# AISLAMIENTO: usa SIEMPRE el perfil AWS "agentenuro" (cuenta nueva, propia).
# NO tiene NADA que ver con ninguna otra cuenta/proyecto. La cuenta se deriva
# en runtime, así que este archivo sirve tal cual sin editar IDs a mano.
# ============================================================================
set -euo pipefail

# --- Perfil AWS CLI de la cuenta NUEVA de agentenuro -------------------------
# Se crea con:  aws configure --profile agentenuro
export AWS_PROFILE="${AWS_PROFILE:-agentenuro}"
export AWS_REGION="${AWS_REGION:-us-east-1}"       # N. Virginia (misma región que Supabase)
export AWS_DEFAULT_REGION="$AWS_REGION"

# --- Identidad de la cuenta (derivada en runtime, NO hardcodeada) -----------
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export ACCOUNT_ID

# --- Nombres de recursos (todos con prefijo agentenuro) -----------------------
export PROJECT="agentenuro"
export S3_PREFIX="agentenuro-${ACCOUNT_ID}-"        # bucket real = PREFIX + nombre lógico
export DOMAIN="agentenuro.com"

# Buckets lógicos -> el shim (src/lib/supabase.ts) usa estos mismos nombres
export PUBLIC_BUCKETS=(uploads ad-creatives broadcast-images social-media)
export PRIVATE_BUCKETS=(course-videos)

# --- RDS (instancia DEDICADA, no compartida con nada) -----------------------
export RDS_ID="agentenuro-db"
export RDS_CLASS="db.t4g.micro"
export RDS_ENGINE_VERSION="17.6"   # matchea Supabase (17.6) para migrar sin mismatch
export RDS_STORAGE_GB="20"
export RDS_MASTER_USER="agentenuro"
export RDS_DBNAME="agentenuro"
# El password se genera en 02-rds.sh y se guarda en deploy/.secrets/rds-password
# (ignorado por git). NO se hardcodea acá.

# --- EC2 --------------------------------------------------------------------
export EC2_NAME="agentenuro-app"
export EC2_TYPE="${EC2_TYPE:-t3.medium}"          # cambiar a t3.small si querés ahorrar RAM
export EC2_VOLUME_GB="40"                          # root gp3 (incluye /var/data/baileys-sessions)
export EC2_KEY_NAME="agentenuro-key"
export SG_APP="agentenuro-app-sg"
export SG_RDS="agentenuro-rds-sg"
export IAM_ROLE="agentenuro-ec2-role"
export IAM_PROFILE="agentenuro-ec2-profile"

# --- Repositorio a desplegar en el EC2 --------------------------------------
export GIT_REPO="https://github.com/marcoantonioprado76-rgb/agente-nnuro.git"
export GIT_BRANCH="${GIT_BRANCH:-main}"   # main = producción

# --- Origen de datos a migrar (Supabase actual, solo lectura) ---------------
# Se toma del .env de producción (deploy/.secrets/prod.env). No se pone acá.

# --- Rutas locales ----------------------------------------------------------
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEPLOY_DIR="$HERE"
export SECRETS_DIR="$HERE/.secrets"                # git-ignored; llaves/passwords/env
mkdir -p "$SECRETS_DIR"

echo "[config] cuenta=$ACCOUNT_ID region=$AWS_REGION perfil=$AWS_PROFILE prefijo=$S3_PREFIX"
