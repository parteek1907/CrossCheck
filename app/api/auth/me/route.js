import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/session.js";
import { findUserById } from "../../../../lib/dummyStore.js";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const { passwordHash, ...safeUser } = user;
    return NextResponse.json({
      authenticated: true,
      user: safeUser,
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
