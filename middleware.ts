import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // hanya jaga admin & api jadwal
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/jadwal")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("admin_token")?.value;

  // belum login
  if (!token) {
    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // JANGAN VERIFY JWT DI SINI
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/jadwal-:path*"],
};
