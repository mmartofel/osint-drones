import { IconLayer, PathLayer, ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Drone, Position, Mission, DroneStatus } from '@/types/drone';

type RGBA = [number, number, number, number];

// Status → [r,g,b,a] for deck.gl
const STATUS_COLOR: Record<DroneStatus, RGBA> = {
  active:    [34,  197, 94,  255],
  idle:      [148, 163, 184, 180],
  returning: [245, 158, 11,  255],
  emergency: [239, 68,  68,  255],
};

const ICON_MAPPING = {
  drone: { x: 0, y: 0, width: 64, height: 64, anchorX: 32, anchorY: 32, mask: true },
};

export interface DroneTrail {
  droneId: string;
  status: DroneStatus;
  positions: [number, number, number][];
}

export function buildLayers(params: {
  drones: Drone[];
  trails: Record<string, Position[]>;
  missions: Mission[];
  showTrails: boolean;
  showWaypoints: boolean;
  showHomeBases: boolean;
  showHeatmap: boolean;
  selectedDroneId: string | null;
  onDroneClick: (droneId: string) => void;
}) {
  const {
    drones, trails, missions,
    showTrails, showWaypoints, showHomeBases, showHeatmap,
    selectedDroneId, onDroneClick,
  } = params;

  const layers = [];

  // ── Heatmap layer (drone density) ──────────────────────────────────────
  if (showHeatmap) {
    layers.push(
      new HeatmapLayer({
        id: 'heatmap',
        data: drones,
        getPosition: (d: Drone) => [d.lng, d.lat] as [number, number],
        getWeight: () => 1,
        radiusPixels: 60,
        intensity: 1,
        threshold: 0.03,
      }),
    );
  }

  // ── Flight trail paths ─────────────────────────────────────────────────
  if (showTrails) {
    const trailData: DroneTrail[] = drones
      .map((d) => {
        const positions = (trails[d.id] ?? []).map(
          (p): [number, number, number] => [p.lng, p.lat, p.altitude],
        );
        return { droneId: d.id, status: d.status, positions };
      })
      .filter((t) => t.positions.length >= 2);

    layers.push(
      new PathLayer<DroneTrail>({
        id: 'trails',
        data: trailData,
        getPath: (d) => d.positions,
        getColor: (d) => {
          const [r, g, b] = STATUS_COLOR[d.status];
          return [r, g, b, 140] as RGBA;
        },
        getWidth: 2,
        widthUnits: 'pixels',
        widthMinPixels: 1,
        capRounded: true,
        jointRounded: true,
      }),
    );
  }

  // ── Mission waypoints ──────────────────────────────────────────────────
  if (showWaypoints && missions.length > 0) {
    // Flat list of all waypoints for scatter dots
    const allWaypoints = missions.flatMap((m) =>
      m.waypoints.map((w) => ({ ...w, missionId: m.id })),
    );

    layers.push(
      new ScatterplotLayer({
        id: 'waypoints',
        data: allWaypoints,
        getPosition: (d) => [d.lng, d.lat, d.alt],
        getRadius: 6,
        radiusUnits: 'pixels',
        getFillColor: [255, 200, 50, 200] as RGBA,
        stroked: true,
        getLineColor: [255, 200, 50, 80] as RGBA,
        lineWidthUnits: 'pixels',
        getLineWidth: 1,
      }),
    );

    // Lines connecting consecutive waypoints per mission
    const segments = missions.flatMap((m) =>
      m.waypoints.slice(0, -1).map((_, i) => ({
        source: [m.waypoints[i].lng, m.waypoints[i].lat, m.waypoints[i].alt] as [number, number, number],
        target: [m.waypoints[i + 1].lng, m.waypoints[i + 1].lat, m.waypoints[i + 1].alt] as [number, number, number],
      })),
    );

    layers.push(
      new LineLayer({
        id: 'waypoint-lines',
        data: segments,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: [255, 200, 50, 60] as RGBA,
        getWidth: 1,
        widthUnits: 'pixels',
      }),
    );
  }

  // ── Home bases ─────────────────────────────────────────────────────────
  if (showHomeBases) {
    // Deduplicate bases by name
    const baseMap = new Map(drones.map((d) => [d.homeBase.name, d.homeBase]));
    const bases = Array.from(baseMap.values());

    layers.push(
      new ScatterplotLayer({
        id: 'home-bases',
        data: bases,
        getPosition: (d) => [d.lng, d.lat, 0],
        getRadius: 10,
        radiusUnits: 'pixels',
        getFillColor: [100, 200, 255, 180] as RGBA,
        stroked: true,
        getLineColor: [100, 200, 255, 255] as RGBA,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
      }),
    );
  }

  // ── Drone icons ────────────────────────────────────────────────────────
  layers.push(
    new IconLayer<Drone>({
      id: 'drones',
      data: drones,
      iconAtlas: '/drone-icon.svg',
      iconMapping: ICON_MAPPING,
      getIcon: () => 'drone',
      getPosition: (d) => [d.lng, d.lat, d.altitude],
      getSize: (d) => (d.id === selectedDroneId ? 52 : 40),
      sizeUnits: 'pixels',
      // deck.gl angles are counter-clockwise; compass headings are clockwise → negate
      getAngle: (d) => -d.heading,
      getColor: (d) =>
        d.id === selectedDroneId
          ? ([255, 255, 255, 255] as RGBA)
          : STATUS_COLOR[d.status],
      billboard: true,
      pickable: true,
      onClick: ({ object }) => {
        if (object) onDroneClick(object.id);
      },
      transitions: {
        // Smooth position interpolation over 1 s between WebSocket updates
        getPosition: { duration: 1000 },
      },
      updateTriggers: {
        getSize: selectedDroneId,
        getColor: selectedDroneId,
      },
    }),
  );

  return layers;
}
