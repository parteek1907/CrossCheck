import { classifyDomain } from "../../../../lib/domainDb.js";


export async function GET(req, { params }) {
  try {
    const domain = (await params)?.domain || "";
    if (!domain) {
      return new Response(JSON.stringify({ error: "Domain parameter is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const profile = classifyDomain(domain);
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
