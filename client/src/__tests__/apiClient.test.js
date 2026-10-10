// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { afterEach, describe, expect, it, vi } from "vitest";
import apiClient from "../services/apiClient.js";
import { getExplanationProviderConfig } from "../services/explanationProviderConfig.js";

const { intelligenceAPI, request } = apiClient;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("API client request lifecycle", () => {
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
