#!/bin/sh
set -e

echo "[entrypoint] Iniciando MentorFlow API..."
echo "[entrypoint] Rodando bootstrap (DB + super admin)..."

node dist/seeds/bootstrap.js

echo "[entrypoint] Bootstrap concluído. Subindo API..."
exec node dist/main.js
