import { StyleSheet, View } from 'react-native';

import { useTrackStore } from '@/services/tracking/trackingSession';

import { useJourneyStore } from './journeyStore';
import { BrowseKit } from './kits/BrowseKit';
import { LiveKit } from './kits/LiveKit';
import { resolveScene } from './sheetNav';
import { SheetHost } from './sheets/SheetHost';
import { useJourneyController } from './useJourneyController';

/**
 * Everything that floats above the map, composed by scene:
 *
 * - browse: the idle kit (tool rail, speed, Track pill)
 * - live:   the in-drive kit (status card, side rail, gauge, stats dock)
 * - review: no kit; the finished drive is drawn on the map under its sheet
 *
 * The sheet slot sits above whichever kit is showing, except in-drive, where
 * nothing may cover the drive. Every layer here is `box-none` so touches that
 * miss a control reach the map underneath.
 */
export function Journey() {
  const controller = useJourneyController();
  const phase = useTrackStore((s) => s.phase);
  const sheet = useJourneyStore((s) => s.sheet);
  const scene = resolveScene(phase, sheet);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {scene === 'browse' ? <BrowseKit controller={controller} /> : null}
      {scene === 'live' ? <LiveKit onStop={controller.confirmStop} /> : null}
      {scene !== 'live' ? <SheetHost /> : null}
    </View>
  );
}
