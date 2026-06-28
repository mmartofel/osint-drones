'use client';

import dynamic from 'next/dynamic';

// Entire dashboard is client-side (WebSocket, WebGL) — disable SSR
const FleetDashboard = dynamic(() => import('@/components/FleetDashboard'), { ssr: false });

export default function Page() {
  return <FleetDashboard />;
}
