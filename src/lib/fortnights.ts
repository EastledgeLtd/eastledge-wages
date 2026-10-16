const ANCHOR = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;
const FORTNIGHT_MS = 14 * DAY_MS;

function toIsoDate(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function getFortnightForDate(date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const index = Math.floor((utc - ANCHOR) / FORTNIGHT_MS);
  const start = ANCHOR + index * FORTNIGHT_MS;
  const end = start + 13 * DAY_MS;
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)} ${end.getFullYear()}`;
}

export function listRecentPeriods(count = 8): { startDate: string; endDate: string }[] {
  const current = getFortnightForDate();
  const startMs = Date.parse(current.startDate + "T00:00:00Z");
  const periods = [];
  for (let i = 0; i < count; i++) {
    const start = startMs - i * FORTNIGHT_MS;
    periods.push({ startDate: toIsoDate(start), endDate: toIsoDate(start + 13 * DAY_MS) });
  }
  return periods;
}
