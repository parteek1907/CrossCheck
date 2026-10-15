// WhatsApp Account Linking API Route
// GET: Check linking status for current user
// POST: Generate code, verify code, or unlink

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/session.js";
import {
  getWhatsAppLinkByUser,
  getWhatsAppLinkByPhone,
  createWhatsAppLinkCode,
  verifyWhatsAppLinkCode,
  unlinkWhatsAppUser,
} from "../../../../lib/dummyStore.js";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json({ authenticated: false, linked: false });
    }

    const link = getWhatsAppLinkByUser(userId);
    return NextResponse.json({
      authenticated: true,
      linked: !!link,
      phoneNumber: link ? link.phoneNumber : null,
      linkedAt: link ? link.linkedAt : null,
    });
  } catch (err) {
    console.error("[api/whatsapp/link GET] Error:", err);
    return NextResponse.json({ error: "Failed to retrieve WhatsApp link status" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.userId || "usr_guest_account";
    const body = await request.json();
    const { action, phoneNumber, code } = body || {};

    if (action === "generate_code") {
      if (!phoneNumber || String(phoneNumber).replace(/[^0-9]/g, "").length < 10) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit WhatsApp phone number" },
          { status: 400 }
        );
      }

      const cleanPhone = String(phoneNumber).replace(/[^0-9+]/g, "");
      const result = createWhatsAppLinkCode(userId, cleanPhone);

      return NextResponse.json({
        success: true,
        code: result.code,
        expiresAt: result.expiresAt,
        phoneNumber: cleanPhone,
        message: "One-time linking code generated successfully.",
      });
    }

    if (action === "verify_code") {
      if (!phoneNumber || !code) {
        return NextResponse.json(
          { error: "Phone number and 6-digit code are required" },
          { status: 400 }
        );
      }

      const verified = verifyWhatsAppLinkCode(phoneNumber, code);
      if (!verified) {
        return NextResponse.json(
          { error: "Invalid or expired verification code. Please request a new one." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        linked: true,
        phoneNumber: verified.phoneNumber,
        linkedAt: verified.linkedAt,
        message: "WhatsApp account linked successfully!",
      });
    }

    if (action === "unlink") {
      unlinkWhatsAppUser(userId);
      return NextResponse.json({
        success: true,
        unlinked: true,
        message: "WhatsApp account disconnected.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[api/whatsapp/link POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed processing link request" }, { status: 500 });
  }
}
