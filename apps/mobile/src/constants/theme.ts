/**
 * MileWire mobile theme. Dark mode only: the app never follows the system
 * appearance (`userInterfaceStyle: "dark"` in app.json) and the map is always the
 * dark basemap.
 *
 * Bronze is the primary colour. `primary` is the darker 600 step so white text
 * on filled buttons clears WCAG AA (≈4.7:1); `accent` is the lighter 400 step
 * for text, icons and map lines on dark surfaces; `brand` is the true bronze
 * for dots and the logo.
 */
import { Platform } from 'react-native';

export const Bronze = {
  50: '#FBF6EE',
  100: '#F6E9D8',
  200: '#EBCFA6',
  300: '#E3B27A',
  400: '#D99A52',
  500: '#CD7F32',
  600: '#A8641F',
  700: '#864E18',
  900: '#3D2409',
} as const;

export const Colors = {
  primary: Bronze[600],
  primaryPressed: Bronze[700],
  onPrimary: '#FFFFFF',
  brand: Bronze[500],
  accent: Bronze[400],
  primarySoft: '#3A2813',

  background: '#121010',
  surface: '#1A1613',
  surfaceSelected: '#271F19',
  border: '#2F2720',

  text: '#F5EFE8',
  textSecondary: '#ADA398',
  textTertiary: '#7D7368',

  success: '#4CAF7A',
  warning: '#E0A03A',
  danger: '#F2766E',
  /** Filled danger button (white text on it clears AA). */
  dangerSolid: '#B3261E',
  dangerPressed: '#8F1D17',
  dangerSoft: 'rgba(242,118,110,0.18)',

  /** Floating map chrome (the fallback where iOS glass is unavailable). */
  glass: 'rgba(30,25,21,0.94)',
  glassBorder: 'rgba(255,255,255,0.10)',
  /** The selected-segment lens and pressed state on glass. */
  glassLens: 'rgba(255,255,255,0.16)',
  /** Neutral icon colour on glass. */
  glyph: 'rgba(245,239,232,0.85)',
  separator: 'rgba(255,255,255,0.18)',
  sheet: 'rgba(22,18,15,0.97)',
  sheetHandle: 'rgba(255,255,255,0.28)',
  /** Round buttons on a sheet. */
  control: '#2A221B',
  controlBorder: 'rgba(255,255,255,0.14)',
  /** Banner behind a warning cue. */
  warningSoft: 'rgba(224,160,58,0.18)',
  /** Casing around lines and dots drawn on the map. */
  mapCasing: '#121010',
  shadow: '#000000',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
