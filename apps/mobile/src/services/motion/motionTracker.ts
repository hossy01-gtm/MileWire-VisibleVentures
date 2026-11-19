import { Accelerometer, Gyroscope } from 'expo-sensors';

import { BUFFER_SIZE, SAMPLE_RATE_MS } from './config';
import { MotionBucketer, type MotionPoint } from './motionBuckets';
import { tryDetectJolt } from './joltDetector';
import type { GyroscopeData, JoltDetectedEvent, MotionAvailability, MotionData } from './types';

/** Report whether the accelerometer can be used (and permitted) on this device. */
export async function getMotionAvailability(): Promise<MotionAvailability> {
  try {
    if (!(await Accelerometer.isAvailableAsync())) return 'unavailable';
    const perm = await Accelerometer.getPermissionsAsync();
    return perm.granted ? 'available' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requestMotionPermission(): Promise<MotionAvailability> {
  try {
    if (!(await Accelerometer.isAvailableAsync())) return 'unavailable';
    const perm = await Accelerometer.requestPermissionsAsync();
    return perm.granted ? 'available' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export type MotionTrackerHandle = { stop: () => void };

export type MotionHandlers = {
  /** A bump the detector confirmed. */
  onJolt: (event: JoltDetectedEvent) => void;
  /** A finished one-second bucket of peak acceleration / rotation. */
  onBucket: (point: MotionPoint) => void;
};

/**
 * Subscribe to accelerometer + gyroscope at 10 Hz. Emits a jolt whenever the
 * detector fires and a peak bucket every second. Motion is the only sensor
 * besides GPS that MileWire records.
 */
export function startMotionTracking({ onJolt, onBucket }: MotionHandlers): MotionTrackerHandle {
  const buffer: MotionData[] = [];
  const bucketer = new MotionBucketer();
  let lastGyro: GyroscopeData | undefined;
  let lastJoltAt = 0;

  Accelerometer.setUpdateInterval(SAMPLE_RATE_MS);
  Gyroscope.setUpdateInterval(SAMPLE_RATE_MS);

  const gyroSub = Gyroscope.addListener((g) => {
    lastGyro = { x: g.x, y: g.y, z: g.z };
  });

  const accelSub = Accelerometer.addListener((a) => {
    const sample: MotionData = {
      timestamp: Date.now(),
      accelerometer: { x: a.x, y: a.y, z: a.z, magnitude: Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2) },
      gyroscope: lastGyro,
    };
    buffer.push(sample);
    if (buffer.length > BUFFER_SIZE) buffer.shift();

    const g = sample.gyroscope;
    const finished = bucketer.add(sample.timestamp, sample.accelerometer.magnitude, g ? Math.sqrt(g.x ** 2 + g.y ** 2 + g.z ** 2) : 0);
    if (finished) onBucket(finished);

    const result = tryDetectJolt(buffer, lastJoltAt);
    if (result.detected) {
      lastJoltAt = result.timestamp;
      const { detected: _detected, ...event } = result;
      onJolt(event);
    }
  });

  return {
    stop() {
      accelSub.remove();
      gyroSub.remove();
      const last = bucketer.flush();
      if (last) onBucket(last);
    },
  };
}
