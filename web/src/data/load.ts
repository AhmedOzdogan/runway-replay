import type { Flight, ReplayFile } from "../types/flight";

/** Fetch a replay file. Handles .gz whether or not the server already decompressed it. */
async function fetchReplayFile(url: string): Promise<ReplayFile> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const text = isGzip
    ? await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).text()
    : new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

/** The newest processed day, from data/latest.json (written by the pipeline). */
async function fetchLatestDate(): Promise<string> {
  const response = await fetch("data/latest.json");
  if (!response.ok)
    throw new Error(`data/latest.json: HTTP ${response.status}`);
  const latest: { date: string } = await response.json();
  return latest.date;
}

/**
 * Load the newest day for one airport. Falls back to data/sample.json (a few fake flights) when
 * no real day has been processed yet and the sample is for the same airport.
 */
export async function loadFlights(
  airport: string,
): Promise<{ flights: Flight[]; date: string; isSample: boolean }> {
  try {
    const date = await fetchLatestDate();
    const replayFile = await fetchReplayFile(`data/${airport}-${date}.json.gz`);
    return { flights: replayFile.flights, date, isSample: false };
  } catch {
    const sample = await fetchReplayFile("data/sample.json");
    return {
      flights: sample.airport === airport ? sample.flights : [],
      date: sample.date,
      isSample: true,
    };
  }
}
