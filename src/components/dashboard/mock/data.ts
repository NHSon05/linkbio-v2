// shortcut: sample traffic until page_events aggregates exist (AN-02).
export type TrafficDay = { day: string; views: number; clicks: number };

const dailyViews = [
  148, 186, 174, 235, 210, 312, 274, 198, 226, 307, 249, 295, 362, 322,
];

export function mockTraffic(slug: string): TrafficDay[] {
  const index = [...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 4;
  return trafficDates(30).map((day) => {
    const offset = Math.floor(Date.parse(day) / 86400000) + index * 3;
    const views = Math.round(
      dailyViews[offset % dailyViews.length] * (1 + index / 3),
    );
    return {
      day,
      views,
      clicks: Math.round(views * (0.13 + (offset % 5) * 0.025)),
    };
  });
}

function trafficDates(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const end = Date.parse(today + "T00:00:00Z");
  return Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}
