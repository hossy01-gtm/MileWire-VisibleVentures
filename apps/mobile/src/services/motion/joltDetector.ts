import {
  GRAVITY_BASELINE_G,
  JOLT_CONFIDENCE_BASE,
  JOLT_CONFIDENCE_GYRO_BOOST,
  JOLT_CONFIDENCE_JERK_BOOST,
  JOLT_CONFIDENCE_JERK_BOOST_MIN,
  JOLT_CONFIDENCE_SHORT_DURATION_BOOST,
  JOLT_CONFIDENCE_SHORT_DURATION_MS,
  JOLT_COOLDOWN_MS,
  JOLT_DETECTOR_VERSION,
  JOLT_DURATION_MAX_MS,
  JOLT_GYRO_SOFT_MIN,
  JOLT_JERK_MIN,
  JOLT_PEAK_DEV_MIN,
  JOLT_SAMPLE_GAP_MAX_MS,
  JOLT_SEVERITY_HIGH_MIN,
  JOLT_SEVERITY_MEDIUM_MIN,
  JOLT_WINDOW_LOOKBACK_MS,
  SAMPLE_RATE_MS,
} from './config';
import type { GyroscopeData, JoltDetectionResult, JoltSeverity, MotionData } from './types';

const gyroMagnitude = (g: GyroscopeData | undefined) =>
  g ? Math.sqrt(g.x ** 2 + g.y ** 2 + g.z ** 2) : 0;

const peakDeviation = (magnitude: number) => Math.abs(magnitude - GRAVITY_BASELINE_G);

export function classifyJoltSeverity(peakDev: number): JoltSeverity {
  if (peakDev >= JOLT_SEVERITY_HIGH_MIN) return 'high';
  if (peakDev >= JOLT_SEVERITY_MEDIUM_MIN) return 'medium';
  return 'low';
}

export function scoreJoltConfidence(input: {
  jerk: number;
  gyroMag: number;
  durationMs: number;
}): number {
  let c = JOLT_CONFIDENCE_BASE;
  if (input.jerk >= JOLT_CONFIDENCE_JERK_BOOST_MIN) c += JOLT_CONFIDENCE_JERK_BOOST;
  if (input.gyroMag >= JOLT_GYRO_SOFT_MIN) c += JOLT_CONFIDENCE_GYRO_BOOST;
  if (input.durationMs <= JOLT_CONFIDENCE_SHORT_DURATION_MS) c += JOLT_CONFIDENCE_SHORT_DURATION_BOOST;
  return Math.min(1, Math.max(0, c));
}

/**
 * Decide whether the newest buffer sample is a device-frame jolt.
 *
 * Multi-feature gate: peak |magnitude − 1 g|, jerk, short elevated duration,
 * and a refractory period. Gyro co-occurrence only boosts confidence.
 */
export function tryDetectJolt(
  buffer: readonly MotionData[],
  lastJoltTimestamp: number,
): JoltDetectionResult {
  if (buffer.length < 2) return { detected: false, reason: 'insufficient_samples' };

  const latestIndex = buffer.length - 1;
  const latest = buffer[latestIndex];
  const timestamp = latest.timestamp;

  if (lastJoltTimestamp > 0 && timestamp - lastJoltTimestamp < JOLT_COOLDOWN_MS) {
    return { detected: false, reason: 'cooldown' };
  }

  const magnitude = latest.accelerometer.magnitude;
  const peakDev = peakDeviation(magnitude);
  if (peakDev < JOLT_PEAK_DEV_MIN) return { detected: false, reason: 'peak_below_threshold' };

  const prev = buffer[latestIndex - 1];
  let dtMs = timestamp - prev.timestamp;
  if (dtMs <= 0) dtMs = SAMPLE_RATE_MS;
  if (dtMs > JOLT_SAMPLE_GAP_MAX_MS) return { detected: false, reason: 'sample_gap' };

  const jerk = Math.abs(magnitude - prev.accelerometer.magnitude) / (dtMs / 1000);
  if (jerk < JOLT_JERK_MIN) return { detected: false, reason: 'jerk_below_threshold' };

  // Walk left while the signal stays above half the peak threshold.
  const halfPeak = JOLT_PEAK_DEV_MIN * 0.5;
  let left = latestIndex;
  while (left > 0) {
    const candidate = buffer[left - 1];
    if (peakDeviation(candidate.accelerometer.magnitude) < halfPeak) break;
    if (timestamp - candidate.timestamp > JOLT_WINDOW_LOOKBACK_MS) break;
    left -= 1;
  }

  const durationMs = timestamp - buffer[left].timestamp;
  if (durationMs > JOLT_DURATION_MAX_MS) return { detected: false, reason: 'duration_exceeded' };

  // The newest sample must be the window peak, or the same impact fires twice.
  let peakIndex = left;
  let maxDev = -1;
  for (let i = left; i <= latestIndex; i++) {
    const dev = peakDeviation(buffer[i].accelerometer.magnitude);
    if (dev >= maxDev) {
      maxDev = dev;
      peakIndex = i;
    }
  }
  if (peakIndex !== latestIndex) return { detected: false, reason: 'not_window_peak' };

  let maxGyro = 0;
  for (let i = left; i <= latestIndex; i++) {
    maxGyro = Math.max(maxGyro, gyroMagnitude(buffer[i].gyroscope));
  }

  return {
    detected: true,
    timestamp,
    magnitude,
    severity: classifyJoltSeverity(peakDev),
    confidence: scoreJoltConfidence({ jerk, gyroMag: maxGyro, durationMs }),
    detector_version: JOLT_DETECTOR_VERSION,
    features: {
      peak_dev: peakDev,
      jerk,
      gyro_mag: maxGyro,
      duration_ms: durationMs,
      sample_count: latestIndex - left + 1,
    },
  };
}
