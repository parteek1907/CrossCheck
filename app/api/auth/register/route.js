import { NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  migrateReportsToUser,
} from "../../../../lib/dummyStore.js";
import { signSession, COOKIE_NAME } from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local_ip";
    const rateLimitKey = `register:${ip}`;

    const rateCheck = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    const body = await request.json();
    const { displayName, email, password, guestReports } = body || {};

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (findUserByEmail(email)) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const user = createUser({ displayName, email, password });
    resetRateLimit(rateLimitKey);

    // Optional migration of guest reports stored in client localStorage
    let migratedCount = 0;
    if (Array.isArray(guestReports) && guestReports.length > 0) {
      migratedCount = migrateReportsToUser(user.id, guestReports);
    }

    // Create session token and cookie
    const token = await signSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    const response = NextResponse.json({
      success: true,
      user,
      migratedCount,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[register] Internal error:", err);
    return NextResponse.json({ error: err.message || "Failed to register" }, { status: 500 });
  }
}
