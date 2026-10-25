import { useEffect, useRef, useState } from "react";
import { TbChevronDown, TbDeviceGamepad2, TbTargetArrow } from "react-icons/tb";

interface ArcadeMenuProps {
  onPlayGuessDestination: () => void;
  className?: string;
}

/** The arcade games, behind one button in the header. More games go in this list. */
export function ArcadeMenu({
  onPlayGuessDestination,
  className = "",
}: ArcadeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // A click anywhere else closes it; Escape does too.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-muted transition-colors hover:border-neon hover:text-neon aria-expanded:border-neon aria-expanded:text-neon"
      >
        <TbDeviceGamepad2 size={16} aria-hidden="true" />
        Arcade
        <TbChevronDown
          size={14}
          aria-hidden="true"
          className={
            isOpen ? "rotate-180 transition-transform" : "transition-transform"
          }
        />
      </button>

      {isOpen && (
        // z-30: over the deck.gl canvas, the flight card and the header's own menu.
        <div
          role="menu"
          className="absolute top-full left-0 z-30 mt-2 w-60 sm:right-0 sm:left-auto overflow-hidden rounded-2xl border border-line bg-panel shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onPlayGuessDestination();
            }}
            className="flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left hover:bg-white/5"
          >
            <TbTargetArrow
              size={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-neon"
            />
            <span>
              <span className="block font-semibold text-fg">
                Guess the destination
              </span>
              <span className="block text-[11px] text-muted">
                Ten seconds a flight · once a day
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
