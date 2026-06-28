'use client';

import { useEffect, useRef } from 'react';
import { useFleetStore } from '@/store/fleetStore';
import type { Drone } from '@/types/drone';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = API_URL.replace(/^http/, 'ws');
const FALLBACK_POLL_MS = 2000;
const MAX_RETRY_DELAY_MS = 30_000;

export function useFleetWebSocket() {
  const setDrones = useFleetStore((s) => s.setDrones);
  const setWsStatus = useFleetStore((s) => s.setWsStatus);
  const appendTrailPoint = useFleetStore((s) => s.appendTrailPoint);

  // Track retry state across renders without triggering re-renders
  const retryDelay = useRef(1_000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    function stopPoll() {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }

    // REST fallback: polls /api/v1/drones when WS is unavailable
    function startPoll() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/drones`);
          if (!res.ok) return;
          const data: Drone[] = await res.json();
          if (isMounted.current) setDrones(data);
        } catch {
          // silently ignore poll errors
        }
      }, FALLBACK_POLL_MS);
    }

    function connect() {
      if (!isMounted.current) return;
      setWsStatus('reconnecting');

      const ws = new WebSocket(`${WS_BASE}/ws/fleet`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) { ws.close(); return; }
        setWsStatus('connected');
        retryDelay.current = 1_000; // reset backoff on successful connection
        stopPoll();
      };

      ws.onmessage = (evt) => {
        if (!isMounted.current) return;
        try {
          const msg = JSON.parse(evt.data as string) as { type: string; payload: Drone[] };
          if (msg.type === 'fleet') {
            setDrones(msg.payload);
            // Append current position to each drone's trail
            for (const drone of msg.payload) {
              appendTrailPoint(drone.id, {
                lat: drone.lat,
                lng: drone.lng,
                altitude: drone.altitude,
                timestamp: drone.timestamps.lastSeen,
              });
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMounted.current) return;
        setWsStatus('disconnected');
        startPoll(); // activate REST fallback while reconnecting
        // Exponential backoff, capped at MAX_RETRY_DELAY_MS
        retryTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, MAX_RETRY_DELAY_MS);
          connect();
        }, retryDelay.current);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      isMounted.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      stopPoll();
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
