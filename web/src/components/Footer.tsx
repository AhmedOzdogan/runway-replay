export function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-4 border-t border-line bg-panel px-4 py-2.5">
      {/* Required by the data license. */}
      <small className="text-muted">
        Data:{" "}
        <a className="underline" href="https://adsb.lol">
          adsb.lol
        </a>{" "}
        (ODbL)
      </small>
    </footer>
  );
}
