"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/config";

type GL = typeof import("mapbox-gl");

/** Dark basemap — the web console is dark-only. */
export const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

/**
 * Create a Mapbox GL map inside the returned container ref.
 * mapbox-gl touches `window`, so it is imported lazily on the client.
 */
export function useMapbox(initial: { center: [number, number]; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ gl: GL; map: MapboxMap } | null>(null);
  const initialRef = useRef(initial);

  useEffect(() => {
    if (!hasMapbox) return;
    let cancelled = false;
    let map: MapboxMap | undefined;
    void (async () => {
      const gl = await import("mapbox-gl");
      if (cancelled || !containerRef.current) return;
      gl.default.accessToken = MAPBOX_TOKEN;
      map = new gl.default.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: initialRef.current.center,
        zoom: initialRef.current.zoom,
        attributionControl: true,
      });
      map.addControl(new gl.default.NavigationControl({ showCompass: false }), "top-right");
      map.once("load", () => {
        if (!cancelled && map) setState({ gl, map });
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      setState(null);
    };
  }, []);

  return { containerRef, gl: state?.gl.default ?? null, map: state?.map ?? null };
}
