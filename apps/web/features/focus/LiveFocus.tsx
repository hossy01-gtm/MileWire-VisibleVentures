"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFleets } from "@/components/layout/FleetProvider";
import { Spinner } from "@/components/ui";
import { repo } from "@/lib/data";
import { formatAgo, formatSpeed } from "@/lib/format";
import { useAsyncData } from "@/lib/use-async-data";
import { useUnit } from "@/lib/use-unit";
import { CameraModeSwitch } from "./CameraModeSwitch";
import { DEFAULT_CAMERA_MODE, nextCameraCommand, type CameraCommand, type CameraMode } from "./camera";
import { CameraOrientationBar, Dossier, DossierSection, FocusHeader, FocusLayout, LayerToggles, Readouts, StageHint } from "./FocusChrome";

const CesiumView = dynamic(() => import("./CesiumView"), { ssr: false, loading: () => <div className="h-full w-full bg-background" /> });

const POLL_MS = 4000;

/** Live 3D view of one driver. */
export function LiveFocus() {
  const { userId } = useParams<{ userId: string }>();
  const { active } = useFleets();
  const [unit] = useUnit();
  const [mode, setMode] = useState<CameraMode>(DEFAULT_CAMERA_MODE);
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const [showTrail, setShowTrail] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);

  const { data: live, loading } = useAsyncData(() => (active ? repo.listLive(active.id) : Promise.resolve([])), [active?.id], POLL_MS);
  const driver = live?.find((d) => d.userId === userId) ?? null;

  // Breadcrumb of where the driver has been since this page opened.
  const trailRef = useRef<[number, number][]>([]);
  const [trail, setTrail] = useState<[number, number][]>([]);
  useEffect(() => {
    if (!driver) return;
    const last = trailRef.current[trailRef.current.length - 1];
    if (last && last[0] === driver.lon && last[1] === driver.lat) return;
    trailRef.current = [...trailRef.current, [driver.lon, driver.lat] as [number, number]].slice(-600);
    setTrail(trailRef.current);
  }, [driver]);

  const pose = useMemo(() => (driver ? { lat: driver.lat, lon: driver.lon, headingDeg: driver.heading } : null), [driver]);
  const name = driver?.displayName ?? "Driver";

  return (
    <FocusLayout
      header={
        <FocusHeader backHref="/map" backLabel="Back to Map" eyebrow="Driver focus" title={name}>
          <LayerToggles disabled={!viewerReady} layers={[{ id: "trail", label: "Trail", on: showTrail, onChange: setShowTrail }]} />
          <CameraModeSwitch mode={mode} onChange={setMode} />
          <CameraOrientationBar mode={mode} onCommand={(kind) => setCommand((prev) => nextCameraCommand(prev, kind))} />
        </FocusHeader>
      }
      stage={
        <>
          <CesiumView
            className="h-full w-full"
            pose={pose}
            trail={trail}
            traveledCount={trail.length}
            mode={mode}
            command={command}
            showRoute={showTrail}
            smoothingS={1.2}
            onReadyChange={setViewerReady}
          />
          {pose ? <StageHint mode={mode} /> : null}
        </>
      }
      dossier={
        <Dossier
          label="Driver dossier"
          eyebrow="Focus dossier"
          title={name}
          intro="Live position and a breadcrumb since this page opened. No replay scrubber."
        >
          {loading && !live ? (
            <Spinner label="Finding driver" />
          ) : driver ? (
            <>
              <DossierSection label="Driver id">
                <p className="mono break-all text-xs">{driver.userId}</p>
              </DossierSection>
              <DossierSection label="Live state">
                <Readouts
                  rows={[
                    ["Speed", formatSpeed(driver.speedMps, unit)],
                    ["Heading", driver.heading == null ? "—" : `${Math.round(driver.heading)}°`],
                    ["Updated", formatAgo(driver.updatedAt)],
                  ]}
                />
              </DossierSection>
              <DossierSection label="Transport">
                <p className="text-xs leading-relaxed text-muted">Live — refreshed every {POLL_MS / 1000} s</p>
              </DossierSection>
            </>
          ) : (
            <DossierSection label="Live state">
              <p className="text-xs leading-relaxed text-muted">
                This driver isn&apos;t tracking right now. The view comes alive when they start Track mode on their phone.
              </p>
            </DossierSection>
          )}
        </Dossier>
      }
    />
  );
}
