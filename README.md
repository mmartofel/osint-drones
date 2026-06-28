# DroneOps — Fleet Visualisation

Real-time drone fleet monitoring dashboard with a simulated telemetry backend.

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│  Next.js 15 · Deck.gl · MapLibre GL         │
│  WebSocket ──► /ws/fleet (1 s)              │
│  WebSocket ──► /ws/drone/:id (500 ms)       │
│  REST fallback ◄── GET /api/v1/drones (2 s) │
└────────────────────┬────────────────────────┘
                     │ HTTP / WS
┌────────────────────▼────────────────────────┐
│              mock-api :3001                  │
│  Node.js · Express · ws                     │
│  Fleet simulator — 12-20 drones             │
│  Warsaw bounding box (configurable)         │
└─────────────────────────────────────────────┘
```

## Prerequisites

| Tool       | Minimum version |
|------------|-----------------|
| Docker     | 24              |
| Docker Compose | v2 (plugin) |
| Node.js    | 22 (local dev only) |
| npm        | 10 (local dev only) |

---

## Quick Start (Docker)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Build images and start both services
docker compose up --build

# 3. Open the dashboard
open http://localhost:3000
```

Both services start automatically. The visualisation waits until the mock-api health check passes before starting.

To stop:
```bash
docker compose down
```

---

## Manual Dev Start (without Docker)

### 1. mock-api

```bash
cd mock-api
npm install
npm run dev        # starts on :3001 with live reload
```

### 2. visualisation

Open a second terminal:

```bash
cd visualisation
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm install
npm run dev        # starts on :3000
```

Then open [http://localhost:3000](http://localhost:3000).

> **Note**: `NEXT_PUBLIC_API_URL` is inlined at build time by Next.js and must be set before `npm run dev`. The `.env.local` file above handles this for local development.

---

## Environment Variable Reference

### mock-api

| Variable          | Default           | Description                                      |
|-------------------|-------------------|--------------------------------------------------|
| `PORT`            | `3001`            | HTTP / WebSocket listen port                     |
| `FLEET_SIZE`      | `15`              | Number of drones to simulate (12–20 recommended) |
| `BBOX_LAT_MIN`    | `52.10`           | Bounding box south latitude                      |
| `BBOX_LAT_MAX`    | `52.35`           | Bounding box north latitude                      |
| `BBOX_LNG_MIN`    | `20.85`           | Bounding box west longitude                      |
| `BBOX_LNG_MAX`    | `21.25`           | Bounding box east longitude                      |
| `UPDATE_INTERVAL_MS` | `1000`         | Simulation tick rate (ms)                        |
| `CORS_ORIGIN`     | `http://localhost:3000` | Allowed origin for CORS                  |

### visualisation

| Variable              | Default                   | Description                            |
|-----------------------|---------------------------|----------------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`   | Base URL of the mock-api service       |
| `PORT`                | `3000`                    | Next.js listen port                    |

---

## Changing the Geographic Bounding Box

To point the simulation at a different city, update the four `BBOX_*` variables in your `.env` file:

```env
# Example: London
BBOX_LAT_MIN=51.45
BBOX_LAT_MAX=51.55
BBOX_LNG_MIN=-0.18
BBOX_LNG_MAX=0.02
```

The map camera's initial position is defined in two places that must stay in sync:
- `visualisation/src/store/fleetStore.ts` → `viewState` initial value
- `visualisation/src/components/TopBar/TopBar.tsx` → `DEFAULT_VIEW` constant (drives the **Reset View** button)

Restart both services after changing env vars.

---

## Swapping in a Real Drone API

The visualisation consumes a defined REST + WebSocket contract. Replace the mock-api with any backend that implements the same contract and the frontend requires **zero changes**.

### REST contract

| Method | Path                        | Response                  |
|--------|-----------------------------|---------------------------|
| `GET`  | `/api/v1/drones`            | `Drone[]`                 |
| `GET`  | `/api/v1/drones/:id`        | `Drone`                   |
| `GET`  | `/api/v1/drones/:id/trail?points=N` | `Position[]`      |
| `GET`  | `/api/v1/missions`          | `Mission[]`               |
| `GET`  | `/api/v1/stats`             | `FleetStats`              |
| `GET`  | `/health`                   | `{ status: "ok" }`        |

### WebSocket contract

| Path                 | Rate   | Message shape                              |
|----------------------|--------|--------------------------------------------|
| `/ws/fleet`          | 1 s    | `{ type: "fleet", payload: Drone[] }`      |
| `/ws/drone/:id`      | 500 ms | `{ type: "drone", payload: Drone }`        |

### `Drone` object shape

```jsonc
{
  "id": "drone-001",
  "name": "UAV-001",
  "status": "active",          // "active" | "idle" | "returning" | "emergency"
  "lat": 52.23,
  "lng": 21.01,
  "altitude": 120,             // metres
  "heading": 45,               // 0–360 degrees, 0 = north
  "speed": 72,                 // km/h
  "battery": 68,               // 0–100 %
  "signal": 91,                // 0–100 %
  "payload": { "type": "camera", "weight": 1.2 },
  "mission": {
    "id": "m-001",
    "name": "Recon Delta",
    "waypoints": [{ "lat": 52.25, "lng": 21.05, "alt": 150 }]
  },
  "timestamps": {
    "lastSeen": "2026-06-28T12:00:00.000Z",
    "missionStart": "2026-06-28T11:45:00.000Z"
  },
  "homeBase": { "lat": 52.20, "lng": 20.95, "name": "Nest Alpha" }
}
```

Set `NEXT_PUBLIC_API_URL` to the real backend's base URL and the frontend will connect automatically.
