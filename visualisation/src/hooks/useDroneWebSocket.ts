'use client';

import { useEffect, useRef } from 'react';
import { useFleetStore } from '@/store/fleetStore';
import type { Drone } from '@/types/drone';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = API_URL.replace(/^http/, 'ws');

// Opens a dedicated 500ms WebSocket for the selected drone, closes on deselect/change.
export function useDroneWebSocket() {
  const selectedDroneId = useFleetStore((s) => s.selectedDroneId);
  const updateDrone = useFleetStore((s) => s.updateDrone);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!selectedDroneId) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    wsRef.current?.close();
    const ws = new WebSocket(`${WS_BASE}/ws/drone/${selectedDroneId}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type: string; payload: Drone };
        if (msg.type === 'drone') updateDrone(msg.payload);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      ws.close();
    };
  }, [selectedDroneId, updateDrone]);
}
