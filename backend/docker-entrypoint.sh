#!/bin/sh
set -e

echo "════════════════════════════════════════════════════════"
echo "[entrypoint] 🚀 MentorFlow API — iniciando deploy"
echo "════════════════════════════════════════════════════════"
echo "[entrypoint] NODE_ENV=$NODE_ENV"
echo "[entrypoint] DB_HOST=$DB_HOST DB_PORT=$DB_PORT DB_NAME=$DB_NAME"
echo "[entrypoint] PORT=${PORT:-3001}"
echo ""
echo "[entrypoint] 🛠  Rodando bootstrap (schema + super admin + planos)..."

if ! node dist/seeds/bootstrap.js; then
  echo "════════════════════════════════════════════════════════"
  echo "[entrypoint] ❌ BOOTSTRAP FALHOU — abortando para não subir API com banco inconsistente"
  echo "[entrypoint] Verifique as envs DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME"
  echo "════════════════════════════════════════════════════════"
  exit 1
fi

echo ""
echo "[entrypoint] ✅ Bootstrap OK. Subindo API..."
echo "════════════════════════════════════════════════════════"
exec node dist/main.js
