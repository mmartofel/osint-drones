import { Router, type Request, type Response } from 'express';
import type { FleetSimulator } from '../simulation.js';

export function createDroneRouter(sim: FleetSimulator): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(sim.getDrones());
  });

  router.get('/:id', (req: Request, res: Response) => {
    const drone = sim.getDroneById(req.params.id);
    if (!drone) {
      res.status(404).json({ error: 'Drone not found' });
      return;
    }
    res.json(drone);
  });

  router.get('/:id/trail', (req: Request, res: Response) => {
    const points = Math.min(100, Math.max(1, parseInt(String(req.query.points)) || 50));
    const drone = sim.getDroneById(req.params.id);
    if (!drone) {
      res.status(404).json({ error: 'Drone not found' });
      return;
    }
    res.json(sim.getTrail(req.params.id, points));
  });

  return router;
}
