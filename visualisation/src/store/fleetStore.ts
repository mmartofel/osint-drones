import { create } from 'zustand';
import type { Drone, Position, WsStatus } from '@/types/drone';

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface LayerFlags {
  trails: boolean;
  waypoints: boolean;
  homeBases: boolean;
  heatmap: boolean;
}

interface FleetState {
  drones: Record<string, Drone>;
  selectedDroneId: string | null;
  // Per-drone trail history keyed by drone ID
  trails: Record<string, Position[]>;
  wsStatus: WsStatus;
  layers: LayerFlags;
  viewState: ViewState;

  setDrones: (drones: Drone[]) => void;
  updateDrone: (drone: Drone) => void;
  selectDrone: (id: string | null) => void;
  setTrail: (droneId: string, trail: Position[]) => void;
  appendTrailPoint: (droneId: string, pos: Position) => void;
  setWsStatus: (status: WsStatus) => void;
  toggleLayer: (layer: keyof LayerFlags) => void;
  setViewState: (vs: Partial<ViewState>) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  drones: {},
  selectedDroneId: null,
  trails: {},
  wsStatus: 'disconnected',
  layers: {
    trails: true,
    waypoints: false,
    homeBases: true,
    heatmap: false,
  },
  viewState: {
    longitude: 21.01,
    latitude: 52.23,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  },

  setDrones: (drones) =>
    set(() => ({
      drones: Object.fromEntries(drones.map((d) => [d.id, d])),
    })),

  updateDrone: (drone) =>
    set((state) => ({
      drones: { ...state.drones, [drone.id]: drone },
    })),

  selectDrone: (id) => set({ selectedDroneId: id }),

  setTrail: (droneId, trail) =>
    set((state) => ({
      trails: { ...state.trails, [droneId]: trail },
    })),

  appendTrailPoint: (droneId, pos) =>
    set((state) => {
      const current = state.trails[droneId] ?? [];
      // Keep last 100 points in the frontend trail as well
      const updated = current.length >= 100 ? [...current.slice(1), pos] : [...current, pos];
      return { trails: { ...state.trails, [droneId]: updated } };
    }),

  setWsStatus: (wsStatus) => set({ wsStatus }),

  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  setViewState: (vs) =>
    set((state) => ({
      viewState: { ...state.viewState, ...vs },
    })),
}));
