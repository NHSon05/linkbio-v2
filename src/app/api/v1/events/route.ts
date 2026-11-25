import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";

// AN-01: public, rate-limited event ingestion. No cookies or IP addresses are stored.
const EventSchema = z.object({
  path: z
    .string()
    .regex(/^\/[a-z0-9][a-z0-9-]{2,29}\/[a-z0-9][a-z0-9-]{0,62}$/),
  type: z.enum(["view", "click"]),
  blockId: z
    .string()
    .regex(/^[\w-]{1,100}$/)
    .optional(),
  referrerHost: z
    .string()
    .regex(/^[a-z0-9.-]{1,255}$/i)
    .optional(),
  utmSource: z.string().max(100).optional(),
});

const MAX_BODY_BYTES = 1024;
const allow = createRateLimiter(60, 60_000);
const accepted = () => Response.json({ accepted: true }, { status: 202 });

export async function POST(request: Request) {
  // Only this site's pages send events; beacons from other origins are dropped.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host)
    return Response.json({ error: "forbidden" }, { status: 403 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!allow(ip))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES)
    return Response.json({ error: "too_large" }, { status: 413 });
  let parsed;
  try {
    parsed = EventSchema.safeParse(JSON.parse(body));
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json({ error: "invalid" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    console.error("Events dropped: SUPABASE_SECRET_KEY is not set");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  const { path, type, blockId, referrerHost, utmSource } = parsed.data;
  const [, username, slug] = path.split("/");
  const { error } = await supabase.rpc("record_page_event", {
    p_username: username,
    p_slug: slug,
    p_event_type: type,
    p_block_id: blockId ?? null,
    p_referrer_host: referrerHost?.toLowerCase() ?? null,
    p_utm_source: utmSource ?? null,
  });
  if (error) {
    console.error("Event insert failed", error.code);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  // Unknown or unpublished pages are accepted too, so the endpoint does not reveal which pages exist.
  return accepted();
}
