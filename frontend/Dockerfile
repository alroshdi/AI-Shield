# Multi-stage build: compile the SPA, then serve the static output with nginx, which
# also reverse-proxies /api to the ai-shield-api service (see docker-compose.yml and
# nginx.conf) — the same relative-path contract the Vite dev proxy uses, so the app code
# never needs to know its own deployment URL.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
