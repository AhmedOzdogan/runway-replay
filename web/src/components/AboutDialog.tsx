import { type ReactNode, useEffect, useRef } from "react";
import { TbBrandGithub, TbBrandLinkedin, TbMail, TbX } from "react-icons/tb";
import { REPO_URL, SITE_OWNER } from "../data/site";

/** Sections you can open the panel at, e.g. "legal" from the footer link. */
export type AboutSection = "about" | "legal";

interface AboutDialogProps {
  /** Which section to show, or null when the panel is closed. */
  openAt: AboutSection | null;
  onClose: () => void;
}

const LINK_CLASSES = "text-neon underline-offset-4 hover:underline";

function Heading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      // scroll-mt leaves room for the sticky title bar when jumping to a section.
      className="mt-6 mb-2 scroll-mt-16 text-sm font-semibold tracking-wide text-fg"
    >
      {children}
    </h3>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK_CLASSES}>
      {children}
    </a>
  );
}

/** A key on the keyboard, e.g. <Key>Space</Key>. */
function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-night px-1.5 py-px text-[11px] text-fg">
      {children}
    </kbd>
  );
}

/**
 * "About & help": what SkyReplay is, how to use it, what's real and what's simulated, privacy,
 * the disclaimer, credits and contact. Uses the browser's native <dialog>, which handles focus,
 * the Esc key and screen readers by itself.
 */
export function AboutDialog({ openAt, onClose }: AboutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openAt && !dialog.open) dialog.showModal();
    if (!openAt && dialog.open) dialog.close();
    if (openAt === "about") dialog.scrollTop = 0;
    else if (openAt) {
      dialog
        .querySelector(`#about-${openAt}`)
        ?.scrollIntoView({ block: "start" });
    }
  }, [openAt]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only closes on the backdrop; keyboard users close with Esc (native to <dialog>) or the Close button.
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dark backdrop (the dialog element itself) closes it.
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="about-title"
      className="m-auto max-h-[85vh] w-[min(640px,calc(100vw-24px))] rounded-2xl border border-line bg-panel p-0 text-sm text-fg shadow-card backdrop:bg-night/70 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-3">
        <h2 id="about-title" className="text-base font-semibold">
          About & help
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg"
        >
          <TbX size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pb-6 leading-relaxed text-fg/90">
        <Heading id="about-about">What is SkyReplay?</Heading>
        <p>
          SkyReplay replays a whole day of real air traffic at an airport as a
          timelapse: every arrival, departure, taxiing plane and even the
          airport's ground vehicles, drawn as neon trails on a dark map. It's a
          hobby project, made for fun and for learning.
        </p>

        <Heading>How to use it</Heading>
        <ul className="list-disc space-y-1 pl-5">
          <li>Pick an airport at the top: Munich, Istanbul or Hanoi.</li>
          <li>
            Play or pause with the big button or <Key>Space</Key>. Change the
            speed with the buttons or keys <Key>1</Key>–<Key>5</Key> (1x–16x),
            jump a minute back or forward, or drag the timeline.
          </li>
          <li>
            Click a plane for its card: callsign, airline, aircraft, altitude,
            speed and what it's doing right now. Tick <em>Follow this plane</em>{" "}
            to keep the camera on it.
          </li>
          <li>
            The card's <strong>📻 Radio</strong> shows the conversation between
            the captain and air traffic control. The replay slows to 1x while
            they talk.
          </li>
          <li>
            Want to hear it? Switch on the <strong>Voice</strong> in the radio
            panel (it downloads a ~90 MB voice model once, see Privacy below).
          </li>
          <li>
            Watch out for amber planes and the <strong>GO AROUND!</strong>{" "}
            banner: an aborted landing really happened there.
          </li>
        </ul>

        <Heading>What's real and what's simulated</Heading>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Real:</strong> positions, altitudes, callsigns, aircraft and
            times come from the community-run{" "}
            <ExternalLink href="https://adsb.lol">adsb.lol</ExternalLink>{" "}
            receiver network.
          </li>
          <li>
            <strong>Estimated:</strong> when receivers lose a plane just above
            the runway, the end of the landing (or the start of a take-off) is
            estimated; the flight card says so. Parked positions are where a
            plane stopped sending data.
          </li>
          <li>
            <strong>Simulated:</strong> the radio conversations. They use the
            flight's real callsign, runway, altitude and heading, but the
            wording is invented. They are not recordings.
          </li>
        </ul>

        <Heading id="about-legal">Privacy</Heading>
        <p>
          No cookies, no tracking, no analytics, no ads, no accounts. SkyReplay
          doesn't collect any personal data. The only thing kept in your browser
          is the radio voice model, and only if you switch the voice on (so it
          isn't downloaded again next time; clearing your browser's site data
          removes it).
        </p>
        <p className="mt-2">Your browser only talks to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>GitHub Pages</strong> (GitHub, Inc., USA), which hosts the
            site. Like any web server, it sees your IP address.
          </li>
          <li>
            <strong>CARTO</strong>, which serves the map tiles.
          </li>
          <li>
            <strong>Hugging Face</strong> (huggingface.co), only if you switch
            on the radio voice: it downloads the voice model once. The speech is
            then generated on your own device.
          </li>
        </ul>

        <Heading>Disclaimer</Heading>
        <p>
          SkyReplay is a non-commercial hobby project. It is not affiliated with
          any airline, airport, air navigation service provider, aircraft
          manufacturer or adsb.lol. The data may be incomplete or wrong, and
          parts of the replay are estimated or simulated (see above). Don't use
          it for navigation, safety or any real-world decision. It's provided as
          is, without any warranty.
        </p>

        <Heading>Credits & licenses</Heading>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Flight data:{" "}
            <ExternalLink href="https://adsb.lol">adsb.lol</ExternalLink>, under
            the{" "}
            <ExternalLink href="https://opendatacommons.org/licenses/odbl/1-0/">
              Open Database License (ODbL)
            </ExternalLink>
            .
          </li>
          <li>
            Map: ©{" "}
            <ExternalLink href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </ExternalLink>{" "}
            contributors, © CARTO.
          </li>
          <li>
            Radio voice:{" "}
            <ExternalLink href="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX">
              Kokoro-82M
            </ExternalLink>{" "}
            (Apache-2.0).
          </li>
          <li>
            Code:{" "}
            <ExternalLink href={REPO_URL}>SkyReplay on GitHub</ExternalLink>,
            MIT license. Contributions are welcome.
          </li>
        </ul>

        <Heading>Contact</Heading>
        <p>SkyReplay is made by {SITE_OWNER.name}.</p>
        <ul className="mt-2 space-y-1.5">
          <li>
            <a
              href={`mailto:${SITE_OWNER.email}`}
              className={`inline-flex items-center gap-1.5 ${LINK_CLASSES}`}
            >
              <TbMail size={16} aria-hidden="true" />
              {SITE_OWNER.email}
            </a>
          </li>
          <li>
            <ExternalLink href={SITE_OWNER.github}>
              <span className="inline-flex items-center gap-1.5">
                <TbBrandGithub size={16} aria-hidden="true" />
                GitHub
              </span>
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={SITE_OWNER.linkedin}>
              <span className="inline-flex items-center gap-1.5">
                <TbBrandLinkedin size={16} aria-hidden="true" />
                LinkedIn
              </span>
            </ExternalLink>
          </li>
        </ul>
      </div>
    </dialog>
  );
}
