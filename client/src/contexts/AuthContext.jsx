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
 * Authentication Context
 * Manages user authentication state, tokens, and login/logout
 */

import React, { createContext, useState, useCallback, useEffect } from "react";
import { authAPI, APIError } from "../services/apiClient";

export const AuthContext = createContext();

const AUTH_USER_CACHE_KEY = "auth_user";

function readCachedUser() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(AUTH_USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeLoginSession(accessToken, refreshToken) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("auth_token", accessToken);
  // A new login replaces the credential pair as a unit. Leaving an older
  // refresh token behind when a response omits one causes repeated 401s.
  if (refreshToken) {
    localStorage.setItem("auth_refresh_token", refreshToken);
  } else {
    localStorage.removeItem("auth_refresh_token");
  }
}

function readTokenUser(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = decodeURIComponent(
      Array.from(
        atob(normalized),
        (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
      ).join(""),
    );
    const claims = JSON.parse(decoded);
    if (!claims.sub || !claims.email) return null;
    return {
      id: claims.sub,
      email: claims.email,
      full_name: claims.email,
      is_admin: Boolean(claims.is_admin),
      is_active: true,
    };
  } catch {
    return null;
  }
}

function readTokenExpiry(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const claims = JSON.parse(atob(normalized));
    return Number.isFinite(claims.exp) ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readStoredAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const oauthParams = fragment.has("oauth_token") ? fragment : params;
    const oauthToken = oauthParams.get("oauth_token");
    const oauthRefresh = oauthParams.get("oauth_refresh");
    if (oauthToken) {
      storeLoginSession(oauthToken, oauthRefresh);
      const email = oauthParams.get("oauth_email");
      const fullName = oauthParams.get("oauth_name");
      if (email) {
        localStorage.setItem(
          AUTH_USER_CACHE_KEY,
          JSON.stringify({
            email,
            full_name: fullName || email,
            is_active: true,
          }),
        );
      }
      ["oauth_token", "oauth_refresh", "oauth_email", "oauth_name"].forEach(
        (key) => {
          params.delete(key);
          fragment.delete(key);
        },
      );
      const query = params.toString();
      const hash = fragment.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`,
      );
    }
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

const postToParent = (message) => {
  if (typeof window === "undefined" || window === window.parent) return;
  const allowedOrigins = [
    "tauri://localhost",
    "https://tauri.localhost",
    "http://localhost:3100",
  ];
  allowedOrigins.forEach((origin) => {
    window.parent.postMessage(message, origin);
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedCreds, setSavedCreds] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return readStoredAuthToken();
  });

  const isEmbeddedIframe =
    typeof window !== "undefined" && window !== window.parent;

  const resolveWithTimeout = useCallback((promise, timeoutMs = 4000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Authentication bootstrap timed out")),
          timeoutMs,
        );
      }),
    ]);
  }, []);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        const cachedUser = readCachedUser();
        const initialUser = cachedUser || readTokenUser(token);
        if (initialUser) {
          setUser(initialUser);
          if (!cachedUser) {
            localStorage.setItem(
              AUTH_USER_CACHE_KEY,
              JSON.stringify(initialUser),
            );
          }
        }
        try {
          const userData = await resolveWithTimeout(authAPI.getCurrentUser());
          setUser(userData);
          localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));
          setError(null);
        } catch (err) {
          // Keep the saved session and cached user during outages or
          // authorization failures. A terminal refresh failure emits
          // auth:expired and clears credentials in one place.
          setError(err);
        }
      }
      if (!isEmbeddedIframe || token) {
        setLoading(false);
      }
    };

    checkAuth();
  }, [resolveWithTimeout, token]);

  // Renew before the access token expires so active sessions do not wait for
  // an API request to fail with 401. Temporary network/API failures retain the
  // current local session and retry; only a terminal refresh rejection clears it.
  useEffect(() => {
    if (!token || typeof window === "undefined") return undefined;
    const refreshToken = localStorage.getItem("auth_refresh_token");
    if (!refreshToken) return undefined;

    let timer = null;
    let stopped = false;
    const expiresAt = readTokenExpiry(token);

    const schedule = (delayMs) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(refresh, delayMs);
    };

    const refresh = async () => {
      if (stopped) return;
      try {
        const response = await authAPI.refreshSession(refreshToken);
        if (stopped || !response?.access_token) return;
        localStorage.setItem("auth_token", response.access_token);
        window.dispatchEvent(new Event("auth:refreshed"));
      } catch (err) {
        if (stopped) return;
        if (err?.status === 401 || err?.status === 403) {
          window.dispatchEvent(new Event("auth:expired"));
          return;
        }
        schedule(30_000);
      }
    };

    const refreshIfNearExpiry = () => {
      const currentExpiry = readTokenExpiry(localStorage.getItem("auth_token"));
      if (currentExpiry && currentExpiry - Date.now() > 120_000) return;
      schedule(0);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshIfNearExpiry();
    };

    const initialDelay = expiresAt
      ? Math.max(1_000, expiresAt - Date.now() - 60_000)
      : 25 * 60_000;
    schedule(initialDelay);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token]);

  // Sync credentials from parent window if inside Tauri iframe
  useEffect(() => {
    if (!isEmbeddedIframe) return;

    const handleMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "AURELINX_SEND_CREDS") {
        let hasToken = false;
        if (data.token) {
          storeLoginSession(data.token, data.refreshToken);
          setToken(data.token);
          hasToken = true;
        }
        if (data.user) {
          const userStr =
            typeof data.user === "string"
              ? data.user
              : JSON.stringify(data.user);
          localStorage.setItem(AUTH_USER_CACHE_KEY, userStr);
          setUser(JSON.parse(userStr));
        }
        if (data.savedCreds) {
          setSavedCreds(data.savedCreds);
        }
        if (!hasToken) {
          setLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Request credentials from the parent Tauri shell securely
    postToParent({ type: "AURELINX_GET_CREDS" });

    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_refresh_token");
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
      setToken(null);
      setUser(null);
      setError(null);
      setLoading(false);
      if (isEmbeddedIframe) {
        postToParent({ type: "AURELINX_CLEAR_CREDS" });
      }
    };

    const handleAuthRefreshed = () => {
      setToken(localStorage.getItem("auth_token"));
      if (isEmbeddedIframe) {
        postToParent({
          type: "AURELINX_SAVE_CREDS",
          token: localStorage.getItem("auth_token"),
          refreshToken: localStorage.getItem("auth_refresh_token"),
          user: readCachedUser(),
        });
      }
    };

    const handleStorage = (event) => {
      if (event.key === AUTH_USER_CACHE_KEY && event.newValue) {
        setUser(readCachedUser());
      }
      if (event.key === "auth_token") {
        setToken(event.newValue);
        if (!event.newValue) {
          localStorage.removeItem("auth_refresh_token");
          setUser(null);
          localStorage.removeItem(AUTH_USER_CACHE_KEY);
        } else {
          setUser(readCachedUser());
        }
      }
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    window.addEventListener("auth:refreshed", handleAuthRefreshed);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth:expired", handleAuthExpired);
      window.removeEventListener("auth:refreshed", handleAuthRefreshed);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isEmbeddedIframe]);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authAPI.login(email, password);

        // Save token
        storeLoginSession(response.access_token, response.refresh_token);
        setToken(response.access_token);

        // Get user data
        const userData = await resolveWithTimeout(authAPI.getCurrentUser());
        setUser(userData);
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));

        // Save to parent if in iframe
        if (isEmbeddedIframe) {
          postToParent({
            type: "AURELINX_SAVE_CREDS",
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: userData,
            savedCreds: { email, password },
          });
        }

        return { success: true, user: userData };
      } catch (err) {
        const error = new APIError(
          err.error_code || "LOGIN_FAILED",
          err.message || "Login failed. Please try again.",
          err.status,
        );
        setError(error);
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [resolveWithTimeout],
  );

  const register = useCallback(async (email, password, fullName = null) => {
    setError(null);

    try {
      const userData = await authAPI.register(email, password, fullName);
      if (userData) {
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));
      }
      return { success: true, user: userData };
    } catch (err) {
      const error = new APIError(
        err.error_code || "REGISTRATION_FAILED",
        err.message || "Registration failed. Please try again.",
        err.status,
      );
      setError(error);
      return { success: false, error };
    }
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    setError(null);
    try {
      const res = await authAPI.verifyEmail(email, code);
      return { success: true, data: res };
    } catch (err) {
      const error = new APIError(
        err.error_code || "VERIFY_FAILED",
        err.message || "Email verification failed.",
        err.status,
      );
      setError(error);
      return { success: false, error };
    }
  }, []);

  const resendVerification = useCallback(
    async (email, purpose = "register") => {
      setError(null);
      try {
        const res = await authAPI.resendVerification(email, purpose);
        return { success: true, data: res };
      } catch (err) {
        const error = new APIError(
          err.error_code || "RESEND_FAILED",
          err.message || "Failed to resend verification.",
          err.status,
        );
        setError(error);
        return { success: false, error };
      }
    },
    [],
  );

  const verifyLogin = useCallback(
    async (email, code, savedPassword = null) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authAPI.verifyLogin(email, code);
        storeLoginSession(response.access_token, response.refresh_token);
        setToken(response.access_token);

        const userData = await resolveWithTimeout(authAPI.getCurrentUser());
        setUser(userData);
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));

        if (isEmbeddedIframe) {
          postToParent({
            type: "AURELINX_SAVE_CREDS",
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: userData,
            savedCreds: savedPassword
              ? { email, password: savedPassword }
              : null,
          });
        }

        return { success: true, user: userData };
      } catch (err) {
        const error = new APIError(
          err.error_code || "LOGIN_VERIFY_FAILED",
          err.message || "Login verification failed.",
          err.status,
        );
        setError(error);
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [resolveWithTimeout, isEmbeddedIframe],
  );

  const claimVerificationSession = useCallback(
    async (sessionToken) => {
      setError(null);
      try {
        const response = await authAPI.claimVerificationSession(sessionToken);
        if (response.status === "pending") {
          return { success: true, status: "pending" };
        }

        storeLoginSession(response.access_token, response.refresh_token);
        setToken(response.access_token);
        const userData = await resolveWithTimeout(authAPI.getCurrentUser());
        setUser(userData);
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));

        if (isEmbeddedIframe) {
          postToParent({
            type: "AURELINX_SAVE_CREDS",
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: userData,
          });
        }
        return { success: true, status: "approved", user: userData };
      } catch (err) {
        const error = new APIError(
          err.error_code || "VERIFICATION_SESSION_FAILED",
          err.message || "Unable to complete email verification.",
          err.status,
        );
        setError(error);
        return { success: false, error };
      }
    },
    [resolveWithTimeout, isEmbeddedIframe],
  );

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("auth_refresh_token");
    if (refreshToken) {
      authAPI.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    if (isEmbeddedIframe) {
      postToParent({
        type: "AURELINX_CLEAR_CREDS",
      });
    }
  }, [isEmbeddedIframe]);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    verifyEmail,
    resendVerification,
    verifyLogin,
    claimVerificationSession,
    logout,
    savedCreds,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
