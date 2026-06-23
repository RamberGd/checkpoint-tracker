/**
 * Streaming proxy for the Flask /api/chat SSE endpoint.
 *
 * next.config rewrites() buffer the response before delivering it to the
 * browser, breaking the word-by-word streaming effect. A Route Handler takes
 * priority over rewrites and lets us pipe the ReadableStream directly, so
 * the browser sees each token as Flask yields it.
 */

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:5000";

export async function POST(request: Request) {
  const body = await request.json();

  // Forward the session cookie so Flask-Login can authenticate the request.
  const cookieHeader = request.headers.get("cookie") ?? "";

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_ORIGIN}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return new Response(JSON.stringify({ error: "Backend unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: "Backend error" }), {
      status: upstream.status || 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the SSE body straight through — no buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
