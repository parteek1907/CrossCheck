"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[Crosscheck App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0C0E] text-gray-900 dark:text-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-3xl p-8 text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {error?.message || "An unexpected error occurred while executing this verification."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 rounded-full transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black rounded-full shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
