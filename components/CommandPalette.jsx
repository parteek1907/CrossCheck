"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ShieldCheck, X, ChevronRight, FileText } from "lucide-react";

export function CommandPalette({ isOpen, onClose, reports = [], onOpenNewVerification }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredReports = reports.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.claimText && r.claimText.toLowerCase().includes(q)) ||
      (r.reportId && r.reportId.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  }).slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-md animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg backdrop-blur-2xl bg-white/90 dark:bg-[#11141D]/90 border border-white/80 dark:border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-gray-900 dark:text-gray-100 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/[0.02]">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports by claim text, ID, or category..."
            className="flex-1 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none font-medium"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400 backdrop-blur-md bg-white/60 dark:bg-white/10 rounded-md border border-white/80 dark:border-white/15 shadow-2xs">
            Esc
          </kbd>
        </div>

        {/* Action and Results List */}
        <div className="p-2.5 max-h-80 overflow-y-auto space-y-1">
          {/* Action: New verification */}
          <div
            onClick={() => {
              onClose();
              onOpenNewVerification();
            }}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-white/80 dark:hover:bg-white/10 cursor-pointer text-xs font-semibold text-gray-900 dark:text-white transition-all group backdrop-blur-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Start new verification</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
              Action
            </span>
          </div>

          {/* Report Results */}
          {filteredReports.length > 0 && (
            <div className="pt-2">
              <div className="px-3 pb-1.5 text-[10px] font-mono uppercase text-gray-400 font-semibold">
                Saved Reports ({filteredReports.length})
              </div>
              {filteredReports.map((r) => (
                <div
                  key={r.reportId}
                  onClick={() => {
                    onClose();
                    router.push(`/report/${encodeURIComponent(r.reportId)}`);
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-2xl hover:bg-white/80 dark:hover:bg-white/10 cursor-pointer text-xs transition-all group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {r.claimText || r.inputText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 backdrop-blur-md bg-white/40 dark:bg-black/20 border border-white/60 dark:border-white/10 px-1.5 py-0.5 rounded-md">
                      {r.reportId}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && filteredReports.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-400 font-medium">
              No reports found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
