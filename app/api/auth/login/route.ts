import { NextResponse } from "next/server";
import { SignJWT } from "jose";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET minimal 32 karakter");
  }
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json(
      { ok: false, message: "Admin credential belum diset" },
      { status: 500 }
    );
  }

  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah" },
      { status: 401 }
    );
  }

  const token = await new SignJWT({
    role: "admin",
    username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
