export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { Db, Collection } from "mongodb";

/* ======================
   TYPE
====================== */
type JadwalHistDoc = {
  tanggal: string;
  imam: string;
  khotib: string;
  createdAt: Date;
  updatedAt?: Date;
};

type JadwalId = "this" | "next";
type JadwalDoc = {
  id: JadwalId;
  label: "Jumat Ini" | "Jumat Depan";
  tanggal: string;
  imam: string;
  khotib: string;
  updatedAt: string;
};

/* ======================
   HELPERS
====================== */
function jsonBad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}
function jsonOk(data?: any) {
  return NextResponse.json({ ok: true, data });
}

function isIsoDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isFridayYYYYMMDD(iso: string) {
  if (!isIsoDateYYYYMMDD(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;
}

function getKeepWindow() {
  const currentYear = new Date().getFullYear();
  const minKeepYear = currentYear - 2;
  return {
    currentYear,
    minKeepYear,
    cutoff: `${minKeepYear}-01-01`,
  };
}

async function getDbSafe(): Promise<Db> {
  const { getDb } = await import("@/lib/mongodb");
  return getDb();
}

/* ======================
   GET
====================== */
export async function GET(req: NextRequest) {
  const year = Number(new URL(req.url).searchParams.get("year"));
  if (!year) return jsonBad("year wajib");

  const db = await getDbSafe();

  const { currentYear, minKeepYear } = getKeepWindow();
  if (year < minKeepYear || year > currentYear) return jsonOk([]);

  const data = await db
    .collection<JadwalHistDoc>("jadwal_history")
    .find(
      {
        tanggal: {
          $gte: `${year}-01-01`,
          $lte: `${year}-12-31`,
        },
      },
      { projection: { _id: 0 } }
    )
    .sort({ tanggal: 1 })
    .toArray();

  return jsonOk(data);
}

/* ======================
   POST
====================== */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const tanggal = body?.tanggal ?? "";
  const imam = body?.imam ?? "";
  const khotib = body?.khotib ?? "";

  if (!isIsoDateYYYYMMDD(tanggal))
    return jsonBad("Tanggal tidak valid");
  if (!isFridayYYYYMMDD(tanggal))
    return jsonBad("Tanggal harus hari Jum'at");

  const db = await getDbSafe();
  const col = db.collection<JadwalHistDoc>("jadwal_history");

  if (await col.findOne({ tanggal }))
    return jsonBad("Tanggal sudah ada", 409);

  const doc: JadwalHistDoc = {
    tanggal,
    imam,
    khotib,
    createdAt: new Date(),
  };

  await col.insertOne(doc);
  return jsonOk(doc);
}

/* ======================
   PATCH
====================== */
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  const { tanggalOld, tanggal, imam, khotib } = body ?? {};

  if (!tanggalOld || !tanggal)
    return jsonBad("Tanggal wajib");

  if (!isFridayYYYYMMDD(tanggal))
    return jsonBad("Tanggal harus hari Jum'at");

  const db = await getDbSafe();
  const col = db.collection<JadwalHistDoc>("jadwal_history");

  if (
    tanggal !== tanggalOld &&
    (await col.findOne({ tanggal }))
  ) {
    return jsonBad("Tanggal bentrok", 409);
  }

  const res = await col.updateOne(
    { tanggal: tanggalOld },
    {
      $set: {
        tanggal,
        imam,
        khotib,
        updatedAt: new Date(),
      },
    }
  );

  if (!res.matchedCount)
    return jsonBad("Data tidak ditemukan", 404);

  return jsonOk({ updated: true });
}

/* ======================
   DELETE
====================== */
export async function DELETE(req: NextRequest) {
  const tanggal = new URL(req.url).searchParams.get("tanggal");
  if (!tanggal) return jsonBad("tanggal wajib");

  const db = await getDbSafe();

  const res = await db
    .collection<JadwalHistDoc>("jadwal_history")
    .deleteOne({ tanggal });

  if (!res.deletedCount)
    return jsonBad("Data tidak ada", 404);

  return jsonOk({ deleted: true });
}
