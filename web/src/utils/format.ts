/** "08:05:00" for a number of seconds since midnight UTC. */
export function formatClock(secondsSinceMidnight: number): string {
  return new Date(secondsSinceMidnight * 1000).toISOString().slice(11, 19);
}

/** "08:05" for a number of seconds since midnight UTC. */
export function formatClockTime(secondsSinceMidnight: number): string {
  return formatClock(secondsSinceMidnight).slice(0, 5);
}

/** "45 s" under a minute and a half, otherwise "3 min". */
export function formatDuration(seconds: number): string {
  return seconds < 90
    ? `${Math.max(1, Math.round(seconds))} s`
    : `${Math.round(seconds / 60)} min`;
}

/** "~ 5 h 10 m", or "~ 55 min" under an hour: how long a flight was in the air. */
export function formatFlightTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~ ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `~ ${hours} h` : `~ ${hours} h ${rest} m`;
}
