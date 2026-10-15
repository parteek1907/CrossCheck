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

export function VerificationModal({ isOpen, onClose, onComplete, initialData = null }) {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'link' | 'file'
  
  // Tab states
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileContext, setFileContext] = useState("");
  
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
  const abortControllerRef = useRef(null);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsVerifying(false);
    onClose();
  };

  // Keyboard shortcut Esc handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus and prefill on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setStreamError(null);
      setIsVerifying(false);
      setProgressStage(null);

      if (initialData) {
        if (initialData.tab) setActiveTab(initialData.tab);
        if (initialData.text) setTextContent(initialData.text);
        if (initialData.link) setLinkUrl(initialData.link);
        if (initialData.file) validateAndSetFile(initialData.file);
      }

      setTimeout(() => {
        textInputRef.current?.focus();
      }, 50);
    } else {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
      }
      setSelectedFile(null);
      setTextContent("");
      setLinkUrl("");
    }
  }, [isOpen, initialData]);

  // URL Validation
  const isValidUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isInputValid = () => {
    if (activeTab === "text") return textContent.trim().length >= 5;
    if (activeTab === "link") return isValidUrl(linkUrl.trim());
    if (activeTab === "file") return selectedFile !== null;
    return false;
  };

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
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFilePreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

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
            if (textContent.trim()) {
              setFileContext(textContent.trim());
            }
            setActiveTab("file");
            validateAndSetFile(file);
            break;
          }
        }
      }
    },
    [isOpen, isVerifying, textContent]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const removeSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileContext("");
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const parts = result.split(",");
          resolve({
            name: file.name,
            size: file.size,
            mimeType: file.type,
            data: parts[1] || "",
            previewUrl: file.type.startsWith("image/") ? result : null
          });
        } else {
          resolve(null);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!isInputValid() || isVerifying) return;

    setErrorMessage("");
    setStreamError(null);
    setIsVerifying(true);
    setProgressPct(8);
    setProgressStage("extract_claim");
    setProgressMessage("Extracting content & isolating factual claim assertions...");

    abortControllerRef.current = new AbortController();

    let payload = {};
    let mediaFile = null;
    let encodedMediaData = null;

    try {
      if (activeTab === "text") {
        payload = { content: textContent.trim() };
      } else if (activeTab === "link") {
        payload = { url: linkUrl.trim(), content: linkUrl.trim() };
      } else if (activeTab === "file") {
        if (!selectedFile) throw new Error("Please select a file to verify.");
        mediaFile = selectedFile;
        setProgressMessage(`Reading and encoding ${selectedFile.name}...`);
        const mediaData = await readFileAsBase64(selectedFile);
        encodedMediaData = mediaData;
        const queryText = (fileContext || textContent).trim();
        payload = {
          content: queryText || `Visual verification for attached file: ${selectedFile.name}`,
          media: mediaData
        };
      }

      const response = await fetch("/api/verify?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
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

            const serverMedia = data.submittedMedia || {};
            const persistentPreview =
              serverMedia.previewUrl ||
              encodedMediaData?.previewUrl ||
              filePreviewUrl ||
              null;

            const reportData = {
              ...data,
              submittedMedia: (mediaFile || data.submittedMedia)
                ? {
                    ...serverMedia,
                    name: mediaFile?.name || serverMedia.name || "submitted_media",
                    size: mediaFile?.size || serverMedia.size || 0,
                    type: mediaFile?.type || serverMedia.mimeType || "image/png",
                    mimeType: mediaFile?.type || serverMedia.mimeType || "image/png",
                    previewUrl: persistentPreview,
                    data: serverMedia.data || encodedMediaData?.data || null,
                    identifiedEntity: serverMedia.identifiedEntity || data.identifiedEntity || null,
                    visualContext: serverMedia.visualContext || data.visualContext || null,
                    mediaAssessment: serverMedia.mediaAssessment || data.mediaAssessment || null,
                  }
                : null,
            };

            setTimeout(() => {
              setIsVerifying(false);
              onClose();
              if (typeof onComplete === "function") {
                onComplete(reportData);
              }
            }, 300);
            return;
          } else if (event === "error") {
            throw new Error(data.error || "Verification pipeline encountered an error.");
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.info("Verification aborted by user.");
        setIsVerifying(false);
        return;
      }
      console.error("[Modal Verification Error]", err);
      setIsVerifying(false);
      setStreamError(err.message || "Failed to complete verification. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-[#FCFAF6] dark:bg-[#181715] border border-[#181818]/20 dark:border-[#2D2B27] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-[#181818] dark:text-[#F6F3EB] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#181818]/15 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#1E1C19]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818]/20 shadow-xs font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-editorial font-bold text-[#181818] dark:text-[#F6F3EB] tracking-tight">
                New Verification Check
              </h2>
              <p className="text-xs text-[#55524B] dark:text-[#A8A29E] font-serif">
                Multi-source open wire corroboration & cryptographic proof
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] hover:bg-[#EFECE4] dark:hover:bg-[#252320] transition-colors cursor-pointer"
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
              {/* Pill Tab Selector */}
              <div className="flex p-1 mb-5 bg-[#FAF7F0] dark:bg-[#1E1C19] rounded-full border border-[#181818]/15 dark:border-[#2D2B27] shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                    activeTab === "text"
                      ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] shadow-sm"
                      : "text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Text Claim</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("link");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                    activeTab === "link"
                      ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] shadow-sm"
                      : "text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB]"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Link / URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("file");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-full transition-all active:scale-[0.98] ${
                    activeTab === "file"
                      ? "bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] shadow-sm"
                      : "text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB]"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Document / Image</span>
                </button>
              </div>

              {/* Tab 1: Text Claim */}
              {activeTab === "text" && (
                <div>
                  <label className="block mb-2 text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
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
                    placeholder="Paste circulating headline, statement, WhatsApp forward, or transcript to cross-examine..."
                    className="w-full px-4 py-3 text-sm text-[#181818] dark:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-2xl placeholder:text-[#747068] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] transition-all resize-none shadow-xs font-serif"
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-[#55524B] dark:text-[#A8A29E]">
                    <div className="flex items-center gap-2 font-mono">
                      <span>Minimum 5 characters required</span>
                      {textContent.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTextContent("")}
                          className="text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] flex items-center gap-0.5 text-[11px] underline cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (textContent.trim()) setFileContext(textContent.trim());
                          setActiveTab("file");
                          setTimeout(() => fileInputRef.current?.click(), 50);
                        }}
                        className="text-[#181818] dark:text-[#F6F3EB] flex items-center gap-1 text-[11px] font-semibold cursor-pointer ml-2 hover:underline"
                        title="Attach an image to this claim"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Attach Image</span>
                      </button>
                    </div>
                    <span className={`font-mono text-xs ${textContent.length < 5 ? "text-[#747068]" : "text-[#2D6A4F] dark:text-[#74C69D] font-bold"}`}>
                      {textContent.length} characters
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Link */}
              {activeTab === "link" && (
                <div>
                  <label className="block mb-2 text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
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
                      className="w-full pl-10 pr-10 py-3 text-sm text-[#181818] dark:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-2xl placeholder:text-[#747068] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] transition-all shadow-xs font-mono"
                    />
                    <LinkIcon className="absolute w-4 h-4 text-[#747068] -translate-y-1/2 left-3.5 top-1/2" />
                    {linkUrl.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLinkUrl("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] hover:bg-[#EFECE4] rounded-full cursor-pointer"
                        title="Clear link"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-[#55524B] dark:text-[#A8A29E] font-mono">
                    <span>Supports HTTP / HTTPS web articles</span>
                    {linkUrl && (
                      <span className={isValidUrl(linkUrl.trim()) ? "text-[#2D6A4F] dark:text-[#74C69D] font-bold" : "text-[#C84630] font-bold"}>
                        {isValidUrl(linkUrl.trim()) ? "Valid URL format" : "Enter a valid http:// or https:// URL"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: File Upload */}
              {activeTab === "file" && (
                <div>
                  <label className="block mb-2 text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
                    Upload Media or Report File
                  </label>

                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#181818]/20 dark:border-[#2D2B27] hover:border-[#181818] dark:hover:border-[#F4EFEB] bg-[#FAF7F0] dark:bg-[#1E1C19] hover:bg-[#EFECE4] dark:hover:bg-[#252320] rounded-2xl cursor-pointer transition-all group shadow-xs"
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
                      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#181818] text-[#F6F3EB] dark:bg-[#F4EFEB] dark:text-[#181818] border border-[#181818]/20 group-hover:scale-105 transition-all shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-[#181818] dark:text-[#F6F3EB] text-center font-editorial">
                        Drag and drop your file here, or{" "}
                        <span className="underline underline-offset-2 font-bold">browse</span>
                      </p>
                      <p className="mt-1 text-xs text-[#747068] text-center font-mono">
                        Supports PDF and Images (JPG, PNG, WEBP) up to 15MB. Or paste directly (Ctrl+V).
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {filePreviewUrl ? (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-[#141312] flex-shrink-0 border border-[#181818]/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={filePreviewUrl}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#FCFAF6] dark:bg-[#141312] text-[#181818] dark:text-[#F6F3EB] flex-shrink-0 border border-[#181818]/20">
                            <FileIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-[#181818] dark:text-[#F6F3EB] truncate font-mono">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-[#747068] font-mono">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="p-1.5 rounded-full text-[#747068] hover:text-[#181818] dark:hover:text-[#F6F3EB] hover:bg-[#EFECE4] transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Context / Question for Media */}
                  <div className="mt-3.5">
                    <label className="block mb-1.5 text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB] uppercase tracking-wider">
                      Specific Question or Claim (Optional)
                    </label>
                    <input
                      type="text"
                      value={fileContext}
                      onChange={(e) => setFileContext(e.target.value)}
                      placeholder="e.g. 'is this person dead', 'did this happen?'"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-[#181818] dark:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/20 dark:border-[#2D2B27] rounded-xl placeholder:text-[#747068] focus:outline-none focus:ring-1 focus:ring-[#181818] dark:focus:ring-[#F4EFEB] transition-all shadow-xs font-serif"
                    />
                    <p className="mt-1 text-[11px] text-[#747068] font-serif">
                      If asking about a person, the AI identifies who they are and cross-examines news wires and fact-check records.
                    </p>
                  </div>

                  {/* Mandatory Note */}
                  <p className="mt-2.5 text-xs text-[#2D6A4F] dark:text-[#74C69D] flex items-center gap-1.5 font-medium font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] flex-shrink-0" />
                    <span>Images are analysed on your device.</span>
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 mt-4 text-xs font-semibold text-[#78281F] dark:text-[#FCDFD7] bg-[#FDF1EE] dark:bg-[#2B1B19] border border-[#C84630]/30 rounded-xl font-mono">
                  <AlertCircle className="w-4 h-4 text-[#C84630] flex-shrink-0 mt-0.5" />
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
                  <Loader2 className="w-4 h-4 text-[#181818] dark:text-[#F6F3EB] animate-spin" />
                  <span className="text-sm font-editorial font-bold text-[#181818] dark:text-[#F6F3EB]">
                    Cross-examining open evidence wire...
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#181818] dark:text-[#F6F3EB]">
                  {progressPct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 mb-6 overflow-hidden rounded-full bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27]">
                <div
                  className="h-full bg-[#181818] dark:bg-[#F4EFEB] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progressPct)}%` }}
                />
              </div>

              {/* Live Stage Badges */}
              <div className="space-y-2.5">
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-medium transition-all ${
                    progressPct >= 10
                      ? "bg-[#EDF7F1] dark:bg-[#1B2820] border-[#2D6A4F]/40 text-[#1B4332] dark:text-[#D8F3DC] shadow-xs"
                      : "bg-[#FAF7F0] dark:bg-[#1E1C19] border-[#181818]/10 dark:border-[#2D2B27] text-[#747068]"
                  }`}
                >
                  {progressPct >= 25 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold font-mono">
                      1
                    </div>
                  )}
                  <span>Extracting content & isolating factual claim assertions</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-medium transition-all ${
                    progressPct >= 25
                      ? "bg-[#EDF7F1] dark:bg-[#1B2820] border-[#2D6A4F]/40 text-[#1B4332] dark:text-[#D8F3DC] shadow-xs"
                      : "bg-[#FAF7F0] dark:bg-[#1E1C19] border-[#181818]/10 dark:border-[#2D2B27] text-[#747068]"
                  }`}
                >
                  {progressPct >= 60 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold font-mono">
                      2
                    </div>
                  )}
                  <span>Searching multi-source news wire databases (GDELT, Google News RSS, Gov feeds)</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-medium transition-all ${
                    progressPct >= 60
                      ? "bg-[#EDF7F1] dark:bg-[#1B2820] border-[#2D6A4F]/40 text-[#1B4332] dark:text-[#D8F3DC] shadow-xs"
                      : "bg-[#FAF7F0] dark:bg-[#1E1C19] border-[#181818]/10 dark:border-[#2D2B27] text-[#747068]"
                  }`}
                >
                  {progressPct >= 75 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold font-mono">
                      3
                    </div>
                  )}
                  <span>Grouping independent sources & isolating syndication echo chambers</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-medium transition-all ${
                    progressPct >= 75
                      ? "bg-[#EDF7F1] dark:bg-[#1B2820] border-[#2D6A4F]/40 text-[#1B4332] dark:text-[#D8F3DC] shadow-xs"
                      : "bg-[#FAF7F0] dark:bg-[#1E1C19] border-[#181818]/10 dark:border-[#2D2B27] text-[#747068]"
                  }`}
                >
                  {progressPct >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#74C69D] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold font-mono">
                      4
                    </div>
                  )}
                  <span>Computing deterministic 100-pt trust score & SHA-256 audit digest</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3 mt-4 text-xs font-mono text-[#181818] dark:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] border border-[#181818]/15 dark:border-[#2D2B27] rounded-xl flex items-center gap-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C84630] flex-shrink-0 animate-pulse" />
                <span className="truncate">{progressMessage}</span>
              </div>

              {/* Cancel Button during verification */}
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 text-xs font-semibold text-[#55524B] dark:text-[#A8A29E] hover:text-[#181818] dark:hover:text-[#F6F3EB] bg-[#FAF7F0] dark:bg-[#1E1C19] hover:bg-[#EFECE4] rounded-full border border-[#181818]/20 dark:border-[#2D2B27] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Check</span>
                </button>
              </div>
            </div>
          )}

          {/* Stream Error with Retry */}
          {streamError && !isVerifying && (
            <div className="p-4 mt-4 bg-[#FDF1EE] dark:bg-[#2B1B19] border border-[#C84630]/30 rounded-2xl">
              <div className="flex items-start gap-2 text-xs font-semibold text-[#78281F] dark:text-[#FCDFD7]">
                <AlertCircle className="w-4 h-4 text-[#C84630] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold font-mono text-[#C84630]">Verification Interrupted</p>
                  <p className="mt-1 font-normal font-serif text-[#78281F] dark:text-[#FCDFD7]">{streamError}</p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#C84630] hover:bg-[#A8321E] rounded-full transition-colors shadow-xs active:scale-[0.98]"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#181818]/15 dark:border-[#2D2B27] bg-[#FAF7F0] dark:bg-[#1E1C19]">
            <div className="text-xs text-[#747068] font-mono">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF6] dark:bg-[#141312] text-[#55524B] dark:text-[#A8A29E] font-mono text-[11px] border border-[#181818]/20 dark:border-[#2D2B27] shadow-2xs">Esc</kbd> to cancel
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#55524B] dark:text-[#A8A29E] hover:text-[#181818] dark:hover:text-[#F6F3EB] bg-[#FCFAF6] dark:bg-[#181715] hover:bg-[#EFECE4] rounded-full border border-[#181818]/20 dark:border-[#2D2B27] shadow-xs transition-colors font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={!isInputValid()}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-[#F6F3EB] bg-[#181818] dark:bg-[#F4EFEB] dark:text-[#181818] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed rounded-full shadow-md border border-[#181818]/30 transition-all active:scale-[0.98]"
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
