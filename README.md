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

# Set up environment
cp .env.example .env
# Edit .env to point to your gateway/bridge

# Start dev server
pnpm dev
```

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

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Gateway GraphQL endpoint | `http://localhost:4000` |
| `VITE_WS_URL` | Gateway WebSocket endpoint | `ws://localhost:4000` |
| `VITE_BRIDGE_URL` | Bridge REST endpoint | `http://localhost:3030` |
| `EXPLORER_PORT` | Docker container port | `8080` |

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
