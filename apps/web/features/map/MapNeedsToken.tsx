export function MapNeedsToken() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 bg-surface-2 p-6 text-center">
      <h3 className="text-sm font-semibold text-foreground">Map unavailable</h3>
      <p className="max-w-sm text-sm text-muted">
        Set <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to draw the map. Everything else keeps working.
      </p>
    </div>
  );
}
