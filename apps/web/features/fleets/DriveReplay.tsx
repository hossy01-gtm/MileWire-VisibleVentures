"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeftIcon, CubeIcon, MapIcon } from "@/components/icons";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui";
import { repo } from "@/lib/data";
import { bumpsPerUnit, formatDateTime, formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { pathToLonLat, poseAt } from "@/lib/geo";
import { hasMotion, summarizeMotion } from "@/lib/motion";
import { useAsyncData } from "@/lib/use-async-data";
import { useUnit } from "@/lib/use-unit";
import { CameraModeSwitch } from "../focus/CameraModeSwitch";
import { DEFAULT_CAMERA_MODE, nextCameraCommand, type CameraCommand, type CameraMode } from "../focus/camera";
import {
  CameraOrientationBar,
  Dossier,
  DossierSection,
  FocusHeader,
  FocusLayout,
  LayerToggles,
  Readouts,
  ReplayTransport,
  StageHint,
  ToolButton,
  ToolGroup,
} from "../focus/FocusChrome";
import { useReplayClock } from "../focus/useReplayClock";
import { FleetMap } from "../map/FleetMap";
import { MotionChart, SpeedChart } from "./charts";

const CesiumView = dynamic(() => import("../focus/CesiumView"), { ssr: false, loading: () => <div className="h-full w-full bg-background" /> });

/** Replay of one recorded drive: a scrubbable 3D (or map) stage with the drive's readouts alongside. */
export function DriveReplay() {
  const { fleetId, driveId } = useParams<{ fleetId: string; driveId: string }>();
  const router = useRouter();
  const [unit] = useUnit();
  const [view, setView] = useState<"map" | "3d">("3d");
  const [cameraMode, setCameraMode] = useState<CameraMode>(DEFAULT_CAMERA_MODE);
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [showBumps, setShowBumps] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);

  const { data: drive, loading, error } = useAsyncData(() => repo.getDrive(driveId), [driveId]);
  const { data: members } = useAsyncData(() => repo.listMembers(fleetId), [fleetId]);

  const path = useMemo(() => drive?.path ?? [], [drive]);
  const t0 = path[0]?.[2] ?? 0;
  const durationMs = path.length > 1 ? path[path.length - 1][2] - t0 : 0;
  const clock = useReplayClock(durationMs);
  const pose = useMemo(() => poseAt(path, t0 + clock.t), [path, t0, clock.t]);

  const lonLat = useMemo(() => pathToLonLat(path), [path]);
  const route = useMemo(() => (drive ? { path: drive.path, jolts: drive.jolts } : null), [drive]);
  const joltPoints = useMemo(
    () => (drive?.jolts ?? []).filter((j) => j.lat != null && j.lon != null).map((j) => ({ lat: j.lat!, lon: j.lon!, severity: j.severity })),
    [drive],
  );

  const backHref = `/fleets/${fleetId}`;
  const name = members?.find((m) => m.userId === drive?.userId)?.displayName ?? "Driver";
  const back = (
    <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
      <ChevronLeftIcon /> Back to fleet
    </Link>
  );

  if (loading && !drive) return <div className="p-8"><Spinner label="Loading drive" /></div>;
  if (error) return <div className="p-6">{back}<ErrorNote message={error} /></div>;
  if (!drive) return <div className="p-6">{back}<EmptyState title="Drive not found" body="It may have been deleted, or you may not have access to it." /></div>;

  const perUnit = bumpsPerUnit(drive.joltCount, drive.distanceM, unit);
  const motionOk = hasMotion(drive.motion);
  const motionStats = summarizeMotion(drive.motion);

  return (
    <FocusLayout
      header={
        <FocusHeader backHref={backHref} backLabel="Back to fleet" eyebrow="Drive replay" title={`${name} · ${formatDateTime(drive.startedAt)}`}>
          <ToolGroup role="tablist" aria-label="Replay view">
            {([["3d", "3D", CubeIcon], ["map", "Map", MapIcon]] as const).map(([key, label, Icon]) => (
              <ToolButton key={key} role="tab" aria-selected={view === key} tone={view === key ? "active" : "ghost"} onClick={() => setView(key)}>
                <Icon width={13} height={13} /> {label}
              </ToolButton>
            ))}
          </ToolGroup>
          {view === "3d" ? (
            <>
              <LayerToggles
                disabled={!viewerReady}
                layers={[
                  { id: "route", label: "Route", on: showRoute, onChange: setShowRoute },
                  { id: "bumps", label: "Bumps", on: showBumps, onChange: setShowBumps },
                ]}
              />
              <CameraModeSwitch mode={cameraMode} onChange={setCameraMode} />
              <CameraOrientationBar mode={cameraMode} onCommand={(kind) => setCommand((prev) => nextCameraCommand(prev, kind))} />
            </>
          ) : null}
        </FocusHeader>
      }
      transport={
        <ReplayTransport
          t={clock.t}
          durationMs={durationMs}
          playing={clock.playing}
          speed={clock.speed}
          onPlayPause={clock.toggle}
          onScrub={clock.seek}
          onSpeedChange={clock.setSpeed}
          onExit={() => router.push(backHref)}
        />
      }
      stage={
        view === "map" ? (
          <FleetMap className="h-full w-full" route={route} pose={pose} fitRoute />
        ) : (
          <>
            <CesiumView
              className="h-full w-full"
              pose={pose}
              trail={lonLat}
              traveledCount={pose ? pose.index + 1 : 0}
              jolts={joltPoints}
              mode={cameraMode}
              command={command}
              showRoute={showRoute}
              showBumps={showBumps}
              smoothingS={0.25}
              onReadyChange={setViewerReady}
            />
            <StageHint mode={cameraMode} />
          </>
        )
      }
      dossier={
        <Dossier
          label="Drive dossier"
          eyebrow="Drive dossier"
          title={name}
          intro="Recorded GPS and motion-sensor samples. The readouts follow the scrubber."
        >
          <DossierSection label="Drive">
            <Readouts
              rows={[
                ["Started", formatDateTime(drive.startedAt)],
                ["Drive time", formatDuration(drive.durationMs)],
                ["Distance", formatDistance(drive.distanceM, unit)],
                ["GPS", `${drive.gpsSamples} fixes · ${drive.gpsPoorSamples} weak · ${drive.gpsGaps} gap${drive.gpsGaps === 1 ? "" : "s"}`],
              ]}
            />
          </DossierSection>

          <DossierSection label="Speed">
            <Readouts
              rows={[
                ["At scrub", formatSpeed(pose?.speedMps, unit)],
                ["Avg", formatSpeed(drive.avgSpeedMps, unit)],
                ["Max", formatSpeed(drive.maxSpeedMps, unit)],
                ["Bumps", drive.joltCount],
                [`Bumps / ${unit}`, perUnit == null ? "—" : perUnit.toFixed(1)],
              ]}
            />
            <div className="mt-2">
              <SpeedChart path={drive.path} jolts={drive.jolts} cursorMs={clock.t} unit={unit} />
            </div>
          </DossierSection>

          <DossierSection label="Motion (IMU)">
            {motionOk ? (
              <>
                <MotionChart motion={drive.motion} cursorAt={t0 + clock.t} />
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Peak {motionStats.peakAccelG.toFixed(2)} g · rotation {motionStats.peakGyroRadS.toFixed(1)} rad/s · {motionStats.bumpBuckets} bump-level reading{motionStats.bumpBuckets === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-muted">No motion data was recorded for this drive.</p>
            )}
          </DossierSection>
        </Dossier>
      }
    />
  );
}
