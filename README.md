# MentorFlow — SaaS de Mentoria Inteligente

Multi-tenant. Frontend React (Vite) + Backend NestJS + PostgreSQL.

## Como rodar

### Backend
```bash
cd backend
cp .env.example .env   # ajuste DB, SMTP, OPENAI_API_KEY
docker compose up --build -d
docker compose exec api npm run seed   # cria super admin
```
API: `http://localhost:3001/api` · Swagger: `/api/docs`

### Frontend
```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3001/api
npm install && npm run dev
```

## Deploy no EasyPanel

1. **Postgres**: serviço PostgreSQL 16.
2. **Backend** (`backend/`): variáveis do `.env.example`, `DB_HOST` apontando ao Postgres interno. Primeira vez `DB_SYNCHRONIZE=true`, depois `false`. Rode `npm run seed`.
3. **Frontend**: build estático com `VITE_API_URL` apontando à URL do backend, sirva via Nginx.
4. Configure `CORS_ORIGIN` no backend.

Detalhes do backend: ver `backend/README.md`.
