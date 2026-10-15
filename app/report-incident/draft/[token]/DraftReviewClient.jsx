"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  PhoneCall,
  Clock,
  Sparkles,
  Check,
  FileText,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Globe,
  Copy,
  Mail,
  Send,
  Wallet,
  Smartphone,
  ShieldCheck,
  Building2,
  Share2,
  FileDown,
  MessageSquare,
  Mic,
  MicOff,
  BadgeAlert,
  Wand2,
  RefreshCw,
} from "lucide-react";
import {
  BANK_DIRECTORY,
  getBankCodeFromName,
  generate1930Script,
  generatePortalMappings,
  generateBankDisputeEmail,
  generatePlatformReportingGuide,
} from "../../../../lib/actionPackEngine";
import { generateComplaintPackPDF } from "../../../../lib/pdfGenerator";
import VoiceIntakeStudio from "../../../../components/VoiceIntakeStudio";

export default function DraftReviewClient({ initialDraft, token }) {
  const draft = initialDraft;
  const inc = draft?.incident || {};

  // Editable review fields pre-populated IMMEDIATELY from initialDraft
  const [incidentType, setIncidentType] = useState(inc.incident_type || "financial_fraud");
  const [amountInr, setAmountInr] = useState(
    inc.amount_inr !== null && inc.amount_inr !== undefined ? String(inc.amount_inr) : ""
  );
  const [dateTime, setDateTime] = useState(inc.date_time || "");
  const [paymentMethod, setPaymentMethod] = useState(inc.payment_method || "UPI");
  const [transactionIds, setTransactionIds] = useState(
    Array.isArray(inc.transaction_ids) ? inc.transaction_ids.join(", ") : ""
  );
  const [bankName, setBankName] = useState(inc.bank_name || "");
  const [scammerPhone, setScammerPhone] = useState(
    inc.scammer_identifiers?.phones?.join(", ") || ""
  );
  const [scammerUpi, setScammerUpi] = useState(
    inc.scammer_identifiers?.upi_ids?.join(", ") || inc.scammer_identifiers?.upi?.join(", ") || ""
  );
  const [scammerPlatform, setScammerPlatform] = useState(
    inc.scammer_identifiers?.platform ||
      (draft?.source === "whatsapp_voice" ? "WhatsApp Voice" : "WhatsApp")
  );
  const [timelineSummary, setTimelineSummary] = useState(
    inc.timeline_summary || draft?.transcript || ""
  );
  const [complainantName, setComplainantName] = useState(
    inc.complainant_name || inc.victim_name || draft?.userName || ""
  );

  // Live Re-extraction & Studio State
  const [liveNarrative, setLiveNarrative] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  // Confirmation & Action Pack State (Default UNLOCKED for zero friction)
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [actionPackTab, setActionPackTab] = useState("1930"); // "1930" | "portal" | "bank" | "platform"
  // Initialize selectedBankCode dynamically from extracted incident bankName rather than hardcoding SBI
  const [selectedBankCode, setSelectedBankCode] = useState(() =>
    getBankCodeFromName(inc.bank_name || "")
  );
  const [customNodalEmail, setCustomNodalEmail] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  useEffect(() => {
    console.log("===> DRAFT REVIEW CLIENT MOUNTED <===");
  }, []);

  // Sync selected bank code whenever bankName changes
  useEffect(() => {
    if (bankName) {
      const code = getBankCodeFromName(bankName);
      setSelectedBankCode(code);
    }
  }, [bankName]);

  const copyToClipboard = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleConsumeDraft = async () => {
    try {
      await fetch(`/api/incident/draft/${token}`, { method: "POST" });
    } catch {}
  };

  const applyExtractedIncident = async (newInc, transcriptText) => {
    if (newInc.incident_type) setIncidentType(newInc.incident_type);
    if (newInc.amount_inr !== null && newInc.amount_inr !== undefined) {
      setAmountInr(String(newInc.amount_inr));
    }
    if (newInc.date_time) setDateTime(newInc.date_time);
    if (newInc.payment_method) setPaymentMethod(newInc.payment_method);
    if (Array.isArray(newInc.transaction_ids) && newInc.transaction_ids.length > 0) {
      setTransactionIds(newInc.transaction_ids.join(", "));
    }
    if (newInc.bank_name) setBankName(newInc.bank_name);
    if (newInc.scammer_identifiers?.phones?.length) {
      setScammerPhone(newInc.scammer_identifiers.phones.join(", "));
    }
    if (newInc.scammer_identifiers?.upi_ids?.length) {
      setScammerUpi(newInc.scammer_identifiers.upi_ids.join(", "));
    }
    if (newInc.scammer_identifiers?.platform) {
      setScammerPlatform(newInc.scammer_identifiers.platform);
    }
    if (newInc.complainant_name) {
      setComplainantName(newInc.complainant_name);
    }
    if (newInc.timeline_summary || transcriptText) {
      setTimelineSummary(newInc.timeline_summary || transcriptText);
    }

    // Persist updated draft to server
    try {
      await fetch(`/api/incident/draft/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: newInc,
          complainantName: newInc.complainant_name || complainantName,
          transcript: transcriptText,
        }),
      });
    } catch {}
  };

  const handleVoiceNoteConfirmed = async ({ originalTranscript, englishTranscript, confirmedNumbers }) => {
    let combined = englishTranscript || originalTranscript;
    if (confirmedNumbers?.utr && !combined.includes(confirmedNumbers.utr)) {
      combined += ` Transaction UTR / Reference number is ${confirmedNumbers.utr}.`;
    }
    if (confirmedNumbers?.upi && !combined.includes(confirmedNumbers.upi)) {
      combined += ` Scammer UPI ID is ${confirmedNumbers.upi}.`;
    }
    if (confirmedNumbers?.amount && !combined.includes(confirmedNumbers.amount)) {
      combined += ` Amount lost is ₹${confirmedNumbers.amount}.`;
    }
    setLiveNarrative(combined);
    await handleExtractWithCustomText(combined);
  };

  const handleExtractWithCustomText = async (customText = null) => {
    const textToUse = (typeof customText === "string" ? customText : liveNarrative).trim();
    if (!textToUse) return;
    setIsExtracting(true);
    setExtractSuccess("");

    try {
      const res = await fetch("/api/incident/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: textToUse }),
      });
      const data = await res.json();
      if (data.success && data.incident) {
        await applyExtractedIncident(data.incident, textToUse);
        setExtractSuccess("✓ Successfully extracted your incident details! All complaint letters updated below.");
        setLiveNarrative("");
      } else {
        alert(data.error || "Could not extract incident facts. Please check text.");
      }
    } catch (err) {
      alert("Extraction error: " + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractWithText = async () => {
    await handleExtractWithCustomText();
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunks, { type: mimeType });
        await handleExtractWithAudioBlob(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission was denied or is not supported. You can type or paste your story into the box instead.");
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleExtractWithAudioBlob = async (blob) => {
    setIsExtracting(true);
    setExtractSuccess("");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "user_voice_note.webm");

      const res = await fetch("/api/incident/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.incident) {
        await applyExtractedIncident(data.incident, data.transcript || "");
        setExtractSuccess("✓ Voice note transcribed & extracted! Facts and filing letters updated below.");
      } else {
        alert(data.error || "Audio transcription was unable to parse audio.");
      }
    } catch (err) {
      alert("Audio processing error: " + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  // Compile active review state
  const activeIncident = {
    incident_type: incidentType,
    amount_inr: amountInr ? parseFloat(amountInr.replace(/,/g, "")) : null,
    currency: "INR",
    date_time: dateTime || null,
    payment_method: paymentMethod || "UPI",
    transaction_ids: transactionIds
      ? transactionIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    bank_name: bankName || null,
    scammer_identifiers: {
      phones: scammerPhone ? scammerPhone.split(",").map((s) => s.trim()).filter(Boolean) : [],
      upi_ids: scammerUpi ? scammerUpi.split(",").map((s) => s.trim()).filter(Boolean) : [],
      platform: scammerPlatform || "WhatsApp",
    },
    timeline_summary: timelineSummary,
    complainant_name: complainantName || "",
    money_lost_recently: true,
    urgency: incidentType === "financial_fraud" && amountInr ? "high" : "medium",
  };

  // Debounced auto-save so user edits are persisted to disk automatically
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/incident/draft/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: activeIncident,
          complainantName,
          transcript: timelineSummary,
        }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [
    incidentType,
    amountInr,
    dateTime,
    paymentMethod,
    transactionIds,
    bankName,
    scammerPhone,
    scammerUpi,
    scammerPlatform,
    timelineSummary,
    complainantName,
    token,
  ]);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      const doc = generateComplaintPackPDF(activeIncident, {
        userName: complainantName || draft?.userName || "Victim / Complainant",
        userPhone: draft?.phoneNumber || "Not provided",
        userEmail: "",
        selectedBankCode,
        customNodalEmail,
      });

      doc.save(`Crosscheck_Complaint_Pack_${Date.now()}.pdf`);
      setPdfSuccess(true);
      await handleConsumeDraft();
    } catch (err) {
      console.error("[PDF Generation Failure]:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const script1930 = generate1930Script(activeIncident);
  const portalMappings = generatePortalMappings(activeIncident);
  const bankDispute = generateBankDisputeEmail(activeIncident, selectedBankCode, customNodalEmail, {
    complainantName,
    userPhone: draft?.phoneNumber,
  });
  const platformGuides = generatePlatformReportingGuide(activeIncident);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans antialiased pb-24">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-black/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-black transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-serif font-bold text-sm tracking-tight text-gray-950">
              CROSSCHECK <span className="font-sans font-normal text-xs text-gray-500">/ WHATSAPP INTAKE</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Channel
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* MANDATORY WHATSAPP INTAKE VERIFIED BANNER */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-md border border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              {draft?.source === "whatsapp_voice" ? <Mic className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  {draft?.source === "whatsapp_voice" ? "WhatsApp Voice Note Transcribed" : "WhatsApp Intake Verified"}
                </span>
                {draft?.phoneNumber && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-gray-300">
                    From: {draft.phoneNumber}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-serif font-bold tracking-tight text-white mt-0.5">
                Intake via WhatsApp verified channel. Review and adjust any pre-filled facts before generating your complaint pack.
              </h1>
              <p className="text-xs text-emerald-100/80 mt-1">
                All extracted facts have been pre-filled below. You can edit any details or re-record your voice note to update everything automatically.
              </p>
            </div>
          </div>
        </div>


        {/* INTERACTIVE VOICE & TEXT INTAKE STUDIO */}
        <div className="space-y-4">
          <VoiceIntakeStudio
            onTranscriptConfirmed={handleVoiceNoteConfirmed}
            initialText={liveNarrative}
            submitButtonText="Extract & Update All Complaint Packs"
          />

          <div className="p-5 bg-white border border-black/15 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="font-serif font-bold text-sm text-gray-950">
                Or Type &amp; Refine Incident Narrative
              </h3>
            </div>

            <div className="relative">
              <textarea
                id="narrative-input-box"
                rows={3}
                value={liveNarrative}
                onChange={(e) => setLiveNarrative(e.target.value)}
                placeholder="e.g. 'Mere ₹35,000 SBI se transfer karwa liye scammer ne... UTR number 987654321012 hai aur scammer ka phone 9876543210 tha...'"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExtractWithText}
                disabled={isExtracting || !liveNarrative.trim()}
                className="px-5 py-2 rounded-xl bg-black text-white hover:bg-black/85 disabled:opacity-40 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Facts with AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Extract &amp; Update Pack</span>
                  </>
                )}
              </button>
            </div>

            {extractSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{extractSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Pre-filled Facts Form */}
        <section className="bg-white border border-black/15 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-950">Review &amp; Edit Incident Details</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Correct any spelling or missing numbers. These fields populate your Police FIR, Cybercrime Portal copy, and Bank Dispute pack.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Details Ready for Filing</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Incident Type */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Incident Category</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="financial_fraud">Financial Fraud / UPI Scam / Unauthorized Debit</option>
                <option value="impersonation">Identity Theft / Police or Official Impersonation</option>
                <option value="sextortion">Sextortion / Video Call Blackmail</option>
                <option value="harassment">Cyber Harassment / Threat / Doxxing</option>
                <option value="phishing">Phishing Link / Credential Harvesting</option>
                <option value="other">Other Cyber Incident</option>
              </select>
            </div>

            {/* Amount INR */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Disputed Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-500">₹</span>
                <input
                  type="text"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  placeholder="e.g. 48500"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono font-medium"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Date &amp; Time of Occurrence</label>
              <input
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="e.g. Today at 10:15 AM or 15 Oct 2026, 14:30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm, BHIM)</option>
                <option value="netbanking">NetBanking / IMPS / NEFT / RTGS</option>
                <option value="card">Debit / Credit Card</option>
                <option value="wallet">Mobile Wallet / Gift Card</option>
                <option value="crypto">Cryptocurrency Transfer</option>
                <option value="none">No money debited (Attempt only)</option>
              </select>
            </div>

            {/* Transaction UTR / Ref */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Transaction Reference (UTR / Txn ID)</label>
              <input
                type="text"
                value={transactionIds}
                onChange={(e) => setTransactionIds(e.target.value)}
                placeholder="e.g. 429184719283 (critical for 1930 freeze)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono font-bold"
              />
            </div>

            {/* Victim's Bank Name */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Debited Bank Name</label>
              <input
                type="text"
                id="input-bank-name"
                value={bankName}
                onChange={(e) => {
                  const val = e.target.value;
                  setBankName(val);
                  const code = getBankCodeFromName(val);
                  if (code) setSelectedBankCode(code);
                }}
                placeholder="e.g. State Bank of India, HDFC, ICICI"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Complainant Name */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                <span>Complainant / Account Holder Name</span>
                <span className="text-[10px] text-gray-400 font-normal">Populates Bank Dispute Signature</span>
              </label>
              <input
                type="text"
                id="input-complainant-name"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-medium"
              />
            </div>

            {/* WhatsApp Mobile Number (Verified Intake) */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                <span>Registered WhatsApp Number</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-linked from WhatsApp
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={
                  draft?.phoneNumber
                    ? draft.phoneNumber.startsWith("91") && draft.phoneNumber.length === 12
                      ? `+91 ${draft.phoneNumber.slice(2, 7)} ${draft.phoneNumber.slice(7)}`
                      : draft.phoneNumber.length === 10
                      ? `+91 ${draft.phoneNumber.slice(0, 5)} ${draft.phoneNumber.slice(5)}`
                      : draft.phoneNumber
                    : "Not available"
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-gray-50/80 text-xs text-gray-700 font-mono font-bold cursor-default"
              />
            </div>

            {/* Scammer Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Scammer Phone / Caller ID</label>
              <input
                type="text"
                value={scammerPhone}
                onChange={(e) => setScammerPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>

            {/* Scammer UPI ID */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">Scammer UPI ID / Beneficiary Account</label>
              <input
                type="text"
                value={scammerUpi}
                onChange={(e) => setScammerUpi(e.target.value)}
                placeholder="e.g. fraudster@oksbi or account number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
              />
            </div>
          </div>

          {/* Timeline Summary Narrative */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">Factual Timeline Narrative</label>
            <textarea
              rows={4}
              value={timelineSummary}
              onChange={(e) => setTimelineSummary(e.target.value)}
              placeholder="Describe the chronological facts of the incident..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed font-sans"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Transcribed from your WhatsApp voice note or message. You can adjust names, timestamps, or details anytime.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="confirm-facts-checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-black/20 text-black focus:ring-black"
              />
              <span className="text-xs text-gray-700 font-medium group-hover:text-black transition">
                I verify that the incident details and transaction references above are accurate.
              </span>
            </label>

            <button
              type="button"
              id="unlock-action-pack-btn"
              onClick={() => {
                setIsConfirmed(true);
                const el = document.getElementById("action-pack-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 bg-emerald-600 text-white cursor-pointer shadow-xs hover:bg-emerald-500"
            >
              <Check className="w-4 h-4" />
              <span>Unlock &amp; View Action Pack Below ↓</span>
            </button>
          </div>
        </section>

        {/* Step 2: 4 Action Pack Tabs (ALWAYS VISIBLE & FULLY INTERACTIVE) */}
        <div id="action-pack-section" className="space-y-6 pt-2">
          {/* Section Heading */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-gray-950">Filing Action Pack</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pre-filled statutory scripts, dispute notices, and copy fields ready for immediate use.
              </p>
            </div>
          </div>

          {/* 4 Action Tabs Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <button
              type="button"
              id="tab-1930"
              data-tab="1930"
              onClick={() => {
                setActionPackTab("1930");
                if (typeof window !== "undefined" && window.crosscheckSwitchTab) {
                  window.crosscheckSwitchTab("1930");
                }
              }}
              className={`w-full min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none touch-manipulation active:scale-[0.98] ${
                actionPackTab === "1930"
                  ? "bg-red-600 text-white border border-red-600 shadow-md ring-2 ring-red-500/20"
                  : "bg-white text-gray-700 border border-black/10 hover:bg-black/5"
              }`}
            >
              <PhoneCall className={`w-3.5 h-3.5 ${actionPackTab === "1930" ? "text-white" : "text-red-600"}`} />
              <span>1. Dial 1930 (Golden Hour)</span>
            </button>

            <button
              type="button"
              id="tab-portal"
              data-tab="portal"
              onClick={() => {
                setActionPackTab("portal");
                if (typeof window !== "undefined" && window.crosscheckSwitchTab) {
                  window.crosscheckSwitchTab("portal");
                }
              }}
              className={`w-full min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none touch-manipulation active:scale-[0.98] ${
                actionPackTab === "portal"
                  ? "bg-blue-600 text-white border border-blue-600 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white text-gray-700 border border-black/10 hover:bg-black/5"
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${actionPackTab === "portal" ? "text-white" : "text-blue-600"}`} />
              <span>2. Cybercrime.gov.in Fields</span>
            </button>

            <button
              type="button"
              id="tab-bank"
              data-tab="bank"
              onClick={() => {
                setActionPackTab("bank");
                if (typeof window !== "undefined" && window.crosscheckSwitchTab) {
                  window.crosscheckSwitchTab("bank");
                }
              }}
              className={`w-full min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none touch-manipulation active:scale-[0.98] ${
                actionPackTab === "bank"
                  ? "bg-amber-600 text-white border border-amber-600 shadow-md ring-2 ring-amber-500/20"
                  : "bg-white text-gray-700 border border-black/10 hover:bg-black/5"
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${actionPackTab === "bank" ? "text-white" : "text-amber-600"}`} />
              <span>3. Bank Dispute Notice</span>
            </button>

            <button
              type="button"
              id="tab-platform"
              data-tab="platform"
              onClick={() => {
                setActionPackTab("platform");
                if (typeof window !== "undefined" && window.crosscheckSwitchTab) {
                  window.crosscheckSwitchTab("platform");
                }
              }}
              className={`w-full min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none touch-manipulation active:scale-[0.98] ${
                actionPackTab === "platform"
                  ? "bg-purple-600 text-white border border-purple-600 shadow-md ring-2 ring-purple-500/20"
                  : "bg-white text-gray-700 border border-black/10 hover:bg-black/5"
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${actionPackTab === "platform" ? "text-white" : "text-purple-600"}`} />
              <span>4. Platform Reporting</span>
            </button>
          </div>

          {/* Synchronous Tab Switching & Copy Fallback Script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var tabs = ['1930', 'portal', 'bank', 'platform'];
                  var activeConfig = {
                    '1930': {
                      btnClasses: ['bg-red-600', 'text-white', 'border-red-600', 'shadow-md', 'ring-2', 'ring-red-500/20'],
                      iconActive: 'text-white',
                      iconInactive: 'text-red-600'
                    },
                    'portal': {
                      btnClasses: ['bg-blue-600', 'text-white', 'border-blue-600', 'shadow-md', 'ring-2', 'ring-blue-500/20'],
                      iconActive: 'text-white',
                      iconInactive: 'text-blue-600'
                    },
                    'bank': {
                      btnClasses: ['bg-amber-600', 'text-white', 'border-amber-600', 'shadow-md', 'ring-2', 'ring-amber-500/20'],
                      iconActive: 'text-white',
                      iconInactive: 'text-amber-600'
                    },
                    'platform': {
                      btnClasses: ['bg-purple-600', 'text-white', 'border-purple-600', 'shadow-md', 'ring-2', 'ring-purple-500/20'],
                      iconActive: 'text-white',
                      iconInactive: 'text-purple-600'
                    }
                  };
                  var inactiveBtnClasses = ['bg-white', 'text-gray-700', 'border-black/10', 'hover:bg-black/5'];

                  function doSwitch(target) {
                    tabs.forEach(function(t) {
                      var p = document.getElementById('panel-' + t);
                      var b = document.getElementById('tab-' + t);
                      if (p) p.style.display = (t === target) ? 'block' : 'none';
                      if (b) {
                        tabs.forEach(function(ot) {
                          activeConfig[ot].btnClasses.forEach(function(c) { b.classList.remove(c); });
                        });
                        inactiveBtnClasses.forEach(function(c) { b.classList.remove(c); });

                        var icon = b.querySelector('svg');
                        if (t === target) {
                          activeConfig[t].btnClasses.forEach(function(c) { b.classList.add(c); });
                          if (icon) {
                            icon.classList.remove(activeConfig[t].iconInactive);
                            icon.classList.add(activeConfig[t].iconActive);
                          }
                        } else {
                          inactiveBtnClasses.forEach(function(c) { b.classList.add(c); });
                          if (icon) {
                            icon.classList.remove(activeConfig[t].iconActive);
                            icon.classList.add(activeConfig[t].iconInactive);
                          }
                        }
                      }
                    });
                  }

                  window.crosscheckSwitchTab = doSwitch;

                  var bankDirectory = [
                    { code: "SBI", name: "State Bank of India (SBI)", email: "customercare@sbi.co.in" },
                    { code: "HDFC", name: "HDFC Bank", email: "grievance.redressal@hdfcbank.com" },
                    { code: "ICICI", name: "ICICI Bank", email: "headservicequality@icicibank.com" },
                    { code: "AXIS", name: "Axis Bank", email: "nodalofficer@axisbank.com" },
                    { code: "PNB", name: "Punjab National Bank (PNB)", email: "nodalofficer@pnb.co.in" },
                    { code: "BOB", name: "Bank of Baroda (BoB)", email: "nodal.officer@bankofbaroda.com" },
                    { code: "KOTAK", name: "Kotak Mahindra Bank", email: "nodalofficer@kotak.com" },
                    { code: "CANARA", name: "Canara Bank", email: "nodalofficer@canarabank.com" },
                    { code: "INDUSIND", name: "IndusInd Bank", email: "nodal.officer@indusind.com" },
                    { code: "UNION", name: "Union Bank of India", email: "grievances@unionbankofindia.bank" }
                  ];

                  function syncBankNotice(bankCode) {
                    var b = bankDirectory.find(function(item) { return item.code === bankCode; });
                    if (!b) return;
                    var emailEl = document.getElementById("bank-nodal-email-text");
                    var emailBtn = document.getElementById("bank-nodal-email-copy-btn");
                    var bodyEl = document.getElementById("bank-letter-body-text");
                    var bodyBtn = document.getElementById("bank-letter-copy-btn");
                    var openBtn = document.getElementById("bank-open-email-btn");
                    var subjEl = document.getElementById("bank-subject-text");

                    if (emailEl) emailEl.textContent = b.email;
                    if (emailBtn) emailBtn.setAttribute("data-copy-text", b.email);
                    if (bodyEl) {
                      var oldText = bodyEl.textContent || "";
                      var nl = String.fromCharCode(10);
                      var lines = oldText.split(nl);
                      if (lines.length > 1) {
                        lines[1] = b.name;
                        bodyEl.textContent = lines.join(nl);
                      }
                      if (bodyBtn) bodyBtn.setAttribute("data-copy-text", bodyEl.textContent);
                      if (openBtn && subjEl) {
                        openBtn.href = "mailto:" + b.email + "?subject=" + encodeURIComponent(subjEl.textContent) + "&body=" + encodeURIComponent(bodyEl.textContent);
                      }
                    }
                  }

                  function bindBankSelect() {
                    var sel = document.getElementById("bank-select");
                    if (sel && !sel.__bound) {
                      sel.__bound = true;
                      sel.addEventListener("change", function(e) {
                        syncBankNotice(e.target.value);
                      });
                    }
                  }

                  function bind() {
                    tabs.forEach(function(t) {
                      var b = document.getElementById('tab-' + t);
                      if (b && !b.__tabBound) {
                        b.__tabBound = true;
                        b.addEventListener('click', function(e) {
                          doSwitch(t);
                        });
                      }
                    });
                    bindBankSelect();
                  }

                  bind();
                  if (typeof document !== 'undefined') {
                    if (document.readyState === 'loading') {
                      document.addEventListener('DOMContentLoaded', bind);
                    }
                    setTimeout(bind, 50);
                    setTimeout(bind, 250);
                  }

                  // Native fallback for copy buttons
                  if (typeof document !== 'undefined' && !window.__copyBound) {
                    window.__copyBound = true;
                    document.addEventListener('click', function(e) {
                      var btn = e.target.closest('[data-copy-text]');
                      if (btn) {
                        var text = btn.getAttribute('data-copy-text');
                        if (text && navigator.clipboard) {
                          navigator.clipboard.writeText(text).then(function() {
                            var originalContent = btn.innerHTML;
                            btn.innerHTML = '<span class="text-emerald-600 font-bold">✓ Copied!</span>';
                            setTimeout(function() { btn.innerHTML = originalContent; }, 2000);
                          }).catch(function() {});
                        }
                      }
                    });
                  }
                })();
              `,
            }}
          />

          {/* Tab 1: 1930 Script Panel */}
          <div
            id="panel-1930"
            style={{ display: actionPackTab === "1930" ? "block" : "none" }}
            className="p-6 bg-white border border-red-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in-0 duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-2.5 text-red-700 font-bold text-sm">
                <PhoneCall className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-serif font-bold text-base text-red-950">Immediate Action: Dial 1930 National Cyber Fraud Helpline</h3>
                  <p className="text-xs text-red-800 font-normal mt-0.5">Free 24x7 Emergency Inter-bank Freeze Operator</p>
                </div>
              </div>
              <a
                href="tel:1930"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call 1930 Now</span>
              </a>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Call <strong>1930</strong> immediately from your phone. When the police operator answers, read this exact pre-filled script. This initiates the emergency inter-bank lien to freeze the fraudster&apos;s account before they withdraw cash:
            </p>

            <div className="space-y-3 pt-2">
              {script1930.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs transition ${
                    step.critical
                      ? "bg-red-50/70 border-red-200 text-red-950 font-medium"
                      : "bg-gray-50 border-gray-200 text-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span className="font-bold text-gray-700">Operator: &ldquo;{step.operatorPrompt}&rdquo;</span>
                    <span className="font-mono text-[10px]">Step {idx + 1}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sans font-bold text-sm">{step.answer}</p>
                    <button
                      type="button"
                      data-copy-text={step.answer}
                      onClick={() => copyToClipboard(step.answer, `step_${idx}`)}
                      className="px-2.5 py-1 rounded-md bg-white border border-black/10 hover:bg-gray-100 text-[11px] font-medium shrink-0 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === `step_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === `step_${idx}` ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab 2: Cybercrime Portal Copy Fields Panel */}
          <div
            id="panel-portal"
            style={{ display: actionPackTab === "portal" ? "block" : "none" }}
            className="p-6 bg-white border border-blue-200 rounded-2xl shadow-sm space-y-5 animate-in fade-in-0 duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <h3 className="font-serif font-bold text-base text-blue-950">National Cyber Crime Reporting Portal (cybercrime.gov.in)</h3>
                  <p className="text-xs text-blue-800 font-normal mt-0.5">Ministry of Home Affairs Formal Registration System</p>
                </div>
              </div>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 shadow-sm"
              >
                <span>Open cybercrime.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Go to <strong>cybercrime.gov.in &gt; Report Other Cyber Crimes &gt; Financial Fraud</strong>. Use these 1-click copy fields to fill out the portal without retyping:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">Category</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">{portalMappings.category}</p>
                </div>
                <button
                  type="button"
                  data-copy-text={portalMappings.category}
                  onClick={() => copyToClipboard(portalMappings.category, "cat")}
                  className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-xs transition cursor-pointer"
                >
                  {copiedKey === "cat" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">Sub-Category</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">{portalMappings.subCategory}</p>
                </div>
                <button
                  type="button"
                  data-copy-text={portalMappings.subCategory}
                  onClick={() => copyToClipboard(portalMappings.subCategory, "subcat")}
                  className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-xs transition cursor-pointer"
                >
                  {copiedKey === "subcat" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">Disputed Amount</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5 font-mono">{portalMappings.amount ? `₹${portalMappings.amount}` : "Not specified"}</p>
                </div>
                {portalMappings.amount && (
                  <button
                    type="button"
                    data-copy-text={String(portalMappings.amount)}
                    onClick={() => copyToClipboard(portalMappings.amount, "amt")}
                    className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-xs transition cursor-pointer"
                  >
                    {copiedKey === "amt" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block font-mono">Transaction Reference (UTR)</span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5 font-mono">{portalMappings.transactionId || "Pending"}</p>
                </div>
                {portalMappings.transactionId && (
                  <button
                    type="button"
                    data-copy-text={portalMappings.transactionId}
                    onClick={() => copyToClipboard(portalMappings.transactionId, "utr")}
                    className="p-1.5 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-xs transition cursor-pointer"
                  >
                    {copiedKey === "utr" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500 font-mono">Narrative Description (Copy &amp; Paste into Portal)</span>
                <button
                  type="button"
                  data-copy-text={portalMappings.description}
                  onClick={() => copyToClipboard(portalMappings.description, "portalDesc")}
                  className="px-3 py-1 rounded-lg border border-black/15 bg-white hover:bg-black/5 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey === "portalDesc" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "portalDesc" ? "Copied Description!" : "Copy Description"}</span>
                </button>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                {portalMappings.description}
              </div>
            </div>
          </div>

          {/* Tab 3: Bank Dispute Panel */}
          <div
            id="panel-bank"
            style={{ display: actionPackTab === "bank" ? "block" : "none" }}
            className="p-6 bg-white border border-amber-200 rounded-2xl shadow-sm space-y-5 animate-in fade-in-0 duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <div>
                <h3 className="font-serif font-bold text-base text-gray-950">RBI Zero-Liability Bank Dispute Notice</h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  Statutory notice under RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="bank-select" className="text-xs font-medium text-gray-600">Bank:</label>
                <select
                  id="bank-select"
                  value={selectedBankCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setSelectedBankCode(newCode);
                    const bObj = BANK_DIRECTORY.find((b) => b.code === newCode);
                    if (bObj) {
                      setBankName(bObj.name);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-black/15 text-xs font-bold bg-white text-gray-900 cursor-pointer"
                >
                  {BANK_DIRECTORY.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-700">Nodal Officer Email:</span>
                <div className="flex items-center gap-2">
                  <span id="bank-nodal-email-text" className="font-mono text-gray-900 font-semibold">{bankDispute.toEmail}</span>
                  <button
                    type="button"
                    id="bank-nodal-email-copy-btn"
                    data-copy-text={bankDispute.toEmail}
                    onClick={() => copyToClipboard(bankDispute.toEmail, "nodalEmail")}
                    className="p-1 rounded hover:bg-gray-200 transition cursor-pointer"
                  >
                    {copiedKey === "nodalEmail" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-700">Subject:</span>
                <div className="flex items-center gap-2 max-w-md truncate">
                  <span id="bank-subject-text" className="font-semibold text-gray-950 truncate">{bankDispute.subject}</span>
                  <button
                    type="button"
                    id="bank-subject-copy-btn"
                    data-copy-text={bankDispute.subject}
                    onClick={() => copyToClipboard(bankDispute.subject, "bankSubj")}
                    className="p-1 rounded hover:bg-gray-200 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === "bankSubj" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              </div>
              <div id="bank-letter-body-text" className="pt-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-800 max-h-64 overflow-y-auto bg-white p-3.5 rounded-lg border border-gray-200">
                {bankDispute.body}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                id="bank-letter-copy-btn"
                data-copy-text={bankDispute.body}
                onClick={() => copyToClipboard(bankDispute.body, "bankEmail")}
                className="px-4 py-2 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                {copiedKey === "bankEmail" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === "bankEmail" ? "Copied Dispute Letter!" : "Copy Dispute Letter"}</span>
              </button>
              <a
                id="bank-open-email-btn"
                href={bankDispute.mailtoUrl || `mailto:${bankDispute.toEmail}?subject=${encodeURIComponent(bankDispute.subject)}&body=${encodeURIComponent(bankDispute.body)}`}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Mail className="w-4 h-4" />
                <span>Open in Email Client</span>
              </a>
            </div>
          </div>

          {/* Tab 4: Platform Reporting Panel */}
          <div
            id="panel-platform"
            style={{ display: actionPackTab === "platform" ? "block" : "none" }}
            className="p-6 bg-white border border-purple-200 rounded-2xl shadow-sm space-y-5 animate-in fade-in-0 duration-200"
          >
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-purple-700" />
                <span>In-App Platform Abuse Reporting &amp; Account Freezing</span>
              </div>
              <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                In addition to the police complaint, submit in-app reports directly to de-platform scam accounts, freeze recipient wallets, and disconnect fraudulent phone lines:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platformGuides.map((guide, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#FCFBF8] border border-black/10 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>{guide.platform}</span>
                      </span>
                      {guide.url && (
                        <a
                          href={guide.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <span>Open Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1.5 leading-relaxed pl-1">
                      {guide.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {guide.copySnippet && (
                    <div className="p-3 bg-white rounded-xl border border-black/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                        <span>PASTE INTO REPORT DESCRIPTION:</span>
                        <button
                          type="button"
                          data-copy-text={guide.copySnippet}
                          onClick={() => copyToClipboard(guide.copySnippet, `plat_${idx}`)}
                          className="px-2 py-0.5 rounded border border-black/10 bg-gray-50 hover:bg-gray-100 text-[10px] font-sans font-medium flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedKey === `plat_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === `plat_${idx}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-800 font-mono line-clamp-3 leading-relaxed">
                        {guide.copySnippet}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3-PAGE PDF DOWNLOAD & EVIDENCE VAULT INTEGRATION */}
          <div className="p-6 rounded-3xl bg-gray-950 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Official Document Pack
                  </span>
                  <span className="text-xs text-gray-400">PDF &bull; 3 Pages</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-white mt-1">
                  Download Formal Police &amp; Bank Complaint Pack
                </h3>
                <p className="text-xs text-gray-300 max-w-xl mt-0.5">
                  Includes: (1) Cyber Police Complaint formatted under BNS &amp; IT Act, (2) Formal RBI Bank Dispute Notice with statutory deadlines, and (3) Digital Evidence Checklist.
                </p>
              </div>

              <button
                type="button"
                id="download-pdf-btn"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 whitespace-nowrap"
              >
                {isGeneratingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Generating 3-Page Pack...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Download Complaint Pack</span>
                  </>
                )}
              </button>
            </div>

            {pdfSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PDF Downloaded successfully! A permanent copy can be archived in your Evidence Vault.</span>
                </span>
                <Link
                  href="/dashboard?nav=vault"
                  className="font-bold underline text-white hover:text-emerald-300 text-[11px]"
                >
                  Open Evidence Vault →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
