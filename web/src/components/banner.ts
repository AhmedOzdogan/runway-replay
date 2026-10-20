import { h } from "../utils/dom";

const SHOW_MS = 6000;
const POP = "motion-safe:animate-pop";

/** A big, clickable announcement at the top of the map that hides itself after a few seconds. */
export function createBanner(): {
  element: HTMLButtonElement;
  show: (text: string, onClick: () => void) => void;
} {
  const element = h("button", {
    type: "button",
    class:
      "fixed top-[72px] left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border-2 border-amber bg-[#1a1408ee] px-5.5 py-2.5 text-lg font-extrabold tracking-widest text-amber shadow-amber",
    hidden: true,
    "aria-live": "assertive",
  });

  let onClick = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  element.addEventListener("click", () => {
    onClick();
    element.hidden = true;
  });

  function show(text: string, handler: () => void): void {
    onClick = handler;
    element.textContent = text;
    element.hidden = false;
    // Restart the pop-in animation even if a banner is already showing.
    element.classList.remove(POP);
    void element.offsetWidth;
    element.classList.add(POP);
    clearTimeout(timer);
    timer = setTimeout(() => {
      element.hidden = true;
    }, SHOW_MS);
  }

  return { element, show };
}
