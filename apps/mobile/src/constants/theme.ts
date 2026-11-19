/**
 * MileWire mobile theme. Light mode only — the app never follows the system
 * dark setting (`userInterfaceStyle: "light"` in app.json).
 *
 * Bronze is the primary colour. `primary` is the darker 600 step so white text
 * on buttons clears WCAG AA (≈4.7:1); `brand` is the true bronze for accents,
 * map lines and the logo.
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
  primarySoft: Bronze[100],

  background: '#FFFFFF',
  surface: '#FAF7F2',
  surfaceSelected: '#F1EAE0',
  border: '#E8E0D5',

  text: '#1C1612',
  textSecondary: '#6B6259',
  textTertiary: '#9A9086',

  success: '#2E7D4F',
  warning: '#B26A00',
  danger: '#B3261E',
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
