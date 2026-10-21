import { TbBrandGithub } from "react-icons/tb";
import { REPO_URL } from "../data/site";

const LINK_CLASSES =
  "text-fg/80 underline-offset-4 transition-colors hover:text-neon hover:underline";

export function Footer({ onOpenLegal }: { onOpenLegal: () => void }) {
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
          Runway Replay is open source <span className="text-muted">(MIT)</span>
        </span>
      </a>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={onOpenLegal}
          className={`cursor-pointer ${LINK_CLASSES}`}
        >
          Legal & privacy
        </button>
        {/* Required by the data license. */}
        <span>
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
        </span>
      </span>
    </footer>
  );
}
