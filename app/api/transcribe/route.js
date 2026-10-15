// Unified Audio Transcription API Route
// POST /api/transcribe
// Handles audio uploads from the web mic component, runs shared transcribeAudio,
// and produces dual transcripts (original language + English translation).

import { NextResponse } from "next/server";
import { transcribeAudio, translateToEnglish } from "../../../lib/audioTranscriber.js";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("audio");
    const languageHint = formData.get("language") || null;
    const customPrompt = formData.get("prompt") || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No audio file provided in request." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || "mic_recording.webm";

    // Run shared core transcription
    const result = await transcribeAudio(buffer, filename, languageHint, {
      prompt: customPrompt,
    });

    // Generate English version if non-English
    let englishTranscript = result.transcript;
    if (result.detectedLanguage && result.detectedLanguage !== "en") {
      englishTranscript = await translateToEnglish(result.transcript, result.detectedLanguage);
    }

    // Return structured payload without logging transcripts
    return NextResponse.json({
      success: true,
      originalTranscript: result.transcript,
      englishTranscript,
      detectedLanguage: result.detectedLanguage,
      durationSeconds: result.durationSeconds,
      segments: result.segments,
      lowConfidenceSegments: result.lowConfidenceSegments,
      modelUsed: result.modelUsed,
    });
  } catch (err) {
    console.error("[api/transcribe] Error:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to transcribe audio.",
      },
      { status: err.message.includes("limit") || err.message.includes("short") ? 400 : 500 }
    );
  }
}
