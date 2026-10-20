import type { Airport } from "../types/airport";
import { h } from "../utils/dom";
import { PILL } from "./styles";

/** Row of airport buttons; calls `onSelect` with the airport code when one is clicked. */
export function createAirportPicker(
  airports: Record<string, Airport>,
  onSelect: (code: string) => void,
): { element: HTMLElement; select: (code: string) => void } {
  const element = h(
    "nav",
    { class: "flex gap-1.5", "aria-label": "Airport" },
    ...Object.entries(airports).map(([code, { name }]) =>
      h(
        "button",
        { type: "button", class: PILL, title: code, "data-code": code },
        name,
      ),
    ),
  );

  function select(code: string): void {
    for (const b of element.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b.dataset.code === code));
    }
    onSelect(code);
  }

  element.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest("button");
    if (button?.dataset.code) select(button.dataset.code);
  });

  return { element, select };
}
