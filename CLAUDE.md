# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DroneOps — a real-time drone fleet OSINT visualisation system. Two services: a Node.js telemetry simulator (`mock-api/`) and a Next.js dashboard (`visualisation/`), orchestrated via Docker Compose.

## Architecture

```
osint-drones/
├── mock-api/          # Node.js + Express + TypeScript telemetry simulator
│   └── src/
│       ├── index.ts           # Entry point, Express + WebSocketServer setup
│       ├── simulation.ts      # FleetSimulator class (drone state machine + ring buffer)
│       ├── types.ts           # Shared TypeScript types
│       ├── routes/            # drones.ts · missions.ts · stats.ts
│       └── websocket/
│           └── handlers.ts    # WS broadcast intervals + connection routing
├── visualisation/     # Next.js 15 + Deck.gl + MapLibre GL JS frontend
│   └── src/
│       ├── app/               # Next.js App Router (layout.tsx · page.tsx · globals.css)
│       ├── components/
│       │   ├── FleetDashboard.tsx   # Root client component — mounts hooks + layout
│       │   ├── Map/           # DeckMap.tsx (WebGL map) · layers.ts (layer factories)
│       │   ├── Sidebar/       # Sidebar · StatusCards · DroneList
│       │   ├── DetailPanel/   # DroneDetail (slides in on drone select)
│       │   ├── TopBar/        # TopBar (layer toggles, WS status, UTC, Reset View)
│       │   └── BottomBar/     # Viewport count, mission count, last update
│       ├── hooks/             # useFleetWebSocket · useDroneWebSocket
│       ├── store/             # fleetStore.ts (Zustand)
│       └── types/             # drone.ts (mirrored from mock-api types)
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Development Commands

```bash
# mock-api (port 3001)
cd mock-api
npm install
npm run dev       # tsx watch — live reload
npm run build     # tsc → dist/
npm run lint
npm run format

# visualisation (port 3000)
cd visualisation
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm install
npm run dev       # next dev
npm run build     # next build
npm run lint
npm run format

# Full stack via Docker
cp .env.example .env
docker compose up --build
docker compose down
```

## Key Conventions

- TypeScript strict mode in both services; `skipLibCheck: true` to accommodate deck.gl types
- ESLint + Prettier configured independently per service (`eslint.config.mjs`, `.prettierrc`)
- All config via env vars; `.env` at root (gitignored), `.env.example` documented
- mock-api: zero external API calls — everything simulated in-process
- `pino` for structured logging in mock-api; `console` acceptable in the visualisation

## Critical Gotchas

**Zustand selector rule** — Never derive a new array/object inside a selector. It creates a new reference on every call and triggers an infinite render loop (`getSnapshot should be cached` error):
```ts
// Wrong — new array reference every render
const drones = useFleetStore((s) => Object.values(s.drones));

// Correct — select raw object, derive outside
const dronesMap = useFleetStore((s) => s.drones);
const drones = Object.values(dronesMap);
```

**Next.js 15 `ssr: false`** — `dynamic(..., { ssr: false })` requires the calling file to be a Client Component. `src/app/page.tsx` has `'use client'` for this reason.

**Deck.gl icon rotation** — `getAngle` is counter-clockwise; compass headings are clockwise. Use `getAngle: (d) => -d.heading` so the drone icon points in its direction of travel.

**Deck.gl position transitions** — Set to `{ duration: 1000 }` to lerp drone positions smoothly between 1s WebSocket updates. No separate animation loop needed.

## Changing the Default Map View

The initial camera position (Warsaw) is defined in two places that must stay in sync:
- `visualisation/src/store/fleetStore.ts` → `viewState` initial value
- `visualisation/src/components/TopBar/TopBar.tsx` → `DEFAULT_VIEW` constant (used by the Reset View button)
