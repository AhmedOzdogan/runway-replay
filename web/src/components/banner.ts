const SHOW_MS = 6000;

/** A big, clickable announcement at the top of the map that hides itself after a few seconds. */
export function createBanner(): {
  element: HTMLButtonElement;
  show: (text: string, onClick: () => void) => void;
} {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "banner";
  element.hidden = true;
  element.setAttribute("aria-live", "assertive");

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
    element.classList.remove("pop");
    void element.offsetWidth;
    element.classList.add("pop");
    clearTimeout(timer);
    timer = setTimeout(() => {
      element.hidden = true;
    }, SHOW_MS);
  }

  return { element, show };
}
