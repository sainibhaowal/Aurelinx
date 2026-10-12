// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { afterEach, describe, expect, it, vi } from "vitest";
import apiClient from "../services/apiClient.js";
import { getExplanationProviderConfig } from "../services/explanationProviderConfig.js";

const { analysisAPI, intelligenceAPI, request } = apiClient;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("API client request lifecycle", () => {
  it("sends Talent Scout searches through the selected AI provider", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key) =>
        key === "auth_token" ? "test-access-token" : "test-tenant",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            '{"analysis":"Grounded report","candidates":[],"confidence_score":0.8,"processing_time_ms":4}',
            { headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await analysisAPI.analyzeTalent(
      "Find a senior analyst",
      "openrouter",
      "test-provider-key",
      "https://openrouter.ai/api/v1",
      "nvidia/nemotron-3.5-lightning:free",
    );

    const [, options] = fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({
      prompt: "Find a senior analyst",
      provider: "openrouter",
      api_key: "test-provider-key",
      base_url: "https://openrouter.ai/api/v1",
      model: "nvidia/nemotron-3.5-lightning:free",
    });
  });

  it("reports timer aborts as request timeouts instead of raw AbortErrors", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () =>
                reject(
                  new DOMException(
                    "signal is aborted without reason",
                    "AbortError",
                  ),
                ),
              { once: true },
            );
          }),
      ),
    );

    const pendingRequest = request("https://unit.test/api/v1/slow", {
      timeoutMs: 10,
    });
    const assertion = expect(pendingRequest).rejects.toMatchObject({
      name: "APIError",
      errorCode: "REQUEST_TIMEOUT",
      message: "Request timed out after 10ms",
    });
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("shares concurrent identical read requests", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"ok":true}', {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      request("https://unit.test/api/v1/shared"),
      request("https://unit.test/api/v1/shared"),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient server failures on safe read requests", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"detail":"proxy restarting"}', {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"detail":"proxy restarting"}', {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"items":[1]}', {
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const pendingRequest = request("https://unit.test/api/v1/employees");
    const assertion = expect(pendingRequest).resolves.toEqual({ items: [1] });
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("preserves caller cancellation", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new DOMException("Request cancelled", "AbortError")),
              { once: true },
            );
          }),
      ),
    );

    const pendingRequest = request("https://unit.test/api/v1/cancel", {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pendingRequest).rejects.toMatchObject({ name: "AbortError" });
  });

  it("delivers streamed explanation chunks to the renderer", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key) =>
        key === "auth_token" ? "test-access-token" : "test-tenant",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            'event: chunk\ndata: {"text":"The result "}\n\nevent: chunk\ndata: {"text":"is grounded."}\n\nevent: done\ndata: {"subtab":"skill-match"}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          ),
      ),
    );
    const tokens = [];

    await intelligenceAPI.explainStream(
      "skill-match",
      { matchResults: [] },
      (token) => tokens.push(token),
      "openrouter",
      "test-provider-key",
      null,
      "test-model",
    );

    expect(tokens.join("")).toBe("The result is grounded.");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/intelligence/explain/stream"),
      expect.objectContaining({
        method: "POST",
        signal: null,
        body: expect.stringContaining('"provider":"openrouter"'),
      }),
    );
    expect(fetch.mock.calls[0][1].body).not.toContain("reportMetadata");
  });

  it("reconnects a transient analytics stream failure until aborted", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key) =>
        key === "auth_token" ? "test-access-token" : "test-tenant",
    });
    const controller = new AbortController();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockImplementationOnce(async (_url, options) => {
        expect(options.headers["X-Tenant-ID"]).toBe("test-tenant");
        return new Response('event: analytics\ndata: {"total":1233}\n\n', {
          headers: { "content-type": "text/event-stream" },
        });
      });
    vi.stubGlobal("fetch", fetchMock);

    const { analysisAPI } = await import("../services/apiClient");
    const received = [];
    await analysisAPI.streamAnalytics(
      {
        analytics: (payload) => {
          received.push(payload.total);
          controller.abort();
        },
      },
      controller.signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(received).toEqual([1233]);
  });

  it("drains terminal SSE errors before rejecting the explanation stream", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key) =>
        key === "auth_token" ? "test-access-token" : "test-tenant",
    });
    let streamWasCancelled = false;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: error\ndata: {"message":"Provider timed out"}\n\n',
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'event: done\ndata: {"subtab":"skill-match"}\n\n',
          ),
        );
        controller.close();
      },
      cancel() {
        streamWasCancelled = true;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(body, {
            headers: { "content-type": "text/event-stream" },
          }),
      ),
    );

    await expect(
      intelligenceAPI.explainStream(
        "skill-match",
        { matchResults: [] },
        () => {},
        "openrouter",
      ),
    ).rejects.toThrow("Provider timed out");
    expect(streamWasCancelled).toBe(false);
  });

  it("loads the active provider from the saved provider connection shape", () => {
    const providerSettings = {
      activeProvider: "openrouter",
      openrouter: {
        key: "saved-provider-key",
        endpoint: "https://openrouter.ai/api/v1",
        selectedModel: "provider/model",
      },
    };
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify(providerSettings),
    });

    expect(getExplanationProviderConfig()).toEqual({
      provider: "openrouter",
      key: "saved-provider-key",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "provider/model",
    });
  });
});
