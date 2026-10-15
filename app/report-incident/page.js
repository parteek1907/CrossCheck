"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  PhoneCall,
  Clock,
  Sparkles,
  HelpCircle,
  Check,
  FileText,
  AlertTriangle,
  Mic,
  MicOff,
  Languages,
  RotateCcw,
  SkipForward,
  MessageSquare,
  CornerDownRight,
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
  Download,
  Archive,
  FileDown,
} from "lucide-react";
import { getNextFollowUpQuestion, countMissingFollowUps } from "../../lib/followUpEngine";
import {
  BANK_DIRECTORY,
  getBankCodeFromName,
  generate1930Script,
  generatePortalMappings,
  generateBankDisputeEmail,
  generatePlatformReportingGuide,
} from "../../lib/actionPackEngine";
import { generateComplaintPackPDF } from "../../lib/pdfGenerator";
import VoiceIntakeStudio from "../../components/VoiceIntakeStudio";

export default function ReportIncidentPage() {
  const [narrative, setNarrative] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Stage: "input" | "follow_up" | "review"
  const [stage, setStage] = useState("input");
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en"); // "en" | "hi"
  const [interimTranscript, setInterimTranscript] = useState("");
  const [micError, setMicError] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  // Extracted incident state
  const [incident, setIncident] = useState(null);

  // Follow-up conversation state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpStepNumber, setFollowUpStepNumber] = useState(1);
  const [totalFollowUps, setTotalFollowUps] = useState(3);
  const [skippedKeys, setSkippedKeys] = useState([]);
  const [answeredKeys, setAnsweredKeys] = useState([]);

  // Editable review fields
  const [incidentType, setIncidentType] = useState("financial_fraud");
  const [amountInr, setAmountInr] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionIds, setTransactionIds] = useState("");
  const [bankName, setBankName] = useState("");
  const [scammerPhone, setScammerPhone] = useState("");
  const [scammerUpi, setScammerUpi] = useState("");
  const [scammerPlatform, setScammerPlatform] = useState("");
  const [timelineSummary, setTimelineSummary] = useState("");

  // Confirmation & Action Pack State
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [actionPackTab, setActionPackTab] = useState("1930"); // "1930" | "portal" | "bank" | "platform"
  const [selectedBankCode, setSelectedBankCode] = useState("SBI");
  const [customNodalEmail, setCustomNodalEmail] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Check speech support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSpeechSupported(false);
      }
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Update selected bank code automatically if bankName matches directory
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
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    }
  };

  const startListening = () => {
    setMicError("");
    setError("");

    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError("Speech recognition is not supported in this browser. Please type your story below.");
      setIsSpeechSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage === "hi" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setMicError("");
      };

      recognition.onresult = (event) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (finalChunk) {
          if (stageRef.current === "follow_up") {
            setFollowUpAnswer((prev) => (prev ? prev.trim() + " " + finalChunk : finalChunk));
          } else {
            setNarrative((prev) => (prev ? prev.trim() + " " + finalChunk : finalChunk));
          }
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event) => {
        console.warn("[Speech] Recognition event error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicError("Microphone access was denied. Please allow microphone permissions in your browser settings or use typing input.");
        } else if (event.error === "no-speech") {
          return;
        } else {
          setMicError(`Microphone notice: ${event.error}. You can continue typing.`);
        }
        setIsListening(false);
        setInterimTranscript("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[Speech] Start failure:", err);
      setMicError("Could not start microphone. Please type your input.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const switchLanguage = (lang) => {
    setSpeechLanguage(lang);
    if (isListening) {
      stopListening();
      setTimeout(() => {
        setSpeechLanguage(lang);
      }, 150);
    }
  };

  const populateReviewState = (inc) => {
    setIncidentType(inc.incident_type || "financial_fraud");
    setAmountInr(inc.amount_inr !== null && inc.amount_inr !== undefined ? String(inc.amount_inr) : "");
    setDateTime(inc.date_time || "");
    setPaymentMethod(inc.payment_method || "UPI");
    setTransactionIds(Array.isArray(inc.transaction_ids) ? inc.transaction_ids.join(", ") : "");
    setBankName(inc.bank_name || "");
    setScammerPhone(inc.scammer_identifiers?.phones?.join(", ") || "");
    setScammerUpi(inc.scammer_identifiers?.upi?.join(", ") || inc.scammer_identifiers?.upi_ids?.join(", ") || "");
    setScammerPlatform(inc.scammer_identifiers?.platform || "");
    setTimelineSummary(inc.timeline_summary || "");
    setIsConfirmed(true);
  };

  const handleVoiceTranscriptConfirmed = ({ originalTranscript, englishTranscript, confirmedNumbers }) => {
    let combined = englishTranscript || originalTranscript;
    if (confirmedNumbers?.utr && !combined.includes(confirmedNumbers.utr)) {
      combined += ` Transaction UTR / Ref is ${confirmedNumbers.utr}.`;
    }
    if (confirmedNumbers?.upi && !combined.includes(confirmedNumbers.upi)) {
      combined += ` Scammer UPI ID is ${confirmedNumbers.upi}.`;
    }
    if (confirmedNumbers?.amount && !combined.includes(confirmedNumbers.amount)) {
      combined += ` Amount lost is ₹${confirmedNumbers.amount}.`;
    }
    setNarrative(combined);
    handleExtract(combined);
  };

  // Handle Extraction
  const handleExtract = async (overrideNarrative = null) => {
    if (isListening) {
      stopListening();
    }

    const narrativeToUse = typeof overrideNarrative === "string" ? overrideNarrative : narrative;

    if (!narrativeToUse.trim()) {
      setError("Please describe what happened in your own words before continuing.");
      return;
    }

    setError("");
    setIsExtracting(true);

    try {
      const res = await fetch("/api/incident/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: narrativeToUse.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze incident");
      }

      const inc = data.incident;
      setIncident(inc);

      // Check if missing critical fields exist
      const firstQ = getNextFollowUpQuestion(inc, []);
      const missingCount = countMissingFollowUps(inc);

      if (firstQ) {
        setCurrentQuestion(firstQ);
        setFollowUpStepNumber(1);
        setTotalFollowUps(Math.min(3, missingCount));
        setSkippedKeys([]);
        setAnsweredKeys([]);
        setFollowUpAnswer("");
        setStage("follow_up");
      } else {
        populateReviewState(inc);
        setStage("review");
      }
    } catch (err) {
      setError(err.message || "An error occurred during extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Follow-Up Handlers
  const handleFollowUpSubmit = () => {
    if (isListening) stopListening();

    const trimmed = followUpAnswer.trim();
    let updatedInc = incident;

    if (trimmed && currentQuestion) {
      updatedInc = currentQuestion.applyAnswer(incident, trimmed);
      setIncident(updatedInc);
      setAnsweredKeys((prev) => [...prev, currentQuestion.key]);
    } else if (currentQuestion) {
      setSkippedKeys((prev) => [...prev, currentQuestion.key]);
    }

    if (followUpStepNumber >= 3) {
      populateReviewState(updatedInc);
      setStage("review");
      return;
    }

    const currentSkipped = trimmed ? skippedKeys : [...skippedKeys, currentQuestion?.key];
    const nextQ = getNextFollowUpQuestion(updatedInc, currentSkipped);
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setFollowUpStepNumber((prev) => prev + 1);
      setFollowUpAnswer("");
    } else {
      populateReviewState(updatedInc);
      setStage("review");
    }
  };

  const handleFollowUpSkip = () => {
    if (isListening) stopListening();

    const newSkipped = currentQuestion ? [...skippedKeys, currentQuestion.key] : skippedKeys;
    setSkippedKeys(newSkipped);

    if (followUpStepNumber >= 3) {
      populateReviewState(incident);
      setStage("review");
      return;
    }

    const nextQ = getNextFollowUpQuestion(incident, newSkipped);
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setFollowUpStepNumber((prev) => prev + 1);
      setFollowUpAnswer("");
    } else {
      populateReviewState(incident);
      setStage("review");
    }
  };

  const handleSkipAllToReview = () => {
    if (isListening) stopListening();
    populateReviewState(incident);
    setStage("review");
  };

  const handleEditNarrative = () => {
    if (isListening) stopListening();
    setStage("input");
  };

  const handleReopenFollowUps = () => {
    if (isListening) stopListening();
    const firstQ = getNextFollowUpQuestion(incident, []);
    const missingCount = countMissingFollowUps(incident);
    if (firstQ) {
      setCurrentQuestion(firstQ);
      setFollowUpStepNumber(1);
      setTotalFollowUps(Math.min(3, missingCount));
      setSkippedKeys([]);
      setFollowUpAnswer("");
      setStage("follow_up");
    }
  };

  const getPriorityLabel = (key) => {
    switch (key) {
      case "transaction_ids":
        return "#1 Priority • 1930 & Account Freeze";
      case "date_time":
        return "#2 Priority • Golden Hour Recovery";
      case "scammer_phone_or_upi":
        return "#3 Priority • SIM & UPI Blacklisting";
      case "bank_name":
        return "#4 Priority • Bank Dispute Escalation";
      case "amount_inr":
        return "#5 Priority • Police FIR & Claim Amount";
      default:
        return "Priority Detail";
    }
  };

  // Build active incident representation from review inputs
  const activeIncident = {
    ...incident,
    incident_type: incidentType,
    amount_inr: amountInr ? parseFloat(amountInr.replace(/[^0-9.]/g, "")) : null,
    date_time: dateTime,
    payment_method: paymentMethod,
    transaction_ids: transactionIds ? transactionIds.split(",").map((s) => s.trim()).filter(Boolean) : [],
    bank_name: bankName,
    scammer_identifiers: {
      ...incident?.scammer_identifiers,
      phones: scammerPhone ? scammerPhone.split(",").map((s) => s.trim()).filter(Boolean) : [],
      upi_ids: scammerUpi ? scammerUpi.split(",").map((s) => s.trim()).filter(Boolean) : [],
      platform: scammerPlatform,
    },
    timeline_summary: timelineSummary,
  };

  // Compute Action Pack Data
  const script1930 = generate1930Script(activeIncident);
  const portalMappings = generatePortalMappings(activeIncident);
  const bankEmailData = generateBankDisputeEmail(activeIncident, selectedBankCode, customNodalEmail);
  const platformGuides = generatePlatformReportingGuide(activeIncident);

  const handleDownloadPdfPack = () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);
    try {
      const doc = generateComplaintPackPDF(activeIncident);
      const filename = `Crosscheck_Complaint_Pack_${Date.now()}.pdf`;
      doc.save(filename);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#F5F2EB] text-[#1A1A1A] flex flex-col justify-between selection:bg-[#B8422B] selection:text-white font-sans">
      {/* Top Navigation */}
      <header className="border-b border-black/10 px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg border border-black/10 text-black/70 hover:text-black hover:bg-black/5 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="text-black/30">/</span>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold tracking-tight">Tell Crosscheck</span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-bold">
              Rapid Incident Intake
            </span>
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none px-3 py-1.5 rounded-full border border-black/15 bg-white shadow-2xs">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span className={isDemoMode ? "font-bold text-amber-700" : "text-gray-600"}>
              Role-play case (nothing is sent)
            </span>
          </label>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Stage 1: Input Stage */}
        {stage === "input" && (
          <div className="space-y-6">
            {/* Opening Message */}
            <div className="p-6 bg-white border border-black/15 rounded-2xl shadow-sm space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-xs font-mono text-black/70">
                <ShieldAlert className="w-3.5 h-3.5 text-[#B8422B]" />
                INCIDENT RESPONSE INTAKE
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-950">
                You did the right thing coming here. Tell me what happened in your own words.
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                Whether you received a fraudulent call, lost money through UPI, or were tricked by a fake job or KYC alert,
                describe what happened naturally. Our system will organize the facts into an official cybercrime report.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Multilingual Voice Intake Studio */}
            <VoiceIntakeStudio
              onTranscriptConfirmed={handleVoiceTranscriptConfirmed}
              initialText={narrative}
              submitButtonText="Extract Incident Facts with AI"
            />

            {/* Narrative Review & Manual Typed Input Card */}
            <div className="p-6 bg-white border border-black/15 rounded-2xl shadow-sm space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-black/60" />
                    <span>Incident Narrative (Transcribed or Typed)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {narrative && (
                      <button
                        type="button"
                        onClick={() => {
                          setNarrative("");
                          setInterimTranscript("");
                        }}
                        className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-gray-400">
                      {narrative.length} characters
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    placeholder="You can also type or paste details directly here... Example: I received a WhatsApp call from an unknown number posing as Mumbai Police, asking me to transfer ₹50,000 via UPI to clear my name from a fake parcel investigation..."
                    value={narrative + (interimTranscript ? (narrative ? " " : "") + interimTranscript : "")}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="w-full p-4 text-xs font-mono border border-black/15 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black leading-relaxed transition"
                  />
                  {interimTranscript && (
                    <div className="absolute bottom-3 left-4 right-4 text-[11px] text-red-600 font-mono bg-red-50/95 border border-red-200 px-2 py-1 rounded-md shadow-2xs">
                      Speaking: {interimTranscript}...
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="extract-submit-btn"
                  onClick={() => handleExtract()}
                  disabled={isExtracting || !narrative.trim()}
                  className="px-6 py-3 bg-black text-white hover:bg-black/85 disabled:opacity-50 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isExtracting ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Extracting Incident Facts...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract &amp; Structure Complaint</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Follow-Up Questions (Conversational, 1 question at a time) */}
        {stage === "follow_up" && currentQuestion && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            {/* Header / Context Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-black/15 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/5 text-black/80 font-bold border border-black/10">
                  Question {followUpStepNumber} of {totalFollowUps}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                  {getPriorityLabel(currentQuestion.key)}
                </span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-gray-500 font-medium">Language:</span>
                <div className="inline-flex p-0.5 rounded-lg bg-black/5 border border-black/10 text-xs">
                  <button
                    type="button"
                    onClick={() => switchLanguage("en")}
                    className={`px-2.5 py-0.5 rounded font-semibold transition ${
                      speechLanguage === "en" ? "bg-white text-black shadow-2xs font-bold" : "text-gray-600"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLanguage("hi")}
                    className={`px-2.5 py-0.5 rounded font-semibold transition ${
                      speechLanguage === "hi" ? "bg-white text-black shadow-2xs font-bold" : "text-gray-600"
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>
            </div>

            {/* The Conversational Question Card */}
            <div className="p-6 md:p-8 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6">
              {/* Question Headline */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#B8422B] font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>INVESTIGATION FOLLOW-UP</span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-gray-950 leading-snug">
                  {speechLanguage === "hi" ? currentQuestion.question.hi : currentQuestion.question.en}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {speechLanguage === "hi" ? currentQuestion.question.en : currentQuestion.question.hi}
                </p>
              </div>

              {/* Legal & Banking Context Callout */}
              <div className="p-3.5 rounded-xl bg-[#F8F6F0] border border-black/10 text-xs text-gray-700 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#B8422B] flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-950 font-semibold block mb-0.5">Why this is needed:</strong>
                  <span>{speechLanguage === "hi" ? currentQuestion.hint.hi : currentQuestion.hint.en}</span>
                </div>
              </div>

              {/* Answer Input Area (Typing & Voice) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">
                    Your Answer (Speak or Type)
                  </label>
                  {followUpAnswer && (
                    <button
                      type="button"
                      onClick={() => setFollowUpAnswer("")}
                      className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="followup-answer-input"
                    value={
                      followUpAnswer +
                      (stage === "follow_up" && interimTranscript
                        ? (followUpAnswer ? " " : "") + interimTranscript
                        : "")
                    }
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    placeholder={
                      speechLanguage === "hi" ? currentQuestion.placeholder.hi : currentQuestion.placeholder.en
                    }
                    className="w-full px-4 py-3.5 pr-28 text-sm font-mono border border-black/15 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black leading-relaxed transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && followUpAnswer.trim()) {
                        e.preventDefault();
                        handleFollowUpSubmit();
                      }
                    }}
                  />

                  {/* Embedded Voice Button */}
                  <div className="absolute right-2 top-2 bottom-2 flex items-center">
                    <button
                      type="button"
                      id="followup-mic-btn"
                      onClick={toggleListening}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isListening
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-black/5 hover:bg-black/10 text-gray-800 border border-black/10"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-red-600" />
                          <span>Speak</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isListening && (
                  <div className="text-[11px] text-red-600 font-mono flex items-center gap-1.5 pl-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    <span>Listening... Speak your answer now.</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-black/10">
                <button
                  type="button"
                  id="followup-skip-btn"
                  onClick={handleFollowUpSkip}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-xs font-semibold text-gray-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  <span>I don&apos;t know / Skip this</span>
                </button>

                <button
                  type="button"
                  id="followup-submit-btn"
                  onClick={handleFollowUpSubmit}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black text-white hover:bg-black/85 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>{followUpAnswer.trim() ? "Save & Continue" : "Skip & Continue"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-bar / Skip to review link */}
            <div className="flex items-center justify-between px-2 text-[11px] text-gray-500">
              <span>Maximum 3 follow-ups asked. Answers are integrated automatically.</span>
              <button
                type="button"
                id="skip-all-to-review-btn"
                onClick={handleSkipAllToReview}
                className="text-gray-600 hover:text-black hover:underline cursor-pointer font-medium"
              >
                Skip remaining & jump to Review Screen →
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Review Screen & Action Pack */}
        {stage === "review" && incident && (
          <div className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Review Screen Header */}
            <div className="p-6 bg-white border border-black/15 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    EXTRACTION COMPLETE
                  </span>
                  {activeIncident.urgency === "high" && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold border border-red-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      HIGH URGENCY
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-950">
                  Review & Confirm Extracted Facts
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Every field below is editable. Missing items are marked as &quot;Not provided&quot;. Check all details carefully.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="reopen-followups-btn"
                  onClick={handleReopenFollowUps}
                  className="px-3 py-1.5 text-xs font-semibold border border-black/15 rounded-xl hover:bg-black/5 transition text-gray-700"
                >
                  Questions
                </button>
                <button
                  type="button"
                  id="edit-narrative-btn"
                  onClick={handleEditNarrative}
                  className="px-3.5 py-1.5 text-xs font-bold border border-black/15 rounded-xl hover:bg-black/5 transition text-gray-700"
                >
                  ← Edit Story
                </button>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="p-6 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Incident Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Incident Category
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="financial_fraud">Financial Fraud / UPI Scam</option>
                    <option value="impersonation">Impersonation / Fake Officer</option>
                    <option value="sextortion">Sextortion / Blackmail</option>
                    <option value="harassment">Cyber Harassment / Threat</option>
                    <option value="other">Other Cybercrime</option>
                  </select>
                </div>

                {/* 2. Amount in INR */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Amount Lost (INR)</label>
                    {answeredKeys.includes("amount_inr") ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !amountInr ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={amountInr}
                    onChange={(e) => setAmountInr(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* 3. Date & Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Date & Approximate Time</label>
                    {answeredKeys.includes("date_time") ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !dateTime ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* 4. Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                    <option value="netbanking">Net Banking / NEFT / IMPS</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="wallet">Prepaid Wallet</option>
                    <option value="other">Other / Crypto</option>
                  </select>
                </div>

                {/* 5. Transaction IDs / UTRs */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Transaction ID(s) / UTR</label>
                    {answeredKeys.includes("transaction_ids") ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !transactionIds ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={transactionIds}
                    onChange={(e) => setTransactionIds(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* 6. Victim Bank Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Your Bank / Payment App</label>
                    {answeredKeys.includes("bank_name") ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !bankName ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* 7. Scammer Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Scammer Phone Number(s)</label>
                    {answeredKeys.includes("scammer_phone_or_upi") && scammerPhone ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !scammerPhone ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={scammerPhone}
                    onChange={(e) => setScammerPhone(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* 8. Scammer UPI ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Scammer UPI ID / Handle</label>
                    {answeredKeys.includes("scammer_phone_or_upi") && scammerUpi ? (
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                        Added in follow-up
                      </span>
                    ) : !scammerUpi ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Not provided
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={scammerUpi}
                    onChange={(e) => setScammerUpi(e.target.value)}
                    placeholder="Not provided"
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* 9. Timeline Summary */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chronological Timeline Summary (Max 150 words)
                </label>
                <textarea
                  rows={4}
                  value={timelineSummary}
                  onChange={(e) => setTimelineSummary(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-4 rounded-xl bg-[#FBF9F5] border border-black/10 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="confirm-facts-checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-1 rounded border-gray-400 text-black focus:ring-black"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 block">
                      I confirm these facts are true to the best of my knowledge.
                    </span>
                    <span className="text-[11px] text-gray-600 block mt-0.5 leading-relaxed">
                      Official Action Pack generation unlocks once confirmed. Nothing is transmitted automatically.
                      Crosscheck formats your complaint for police and banking channels.
                    </span>
                  </div>
                </label>
              </div>

              {/* Unlocked / Locked Indicator */}
              <div className="pt-2">
                {!isConfirmed ? (
                  <button
                    type="button"
                    id="unlock-action-pack-btn"
                    onClick={() => {
                      setIsConfirmed(true);
                      setTimeout(() => {
                        const el = document.getElementById("action-pack-container");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100 text-center space-y-1 transition cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                      <Lock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                      <span>Click to Unlock Action Pack &amp; Filing Documents</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Click here to confirm facts and unlock the 1930 helpline script, bank dispute notice, and 3-page PDF complaint pack.
                    </p>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold">Facts Verified & Confirmed</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700">
                      Action Pack Unlocked Below ↓
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 4: ACTION PACK CONTAINER (Rendered when confirmed) */}
            {isConfirmed && (
              <div id="action-pack-container" className="space-y-6 animate-in fade-in-0 duration-300 scroll-mt-24">
                {/* Action Pack Section Header */}
                <div className="p-6 bg-white border border-black/15 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-mono text-[10px] font-bold border border-red-200 uppercase tracking-wider mb-1.5">
                      <ShieldCheck className="w-3 h-3 text-red-700" />
                      OFFICIAL ACTION PACK • READY TO DISPATCH
                    </div>
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-950">
                      Incident Action Center
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Execute official reporting steps immediately. Real computation only — no automatic emails or false claims.
                    </p>
                  </div>

                  {/* Legal & Safety Notice Badge */}
                  <div className="p-3 bg-black/5 rounded-xl text-[11px] text-gray-600 max-w-sm">
                    <strong>Official Notice:</strong> Crosscheck formats your complaint for official authorities (1930 & cybercrime.gov.in). We never claim to block accounts directly.
                  </div>
                </div>

                {/* PDF Complaint Pack & Evidence Vault Action Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PDF Download Card */}
                  <div className="p-5 rounded-2xl bg-white border border-black/15 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                        <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                        PRINT-READY COMPLAINT PACK
                      </div>
                      <h3 className="font-serif text-lg font-bold text-gray-950">
                        Download 3-Page Official PDF Pack
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Ready to print and sign for Indian police station / cyber cell submission and home branch bank dispute.
                      </p>
                      <div className="text-[11px] font-mono text-gray-500 space-y-0.5 pt-1">
                        <div>• <strong>Page 1:</strong> Formal Police Station Complaint Letter</div>
                        <div>• <strong>Page 2:</strong> Bank Dispute Notice (Citing RBI Circular)</div>
                        <div>• <strong>Page 3:</strong> Incident Summary & 7-Point Evidence Checklist</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="download-pdf-pack-btn"
                      onClick={handleDownloadPdfPack}
                      disabled={isGeneratingPdf}
                      className="w-full px-5 py-3 rounded-xl bg-black text-white hover:bg-black/85 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Generating PDF Pack...</span>
                        </>
                      ) : pdfSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Downloaded Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span>Download PDF Complaint Pack (A4)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Evidence Vault Integration Card */}
                  <div className="p-5 rounded-2xl bg-white border border-black/15 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">
                        <Archive className="w-3.5 h-3.5 text-blue-700" />
                        FORENSIC CHAIN OF CUSTODY
                      </div>
                      <h3 className="font-serif text-lg font-bold text-gray-950">
                        Evidence Vault Deep Link
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Attach screenshots, SMS exports, and call recordings to this incident. Cryptographic hashing preserves digital evidence admissibility under Section 65B of the Indian Evidence Act.
                      </p>
                      <div className="p-2.5 rounded-xl bg-[#F8F6F0] border border-black/10 text-[11px] text-gray-600">
                        💡 <strong>Tip:</strong> Keep screenshots in their original resolution without cropping to retain timestamp and EXIF metadata.
                      </div>
                    </div>

                    <Link
                      href="/dashboard?nav=vault"
                      id="open-evidence-vault-btn"
                      className="w-full px-5 py-3 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-gray-900 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                    >
                      <Archive className="w-4 h-4 text-gray-700" />
                      <span>Open Evidence Vault & Attach Files →</span>
                    </Link>
                  </div>
                </div>

                {/* 4 Action Tabs Navigation */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    id="tab-1930-btn"
                    onClick={() => setActionPackTab("1930")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                      actionPackTab === "1930"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-black/10 hover:bg-black/5"
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-500" />
                    <span>1. Call 1930</span>
                  </button>

                  <button
                    type="button"
                    id="tab-portal-btn"
                    onClick={() => setActionPackTab("portal")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                      actionPackTab === "portal"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-black/10 hover:bg-black/5"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>2. Cyber Portal</span>
                  </button>

                  <button
                    type="button"
                    id="tab-bank-btn"
                    onClick={() => setActionPackTab("bank")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                      actionPackTab === "bank"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-black/10 hover:bg-black/5"
                    }`}
                  >
                    <Mail className="w-4 h-4 text-amber-500" />
                    <span>3. Bank Dispute</span>
                  </button>

                  <button
                    type="button"
                    id="tab-platform-btn"
                    onClick={() => setActionPackTab("platform")}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                      actionPackTab === "platform"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-black/10 hover:bg-black/5"
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-purple-500" />
                    <span>4. App Reports</span>
                  </button>
                </div>

                {/* TAB 1: 1930 HELPLINE CALL */}
                {actionPackTab === "1930" && (
                  <div className="p-6 md:p-8 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6 animate-in fade-in-0 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                          <h3 className="font-serif text-lg font-bold text-emerald-950">
                            National Cyber Financial Fraud Helpline 1930
                          </h3>
                        </div>
                        <p className="text-xs text-emerald-800 mt-1 max-w-xl">
                          Call 1930 immediately. Indian Cyber Crime Coordination Centre (I4C) operators trigger real-time
                          freezing of the beneficiary bank account across the CFCFRMS banking network.
                        </p>
                      </div>

                      <a
                        href="tel:1930"
                        id="call-1930-btn"
                        className="px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition flex-shrink-0 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4 text-white" />
                        <span>Call 1930 Toll-Free</span>
                      </a>
                    </div>

                    {/* What to tell them script */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                            Operator Intake Script (Keep this ready while calling)
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            1930 operators ask these questions in this exact order to register the ticket:
                          </p>
                        </div>

                        <button
                          type="button"
                          id="copy-1930-script-btn"
                          onClick={() => {
                            const fullScript = script1930
                              .map((item) => `[${item.label}]\nQ: ${item.operatorPrompt}\nA: ${item.answer}`)
                              .join("\n\n");
                            copyToClipboard(fullScript, "script1930");
                          }}
                          className="px-3 py-1.5 rounded-lg border border-black/15 text-xs font-semibold hover:bg-black/5 transition flex items-center gap-1.5"
                        >
                          {copiedKey === "script1930" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Script Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Copy All Answers</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="divide-y divide-black/10 border border-black/10 rounded-xl overflow-hidden bg-[#FCFBF8]">
                        {script1930.map((item, idx) => (
                          <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-gray-500">
                                  {idx + 1}. {item.label}
                                </span>
                                {item.critical && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                                    CRITICAL FOR FREEZE
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 italic">
                                &quot;{item.operatorPrompt}&quot;
                              </div>
                              <div className="text-xs font-mono font-bold text-gray-900">
                                {item.answer}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.answer, `script_ans_${idx}`)}
                              className="self-end sm:self-center p-1.5 rounded-lg border border-black/10 text-gray-600 hover:text-black hover:bg-black/5 text-[11px] font-mono flex items-center gap-1 transition"
                            >
                              {copiedKey === `script_ans_${idx}` ? (
                                <span className="text-emerald-600 font-bold">Copied</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CYBERCRIME PORTAL HELPER */}
                {actionPackTab === "portal" && (
                  <div className="p-6 md:p-8 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6 animate-in fade-in-0 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-blue-50/70 border border-blue-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-700" />
                          <h3 className="font-serif text-lg font-bold text-blue-950">
                            National Cyber Crime Reporting Portal (cybercrime.gov.in)
                          </h3>
                        </div>
                        <p className="text-xs text-blue-900 mt-1 max-w-xl">
                          Official Ministry of Home Affairs portal. Filing here generates an official cybercrime acknowledgement
                          number required for bank chargeback claims and police investigation.
                        </p>
                      </div>

                      <a
                        href="https://cybercrime.gov.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        id="open-portal-btn"
                        className="px-5 py-3 rounded-xl bg-[#1A365D] hover:bg-[#152C4D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition flex-shrink-0 cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Open cybercrime.gov.in</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* What to paste where mapping */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                          What to Paste Where on cybercrime.gov.in
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Copy each pre-formatted field with one click and paste it directly into the portal form:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Category */}
                        <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-black/10 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase block font-semibold">
                              Portal Category
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {portalMappings.category}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(portalMappings.category, "cat")}
                            className="p-1.5 rounded-lg border border-black/10 text-xs hover:bg-black/5 transition"
                          >
                            {copiedKey === "cat" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        </div>

                        {/* Sub Category */}
                        <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-black/10 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase block font-semibold">
                              Portal Sub-Category
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {portalMappings.subCategory}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(portalMappings.subCategory, "subcat")}
                            className="p-1.5 rounded-lg border border-black/10 text-xs hover:bg-black/5 transition"
                          >
                            {copiedKey === "subcat" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        </div>

                        {/* Suspect Details */}
                        <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-black/10 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase block font-semibold">
                              Suspect Phone / UPI
                            </span>
                            <span className="text-xs font-bold font-mono text-gray-900">
                              {portalMappings.suspectDetails}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(portalMappings.suspectDetails, "suspect")}
                            className="p-1.5 rounded-lg border border-black/10 text-xs hover:bg-black/5 transition"
                          >
                            {copiedKey === "suspect" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        </div>

                        {/* Transaction ID */}
                        <div className="p-3.5 rounded-xl bg-[#FCFBF8] border border-black/10 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase block font-semibold">
                              Transaction Reference / UTR
                            </span>
                            <span className="text-xs font-bold font-mono text-gray-900">
                              {portalMappings.transactionId || "Pending"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(portalMappings.transactionId, "tx")}
                            className="p-1.5 rounded-lg border border-black/10 text-xs hover:bg-black/5 transition"
                          >
                            {copiedKey === "tx" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        </div>
                      </div>

                      {/* Full Narrative Box */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                            Full Structured Complaint Narrative
                          </label>
                          <button
                            type="button"
                            id="copy-full-narrative-btn"
                            onClick={() => copyToClipboard(portalMappings.narrative, "full_narrative")}
                            className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-black/85 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            {copiedKey === "full_narrative" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Narrative Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Full Narrative</span>
                              </>
                            )}
                          </button>
                        </div>

                        <textarea
                          readOnly
                          rows={8}
                          value={portalMappings.narrative}
                          className="w-full p-4 text-xs font-mono border border-black/15 rounded-xl bg-[#FCFBF8] text-gray-800 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: BANK DISPUTE EMAIL */}
                {actionPackTab === "bank" && (
                  <div className="p-6 md:p-8 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6 animate-in fade-in-0 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-800" />
                          <h3 className="font-serif text-lg font-bold text-amber-950">
                            Bank Fraud Dispute Notice (RBI Circular Protections)
                          </h3>
                        </div>
                        <p className="text-xs text-amber-900 mt-1 max-w-xl">
                          Under RBI Circular <strong>DBR.No.Leg.BC.78/09.07.005/2017-18</strong>, reporting unauthorized
                          electronic debits within 3 days limits customer liability to zero. Send this formal notice immediately.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <a
                          href={bankEmailData.mailtoUrl}
                          id="open-bank-email-btn"
                          className="px-4 py-2.5 rounded-xl bg-[#B8422B] hover:bg-[#9E3622] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Mail to Bank Nodal Officer</span>
                        </a>

                        <button
                          type="button"
                          id="copy-bank-email-btn"
                          onClick={() => {
                            const fullDraft = `To: ${bankEmailData.toEmail}\nSubject: ${bankEmailData.subject}\n\n${bankEmailData.body}`;
                            copyToClipboard(fullDraft, "bankDraft");
                          }}
                          className="px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-xs font-semibold hover:bg-black/5 transition flex items-center gap-1.5"
                        >
                          {copiedKey === "bankDraft" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Email Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Copy Draft</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bank Selection Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FCFBF8] border border-black/10">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Select Domestic Bank
                        </label>
                        <select
                          id="bank-directory-select"
                          value={selectedBankCode}
                          onChange={(e) => setSelectedBankCode(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          {BANK_DIRECTORY.map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.name}
                            </option>
                          ))}
                          <option value="CUSTOM">Other / Custom Email</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Nodal Officer Recipient Email
                        </label>
                        {selectedBankCode === "CUSTOM" ? (
                          <input
                            type="email"
                            id="custom-bank-email-input"
                            value={customNodalEmail}
                            onChange={(e) => setCustomNodalEmail(e.target.value)}
                            placeholder="e.g. nodal.officer@yourbank.com"
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        ) : (
                          <div className="flex items-center justify-between px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl">
                            <span>{bankEmailData.toEmail}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bankEmailData.toEmail, "bankEmail")}
                              className="text-gray-400 hover:text-black ml-2"
                            >
                              {copiedKey === "bankEmail" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Formal Dispute Letter Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                          Formal Dispute Letter (Subject: {bankEmailData.subject})
                        </label>
                        <span className="text-[11px] font-mono text-gray-400">
                          Cites RBI/2017-18/15
                        </span>
                      </div>

                      <textarea
                        readOnly
                        rows={12}
                        value={bankEmailData.body}
                        className="w-full p-4 text-xs font-mono border border-black/15 rounded-xl bg-[#FCFBF8] text-gray-800 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: PLATFORM REPORT & BLACKLIST */}
                {actionPackTab === "platform" && (
                  <div className="p-6 md:p-8 bg-white border border-black/15 rounded-2xl shadow-sm space-y-6 animate-in fade-in-0 duration-200">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-gray-950">
                        In-App Platform Reporting & Telecom Blacklisting
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Block the scammer&apos;s handles, freeze recipient wallets, and disconnect fraudulent phone lines through official mechanisms.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {platformGuides.map((guide, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-[#FCFBF8] border border-black/10 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-[#B8422B]" />
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
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1.5 leading-relaxed pl-1">
                              {guide.steps.map((step, sIdx) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ol>
                          </div>

                          {/* Copyable snippet for in-app description */}
                          <div className="p-3 bg-white rounded-xl border border-black/10 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                              <span>PASTE INTO REPORT DESCRIPTION:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(guide.copySnippet, `guide_${idx}`)}
                                className="text-gray-600 hover:text-black flex items-center gap-1 font-semibold"
                              >
                                {copiedKey === `guide_${idx}` ? (
                                  <span className="text-emerald-600">Copied!</span>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs font-mono text-gray-800 line-clamp-2">
                              {guide.copySnippet}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-3 text-center text-[11px] font-mono text-black/50 bg-white/40">
        OFFICIAL ASSISTANCE CHANNELS: NATIONAL CYBERCRIME HELPLINE 1930 • CYBERCRIME.GOV.IN
      </footer>
    </div>
  );
}
