"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";

export default function AdminMenu() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function clickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", clickOutside);
        return () => document.removeEventListener("mousedown", clickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="
    h-10 w-10
    rounded-full
    bg-trasnparent
    text-black
    flex items-center justify-center
    hover:bg-white/90
    active:scale-[0.98]
  "
                title="Admin"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>


            {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-md">
                    <Link
                        href="/admin/login"
                        className="block px-4 py-3 text-sm hover:bg-slate-100"
                        onClick={() => setOpen(false)}
                    >
                        Login
                    </Link>
                </div>
            )}
        </div>
    );
}
