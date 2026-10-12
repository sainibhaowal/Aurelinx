const NO_STORE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
  "Content-Type": "text/event-stream; charset=utf-8",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/** Forward an SSE request without buffering it in the Next rewrite proxy. */
export async function proxyEventStream(request, endpoint) {
  const backendOrigin = (
    process.env.INTERNAL_API_URL ||
    process.env.API_INTERNAL_URL ||
    "http://api:5000"
  ).replace(/\/$/, "");
  const incomingUrl = new URL(request.url);
  const headers = new Headers({ Accept: "text/event-stream" });
  for (const name of ["authorization", "x-tenant-id", "last-event-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(
      `${backendOrigin}${endpoint}${incomingUrl.search}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
        signal: request.signal,
      },
    );
    if (!upstream.ok || !upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers,
      });
    }

    const responseHeaders = new Headers(NO_STORE_HEADERS);
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) responseHeaders.set("X-Request-ID", requestId);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error("SSE upstream proxy failed", error);
    return Response.json(
      { detail: "Live data stream is temporarily unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
