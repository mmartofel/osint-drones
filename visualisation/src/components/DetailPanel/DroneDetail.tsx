'use client';

import { useState, useEffect } from 'react';
import { useFleetStore } from '@/store/fleetStore';
import type { DroneStatus } from '@/types/drone';

const STATUS_LABEL: Record<DroneStatus, string> = {
  active:    'ACTIVE',
  idle:      'IDLE',
  returning: 'RTB',
  emergency: 'EMERGENCY',
};
const STATUS_COLOR: Record<DroneStatus, string> = {
  active:    'text-green-400  border-green-400',
  idle:      'text-gray-400   border-gray-400',
  returning: 'text-amber-400  border-amber-400',
  emergency: 'text-red-400    border-red-400   animate-pulse',
};

function BatteryGauge({ pct }: { pct: number }) {
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';
  const textColor = pct > 50 ? 'text-green-400' : pct > 20 ? 'text-amber-400' : 'text-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Battery</span>
        <span className={`font-bold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-3 bg-ops-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CompassRose({ heading }: { heading: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full">
          <circle cx="28" cy="28" r="26" fill="none" stroke="#1e293b" strokeWidth="2" />
          {/* Cardinal labels */}
          <text x="28" y="8"  textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">N</text>
          <text x="28" y="53" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">S</text>
          <text x="5"  y="31" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">W</text>
          <text x="51" y="31" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">E</text>
          {/* Heading needle */}
          <g transform={`rotate(${heading}, 28, 28)`}>
            <polygon points="28,8 25,28 31,28" fill="#22c55e" opacity="0.9" />
            <polygon points="28,48 25,28 31,28" fill="#475569" opacity="0.7" />
          </g>
        </svg>
      </div>
      <span className="text-xs font-mono text-gray-400">{heading.toFixed(0)}°</span>
    </div>
  );
}

export function DroneDetail() {
  const selectedDroneId = useFleetStore((s) => s.selectedDroneId);
  const drone = useFleetStore((s) => (s.selectedDroneId ? s.drones[s.selectedDroneId] : null));
  const selectDrone = useFleetStore((s) => s.selectDrone);
  const setViewState = useFleetStore((s) => s.setViewState);

  const [tracking, setTracking] = useState(false);

  // Keep camera on drone while tracking is on
  useEffect(() => {
    if (!tracking || !drone) return;
    setViewState({ longitude: drone.lng, latitude: drone.lat });
  }, [tracking, drone, setViewState]);

  // Reset tracking when selection changes
  useEffect(() => { setTracking(false); }, [selectedDroneId]);

  if (!drone) return null;

  const waypointsDone = drone.mission.waypoints.findIndex(
    (w) => Math.abs(w.lat - drone.lat) < 0.002 && Math.abs(w.lng - drone.lng) < 0.002,
  );
  const progress = Math.max(0, waypointsDone);

  return (
    <aside className="w-[300px] shrink-0 bg-ops-bg border-l border-ops-border flex flex-col overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ops-border">
        <div>
          <p className="text-xs text-gray-400 font-mono">{drone.id}</p>
          <h2 className="text-lg font-bold text-white">{drone.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-1 rounded border ${STATUS_COLOR[drone.status]}`}>
            {STATUS_LABEL[drone.status]}
          </span>
          <button
            onClick={() => selectDrone(null)}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Position & heading */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Row label="Lat" value={drone.lat.toFixed(5) + '°'} />
            <Row label="Lng" value={drone.lng.toFixed(5) + '°'} />
            <Row label="Altitude" value={drone.altitude.toFixed(0) + ' m'} />
            <Row label="Speed" value={drone.speed.toFixed(0) + ' km/h'} />
          </div>
          <CompassRose heading={drone.heading} />
        </div>

        {/* Battery & signal */}
        <BatteryGauge pct={drone.battery} />

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Signal</span>
            <span className="text-blue-400 font-bold">{drone.signal.toFixed(0)}%</span>
          </div>
          <div className="flex gap-0.5">
            {[20, 40, 60, 80, 100].map((t) => (
              <div key={t} className={`h-3 flex-1 rounded-sm ${drone.signal >= t ? 'bg-blue-400' : 'bg-ops-border'}`} />
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="bg-ops-surface rounded-lg p-3 border border-ops-border space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Mission</p>
          <p className="text-sm font-semibold text-white">{drone.mission.name}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>WP {progress}/{drone.mission.waypoints.length}</span>
            <div className="flex-1 h-1 bg-ops-border rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(progress / Math.max(1, drone.mission.waypoints.length)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Payload */}
        <div className="bg-ops-surface rounded-lg p-3 border border-ops-border">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Payload</p>
          <div className="flex justify-between text-sm">
            <span className="text-white capitalize">{drone.payload.type}</span>
            <span className="text-gray-400">{drone.payload.weight} kg</span>
          </div>
        </div>

        {/* Home base */}
        <div className="bg-ops-surface rounded-lg p-3 border border-ops-border">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Home Base</p>
          <p className="text-sm text-white">{drone.homeBase.name}</p>
          <p className="text-xs text-gray-500 font-mono">
            {drone.homeBase.lat.toFixed(4)}, {drone.homeBase.lng.toFixed(4)}
          </p>
        </div>

        {/* Timestamps */}
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>Last seen: {new Date(drone.timestamps.lastSeen).toLocaleTimeString()}</p>
          <p>Mission start: {new Date(drone.timestamps.missionStart).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Track toggle */}
      <div className="px-4 py-3 border-t border-ops-border">
        <button
          onClick={() => setTracking((t) => !t)}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            tracking
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-ops-surface text-gray-300 hover:bg-ops-hover border border-ops-border'
          }`}
        >
          {tracking ? '● Tracking' : 'Track Drone'}
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}
