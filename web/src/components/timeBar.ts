import { h } from "../utils/dom";
import { PILL } from "./styles";

const DAY = 86400;
const SPEEDS = [1, 2, 4, 8, 16];

/**
 * Play/pause, UTC clock, time-of-day slider and speed buttons.
 * Keyboard: Space plays/pauses, 1–5 pick a speed.
 * Calls `onTimeChange` with seconds since 00:00 UTC (same as sec_offset in the data).
 */
export function createTimeBar(onTimeChange: (time: number) => void): {
  element: HTMLElement;
} {
  const playButton = h(
    "button",
    {
      type: "button",
      class:
        "size-9 shrink-0 cursor-pointer rounded-full border border-neon text-neon",
      "aria-label": "Play",
      title: "Play/pause (Space)",
    },
    "▶",
  );
  const clock = h("output", { class: "text-lg text-fg" }, "00:00:00");
  const slider = h("input", {
    type: "range",
    class: "min-w-40 flex-1 cursor-pointer accent-neon",
    min: 0,
    max: DAY - 1,
    step: 1,
    value: 0,
    "aria-label": "Time of day",
  });
  const speedGroup = h(
    "fieldset",
    { class: "flex gap-1.5", "aria-label": "Playback speed" },
    ...SPEEDS.map((s, i) =>
      h(
        "button",
        {
          type: "button",
          "data-speed": s,
          class: PILL,
          "aria-pressed": String(s === 1),
          title: `${s}x speed (key ${i + 1})`,
        },
        `${s}x`,
      ),
    ),
  );
  const element = h(
    "div",
    { class: "flex flex-1 flex-wrap items-center gap-4" },
    playButton,
    h("span", { class: "text-muted tabular-nums" }, clock, " UTC"),
    slider,
    speedGroup,
  );

  let time = 0;
  let speed = 1;
  let playing = true;
  let lastFrame = performance.now();

  function render(): void {
    slider.value = String(Math.floor(time));
    clock.value = new Date(time * 1000).toISOString().slice(11, 19);
    playButton.textContent = playing ? "❚❚" : "▶";
    playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    onTimeChange(time);
  }

  function togglePlay(): void {
    if (!playing && time >= DAY - 1) time = 0;
    playing = !playing;
    render();
  }

  function setSpeed(next: number): void {
    speed = next;
    for (const b of speedGroup.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === next));
    }
  }

  playButton.addEventListener("click", togglePlay);

  slider.addEventListener("input", () => {
    time = Number(slider.value);
    render();
  });

  speedGroup.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest("button");
    if (!button) return;
    setSpeed(Number(button.dataset.speed));
  });

  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      target.closest(
        "textarea, select, [contenteditable], input:not([type=range])",
      )
    ) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault(); // no page scroll
      if (!e.repeat) togglePlay();
    } else if (/^[1-9]$/.test(e.key) && SPEEDS[Number(e.key) - 1]) {
      setSpeed(SPEEDS[Number(e.key) - 1]);
    }
  });
  // A focused button would also "click" on Space keyup; we already handled it on keydown.
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" && (e.target as HTMLElement).closest("button"))
      e.preventDefault();
  });

  function frame(now: number): void {
    if (playing) {
      time = Math.min(time + ((now - lastFrame) / 1000) * speed, DAY - 1);
      if (time === DAY - 1) playing = false;
      render();
    }
    lastFrame = now;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  render();

  return { element };
}
