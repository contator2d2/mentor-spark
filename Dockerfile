# Root Dockerfile — builds the NestJS backend located in ./backend
# Useful when the deploy platform (EasyPanel, Render, Railway) points Build Path to "/"

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/. .
RUN npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
