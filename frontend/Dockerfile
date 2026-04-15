# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (layer-cached; invalidates only on package.json change)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Strip CRLF that Windows/WSL may have introduced in the config file
RUN sed -i 's/\r//' /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
