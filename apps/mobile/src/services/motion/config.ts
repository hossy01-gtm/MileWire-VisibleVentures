/** Rolling buffer size for motion history. */
export const BUFFER_SIZE = 100;
/** Sensor sampling interval in milliseconds (10 Hz). */
export const SAMPLE_RATE_MS = 100;

/** Detector version stamped on every jolt. */
export const JOLT_DETECTOR_VERSION = 'jolt-detector-v1';

/** expo-sensors reports in g, so magnitude centres near 1.0 at rest. */
export const GRAVITY_BASELINE_G = 1.0;

/** Minimum |magnitude − baseline| (g) to consider a jolt peak. */
export const JOLT_PEAK_DEV_MIN = 0.3;
/** Minimum jerk |Δmagnitude|/Δt (g/s) required together with the peak. */
export const JOLT_JERK_MIN = 1.5;
/** Reject sustained elevation longer than this (ms). */
export const JOLT_DURATION_MAX_MS = 600;
/** Larger gaps between samples are a sensor pause, not one impact (ms). */
export const JOLT_SAMPLE_GAP_MAX_MS = 500;
/** How far back (ms) the elevated-window walk may look. */
export const JOLT_WINDOW_LOOKBACK_MS = 1000;
/** Refractory period so one physical impact counts once (ms). */
export const JOLT_COOLDOWN_MS = 1000;
/** Soft gyro magnitude (rad/s) that boosts confidence; never a hard gate. */
export const JOLT_GYRO_SOFT_MIN = 0.3;

/** Severity band edges on peak deviation (g). */
export const JOLT_SEVERITY_MEDIUM_MIN = 0.4;
export const JOLT_SEVERITY_HIGH_MIN = 0.6;

/** Confidence heuristic knobs. */
export const JOLT_CONFIDENCE_BASE = 0.55;
export const JOLT_CONFIDENCE_JERK_BOOST_MIN = 2.0;
export const JOLT_CONFIDENCE_JERK_BOOST = 0.15;
export const JOLT_CONFIDENCE_GYRO_BOOST = 0.15;
export const JOLT_CONFIDENCE_SHORT_DURATION_MS = 350;
export const JOLT_CONFIDENCE_SHORT_DURATION_BOOST = 0.1;

/** Cap on stored per-jolt events per drive (the count stays authoritative). */
export const JOLT_EVENTS_CAP = 100;
