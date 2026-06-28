'use client';

import { useState } from 'react';
import { TopBar } from './TopBar/TopBar';
import { Sidebar } from './Sidebar/Sidebar';
import { DroneDetail } from './DetailPanel/DroneDetail';
import { BottomBar } from './BottomBar/BottomBar';
import { useFleetWebSocket } from '@/hooks/useFleetWebSocket';
import { useDroneWebSocket } from '@/hooks/useDroneWebSocket';
import { useFleetStore } from '@/store/fleetStore';
import DeckMap from './Map/DeckMap';

export default function FleetDashboard() {
  useFleetWebSocket();
  useDroneWebSocket();

  const selectedDroneId = useFleetStore((s) => s.selectedDroneId);
  const [visibleCount, setVisibleCount] = useState(0);

  return (
    <div className="flex flex-col h-screen bg-ops-bg text-white overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />

        {/* Map fills all remaining space */}
        <main className="flex-1 relative overflow-hidden">
          <DeckMap onVisibleCountChange={setVisibleCount} />
        </main>

        {/* Right detail panel slides in when a drone is selected */}
        <div
          className={`shrink-0 transition-all duration-300 overflow-hidden ${
            selectedDroneId ? 'w-[300px]' : 'w-0'
          }`}
        >
          {selectedDroneId && <DroneDetail />}
        </div>
      </div>

      <BottomBar visibleCount={visibleCount} />
    </div>
  );
}
