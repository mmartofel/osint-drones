import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { FleetSimulator } from '../simulation.js';
import pino from 'pino';

const logger = pino({ name: 'ws' });

export function setupWebSocket(wss: WebSocketServer, sim: FleetSimulator): () => void {
  const fleetClients = new Set<WebSocket>();
  // droneId → connected clients watching that drone
  const droneClients = new Map<string, Set<WebSocket>>();

  // Broadcast full fleet snapshot every 1 s
  const fleetInterval = setInterval(() => {
    if (fleetClients.size === 0) return;
    const payload = JSON.stringify({ type: 'fleet', payload: sim.getDrones() });
    for (const ws of fleetClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }, 1000);

  // Broadcast individual drone telemetry every 500 ms
  const droneInterval = setInterval(() => {
    for (const [droneId, clients] of droneClients) {
      if (clients.size === 0) continue;
      const drone = sim.getDroneById(droneId);
      if (!drone) continue;
      const payload = JSON.stringify({ type: 'drone', payload: drone });
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      }
    }
  }, 500);

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = req.url ?? '';
    logger.info({ url }, 'WS connected');

    if (url === '/ws/fleet') {
      fleetClients.add(ws);
      // Send immediate snapshot on connect so the UI doesn't wait up to 1 s
      ws.send(JSON.stringify({ type: 'fleet', payload: sim.getDrones() }));
      ws.on('close', () => {
        fleetClients.delete(ws);
        logger.info({ url }, 'WS disconnected');
      });
    } else {
      const match = /^\/ws\/drone\/(.+)$/.exec(url);
      if (match) {
        const droneId = match[1];
        if (!droneClients.has(droneId)) droneClients.set(droneId, new Set());
        droneClients.get(droneId)!.add(ws);

        const drone = sim.getDroneById(droneId);
        if (drone) ws.send(JSON.stringify({ type: 'drone', payload: drone }));

        ws.on('close', () => {
          droneClients.get(droneId)?.delete(ws);
          logger.info({ url }, 'WS disconnected');
        });
      } else {
        logger.warn({ url }, 'Unknown WS path');
        ws.close(1008, 'Unknown path');
      }
    }

    ws.on('error', (err) => logger.error({ err }, 'WS error'));
  });

  return () => {
    clearInterval(fleetInterval);
    clearInterval(droneInterval);
  };
}
