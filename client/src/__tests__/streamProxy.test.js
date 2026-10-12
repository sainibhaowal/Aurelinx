import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyEventStream } from "../../app/api/v1/ai/stream-proxy";

describe("SSE proxy route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards auth and returns the upstream event stream without buffering", async () => {
    vi.stubEnv("INTERNAL_API_URL", "http://api:5000/");
    const upstreamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: analytics\ndata: {"total":1233}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(upstreamBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(
      "http://localhost:3000/api/v1/ai/analytics/stream?scope=tenant",
      { headers: { Authorization: "Bearer test-token", "X-Tenant-ID": "t-1" } },
    );

    const response = await proxyEventStream(
      request,
      "/api/v1/ai/analytics/stream",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api:5000/api/v1/ai/analytics/stream?scope=tenant",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.any(Headers),
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers.get("authorization")).toBe(
      "Bearer test-token",
    );
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-transform");
    await expect(response.text()).resolves.toContain('"total":1233');
  });
});
