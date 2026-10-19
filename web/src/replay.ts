import type { ReplayFile } from "./types";

// TODO: deck.gl TripsLayer playback (play/pause, slider, 1x–200x speed, neon trails).
// Timestamps are sec_offset (float32-safe), see docs/data-format.md.
export function startReplay(_data: ReplayFile): void {
  throw new Error("not implemented");
}
