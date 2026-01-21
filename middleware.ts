import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verify(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET belum diset");

  return jwtVerify(
    token,
    new TextEncoder().encode(secret)
  );
}

export async function middleware(req: NextRequest) {
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
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await verify(token);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.json(
      { ok: false, message: "Token invalid" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/jadwal-:path*"],
};
