export type DroneStatus = 'active' | 'idle' | 'returning' | 'emergency';

export interface Waypoint {
  lat: number;
  lng: number;
  alt: number;
}

export interface Mission {
  id: string;
  name: string;
  waypoints: Waypoint[];
}

export interface Payload {
  type: string;
  weight: number;
}

export interface HomeBase {
  lat: number;
  lng: number;
  name: string;
}

export interface Timestamps {
  lastSeen: string;
  missionStart: string;
}

export interface Drone {
  id: string;
  name: string;
  status: DroneStatus;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
  battery: number;
  signal: number;
  payload: Payload;
  mission: Mission;
  timestamps: Timestamps;
  homeBase: HomeBase;
}

export interface Position {
  lat: number;
  lng: number;
  altitude: number;
  timestamp: string;
}
