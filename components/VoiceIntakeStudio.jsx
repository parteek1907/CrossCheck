"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Languages,
  FileText,
  Check,
  HelpCircle,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageByCode } from "../lib/languageConfig.js";

/**
 * VoiceIntakeStudio
 * Production-ready multilingual voice recorder for Cybercrime Incident Intake.
 * Uses MediaRecorder with silence auto-stop, live canvas waveform, audio playback,
 * language switcher with 11 Indic + English languages, low-confidence segment flagging,
 * and typed confirmation for financial numbers (UTR, UPI, Amount).
 */
export default function VoiceIntakeStudio({
  onTranscriptConfirmed,
  initialText = "",
  submitButtonText = "Apply to Incident Report",
  className = "",
}) {
  // Mode / Step: "idle" | "recording" | "paused" | "recorded" | "transcribing" | "preview"
  const [recorderState, setRecorderState] = useState("idle");

  // Audio & Stream refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  // Timer & Silence auto-stop state
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerIntervalRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastSoundTimeRef = useRef(0);
  const hasSpokenRef = useRef(false);
  const [silenceNotification, setSilenceNotification] = useState("");

  // Permission states: "prompt" | "granted" | "denied" | "unsupported"
  const [permissionState, setPermissionState] = useState("prompt");
  const [errorMessage, setErrorMessage] = useState("");

  // Playback state
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef(null);

  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState("auto");

  // Transcripts & Segments
  const [originalTranscript, setOriginalTranscript] = useState(initialText || "");
  const [englishTranscript, setEnglishTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [lowConfidenceSegments, setLowConfidenceSegments] = useState([]);
  const [audioDuration, setAudioDuration] = useState(0);

  // Guardrail: Typed confirmation for numbers
  const [needsNumberConfirmation, setNeedsNumberConfirmation] = useState(false);
  const [confirmedUtr, setConfirmedUtr] = useState("");
  const [confirmedUpi, setConfirmedUpi] = useState("");
  const [confirmedAmount, setConfirmedAmount] = useState("");

  // Accessibility Live Announcer text
  const [ariaLiveMessage, setAriaLiveMessage] = useState("");

  // Announce helper
  const announce = (msg) => {
    setAriaLiveMessage(msg);
  };

  // Check browser capability on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
        setPermissionState("unsupported");
        setErrorMessage("Microphone audio recording is not supported in this browser. Please use the text input below.");
      } else {
        // Query permission if supported
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions
            .query({ name: "microphone" })
            .then((status) => {
              if (status.state === "denied") {
                setPermissionState("denied");
              } else if (status.state === "granted") {
                setPermissionState("granted");
              } else {
                setPermissionState("prompt");
              }
              status.onchange = () => {
                if (status.state === "denied") setPermissionState("denied");
                if (status.state === "granted") setPermissionState("granted");
              };
            })
            .catch(() => {});
        }
      }
    }

    return () => {
      cleanupAudioContext();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    };
  }, []);

  const cleanupAudioContext = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Draw Audio Waveform on Canvas
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Check volume for silence auto-stop
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / bufferLength;

      // Threshold: > 10 is considered audible speech
      if (avgVolume > 12) {
        lastSoundTimeRef.current = Date.now();
        hasSpokenRef.current = true;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const gap = 2;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.floor(bufferLength / totalBars) || 1;

      for (let i = 0; i < totalBars; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(4, percent * (canvas.height - 4));

        const x = i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;

        // Dynamic styling: high energy turns amber/red, normal is crimson
        if (percent > 0.8) {
          ctx.fillStyle = "#DC2626"; // Crimson Red
        } else if (percent > 0.4) {
          ctx.fillStyle = "#B8422B"; // Brand Rust Red
        } else {
          ctx.fillStyle = "#E5E7EB"; // Muted grey
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();
  }, []);

  // Check 4-second silence auto-stop
  const monitorSilence = () => {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    silenceTimerRef.current = setInterval(() => {
      // Only trigger silence auto-stop after user has spoken for at least 2 seconds
      if (hasSpokenRef.current && recordingSeconds >= 3) {
        const silenceDuration = Date.now() - lastSoundTimeRef.current;
        if (silenceDuration >= 4000) {
          setSilenceNotification("Silence detected (4s). Recording automatically stopped.");
          announce("Silence detected for four seconds. Recording stopped.");
          stopRecording();
        }
      }
    }, 400);
  };

  // Start Recording
  const startRecording = async () => {
    setErrorMessage("");
    setSilenceNotification("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    audioChunksRef.current = [];
    hasSpokenRef.current = false;
    lastSoundTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setPermissionState("granted");

      // Pick best supported mimeType
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        cleanupAudioContext();
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);

        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);
        setRecorderState("recorded");
        announce("Recording finished. You can play back your audio or transcribe it.");
      };

      // Set up Web Audio Analyser
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      recorder.start(250); // Collect in 250ms chunks
      setRecorderState("recording");
      setRecordingSeconds(0);
      announce("Microphone recording started. Speak naturally.");

      // Timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 179) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

      // Silence monitor & Waveform
      monitorSilence();
      setTimeout(drawWaveform, 50);
    } catch (err) {
      console.error("[VoiceIntakeStudio] getUserMedia error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setErrorMessage("Microphone access was denied. Please allow microphone permissions in browser settings.");
      } else {
        setErrorMessage(`Microphone error: ${err.message || "Failed to initialize audio"}`);
      }
      setRecorderState("idle");
    }
  };

  // Pause Recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecorderState("paused");
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      announce("Recording paused.");
    }
  };

  // Resume Recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
      lastSoundTimeRef.current = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 179) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
      monitorSilence();
      drawWaveform();
      announce("Recording resumed.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Reset / Discard Recording
  const resetRecording = () => {
    stopRecording();
    cleanupAudioContext();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecorderState("idle");
    setRecordingSeconds(0);
    setSilenceNotification("");
    setErrorMessage("");
    announce("Recording discarded. Ready to record again.");
  };

  // Toggle Audio Playback
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Submit audio to POST /api/transcribe
  const handleTranscribe = async () => {
    if (!audioBlob) {
      setErrorMessage("No recorded audio available to transcribe.");
      return;
    }

    setRecorderState("transcribing");
    setErrorMessage("");
    announce("Transcribing audio with Groq Whisper...");

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      formData.append("file", audioBlob, `victim_recording.${ext}`);

      if (selectedLanguage && selectedLanguage !== "auto") {
        formData.append("language", selectedLanguage);
      }

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Transcription failed");
      }

      setOriginalTranscript(data.originalTranscript || "");
      setEnglishTranscript(data.englishTranscript || data.originalTranscript || "");
      setDetectedLanguage(data.detectedLanguage || selectedLanguage);
      setAudioDuration(data.durationSeconds || recordingSeconds);
      setLowConfidenceSegments(data.lowConfidenceSegments || []);

      // Check if text mentions financial numbers (UTR / UPI / Amount)
      const combined = `${data.originalTranscript} ${data.englishTranscript}`;
      const hasUtr = /\b(?:utr|rrn|txn|trans)\s*(?:no|num|id)?[:.\s]*([0-9]{8,22})/i.test(combined);
      const hasUpi = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/.test(combined);
      const hasAmt = /(?:₹|rs\.?|inr|rupees)\s*([0-9,]+)/i.test(combined);

      if (hasUtr || hasUpi || hasAmt) {
        setNeedsNumberConfirmation(true);
      }

      setRecorderState("preview");
      announce("Audio successfully transcribed. Please review the text before applying.");
    } catch (err) {
      console.error("[VoiceIntakeStudio] Transcription error:", err);
      setErrorMessage(`Transcription failed: ${err.message}. You can type your narrative directly.`);
      setRecorderState("recorded");
    }
  };

  // Confirm and Apply
  const handleConfirmAndApply = () => {
    if (!originalTranscript.trim()) {
      setErrorMessage("Transcript is empty. Please record audio or type your story.");
      return;
    }

    // Call parent with structured result
    if (onTranscriptConfirmed) {
      onTranscriptConfirmed({
        originalTranscript: originalTranscript.trim(),
        englishTranscript: (englishTranscript || originalTranscript).trim(),
        detectedLanguage: detectedLanguage || selectedLanguage,
        durationSeconds: audioDuration || recordingSeconds,
        confirmedNumbers: {
          utr: confirmedUtr.trim(),
          upi: confirmedUpi.trim(),
          amount: confirmedAmount.trim(),
        },
      });
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentLangObj = getLanguageByCode(selectedLanguage);

  return (
    <div className={`space-y-4 ${className}`} aria-label="Multilingual Voice Incident Intake Studio">
      {/* Hidden ARIA Live Announcer */}
      <div className="sr-only" aria-live="polite" role="status">
        {ariaLiveMessage}
      </div>

      {/* Main Studio Card */}
      <div className="p-5 md:p-6 bg-white border border-black/15 rounded-2xl shadow-sm space-y-5">
        {/* Top Control Bar: Language Selection + Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 tracking-tight block">
                Multilingual Voice Intake
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                11 Indic Languages • Whisper Large • Ephemeral Privacy
              </span>
            </div>
          </div>

          {/* Language Picker Dropdown */}
          <div className="flex items-center gap-2">
            <Languages className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <label htmlFor="voice-lang-select" className="text-xs text-gray-600 font-medium sr-only">
              Select Language
            </label>
            <div className="relative">
              <select
                id="voice-lang-select"
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  announce(`Language set to ${getLanguageByCode(e.target.value).name}`);
                }}
                disabled={recorderState === "recording"}
                className="text-xs font-medium bg-[#F8F6F0] border border-black/15 rounded-lg px-2.5 py-1.5 pr-8 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer disabled:opacity-50"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} — {lang.nativeName} {lang.isBeta ? "(Beta)" : ""}
                  </option>
                ))}
              </select>
              {currentLangObj.isBeta && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-mono font-bold border border-amber-300">
                  BETA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Permission Denied Callout with Instructions */}
        {permissionState === "denied" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="font-bold">Microphone Permission Blocked</div>
            </div>
            <p className="text-[11px] leading-relaxed">
              Your browser has blocked microphone access. To record voice notes:
            </p>
            <ol className="text-[11px] list-decimal list-inside space-y-1 font-mono text-amber-950 pl-1">
              <li>Click the <strong>Lock icon (🔒)</strong> or Site Settings in your URL address bar.</li>
              <li>Change <strong>Microphone</strong> from <em>Block</em> to <em>Allow</em>.</li>
              <li>Refresh this page, or type your incident description in the text box below.</li>
            </ol>
          </div>
        )}

        {/* Generic Error Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Silence Notification */}
        {silenceNotification && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{silenceNotification}</span>
          </div>
        )}

        {/* State: IDLE */}
        {recorderState === "idle" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-[#F8F6F0] border border-black/10">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-gray-900">
                Speak your complaint naturally
              </div>
              <div className="text-[11px] text-gray-600">
                Describe the scam in Hindi, English, Hinglish or your regional language. Max 3 minutes.
              </div>
            </div>

            <button
              type="button"
              id="start-voice-record-btn"
              onClick={startRecording}
              aria-label="Start audio recording"
              className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer select-none ring-2 ring-red-200"
            >
              <Mic className="w-4 h-4" />
              <span>Click to Speak</span>
            </button>
          </div>
        )}

        {/* State: RECORDING or PAUSED */}
        {(recorderState === "recording" || recorderState === "paused") && (
          <div className="space-y-4 p-5 rounded-xl bg-red-50/50 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    recorderState === "recording" ? "bg-red-600 animate-ping" : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-mono font-bold text-red-900">
                  {recorderState === "recording" ? "RECORDING..." : "PAUSED"}
                </span>
                <span className="text-xs font-mono text-gray-600">
                  ({selectedLanguage === "auto" ? "Auto-Detect" : currentLangObj.nativeName})
                </span>
              </div>

              {/* Timer */}
              <div className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white border border-red-200 text-red-900">
                {formatTime(recordingSeconds)} / 03:00
              </div>
            </div>

            {/* Audio Waveform Canvas */}
            <div className="h-14 w-full bg-white rounded-lg border border-red-100 flex items-center justify-center overflow-hidden px-2">
              <canvas ref={canvasRef} width={500} height={56} className="w-full h-full" />
            </div>

            {/* Recording Controls: Pause/Resume + Stop */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={resetRecording}
                className="text-xs text-gray-500 hover:text-red-700 flex items-center gap-1.5 transition font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <div className="flex items-center gap-2">
                {recorderState === "recording" ? (
                  <button
                    type="button"
                    onClick={pauseRecording}
                    aria-label="Pause recording"
                    className="px-3.5 py-2 rounded-lg bg-white border border-black/15 text-gray-800 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resumeRecording}
                    aria-label="Resume recording"
                    className="px-3.5 py-2 rounded-lg bg-white border border-black/15 text-gray-800 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  id="stop-voice-record-btn"
                  onClick={stopRecording}
                  aria-label="Stop recording and review"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Done Speaking</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: RECORDED (Audio Review & Playback) */}
        {recorderState === "recorded" && (
          <div className="space-y-4 p-5 rounded-xl bg-gray-50 border border-black/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-900">Audio Captured</span>
                <span className="text-xs font-mono text-gray-500 font-medium">
                  ({formatTime(recordingSeconds)})
                </span>
              </div>

              <button
                type="button"
                onClick={resetRecording}
                className="text-xs text-gray-500 hover:text-red-700 flex items-center gap-1 transition font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>
            </div>

            {/* Custom Audio Playback Player */}
            {audioUrl && (
              <div className="p-3 bg-white rounded-lg border border-black/10 flex items-center justify-between gap-3">
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  aria-label={isPlayingAudio ? "Pause playback" : "Play recorded audio"}
                  className="p-2 rounded-full bg-black text-white hover:bg-black/85 cursor-pointer flex-shrink-0"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1 text-[11px] text-gray-600 font-mono">
                  {isPlayingAudio ? "Playing back your recording..." : "Click play to listen before transcribing"}
                </div>
              </div>
            )}

            {/* Transcribe Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                id="transcribe-audio-btn"
                onClick={handleTranscribe}
                className="px-6 py-2.5 rounded-lg bg-black text-white hover:bg-black/85 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Transcribe & Translate (Groq Whisper)</span>
              </button>
            </div>
          </div>
        )}

        {/* State: TRANSCRIBING */}
        {recorderState === "transcribing" && (
          <div className="p-6 rounded-xl bg-gray-50 border border-black/10 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />
            <div className="text-xs font-bold text-gray-900">Transcribing Multilingual Voice Note...</div>
            <p className="text-[11px] text-gray-500 font-mono max-w-md mx-auto">
              Running Groq Whisper verbose decoding with cyber fraud vocabulary bias and dual legal translation.
            </p>
          </div>
        )}

        {/* State: PREVIEW (Dual Transcripts + Low-Confidence Flagging + Number Confirmation) */}
        {recorderState === "preview" && (
          <div className="space-y-4 pt-1">
            {/* Low-confidence alert if segments detected */}
            {lowConfidenceSegments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>Unclear Audio Segments Flagged ({lowConfidenceSegments.length})</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Whisper detected uncertain words. Please check the underlined/highlighted text below before submitting:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lowConfidenceSegments.map((seg, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-mono text-[10px] border border-amber-300 font-bold"
                    >
                      &quot;{seg.text}&quot; ({(seg.confidence * 100).toFixed(0)}% conf)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dual Transcripts (Original + English) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Transcript */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-black/60" />
                    <span>Original Narrative ({detectedLanguage?.toUpperCase() || "VOICE"})</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">Editable</span>
                </div>
                <textarea
                  rows={5}
                  value={originalTranscript}
                  onChange={(e) => setOriginalTranscript(e.target.value)}
                  className="w-full p-3 text-xs font-mono border border-black/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  aria-label="Editable Original Transcript"
                />
              </div>

              {/* English Translation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-black/60" />
                    <span>English Translation (Legal Complaint Standard)</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">Official</span>
                </div>
                <textarea
                  rows={5}
                  value={englishTranscript}
                  onChange={(e) => setEnglishTranscript(e.target.value)}
                  className="w-full p-3 text-xs font-mono border border-black/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  aria-label="Editable English Translation"
                />
              </div>
            </div>

            {/* Guardrail: Typed Confirmation for Numbers (UTR, UPI ID, Amount) */}
            {needsNumberConfirmation && (
              <div className="p-4 rounded-xl bg-[#F8F6F0] border border-black/15 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#B8422B] flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-900">
                    Mandatory Fraud Guardrail: Confirm Critical Bank Numbers
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Speech transcription can occasionally mistake digits (e.g., 0 vs O, or 8 vs 9). Please type or verify the exact transaction details from your banking SMS or UPI app:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Transaction UTR / Ref (12 Digits)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 429184719283"
                      value={confirmedUtr}
                      onChange={(e) => setConfirmedUtr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-black/15 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Scammer UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. fraudster@okaxis"
                      value={confirmedUpi}
                      onChange={(e) => setConfirmedUpi(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-black/15 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Exact Loss Amount (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 48500"
                      value={confirmedAmount}
                      onChange={(e) => setConfirmedAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-black/15 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={resetRecording}
                className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start Over</span>
              </button>

              <button
                type="button"
                id="apply-transcript-btn"
                onClick={handleConfirmAndApply}
                className="px-6 py-2.5 rounded-lg bg-black text-white hover:bg-black/85 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{submitButtonText}</span>
              </button>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="p-3 bg-black/5 rounded-xl text-[11px] text-gray-600 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-black/70 flex-shrink-0" />
          <span>
            <strong>Zero Audio Retention:</strong> Your voice recording is processed directly in memory via Groq Whisper and wiped immediately. No audio files or raw transcripts are permanently logged on any server.
          </span>
        </div>
      </div>
    </div>
  );
}
