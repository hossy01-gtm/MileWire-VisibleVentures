"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Entity, Polyline, PolylineCollection, TerrainProvider, Viewer } from "cesium";
import { useEffect, useRef, useState } from "react";
import { CESIUM_ION_TOKEN, MAPBOX_TOKEN, hasMapbox } from "@/lib/config";
import { Spinner } from "@/components/ui";
import {
  chasePitchRad,
  easeToward,
  FPV_EYE_HEIGHT_M,
  orbitPitchRad,
  shortestTurnDeg,
  tiltedPitchRad,
  type CameraCommand,
  type CameraCommandKind,
  type CameraMode,
} from "./camera";
import {
  chooseSurfaceHeight,
  groundClearanceDeficit,
  heightsDiffer,
  interpolateAt,
  isPlausibleSurfaceHeight,
  nearestTrailIndex,
  offsetLatLon,
  pickStreetFloor,
  sampleIndices,
  shouldTrustMeshSample,
  streetProbeOffsetsM,
} from "./surface";
import {
  EYE_CLEARANCE_M,
  MIN_TRACKED_RANGE_M,
  headingPitchRangeToOffset,
  liftOffsetUp,
  offsetForFollow,
  offsetToHeadingPitchRange,
  type Offset,
} from "./tracked-frame";

export type FocusPose = { lat: number; lon: number; headingDeg: number | null };
export type FocusJolt = { lat: number; lon: number; severity: "low" | "medium" | "high" };

type Props = {
  /** Where the vehicle is now. The view eases toward it between updates. */
  pose: FocusPose | null;
  /** Whole route as [lon, lat] pairs (faint). */
  trail?: [number, number][];
  /** How many leading `trail` vertices have been driven (drawn bright, up to the vehicle). */
  traveledCount?: number;
  jolts?: FocusJolt[];
  mode: CameraMode;
  /** Latest toolbar action (recage / tilt / north). Each press carries a new nonce. */
  command?: CameraCommand | null;
  /** Layer toggles. Both default to on. */
  showRoute?: boolean;
  showBumps?: boolean;
  /** Easing time constant in seconds. 0 = snap to every pose. */
  smoothingS?: number;
  /** Fires when the viewer can accept layer changes (true) or is gone / still starting (false). */
  onReadyChange?: (ready: boolean) => void;
  className?: string;
};

type CesiumModule = typeof import("cesium");
type Shown = { lat: number; lon: number; headingDeg: number };
/** What the ground under the route is made of: Google photorealistic tiles, world terrain, or a bare globe. */
type Surface = "photoreal" | "terrain" | "basic";

const BRONZE = "#cd7f32";
const SEVERITY = { low: "#e0a030", medium: "#e8742b", high: "#e5584f" } as const;

const STEP_TIMEOUT_MS = 20_000;
/**
 * Each tile-mesh height sample costs a scene render, and every route vertex is a five-point street-floor
 * probe, so a route is sampled at no more than this many vertices (terrain carries the detail between).
 */
const MAX_MESH_SAMPLES = 30;
/** Re-sample route heights at most this many times as tiles settle, and no more often than the gap below. */
const MAX_SURFACE_EPOCHS = 6;
const SURFACE_EPOCH_GAP_MS = 2500;
/** How often the surface under the vehicle (and under the camera) is read. */
const GROUND_SAMPLE_MS = 500;
/** The vehicle marker floats this far above the surface, like the route lines. */
const VEHICLE_LIFT_M = 0.15;
/** The look-at target sits this far above the street, roughly the vehicle's centre. */
const TARGET_LIFT_M = 1;
/** Route lines float this far above the surface so they are not swallowed by it. */
const LIFT_PHOTOREAL_M = 1.5;
const LIFT_TERRAIN_M = 0.8;
/** A sampled tile height is trusted only within this distance of the world-terrain height under it. */
const SURFACE_WINDOW_M = 60;

/** Bound a network step so a stalled request ends in a notice instead of a blank stage. */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), STEP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const describeError = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Street-level height of the 3D surface at a position, or undefined while its tiles haven't streamed in.
 *
 * `sampleHeight` returns the first surface a ray meets, which at a GPS pin on a building footprint is a
 * rooftop or tree canopy. A ring of probes around the pin usually still sees pavement, so the lowest
 * plausible reading is used (the same policy as the Pada business console).
 *
 * The sampling ray would hit our own route lines, and `objectsToExclude` does not skip a
 * PolylineCollection, so the lines are hidden for the duration of the call instead. Without
 * this the lines read their own height back, rise on every re-sample, and drag the camera up.
 */
function sampleStreetFloor(Cesium: CesiumModule, viewer: Viewer, lines: PolylineCollection | null, lon: number, lat: number): number | undefined {
  if (viewer.isDestroyed() || !viewer.scene.sampleHeightSupported) return undefined;
  const wasShown = lines?.show ?? true;
  if (lines) lines.show = false;
  try {
    const probes = streetProbeOffsetsM().map((o) => {
      const at = offsetLatLon(lat, lon, o.eastM, o.northM);
      try {
        const h = viewer.scene.sampleHeight(Cesium.Cartographic.fromDegrees(at.lon, at.lat));
        return isPlausibleSurfaceHeight(h) ? h : undefined;
      } catch {
        return undefined;
      }
    });
    return pickStreetFloor(probes);
  } finally {
    if (lines) lines.show = wasShown;
  }
}

/**
 * 3D view of one vehicle: orbit, chase and in-car cameras over a bronze route.
 *
 * With a Cesium ion token the surface is Google's photorealistic 3D tiles. If those are not
 * enabled for the token it falls back to world terrain plus 3D buildings, and without any
 * token to a bundled low-res globe (with Mapbox satellite imagery when a Mapbox token is set).
 */
export default function CesiumView({
  pose,
  trail,
  traveledCount = 0,
  jolts,
  mode,
  command = null,
  showRoute = true,
  showBumps = true,
  smoothingS = 0.6,
  onReadyChange,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const vehicleRef = useRef<Entity | null>(null);
  const collectionRef = useRef<PolylineCollection | null>(null);
  const linesRef = useRef<{ trail: Polyline; traveled: Polyline } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [surface, setSurface] = useState<Surface>("basic");
  /** Bumped (throttled) whenever the 3D tiles finish streaming, so route heights are re-sampled. */
  const [surfaceEpoch, setSurfaceEpoch] = useState(0);
  /** Surface height (m) per `trail` vertex, tagged with the trail it was sampled for. */
  const [sampled, setSampled] = useState<{ trail: [number, number][]; values: number[] } | null>(null);
  const heights = sampled && sampled.trail === trail ? sampled.values : null;

  // Latest inputs for the per-frame handler, which must not re-subscribe.
  const targetRef = useRef<FocusPose | null>(pose);
  const modeRef = useRef<CameraMode>(mode);
  const smoothRef = useRef(smoothingS);
  const commandRef = useRef<CameraCommand | null>(command);
  const handledNonceRef = useRef(0);
  const shownRef = useRef<Shown | null>(null);
  const photorealRef = useRef(false);
  const tiltedRef = useRef(false);
  const northUpRef = useRef(false);
  /** Last measured ground height under the vehicle and the eased value the camera uses. */
  const groundRef = useRef<{ eased: number | null; target: number | undefined; sampledAt: number }>({ eased: null, target: undefined, sampledAt: 0 });
  const knownHeightsRef = useRef(new Map<string, { h: number; epoch: number }>());
  /** World terrain: a reference ground that is always available, unlike the streaming tile mesh. */
  const terrainRef = useRef<TerrainProvider | null>(null);
  const terrainGroundRef = useRef<{ h: number | undefined; pending: boolean }>({ h: undefined, pending: false });
  const terrainKnownRef = useRef(new Map<string, number>());
  const tilesetRef = useRef<import("cesium").Cesium3DTileset | null>(null);
  /** Flips true once the first full set of tiles has streamed in; camera collision is unsafe before then. */
  const tilesSettledRef = useRef(false);
  /** The camera's local offset from the vehicle (look-at frame) as last applied, carried between frames. */
  const lastOffsetRef = useRef<Offset | null>(null);
  const framedRef = useRef(false);
  const eyeFloorRef = useRef<{ h: number | undefined; sampledAt: number }>({ h: undefined, sampledAt: 0 });
  const onReadyRef = useRef(onReadyChange);

  useEffect(() => {
    targetRef.current = pose;
    modeRef.current = mode;
    smoothRef.current = smoothingS;
    commandRef.current = command;
    onReadyRef.current = onReadyChange;
  });

  useEffect(() => {
    onReadyRef.current?.(status === "ready");
    return () => onReadyRef.current?.(false);
  }, [status]);

  // Mount the viewer once.
  useEffect(() => {
    let cancelled = false;
    let viewer: Viewer | null = null;
    let resize: ResizeObserver | null = null;
    let removePreRender: (() => void) | null = null;
    let removeTilesListener: (() => void) | null = null;
    let epochTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const container = containerRef.current;
      if (!container) return;
      try {
        (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
        const Cesium = await import("cesium");
        if (cancelled || !containerRef.current) return;
        cesiumRef.current = Cesium;
        if (CESIUM_ION_TOKEN) Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        viewer = new Cesium.Viewer(container, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          baseLayer: false,
          requestRenderMode: false,
        });
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#141110");
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0b0a09");
        viewer.scene.globe.depthTestAgainstTerrain = true;

        let kind: Surface = "basic";
        let failure: string | null = null;

        // 1) Photorealistic 3D tiles.
        if (CESIUM_ION_TOKEN) {
          try {
            const tileset = await withTimeout(
              // This view offers no place search or geocoding, so the Google geocoder attestation holds.
              Cesium.createGooglePhotorealistic3DTileset(
                { onlyUsingWithGoogleGeocoder: true },
                { maximumScreenSpaceError: 8, cacheBytes: 1536 * 1024 * 1024, maximumCacheOverflowBytes: 1024 * 1024 * 1024, enableCollision: true },
              ),
              "Photorealistic tiles",
            );
            if (cancelled || !viewer || viewer.isDestroyed()) {
              tileset.destroy();
              return;
            }
            viewer.scene.primitives.add(tileset);
            // The tiles are the surface; a globe underneath would poke through as a dark shell.
            viewer.scene.globe.show = false;
            viewer.scene.globe.baseColor = Cesium.Color.BLACK;
            viewer.scene.globe.depthTestAgainstTerrain = false;
            // Camera collision reads the tile mesh, and while only coarse tiles are loaded that reads
            // kilometres high and yanks the camera up. It stays off until the tiles first settle (below).
            viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
            tilesetRef.current = tileset;
            kind = "photoreal";

            // Reference ground for the sampler. Not drawn: the tiles are the surface.
            try {
              terrainRef.current = await withTimeout(Cesium.createWorldTerrainAsync(), "World terrain");
            } catch {
              terrainRef.current = null;
            }
            if (cancelled || !viewer || viewer.isDestroyed()) return; // the cleanup destroys the viewer and its tileset

            // Re-sample route heights once streaming settles (throttled: this event fires often).
            let epochs = 0;
            const onSettled = () => {
              // Camera collision switches on from the next frame (applyInputPolicy reads this flag).
              tilesSettledRef.current = true;
              if (epochTimer || epochs >= MAX_SURFACE_EPOCHS) return;
              epochTimer = setTimeout(() => {
                epochTimer = undefined;
                epochs += 1;
                if (!cancelled) setSurfaceEpoch((e) => e + 1);
              }, SURFACE_EPOCH_GAP_MS);
            };
            tileset.allTilesLoaded.addEventListener(onSettled);
            removeTilesListener = () => {
              try {
                tileset.allTilesLoaded.removeEventListener(onSettled);
              } catch {
                /* the tileset is already destroyed with the viewer */
              }
            };
          } catch (e) {
            failure = describeError(e);
          }
        }

        // 2) Fallback: imagery, then world terrain + 3D buildings.
        if (kind !== "photoreal") {
          try {
            if (hasMapbox) {
              viewer.imageryLayers.addImageryProvider(
                new Cesium.UrlTemplateImageryProvider({
                  url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
                  maximumLevel: 19,
                  credit: "© Mapbox © OpenStreetMap",
                }),
              );
            } else {
              viewer.imageryLayers.addImageryProvider(
                await Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")),
              );
            }
          } catch {
            failure = failure ?? "Imagery failed to load.";
          }
          if (CESIUM_ION_TOKEN) {
            try {
              viewer.terrainProvider = await withTimeout(Cesium.createWorldTerrainAsync(), "World terrain");
              kind = "terrain";
              const buildings = await Cesium.createOsmBuildingsAsync();
              if (cancelled || !viewer || viewer.isDestroyed()) buildings.destroy();
              else viewer.scene.primitives.add(buildings);
            } catch (e) {
              failure = failure ?? describeError(e);
            }
          }
        }
        if (cancelled || !viewer || viewer.isDestroyed()) return;

        photorealRef.current = kind === "photoreal";
        setSurface(kind);
        if (kind !== "photoreal") {
          if (!CESIUM_ION_TOKEN) setNotice("Set NEXT_PUBLIC_CESIUM_ION_TOKEN for photorealistic 3D.");
          else if (failure && /40[13]|forbidden|unauthori[sz]ed|access denied/i.test(failure)) {
            setNotice("Photorealistic 3D isn't enabled for this Cesium ion token. Enable Google Photorealistic 3D Tiles on it.");
          } else setNotice(`Photorealistic 3D unavailable${failure ? ` (${failure})` : ""}. Showing ${kind === "terrain" ? "terrain" : "a basic globe"}.`);
        }

        // The vehicle reads the eased pose every frame, so React never re-renders for motion. It sits at the
        // same street-floor height as the camera target and the route lines (not CLAMP_TO_GROUND, which
        // reads a different surface than the one we sample and drifts away from the lines under photoreal tiles).
        const vehicle = viewer.entities.add({
          id: "vehicle",
          position: new Cesium.CallbackPositionProperty(() => {
            const sh = shownRef.current;
            return sh ? Cesium.Cartesian3.fromDegrees(sh.lon, sh.lat, (groundRef.current.eased ?? 0) + VEHICLE_LIFT_M) : undefined;
          }, false),
          point: {
            pixelSize: 16,
            color: Cesium.Color.fromCssColorString(BRONZE),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        // Lines live in a PolylineCollection: unlike entity polylines it updates synchronously,
        // so a route that changes every few frames (replay) never stalls waiting on a worker.
        const collection = viewer.scene.primitives.add(new Cesium.PolylineCollection()) as PolylineCollection;
        const mk = (hex: string, alpha: number, width: number) =>
          collection.add({ show: false, width, positions: [], material: Cesium.Material.fromType("Color", { color: Cesium.Color.fromCssColorString(hex).withAlpha(alpha) }) });
        linesRef.current = { trail: mk(BRONZE, 0.4, 5), traveled: mk("#f0b070", 0.95, 7) };
        collectionRef.current = collection;
        vehicleRef.current = vehicle;
        viewerRef.current = viewer;

        const v = viewer;
        let last = performance.now();
        let lastMode: CameraMode | null = null;
        let lastFrameKind: "enu" | "body" | null = null;

        /** Camera input policy: orbit / chase rotate and zoom around the vehicle; in-car owns the view. */
        const applyInputPolicy = (m: CameraMode) => {
          const c = v.scene.screenSpaceCameraController;
          const lookAt = m !== "fpv";
          c.enableInputs = true;
          c.enableRotate = lookAt;
          c.enableTilt = lookAt;
          c.enableTranslate = false;
          c.enableZoom = lookAt;
          c.enableLook = false;
          c.minimumZoomDistance = MIN_TRACKED_RANGE_M;
          c.maximumZoomDistance = 25_000;
          c.inertiaZoom = 0;
          c.inertiaSpin = lookAt ? 0.9 : 0;
          c.inertiaTranslate = 0;
          // Collision needs a settled tile mesh (see the tileset listener); terrain / basic have none.
          c.enableCollisionDetection = photorealRef.current ? tilesSettledRef.current : true;
        };

        /** Street-floor height under a point, or undefined when the mesh can't be trusted yet (camera far, tiles streaming). */
        const meshFloorAt = (lon: number, lat: number, terrainH: number | undefined): number | undefined => {
          const camH = v.camera.positionCartographic?.height;
          const tiles = tilesetRef.current;
          const trusted = shouldTrustMeshSample(camH, tilesSettledRef.current || tiles?.tilesLoaded === true);
          const mesh = trusted ? sampleStreetFloor(Cesium, v, collection, lon, lat) : undefined;
          return chooseSurfaceHeight(mesh, terrainH, SURFACE_WINDOW_M);
        };

        /** Height of the surface under the vehicle, eased so rooftops and overpasses don't make the camera jump. */
        const groundAt = (lon: number, lat: number, now: number, dtS: number): number => {
          const g = groundRef.current;
          const photoreal = photorealRef.current;
          if (now - g.sampledAt > GROUND_SAMPLE_MS) {
            g.sampledAt = now;
            let h: number | undefined;
            try {
              if (photoreal) {
                // Keep a terrain reference following the vehicle (async; answered from cached terrain tiles).
                const tg = terrainGroundRef.current;
                const terrain = terrainRef.current;
                if (terrain && !tg.pending) {
                  tg.pending = true;
                  void Cesium.sampleTerrainMostDetailed(terrain, [Cesium.Cartographic.fromDegrees(lon, lat)])
                    .then((r) => {
                      tg.h = r[0]?.height;
                    })
                    .catch(() => undefined)
                    .finally(() => {
                      tg.pending = false;
                    });
                }
                h = meshFloorAt(lon, lat, tg.h);
              } else {
                h = v.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat));
              }
            } catch {
              h = undefined; // keep the last good height
            }
            if (typeof h === "number" && Number.isFinite(h)) g.target = h;
          }
          if (g.target !== undefined) g.eased = g.eased === null ? g.target : easeToward(g.eased, g.target, dtS, 0.35);
          return g.eased ?? 0;
        };

        /**
         * Follows the vehicle. Runs in preUpdate, i.e. before Cesium culls and selects tiles for the frame,
         * so the tiles streamed in are the ones for where the camera actually is (preRender runs after that
         * selection and left the view one frame behind the vehicle).
         */
        const onFollow = () => {
          const target = targetRef.current;
          if (!target) return;
          const now = performance.now();
          const dtS = Math.min(0.25, (now - last) / 1000);
          last = now;

          const prev = shownRef.current;
          const heading = target.headingDeg ?? prev?.headingDeg ?? 0;
          const tau = smoothRef.current;
          const shown: Shown = prev
            ? {
                lat: easeToward(prev.lat, target.lat, dtS, tau),
                lon: easeToward(prev.lon, target.lon, dtS, tau),
                headingDeg: (prev.headingDeg + easeToward(0, shortestTurnDeg(prev.headingDeg, heading), dtS, tau) + 360) % 360,
              }
            : { lat: target.lat, lon: target.lon, headingDeg: heading };
          shownRef.current = shown;

          const m = modeRef.current;
          const modeChanged = lastMode !== m;
          lastMode = m;
          if (modeChanged) {
            tiltedRef.current = false;
            northUpRef.current = false;
            framedRef.current = false;
            lastOffsetRef.current = null;
          }
          applyInputPolicy(m);

          // Toolbar action, consumed once per press.
          let action: CameraCommandKind | null = null;
          const pending = commandRef.current;
          if (pending && pending.nonce !== handledNonceRef.current) {
            handledNonceRef.current = pending.nonce;
            action = pending.kind;
          }

          const ground = groundAt(shown.lon, shown.lat, now, dtS);
          const headingRad = Cesium.Math.toRadians(shown.headingDeg);

          if (m === "fpv") {
            v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            framedRef.current = false;
            lastOffsetRef.current = null;
            lastFrameKind = null;
            v.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(shown.lon, shown.lat, ground + FPV_EYE_HEIGHT_M),
              orientation: { heading: headingRad, pitch: Cesium.Math.toRadians(-4), roll: 0 },
            });
            return;
          }

          // Orbit and chase: a look-at frame anchored on the vehicle, the camera's local offset re-applied each
          // frame. Orbit uses east-north-up; chase uses the vehicle's body frame (so it turns with the vehicle),
          // or east-north-up once North is pressed.
          const origin = Cesium.Cartesian3.fromDegrees(shown.lon, shown.lat, ground + TARGET_LIFT_M);
          const readLocal = (): Offset => ({ x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z });

          // A one-shot offset from the toolbar (tilt / north) is applied as-is this frame.
          let forced: Offset | null = null;
          if (action === "recage") {
            tiltedRef.current = false;
            northUpRef.current = false;
            framedRef.current = false;
            lastOffsetRef.current = null;
          } else if (action === "tilt" || (action === "north" && m === "orbit")) {
            // Re-aim the existing view: tilt toggles a steeper look-down, north faces the camera north (orbit).
            const hpr = framedRef.current ? offsetToHeadingPitchRange(readLocal()) : null;
            if (hpr) {
              if (action === "tilt") tiltedRef.current = !tiltedRef.current;
              const pitch = action === "tilt" ? (tiltedRef.current ? tiltedPitchRad(m) : m === "orbit" ? orbitPitchRad() : chasePitchRad()) : hpr.pitchRad;
              forced = headingPitchRangeToOffset(action === "north" ? 0 : hpr.headingRad, pitch, hpr.rangeM);
            } else {
              framedRef.current = false;
              lastOffsetRef.current = null;
            }
          } else if (action === "north" && m === "chase") {
            northUpRef.current = true; // switches to the east-north-up frame, handled just below
          }

          // A frame change (chase body <-> east-north-up) invalidates the local offset.
          const nowKind: "enu" | "body" = m === "orbit" || northUpRef.current ? "enu" : "body";
          const transform =
            nowKind === "enu"
              ? Cesium.Transforms.eastNorthUpToFixedFrame(origin)
              : Cesium.Transforms.headingPitchRollToFixedFrame(origin, new Cesium.HeadingPitchRoll(headingRad, 0, 0));
          if (lastFrameKind !== null && lastFrameKind !== nowKind) {
            framedRef.current = false;
            lastOffsetRef.current = null;
            forced = null;
          }
          lastFrameKind = nowKind;

          const framed = framedRef.current;
          const offset = forced ?? offsetForFollow({ framed, mode: m, current: framed ? readLocal() : null, previous: lastOffsetRef.current });
          v.camera.lookAtTransform(transform, new Cesium.Cartesian3(offset.x, offset.y, offset.z));
          lastOffsetRef.current = offset;
          framedRef.current = true;

          // Keep the eye above facades and trees. The surface under the eye is sampled on the ground cadence
          // and reused between samples; the lift is applied every frame against the current eye height.
          const eye = v.camera.positionCartographic;
          if (eye && photorealRef.current) {
            const ef = eyeFloorRef.current;
            if (now - ef.sampledAt > GROUND_SAMPLE_MS) {
              ef.sampledAt = now;
              const eyeLon = Cesium.Math.toDegrees(eye.longitude);
              const eyeLat = Cesium.Math.toDegrees(eye.latitude);
              const camH = eye.height;
              const trusted = shouldTrustMeshSample(camH, tilesSettledRef.current || tilesetRef.current?.tilesLoaded === true);
              ef.h = trusted ? chooseSurfaceHeight(sampleStreetFloor(Cesium, v, collection, eyeLon, eyeLat), terrainGroundRef.current.h, SURFACE_WINDOW_M) : undefined;
            }
            const lift = groundClearanceDeficit(eye.height, ef.h, EYE_CLEARANCE_M);
            if (lift > 0) {
              const raised = liftOffsetUp(readLocal(), lift);
              v.camera.lookAtTransform(transform, new Cesium.Cartesian3(raised.x, raised.y, raised.z));
              lastOffsetRef.current = raised;
            }
          }
        };
        v.scene.preUpdate.addEventListener(onFollow);
        removePreRender = () => v.scene.preUpdate.removeEventListener(onFollow);

        resize = new ResizeObserver(() => !v.isDestroyed() && v.resize());
        resize.observe(container);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setNotice(e instanceof Error ? e.message : "3D view failed to start.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (epochTimer) clearTimeout(epochTimer);
      removeTilesListener?.();
      removePreRender?.();
      resize?.disconnect();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      vehicleRef.current = null;
      collectionRef.current = null;
      linesRef.current = null;
      shownRef.current = null;
      photorealRef.current = false;
      groundRef.current = { eased: null, target: undefined, sampledAt: 0 };
      eyeFloorRef.current = { h: undefined, sampledAt: 0 };
      tilesetRef.current = null;
      tilesSettledRef.current = false;
      framedRef.current = false;
      lastOffsetRef.current = null;
      terrainRef.current = null;
      terrainGroundRef.current = { h: undefined, pending: false };
    };
  }, []);

  // World terrain: sample real heights under the route once, so lines sit on the ground.
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (status !== "ready" || surface !== "terrain" || !viewer || !Cesium || !trail || trail.length < 2) return;
    let cancelled = false;
    void Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, trail.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat)))
      .then((cartographics) => !cancelled && setSampled({ trail, values: cartographics.map((c) => c.height ?? 0) }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, surface, trail]);

  // Photorealistic tiles: height under every route vertex. World terrain gives a reference that is
  // always available; the streamed tile mesh refines it wherever it agrees (see chooseSurfaceHeight).
  // Mesh sampling runs in slices so a long drive never freezes the page.
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (status !== "ready" || surface !== "photoreal" || !viewer || !Cesium || !trail || trail.length < 2) return;
    let cancelled = false;
    const known = knownHeightsRef.current;
    const terrainKnown = terrainKnownRef.current;
    const provider = terrainRef.current;
    if (known.size > 20_000) known.clear();
    if (terrainKnown.size > 20_000) terrainKnown.clear();
    const keyOf = (lon: number, lat: number) => `${lon},${lat}`;

    void (async () => {
      // 1) Terrain reference for vertices not seen before.
      if (provider) {
        const missing = trail.filter(([lon, lat]) => !terrainKnown.has(keyOf(lon, lat)));
        if (missing.length > 0) {
          try {
            const sampledTerrain = await Cesium.sampleTerrainMostDetailed(provider, missing.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat)));
            sampledTerrain.forEach((c, i) => {
              if (typeof c.height === "number" && Number.isFinite(c.height)) terrainKnown.set(keyOf(missing[i][0], missing[i][1]), c.height);
            });
          } catch {
            /* terrain unavailable: fall back to the mesh sample alone */
          }
          if (cancelled) return;
        }
      }

      // 2) Refine with the tile mesh. Each mesh sample costs a scene render, so sample only a sparse,
      // evenly spaced subset and interpolate between them; terrain carries the detail in between.
      if (cancelled || viewer.isDestroyed()) return;
      const terrainAt = trail.map(([lon, lat]) => terrainKnown.get(keyOf(lon, lat)));
      const haveTerrain = terrainAt.every((h) => h !== undefined);
      const idx = sampleIndices(trail.length, MAX_MESH_SAMPLES);
      const idxKept: number[] = [];
      const valKept: number[] = [];
      for (const i of idx) {
        const [lon, lat] = trail[i];
        const key = keyOf(lon, lat);
        const prev = known.get(key);
        let sample = prev && prev.epoch === surfaceEpoch ? prev.h : undefined;
        if (sample === undefined) {
          sample = sampleStreetFloor(Cesium, viewer, collectionRef.current, lon, lat);
          if (sample !== undefined) known.set(key, { h: sample, epoch: surfaceEpoch });
        }
        const chosen = chooseSurfaceHeight(sample, terrainAt[i], SURFACE_WINDOW_M);
        if (chosen === undefined) continue;
        idxKept.push(i);
        // With terrain everywhere, keep the difference from terrain (smooth); otherwise the absolute height.
        valKept.push(haveTerrain ? chosen - (terrainAt[i] as number) : chosen);
      }
      if (cancelled) return;

      let values: number[] | null;
      if (haveTerrain) {
        const offsets = interpolateAt(trail.length, idxKept, valKept);
        values = terrainAt.map((h, i) => (h as number) + offsets[i]);
      } else {
        values = idxKept.length > 0 ? interpolateAt(trail.length, idxKept, valKept) : null;
      }
      if (values) setSampled((cur) => (cur && cur.trail === trail && !heightsDiffer(cur.values, values) ? cur : { trail, values }));
    })();

    return () => {
      cancelled = true;
    };
  }, [status, surface, trail, surfaceEpoch]);

  // Route lines (faint whole route + bright driven part).
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    const lines = linesRef.current;
    if (status !== "ready" || !viewer || !Cesium || !lines || viewer.isDestroyed()) return;

    const lift = surface === "photoreal" ? LIFT_PHOTOREAL_M : LIFT_TERRAIN_M;
    const at = (lon: number, lat: number, i: number) => Cesium.Cartesian3.fromDegrees(lon, lat, (heights?.[i] ?? 0) + lift);
    const all = (trail ?? []).map(([lon, lat], i) => at(lon, lat, i));
    lines.trail.positions = all;
    lines.trail.show = showRoute && all.length > 1;

    const driven = all.slice(0, Math.max(0, Math.min(traveledCount, all.length)));
    if (pose && driven.length > 0) driven.push(at(pose.lon, pose.lat, Math.max(0, driven.length - 1)));
    lines.traveled.positions = driven;
    lines.traveled.show = showRoute && driven.length > 1;
  }, [status, surface, trail, traveledCount, pose, heights, showRoute]);

  // Bump markers. They sit on the same surface heights as the route lines (nearest route vertex), not on a
  // separate clamp, so they stay on the line under photoreal tiles.
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (status !== "ready" || !viewer || !Cesium || viewer.isDestroyed()) return;

    const lift = surface === "photoreal" ? LIFT_PHOTOREAL_M : LIFT_TERRAIN_M;
    for (const e of [...viewer.entities.values]) if (e.id.startsWith("jolt-")) viewer.entities.remove(e);
    if (!showBumps) return;
    (jolts ?? []).forEach((j, i) => {
      const near = heights && trail ? nearestTrailIndex(trail, j.lon, j.lat) : -1;
      const h = near >= 0 ? heights?.[near] : undefined;
      viewer.entities.add({
        id: `jolt-${i}`,
        position: Cesium.Cartesian3.fromDegrees(j.lon, j.lat, h !== undefined ? h + lift : 0),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString(SEVERITY[j.severity]),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          // Until route heights are known, fall back to clamping.
          ...(h === undefined ? { heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } : {}),
        },
      });
    });
  }, [status, surface, jolts, showBumps, heights, trail]);

  return (
    <div className={`relative overflow-hidden bg-background ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Spinner label="Starting 3D view" />
        </div>
      ) : null}
      {!pose && status === "ready" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted">Waiting for a position…</div>
      ) : null}
      {notice ? (
        <div role="status" className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs text-muted">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
