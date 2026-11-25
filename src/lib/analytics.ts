export type TrafficDay = { day: string; views: number; clicks: number };

/** Today in Vietnam as YYYY-MM-DD (page_traffic() groups days in Asia/Ho_Chi_Minh too). */
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The last `days` days ending today, with zero for days that have no events. */
export function fillDays(
  rows: { day: string; views: number; clicks: number }[],
  days: number,
  today = vietnamToday(),
): TrafficDay[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const end = Date.parse(today + "T00:00:00Z");
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(end - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    const row = byDay.get(day);
    return { day, views: row?.views ?? 0, clicks: row?.clicks ?? 0 };
  });
}
