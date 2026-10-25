/** Ticks every 30°, longer at the cardinals, like the card of a flight-deck compass. */
const TICKS = Array.from({ length: 12 }, (_, index) => index * 30);

interface CompassProps {
  /** The map's bearing: 0 is north up, 90 means east is up. */
  bearing: number;
  onResetNorth: () => void;
}

/**
 * A compass rose that turns with the map, with a fixed lubber line at the top for the direction
 * you are facing. Tapping it faces north again — two fingers rotate the map on a phone, which is
 * easy to do by accident.
 */
export function Compass({ bearing, onResetNorth }: CompassProps) {
  const degrees = Math.round((bearing + 360) % 360);
  const isNorthUp = degrees === 0;
  return (
    <button
      type="button"
      onClick={onResetNorth}
      aria-label={
        isNorthUp ? "North is up" : `Map turned ${degrees}°. Face north.`
      }
      title={isNorthUp ? "North is up" : "Face north"}
      // z-10: the deck.gl canvas sits in MapLibre's control corner at z-index 2.
      className="absolute top-14 left-3 z-10 flex size-16 cursor-pointer items-center justify-center rounded-full border border-line bg-panel/85 shadow-card backdrop-blur-sm transition-colors hover:border-neon sm:top-4 sm:left-14"
    >
      <svg viewBox="0 0 48 48" className="size-15" aria-hidden="true">
        <title>Compass</title>
        {/* Fixed: the ring and the lubber line, which always marks the top of the screen. */}
        <circle
          cx="24"
          cy="24"
          r="19"
          className="fill-none stroke-line"
          strokeWidth="1"
        />
        <path d="M24 2.5 L26.4 6.5 L21.6 6.5 Z" className="fill-muted" />

        {/* Turning with the map: the card, its ticks and the needle. */}
        <g
          style={{
            transform: `rotate(${-bearing}deg)`,
            transformOrigin: "24px 24px",
          }}
        >
          {TICKS.map((angle) => {
            const isCardinal = angle % 90 === 0;
            return (
              <line
                key={angle}
                x1="24"
                y1="6"
                x2="24"
                y2={isCardinal ? 11 : 9}
                className={isCardinal ? "stroke-muted" : "stroke-line"}
                strokeWidth={isCardinal ? 1.4 : 1}
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "24px 24px",
                }}
              />
            );
          })}
          {/* The needle, centred on the hub: neon to north, grey to south. No letters — at this
              size they crowd the card, and the lubber line already marks the top. */}
          <path d="M24 13 L27.5 25 L24 22.5 L20.5 25 Z" className="fill-neon" />
          <path
            d="M24 35 L20.5 23 L24 25.5 L27.5 23 Z"
            className="fill-muted/60"
          />
          <circle
            cx="24"
            cy="24"
            r="1.8"
            className="fill-panel stroke-line"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    </button>
  );
}
