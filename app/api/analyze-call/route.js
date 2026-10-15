import { NextResponse } from "next/server";
import { callGemini } from "@/lib/geminiClient.js";
import { normalizeCandidate, verifyFamilySafeWord } from "@/lib/safecircle.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { transcript, safeWord, duressWord, language = "en" } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json(
        { error: "Transcript text is required from microphone or audio." },
        { status: 400 }
      );
    }

    const cleanTranscript = transcript.trim();
    const cleanSafe = (safeWord || "GOLDEN LOTUS").trim();
    const cleanDuress = (duressWord || "SILVER FALCON").trim();

    // 1. First run deterministic local check for exact/partial safe-word or duress matches
    const localCheck = verifyFamilySafeWord(cleanTranscript, {
      language,
      safeWord: cleanSafe,
      duressWord: cleanDuress,
    });

    // 2. Prepare Gemini AI prompt for deep contextual scam & voice-clone analysis
    const systemPrompt = `You are a Senior Digital Forensics & Voice Scam Intelligence Investigator.
Your task is to analyze speech audio/transcripts from an incoming phone call received by a family member.
The family uses an out-of-band secret protocol:
- Registered Family Safe-Word: "${cleanSafe}"
- Silent Duress Coercion Word: "${cleanDuress}"

Speech transcript captured from the call:
"${cleanTranscript}"

FORENSIC EVALUATION CRITERIA:
1. SAFE-WORD VALIDATION:
   - Did the caller state or recite the exact or phonetically near family safe-word ("${cleanSafe}")?
   - Note: Words may have minor speech-to-text spelling differences or spacing.

2. DURESS VALIDATION:
   - Did the caller recite the secret duress word ("${cleanDuress}")?
   - If yes, this means the family member is under actual physical threat, extortion, or kidnapping and is covertly signaling for help.

3. SCAM & EXTORTION PATTERNS (AI Voice-Clones / Social Engineering):
   - Fake Emergency: "Accident ho gaya", "Arrested by police/CBI", "Hospitalized", "Caught in raid", "Urgent bail".
   - Financial Urgency: Demands immediate UPI, bank transfer, cryptocurrency, or gift cards; insists there is no time to think.
   - Isolation Tactics: Telling victim "Don't call mom/dad/police", "Don't hang up", "Keep this secret".
   - Avoidance: Making excuses for why they don't know the safe-word ("I forgot", "I am injured", "Just send the money first").

Return ONLY valid JSON (no markdown formatting, no code blocks):
{
  "verdict": "SCAM_IMPOSTER" | "VERIFIED_FAMILY" | "DURESS_ALERT" | "UNVERIFIED_CALL",
  "confidence": 95,
  "headline": "Bold 1-sentence verdict statement",
  "summary": "2-3 sentences explaining the forensic findings from the caller transcript.",
  "hasSafeWord": true/false,
  "hasDuressWord": true/false,
  "threatSignals": ["List of specific red flags found in the caller's speech"],
  "recommendedActions": ["Clear, immediate action steps for the user"]
}`;

    let aiResult = null;
    try {
      const geminiResponse = await callGemini(
        [{ parts: [{ text: systemPrompt }] }],
        { temperature: 0.1, jsonMode: true }
      );

      if (geminiResponse) {
        // Strip any lingering backticks if present
        const cleanedJson = geminiResponse
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        aiResult = JSON.parse(cleanedJson);
      }
    } catch (aiErr) {
      console.warn("[Analyze-Call API] Gemini call error or parse fail:", aiErr.message);
    }

    // 3. Synthesize result (Fallback to local deterministic rules if AI was unavailable)
    if (!aiResult) {
      if (localCheck.status === "DURESS_ALERT") {
        aiResult = {
          verdict: "DURESS_ALERT",
          confidence: 99,
          headline: "CRITICAL: Silent Duress Signal Recited by Caller",
          summary: `The caller uttered your secret duress distress phrase ("${cleanDuress}"). They may be physically coerced or trapped.`,
          hasSafeWord: false,
          hasDuressWord: true,
          threatSignals: ["Duress emergency phrase spoken", "Suspected coercion or hostage situation"],
          recommendedActions: [
            "Do NOT transfer funds to any account requested by the caller.",
            "Stay calm and avoid provoking whoever may be monitoring them.",
            "Immediately report this to local police or cyber helpline 1930."
          ]
        };
      } else if (localCheck.status === "AUTHENTIC_FAMILY") {
        aiResult = {
          verdict: "VERIFIED_FAMILY",
          confidence: 98,
          headline: "Verified: Authentic Family Member",
          summary: `The caller accurately communicated your family safe-word ("${cleanSafe}"). Caller identity is confirmed authentic.`,
          hasSafeWord: true,
          hasDuressWord: false,
          threatSignals: [],
          recommendedActions: [
            "Safe-word verified. You can proceed with regular conversation.",
            "Keep the safe-word private within your inner family circle."
          ]
        };
      } else {
        const norm = normalizeCandidate(cleanTranscript);
        const scamKeywords = [
          "accident", "police", "jail", "arrest", "cbi", "urgent", "money", "paise",
          "hospital", "turant", "bhejo", "transfer", "kidnap", "emergency", "upi", "qr code"
        ];
        const matchedKeywords = scamKeywords.filter(k => norm.includes(k));
        const isLikelyScam = matchedKeywords.length > 0;

        aiResult = {
          verdict: isLikelyScam ? "SCAM_IMPOSTER" : "UNVERIFIED_CALL",
          confidence: isLikelyScam ? 94 : 75,
          headline: isLikelyScam
            ? "WARNING: Imposter Scam Detected (Voice-Clone / Extortion)"
            : "Caution: Unrecognized Caller (Safe-Word Missing)",
          summary: isLikelyScam
            ? `The caller did not provide the safe-word ("${cleanSafe}") and exhibited high-pressure tactics (${matchedKeywords.join(", ")}).`
            : `The caller did not provide your family safe-word ("${cleanSafe}").`,
          hasSafeWord: false,
          hasDuressWord: false,
          threatSignals: isLikelyScam
            ? ["Failed safe-word check", "Artificial crisis / urgency detected", ...matchedKeywords.map(k => `High-risk term: "${k}"`)]
            : ["Missing family safe-word"],
          recommendedActions: [
            "Immediately disconnect the phone call.",
            "Do NOT transfer any money or provide OTPs.",
            "Call your relative directly on their known, saved phone number to verify."
          ]
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...aiResult,
        transcript: cleanTranscript,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[Analyze-Call API] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze call audio: " + error.message },
      { status: 500 }
    );
  }
}
