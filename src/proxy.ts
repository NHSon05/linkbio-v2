import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_LINK_HEADERS, getSupabaseEnv, GOOGLE_CALLBACK_PATH } from "@/lib/auth";
import { EMAIL_CONFIRM_PATH, EMAIL_VERIFY_PATH } from "@/lib/emailConfirmation";

const publicAuthPages = new Set(["/login", "/register", "/register/resend", "/forgot-password"]);
const authCallbacks = new Set([GOOGLE_CALLBACK_PATH, EMAIL_VERIFY_PATH]);

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Các callback tự xử lý xác thực và phiên đăng nhập.
  if (pathname === EMAIL_CONFIRM_PATH) return NextResponse.next({ headers: AUTH_LINK_HEADERS });
  if (authCallbacks.has(pathname)) return NextResponse.next();

  const env = getSupabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });

  // getClaims() validates the JWT and refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  // API routes answer 401 themselves instead of redirecting.
  if (pathname.startsWith("/api/")) return response;

  // Dashboard (/) cần đăng nhập; trang công khai /{username}/{slug} giữ nguyên.
  if (!signedIn && (pathname === "/" || pathname.startsWith("/dashboard")) && !publicAuthPages.has(pathname)) {
    const target = new URL("/login", request.url);
    if (pathname !== "/") target.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(target), response);
  }
  if (signedIn && pathname === "/login") {
    return withCookies(NextResponse.redirect(new URL("/", request.url)), response);
  }
  return response;
}

function withCookies(redirect: NextResponse, from: NextResponse) {
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  const cacheControl = from.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}

export const config = {
  // Chrome DevTools tự dò workspace; không chuyển yêu cầu này sang đăng nhập.
  matcher: [
    "/((?!\\.well-known/appspecific/com\\.chrome\\.devtools\\.json$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
