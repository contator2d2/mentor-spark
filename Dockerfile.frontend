# Frontend Dockerfile — builds the React/Vite app and serves with nginx
# Use this in EasyPanel for the FRONTEND service (Build Path = /, Dockerfile = Dockerfile.frontend)

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_API_URL deve apontar para a URL pública do backend no EasyPanel
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Production stage ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
