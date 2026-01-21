"use client";

import AdminMenu from "@/components/AdminMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ===============================
   TYPE
================================ */
type JadwalHist = {
  tanggal: string;
  imam: string;
  khotib: string;
};

type JadwalView = {
  id: "this" | "next";
  label: "Jumat Ini" | "Jumat Depan";
  tanggal: string;
  imam: string;
  khotib: string;
  updatedAt: string;
};

/* ===============================
   UTIL
================================ */
function formatTanggal(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";

  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/* ===============================
   FETCH DATA (AUTO dari jadwal_history)
================================ */
async function getJadwal(): Promise<JadwalView[]> {
  try {
    const res = await fetch("/api/jadwal-upcoming", { cache: "no-store" });
    const json = await readJsonSafe(res);

    if (!res.ok) return [];

    const rows: JadwalHist[] = Array.isArray(json?.data) ? json.data : [];
    const first = rows[0] ?? null;
    const second = rows[1] ?? null;

    const nowIso = new Date().toISOString();

    const out: JadwalView[] = [
      {
        id: "this",
        label: "Jumat Ini",
        tanggal: first?.tanggal ?? "",
        imam: first?.imam ?? "",
        khotib: first?.khotib ?? "",
        updatedAt: nowIso,
      },
      {
        id: "next",
        label: "Jumat Depan",
        tanggal: second?.tanggal ?? "",
        imam: second?.imam ?? "",
        khotib: second?.khotib ?? "",
        updatedAt: nowIso,
      },
    ];

    return out;
  } catch (err) {
    console.error("getJadwal error:", err);
    return [];
  }
}

/* ===============================
   TIMING TV MASJID
================================ */
const ANIM_IN = 4000;
const HOLD = 100000;

/* ===============================
   PAGE
================================ */
export default function Page() {
  const [key, setKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const total = ANIM_IN + HOLD;
    const interval = setInterval(() => {
      setKey((k) => k + 1);
      audioRef.current?.play().catch(() => {});
    }, total);

    audioRef.current?.play().catch(() => {});
    return () => clearInterval(interval);
  }, []);

  const [thisRow, nextRow] = useJadwalData();

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {/* AUDIO */}
      <audio ref={audioRef} src="/sound/intro.mp3" preload="auto" />

      {/* BACKGROUND */}
      <div
        className="
          absolute inset-0
          bg-[url('/mobile.jpg')]
          md:bg-[url('/web.jpg')]
          bg-cover bg-center
        "
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="relative z-10 w-full h-full flex items-center justify-center px-4"
        >
          <div className="w-full max-w-7xl">
            {/* HEADER */}
            <div className="flex flex-col items-center mb-10">
              <motion.img
                src="/logo.jpg"
                className="
                  w-16 h-16 md:w-24 md:h-24 rounded-full
                  shadow-[0_0_30px_rgba(34,211,238,0.9)]
                "
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
              />

              <motion.h1
                initial={{ y: -150, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", duration: 2 }}
                className="
                  mt-4
                  text-2xl md:text-5xl 2xl:text-6xl
                  font-extrabold tracking-widest
                  text-cyan-300
                  animate-pulse
                  drop-shadow-[0_0_25px_rgba(34,211,238,1)]
                "
              >
                MASJID AL-HIDAYAH
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-cyan-200 mt-2 text-center"
              >
                Dusun Pesawaran V, Desa Pesawaran
              </motion.p>
            </div>

            {/* JADWAL */}
            <motion.section
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2 }}
              className="
                bg-white/95
                rounded-2xl
                shadow-[0_0_40px_rgba(16,185,129,0.8)]
                overflow-hidden
              "
            >
              {/* HEADER */}
              <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-5 flex justify-between items-center">
                <span className="text-white text-xl md:text-3xl font-bold">
                  Jadwal Tugas Jum&apos;at
                </span>

                {/* ✅ AdminMenu tampil juga di mobile */}
                <div className=" relative z-50 block">
                  <AdminMenu />
                </div>
              </div>

              {/* TABLE */}
              <table className="w-full text-left table-fixed">
                {/* Jumat | Tanggal | Imam | Khotib */}
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                </colgroup>

                <thead className="bg-slate-100">
                  <tr>
                    {["", "Tanggal", "Imam", "Khotib"].map((h, i) => (
                      <th
                        key={i}
                        className="px-2 py-2 sm:px-3 md:px-6 md:py-4 text-slate-600 font-bold text-[10px] sm:text-xs md:text-base whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="text-slate-900">
                  <tr className="border-t border-slate-200 align-top">
                    {/* Kolom Jumat: pendek di mobile, full di desktop */}
                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-extrabold text-[10px] sm:text-xs md:text-base overflow-hidden">
                      <span className="md:hidden">Jumat Ini</span>
                      <span className="hidden md:inline">Jum&apos;at Ini</span>
                    </td>

                    {/* Tanggal boleh turun baris */}
                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 text-[10px] sm:text-xs md:text-base whitespace-normal leading-tight overflow-hidden">
                      {formatTanggal(thisRow?.tanggal ?? "")}
                    </td>

                    {/* Imam 1 baris + ellipsis */}
                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-semibold text-[10px] sm:text-xs md:text-base truncate">
                      {thisRow?.imam || "Belum ditentukan"}
                    </td>

                    {/* Khotib 1 baris + ellipsis */}
                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-semibold text-[10px] sm:text-xs md:text-base truncate">
                      {thisRow?.khotib || "Belum ditentukan"}
                    </td>
                  </tr>

                  <tr className="border-t border-slate-200 align-top">
                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-extrabold text-[10px] sm:text-xs md:text-base overflow-hidden">
                      <span className="md:hidden">Jumat Depan</span>
                      <span className="hidden md:inline">
                        Jum&apos;at Depan
                      </span>
                    </td>

                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 text-[10px] sm:text-xs md:text-base whitespace-normal leading-tight overflow-hidden">
                      {formatTanggal(nextRow?.tanggal ?? "")}
                    </td>

                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-semibold text-[10px] sm:text-xs md:text-base truncate">
                      {nextRow?.imam || "Belum ditentukan"}
                    </td>

                    <td className="px-2 py-2 sm:px-3 md:px-6 md:py-4 font-semibold text-[10px] sm:text-xs md:text-base truncate">
                      {nextRow?.khotib || "Belum ditentukan"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </motion.section>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/* ===============================
   HOOK DATA (ANTI UNDEFINED)
================================ */
function useJadwalData() {
  const [data, setData] = useState<JadwalView[]>([]);

  useEffect(() => {
    const refresh = () => getJadwal().then(setData);

    refresh();

    // auto refresh tiap 1 menit (aman buat TV)
    const i = setInterval(refresh, 60_000);

    // bonus: kalau TV balik fokus / tab aktif, refresh langsung
    const onFocus = () => refresh();
    const onVis = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(i);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const thisRow = data.find((d) => d.id === "this") ?? null;
  const nextRow = data.find((d) => d.id === "next") ?? null;

  return [thisRow, nextRow] as const;
}
