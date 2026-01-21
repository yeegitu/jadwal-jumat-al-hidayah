"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(
    () => searchParams.get("next") || "/admin",
    [searchParams]
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErr(json?.message || "Login gagal");
        return;
      }

      router.replace(nextPath);
    } catch {
      setErr("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold">Login Admin</h1>
          <p className="text-sm text-slate-500 mt-1">
            Masuk menggunakan username admin
          </p>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Username
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-4 ring-slate-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-4 ring-slate-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
