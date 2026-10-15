import { runVerificationPipeline } from "../../../lib/verificationPipeline.js";

export const maxDuration = 60;

/**
 * Helper to safely extract readable content from a public URL
 * @param {string} url
 * @returns {Promise<string>}
 */
async function scrapeUrlContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return `Target URL: ${url} (HTTP ${res.status})`;
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract article text / paragraphs
    const paragraphs = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRegex.exec(html)) !== null && paragraphs.length < 15) {
      const cleanP = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (cleanP.length > 25) {
        paragraphs.push(cleanP);
      }
    }

    const bodySnippet = paragraphs.join("\n\n").slice(0, 3000);

    return `Verified URL: ${url}\nPage Title: ${title}\nDescription: ${description}\n\nExtracted Content:\n${bodySnippet || title || url}`;
  } catch (err) {
    console.warn(`[URL Scraper Warning] Failed to fetch ${url}: ${err.message}`);
    return `URL Verification Target: ${url}`;
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { content, claim, url, media } = body;
    let inputContent = (content || claim || "").trim();

    // If a direct URL was provided or content is a pure URL
    const targetUrl = url || (inputContent.match(/^https?:\/\/[^\s]+$/i) ? inputContent : null);
    if (targetUrl) {
      const scraped = await scrapeUrlContent(targetUrl);
      inputContent = scraped;
    }

    // If media is provided without text, supply a descriptive fallback
    if (!inputContent && media) {
      inputContent = `Visual/document media verification: ${media.name || "uploaded_attachment"} (${media.mimeType || "application/octet-stream"})`;
    }

    if (!inputContent || inputContent.length < 5) {
      return new Response(
        JSON.stringify({ error: "Input content is too short. Please provide a substantive claim, URL, document, or image to verify." }),
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
              media,
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
    const report = await runVerificationPipeline(inputContent, { media });
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
