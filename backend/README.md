# MentorFlow — Backend (NestJS + PostgreSQL)

API multi-tenant para o SaaS de mentoria inteligente.

## Stack
- **NestJS 10** + TypeScript
- **TypeORM** + PostgreSQL 16
- **JWT** (passport-jwt) com guards por role
- **Nodemailer** (SMTP) para envio de emails
- **OpenAI SDK** (compatível com qualquer endpoint OpenAI-like)
- Swagger em `/api/docs`

## Rodando localmente (Docker)

```bash
cp .env.example .env
# edite .env com seus valores reais (DB, SMTP, OPENAI_API_KEY)
docker compose up --build -d
docker compose exec api npm run seed   # cria super admin
```

API disponível em `http://localhost:3001/api`.
Swagger em `http://localhost:3001/api/docs`.

## Rodando no EasyPanel

1. Crie um serviço **PostgreSQL 16** no EasyPanel. Anote credenciais.
2. Crie um serviço **App** apontando para este repositório (pasta `backend/`).
3. Adicione as variáveis de ambiente do `.env.example` no painel.
4. Garanta que `DB_HOST` aponte para o serviço Postgres interno.
5. No primeiro deploy, com `DB_SYNCHRONIZE=true`, o schema é criado automaticamente. Depois mude para `false`.
6. Execute uma vez: `npm run seed` (via terminal do EasyPanel) para criar o super admin.
7. Configure CORS_ORIGIN com a URL do frontend.

## Estrutura

```
src/
├── entities/             # Modelos TypeORM (User, Lead, TestTemplate, ...)
├── modules/
│   ├── auth/             # JWT, signup, login, guards
│   ├── users/            # /me + branding
│   ├── leads/            # CRM + funil
│   ├── tests/            # Builder + execução de testes
│   ├── meetings/         # Reuniões + transcrição + IA
│   ├── tasks/            # Tarefas / Kanban
│   ├── contents/         # Biblioteca de conteúdos
│   ├── notifications/    # In-app
│   ├── ai/               # Lovable AI/OpenAI + biblioteca de prompts
│   ├── public/           # Página /c/:slug + QR + submit lead
│   ├── admin/            # Aprovação manual de mentores
│   └── dashboard/        # Métricas
├── shared/               # MailService
├── seeds/seed.ts         # Cria super admin
├── data-source.ts
├── app.module.ts
└── main.ts
```

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/signup-mentor | Cadastro de mentor (fica pending) |
| POST | /api/auth/login | Login (retorna JWT) |
| GET  | /api/me | Dados do usuário logado |
| GET  | /api/dashboard | Métricas do mentor |
| GET  | /api/leads | Lista leads do mentor |
| PATCH| /api/leads/:id | Atualiza lead (mover no funil) |
| GET  | /api/tests/templates | Lista testes |
| POST | /api/tests/templates | Cria teste |
| POST | /api/tests/templates/:id/responses | Submete respostas (gera IA) |
| GET  | /api/ai/config | Config da IA do mentor |
| PUT  | /api/ai/config | Atualiza prompt/metodologia |
| POST | /api/ai/chat | Chat com assistente |
| GET  | /api/public/mentor/:slug | Dados públicos do mentor |
| GET  | /api/public/mentor/:slug/qrcode | PNG base64 do QR |
| POST | /api/public/mentor/:slug/lead | Criação pública de lead |
| GET  | /api/admin/mentors | (super_admin) Lista mentores |
| PATCH| /api/admin/mentors/:id/status | Aprovar/suspender |

## Multi-tenant

- Toda entidade tenant-scoped tem `mentorId`.
- O decorator `@TenantId()` resolve o mentorId do usuário logado:
  - Se for `mentor`/`super_admin` → seu próprio id
  - Se for `prospect`/`mentorado` → seu campo `mentorId`
- Todos os endpoints filtram por `mentorId` automaticamente.

## IA

- Por padrão usa **OpenAI** (`OPENAI_API_KEY`).
- Modelo configurável via `OPENAI_MODEL` (default `gpt-4o-mini`).
- Sem chave configurada, retorna resposta mockada (não quebra).
- Pode apontar para qualquer gateway OpenAI-compatível alterando o SDK.

## Próximos passos (não incluídos neste MVP)

- WebRTC nativo (reuniões dentro da plataforma)
- Integração real Zoom/Meet/WhatsApp Business
- Filas (BullMQ + Redis) para processamento async de IA pesada
- Storage S3 para uploads de logos/conteúdos
- Auditoria/logs estruturados
