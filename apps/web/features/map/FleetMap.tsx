"use client";

import type { GeoJSONSource, Marker } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { hasMapbox } from "@/lib/config";
import { boundsOf, pathToLonLat } from "@/lib/geo";
import type { JoltMark, LiveDriver, PathPoint } from "@/lib/types";
import { MapNeedsToken } from "./MapNeedsToken";
import { useMapbox } from "./useMapbox";

export type MapRoute = { path: PathPoint[]; jolts: JoltMark[] };
type Pose = { lat: number; lon: number; headingDeg: number | null };

type Props = {
  drivers?: LiveDriver[];
  selectedId?: string | null;
  onSelectDriver?: (userId: string) => void;
  route?: MapRoute | null;
  /** Replay marker. */
  pose?: Pose | null;
  /** Fit the camera to the route when it changes. */
  fitRoute?: boolean;
  /** Fit the camera to the drivers once, the first time they appear. */
  fitDriversOnce?: boolean;
  className?: string;
};

const SEVERITY_COLOR = { low: "#e0a030", medium: "#e8742b", high: "#e5584f" } as const;
const BRONZE = "#cd7f32";

function driverElement(name: string, selected: boolean, heading: number | null) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${name} — live position`);
  el.style.cssText = "position:relative;width:34px;height:34px;border:0;background:transparent;cursor:pointer;padding:0";
  el.innerHTML = `
    <span data-pulse style="position:absolute;inset:0;border-radius:50%;background:${BRONZE};opacity:.25;animation:mwpulse 2s ease-out infinite"></span>
    <span data-dot style="position:absolute;inset:7px;border-radius:50%;background:${BRONZE};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6)"></span>
    <span data-arrow style="position:absolute;left:50%;top:-4px;width:0;height:0;margin-left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #fff;transform-origin:5px 21px;transform:rotate(${heading ?? 0}deg);display:${heading == null ? "none" : "block"}"></span>
    <span data-label style="position:absolute;top:36px;left:50%;transform:translateX(-50%);white-space:nowrap;font:600 12px system-ui;color:#f3ede6;background:rgba(20,17,16,.9);border:1px solid #2d2621;border-radius:999px;padding:2px 8px">${name.replace(/[<>&"]/g, "")}</span>`;
  el.style.zIndex = selected ? "2" : "1";
  (el.querySelector("[data-dot]") as HTMLElement).style.outline = selected ? "2px solid #f3ede6" : "none";
  return el;
}

function poseElement() {
  const el = document.createElement("div");
  el.style.cssText = `width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid ${BRONZE};box-shadow:0 0 0 4px rgba(205,127,50,.3)`;
  return el;
}

export function FleetMap({ drivers, selectedId, onSelectDriver, route, pose, fitRoute = true, fitDriversOnce = true, className }: Props) {
  const { containerRef, gl, map } = useMapbox({ center: [-79.38, 43.65], zoom: 11 });
  const markers = useRef(new Map<string, Marker>());
  const poseMarker = useRef<Marker | null>(null);
  const fittedDrivers = useRef(false);
  const onSelectRef = useRef(onSelectDriver);

  useEffect(() => {
    onSelectRef.current = onSelectDriver;
  });

  // Live driver markers.
  useEffect(() => {
    if (!gl || !map) return;
    const live = new Map((drivers ?? []).map((d) => [d.userId, d]));
    for (const [id, marker] of markers.current) {
      if (!live.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    for (const d of live.values()) {
      const selected = d.userId === selectedId;
      const existing = markers.current.get(d.userId);
      if (existing) existing.remove();
      const el = driverElement(d.displayName, selected, d.heading);
      el.addEventListener("click", () => onSelectRef.current?.(d.userId));
      markers.current.set(d.userId, new gl.Marker({ element: el }).setLngLat([d.lon, d.lat]).addTo(map));
    }
    if (fitDriversOnce && !fittedDrivers.current && live.size > 0) {
      fittedDrivers.current = true;
      const b = boundsOf([...live.values()].map((d) => ({ lat: d.lat, lon: d.lon })));
      if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 90, maxZoom: 14, duration: 0 });
    }
  }, [gl, map, drivers, selectedId, fitDriversOnce]);

  // Fly to the selected driver.
  useEffect(() => {
    if (!map || !selectedId) return;
    const d = drivers?.find((x) => x.userId === selectedId);
    if (d) map.easeTo({ center: [d.lon, d.lat], duration: 600 });
    // Only when the selection changes — not on every position poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId]);

  // Route line + bump markers.
  useEffect(() => {
    if (!map) return;
    const line = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route ? pathToLonLat(route.path) : [] } };
    const bumps = {
      type: "FeatureCollection" as const,
      features: (route?.jolts ?? [])
        .filter((j) => j.lat != null && j.lon != null)
        .map((j) => ({ type: "Feature" as const, properties: { color: SEVERITY_COLOR[j.severity] }, geometry: { type: "Point" as const, coordinates: [j.lon!, j.lat!] } })),
    };
    const routeSource = map.getSource("route") as GeoJSONSource | undefined;
    if (routeSource) {
      routeSource.setData(line);
      (map.getSource("bumps") as GeoJSONSource).setData(bumps);
    } else {
      map.addSource("route", { type: "geojson", data: line });
      map.addSource("bumps", { type: "geojson", data: bumps });
      map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0b0a09", "line-width": 9, "line-opacity": 0.85 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": BRONZE, "line-width": 5 } });
      map.addLayer({ id: "bumps", type: "circle", source: "bumps", paint: { "circle-radius": 6, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    }
    if (fitRoute && route && route.path.length > 1) {
      const b = boundsOf(route.path.map((p) => ({ lat: p[0], lon: p[1] })));
      if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 70, duration: 0 });
    }
  }, [map, route, fitRoute]);

  // Replay marker.
  useEffect(() => {
    if (!gl || !map) return;
    if (!pose) {
      poseMarker.current?.remove();
      poseMarker.current = null;
      return;
    }
    if (!poseMarker.current) poseMarker.current = new gl.Marker({ element: poseElement() }).setLngLat([pose.lon, pose.lat]).addTo(map);
    else poseMarker.current.setLngLat([pose.lon, pose.lat]);
  }, [gl, map, pose]);

  if (!hasMapbox) return <div className={className}><MapNeedsToken /></div>;
  return (
    <div className={className}>
      <style>{`@keyframes mwpulse{0%{transform:scale(.6);opacity:.45}100%{transform:scale(1.6);opacity:0}}`}</style>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
