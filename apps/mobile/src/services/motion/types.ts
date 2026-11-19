export interface AccelerometerData {
  /** Acceleration in g along each device axis. */
  x: number;
  y: number;
  z: number;
  /** sqrt(x²+y²+z²) in g; ~1.0 at rest. */
  magnitude: number;
}

export interface GyroscopeData {
  /** Angular velocity in rad/s. */
  x: number;
  y: number;
  z: number;
}

export interface MotionData {
  timestamp: number;
  accelerometer: AccelerometerData;
  gyroscope?: GyroscopeData;
}

export type JoltSeverity = 'low' | 'medium' | 'high';

export interface JoltFeatures {
  peak_dev: number;
  jerk: number;
  gyro_mag: number;
  duration_ms: number;
  sample_count: number;
}

export interface JoltDetectedEvent {
  timestamp: number;
  magnitude: number;
  severity: JoltSeverity;
  confidence: number;
  detector_version: string;
  features: JoltFeatures;
}

export type JoltDetectionResult =
  | ({ detected: true } & JoltDetectedEvent)
  | { detected: false; reason?: string };

export type MotionAvailability = 'available' | 'unavailable' | 'denied';
