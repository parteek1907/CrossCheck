// API Route: Incident Draft Retrieval and Single-Use Consumption
// GET: Fetch draft by token with consumed status gate
// POST: Invalidate/consume draft token

import { NextResponse } from "next/server";
import { getIncidentDraft, consumeIncidentDraft } from "../../../../../lib/dummyStore.js";

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Draft token is required" }, { status: 400 });
    }

    const draft = getIncidentDraft(token);
    if (!draft) {
      return NextResponse.json(
        { error: "This incident review link is invalid or has expired." },
        { status: 404 }
      );
    }

    if (draft.status === "consumed") {
      return NextResponse.json(
        {
          error: "This single-use review link has already been accessed and consumed for your security.",
          status: "consumed",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({ success: true, draft });
  } catch (err) {
    console.error("[api/incident/draft GET] Error:", err);
    return NextResponse.json({ error: "Failed to load incident draft" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Draft token is required" }, { status: 400 });
    }

    const draft = getIncidentDraft(token);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const consumedDraft = consumeIncidentDraft(token);
    return NextResponse.json({ success: true, consumed: true, draft: consumedDraft });
  } catch (err) {
    console.error("[api/incident/draft POST] Error:", err);
    return NextResponse.json({ error: "Failed to consume incident draft" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Draft token is required" }, { status: 400 });
    }

    const draft = getIncidentDraft(token);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.incident) {
      draft.incident = {
        ...(draft.incident || {}),
        ...body.incident,
      };
    }
    if (body.transcript) {
      draft.transcript = body.transcript;
    }

    const { persistStore } = await import("../../../../../lib/dummyStore.js");
    persistStore();

    return NextResponse.json({ success: true, draft });
  } catch (err) {
    console.error("[api/incident/draft PUT] Error:", err);
    return NextResponse.json({ error: "Failed to update incident draft" }, { status: 500 });
  }
}

