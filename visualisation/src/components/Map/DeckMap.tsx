'use client';

import { useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import { WebMercatorViewport } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useFleetStore } from '@/store/fleetStore';
import { buildLayers } from './layers';
import type { ViewState } from '@/store/fleetStore';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface Props {
  onVisibleCountChange: (count: number) => void;
}

export default function DeckMap({ onVisibleCountChange }: Props) {
  const dronesMap = useFleetStore((s) => s.drones);
  const drones = Object.values(dronesMap);
  const trails = useFleetStore((s) => s.trails);
  const layers_ = useFleetStore((s) => s.layers);
  const selectedDroneId = useFleetStore((s) => s.selectedDroneId);
  const viewState = useFleetStore((s) => s.viewState);
  const setViewState = useFleetStore((s) => s.setViewState);
  const selectDrone = useFleetStore((s) => s.selectDrone);

  // Extract missions from active drones, deduplicated
  const missions = useMemo(() => {
    const seen = new Set<string>();
    return drones
      .filter((d) => d.status === 'active' || d.status === 'returning')
      .map((d) => d.mission)
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  }, [drones]);

  const handleViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: ViewState }) => {
      setViewState(vs);
      // Count drones visible inside the current viewport
      try {
        const vp = new WebMercatorViewport(vs);
        const [minLng, minLat, maxLng, maxLat] = vp.getBounds();
        const visible = drones.filter(
          (d) => d.lng >= minLng && d.lng <= maxLng && d.lat >= minLat && d.lat <= maxLat,
        ).length;
        onVisibleCountChange(visible);
      } catch {
        onVisibleCountChange(drones.length);
      }
    },
    [drones, setViewState, onVisibleCountChange],
  );

  const layers = useMemo(
    () =>
      buildLayers({
        drones,
        trails,
        missions,
        showTrails: layers_.trails,
        showWaypoints: layers_.waypoints,
        showHomeBases: layers_.homeBases,
        showHeatmap: layers_.heatmap,
        selectedDroneId,
        onDroneClick: selectDrone,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drones, trails, missions, layers_, selectedDroneId],
  );

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={handleViewStateChange as Parameters<typeof DeckGL>[0]['onViewStateChange']}
      controller
      layers={layers}
      getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
    >
      <Map mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
