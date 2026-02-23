# OttoChain Explorer

Real-time blockchain visualization for OttoChain metagraph.

![Explorer Screenshot](docs/screenshot.png)

## Features

- Live transaction feed with WebSocket updates
- Agent identity profiles and reputation
- Fiber (state machine) visualization
- Contract and marketplace views
- Network statistics dashboard

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Set up environment (local dev needs direct URLs, not nginx proxies)
cp .env.example .env.local
# Edit .env.local with your actual endpoints:
#   VITE_GRAPHQL_URL=http://localhost:4000/graphql
#   VITE_BRIDGE_URL=http://localhost:3030
#   VITE_INDEXER_URL=http://localhost:3031

# Start dev server
pnpm dev
```

> **Note:** The default `public/config.js` uses nginx proxy paths (`/graphql`, `/api/bridge/`).
> For local dev without nginx, you must set `VITE_*` vars in `.env.local`.

### Docker

```bash
# Build and run
docker compose up -d

# Or with custom API endpoint
VITE_API_URL=http://gateway.example.com:4000 docker compose up -d --build
```

### Production Build

```bash
pnpm build
# Output in dist/
```

## Configuration

### Build-time (Vite)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRAPHQL_URL` | Gateway GraphQL endpoint | `/graphql` (nginx proxy) |
| `VITE_BRIDGE_URL` | Bridge REST endpoint | `/api/bridge` (nginx proxy) |
| `VITE_INDEXER_URL` | Indexer REST endpoint | `/api/indexer` (nginx proxy) |
| `EXPLORER_PORT` | Docker container port | `8080` |

### Runtime (Docker only)

| Variable | Description | Injected by |
|----------|-------------|-------------|
| `GRAPHQL_URL` | Override GraphQL endpoint | `docker-entrypoint.sh` |
| `BRIDGE_URL` | Override Bridge endpoint | `docker-entrypoint.sh` |
| `INDEXER_URL` | Override Indexer endpoint | `docker-entrypoint.sh` |

Runtime variables (no `VITE_` prefix) are injected into `public/config.js` at container startup, overriding build-time defaults.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Explorer UI                     │
│                 (React + Vite)                   │
├─────────────────────────────────────────────────┤
│  Components:                                     │
│  - Dashboard     - Agents      - Fibers         │
│  - Transactions  - Contracts   - Markets        │
└───────────────────────┬─────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Gateway  │  │ Gateway  │  │  Bridge  │
   │ GraphQL  │  │   WS     │  │   REST   │
   │  :4000   │  │  :4000   │  │  :3030   │
   └──────────┘  └──────────┘  └──────────┘
```

## Development

```bash
pnpm dev          # Start dev server with HMR
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript check
```

## Related Repositories

- [ottochain-services](https://github.com/ottobot-ai/ottochain-services) — Gateway, Bridge, Indexer
- [ottochain-deploy](https://github.com/ottobot-ai/ottochain-deploy) — Deployment infrastructure
- [ottochain-sdk](https://github.com/ottobot-ai/ottochain-sdk) — TypeScript SDK
