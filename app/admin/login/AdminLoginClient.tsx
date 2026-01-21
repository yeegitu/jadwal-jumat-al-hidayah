"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = useMemo(() => sp.get("next") || "/admin", [sp]);

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
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-xl p-8"
      >
        <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>

        {err && (
          <div className="mb-4 text-sm text-red-600 text-center">{err}</div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded px-4 py-3 mb-3"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-4 py-3 mb-5"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 text-white py-3 rounded hover:bg-cyan-700 disabled:opacity-50"
        >
          {loading ? "Masuk..." : "Login"}
        </button>
      </form>
    </main>
  );
}
