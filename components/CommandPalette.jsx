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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#15171C] border border-gray-200 dark:border-[#252830] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-gray-900 dark:text-gray-100 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-[#252830]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports by claim text, ID, or category..."
            className="flex-1 text-sm bg-transparent placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/10 rounded border border-gray-200 dark:border-gray-800">
            Esc
          </kbd>
        </div>

        {/* Action and Results List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {/* Action: New verification */}
          <div
            onClick={() => {
              onClose();
              onOpenNewVerification();
            }}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-xs font-semibold text-gray-900 dark:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center">
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
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {r.claimText || r.inputText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-gray-400">{r.reportId}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && filteredReports.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-400">
              No reports found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
