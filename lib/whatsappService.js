// Crosscheck WhatsApp Cloud API Service
// Handles Meta signature verification, Cloud API messaging, media download, and idempotency.

import crypto from "node:crypto";
import {
  isEventProcessed,
  recordProcessedEvent,
  saveIncidentDraft,
  getIncidentDraft,
  getWhatsAppLinkByPhone,
  deletePendingDraftsByPhone,
  recordOutboundWhatsAppMessage,
  getMockMedia,
  getWhatsAppSession,
  setWhatsAppSession,
  clearWhatsAppSession,
  getLatestPendingDraftByPhone,
} from "./dummyStore.js";
import { processIncident } from "./incidentExtractor.js";
import { getNextFollowUpQuestion, countMissingFollowUps, FOLLOW_UP_PRIORITIES } from "./followUpEngine.js";


export const DEFAULT_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "crosscheck_verify_token";
export const DEFAULT_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "274f5e505a9ec8c705108bfe0309bf09a";
export function getBaseAppUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}
export const BASE_APP_URL = process.env.APP_BASE_URL || "http://localhost:3000";

/**
 * Validates Meta's HMAC-SHA256 signature from the X-Hub-Signature-256 header.
 * Uses timingSafeEqual to prevent side-channel timing attacks.
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {string} [appSecret]
 * @returns {boolean}
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret = DEFAULT_APP_SECRET) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  if (!appSecret) {
    return false;
  }

  try {
    const signature = signatureHeader.slice(7);
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody, "utf-8");
    const expected = hmac.digest("hex");

    if (signature.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch (err) {
    console.warn("[whatsappService] Error verifying Meta signature:", err.message);
    return false;
  }
}

/**
 * In-memory log of dispatched outbound WhatsApp messages (for audit & testing)
 */
export const outboundMessageLog = [];

/**
 * Sends a message via Meta WhatsApp Cloud API.
 * In dev/test mode without live tokens, records to outboundMessageLog.
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. "919876543210")
 * @param {string} params.text - Body text
 * @param {Array<Object>} [params.buttons] - Interactive quick reply buttons [{ id: string, title: string }]
 * @returns {Promise<Object>}
 */
export async function sendWhatsAppMessage({ to, text, buttons }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Handle Meta interactive message character limit:
  // Meta Cloud API strictly enforces interactive.body.text <= 1024 chars.
  // Full incident summaries and dossiers frequently exceed 1000 characters.
  // When text is long, we send the complete incident dossier first as a standard text message
  // (which supports up to 4096 chars), and then follow up with interactive action buttons.
  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    if (text && text.length > 1000) {
      console.log(`[whatsappService] Message body length (${text.length}) exceeds Meta interactive limit (1024). Splitting into text + interactive buttons.`);
      await sendWhatsAppMessage({ to, text });
      return await sendWhatsAppMessage({
        to,
        text: "⚡ *Quick Actions:*\nPlease select an option below to proceed:",
        buttons,
      });
    }
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: String(to).replace(/[^0-9]/g, ""),
  };

  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    payload.type = "interactive";
    payload.interactive = {
      type: "button",
      body: { text: (text || "").slice(0, 1020) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: {
            id: b.id,
            title: b.title.slice(0, 20),
          },
        })),
      },
    };
  } else {
    payload.type = "text";
    payload.text = { body: text || "" };
  }

  // Record to in-memory log for testing and verification
  outboundMessageLog.push({
    to: payload.to,
    payload,
    timestamp: new Date().toISOString(),
  });

  // Also persist to dummyStore so tests and multi-process callers can read it reliably
  recordOutboundWhatsAppMessage({
    to: payload.to,
    payload,
    timestamp: new Date().toISOString(),
  });

  if (token && phoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[whatsappService] Meta API responded HTTP ${res.status}: ${errText}`);
        // Fallback: if interactive failed for ANY reason, retry sending as plain text so user is never left without a response
        if (payload.type === "interactive") {
          console.warn("[whatsappService] Retrying delivery as plain text fallback...");
          return await sendWhatsAppMessage({ to, text });
        }
      }

      return await res.json().catch(() => ({ status: "sent" }));
    } catch (err) {
      console.error("[whatsappService] Failed sending WhatsApp message:", err.message);
      if (payload.type === "interactive") {
        return await sendWhatsAppMessage({ to, text });
      }
      return { status: "error", error: err.message };
    }
  }

  // Dev / Mock simulation mode
  return { status: "simulated", recipient: payload.to, messageId: `wamid.sim_${Date.now()}` };
}

/**
 * In-memory registry for mock media in test/demo mode
 */
export const mockMediaRegistry = new Map();

export function registerMockWhatsAppMedia(mediaId, data) {
  mockMediaRegistry.set(mediaId, data);
}

/**
 * Downloads media from Meta WhatsApp Graph API.
 * In test mode or when registered, retrieves from mockMediaRegistry.
 * @param {string} mediaId
 * @returns {Promise<{ buffer: Buffer, mimeType: string, mockTranscript?: string }>}
 */
export async function downloadWhatsAppMedia(mediaId) {
  if (mockMediaRegistry.has(mediaId)) {
    return mockMediaRegistry.get(mediaId);
  }

  const persistedMock = getMockMedia(mediaId);
  if (persistedMock) {
    return persistedMock;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (token && mediaId && !mediaId.startsWith("mock_")) {
    try {
      console.log(`[whatsappService] Retrieving media metadata from Meta for mediaId: ${mediaId}`);
      // 1. Get media URL
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "curl/7.81.0",
        },
      });
      if (!metaRes.ok) throw new Error(`Failed to retrieve media metadata: ${metaRes.status}`);
      const metaData = await metaRes.json();
      const downloadUrl = metaData.url;
      const mimeType = metaData.mime_type || "audio/ogg";

      console.log(`[whatsappService] Downloading binary from Meta CDN: ${mimeType}`);
      // 2. Fetch actual audio binary
      const binRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "curl/7.81.0",
        },
      });
      if (!binRes.ok) throw new Error(`Failed to download audio binary: ${binRes.status}`);
      const arrayBuf = await binRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      console.log(`[whatsappService] Successfully downloaded audio binary: ${buffer.length} bytes`);
      return { buffer, mimeType };
    } catch (err) {
      console.error(`[whatsappService] Error downloading Meta media ${mediaId}:`, err.message);
    }
  }

  // Fallback / mock media for tests
  return {
    buffer: Buffer.from("OggS" + "mock-audio-data"),
    mimeType: "audio/ogg",
  };
}

/**
 * Handles incoming WhatsApp webhook events in the background.
 * @param {Object} body
 */
export async function handleWhatsAppWebhookPayload(body) {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return;
    }

    for (const msg of messages) {
      const msgId = msg.id;
      // Idempotency check: drop if message ID already processed
      if (isEventProcessed(msgId)) {
        continue;
      }
      recordProcessedEvent(msgId);

      // Process message asynchronously
      await processIncomingWhatsAppMessage(msg, value);
    }
  } catch (err) {
    console.error("[whatsappService] Error handling webhook payload:", err);
  }
}

/**
 * Formats structured incident extraction results for WhatsApp victim chat.
 * Strictly adheres to 1930 Helpline and cybercrime.gov.in guidance.
 * Never claims Crosscheck blocks accounts.
 * @param {Object} incident
 * @param {string} draftUrl
 * @returns {string}
 */
export function formatIncidentSummaryMessage(incident, draftUrl) {
  const typeLabels = {
    financial_fraud: "Financial Fraud / Scam",
    impersonation: "Identity / Profile Impersonation",
    sextortion: "Online Blackmail / Sextortion",
    harassment: "Cyberstalking / Harassment",
    other: "Cybercrime Incident",
  };

  const type = typeLabels[incident.incident_type] || "Cybercrime Incident";
  const amount = incident.amount_inr ? `₹${Number(incident.amount_inr).toLocaleString("en-IN")}` : "Not stated";
  const time = incident.date_time || "Not specified";
  const bank = incident.bank_name || "Not specified";
  const scammerPhones = incident.scammer_identifiers?.phones?.join(", ") || "";
  const scammerUpis = incident.scammer_identifiers?.upi_ids?.join(", ") || "";
  const scammerHandles = incident.scammer_identifiers?.handles?.join(", ") || "";
  const scammerContact = [scammerPhones, scammerUpis, scammerHandles].filter(Boolean).join(" | ") || "Not provided";
  const utrs = incident.transaction_ids?.join(", ") || "Not provided";

  let msg = `🛡️ *Crosscheck Incident Analysis*\n\n`;
  msg += `We have recorded and structured your report:\n`;
  msg += `• *Category:* ${type}\n`;
  if (incident.amount_inr || incident.incident_type === "financial_fraud") {
    msg += `• *Amount Lost:* ${amount}\n`;
  }
  msg += `• *Date & Time:* ${time}\n`;
  if (incident.bank_name) {
    msg += `• *Bank / App:* ${bank}\n`;
  }
  if (scammerContact !== "Not provided") {
    msg += `• *Scammer Identifiers:* ${scammerContact}\n`;
  }
  if (utrs !== "Not provided") {
    msg += `• *Transaction / UTR:* ${utrs}\n`;
  }

  msg += `\n📌 *Summary:*\n_${incident.timeline_summary}_\n`;

  if (incident.incident_type === "financial_fraud" && incident.money_lost_recently) {
    msg += `\n🚨 *CRITICAL ACTION (Golden Hour):*\n`;
    msg += `Dial the National Cybercrime Helpline *1930* immediately. Provide your transaction UTR (${utrs !== "Not provided" ? utrs : "from your bank SMS"}) to request a temporary freeze under the Citizen Financial Cyber Fraud Reporting System.\n`;
  }

  msg += `\n📄 *Official Report & Bank Pack:*\n`;
  msg += `Review your pre-filled complaint and generate your 3-page Police & Bank filing pack:\n`;
  msg += `👉 ${draftUrl}\n\n`;
  msg += `_(Note: This link is single-use for your security. Crosscheck provides verification and legal documentation; we do not block bank accounts directly.)_`;

  return msg;
}

/**
 * Processes an individual verified incoming WhatsApp message.
 * Supports text narratives, commands (HELP, DELETE, STOP), and interactive replies.
 * (Voice notes handled in Step 4).
 * @param {Object} msg - WhatsApp message object
 * @param {Object} [metadata]
 * @returns {Promise<Object>}
 */
export async function processIncomingWhatsAppMessage(msg, metadata = {}) {
  const from = msg.from;
  const msgType = msg.type;

  // 1. Interactive Button Reply Processing
  if (msgType === "interactive") {
    const buttonReply = msg.interactive?.button_reply || {};
    const buttonId = buttonReply.id;

    // Button: Confirm & View Pack
    if (buttonId === "btn_confirm") {
      clearWhatsAppSession(from);
      const draft = getLatestPendingDraftByPhone(from);
      const draftUrl = draft ? `${getBaseAppUrl()}/report-incident/draft/${draft.token}` : `${getBaseAppUrl()}/report-incident`;

      const confirmMsg =
        `✅ *Incident Details Confirmed*\n\n` +
        `Your formal cybercrime and bank filing pack is prepared:\n` +
        `👉 ${draftUrl}\n\n` +
        `*Immediate Action Steps:*\n` +
        `1. *Dial 1930 Helpline:* Report your UTR reference immediately for emergency transaction freeze.\n` +
        `2. *Portal Filing:* Submit your report on cybercrime.gov.in using the pre-filled fields.\n` +
        `3. *Bank Dispute:* Email your bank's Nodal Officer with the formal RBI zero-liability dispute notice from your pack.\n\n` +
        `_(Crosscheck does not file complaints on your behalf or block accounts directly.)_`;

      await sendWhatsAppMessage({ to: from, text: confirmMsg });
      return { handled: true, type: "interactive_confirm", buttonId };
    }

    // Button: Add Missing Info
    if (buttonId === "btn_add_info") {
      const draft = getLatestPendingDraftByPhone(from);
      if (!draft) {
        await sendWhatsAppMessage({ to: from, text: "No pending incident draft found. Please describe what happened first." });
        return { handled: true, error: "No draft" };
      }

      const nextQ = getNextFollowUpQuestion(draft.incident, []);
      if (nextQ) {
        setWhatsAppSession(from, {
          state: "awaiting_followup",
          currentKey: nextQ.key,
          draftToken: draft.token,
          answeredKeys: [],
          skippedKeys: [],
        });

        const qMsg =
          `📝 *Follow-up Question (1 of 3)*\n\n` +
          `${nextQ.question.en}\n\n` +
          `_${nextQ.hint.en}_\n\n` +
          `_(Type your answer below, or click Skip)_`;

        await sendWhatsAppMessage({
          to: from,
          text: qMsg,
          buttons: [{ id: "btn_skip", title: "Skip Question" }],
        });
        return { handled: true, type: "followup_started", questionKey: nextQ.key };
      } else {
        await sendWhatsAppMessage({
          to: from,
          text: `All critical fields are already recorded. You can review your filing pack here:\n👉 ${getBaseAppUrl()}/report-incident/draft/${draft.token}`,
          buttons: [{ id: "btn_confirm", title: "View Final Pack" }],
        });
        return { handled: true, type: "no_missing_fields" };
      }
    }

    // Button: Skip Question
    if (buttonId === "btn_skip") {
      const session = getWhatsAppSession(from);
      if (!session || !session.draftToken) {
        await sendWhatsAppMessage({ to: from, text: "No active follow-up session. Type what happened to start." });
        return { handled: true, type: "no_session" };
      }

      session.skippedKeys = Array.from(new Set([...(session.skippedKeys || []), session.currentKey]));
      const draft = getIncidentDraft(session.draftToken);
      const allExcluded = [...(session.answeredKeys || []), ...(session.skippedKeys || [])];
      const nextQ = draft ? getNextFollowUpQuestion(draft.incident, allExcluded) : null;

      if (nextQ && (session.answeredKeys || []).length < 3) {
        session.currentKey = nextQ.key;
        setWhatsAppSession(from, session);

        const stepNum = (session.answeredKeys || []).length + (session.skippedKeys || []).length + 1;
        const qMsg =
          `📝 *Follow-up Question (${stepNum} of 3)*\n\n` +
          `${nextQ.question.en}\n\n` +
          `_${nextQ.hint.en}_\n\n` +
          `_(Type your answer below, or click Skip)_`;

        await sendWhatsAppMessage({
          to: from,
          text: qMsg,
          buttons: [{ id: "btn_skip", title: "Skip Question" }],
        });
        return { handled: true, type: "followup_skipped_next", nextKey: nextQ.key };
      } else {
        clearWhatsAppSession(from);
        const draftUrl = `${getBaseAppUrl()}/report-incident/draft/${session.draftToken}`;
        await sendWhatsAppMessage({
          to: from,
          text:
            `✅ *Follow-up complete!*\n\n` +
            `Your incident report and filing pack are ready:\n👉 ${draftUrl}`,
          buttons: [{ id: "btn_confirm", title: "Confirm & View Pack" }],
        });
        return { handled: true, type: "followup_finished" };
      }
    }

    // Button: Cancel / Delete
    if (buttonId === "btn_delete") {
      deletePendingDraftsByPhone(from);
      clearWhatsAppSession(from);
      await sendWhatsAppMessage({
        to: from,
        text: `All pending incident drafts for this number have been securely deleted.`,
      });
      return { handled: true, type: "interactive_delete", buttonId };
    }
  }

  // 2. Text Message Processing
  if (msgType === "text") {
    const rawText = (msg.text?.body || "").trim();
    const upperText = rawText.toUpperCase();

    // Command: HELP / MENU
    if (upperText === "HELP" || upperText === "MENU") {
      const helpMsg =
        `🛡️ *Tell Crosscheck Help*\n\n` +
        `Tell Crosscheck helps victims of online fraud and cybercrime structure their complaint and prepare formal filings:\n\n` +
        `• *Report a scam:* Type what happened in your own words or send a voice note.\n` +
        `• *Official channels:* Dial *1930* or file on *cybercrime.gov.in*.\n` +
        `• *Delete pending draft:* Reply *DELETE* to purge your unsaved draft.\n` +
        `• *Opt-out:* Reply *STOP* to pause notifications.\n\n` +
        `_(Crosscheck provides forensic documentation and verification; we do not block bank accounts directly.)_`;

      await sendWhatsAppMessage({ to: from, text: helpMsg });
      return { handled: true, type: "command", command: "HELP" };
    }

    // Command: STOP
    if (upperText === "STOP") {
      clearWhatsAppSession(from);
      const stopMsg = `You have unsubscribed from Crosscheck WhatsApp notifications. You can resume anytime by sending a message or voice note.`;
      await sendWhatsAppMessage({ to: from, text: stopMsg });
      return { handled: true, type: "command", command: "STOP" };
    }

    // Command: DELETE
    if (upperText === "DELETE") {
      clearWhatsAppSession(from);
      const deletedCount = deletePendingDraftsByPhone(from);
      const delMsg =
        deletedCount > 0
          ? `All pending incident drafts associated with this number have been securely deleted.`
          : `No pending drafts found for this number.`;
      await sendWhatsAppMessage({ to: from, text: delMsg });
      return { handled: true, type: "command", command: "DELETE", count: deletedCount };
    }

    // Check if user is currently answering a follow-up question
    const activeSession = getWhatsAppSession(from);
    if (activeSession && activeSession.state === "awaiting_followup" && activeSession.currentKey) {
      if (upperText === "SKIP") {
        // Handle text "SKIP" like btn_skip
        activeSession.skippedKeys = Array.from(new Set([...(activeSession.skippedKeys || []), activeSession.currentKey]));
        const draft = getIncidentDraft(activeSession.draftToken);
        const allExcluded = [...(activeSession.answeredKeys || []), ...(activeSession.skippedKeys || [])];
        const nextQ = draft ? getNextFollowUpQuestion(draft.incident, allExcluded) : null;

        if (nextQ && (activeSession.answeredKeys || []).length < 3) {
          activeSession.currentKey = nextQ.key;
          setWhatsAppSession(from, activeSession);

          await sendWhatsAppMessage({
            to: from,
            text: `📝 *Next Question:*\n\n${nextQ.question.en}\n\n_${nextQ.hint.en}_`,
            buttons: [{ id: "btn_skip", title: "Skip Question" }],
          });
          return { handled: true, type: "followup_skipped_text", nextKey: nextQ.key };
        } else {
          clearWhatsAppSession(from);
          const draftUrl = `${getBaseAppUrl()}/report-incident/draft/${activeSession.draftToken}`;
          await sendWhatsAppMessage({
            to: from,
            text: `✅ *Follow-up complete!*\n\nYour incident report and filing pack are ready:\n👉 ${draftUrl}`,
            buttons: [{ id: "btn_confirm", title: "Confirm & View Pack" }],
          });
          return { handled: true, type: "followup_finished" };
        }
      }

      // Apply answer to draft
      const draft = getIncidentDraft(activeSession.draftToken);
      const priorityItem = FOLLOW_UP_PRIORITIES.find((p) => p.key === activeSession.currentKey);

      if (draft && priorityItem) {
        draft.incident = priorityItem.applyAnswer(draft.incident, rawText);
        saveIncidentDraft(draft);

        activeSession.answeredKeys = Array.from(new Set([...(activeSession.answeredKeys || []), activeSession.currentKey]));
        const allExcluded = [...activeSession.answeredKeys, ...(activeSession.skippedKeys || [])];
        const nextQ = getNextFollowUpQuestion(draft.incident, allExcluded);

        if (nextQ && activeSession.answeredKeys.length < 3) {
          activeSession.currentKey = nextQ.key;
          setWhatsAppSession(from, activeSession);

          const stepNum = activeSession.answeredKeys.length + 1;
          await sendWhatsAppMessage({
            to: from,
            text:
              `✅ *Detail recorded.*\n\n` +
              `📝 *Follow-up Question (${stepNum} of 3)*\n\n` +
              `${nextQ.question.en}\n\n` +
              `_${nextQ.hint.en}_\n\n` +
              `_(Type your answer below, or click Skip)_`,
            buttons: [{ id: "btn_skip", title: "Skip Question" }],
          });
          return { handled: true, type: "followup_answered_next", nextKey: nextQ.key };
        } else {
          clearWhatsAppSession(from);
          const draftUrl = `${getBaseAppUrl()}/report-incident/draft/${draft.token}`;
          await sendWhatsAppMessage({
            to: from,
            text:
              `✅ *All details added successfully!*\n\n` +
              `Your 3-page Police & Bank complaint pack has been updated:\n👉 ${draftUrl}`,
            buttons: [{ id: "btn_confirm", title: "View Final Pack" }],
          });
          return { handled: true, type: "followup_all_answered" };
        }
      }
    }

    // If text is too short / non-descriptive
    if (rawText.length < 5) {
      const shortMsg = `You did the right thing coming here. Please describe what happened in your own words (e.g. amount lost, scammer's phone/UPI, payment app, or what they asked you to do) or send a voice note.`;
      await sendWhatsAppMessage({ to: from, text: shortMsg });
      return { handled: true, type: "prompt" };
    }

    // Run shared extraction pipeline
    const incident = await processIncident({ narrative: rawText });

    // Generate single-use secure draft token
    const token = crypto.randomBytes(16).toString("hex");
    const linkedUser = getWhatsAppLinkByPhone(from);

    // Save draft in dummyStore
    saveIncidentDraft({
      token,
      incident,
      transcript: rawText,
      source: "whatsapp",
      phoneNumber: from,
      userId: linkedUser?.userId || null,
    });

    // Format single-use review URL and chat response
    const draftUrl = `${getBaseAppUrl()}/report-incident/draft/${token}`;
    const replyText = formatIncidentSummaryMessage(incident, draftUrl);

    // Quick reply buttons: Confirm, Add Missing Info (if missing fields exist), and Delete
    const missingCount = countMissingFollowUps(incident);
    const buttons = [
      { id: "btn_confirm", title: "Confirm & View Pack" },
      ...(missingCount > 0 ? [{ id: "btn_add_info", title: "Add Missing Details" }] : []),
      { id: "btn_delete", title: "Cancel / Delete" },
    ].slice(0, 3);

    // Send confirmation message with interactive buttons to victim
    await sendWhatsAppMessage({
      to: from,
      text: replyText,
      buttons,
    });

    return {
      handled: true,
      type: "incident_created",
      token,
      draftUrl,
      incident,
    };
  }

  // 3. Audio Voice Note Processing
  if (msgType === "audio") {
    const audioObj = msg.audio || {};
    const mediaId = audioObj.id;
    const rawMime = audioObj.mime_type || "audio/ogg";
    const mimeType = rawMime.split(";")[0].trim();

    if (!mediaId) {
      await sendWhatsAppMessage({
        to: from,
        text: "We could not access the audio file. Please try recording again or send your description as text.",
      });
      return { handled: true, error: "Missing audio media ID" };
    }

    // Retrieve audio media
    const mediaData = await downloadWhatsAppMedia(mediaId);
    const audioBuffer = mediaData.buffer;
    const mockTranscript = mediaData.mockTranscript;

    // Run unified processing pipeline (transcribes via Whisper, with ffmpeg fallback, then extracts)
    let incident;
    try {
      incident = await processIncident({
        audioBuffer,
        mimeType: mediaData.mimeType || mimeType,
        mockTranscript,
      });
    } catch (err) {
      console.warn("[whatsappService] Audio processing failed:", err.message);
      if (err.message.includes("3-minute") || err.message.includes("exceeds 3-minute") || err.message.includes("180s")) {
        await sendWhatsAppMessage({
          to: from,
          text: "⚠️ *Voice Note Exceeds 3 Minutes*\n\nTo ensure complete accuracy and swift emergency processing for 1930 Helpline, please send an audio under 3 minutes (180 seconds). You can also send your incident description directly as text.",
        });
      } else if (err.message.includes("too short")) {
        await sendWhatsAppMessage({
          to: from,
          text: "⚠️ *Voice Note Too Short*\n\nYour voice recording was under 1 second. Please hold the mic and speak for a few seconds, or type your complaint.",
        });
      } else {
        await sendWhatsAppMessage({
          to: from,
          text: "We received your voice note but could not transcribe it clearly. Please try speaking again in a quiet environment, or type the details in text.",
        });
      }
      return { handled: true, error: err.message };
    }

    // Generate single-use secure draft token
    const token = crypto.randomBytes(16).toString("hex");
    const linkedUser = getWhatsAppLinkByPhone(from);

    // Save draft in dummyStore with source: "whatsapp_voice" and dual transcripts
    saveIncidentDraft({
      token,
      incident,
      transcript: incident.transcript || "",
      originalTranscript: incident.original_transcript || incident.transcript || "",
      englishTranscript: incident.english_transcript || incident.transcript || "",
      detectedLanguage: incident.detected_language || "en",
      source: "whatsapp_voice",
      phoneNumber: from,
      userId: linkedUser?.userId || null,
    });

    // Format single-use review URL and chat response
    const draftUrl = `${getBaseAppUrl()}/report-incident/draft/${token}`;
    const baseSummary = formatIncidentSummaryMessage(incident, draftUrl);
    const voiceReplyText = baseSummary.replace(
      "🛡️ *Crosscheck Incident Analysis*",
      "🎙️ *Voice Note Transcribed & Analyzed*"
    );

    const missingCount = countMissingFollowUps(incident);
    const buttons = [
      { id: "btn_confirm", title: "Confirm & View Pack" },
      ...(missingCount > 0 ? [{ id: "btn_add_info", title: "Add Missing Details" }] : []),
      { id: "btn_delete", title: "Cancel / Delete" },
    ].slice(0, 3);

    // Send confirmation message to victim with buttons
    await sendWhatsAppMessage({
      to: from,
      text: voiceReplyText,
      buttons,
    });

    return {
      handled: true,
      type: "voice_incident_created",
      token,
      draftUrl,
      incident,
      transcript: incident.transcript,
    };
  }


  return { handled: false, from, msgType, id: msg.id };
}


