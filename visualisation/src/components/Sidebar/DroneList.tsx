'use client';

import { useFleetStore } from '@/store/fleetStore';
import type { Drone, DroneStatus } from '@/types/drone';

const STATUS_LABEL: Record<DroneStatus, string> = {
  active:    'ACTIVE',
  idle:      'IDLE',
  returning: 'RTB',
  emergency: 'EMRG',
};

const STATUS_COLOR: Record<DroneStatus, string> = {
  active:    'text-green-400  bg-green-400/10  border-green-400/30',
  idle:      'text-gray-400   bg-gray-400/10   border-gray-400/30',
  returning: 'text-amber-400  bg-amber-400/10  border-amber-400/30',
  emergency: 'text-red-400    bg-red-400/10    border-red-400/30   animate-pulse',
};

const BATTERY_BAR: (pct: number) => string = (pct) => {
  if (pct > 50) return 'bg-green-500';
  if (pct > 20) return 'bg-amber-400';
  return 'bg-red-500';
};

function DroneRow({ drone, selected, onClick }: { drone: Drone; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-ops-border transition-colors hover:bg-ops-hover
        ${selected ? 'bg-ops-hover border-l-2 border-l-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-mono font-semibold text-white truncate">{drone.name}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[drone.status]}`}>
          {STATUS_LABEL[drone.status]}
        </span>
      </div>

      {/* Battery bar */}
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-ops-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${BATTERY_BAR(drone.battery)}`}
            style={{ width: `${drone.battery.toFixed(0)}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">
          {drone.battery.toFixed(0)}%
        </span>
      </div>

      {/* Signal strength */}
      <div className="mt-1 flex items-center gap-1">
        {[20, 40, 60, 80, 100].map((threshold) => (
          <div
            key={threshold}
            className={`h-1 flex-1 rounded-sm ${
              drone.signal >= threshold ? 'bg-blue-400' : 'bg-ops-border'
            }`}
          />
        ))}
        <span className="text-[10px] text-gray-500 ml-1">{drone.signal.toFixed(0)}%</span>
      </div>
    </button>
  );
}

export function DroneList() {
  const dronesMap = useFleetStore((s) => s.drones);
  const drones = Object.values(dronesMap);
  const selectedDroneId = useFleetStore((s) => s.selectedDroneId);
  const selectDrone = useFleetStore((s) => s.selectDrone);
  const setViewState = useFleetStore((s) => s.setViewState);

  // Sort: emergency first, then active, returning, idle
  const ORDER: Record<DroneStatus, number> = { emergency: 0, active: 1, returning: 2, idle: 3 };
  const sorted = [...drones].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));

  const handleSelect = (drone: Drone) => {
    selectDrone(drone.id);
    // Fly camera to the selected drone
    setViewState({ longitude: drone.lng, latitude: drone.lat, zoom: 14 });
  };

  return (
    <div className="overflow-y-auto flex-1 min-h-0">
      {sorted.map((d) => (
        <DroneRow
          key={d.id}
          drone={d}
          selected={d.id === selectedDroneId}
          onClick={() => handleSelect(d)}
        />
      ))}
      {sorted.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Waiting for fleet data…</p>
      )}
    </div>
  );
}
