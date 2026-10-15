import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/session.js";
import { migrateReportsToUser } from "../../../../lib/dummyStore.js";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reports } = body || {};

    const migratedCount = migrateReportsToUser(session.userId, reports || []);
    return NextResponse.json({ success: true, migratedCount });
  } catch (err) {
    return NextResponse.json({ error: "Failed to migrate reports" }, { status: 500 });
  }
}
