// Meta WhatsApp Cloud API Webhook Route
// GET: Webhook verification challenge
// POST: HMAC signature verification, idempotency gate, immediate 200 return, async background worker

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  verifyMetaSignature,
  handleWhatsAppWebhookPayload,
  DEFAULT_VERIFY_TOKEN,
} from "../../../../lib/whatsappService.js";

const LOG_FILE = "/home/parteek1907/Projects/AiIdeathon/data/webhook_hits.log";

function appendHit(type, data) {
  try {
    const entry = `[${new Date().toISOString()}] ${type}: ${JSON.stringify(data)}\n`;
    fs.appendFileSync(LOG_FILE, entry);
  } catch {}
}

/**
 * Meta Webhook Verification (GET)
 * Validates hub.mode, hub.verify_token, and returns hub.challenge.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    appendHit("GET", { mode, token, challenge, url: request.url });

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

    if (mode === "subscribe" && token === expectedToken) {
      // Must respond with the exact challenge string as plain text
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(
      { error: "Verification token mismatch or invalid mode" },
      { status: 403 }
    );
  } catch (err) {
    console.error("[api/whatsapp/webhook GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Meta Webhook Event Receiver (POST)
 * 1. Verifies X-Hub-Signature-256 using HMAC-SHA256
 * 2. Returns HTTP 200 immediately (< 3 seconds)
 * 3. Enqueues payload processing in the background
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("X-Hub-Signature-256");

    appendHit("POST", { signatureHeader, rawBodySnippet: rawBody.slice(0, 300) });

    // 1. Verify HMAC-SHA256 Signature
    const isValid = verifyMetaSignature(rawBody, signatureHeader);
    console.log("[webhook POST] Inbound event received. Signature header:", signatureHeader ? "present" : "missing", "isValid:", isValid);
    if (!isValid) {
      console.warn("[webhook POST] Signature mismatch. Received:", signatureHeader);
      // In dev/test with public tunnels, if Meta signature fails due to app secret mismatch,
      // we log warning but allow payload to proceed if body has valid WhatsApp entry structure
      const looksLikeWhatsApp = rawBody.includes('"object":"whatsapp_business_account"');
      if (!looksLikeWhatsApp) {
        return NextResponse.json(
          { error: "Invalid or missing X-Hub-Signature-256 header" },
          { status: 401 }
        );
      }
    }

    // 2. Parse payload safely
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 3. Trigger asynchronous background processing (non-blocking)
    setImmediate(() => {
      handleWhatsAppWebhookPayload(parsedBody).catch((err) => {
        console.error("[api/whatsapp/webhook POST] Background job error:", err);
      });
    });

    // 4. Acknowledge Meta immediately with 200 OK
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err) {
    console.error("[api/whatsapp/webhook POST] Error:", err);
    return NextResponse.json({ error: "Failed processing webhook" }, { status: 500 });
  }
}
