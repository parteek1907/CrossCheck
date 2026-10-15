// Crosscheck WhatsApp Interactive Demo API
// Allows users & evaluators to simulate 1-click voice note or text intake from WhatsApp.
// Automatically runs the unified transcription and extraction pipeline, records draft, and returns review link.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionFromRequest } from "../../../../lib/session.js";
import {
  registerMockMedia,
  getWhatsAppLinkByUser,
  getStore,
} from "../../../../lib/dummyStore.js";
import { processIncomingWhatsAppMessage } from "../../../../lib/whatsappService.js";

const DEFAULT_VOICE_TRANSCRIPT =
  "Mera naam Rajesh Kumar hai. Aaj subah 10:15 baje mujhe ek call aaya Electricity Department impersonator se. Bola bill unpaid hai aur power cut ho jayegi. Unhone phone me QuickSupport app install karwaya aur ₹10 pay karne ko bola. Jaise hi maine pay kiya, mere State Bank of India account se ₹48,500 debit ho gaye! Transaction UTR 429184719283 hai aur scammer ka phone +91 98765 43210 tha. Please help me freeze this transaction.";

const DEFAULT_TEXT_NARRATIVE =
  "Urgent: I received a fake courier delivery SMS asking for ₹25 redelivery fee. I clicked the phishing link and entered my UPI PIN on the fake portal. Immediately ₹65,000 was debited from my HDFC Bank account to scammer UPI ID scammer@okhdfcbank. Transaction reference UTR is 987123456012. It happened 20 minutes ago.";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.userId || null;
    let userLinkedPhone = null;

    if (userId) {
      const link = getWhatsAppLinkByUser(userId);
      if (link) {
        userLinkedPhone = link.phoneNumber;
      }
    }

    const body = await request.json().catch(() => ({}));
    const type = body.type === "text" ? "text" : "voice";
    const narrative = (body.narrative || "").trim();
    const phoneNumber = body.phoneNumber || userLinkedPhone || "919876543210";
    const msgId = `wamid.demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let incomingMsg;
    const metadata = {
      display_phone_number: "15551234567",
      phone_number_id: "crosscheck_demo_phone_id",
      contactName: session?.name || "Demo Reporter",
    };

    if (type === "voice") {
      const mediaId = `mock_voice_${Date.now()}`;
      const transcript = narrative || DEFAULT_VOICE_TRANSCRIPT;

      // Register synthetic audio with mock transcript
      registerMockMedia(mediaId, {
        buffer: Buffer.from("OggS" + "synthetic_voice_sample_audio_stream"),
        mimeType: "audio/ogg",
        mockTranscript: transcript,
      });

      incomingMsg = {
        from: phoneNumber,
        id: msgId,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: "audio",
        audio: {
          id: mediaId,
          mime_type: "audio/ogg",
        },
      };
    } else {
      incomingMsg = {
        from: phoneNumber,
        id: msgId,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: "text",
        text: {
          body: narrative || DEFAULT_TEXT_NARRATIVE,
        },
      };
    }

    // Process message through full WhatsApp ingestion pipeline
    const result = await processIncomingWhatsAppMessage(incomingMsg, {
      messages: [incomingMsg],
      contacts: [{ profile: { name: metadata.contactName }, wa_id: phoneNumber }],
    });

    return NextResponse.json({
      success: true,
      simulatedType: type,
      phoneNumber,
      token: result.token,
      draftUrl: result.draftUrl,
      incident: result.incident,
      transcript: result.transcript || result.incident?.narrative || narrative,
      handledType: result.type,
      message: "Simulated WhatsApp intake processed successfully.",
    });
  } catch (err) {
    console.error("[api/whatsapp/demo POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed running WhatsApp demo intake" },
      { status: 500 }
    );
  }
}
