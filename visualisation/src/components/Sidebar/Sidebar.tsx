'use client';

import { StatusCards } from './StatusCards';
import { DroneList } from './DroneList';

export function Sidebar() {
  return (
    <aside className="w-[280px] shrink-0 bg-ops-bg border-r border-ops-border flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-ops-border">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Fleet Status</h2>
      </div>
      <StatusCards />
      <div className="px-3 py-2 border-t border-b border-ops-border">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Drone Registry</h2>
      </div>
      <DroneList />
    </aside>
  );
}
