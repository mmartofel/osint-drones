import { Drone, DroneStatus, Mission, Position, Waypoint } from './types.js';

// Position history kept per drone (ring buffer)
const RING_BUFFER_SIZE = 100;

const PAYLOAD_TYPES = ['camera', 'sensor', 'cargo', 'medical', 'thermal-imager'];
const MISSION_NAMES = [
  'Border Patrol Alpha',
  'Recon Delta',
  'Supply Run Bravo',
  'Search Pattern Gamma',
  'Perimeter Check Echo',
  'Intel Gather Foxtrot',
  'Night Watch Golf',
  'Coastal Survey Hotel',
  'Urban Monitor India',
  'Relay Station Juliet',
];
const BASE_NAMES = ['Nest Alpha', 'Nest Bravo', 'Nest Charlie', 'Nest Delta', 'Nest Echo'];

interface SimulatedDrone {
  drone: Drone;
  trail: Position[];
  waypointIndex: number;
  // degrees of lat/lng moved per update tick
  stepSize: number;
  returningToBase: boolean;
  idleTicksRemaining: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

// Bearing from A to B: 0 = north, clockwise (matches compass headings)
function bearing(latA: number, lngA: number, latB: number, lngB: number): number {
  return ((Math.atan2(lngB - lngA, latB - latA) * 180) / Math.PI + 360) % 360;
}

function dist(latA: number, lngA: number, latB: number, lngB: number): number {
  return Math.sqrt((latB - latA) ** 2 + (lngB - lngA) ** 2);
}

export class FleetSimulator {
  private readonly drones = new Map<string, SimulatedDrone>();
  private readonly bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number };

  constructor(
    fleetSize: number,
    bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number },
  ) {
    this.bbox = bbox;
    this.initFleet(fleetSize);
  }

  private randomLat(): number {
    return rand(this.bbox.latMin, this.bbox.latMax);
  }

  private randomLng(): number {
    return rand(this.bbox.lngMin, this.bbox.lngMax);
  }

  private generateWaypoints(count: number): Waypoint[] {
    return Array.from({ length: count }, () => ({
      lat: this.randomLat(),
      lng: this.randomLng(),
      alt: rand(50, 300),
    }));
  }

  private generateMission(): Mission {
    return {
      id: `m-${Date.now()}-${randInt(1000, 9999)}`,
      name: MISSION_NAMES[randInt(0, MISSION_NAMES.length - 1)],
      waypoints: this.generateWaypoints(randInt(3, 7)),
    };
  }

  private initFleet(size: number): void {
    for (let i = 0; i < size; i++) {
      const id = `drone-${String(i + 1).padStart(3, '0')}`;
      const homeBase = {
        lat: this.randomLat(),
        lng: this.randomLng(),
        name: BASE_NAMES[i % BASE_NAMES.length],
      };
      const mission = this.generateMission();
      const status: DroneStatus = Math.random() < 0.75 ? 'active' : 'idle';
      const lat = this.randomLat();
      const lng = this.randomLng();

      const drone: Drone = {
        id,
        name: `UAV-${String(i + 1).padStart(3, '0')}`,
        status,
        lat,
        lng,
        altitude: rand(50, 300),
        heading: rand(0, 360),
        speed: status === 'active' ? rand(40, 120) : 0,
        battery: rand(40, 100),
        signal: rand(65, 100),
        payload: {
          type: PAYLOAD_TYPES[randInt(0, PAYLOAD_TYPES.length - 1)],
          weight: parseFloat(rand(0.5, 5).toFixed(1)),
        },
        mission,
        timestamps: {
          lastSeen: new Date().toISOString(),
          missionStart: new Date(Date.now() - rand(0, 3_600_000)).toISOString(),
        },
        homeBase,
      };

      this.drones.set(id, {
        drone,
        trail: [{ lat, lng, altitude: drone.altitude, timestamp: new Date().toISOString() }],
        waypointIndex: 0,
        // stepSize in degrees — ~0.001° ≈ 111 m per tick at 1 s interval ≈ 400 km/h, scaled down
        stepSize: rand(0.0006, 0.0018),
        returningToBase: false,
        idleTicksRemaining: status === 'idle' ? randInt(5, 25) : 0,
      });
    }
  }

  update(): void {
    const now = new Date();

    for (const sd of this.drones.values()) {
      const { drone } = sd;

      // Small signal noise each tick
      drone.signal = Math.max(10, Math.min(100, drone.signal + rand(-1.5, 1.5)));
      drone.timestamps.lastSeen = now.toISOString();

      if (drone.status === 'idle') {
        drone.battery = Math.max(0, drone.battery - 0.03);
        if (--sd.idleTicksRemaining <= 0) {
          drone.status = 'active';
          drone.mission = this.generateMission();
          drone.timestamps.missionStart = now.toISOString();
          sd.waypointIndex = 0;
          sd.returningToBase = false;
        }
        continue;
      }

      if (drone.status === 'emergency') {
        // Hovering drone bleeds battery; recovers to 'returning' when critically low
        drone.battery = Math.max(0, drone.battery - 0.15);
        if (drone.battery < 5) {
          drone.status = 'returning';
          sd.returningToBase = true;
          drone.mission = {
            ...drone.mission,
            waypoints: [{ lat: drone.homeBase.lat, lng: drone.homeBase.lng, alt: 30 }],
          };
          sd.waypointIndex = 0;
        }
        continue;
      }

      // Random emergency — 0.03% probability per tick
      if (drone.status === 'active' && Math.random() < 0.0003) {
        drone.status = 'emergency';
        continue;
      }

      // Auto-return when battery drops below 20%
      if (drone.battery < 20 && !sd.returningToBase) {
        sd.returningToBase = true;
        drone.status = 'returning';
        drone.mission = {
          ...drone.mission,
          waypoints: [{ lat: drone.homeBase.lat, lng: drone.homeBase.lng, alt: 50 }],
        };
        sd.waypointIndex = 0;
      }

      const waypoints: Waypoint[] = sd.returningToBase
        ? [{ lat: drone.homeBase.lat, lng: drone.homeBase.lng, alt: 30 }]
        : drone.mission.waypoints;

      if (waypoints.length === 0) {
        this.goIdle(sd);
        continue;
      }

      const target = waypoints[Math.min(sd.waypointIndex, waypoints.length - 1)];
      const d = dist(drone.lat, drone.lng, target.lat, target.lng);

      if (d < 0.0005) {
        if (sd.returningToBase) {
          // Dock: snap to base, quick recharge
          drone.lat = drone.homeBase.lat;
          drone.lng = drone.homeBase.lng;
          drone.altitude = 0;
          drone.speed = 0;
          drone.battery = Math.min(100, drone.battery + 60);
          sd.returningToBase = false;
          this.goIdle(sd);
        } else {
          sd.waypointIndex++;
          if (sd.waypointIndex >= waypoints.length) this.goIdle(sd);
        }
        continue;
      }

      // Interpolate toward current target waypoint
      const step = Math.min(sd.stepSize, d);
      const ratio = step / d;
      const prevLat = drone.lat;
      const prevLng = drone.lng;
      drone.lat += (target.lat - drone.lat) * ratio;
      drone.lng += (target.lng - drone.lng) * ratio;
      // Smooth altitude changes more gradually than position
      drone.altitude += (target.alt - drone.altitude) * ratio * 0.15;
      drone.heading = bearing(prevLat, prevLng, drone.lat, drone.lng);
      // Convert stepSize (deg/tick) to km/h: 1° lat ≈ 111 km, tick = 1 s → × 3600
      drone.speed = parseFloat((sd.stepSize * 111_000 * 3.6).toFixed(1));

      const drainRate = drone.status === 'returning' ? 0.12 : 0.08;
      drone.battery = Math.max(0, drone.battery - drainRate);

      // Append to ring buffer trail
      const pos: Position = {
        lat: drone.lat,
        lng: drone.lng,
        altitude: drone.altitude,
        timestamp: now.toISOString(),
      };
      if (sd.trail.length >= RING_BUFFER_SIZE) sd.trail.shift();
      sd.trail.push(pos);
    }
  }

  private goIdle(sd: SimulatedDrone): void {
    sd.drone.status = 'idle';
    sd.drone.speed = 0;
    sd.idleTicksRemaining = randInt(8, 25);
    sd.waypointIndex = 0;
    sd.returningToBase = false;
  }

  getDrones(): Drone[] {
    return Array.from(this.drones.values(), (sd) => sd.drone);
  }

  getDroneById(id: string): Drone | undefined {
    return this.drones.get(id)?.drone;
  }

  getTrail(id: string, points: number): Position[] {
    const sd = this.drones.get(id);
    if (!sd) return [];
    return sd.trail.slice(-Math.max(1, points));
  }

  getMissions(): Mission[] {
    const seen = new Set<string>();
    const out: Mission[] = [];
    for (const sd of this.drones.values()) {
      if (
        (sd.drone.status === 'active' || sd.drone.status === 'returning') &&
        !seen.has(sd.drone.mission.id)
      ) {
        seen.add(sd.drone.mission.id);
        out.push(sd.drone.mission);
      }
    }
    return out;
  }

  getStats() {
    const drones = this.getDrones();
    const counts = { active: 0, idle: 0, returning: 0, emergency: 0 };
    let batterySum = 0;
    for (const d of drones) {
      counts[d.status as keyof typeof counts]++;
      batterySum += d.battery;
    }
    const lats = drones.map((d) => d.lat);
    const lngs = drones.map((d) => d.lng);
    const coverageAreaKm2 =
      drones.length > 1
        ? parseFloat(
            (
              (Math.max(...lats) - Math.min(...lats)) *
              111 *
              ((Math.max(...lngs) - Math.min(...lngs)) * 85)
            ).toFixed(1),
          )
        : 0;
    return {
      total: drones.length,
      ...counts,
      avgBattery: parseFloat((batterySum / (drones.length || 1)).toFixed(1)),
      coverageAreaKm2,
    };
  }
}
