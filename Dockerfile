# OttoChain Explorer - Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# Build args for Vite (baked into static assets)
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=ws://localhost:4000
ARG VITE_BRIDGE_URL=http://localhost:3030

RUN pnpm build

# Production image - nginx for static serving
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing + API proxy
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # GraphQL API proxy (both HTTP and WebSocket) \
    location /graphql { \
        proxy_pass http://gateway:4000/graphql; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_read_timeout 86400; \
    } \
    \
    # SPA routing - serve index.html for all non-asset routes \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Static assets with long cache \
    location /assets { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
