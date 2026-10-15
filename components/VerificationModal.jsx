"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  FileText,
  Link as LinkIcon,
  UploadCloud,
  File as FileIcon,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = ["application/pdf"];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

export function VerificationModal({ isOpen, onClose, onComplete }) {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'link' | 'file'
  
  // Tab states
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  
  // Validation / errors
  const [errorMessage, setErrorMessage] = useState("");

  // Progress / verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [progressStage, setProgressStage] = useState(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [streamError, setStreamError] = useState(null);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const textInputRef = useRef(null);

  // Keyboard shortcut Cmd/Ctrl+K handler & Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !isVerifying) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isVerifying, onClose]);

  // Focus trap and autofocus on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setStreamError(null);
      setIsVerifying(false);
      setProgressStage(null);
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
    } else {
      // Clean up object URLs
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
      }
      setSelectedFile(null);
      setTextContent("");
      setLinkUrl("");
    }
  }, [isOpen]);

  // URL Validation
  const isValidUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Check validity for current tab
  const isInputValid = () => {
    if (activeTab === "text") {
      return textContent.trim().length >= 5;
    }
    if (activeTab === "link") {
      return isValidUrl(linkUrl.trim());
    }
    if (activeTab === "file") {
      return selectedFile !== null;
    }
    return false;
  };

  // File processing & validation
  const validateAndSetFile = (file) => {
    setErrorMessage("");
    if (!file) return;

    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(
        `Unsupported file type "${file.name.split(".").pop()}". Please upload a PDF, JPG, PNG, or WEBP file.`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). The maximum supported limit is 15MB.`
      );
      return;
    }

    setSelectedFile(file);

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVerifying) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  // Paste image with Ctrl+V
  const handlePaste = useCallback(
    (e) => {
      if (!isOpen || isVerifying) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setActiveTab("file");
            validateAndSetFile(file);
            break;
          }
        }
      }
    },
    [isOpen, isVerifying]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Execute verification with real streamed SSE events
  const handleVerify = async () => {
    if (!isInputValid() || isVerifying) return;

    setErrorMessage("");
    setStreamError(null);
    setIsVerifying(true);
    setProgressPct(5);
    setProgressStage("extract_claim");
    setProgressMessage("Initiating verification request...");

    let payloadContent = "";
    let mediaFile = null;

    if (activeTab === "text") {
      payloadContent = textContent.trim();
    } else if (activeTab === "link") {
      payloadContent = `URL Verification target: ${linkUrl.trim()}`;
    } else if (activeTab === "file") {
      payloadContent = `Circulating media document: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`;
      mediaFile = selectedFile;
    }

    try {
      const response = await fetch("/api/verify?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ content: payloadContent }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || `Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.*)$/m);

          const event = eventMatch ? eventMatch[1] : "message";
          const dataStr = dataMatch ? dataMatch[1] : "{}";

          let data = {};
          try {
            data = JSON.parse(dataStr);
          } catch {
            data = {};
          }

          if (event === "progress") {
            setProgressStage(data.stage || "processing");
            setProgressMessage(data.message || "Analyzing evidence...");
            if (typeof data.pct === "number") setProgressPct(data.pct);
          } else if (event === "complete") {
            setProgressPct(100);
            setProgressMessage("Audit complete! Opening report...");
            
            // Attach media metadata if image was submitted
            const reportData = {
              ...data,
              submittedMedia: mediaFile
                ? {
                    name: mediaFile.name,
                    size: mediaFile.size,
                    type: mediaFile.type,
                    previewUrl: filePreviewUrl,
                  }
                : null,
            };

            setTimeout(() => {
              setIsVerifying(false);
              onClose();
              if (typeof onComplete === "function") {
                onComplete(reportData);
              }
            }, 400);
            return;
          } else if (event === "error") {
            throw new Error(data.error || "Verification pipeline encountered an error.");
          }
        }
      }
    } catch (err) {
      console.error("[Modal Verification Error]", err);
      setIsVerifying(false);
      setStreamError(err.message || "Failed to complete verification. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isVerifying) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[#131416] border border-[#2D3035] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-gray-100 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24272C] bg-[#18191C]/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#D95D39]/15 text-[#D95D39] border border-[#D95D39]/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-semibold text-white tracking-tight">
                New Verification Audit
              </h2>
              <p className="text-xs text-gray-400">
                Multi-source open news corroboration, clustering & SHA-256 audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25282D] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Close (Esc)"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isVerifying && (
            <>
              {/* Tab Selector */}
              <div className="flex p-1 mb-5 bg-[#1B1D21] border border-[#26292E] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "text"
                      ? "bg-[#25282E] text-white shadow-sm border border-[#343840]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Text Claim</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("link");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "link"
                      ? "bg-[#25282E] text-white shadow-sm border border-[#343840]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Link / URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("file");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "file"
                      ? "bg-[#25282E] text-white shadow-sm border border-[#343840]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Document / Image</span>
                </button>
              </div>

              {/* Tab 1: Text Claim */}
              {activeTab === "text" && (
                <div>
                  <label className="block mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Enter Claim, Statement, or Viral Transcript
                  </label>
                  <textarea
                    ref={textInputRef}
                    rows={4}
                    value={textContent}
                    onChange={(e) => {
                      setTextContent(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="Paste circulating headline, statement, message, or transcript to cross-examine..."
                    className="w-full px-4 py-3 text-sm text-gray-100 bg-[#16181B] border border-[#2D3036] rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-[#D95D39] focus:ring-1 focus:ring-[#D95D39] transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>Minimum 5 characters required</span>
                    <span className={textContent.length < 5 ? "text-gray-500" : "text-emerald-400"}>
                      {textContent.length} characters
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Link */}
              {activeTab === "link" && (
                <div>
                  <label className="block mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Verify Article or Social Media Link
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => {
                        setLinkUrl(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="https://example.com/breaking-news-report"
                      className="w-full pl-10 pr-4 py-3 text-sm text-gray-100 bg-[#16181B] border border-[#2D3036] rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-[#D95D39] focus:ring-1 focus:ring-[#D95D39] transition-all"
                    />
                    <LinkIcon className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3.5 top-1/2" />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>Supports HTTP / HTTPS web articles</span>
                    {linkUrl && (
                      <span className={isValidUrl(linkUrl.trim()) ? "text-emerald-400" : "text-amber-400"}>
                        {isValidUrl(linkUrl.trim()) ? "Valid URL format" : "Enter a valid http:// or https:// URL"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: File Upload */}
              {activeTab === "file" && (
                <div>
                  <label className="block mb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Upload Media or Report File
                  </label>

                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#2F3238] hover:border-[#D95D39]/60 hover:bg-[#1A1C20] rounded-xl cursor-pointer transition-all group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            validateAndSetFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#202227] text-gray-400 group-hover:text-[#D95D39] group-hover:scale-105 transition-all">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-200 text-center">
                        Drag and drop your file here, or{" "}
                        <span className="text-[#D95D39] underline underline-offset-2">browse</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-400 text-center">
                        Supports PDF and Images (JPG, PNG, WEBP) up to 15MB. Or paste directly (Ctrl+V).
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#181A1E] border border-[#2C2F36] rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {filePreviewUrl ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-[#3A3D45]">
                            <img
                              src={filePreviewUrl}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-[#24272D] text-gray-300 flex-shrink-0 border border-[#343840]">
                            <FileIcon className="w-6 h-6 text-[#D95D39]" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-gray-100 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25282E] transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Mandatory Note */}
                  <p className="mt-2.5 text-xs text-gray-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Images are analysed on your device.</span>
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 mt-4 text-xs font-medium text-red-300 bg-red-950/40 border border-red-800/60 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}

          {/* Progress Stream View */}
          {isVerifying && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#D95D39] animate-spin" />
                  <span className="text-sm font-semibold text-white">
                    Verifying via Open Evidence Network...
                  </span>
                </div>
                <span className="text-xs font-mono text-[#D95D39] font-medium">
                  {progressPct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 mb-6 overflow-hidden rounded-full bg-[#1E2025]">
                <div
                  className="h-full bg-gradient-to-r from-[#D95D39] to-[#F97316] transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progressPct)}%` }}
                />
              </div>

              {/* Live Stage Badges */}
              <div className="space-y-3">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                    progressPct >= 10
                      ? "bg-[#181B20] border-emerald-500/30 text-emerald-300"
                      : "bg-[#15171A] border-[#222429] text-gray-500"
                  }`}
                >
                  {progressPct >= 25 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      1
                    </div>
                  )}
                  <span>Extracting content & isolating factual claims</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                    progressPct >= 25
                      ? "bg-[#181B20] border-emerald-500/30 text-emerald-300"
                      : "bg-[#15171A] border-[#222429] text-gray-500"
                  }`}
                >
                  {progressPct >= 60 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      2
                    </div>
                  )}
                  <span>Searching multi-source news wire databases (GDELT, RSS, Gov feeds)</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                    progressPct >= 60
                      ? "bg-[#181B20] border-emerald-500/30 text-emerald-300"
                      : "bg-[#15171A] border-[#222429] text-gray-500"
                  }`}
                >
                  {progressPct >= 75 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      3
                    </div>
                  )}
                  <span>Grouping independent sources & isolating syndication echo chambers</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                    progressPct >= 75
                      ? "bg-[#181B20] border-emerald-500/30 text-emerald-300"
                      : "bg-[#15171A] border-[#222429] text-gray-500"
                  }`}
                >
                  {progressPct >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                      4
                    </div>
                  )}
                  <span>Computing deterministic 100-pt trust score & SHA-256 audit digest</span>
                </div>
              </div>

              {/* Current Status Message */}
              <div className="p-3 mt-4 text-xs font-mono text-gray-300 bg-[#16181C] border border-[#282B31] rounded-xl flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D95D39] flex-shrink-0" />
                <span className="truncate">{progressMessage}</span>
              </div>
            </div>
          )}

          {/* Stream Error with Retry */}
          {streamError && !isVerifying && (
            <div className="p-4 mt-4 bg-red-950/40 border border-red-800/60 rounded-xl">
              <div className="flex items-start gap-2 text-xs font-medium text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-200">Verification Interrupted</p>
                  <p className="mt-1">{streamError}</p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Verification</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isVerifying && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#24272C] bg-[#16171A]">
            <div className="text-xs text-gray-400">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#25282E] text-gray-300 font-mono text-[11px] border border-[#34373F]">Esc</kbd> to cancel
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-[#1F2126] hover:bg-[#282A31] rounded-xl border border-[#2D3037] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={!isInputValid()}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#D95D39] hover:bg-[#e46944] disabled:bg-[#34373F] disabled:text-gray-500 disabled:cursor-not-allowed rounded-xl shadow-md transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
