"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ===============================
   TYPE
================================ */
type JadwalForm = {
  tanggal: string;
  imam: string;
  khotib: string;
};

type JadwalHist = {
  tanggal: string;
  imam: string;
  khotib: string;
  createdAt: string;
};

/* ===============================
   UTIL
================================ */
function makeDefault(): JadwalForm {
  return { tanggal: "", imam: "", khotib: "" };
}

function formatTanggal(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isFridayYYYYMMDD(iso: string) {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  // 0=Minggu ... 5=Jumat
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;
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
   PAGE
================================ */
export default function AdminPage() {
  const router = useRouter();

  const nowYear = new Date().getFullYear();

  // dropdown 3 tahun: Y-2, Y-1, Y
  const yearOptions = useMemo(() => {
    const y = nowYear;
    return [y - 2, y - 1, y];
  }, [nowYear]);

  const [year, setYear] = useState<number>(nowYear);

  const [form, setForm] = useState<JadwalForm>(makeDefault());
  const [saving, setSaving] = useState(false);

  const [loadingHist, setLoadingHist] = useState(true);
  const [hist, setHist] = useState<JadwalHist[]>([]);
  const [msg, setMsg] = useState("");

  const [editKey, setEditKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<JadwalForm>(makeDefault());
  const [updating, setUpdating] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadHistory = async (y: number) => {
    setLoadingHist(true);
    setMsg("");

    const res = await fetch(`/api/jadwal-history?year=${y}`, {
      cache: "no-store",
    });
    const json = await readJsonSafe(res);

    if (!res.ok) {
      setMsg(json?.message || "Gagal load history");
      setHist([]);
      setLoadingHist(false);
      return;
    }

    setHist(Array.isArray(json?.data) ? json.data : []);
    setLoadingHist(false);
  };

  // pastikan year selalu valid (kalau nyangkut tahun lama)
  useEffect(() => {
    if (!yearOptions.includes(year)) {
      setYear(yearOptions[yearOptions.length - 1]); // pilih yang terbaru
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearOptions]);

  useEffect(() => {
    loadHistory(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const save = async () => {
    setSaving(true);
    setMsg("");

    if (!form.tanggal) {
      setMsg("Tanggal wajib diisi");
      setSaving(false);
      return;
    }

    // ✅ validasi cepat di client juga (server tetap akan validasi)
    if (!isFridayYYYYMMDD(form.tanggal)) {
      setMsg("Tanggal harus hari Jum'at");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/jadwal-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await readJsonSafe(res);

    if (!res.ok) {
      setMsg(json?.message || "Gagal menyimpan");
      setSaving(false);
      return;
    }

    setMsg("Tersimpan ✅");
    setSaving(false);

    await loadHistory(year);
    setForm(makeDefault());
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  };

  const sortedHist = useMemo(() => {
    return [...hist].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [hist]);

  const printPage = () => window.print();

  const startEdit = (row: JadwalHist) => {
    setMsg("");
    setEditKey(row.tanggal);
    setEditForm({
      tanggal: row.tanggal,
      imam: row.imam || "",
      khotib: row.khotib || "",
    });
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditForm(makeDefault());
  };

  const submitEdit = async () => {
    if (!editKey) return;

    setUpdating(true);
    setMsg("");

    if (!editForm.tanggal) {
      setMsg("Tanggal wajib diisi");
      setUpdating(false);
      return;
    }

    // ✅ validasi cepat di client juga (server tetap akan validasi)
    if (!isFridayYYYYMMDD(editForm.tanggal)) {
      setMsg("Tanggal harus hari Jum'at");
      setUpdating(false);
      return;
    }

    const res = await fetch("/api/jadwal-history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggalOld: editKey,
        ...editForm,
      }),
    });

    const json = await readJsonSafe(res);

    if (!res.ok) {
      setMsg(json?.message || "Gagal update");
      setUpdating(false);
      return;
    }

    setMsg("Berhasil diupdate ✅");
    setUpdating(false);
    cancelEdit();
    await loadHistory(year);
  };

  const removeRow = async (tanggal: string) => {
    const ok = confirm(`Yakin hapus jadwal tanggal ${tanggal}?`);
    if (!ok) return;

    setDeletingKey(tanggal);
    setMsg("");

    const res = await fetch(
      `/api/jadwal-history?tanggal=${encodeURIComponent(tanggal)}`,
      { method: "DELETE" }
    );

    const json = await readJsonSafe(res);

    if (!res.ok) {
      setMsg(json?.message || "Gagal hapus");
      setDeletingKey(null);
      return;
    }

    setMsg("Berhasil dihapus ✅");
    setDeletingKey(null);

    if (editKey === tanggal) cancelEdit();

    await loadHistory(year);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-200 to-teal-400">
      <div className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8 py-6">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-wrap { padding: 0 !important; }
            table { font-size: 12px; }
            th, td { padding: 6px !important; }
            body { background: white !important; }
          }
        `}</style>

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
          <div>
            <h1 className="text-xl font-bold">Kelola Jadwal Jum&apos;at</h1>
            <p className="text-sm text-slate-600">
              Input jadwal lalu simpan. Data akan masuk ke tabel di bawah.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white
hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
          >
            Logout
          </button>
        </div>

        {msg && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm no-print">
            {msg}
          </div>
        )}

        {/* FORM INPUT */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200">
                  {["Tanggal", "Imam", "Khotib", "Aksi"].map((h) => (
                    <th
                      key={h}
                      className="border-b px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold uppercase text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b px-2 py-2 sm:px-4 sm:py-4">
                    <input
                      type="date"
                      value={form.tanggal}
                      onChange={(e) => {
                        const v = e.target.value;

                        // ✅ validasi realtime: kalau bukan Jumat, jangan simpan ke state
                        if (v && !isFridayYYYYMMDD(v)) {
                          setMsg("Tanggal harus hari Jum'at");
                          return;
                        }

                        setMsg("");
                        setForm({ ...form, tanggal: v });
                      }}
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                    />
                  </td>
                  <td className="border-b px-2 py-2 sm:px-4 sm:py-4">
                    <input
                      value={form.imam}
                      onChange={(e) => setForm({ ...form, imam: e.target.value })}
                      placeholder="Nama Imam"
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                    />
                  </td>
                  <td className="border-b px-2 py-2 sm:px-4 sm:py-4">
                    <input
                      value={form.khotib}
                      onChange={(e) =>
                        setForm({ ...form, khotib: e.target.value })
                      }
                      placeholder="Nama Khotib"
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                    />
                  </td>
                  <td className="border-b px-2 py-2 sm:px-4 sm:py-4">
                    <button
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white
hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* HISTORY */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print-wrap">
          <div className="flex flex-col gap-3 px-4 py-4 border-b sm:flex-row sm:items-center sm:justify-between no-print">
            <div>
              <div className="text-base font-bold">Lembar Jadwal Jum&apos;at</div>
              <div className="text-xs text-slate-500">
                Tahun {year} • Total {sortedHist.length} jadwal
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={printPage}
                className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white
hover:bg-cyan-700 active:scale-95 transition-all shadow-sm"
              >
                Print
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200">
                  {["No", "Tanggal", "Imam", "Khotib", "Aksi"].map((h) => (
                    <th
                      key={h}
                      className="border-b px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold uppercase text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loadingHist ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-slate-500">
                      Memuat...
                    </td>
                  </tr>
                ) : sortedHist.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-slate-500">
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  sortedHist.map((r, i) => {
                    const isEditing = editKey === r.tanggal;

                    return (
                      <tr key={r.tanggal}>
                        <td className="border-b px-2 py-2 text-xs sm:text-sm">
                          {i + 1}
                        </td>

                        {/* TANGGAL */}
                        <td className="border-b px-2 py-2 text-xs sm:text-sm">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.tanggal}
                              onChange={(e) => {
                                const v = e.target.value;

                                // ✅ validasi realtime: kalau bukan Jumat, jangan simpan ke state
                                if (v && !isFridayYYYYMMDD(v)) {
                                  setMsg("Tanggal harus hari Jum'at");
                                  return;
                                }

                                setMsg("");
                                setEditForm({ ...editForm, tanggal: v });
                              }}
                              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                            />
                          ) : (
                            formatTanggal(r.tanggal)
                          )}
                        </td>

                        {/* IMAM */}
                        <td className="border-b px-2 py-2 text-xs sm:text-sm">
                          {isEditing ? (
                            <input
                              value={editForm.imam}
                              onChange={(e) =>
                                setEditForm({ ...editForm, imam: e.target.value })
                              }
                              placeholder="Nama Imam"
                              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                            />
                          ) : (
                            r.imam || "—"
                          )}
                        </td>

                        {/* KHOTIB */}
                        <td className="border-b px-2 py-2 text-xs sm:text-sm">
                          {isEditing ? (
                            <input
                              value={editForm.khotib}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  khotib: e.target.value,
                                })
                              }
                              placeholder="Nama Khotib"
                              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm"
                            />
                          ) : (
                            r.khotib || "—"
                          )}
                        </td>

                        {/* AKSI */}
                        <td className="border-b px-2 py-2 text-xs sm:text-sm no-print">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={submitEdit}
                                disabled={updating}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white
hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {updating ? "Menyimpan..." : "Simpan"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={updating}
                                className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white
hover:bg-slate-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={() => startEdit(r)}
                                className="rounded-xl bg-teal-500 px-3 py-2 text-xs font-semibold text-white
hover:bg-teal-600 active:scale-95 transition-all shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeRow(r.tanggal)}
                                disabled={deletingKey === r.tanggal}
                                className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white
hover:bg-red-600 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {deletingKey === r.tanggal ? "Menghapus..." : "Hapus"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
