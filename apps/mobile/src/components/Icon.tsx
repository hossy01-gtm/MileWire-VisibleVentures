import { SymbolView, type SymbolViewProps } from 'expo-symbols';

type Props = {
  /** SF Symbol name on iOS, Material symbol name elsewhere. */
  ios: NonNullable<Extract<SymbolViewProps['name'], { ios?: unknown }>['ios']>;
  android: NonNullable<Extract<SymbolViewProps['name'], { android?: unknown }>['android']>;
  size?: number;
  color: string;
};

/** One glyph, platform-correct. Decorative: the parent button carries the label. */
export function Icon({ ios, android, size = 22, color }: Props) {
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} weight="semibold" />;
}
