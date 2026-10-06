import type { ClientId, WindowLayout, WindowLayoutRequest } from "../contracts.js";

export type OverlayPosition = "TOP_LEFT" | "TOP_RIGHT";

export interface ScreenOverlayPreference {
  enabled: boolean;
  showScreenNumber: boolean;
  showLabel: boolean;
  position: OverlayPosition;
  opacity: number;
  labels: Record<ClientId, string>;
}

export interface WindowLayoutPreference extends WindowLayoutRequest {
  overlay: ScreenOverlayPreference;
}

const STORAGE_KEY = "virtual-clients.window-layout.v1";

export const DEFAULT_WINDOW_LAYOUT: WindowLayoutPreference = {
  layout: "GRID",
  displayIndex: 0,
  mainWindow: "Native",
  overlay: {
    enabled: true,
    showScreenNumber: true,
    showLabel: true,
    position: "TOP_LEFT",
    opacity: 0.88,
    labels: {
      Native: "This PC",
      "Virtual-01": "Virtual 1",
      "Virtual-02": "Virtual 2",
      "Virtual-03": "Virtual 3",
    },
  },
};

const clientIds: readonly ClientId[] = ["Native", "Virtual-01", "Virtual-02", "Virtual-03"];
const layouts: readonly WindowLayout[] = ["GRID", "FOCUS", "COLUMNS"];

function validPreference(value: unknown): value is WindowLayoutPreference {
  if (!value || typeof value !== "object") return false;
  const item = value as WindowLayoutPreference;
  return layouts.includes(item.layout) &&
    Number.isSafeInteger(item.displayIndex) && item.displayIndex >= 0 &&
    (item.mainWindow === null || clientIds.includes(item.mainWindow)) &&
    Boolean(item.overlay) &&
    typeof item.overlay.enabled === "boolean" &&
    typeof item.overlay.showScreenNumber === "boolean" &&
    typeof item.overlay.showLabel === "boolean" &&
    (item.overlay.position === "TOP_LEFT" || item.overlay.position === "TOP_RIGHT") &&
    Number.isFinite(item.overlay.opacity) && item.overlay.opacity >= 0.35 && item.overlay.opacity <= 1 &&
    clientIds.every((id) => typeof item.overlay.labels?.[id] === "string");
}

export function loadWindowLayoutPreference(): WindowLayoutPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_WINDOW_LAYOUT);
    const parsed: unknown = JSON.parse(raw);
    return validPreference(parsed) ? parsed : structuredClone(DEFAULT_WINDOW_LAYOUT);
  } catch {
    return structuredClone(DEFAULT_WINDOW_LAYOUT);
  }
}

export function saveWindowLayoutPreference(preference: WindowLayoutPreference): void {
  if (!validPreference(preference)) throw new Error("Window Layout preference is invalid.");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
}

export function resetWindowLayoutPreference(): WindowLayoutPreference {
  const preference = structuredClone(DEFAULT_WINDOW_LAYOUT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  return preference;
}
