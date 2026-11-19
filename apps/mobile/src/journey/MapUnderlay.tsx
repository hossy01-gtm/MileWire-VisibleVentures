import Mapbox, {
  Camera,
  CameraGestureObserver,
  CircleLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
  UserTrackingMode,
} from '@rnmapbox/maps';
import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { MAPBOX_TOKEN, hasMapbox } from '@/lib/config';
import { useRecentsStore } from '@/services/recents/recentsStore';
import { useSimulatedLocation } from '@/services/testing/useSimulatedLocation';
import { useTrackStore } from '@/services/tracking/trackingSession';

import { useJourneyStore } from './journeyStore';
import { resolveMapPadding } from './mapPadding';
import { endpoints, pathBounds, pathToLine, pointFeature } from './mapShapes';
import { sheetGeometry } from './sheetGeometry';
import { peekFraction, resolveScene } from './sheetNav';

if (hasMapbox) Mapbox.setAccessToken(MAPBOX_TOKEN);

/** Dark basemap: the app never renders a light map. */
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
/** Before the first GPS fix: a continental view rather than open ocean. */
const DEFAULT_CENTER: [number, number] = [-98.5, 39.8];
const CAMERA_MS = 600;

/**
 * The one map in the app. It is mounted once, under every screen, and never
 * remounts: browse, the in-drive layer and drive review all drive this same
 * camera, and every control and sheet floats above it.
 */
export function MapUnderlay() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const phase = useTrackStore((s) => s.phase);
  const livePath = useTrackStore((s) => s.drive?.path);
  const sheet = useJourneyStore((s) => s.sheet);
  const following = useJourneyStore((s) => s.following);
  const setFollowing = useJourneyStore((s) => s.setFollowing);
  const sim = useSimulatedLocation();
  const reviewPath = useRecentsStore((s) => (sheet?.kind === 'drive' ? s.drives.find((d) => d.id === sheet.id)?.path : undefined));

  const scene = resolveScene(phase, sheet);
  const sheetPeekH = sheet
    ? sheetGeometry({ viewportH: height, safeTop: insets.top, peekFraction: peekFraction(sheet) }).peekH
    : null;
  const padding = resolveMapPadding({
    scene,
    sheetPeekH: scene === 'live' ? null : sheetPeekH,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  });

  const shownPath = scene === 'live' ? livePath : scene === 'review' ? reviewPath : undefined;
  // With GPS simulation on, the OS location is the Simulator's fake spot, so the
  // map draws its own puck and moves its own camera from the simulated fix.
  const simPoint = useMemo(
    () => (sim.fix ? pointFeature(sim.fix.lon, sim.fix.lat) : null),
    [sim.fix],
  );
  const line = useMemo(() => (shownPath && shownPath.length > 1 ? pathToLine(shownPath) : null), [shownPath]);
  const ends = useMemo(() => (scene === 'review' && reviewPath ? endpoints(reviewPath) : null), [scene, reviewPath]);
  const bounds = useMemo(() => (scene === 'review' && reviewPath ? pathBounds(reviewPath) : null), [scene, reviewPath]);

  if (!hasMapbox) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fallback]}>
        <Text style={styles.fallbackTitle}>Map unavailable</Text>
        <Text style={styles.fallbackBody}>Set EXPO_PUBLIC_MAPBOX_TOKEN to show the map. Tracking still works.</Text>
      </View>
    );
  }

  const live = scene === 'live';
  const fit = scene === 'review' && bounds != null;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={DARK_STYLE}
      scaleBarEnabled={false}
      compassEnabled={false}
      pitchEnabled={false}
      // The attribution button is hidden; the Mapbox logo stays, parked above the bottom chrome.
      attributionEnabled={false}
      logoPosition={{ left: 12, bottom: insets.bottom + 140 }}>
      <Camera
        defaultSettings={{ centerCoordinate: DEFAULT_CENTER, zoomLevel: 3 }}
        followUserLocation={sim.mode === 'off' && !fit && following}
        centerCoordinate={sim.fix && !fit && following ? [sim.fix.lon, sim.fix.lat] : undefined}
        zoomLevel={sim.fix && !fit && following ? (live ? 16.5 : 15.5) : undefined}
        heading={sim.fix && !fit && following ? (live ? (sim.fix.heading ?? 0) : 0) : undefined}
        pitch={sim.fix && !fit && following ? (live ? 45 : 0) : undefined}
        followUserMode={live ? UserTrackingMode.FollowWithCourse : UserTrackingMode.Follow}
        followZoomLevel={live ? 16.5 : 15.5}
        followPitch={live ? 45 : 0}
        followPadding={padding}
        bounds={fit ? bounds : undefined}
        padding={padding}
        animationDuration={CAMERA_MS}
      />
      <CameraGestureObserver
        onCameraChanged={(e) => {
          if (e.nativeEvent.properties.isUserInteraction) setFollowing(false);
        }}
      />
      {scene !== 'review' && sim.mode === 'off' ? (
        <LocationPuck puckBearingEnabled puckBearing="course" pulsing={{ isEnabled: true, color: Colors.brand }} />
      ) : null}
      {scene !== 'review' && simPoint ? (
        <ShapeSource id="sim-location" shape={simPoint}>
          <CircleLayer
            id="sim-location-halo"
            style={{ circleRadius: 16, circleColor: Colors.brand, circleOpacity: 0.28, circlePitchAlignment: 'map' }}
          />
          <CircleLayer
            id="sim-location-dot"
            style={{
              circleRadius: 7,
              circleColor: Colors.brand,
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
              circlePitchAlignment: 'map',
            }}
          />
        </ShapeSource>
      ) : null}
      {line ? (
        <ShapeSource id="route" shape={line}>
          <LineLayer id="route-casing" style={{ lineColor: Colors.mapCasing, lineWidth: 8, lineCap: 'round', lineJoin: 'round' }} />
          <LineLayer id="route-line" style={{ lineColor: Colors.accent, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
        </ShapeSource>
      ) : null}
      {ends ? (
        <ShapeSource id="route-ends" shape={ends}>
          <CircleLayer
            id="route-ends-circle"
            style={{
              circleRadius: 7,
              circleColor: ['match', ['get', 'kind'], 'start', Colors.success, Colors.danger],
              circleStrokeColor: Colors.mapCasing,
              circleStrokeWidth: 3,
            }}
          />
        </ShapeSource>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, padding: 24, gap: 6 },
  fallbackTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  fallbackBody: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
