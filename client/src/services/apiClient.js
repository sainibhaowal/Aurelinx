// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Professional API client with environment configuration
 * Handles all backend communication, error handling, and retry logic
 */

import { API_BASE_URL } from "./apiBase";

const API_BASE = API_BASE_URL;
const API_V1 = `${API_BASE}/api/v1`;
let preferredApiBase = API_BASE;

// Request timeout (15 seconds) for normal CRUD calls.
const REQUEST_TIMEOUT = 15000;
// Longer timeout for large read operations and dashboard snapshots.
const LONG_REQUEST_TIMEOUT = 60000;

// Max retries for failed requests
const MAX_RETRIES = 4;
const RETRY_DELAY = 1000; // 1 second
let refreshInFlight = null;
const inFlightReadRequests = new Map();

function getStoredAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

function parseUrlSafe(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Custom error handling utility
 */
export class APIError extends Error {
  constructor(errorCode, message, status = 500, details = null) {
    super(message);
    this.name = "APIError";
    this.errorCode = errorCode;
    this.status = status;
    this.details = details;
  }

  isNetworkError() {
    return this.status >= 500 || this.status === 0;
  }

  isValidationError() {
    return this.status === 422;
  }

  isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

function isAuthEndpoint(url) {
  return typeof url === "string" && /\/api\/v1\/auth\//.test(url);
}

function canRefreshFor(url) {
  if (typeof url !== "string") return true;
  if (!isAuthEndpoint(url)) return true;
  return /\/auth\/(me|verify-token)(?:\?|$)/.test(url);
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_refresh_token")
        : null;
    if (!refreshToken) {
      const error = new Error("No refresh session is available");
      error.status = 401;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:expired"));
      }
      throw error;
    }
    const urls = buildRequestUrls(`${API_V1}/auth/refresh`);
    let response;
    let lastError;
    for (const url of urls) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!response) throw lastError || new Error("Session refresh failed");
    if (!response.ok) {
      const error = new Error(`Session refresh failed: ${response.status}`);
      error.status = response.status;
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:expired"));
        }
      }
      throw error;
    }
    const data = await response.json();
    if (!data?.access_token)
      throw new Error("Session refresh returned no access token");
    localStorage.setItem("auth_token", data.access_token);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:refreshed"));
    }
    return data.access_token;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function buildFallbackBases(baseUrl) {
  const parsed = parseUrlSafe(baseUrl);
  if (!parsed) return [];
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) return [];
  if (!["8000", "8001"].includes(parsed.port)) return [];

  const nextPort = parsed.port === "8001" ? "8000" : "8001";
  const candidates = [`${parsed.protocol}//${parsed.hostname}:${nextPort}`];

  if (parsed.hostname === "127.0.0.1") {
    candidates.push(`${parsed.protocol}//localhost:${nextPort}`);
  } else {
    candidates.push(`${parsed.protocol}//127.0.0.1:${nextPort}`);
  }

  return [...new Set(candidates)];
}

const FALLBACK_API_BASES = buildFallbackBases(API_BASE);

function swapBase(url, fromBase, toBase) {
  return typeof url === "string" && url.startsWith(fromBase)
    ? `${toBase}${url.slice(fromBase.length)}`
    : url;
}

function buildRequestUrls(url) {
  const urls = [];
  const primaryUrl = swapBase(url, API_BASE, preferredApiBase);
  urls.push(primaryUrl);

  for (const base of FALLBACK_API_BASES) {
    const candidate = swapBase(url, API_BASE, base);
    if (!urls.includes(candidate)) {
      urls.push(candidate);
    }
  }

  return urls;
}

function shouldTryLocalFallback(error, requestUrl, allUrls, index, method) {
  const isSafeMethod =
    !method || ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  if (!isSafeMethod) return false;
  if (index >= allUrls.length - 1) return false;
  if (error?.status) return false;
  if (error?.name === "AbortError") return true;
  return /timed out|failed to fetch|networkerror|network error|load failed|fetch failed/i.test(
    String(error?.message || ""),
  );
}
function formatErrorMessage(data, fallback = "Request failed") {
  if (typeof data === "string") return data;
  if (Array.isArray(data?.detail)) {
    const messages = data.detail
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          return (
            item.msg || item.message || item.detail || JSON.stringify(item)
          );
        }
        return String(item);
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (typeof data === "object" && data) {
    return data.msg || data.message || data.detail || fallback;
  }
  return fallback;
}

async function consumeEventStream(response, handlers = {}, signal = null) {
  if (!response.ok || !response.body) {
    const err = new Error(`Stream request failed: ${response.status}`);
    err.status = response.status;
    err.data = await response.text().catch(() => "");
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const yieldForPaint = async () => {
    if (typeof requestAnimationFrame === "function") {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  // Instant-paint throttling: timeline cards paint immediately, while
  // high-frequency answer chunks are batched so a 60-token/s stream does
  // not pay a ~16ms requestAnimationFrame tax per token. The final flush
  // below guarantees no chunk is left unpainted.
  let chunkFramesSincePaint = 0;
  let lastChunkPaintAt = 0;
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventBlock of events) {
        const lines = eventBlock.split("\n");
        const eventLine = lines.find((line) => line.startsWith("event:"));
        const dataLine = lines.find((line) => line.startsWith("data:"));
        if (!eventLine || !dataLine) continue;

        const eventName = eventLine.replace("event:", "").trim();
        const rawData = dataLine.replace("data:", "").trim();
        let data = rawData;
        try {
          data = JSON.parse(rawData);
        } catch {
          // Leave non-JSON payloads as raw text.
        }

        const handler = handlers[eventName] || handlers.onMessage;
        if (typeof handler === "function") {
          handler(data, eventName);
          // A proxy or browser read can contain several SSE frames at once.
          // Paint timeline cards immediately; batch answer chunks.
          if (
            eventName === "agent_step" ||
            eventName === "model_reasoning_delta"
          ) {
            await yieldForPaint();
          } else if (eventName === "chunk") {
            chunkFramesSincePaint += 1;
            const now =
              typeof performance !== "undefined"
                ? performance.now()
                : Date.now();
            if (chunkFramesSincePaint >= 8 || now - lastChunkPaintAt >= 64) {
              chunkFramesSincePaint = 0;
              lastChunkPaintAt = now;
              await yieldForPaint();
            }
          }
        }
      }
    }
    // Flush any trailing chunks so the final tokens always paint.
    if (chunkFramesSincePaint > 0) {
      chunkFramesSincePaint = 0;
      await yieldForPaint();
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      return false;
    }
    throw error;
  }

  return true;
}

async function streamRequest(url, handlers = {}, signal = null) {
  let token = getStoredAuthToken();
  if (!token) {
    const err = new Error("Authentication required");
    err.status = 401;
    throw err;
  }

  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  let retryCount = 0;
  let attemptedAuthRefresh = false;

  while (!signal?.aborted) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      };
      if (tenantId) headers["X-Tenant-ID"] = tenantId;
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        signal,
      });
      if (!response.ok && [401, 403].includes(response.status)) {
        await consumeEventStream(response, handlers, signal);
      }
      await consumeEventStream(response, handlers, signal);
      if (signal?.aborted) return false;
      throw new Error("The live data stream closed unexpectedly.");
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) return false;
      if (error?.status === 401 && !attemptedAuthRefresh) {
        attemptedAuthRefresh = true;
        token = await refreshAccessToken();
        continue;
      }
      if ([401, 403].includes(error?.status)) throw error;

      const delayMs = Math.min(1000 * 2 ** retryCount, 15000);
      retryCount += 1;
      await new Promise((resolve) => {
        let timer;
        const finish = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", finish);
          resolve();
        };
        timer = setTimeout(finish, delayMs);
        signal?.addEventListener("abort", finish, { once: true });
        if (signal?.aborted) finish();
      });
    }
  }

  return false;
}

/**
 * Make HTTP request with error handling and retry logic
 */
async function executeRequest(url, options = {}, responseType = "json") {
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT;
  const fetchOptions = { ...options };
  const authRetry = Boolean(fetchOptions._authRetry);
  delete fetchOptions._authRetry;
  delete fetchOptions.timeoutMs;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  // Add auth token if available
  const token = getStoredAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  let lastError;
  // Retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let timeoutId = null;
    let timeoutState = null;
    let removeExternalAbortListener = null;
    try {
      const requestUrls = buildRequestUrls(url);
      let response;
      let requestUrlUsed = requestUrls[0];

      for (
        let requestIndex = 0;
        requestIndex < requestUrls.length;
        requestIndex++
      ) {
        const requestUrl = requestUrls[requestIndex];
        const controller = new AbortController();
        timeoutState = { timedOut: false };
        if (options.signal) {
          const abortFromCaller = () => controller.abort(options.signal.reason);
          if (options.signal.aborted) {
            abortFromCaller();
          } else {
            options.signal.addEventListener("abort", abortFromCaller, {
              once: true,
            });
            removeExternalAbortListener = () =>
              options.signal.removeEventListener("abort", abortFromCaller);
          }
        }
        timeoutId = setTimeout(() => {
          timeoutState.timedOut = true;
          controller.abort();
        }, timeoutMs);

        try {
          response = await fetch(requestUrl, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
          });
          requestUrlUsed = requestUrl;
          break;
        } catch (error) {
          lastError = error;
          clearTimeout(timeoutId);
          timeoutId = null;
          removeExternalAbortListener?.();
          removeExternalAbortListener = null;
          if (timeoutState.timedOut) {
            throw new APIError(
              "REQUEST_TIMEOUT",
              `Request timed out after ${timeoutMs}ms`,
              0,
            );
          }
          if (options.signal?.aborted) throw error;
          if (
            shouldTryLocalFallback(
              error,
              requestUrl,
              requestUrls,
              requestIndex,
              options.method,
            )
          ) {
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Request failed");
      }

      const usedBase = requestUrlUsed.includes("/api/v1/")
        ? requestUrlUsed.split("/api/v1/")[0]
        : requestUrlUsed.replace(/\/health$/, "");
      if (usedBase && usedBase !== preferredApiBase) {
        preferredApiBase = usedBase;
      }

      // Parse response
      let data;
      const contentType = response.headers.get("content-type");
      if (responseType === "blob") {
        const blob = await response.blob();
        clearTimeout(timeoutId);
        timeoutId = null;
        removeExternalAbortListener?.();
        return blob;
      }

      const rawBody = await response.text();
      clearTimeout(timeoutId);
      timeoutId = null;
      removeExternalAbortListener?.();
      if (!rawBody) {
        data = null;
      } else if (contentType?.includes("application/json")) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = rawBody;
        }
      } else {
        data = rawBody;
      }

      if (response.status === 401 && canRefreshFor(requestUrlUsed)) {
        if (!authRetry && canRefreshFor(requestUrlUsed)) {
          try {
            await refreshAccessToken();
            return request(url, { ...options, _authRetry: true }, responseType);
          } catch (refreshError) {
            if (refreshError?.status === 401 || refreshError?.status === 403) {
              throw new APIError(
                "SESSION_EXPIRED",
                "Your session expired. Please sign in again.",
                refreshError.status,
              );
            }
            // A network or server failure while refreshing must not erase the
            // existing session. Surface the request error and retry later.
            throw refreshError;
          }
        }
        if (authRetry && typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:expired"));
        }
        throw new APIError(
          "UNAUTHORIZED",
          formatErrorMessage(data, "Session expired. Please login again."),
          response.status,
        );
      }

      // Handle error responses
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data: data,
          error_code: data?.error_code || "UNKNOWN_ERROR",
          message: formatErrorMessage(data, response.statusText),
        };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      removeExternalAbortListener?.();
      const requestError = timeoutState?.timedOut
        ? new APIError(
            "REQUEST_TIMEOUT",
            `Request timed out after ${timeoutMs}ms`,
            0,
          )
        : error;
      lastError = requestError;

      // Don't retry mutating requests (POST, PUT, PATCH, DELETE) to avoid delayed cascading timeouts/double execs
      const isIdempotentOrNonMutating =
        !options.method ||
        ["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase());
      if (!isIdempotentOrNonMutating) {
        throw requestError;
      }

      // Don't retry on certain errors
      if (
        requestError.status === 401 ||
        requestError.status === 403 ||
        requestError.status === 422
      ) {
        throw requestError;
      }
      if (requestError?.name === "AbortError") {
        throw requestError;
      }

      // Retry with exponential backoff
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)),
        );
      }
    }
  }

  // All retries failed
  throw lastError;
}

function request(url, options = {}, responseType = "json") {
  const method = (options.method || "GET").toUpperCase();
  const canShareRequest =
    ["GET", "HEAD"].includes(method) && options.body == null && !options.signal;
  if (!canShareRequest) {
    return executeRequest(url, options, responseType);
  }

  const token = getStoredAuthToken() || "";
  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("tenant_id") || ""
      : "";
  const headersKey = JSON.stringify(
    [...new Headers(options.headers || {}).entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  const requestOptions = { ...options };
  delete requestOptions.method;
  delete requestOptions.headers;
  delete requestOptions.signal;
  delete requestOptions.body;
  delete requestOptions._authRetry;
  const requestKey = JSON.stringify([
    url,
    method,
    responseType,
    preferredApiBase,
    token,
    tenantId,
    headersKey,
    requestOptions,
    options._authRetry === true,
  ]);
  const existingRequest = inFlightReadRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const sharedRequest = executeRequest(url, options, responseType);
  const trackedRequest = sharedRequest.finally(() => {
    if (inFlightReadRequests.get(requestKey) === trackedRequest) {
      inFlightReadRequests.delete(requestKey);
    }
  });
  inFlightReadRequests.set(requestKey, trackedRequest);
  return trackedRequest;
}

function uploadRequest(url, formData, onProgress = null, authRetry = false) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    const token = getStoredAuthToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    const tenantId =
      typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    if (tenantId) {
      xhr.setRequestHeader("X-Tenant-ID", tenantId);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
      onProgress(percent);
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") || "";
      let data = null;

      if (xhr.responseText) {
        if (contentType.includes("application/json")) {
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = xhr.responseText;
          }
        } else {
          data = xhr.responseText;
        }
      }

      if (xhr.status === 401) {
        if (!authRetry && canRefreshFor(url)) {
          refreshAccessToken()
            .then(() => uploadRequest(url, formData, onProgress, true))
            .then(resolve, reject);
          return;
        }
        if (authRetry && typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:expired"));
        }

        reject({
          status: 401,
          statusText: xhr.statusText,
          data,
          error_code: data?.error_code || "UNAUTHORIZED",
          message: formatErrorMessage(data, "Unauthorized"),
        });
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          data,
          error_code: data?.error_code || "UNKNOWN_ERROR",
          message: formatErrorMessage(data, xhr.statusText || "Upload failed"),
        });
        return;
      }

      if (onProgress) {
        onProgress(100);
      }
      resolve(data);
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload was aborted"));
    xhr.send(formData);
  });
}

/**
 * Authentication API
 */
export const authAPI = {
  register: (email, password, fullName = null) =>
    request(`${API_V1}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(fullName ? { full_name: fullName } : {}),
      }),
    }),

  verifyEmail: (email, code) =>
    request(`${API_V1}/auth/verify-email`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email, purpose = "register") =>
    request(`${API_V1}/auth/resend-verification`, {
      method: "POST",
      body: JSON.stringify({ email, purpose }),
    }),

  login: (email, password) =>
    request(`${API_V1}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyLogin: (email, code) =>
    request(`${API_V1}/auth/verify-login`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  claimVerificationSession: (sessionToken) =>
    request(`${API_V1}/auth/verification-session`, {
      method: "POST",
      body: JSON.stringify({ session_token: sessionToken }),
    }),

  loginDirect: (email, password) =>
    request(`${API_V1}/auth/login-direct`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: () => request(`${API_V1}/auth/me`),

  refreshSession: (refreshToken) =>
    request(`${API_V1}/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  logout: (refreshToken) =>
    request(`${API_V1}/auth/logout`, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  verifyToken: () => request(`${API_V1}/auth/verify-token`),

  deleteCurrentUser: (confirmationText) =>
    request(`${API_V1}/auth/me`, {
      method: "DELETE",
      body: JSON.stringify({ confirmation_text: confirmationText }),
    }),

  resetWorkspaceData: (confirmationText) =>
    request(`${API_V1}/auth/reset-workspace`, {
      method: "POST",
      body: JSON.stringify({ confirmation_text: confirmationText }),
    }),
};

/**
 * Employees API
 */
export const employeesAPI = {
  list: (
    skip = 0,
    limit = 10,
    department = null,
    atRiskOnly = false,
    q = null,
    sentimentMin = null,
    sentimentMax = null,
    employmentStatus = null,
  ) => {
    const params = new URLSearchParams();
    params.append("skip", skip);
    params.append("limit", limit);
    if (department) params.append("department", department);
    if (atRiskOnly) params.append("at_risk_only", true);
    if (q) params.append("q", q);
    if (sentimentMin != null) params.append("sentiment_min", sentimentMin);
    if (sentimentMax != null) params.append("sentiment_max", sentimentMax);
    if (employmentStatus) params.append("employment_status", employmentStatus);
    return request(`${API_V1}/employees?${params}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    });
  },

  count: (
    q = null,
    atRiskOnly = false,
    department = null,
    sentimentMin = null,
    sentimentMax = null,
    employmentStatus = null,
  ) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (atRiskOnly) params.set("at_risk_only", "true");
    if (department) params.set("department", department);
    if (sentimentMin != null) params.set("sentiment_min", sentimentMin);
    if (sentimentMax != null) params.set("sentiment_max", sentimentMax);
    if (employmentStatus) params.set("employment_status", employmentStatus);
    const query = params.toString();
    return request(`${API_V1}/employees/count${query ? `?${query}` : ""}`);
  },

  departments: () => request(`${API_V1}/employees/departments`),

  get: (employeeId) => request(`${API_V1}/employees/${employeeId}`),

  integrationEvidence: (employeeId) =>
    request(`${API_V1}/employees/${employeeId}/integration-evidence`),

  create: (data) =>
    request(`${API_V1}/employees`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (employeeId, data) =>
    request(`${API_V1}/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (employeeId) =>
    request(`${API_V1}/employees/${employeeId}`, {
      method: "DELETE",
    }),
};

/**
 * Candidates API
 */
export const candidatesAPI = {
  list: (
    skip = 0,
    limit = 10,
    department = null,
    q = null,
    sentimentMin = null,
    sentimentMax = null,
  ) => {
    const params = new URLSearchParams();
    params.append("skip", skip);
    params.append("limit", limit);
    if (department) params.append("department", department);
    if (q) params.append("q", q);
    if (sentimentMin != null) params.append("sentiment_min", sentimentMin);
    if (sentimentMax != null) params.append("sentiment_max", sentimentMax);
    return request(`${API_V1}/candidates?${params}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    });
  },

  count: (
    q = null,
    department = null,
    sentimentMin = null,
    sentimentMax = null,
  ) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (department) params.set("department", department);
    if (sentimentMin != null) params.set("sentiment_min", sentimentMin);
    if (sentimentMax != null) params.set("sentiment_max", sentimentMax);
    const query = params.toString();
    return request(`${API_V1}/candidates/count${query ? `?${query}` : ""}`);
  },
  departments: () => request(`${API_V1}/candidates/departments`),

  get: (candidateId) => request(`${API_V1}/candidates/${candidateId}`),
};

/** Organizational network analysis (shared with Intel Center). */
export const intelligenceAPI = {
  ona: (limit = 45) =>
    request(`${API_V1}/intelligence/ona?limit=${encodeURIComponent(limit)}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),

  explain: (
    subtab,
    context,
    provider = "lmstudio",
    apiKey = null,
    baseUrl = null,
    model = null,
  ) =>
    request(`${API_V1}/intelligence/explain`, {
      method: "POST",
      body: JSON.stringify({
        subtab,
        context,
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model,
      }),
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),

  explainStream: async (
    subtab,
    context,
    onToken,
    provider = "lmstudio",
    apiKey = null,
    baseUrl = null,
    model = null,
    signal = null,
    authRetry = false,
    onStatus = null,
  ) => {
    const token = getStoredAuthToken();
    if (!token) {
      const error = new Error("Authentication required");
      error.status = 401;
      throw error;
    }
    const tenantId =
      typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    const headers = { "Content-Type": "application/json" };
    headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers["X-Tenant-ID"] = tenantId;

    const response = await fetch(`${API_V1}/intelligence/explain/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        subtab,
        context,
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model,
      }),
      signal,
      cache: "no-store",
    });

    if (response.status === 401 && !authRetry) {
      await refreshAccessToken();
      return intelligenceAPI.explainStream(
        subtab,
        context,
        onToken,
        provider,
        apiKey,
        baseUrl,
        model,
        signal,
        true,
        onStatus,
      );
    }
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      let detail = raw;
      try {
        detail = JSON.parse(raw)?.detail || raw;
      } catch {
        // Keep the provider or server response text for a useful UI error.
      }
      const error = new Error(
        detail || `Explanation request failed (${response.status})`,
      );
      error.status = response.status;
      throw error;
    }

    let streamError = null;
    const completed = await consumeEventStream(
      response,
      {
        chunk: (data) => onToken?.(data?.text || ""),
        status: (data) => onStatus?.(data?.message || ""),
        error: (data) => {
          // Read through the server's terminal frame before rejecting. Throwing
          // from inside the SSE reader closes a healthy HTTP 200 response early
          // and browsers report it as incomplete chunked encoding.
          streamError = new Error(
            data?.message ||
              "The AI provider could not complete the explanation.",
          );
        },
      },
      signal,
    );
    if (streamError) throw streamError;
    return completed;
  },
};

/**
 * AI Analysis API
 */
export const analysisAPI = {
  analyzeTalent: (
    prompt,
    provider = "openai",
    apiKey = null,
    baseUrl = null,
    model = null,
  ) =>
    request(`${API_V1}/ai/analyze`, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model,
      }),
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),

  getSentimentReport: (department = null, includeAtRiskOnly = false) => {
    const params = new URLSearchParams();
    if (department) params.append("department", department);
    if (includeAtRiskOnly) params.append("include_at_risk_only", true);
    return request(`${API_V1}/ai/sentiment/report?${params}`);
  },

  getAnalyticsSnapshot: () =>
    request(`${API_V1}/ai/analytics/snapshot`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),

  getAnalyticsHistory: (limit = 24) =>
    request(
      `${API_V1}/ai/analytics/history?limit=${encodeURIComponent(limit)}`,
      {
        timeoutMs: LONG_REQUEST_TIMEOUT,
      },
    ),
  getAnalyticsOverview: ({
    department = "",
    riskOnly = false,
    offset = 0,
    limit = 100,
  } = {}) => {
    const params = new URLSearchParams({
      department,
      risk_only: String(riskOnly),
      offset: String(offset),
      limit: String(limit),
    });
    return request(`${API_V1}/ai/analytics/overview?${params}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    });
  },

  streamAnalytics: (handlers = {}, signal = null) =>
    streamRequest(`${API_V1}/ai/analytics/stream`, handlers, signal),

  streamSentiment: (handlers = {}, signal = null) =>
    streamRequest(`${API_V1}/ai/sentiment/stream`, handlers, signal),

  getCopilotContext: () => request(`${API_V1}/ai/copilot/context`),

  generateCopilotBrief: (payload) =>
    request(`${API_V1}/ai/copilot/brief`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const enterpriseAPI = {
  getAttritionExplain: (topN = 25, department = null) => {
    const params = new URLSearchParams();
    params.append("top_n", topN);
    if (department) params.append("department", department);
    return request(`${API_V1}/enterprise/attrition/explain?${params}`);
  },

  listInterventions: (statusFilter = null) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status_filter", statusFilter);
    return request(`${API_V1}/enterprise/interventions?${params}`);
  },

  createIntervention: (payload) =>
    request(`${API_V1}/enterprise/interventions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateIntervention: (id, payload) =>
    request(`${API_V1}/enterprise/interventions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listConnections: () => request(`${API_V1}/enterprise/connections`),
  listProviderPresets: () =>
    request(`${API_V1}/enterprise/connection-providers`),

  createConnection: (payload) =>
    request(`${API_V1}/enterprise/connections`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateConnection: (id, payload) =>
    request(`${API_V1}/enterprise/connections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  verifyConnection: (id) =>
    request(`${API_V1}/enterprise/connections/${id}/verify`, {
      method: "POST",
    }),

  discoverConnection: (id) =>
    request(`${API_V1}/enterprise/connections/${id}/discover`),

  triggerConnectionSync: (id) =>
    request(`${API_V1}/enterprise/connections/${id}/sync`, {
      method: "POST",
    }),

  getConnectionSyncStatus: (id) =>
    request(`${API_V1}/enterprise/connections/${id}/sync-status`),

  listInterventionOutcomes: (id) =>
    request(`${API_V1}/enterprise/interventions/${id}/outcomes`),

  upsertInterventionOutcome: (id, payload) =>
    request(`${API_V1}/enterprise/interventions/${id}/outcomes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRiskDriverDrilldown: (factor, topN = 30) => {
    const params = new URLSearchParams();
    params.append("factor", factor);
    params.append("top_n", topN);
    return request(`${API_V1}/enterprise/risk-drivers/drilldown?${params}`);
  },

  getRiskExplain: (email) =>
    request(
      `${API_V1}/enterprise/risk-explain?email=${encodeURIComponent(email)}`,
    ),

  getSyncHealth: () => request(`${API_V1}/enterprise/sync-health`),

  streamConnectionSync: async (
    id,
    handlers = {},
    signal = null,
    authRetry = false,
  ) => {
    const token = getStoredAuthToken();
    if (!token) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }

    const response = await fetch(
      `${API_V1}/enterprise/connections/${id}/sync/stream`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      },
    );

    if (response.status === 401 && !authRetry) {
      await refreshAccessToken();
      return enterpriseAPI.streamConnectionSync(id, handlers, signal, true);
    }
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:expired"));
    }

    return consumeEventStream(response, {
      sync: handlers.onSync,
      ...handlers,
    });
  },
};

export const actionsAPI = {
  listPendingApprovals: () => request(`${API_V1}/actions/approvals/pending`),
  listProposals: () => request(`${API_V1}/actions/proposals`),
  createProposal: (payload) =>
    request(`${API_V1}/actions/proposals`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  decideProposal: (id, decision, reason = "") =>
    request(`${API_V1}/actions/proposals/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    }),
  executeProposal: (id) =>
    request(`${API_V1}/actions/proposals/${encodeURIComponent(id)}/execute`, {
      method: "POST",
    }),
};

export const oauthAPI = {
  start: (provider, connectionId) =>
    request(
      `${API_V1}/oauth/${encodeURIComponent(provider)}/start?connection_id=${encodeURIComponent(connectionId)}&mode=json`,
    ),
};

export const privacyAPI = {
  listConsents: () => request(`${API_V1}/privacy/consents`),
  createConsent: (payload) =>
    request(`${API_V1}/privacy/consents`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  withdrawConsent: (id) =>
    request(`${API_V1}/privacy/consents/${encodeURIComponent(id)}/withdraw`, {
      method: "POST",
    }),
  listRetentionPolicies: () => request(`${API_V1}/privacy/retention`),
  createRetentionPolicy: (payload) =>
    request(`${API_V1}/privacy/retention`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSensitiveFields: () => request(`${API_V1}/privacy/sensitive-fields`),
  createSensitiveField: (payload) =>
    request(`${API_V1}/privacy/sensitive-fields`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listExports: () => request(`${API_V1}/privacy/exports`),
  requestExport: (payload) =>
    request(`${API_V1}/privacy/exports`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const leanAPI = {
  listContracts: () => request(`${API_V1}/lean/contracts`),
  createContract: (payload) =>
    request(`${API_V1}/lean/contracts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  syncConnection: (connectionId) =>
    request(`${API_V1}/lean/connections/${connectionId}/sync`, {
      method: "POST",
    }),
  listFieldMappings: (connectionId) =>
    request(`${API_V1}/lean/connections/${connectionId}/mappings`),
  createFieldMapping: (connectionId, payload) =>
    request(`${API_V1}/lean/connections/${connectionId}/mappings`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSyncJobs: (connectionId) =>
    request(`${API_V1}/lean/connections/${connectionId}/sync-jobs`),
  listQuarantine: (limit = 200) =>
    request(`${API_V1}/lean/quarantine?limit=${limit}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  trainModel: () =>
    request(`${API_V1}/lean/ml/train`, {
      method: "POST",
    }),
  listModels: () => request(`${API_V1}/lean/ml/models`),
  scoreModel: (topN = 50) =>
    request(`${API_V1}/lean/ml/score?top_n=${topN}`, {
      method: "POST",
    }),
  runScenario: (payload) =>
    request(`${API_V1}/lean/optimizer/scenario`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetDemoImport: () =>
    request(`${API_V1}/lean/import/reset`, {
      method: "DELETE",
    }),
  importCsv: (kind, file, onProgress = null) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    return uploadRequest(`${API_V1}/lean/import/csv`, form, onProgress);
  },
  validateCsv: (kind, file, onProgress = null) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    return uploadRequest(`${API_V1}/lean/import/validate`, form, onProgress);
  },
  importDatasetBundleAsync: (file, onProgress = null) => {
    const form = new FormData();
    form.append("file", file);
    return uploadRequest(
      `${API_V1}/lean/import/bundle/async`,
      form,
      onProgress,
    );
  },
  importCsvAsync: (kind, file, onProgress = null) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    return uploadRequest(`${API_V1}/lean/import/csv/async`, form, onProgress);
  },
  getImportJobStatus: (jobId) => request(`${API_V1}/lean/import/jobs/${jobId}`),
  getDataSummary: () =>
    request(`${API_V1}/lean/summary`, { timeoutMs: LONG_REQUEST_TIMEOUT }),
  getExecutivePacket: (template = "monthly") =>
    request(
      `${API_V1}/lean/executive/packet?template=${encodeURIComponent(template)}`,
      { timeoutMs: LONG_REQUEST_TIMEOUT },
    ),
  listPolicyPacks: () => request(`${API_V1}/lean/policy/packs`),
  createPolicyPack: (payload) =>
    request(`${API_V1}/lean/policy/packs`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkPolicy: (payload) =>
    request(`${API_V1}/lean/policy/check`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listDrift: () =>
    request(`${API_V1}/lean/ml/drift`, { timeoutMs: LONG_REQUEST_TIMEOUT }),
  retrainModel: () =>
    request(`${API_V1}/lean/ml/retrain`, {
      method: "POST",
    }),
  listModelCards: () =>
    request(`${API_V1}/lean/ml/cards`, { timeoutMs: LONG_REQUEST_TIMEOUT }),
  approveModelCard: (cardId) =>
    request(`${API_V1}/lean/ml/cards/${cardId}/approve`, {
      method: "POST",
    }),
  promoteModelCard: (cardId) =>
    request(`${API_V1}/lean/ml/cards/${cardId}/promote`, {
      method: "POST",
    }),
  rollbackModelCard: (cardId) =>
    request(`${API_V1}/lean/ml/cards/${cardId}/rollback`, {
      method: "POST",
    }),
  getFairnessSummary: () =>
    request(`${API_V1}/lean/compliance/fairness`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  listReleaseGates: () =>
    request(`${API_V1}/lean/release-gates`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  createReleaseGate: (payload) =>
    request(`${API_V1}/lean/release-gates`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveReleaseGate: (gateId) =>
    request(`${API_V1}/lean/release-gates/${gateId}/approve`, {
      method: "POST",
    }),
  listAuditEvents: () =>
    request(`${API_V1}/lean/audit-events`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  listDRRunbooks: () =>
    request(`${API_V1}/lean/dr/runbooks`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  createDRRunbook: (payload) =>
    request(`${API_V1}/lean/dr/runbooks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  runDRDrill: (id) =>
    request(`${API_V1}/lean/dr/runbooks/${id}/drill`, {
      method: "POST",
    }),
  listProcurementArtifacts: () =>
    request(`${API_V1}/lean/procurement/artifacts`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
  createProcurementArtifact: (payload) =>
    request(`${API_V1}/lean/procurement/artifacts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listScenarios: () =>
    request(`${API_V1}/lean/scenarios`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    }),
};

/**
 * Intelligence Chat API
 */
export const chatAPI = {
  listSessions: () => request(`${API_V1}/chat/sessions`),
  createSession: (title = "New Session") =>
    request(`${API_V1}/chat/sessions`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  renameSession: (sessionId, title) =>
    request(`${API_V1}/chat/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteSession: (sessionId) =>
    request(`${API_V1}/chat/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  bulkDeleteSessions: (sessionIds) =>
    request(`${API_V1}/chat/sessions/delete-bulk`, {
      method: "POST",
      body: JSON.stringify({ session_ids: sessionIds }),
    }),
  listMessages: (sessionId) =>
    request(`${API_V1}/chat/sessions/${sessionId}/messages`),
  listAttachments: (sessionId) =>
    request(`${API_V1}/chat/sessions/${sessionId}/attachments`),
  clearSessionMessages: (sessionId) =>
    request(`${API_V1}/chat/sessions/${sessionId}/messages`, {
      method: "DELETE",
    }),
  sendFeedback: (sessionId, payload) =>
    request(`${API_V1}/chat/sessions/${sessionId}/feedback`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAttachment: (sessionId, attachmentId) =>
    request(
      `${API_V1}/chat/sessions/${sessionId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
      },
    ),
  uploadAttachment: (sessionId, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`${API_V1}/chat/sessions/${sessionId}/upload`, {
      method: "POST",
      body: form,
    });
  },
  sendMessage: (sessionId, payload) =>
    request(`${API_V1}/chat/sessions/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendMessageStream: async (
    sessionId,
    payload,
    handlers = {},
    signal = null,
    authRetry = false,
  ) => {
    const token = getStoredAuthToken();
    if (!token) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }
    try {
      const response = await fetch(
        `${API_V1}/chat/sessions/${sessionId}/message/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal,
        },
      );
      if (response.status === 401 && !authRetry) {
        await refreshAccessToken();
        return chatAPI.sendMessageStream(
          sessionId,
          payload,
          handlers,
          signal,
          true,
        );
      }
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:expired"));
      }
      return consumeEventStream(
        response,
        {
          chunk: handlers.onChunk,
          status: handlers.onStatus,
          agent_step: handlers.onAgentStep,
          model_reasoning_delta: handlers.onReasoningDelta,
          done: handlers.onDone,
          error: handlers.onError,
        },
        signal,
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }
      throw error;
    }
  },
  listWorkflows: (sessionId) =>
    request(`${API_V1}/chat/sessions/${sessionId}/workflows`),
  listWorkflowEvents: (runId) =>
    request(`${API_V1}/chat/workflows/${runId}/events`),
  approveWorkflow: (runId, approvalId) =>
    request(
      `${API_V1}/chat/workflows/${runId}/approvals/${approvalId}/approve`,
      {
        method: "POST",
      },
    ),
  rejectWorkflow: (runId, approvalId) =>
    request(
      `${API_V1}/chat/workflows/${runId}/approvals/${approvalId}/reject`,
      {
        method: "POST",
      },
    ),
  discoverModels: (payload) =>
    request(`${API_V1}/chat/providers/discover`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  pingProvider: (payload) =>
    request(`${API_V1}/chat/providers/ping`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/**
 * Health check
 */
export const healthAPI = {
  check: () =>
    request(`${API_BASE}/health`).catch(() => ({ status: "offline" })),
};

export default {
  authAPI,
  employeesAPI,
  candidatesAPI,
  intelligenceAPI,
  analysisAPI,
  enterpriseAPI,
  actionsAPI,
  oauthAPI,
  leanAPI,
  chatAPI,
  healthAPI,
  request,
  APIError,
};
