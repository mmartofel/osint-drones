import { Router, type Request, type Response } from 'express';
import type { FleetSimulator } from '../simulation.js';

export function createStatsRouter(sim: FleetSimulator): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(sim.getStats());
  });

  return router;
}
