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
    configuredUrl = configured ? new URL(configured, window.location.origin) : null;
  } catch {
    return "";
  }
  const configuredIsLocal = configuredUrl && LOCAL_HOSTS.has(configuredUrl.hostname);
  const pageIsLocal = LOCAL_HOSTS.has(pageHost);

  // If a production page was built with the development localhost default,
  // use the same-origin /api proxy instead of calling the user's own machine.
  if (configuredIsLocal && !pageIsLocal) return "";
  return configured;
}

export const API_BASE_URL = getApiBaseUrl();
