export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Db } from "mongodb";

/* ======================
   TYPE
====================== */
type JadwalHistDoc = {
  tanggal: string; // YYYY-MM-DD
  imam: string;
  khotib: string;
  createdAt: Date;
  updatedAt?: Date;
};

/* ======================
   DB SAFE (ANTI BUILD ERROR)
====================== */
async function getDbSafe(): Promise<Db> {
  const { getDb } = await import("@/lib/mongodb");
  return getDb();
}

/* ======================
   DATE UTIL
====================== */
function todayISOJakarta(): string {
  // en-CA => YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/* ======================
   GET
====================== */
export async function GET() {
  try {
    const db = await getDbSafe();
    const col = db.collection<JadwalHistDoc>("jadwal_history");

    const today = todayISOJakarta();

    const rows = await col
      .find(
        { tanggal: { $gte: today } },
        { projection: { _id: 0, tanggal: 1, imam: 1, khotib: 1 } }
      )
      .sort({ tanggal: 1 })
      .limit(2)
      .toArray();

    return NextResponse.json(
      { ok: true, data: rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("API /api/jadwal-upcoming GET error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
