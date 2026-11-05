type Level = 'info' | 'error';

/** One JSON line per event. Request payloads are never logged because they hold policy data. */
export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...data });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}
