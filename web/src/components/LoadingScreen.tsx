interface LoadingScreenProps {
  airportName: string;
}

/**
 * Covers the map until the first tiles and the day's flights are in. Without it the app opens on a
 * black rectangle for a few seconds on a phone, which reads as broken.
 *
 * The mark is the app icon (public/icon.svg) with its replay arrow turning around the plane; the
 * two paths are inlined so the arrow can spin on its own.
 */
export function LoadingScreen({ airportName }: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      // z-30: above the deck.gl canvas (2), the flight card and time bar (10) and the header menu (20).
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-night px-6 text-center"
    >
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        className="size-24 sm:size-28 md:size-32"
      >
        <title>Loading</title>
        {/* The replay loop turns; 2.4s is a wait, not a hurry. */}
        <g
          style={{ transformOrigin: "256px 256px" }}
          className="animate-spin text-neon drop-shadow-[0_0_10px_#22d3ee66] [animation-duration:2.4s] motion-reduce:animate-none"
        >
          <path
            d="M100 166 A180 180 0 1 1 87 318"
            fill="none"
            stroke="currentColor"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path d="M75 290 L110 306 L62 326 Z" fill="currentColor" />
        </g>
        {/* The same plane the map draws (map/layers.ts), scaled from its 64×64 box. */}
        <g transform="translate(256 252) scale(3.2) translate(-32 -32)">
          <path
            className="fill-white"
            d="M32 2c-2.2 0-4 2.2-4 5v17L6 38v6l22-7v14l-6 5v4l10-3 10 3v-4l-6-5V37l22 7v-6L36 24V7c0-2.8-1.8-5-4-5z"
          />
        </g>
      </svg>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold tracking-wide text-neon text-shadow-neon sm:text-lg">
          Loading {airportName}
        </p>
        <p className="max-w-xs text-[13px] text-muted sm:text-sm">
          Fetching the day's flights and drawing the map.
        </p>
      </div>
    </div>
  );
}
