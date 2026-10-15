"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0C0E] text-gray-900 dark:text-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-3xl p-8 text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-800 dark:text-white mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">404 — Page Not Found</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The verification route or audit record you are trying to view does not exist.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
