import type { Flight, ReplayFile } from "../types/flight";

/** Fetch a replay file. Handles .gz whether or not the server already decompressed it. */
async function fetchReplayFile(url: string): Promise<ReplayFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const text = isGzip
    ? await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).text()
    : new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

/**
 * Load one airport-day. Falls back to data/sample.json (a few fake flights) when the real file
 * hasn't been processed yet and the sample is for the same airport.
 */
export async function loadFlights(
  airport: string,
  date: string,
): Promise<{ flights: Flight[]; sample: boolean }> {
  try {
    return {
      flights: (await fetchReplayFile(`data/${airport}-${date}.json.gz`))
        .flights,
      sample: false,
    };
  } catch {
    const sample = await fetchReplayFile("data/sample.json");
    return {
      flights: sample.airport === airport ? sample.flights : [],
      sample: true,
    };
  }
}
