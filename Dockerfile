# OttoChain Explorer - Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# Build with placeholder URLs - nginx proxies to real services
RUN pnpm build

# Production image - nginx for static serving
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint for runtime config injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# nginx config with API proxies
# Services are expected on the same Docker network
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX_EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # GraphQL API proxy (HTTP and WebSocket)
    location /graphql {
        proxy_pass http://gateway:4000/graphql;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Bridge API proxy
    location /api/bridge/ {
        proxy_pass http://bridge:3030/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Indexer API proxy
    location /api/indexer/ {
        proxy_pass http://indexer:3031/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA routing - serve index.html for all non-asset routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with long cache
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
