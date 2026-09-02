# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies required for vite build)
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build Vite SPA production bundle
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback & gzip configuration for React Router
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

