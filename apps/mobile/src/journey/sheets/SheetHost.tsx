import { useRecentsStore } from '@/services/recents/recentsStore';

import { useJourneyStore } from '../journeyStore';
import { parentSheet, peekFraction } from '../sheetNav';
import { DriveSheet } from './DriveSheet';
import { FleetSheet } from './FleetSheet';
import { RecentsSheet } from './RecentsSheet';
import { SettingsSheet } from './SettingsSheet';
import { ToolSheet } from './ToolSheet';

const TITLES = { recents: 'Recents', settings: 'Settings', fleet: 'Fleet' } as const;

/**
 * The overlay slot: mounts the one sheet shell for whichever sheet is open.
 * Switching sheets swaps the content inside the same shell, so the sheet does
 * not re-open and the map camera does not move.
 */
export function SheetHost() {
  const sheet = useJourneyStore((s) => s.sheet);
  const closeSheet = useJourneyStore((s) => s.closeSheet);
  const backSheet = useJourneyStore((s) => s.backSheet);
  const startedAt = useRecentsStore((s) => (sheet?.kind === 'drive' ? s.drives.find((d) => d.id === sheet.id)?.startedAt : undefined));

  if (!sheet) return null;

  const title =
    sheet.kind === 'drive'
      ? startedAt != null
        ? new Date(startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        : 'Drive'
      : TITLES[sheet.kind];

  return (
    <ToolSheet
      title={title}
      peekFraction={peekFraction(sheet)}
      onBack={parentSheet(sheet) ? backSheet : undefined}
      onClose={closeSheet}>
      {sheet.kind === 'recents' ? <RecentsSheet /> : null}
      {sheet.kind === 'settings' ? <SettingsSheet /> : null}
      {sheet.kind === 'fleet' ? <FleetSheet /> : null}
      {sheet.kind === 'drive' ? <DriveSheet id={sheet.id} /> : null}
    </ToolSheet>
  );
}
