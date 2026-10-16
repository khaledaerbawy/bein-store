import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
  return redirect;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) {
    return new NextResponse("إعدادات المصادقة غير مكتملة.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return redirectWithCookies(new URL("/admin/login", request.url), response);
  }

  const { data: role, error: roleError } = await supabase
    .from("admin_roles")
    .select("is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !role?.is_active) {
    await supabase.auth.signOut();
    return redirectWithCookies(new URL("/admin/login", request.url), response);
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
