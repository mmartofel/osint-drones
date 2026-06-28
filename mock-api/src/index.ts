import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import { FleetSimulator } from './simulation.js';
import { createDroneRouter } from './routes/drones.js';
import { createMissionRouter } from './routes/missions.js';
import { createStatsRouter } from './routes/stats.js';
import { setupWebSocket } from './websocket/handlers.js';

const logger = pino({ name: 'mock-api' });

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FLEET_SIZE = parseInt(process.env.FLEET_SIZE ?? '15', 10);
const BBOX_LAT_MIN = parseFloat(process.env.BBOX_LAT_MIN ?? '52.10');
const BBOX_LAT_MAX = parseFloat(process.env.BBOX_LAT_MAX ?? '52.35');
const BBOX_LNG_MIN = parseFloat(process.env.BBOX_LNG_MIN ?? '20.85');
const BBOX_LNG_MAX = parseFloat(process.env.BBOX_LNG_MAX ?? '21.25');
const UPDATE_INTERVAL_MS = parseInt(process.env.UPDATE_INTERVAL_MS ?? '1000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

const sim = new FleetSimulator(FLEET_SIZE, {
  latMin: BBOX_LAT_MIN,
  latMax: BBOX_LAT_MAX,
  lngMin: BBOX_LNG_MIN,
  lngMax: BBOX_LNG_MAX,
});

const simInterval = setInterval(() => sim.update(), UPDATE_INTERVAL_MS);

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

const api = express.Router();
api.use('/drones', createDroneRouter(sim));
api.use('/missions', createMissionRouter(sim));
api.use('/stats', createStatsRouter(sim));
app.use('/api/v1', api);

const server = createServer(app);
const wss = new WebSocketServer({ server });
const teardownWs = setupWebSocket(wss, sim);

server.listen(PORT, () => {
  logger.info({ port: PORT, fleetSize: FLEET_SIZE, updateIntervalMs: UPDATE_INTERVAL_MS }, 'mock-api started');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  clearInterval(simInterval);
  teardownWs();
  wss.close(() => {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
