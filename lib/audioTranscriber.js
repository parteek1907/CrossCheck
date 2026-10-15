// Crosscheck Unified Audio Transcription Engine
// Uses Groq Whisper (whisper-large-v3 or whisper-large-v3-turbo) with verbose_json
// Includes ffmpeg conversion fallback, 429 retry backoff, size/duration validation,
// and strict ephemeral data deletion (zero retention on disk or memory, no transcript logging).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { callGroqChat } from "./groqClient.js";

const GROQ_AUDIO_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
export const DEFAULT_WHISPER_MODEL = "whisper-large-v3";
export const TURBO_WHISPER_MODEL = "whisper-large-v3-turbo";

// Standard cyber fraud domain vocabulary prompt to bias Whisper decoding
export const SCAM_VOCABULARY_HINT =
  "Cybercrime, 1930 Helpline, cybercrime.gov.in, UPI, UTR, OTP, KYC, APK, SIM swap, WhatsApp, Google Pay, PhonePe, Paytm, BHIM, IMPS, NEFT, RTGS, SBI, HDFC, ICICI, beneficiary account, financial fraud, lien freeze.";

// Supported audio formats
export const SUPPORTED_EXTENSIONS = new Set(["webm", "mp4", "ogg", "wav", "flac", "m4a", "mp3"]);
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB limit
export const MIN_DURATION_SECONDS = 0.8;
export const MAX_DURATION_SECONDS = 180; // 3 minutes

/**
 * Probes audio duration and metadata using ffprobe.
 * @param {Buffer} buffer
 * @param {string} ext
 * @returns {number|null} Duration in seconds
 */
export function probeAudioDuration(buffer, ext = "webm") {
  const tmpId = crypto.randomUUID();
  const tmpPath = path.join(os.tmpdir(), `probe_${tmpId}.${ext}`);
  try {
    fs.writeFileSync(tmpPath, buffer);
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tmpPath}"`;
    const output = execSync(cmd, { stdio: ["pipe", "pipe", "ignore"], timeout: 10000 }).toString().trim();
    const duration = parseFloat(output);
    return isNaN(duration) ? null : duration;
  } catch {
    return null;
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

/**
 * Converts audio buffer to 16kHz mono WAV using ffmpeg.
 * Guarantees zero leftover files on disk.
 * @param {Buffer} audioBuffer
 * @param {string} [originalExt="ogg"]
 * @returns {Buffer} Converted WAV audio buffer
 */
export function convertAudioToWav(audioBuffer, originalExt = "ogg") {
  const tmpId = crypto.randomUUID();
  const tmpDir = os.tmpdir();
  const inPath = path.join(tmpDir, `cc_in_${tmpId}.${originalExt}`);
  const outPath = path.join(tmpDir, `cc_out_${tmpId}.wav`);

  try {
    fs.writeFileSync(inPath, audioBuffer);
    execSync(`ffmpeg -y -i "${inPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outPath}"`, {
      stdio: "ignore",
      timeout: 30000,
    });
    return fs.readFileSync(outPath);
  } finally {
    try {
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
    } catch {}
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {}
  }
}

/**
 * Execute request to Groq Whisper API with exponential backoff on HTTP 429.
 * Uses verbose_json response_format.
 */
async function callGroqWhisper(buffer, filename, mimeType, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in .env.local");
  }

  const model = options.model || DEFAULT_WHISPER_MODEL;
  const prompt = options.prompt || SCAM_VOCABULARY_HINT;
  const language = options.language && options.language !== "auto" ? options.language : undefined;

  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("model", model);
    formData.append("response_format", "verbose_json");
    formData.append("temperature", "0");

    if (prompt) {
      formData.append("prompt", prompt.slice(0, 500));
    }
    if (language) {
      formData.append("language", language);
    }

    const res = await fetch(GROQ_AUDIO_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (res.status === 429) {
      if (attempt <= maxRetries) {
        const delayMs = 1500 * attempt;
        console.warn(`[audioTranscriber] Groq rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw new Error("Groq Whisper API is currently rate limited (HTTP 429). Please wait a moment and try again.");
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Whisper error HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  }
}

/**
 * Evaluates segments from verbose_json to extract low-confidence items.
 * @param {Array<Object>} segments
 * @returns {Array<Object>} Flagged low-confidence segments
 */
export function extractLowConfidenceSegments(segments = []) {
  if (!Array.isArray(segments)) return [];
  const flagged = [];

  for (const seg of segments) {
    // avg_logprob is typically negative; values below -0.8 or no_speech_prob > 0.4 indicate uncertain segments
    const isUncertain = (typeof seg.avg_logprob === "number" && seg.avg_logprob < -0.85) ||
                        (typeof seg.no_speech_prob === "number" && seg.no_speech_prob > 0.4);

    if (isUncertain && seg.text?.trim()) {
      flagged.push({
        id: seg.id,
        text: seg.text.trim(),
        start: seg.start,
        end: seg.end,
        avg_logprob: seg.avg_logprob,
        confidence: Math.max(0.1, Math.min(0.99, Math.exp(seg.avg_logprob || -1))),
      });
    }
  }

  return flagged;
}

/**
 * Unified Core Audio Transcription Function.
 * Used by BOTH web mic (POST /api/transcribe) and WhatsApp webhook.
 *
 * @param {Buffer|Uint8Array} audioBuffer - Raw audio binary
 * @param {string} [filename="audio.webm"]
 * @param {string|null} [languageHint=null] - ISO-639-1 code or "auto"
 * @param {Object} [options={}]
 * @returns {Promise<{
 *   transcript: string,
 *   detectedLanguage: string,
 *   durationSeconds: number,
 *   segments: Array<Object>,
 *   lowConfidenceSegments: Array<Object>,
 *   modelUsed: string
 * }>}
 */
export async function transcribeAudio(audioBuffer, filename = "audio.webm", languageHint = null, options = {}) {
  if (!audioBuffer || !(Buffer.isBuffer(audioBuffer) || audioBuffer instanceof Uint8Array)) {
    throw new Error("Invalid audio buffer provided to transcribeAudio");
  }

  // Support both (buffer, filename, languageHint, options) and (buffer, options)
  let actualFilename = typeof filename === "string" ? filename : (filename?.filename || "audio.webm");
  let actualLang = typeof languageHint === "string" ? languageHint : (filename?.language || options?.language || null);
  let actualOpts = typeof filename === "object" && filename !== null ? filename : (options || {});

  const buffer = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer);

  // Validate size
  if (buffer.length === 0) {
    throw new Error("Audio buffer is empty");
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error(`Audio file exceeds 25 MB limit (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Validate extension
  const ext = (path.extname(actualFilename).replace(".", "") || "webm").toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported audio format: .${ext}. Supported: ${Array.from(SUPPORTED_EXTENSIONS).join(", ")}`);
  }

  // Probe duration
  const probedDuration = probeAudioDuration(buffer, ext);
  if (probedDuration !== null) {
    if (probedDuration < MIN_DURATION_SECONDS) {
      throw new Error(`Recording is too short (${probedDuration.toFixed(1)}s). Please record at least 1 second.`);
    }
    if (probedDuration > MAX_DURATION_SECONDS) {
      throw new Error(`Recording exceeds 3-minute maximum limit (${Math.round(probedDuration)}s).`);
    }
  }

  // Check mock transcript option (for deterministic testing suites)
  if (actualOpts.mockTranscript) {
    return {
      transcript: actualOpts.mockTranscript.trim(),
      detectedLanguage: actualLang && actualLang !== "auto" ? actualLang : "hi",
      durationSeconds: probedDuration || 15.0,
      segments: [{ id: 0, start: 0, end: probedDuration || 15.0, text: actualOpts.mockTranscript.trim(), avg_logprob: -0.15 }],
      lowConfidenceSegments: [],
      modelUsed: "mock-whisper",
    };
  }

  const mimeMap = {
    webm: "audio/webm",
    ogg: "audio/ogg",
    mp4: "audio/mp4",
    m4a: "audio/m4a",
    wav: "audio/wav",
    flac: "audio/flac",
    mp3: "audio/mp3",
  };
  const mimeType = actualOpts.mimeType || mimeMap[ext] || "audio/webm";

  const callOpts = {
    model: actualOpts.model || DEFAULT_WHISPER_MODEL,
    language: actualLang || actualOpts.language,
    prompt: actualOpts.prompt || SCAM_VOCABULARY_HINT,
  };

  let rawResult;

  // Attempt 1: Direct Groq Whisper
  try {
    rawResult = await callGroqWhisper(buffer, actualFilename, mimeType, callOpts);
  } catch (err) {
    console.warn(`[audioTranscriber] Direct Whisper failed (${err.message}). Attempting ffmpeg 16kHz WAV fallback...`);
    // Attempt 2: Convert to 16kHz mono WAV and retry once
    try {
      const wavBuffer = convertAudioToWav(buffer, ext);
      rawResult = await callGroqWhisper(wavBuffer, "converted_audio.wav", "audio/wav", callOpts);
    } catch (fallbackErr) {
      throw new Error(`Whisper transcription failed: ${fallbackErr.message}`);
    }
  }

  const transcript = (rawResult?.text || "").trim();
  const detectedLanguage = rawResult?.language || actualLang || "en";
  const durationSeconds = rawResult?.duration || probedDuration || 0;
  const segments = rawResult?.segments || [];
  const lowConfidenceSegments = extractLowConfidenceSegments(segments);

  return {
    transcript,
    detectedLanguage,
    durationSeconds,
    segments,
    lowConfidenceSegments,
    modelUsed: callOpts.model,
  };
}

/**
 * Translates non-English transcript into high-accuracy English for complaint & filing generation.
 * Preserves all specific entities: bank names, amounts, transaction UTR numbers, UPI IDs, dates, and phone numbers.
 * @param {string} text
 * @param {string} sourceLang
 * @returns {Promise<string>}
 */
export async function translateToEnglish(text, sourceLang) {
  if (!text || sourceLang === "en" || sourceLang === "english") {
    return text;
  }

  const prompt = `You are a forensic legal translator for cybercrime complaints.
Translate the following cyber fraud victim narrative from ${sourceLang} into clear, precise English.
Preserve all specific entities exactly: bank names, amounts, transaction UTR numbers, UPI IDs, dates, and phone numbers.
Do not add any preamble, markdown, or extra commentary. Return ONLY the English translation.

NARRATIVE:
"""
${text}
"""`;

  try {
    const translation = await callGroqChat(
      [{ role: "user", content: prompt }],
      { temperature: 0.0, maxTokens: 1000 }
    );
    return translation ? translation.trim() : text;
  } catch (err) {
    console.warn("[audioTranscriber] Translation fallback to original:", err.message);
    return text;
  }
}
