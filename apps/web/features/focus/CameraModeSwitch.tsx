"use client";

import { CAMERA_LABELS, CAMERA_MODES, type CameraMode } from "./camera";
import { ToolButton, ToolGroup } from "./FocusChrome";

export function CameraModeSwitch({ mode, onChange }: { mode: CameraMode; onChange: (m: CameraMode) => void }) {
  return (
    <ToolGroup role="radiogroup" aria-label="Camera mode">
      {CAMERA_MODES.map((m) => (
        <ToolButton key={m} role="radio" aria-checked={mode === m} tone={mode === m ? "active" : "ghost"} onClick={() => onChange(m)}>
          {CAMERA_LABELS[m]}
        </ToolButton>
      ))}
    </ToolGroup>
  );
}
