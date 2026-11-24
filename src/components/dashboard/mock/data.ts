// Dữ liệu mẫu cho dashboard UI. Chưa nối API: thay file này khi có backend.
import { SiteSchema, type Site } from "@/lib/schemas/site";
import shop from "./sites/fanpage-abc.json";
import artist from "./sites/beat-artist.json";
import food from "./sites/ig-food.json";
import beauty from "./sites/tiktok-beauty.json";

export type SiteSummary = {
  slug: string;
  title: string;
  template: string;
  platform: string | null;
  canEdit: boolean;
  publishedSlug: string | null;
};

export type TrafficDay = { day: string; views: number; clicks: number };

export const mockSites: Site[] = [shop, artist, beauty, food].map((site) => SiteSchema.parse(site));

export function summaryOf(site: Site): SiteSummary {
  return {
    slug: site.slug,
    title: site.profile.title,
    template: site.template,
    platform: site.source?.platform ?? null,
    canEdit: true,
    publishedSlug: site.slug,
  };
}

const dailyViews = [148, 186, 174, 235, 210, 312, 274, 198, 226, 307, 249, 295, 362, 322];

export function mockTraffic(slug: string): TrafficDay[] {
  const index = Math.max(0, mockSites.findIndex((site) => site.slug === slug));
  return trafficDates(30).map((day) => {
    const offset = Math.floor(Date.parse(day) / 86400000) + index * 3;
    const views = Math.round(dailyViews[offset % dailyViews.length] * (1 + index / 3));
    return { day, views, clicks: Math.round(views * (0.13 + (offset % 5) * 0.025)) };
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
  return Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
}
