import { NextResponse } from "next/server";
import {
  verifyUserCredentials,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "../../../../lib/dummyStore.js";
import { signSession, COOKIE_NAME } from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local_ip";
    const body = await request.json();
    const { email, password } = body || {};

    const rateLimitKey = `login:${ip}:${(email || "").toLowerCase().trim()}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = verifyUserCredentials(email, password);

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
    }

    resetRateLimit(rateLimitKey);

    const token = await signSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    const response = NextResponse.json({
      success: true,
      user,
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
    console.error("[login] Internal error:", err);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
