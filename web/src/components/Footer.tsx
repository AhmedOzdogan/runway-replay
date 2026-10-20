import { TbBrandGithub } from "react-icons/tb";

const REPO_URL = "https://github.com/AhmedOzdogan/skyreplay";
const LINK_CLASSES =
  "text-fg/80 underline-offset-4 transition-colors hover:text-neon hover:underline";

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-panel px-4 py-2.5 text-xs text-muted">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-1.5 ${LINK_CLASSES}`}
      >
        <TbBrandGithub size={16} aria-hidden="true" />
        <span>
          SkyReplay is open source <span className="text-muted">(MIT)</span>
        </span>
      </a>
      {/* Required by the data license. */}
      <p>
        Data:{" "}
        <a
          href="https://adsb.lol"
          target="_blank"
          rel="noreferrer"
          className={LINK_CLASSES}
        >
          adsb.lol
        </a>{" "}
        (ODbL)
      </p>
    </footer>
  );
}
