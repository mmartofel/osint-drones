'use client';

import { useEffect, useState } from 'react';
import { useFleetStore } from '@/store/fleetStore';
import type { WsStatus } from '@/types/drone';

const WS_DOT: Record<WsStatus, string> = {
  connected:    'bg-green-400',
  reconnecting: 'bg-amber-400 animate-pulse',
  disconnected: 'bg-red-500',
};
const WS_LABEL: Record<WsStatus, string> = {
  connected:    'LIVE',
  reconnecting: 'RECONNECTING',
  disconnected: 'OFFLINE',
};

type LayerKey = 'trails' | 'waypoints' | 'homeBases' | 'heatmap';

const LAYER_LABELS: { key: LayerKey; label: string }[] = [
  { key: 'trails',    label: 'Trails' },
  { key: 'waypoints', label: 'Waypoints' },
  { key: 'homeBases', label: 'Home Bases' },
  { key: 'heatmap',   label: 'Heatmap' },
];

const DEFAULT_VIEW = { longitude: 21.01, latitude: 52.23, zoom: 11, pitch: 0, bearing: 0 };

export function TopBar() {
  const wsStatus = useFleetStore((s) => s.wsStatus);
  const layers = useFleetStore((s) => s.layers);
  const toggleLayer = useFleetStore((s) => s.toggleLayer);
  const setViewState = useFleetStore((s) => s.setViewState);
  const [utc, setUtc] = useState('');

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center h-12 px-4 border-b border-ops-border bg-ops-bg shrink-0 gap-4">
      {/* Logo + title */}
      <div className="flex items-center gap-2 shrink-0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-400">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <line x1="12" y1="4" x2="12" y2="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="23" x2="12" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4" y1="12" x2="1" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="23" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
        </svg>
        <span className="text-white font-bold text-sm tracking-widest uppercase">DroneOps</span>
      </div>

      {/* Reset viewport */}
      <button
        onClick={() => setViewState(DEFAULT_VIEW)}
        title="Reset map view"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-ops-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-[11px] font-semibold shrink-0"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Reset View
      </button>

      {/* WS status */}
      <div className="flex items-center gap-1.5 ml-2">
        <span className={`w-2 h-2 rounded-full ${WS_DOT[wsStatus]}`} />
        <span className="text-[11px] font-mono text-gray-400">{WS_LABEL[wsStatus]}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Layer toggles */}
      <div className="flex items-center gap-1.5">
        {LAYER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`text-[11px] px-2.5 py-1 rounded border font-semibold transition-colors ${
              layers[key]
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'border-ops-border text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* UTC clock */}
      <div className="shrink-0 ml-2 font-mono text-xs text-gray-400 bg-ops-surface px-2.5 py-1 rounded border border-ops-border">
        {utc} UTC
      </div>
    </header>
  );
}
