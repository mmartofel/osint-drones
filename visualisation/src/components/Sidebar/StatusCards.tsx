'use client';

import { useFleetStore } from '@/store/fleetStore';

interface CardProps {
  label: string;
  value: number;
  color: string;
}

function Card({ label, value, color }: CardProps) {
  return (
    <div className="flex-1 bg-ops-surface rounded-lg p-3 text-center border border-ops-border">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function StatusCards() {
  const dronesMap = useFleetStore((s) => s.drones);
  const drones = Object.values(dronesMap);

  const counts = drones.reduce(
    (acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2">
        <Card label="Total"     value={drones.length}          color="text-white"     />
        <Card label="Active"    value={counts.active ?? 0}     color="text-green-400" />
      </div>
      <div className="flex gap-2">
        <Card label="Idle"      value={counts.idle ?? 0}       color="text-gray-400"  />
        <Card label="Return"    value={counts.returning ?? 0}  color="text-amber-400" />
      </div>
      {(counts.emergency ?? 0) > 0 && (
        <div className="flex gap-2">
          <Card label="Emergency" value={counts.emergency ?? 0} color="text-red-400 animate-pulse" />
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
