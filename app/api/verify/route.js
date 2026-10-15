import { runVerificationPipeline } from "../../../lib/verificationPipeline.js";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { content, claim } = body;
    const inputContent = (content || claim || "").trim();

    if (!inputContent || inputContent.length < 5) {
      return new Response(
        JSON.stringify({ error: "Input content is too short. Please provide a substantive claim or text to verify." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const isStream = req.headers.get("accept")?.includes("text/event-stream") || new URL(req.url).searchParams.get("stream") === "true";

    if (isStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event, data) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            const report = await runVerificationPipeline(inputContent, {
              onProgress: ({ stage, message, pct }) => {
                sendEvent("progress", { stage, message, pct });
              }
            });

            sendEvent("complete", report);
            controller.close();
          } catch (err) {
            console.error("[/api/verify SSE Error]", err);
            sendEvent("error", { error: err.message || "Verification failed." });
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        }
      });
    }

    // Standard synchronous JSON response
    const report = await runVerificationPipeline(inputContent);
    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[/api/verify Error]", err);
    return new Response(
      JSON.stringify({
        error: "Verification failed.",
        details: err.message || "An unexpected error occurred during evidence retrieval or analysis."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
