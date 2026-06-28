'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFleetStore } from '@/store/fleetStore';

interface Props {
  visibleCount: number;
}

export function BottomBar({ visibleCount }: Props) {
  const dronesMap = useFleetStore((s) => s.drones);
  const drones = Object.values(dronesMap);
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('—');

  // Update "last update" timestamp whenever drone data changes
  useEffect(() => {
    if (drones.length === 0) return;
    const latest = drones[0].timestamps.lastSeen;
    setLastUpdate(new Date(latest).toLocaleTimeString());
  }, [drones]);

  // Capture mouse position on the map canvas for coordinate display
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS') return;
    setCursor(null); // deck.gl provides coordinates via onHover if needed
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const activeMissions = drones.filter((d) => d.status === 'active').length;

  return (
    <footer className="h-8 flex items-center px-4 border-t border-ops-border bg-ops-bg text-[11px] font-mono text-gray-500 gap-6 shrink-0">
      <span>
        <span className="text-gray-400">{visibleCount}</span> drones in viewport
      </span>
      <span>
        <span className="text-green-400">{activeMissions}</span> active missions
      </span>
      <span>Updated: <span className="text-gray-400">{lastUpdate}</span></span>
      <div className="flex-1" />
      {cursor ? (
        <span>{cursor.lat.toFixed(5)}° {cursor.lng.toFixed(5)}°</span>
      ) : (
        <span className="text-gray-600">Move mouse over map for coordinates</span>
      )}
    </footer>
  );
}
