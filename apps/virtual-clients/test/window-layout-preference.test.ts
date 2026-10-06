import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW_LAYOUT,
  loadWindowLayoutPreference,
  defaultWindowLayoutPreference,
  resetWindowLayoutPreference,
  saveWindowLayoutPreference,
} from "../src/app/windowLayoutPreference.js";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });

describe("Window Layout preference", () => {
  beforeEach(() => localStorage.clear());

  it("starts with simple safe defaults", () => {
    const value = loadWindowLayoutPreference();
    expect(value.layout).toBe("GRID");
    expect(value.mainWindow).toBe("Native");
    expect(value.overlay.enabled).toBe(true);
    expect(value.overlay.showScreenNumber).toBe(true);
    expect(value.overlay.showLabel).toBe(true);
    expect(value.overlay.labels.Native).toBe("This PC");
  });

  it("persists one preference and resets without aliases", () => {
    const value = loadWindowLayoutPreference();
    value.layout = "FOCUS";
    value.mainWindow = "Virtual-02";
    value.overlay.labels["Virtual-02"] = "Roommaster";
    saveWindowLayoutPreference(value);
    expect(loadWindowLayoutPreference()).toEqual(value);
    expect(defaultWindowLayoutPreference()).toEqual(DEFAULT_WINDOW_LAYOUT);
    expect(resetWindowLayoutPreference()).toEqual(DEFAULT_WINDOW_LAYOUT);
  });

  it("falls back when stored data is invalid", () => {
    localStorage.setItem("virtual-clients.window-layout.v1", JSON.stringify({ layout: "CUSTOM" }));
    expect(loadWindowLayoutPreference()).toEqual(DEFAULT_WINDOW_LAYOUT);
  });
});
