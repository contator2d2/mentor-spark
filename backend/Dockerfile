# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Instala apenas deps de produção
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copia build (inclui dist/seeds/bootstrap.js compilado)
COPY --from=builder /app/dist ./dist

# Entrypoint que roda bootstrap (schema + super admin) antes da API
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
