import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

type JadwalHistDoc = {
  tanggal: string; // "YYYY-MM-DD"
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

function jsonBad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}
function jsonOk(data?: any) {
  return NextResponse.json({ ok: true, data });
}

function isIsoDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ✅ Validasi harus hari Jumat (0=Minggu ... 5=Jumat)
function isFridayYYYYMMDD(iso: string) {
  if (!isIsoDateYYYYMMDD(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 5;
}

function getYearRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Window simpan:
 * - Tahun berjalan (Y) + 2 tahun sebelumnya (Y-1, Y-2) tetap ada
 * - Tahun lebih lama (<= Y-3) dihapus
 */
function getKeepWindow() {
  const currentYear = new Date().getFullYear();
  const minKeepYear = currentYear - 2; // Y-2
  const cutoff = `${minKeepYear}-01-01`; // tanggal < cutoff dihapus
  return { currentYear, minKeepYear, cutoff };
}

async function cleanupOldYears(db: any) {
  const { cutoff } = getKeepWindow();
  await db.collection("jadwal_history").deleteMany({
    tanggal: { $lt: cutoff },
  });
}

/**
 * Kalau tanggal yang dihapus adalah jadwal aktif (this/next),
 * reset jadwal aktif agar halaman user tidak menampilkan data lama.
 */
async function resetActiveJadwalIfMatches(db: any, tanggal: string) {
  const col = db.collection<JadwalDoc>("jadwal");

  await col.updateOne(
    { id: "this", tanggal },
    {
      $set: {
        tanggal: "",
        imam: "",
        khotib: "",
        updatedAt: new Date().toISOString(),
      },
    }
  );

  await col.updateOne(
    { id: "next", tanggal },
    {
      $set: {
        tanggal: "",
        imam: "",
        khotib: "",
        updatedAt: new Date().toISOString(),
      },
    }
  );
}

/* ======================
   GET
====================== */
export async function GET(req: NextRequest) {
  const year = Number(new URL(req.url).searchParams.get("year"));
  if (!year) return jsonBad("year wajib");

  const db = await getDb();
  await cleanupOldYears(db);

  const { currentYear, minKeepYear } = getKeepWindow();

  // hanya boleh akses: Y, Y-1, Y-2
  if (year < minKeepYear || year > currentYear) return jsonOk([]);

  const { start, end } = getYearRange(year);

  const data = await db
    .collection<JadwalHistDoc>("jadwal_history")
    .find({ tanggal: { $gte: start, $lte: end } }, { projection: { _id: 0 } })
    .sort({ tanggal: 1 })
    .toArray();

  return jsonOk(data);
}

/* ======================
   POST
====================== */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const tanggal = typeof body?.tanggal === "string" ? body.tanggal : "";
  const imam = typeof body?.imam === "string" ? body.imam : "";
  const khotib = typeof body?.khotib === "string" ? body.khotib : "";

  if (!tanggal || !isIsoDateYYYYMMDD(tanggal))
    return jsonBad("Tanggal tidak valid");

  if (!isFridayYYYYMMDD(tanggal))
    return jsonBad("Tanggal harus hari Jum'at");

  const db = await getDb();
  await cleanupOldYears(db);

  const col = db.collection<JadwalHistDoc>("jadwal_history");

  const exists = await col.findOne({ tanggal });
  if (exists) return jsonBad("Tanggal sudah ada", 409);

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

  const tanggalOld = typeof body?.tanggalOld === "string" ? body.tanggalOld : "";
  const tanggal = typeof body?.tanggal === "string" ? body.tanggal : "";
  const imam = typeof body?.imam === "string" ? body.imam : "";
  const khotib = typeof body?.khotib === "string" ? body.khotib : "";

  if (!tanggalOld || !tanggal) return jsonBad("Tanggal wajib");
  if (!isIsoDateYYYYMMDD(tanggalOld) || !isIsoDateYYYYMMDD(tanggal))
    return jsonBad("Tanggal tidak valid");

  if (!isFridayYYYYMMDD(tanggal))
    return jsonBad("Tanggal harus hari Jum'at");

  const db = await getDb();
  await cleanupOldYears(db);

  const col = db.collection<JadwalHistDoc>("jadwal_history");

  if (tanggal !== tanggalOld) {
    const clash = await col.findOne({ tanggal });
    if (clash) return jsonBad("Tanggal bentrok", 409);
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

  if (!res.matchedCount) return jsonBad("Data tidak ditemukan", 404);
  return jsonOk({ updated: true });
}

/* ======================
   DELETE
====================== */
export async function DELETE(req: NextRequest) {
  const tanggal = new URL(req.url).searchParams.get("tanggal");
  if (!tanggal) return jsonBad("tanggal wajib");
  if (!isIsoDateYYYYMMDD(tanggal)) return jsonBad("Tanggal tidak valid");

  const db = await getDb();
  await cleanupOldYears(db);

  const res = await db
    .collection<JadwalHistDoc>("jadwal_history")
    .deleteOne({ tanggal });

  if (!res.deletedCount) return jsonBad("Data tidak ada", 404);

  // sinkron: kalau yang dihapus adalah jadwal aktif, reset di collection jadwal
  await resetActiveJadwalIfMatches(db, tanggal);

  return jsonOk({ deleted: true });
}
