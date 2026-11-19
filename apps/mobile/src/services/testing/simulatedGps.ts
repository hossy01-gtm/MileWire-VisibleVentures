import type { Fix } from '../tracking/types';
import {
  initialPlayback,
  positionAt,
  stepPlayback,
  type PlaybackOptions,
  type PlaybackState,
  type Route,
} from './routePlayback';
import type { SimStatus } from './types';

/** Reported horizontal accuracy of simulated fixes (metres): clean, but not magic. */
export const SIM_ACCURACY_M = 5;

export type SimulatedGpsOptions = PlaybackOptions & {
  intervalMs: number;
  /** Injectable for tests. */
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type SimSnapshot = {
  status: SimStatus;
  /** 0..1 along the loaded route. */
  progress: number;
  distanceM: number;
  totalM: number;
};

type FixListener = (fix: Fix) => void;
type SnapshotListener = (snapshot: SimSnapshot) => void;

/**
 * A fake GPS chip. It walks a route at a steady speed and hands the same fixes
 * to every subscriber, the way real hardware does.
 *
 * Playback only advances while something is listening: the route is not
 * consumed before the map (or Track mode) is there to see it, and the hand-off
 * between the idle watcher and the Track watcher continues the same drive.
 * At the end of the route it holds position and keeps reporting speed 0.
 */
export class SimulatedGps {
  private route: Route | null = null;
  private state: PlaybackState = initialPlayback();
  private status: SimStatus = 'idle';
  private readonly listeners = new Set<FixListener>();
  private readonly snapshotListeners = new Set<SnapshotListener>();
  private readonly observers = new Set<FixListener>();
  private timer: unknown = null;
  private opts: SimulatedGpsOptions;

  constructor(opts: SimulatedGpsOptions) {
    this.opts = opts;
  }

  /** Load a route, rewound, in the given status (`playing` starts it as soon as someone listens). */
  load(route: Route, status: SimStatus = 'paused'): void {
    this.route = route;
    this.state = initialPlayback();
    this.status = status;
    this.reschedule();
    this.notify();
    this.emitToObservers();
  }

  configure(opts: Partial<SimulatedGpsOptions>): void {
    this.opts = { ...this.opts, ...opts };
    this.reschedule();
  }

  getSnapshot(): SimSnapshot {
    const totalM = this.route?.totalM ?? 0;
    return {
      status: this.status,
      progress: totalM > 0 ? this.state.distanceM / totalM : 0,
      distanceM: this.state.distanceM,
      totalM,
    };
  }

  /** The fix for the current playhead, or null before a route is loaded. */
  currentFix(): Fix | null {
    if (!this.route) return null;
    const pos = positionAt(this.route, this.state.distanceM);
    return {
      lat: pos.lat,
      lon: pos.lon,
      accuracy: SIM_ACCURACY_M,
      speed: this.state.speedMps,
      heading: pos.heading,
      timestamp: (this.opts.now ?? Date.now)(),
    };
  }

  play(): void {
    if (!this.route) return;
    // Playing a finished drive starts it over: Play after the end is "again".
    if (this.status === 'ended') this.state = initialPlayback();
    this.status = 'playing';
    this.reschedule();
    this.notify();
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.reschedule();
    this.notify();
  }

  toggle(): void {
    if (this.status === 'playing') this.pause();
    else this.play();
  }

  /** Back to the start, stopped. */
  rewind(): void {
    if (!this.route) return;
    this.state = initialPlayback();
    this.status = 'paused';
    this.reschedule();
    this.notify();
    this.emitToObservers();
  }

  /**
   * Watch the position without being a GPS consumer: observers get every fix
   * (and a fix whenever the route is loaded or rewound) but do not keep the
   * clock running. The map uses this to show where the simulated phone is.
   */
  observe(listener: FixListener): () => void {
    this.observers.add(listener);
    return () => void this.observers.delete(listener);
  }

  subscribe(listener: FixListener): () => void {
    this.listeners.add(listener);
    this.reschedule();
    return () => {
      this.listeners.delete(listener);
      this.reschedule();
    };
  }

  onSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => void this.snapshotListeners.delete(listener);
  }

  private shouldTick(): boolean {
    return this.route != null && this.listeners.size > 0 && (this.status === 'playing' || this.status === 'ended');
  }

  private reschedule(): void {
    const clear = this.opts.clearTimer ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
    const set = this.opts.setTimer ?? ((fn, ms) => setInterval(fn, ms));
    if (this.timer != null) {
      clear(this.timer);
      this.timer = null;
    }
    if (this.shouldTick()) this.timer = set(() => this.tick(), this.opts.intervalMs);
  }

  /** One GPS epoch: advance the drive, then tell every listener. */
  tick(): void {
    if (!this.route) return;
    if (this.status === 'playing') {
      this.state = stepPlayback(this.route, this.state, this.opts.intervalMs / 1000, this.opts);
      if (this.state.done) this.status = 'ended';
    }
    const fix = this.currentFix();
    if (fix) for (const listener of [...this.listeners]) listener(fix);
    this.notify();
    this.emitToObservers(fix);
  }

  private emitToObservers(fix = this.currentFix()): void {
    if (fix) for (const observer of [...this.observers]) observer(fix);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of [...this.snapshotListeners]) listener(snapshot);
  }
}
