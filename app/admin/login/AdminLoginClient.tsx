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
      {/* UI LOGIN */}
    </main>
  );
}
