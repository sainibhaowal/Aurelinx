/**
 * Professional API client with environment configuration
 * Handles all backend communication, error handling, and retry logic
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
const API_V1 = `${API_BASE}/api/v1`;
let preferredApiBase = API_BASE;

// Request timeout (15 seconds) for normal CRUD calls.
const REQUEST_TIMEOUT = 15000;
// Longer timeout for large read operations and dashboard snapshots.
const LONG_REQUEST_TIMEOUT = 60000;

// Max retries for failed requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

function isAuthEndpoint(url) {
  return typeof url === "string" && /\/api\/v1\/auth\//.test(url);
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

async function consumeEventStream(response, handlers = {}) {
  if (!response.ok || !response.body) {
    const err = new Error(`Stream request failed: ${response.status}`);
    err.status = response.status;
    err.data = await response.text().catch(() => "");
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
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
      }
    }
  }

  return true;
}

async function streamRequest(url, handlers = {}, signal = null) {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("Authentication required");
    err.status = 401;
    throw err;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  return consumeEventStream(response, handlers);
}

/**
 * Make HTTP request with error handling and retry logic
 */
async function request(url, options = {}, responseType = "json") {
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT;
  const fetchOptions = { ...options };
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
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
        } finally {
          clearTimeout(timeoutId);
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
        return await response.blob();
      }

      const rawBody = await response.text();
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

      if (response.status === 401 && isAuthEndpoint(requestUrlUsed)) {
        localStorage.removeItem("auth_token");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:expired"));
        }
        throw new Error(
          formatErrorMessage(data, "Session expired. Please login again."),
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
      lastError = error;

      // Don't retry mutating requests (POST, PUT, PATCH, DELETE) to avoid delayed cascading timeouts/double execs
      const isIdempotentOrNonMutating =
        !options.method ||
        ["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase());
      if (!isIdempotentOrNonMutating) {
        throw error;
      }

      // Don't retry on certain errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 422
      ) {
        throw error;
      }
      if (
        error?.name === "AbortError" ||
        /aborted/i.test(error?.message || "")
      ) {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)),
          );
          continue;
        }
        throw lastError;
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

function uploadRequest(url, formData, onProgress = null) {
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
        if (isAuthEndpoint(url)) {
          localStorage.removeItem("auth_token");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:expired"));
          }
          reject(
            new Error(
              formatErrorMessage(data, "Session expired. Please login again."),
            ),
          );
          return;
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
  verifyAdminId: (code) =>
    request(`${API_V1}/auth/verify-admin-id`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  register: (email, fullName, password, adminId) =>
    request(`${API_V1}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        email,
        full_name: fullName,
        password,
        admin_id: adminId,
      }),
    }),

  login: (email, password) =>
    request(`${API_V1}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: () => request(`${API_V1}/auth/me`),

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
  list: (skip = 0, limit = 10, department = null, atRiskOnly = false) => {
    const params = new URLSearchParams();
    params.append("skip", skip);
    params.append("limit", limit);
    if (department) params.append("department", department);
    if (atRiskOnly) params.append("at_risk_only", true);
    return request(`${API_V1}/employees?${params}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    });
  },

  get: (employeeId) => request(`${API_V1}/employees/${employeeId}`),

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
  list: (skip = 0, limit = 10, department = null) => {
    const params = new URLSearchParams();
    params.append("skip", skip);
    params.append("limit", limit);
    if (department) params.append("department", department);
    return request(`${API_V1}/candidates?${params}`, {
      timeoutMs: LONG_REQUEST_TIMEOUT,
    });
  },

  get: (candidateId) => request(`${API_V1}/candidates/${candidateId}`),
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

  streamConnectionSync: async (id, handlers = {}, signal = null) => {
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

    return consumeEventStream(response, {
      sync: handlers.onSync,
      ...handlers,
    });
  },
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
  ) => {
    const token = getStoredAuthToken();
    if (!token) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }
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
    return consumeEventStream(response, {
      chunk: handlers.onChunk,
      status: handlers.onStatus,
      done: handlers.onDone,
      error: handlers.onError,
    });
  },
};

/**
 * Health check
 */
export const healthAPI = {
  check: () =>
    request(`${API_BASE}/health`).catch(() => ({ status: "offline" })),
};

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

export default {
  authAPI,
  employeesAPI,
  candidatesAPI,
  analysisAPI,
  enterpriseAPI,
  leanAPI,
  chatAPI,
  healthAPI,
  request,
  APIError,
};
