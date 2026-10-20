import type { Airport } from "../airports";

/** Row of airport buttons; calls `onSelect` with the airport code when one is clicked. */
export function createAirportPicker(
  airports: Record<string, Airport>,
  onSelect: (code: string) => void,
): { element: HTMLElement; select: (code: string) => void } {
  const element = document.createElement("nav");
  element.className = "airport-picker";
  element.setAttribute("aria-label", "Airport");

  for (const [code, { name }] of Object.entries(airports)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.title = code;
    button.dataset.code = code;
    element.append(button);
  }

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
