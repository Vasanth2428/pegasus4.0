
export type AppMode = 'archive' | 'live';
export type UserRole = 'admin' | 'official' | null;

export interface Camera {
  id: string;
  name: string;
  status: 'active' | 'partially-damaged' | 'defected';
  health: string;
  uptime: string;
  signal: number;
  lat: number;
  lng: number;
  temp: string;
  firmware: string;
}

export interface Incident {
  id: string;
  type: string;
  timestamp: string;
  severity: 'Safe' | 'Warning' | 'Danger';
  location: string;
  evidenceUrl: string;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  status: string;
  recipient: string;
  eta?: string;
}

export interface OfficialTask {
  id: string;
  cameraId: string;
  cameraName: string;
  location: { lat: number, lng: number };
  status: 'pending' | 'completed';
  assignedAt: string;
  completedAt?: string;
  type: 'repair' | 'inspection' | 'emergency';
}
