import { NextResponse } from "next/server";
import { processIncident } from "../../../../lib/incidentExtractor.js";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let incident;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const narrative = formData.get("narrative") || formData.get("text");
      const audioFile = formData.get("audio") || formData.get("file");

      if (audioFile && typeof audioFile === "object") {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        incident = await processIncident({
          audioBuffer: buffer,
          mimeType: audioFile.type || "audio/ogg",
          filename: audioFile.name || "audio.ogg",
        });
      } else if (narrative) {
        incident = await processIncident({ narrative: String(narrative) });
      } else {
        return NextResponse.json(
          { error: "Please provide a narrative or audio recording" },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const narrative = body?.narrative || body?.text;
      if (!narrative && !body?.audioBase64 && !body?.audioBuffer) {
        return NextResponse.json(
          { error: "Please provide a description of the incident" },
          { status: 400 }
        );
      }
      incident = await processIncident(body);
    }

    return NextResponse.json({
      success: true,
      incident,
      transcript: incident.transcript,
      source: incident.source,
    });
  } catch (err) {
    console.error("[api/incident/extract] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to extract incident details" },
      { status: 500 }
    );
  }
}

