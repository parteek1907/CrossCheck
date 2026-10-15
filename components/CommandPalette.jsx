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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#FAF7F0] dark:bg-[#181715] border border-[#181818]/20 dark:border-[#2D2B27] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-[#181818] dark:text-[#F6F3EB] overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#181818]/15 dark:border-[#2D2B27] bg-[#FCFAF6] dark:bg-[#1E1C19]">
          <Search className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports by claim text, ID, or category..."
            className="flex-1 text-sm bg-transparent placeholder:text-[#747068] focus:outline-none font-medium font-serif"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#55524B] dark:text-[#A8A29E] bg-[#FCFAF6] dark:bg-[#252320] rounded-md border border-[#181818]/20 dark:border-[#2D2B27] shadow-2xs">
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
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-[#EFECE4] dark:hover:bg-[#252320] cursor-pointer text-xs font-semibold text-[#181818] dark:text-[#F6F3EB] transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] flex items-center justify-center shadow-xs">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Start new verification</span>
            </div>
            <span className="text-[10px] font-mono uppercase text-[#747068] group-hover:text-[#181818] dark:group-hover:text-[#F6F3EB]">
              Action
            </span>
          </div>

          {/* Report Results */}
          {filteredReports.length > 0 && (
            <div className="pt-2">
              <div className="px-3 pb-1.5 text-[10px] font-mono uppercase text-[#747068] font-bold">
                Saved Reports ({filteredReports.length})
              </div>
              {filteredReports.map((r) => (
                <div
                  key={r.reportId}
                  onClick={() => {
                    onClose();
                    router.push(`/report/${encodeURIComponent(r.reportId)}`);
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-2xl hover:bg-[#EFECE4] dark:hover:bg-[#252320] cursor-pointer text-xs transition-all group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB] flex-shrink-0" />
                    <span className="truncate font-medium text-[#181818] dark:text-[#F6F3EB]">
                      {r.claimText || r.inputText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-[#55524B] dark:text-[#A8A29E] bg-[#FCFAF6] dark:bg-[#141312] border border-[#181818]/15 dark:border-[#2D2B27] px-1.5 py-0.5 rounded-md">
                      {r.reportId}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#747068] group-hover:text-[#181818] dark:group-hover:text-[#F6F3EB]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && filteredReports.length === 0 && (
            <div className="py-6 text-center text-xs text-[#747068] font-mono">
              No reports found matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
