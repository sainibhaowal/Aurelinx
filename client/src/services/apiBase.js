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
 * Resolve the browser API origin without allowing a stale localhost build
 * value to break a deployment served through a reverse proxy.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getApiBaseUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (typeof window === "undefined") return configured;

  const pageHost = window.location.hostname;
  let configuredUrl = null;
  try {
    configuredUrl = configured
      ? new URL(configured, window.location.origin)
      : null;
  } catch {
    return "";
  }
  // In browser, if accessing web app via localhost or standard proxy,
  // use relative same-origin /api path to avoid cross-port CORS issues.
  if (typeof window !== "undefined") {
    // Tauri desktop shell check
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
      return configured || "http://localhost:5100";
    }
    // Web browser: use same-origin proxy
    return "";
  }
  return configured;
}

export const API_BASE_URL = getApiBaseUrl();
