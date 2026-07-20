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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedCreds, setSavedCreds] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("auth_token");
  });

  const isEmbeddedIframe = typeof window !== "undefined" && window !== window.parent;

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
        if (cachedUser) {
          setUser(cachedUser);
        }
        try {
          const userData = await resolveWithTimeout(authAPI.getCurrentUser());
          setUser(userData);
          localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));
          setError(null);
        } catch (err) {
          // Clear expired/invalid session and force login
          if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem(AUTH_USER_CACHE_KEY);
            setToken(null);
            setUser(null);
            if (isEmbeddedIframe) {
              window.parent.postMessage({ type: "AURELINX_CLEAR_CREDS" }, "*");
            }
          }
          setError(err);
        }
      }
      if (!isEmbeddedIframe || token) {
        setLoading(false);
      }
    };

    checkAuth();
  }, [resolveWithTimeout, token]);

  // Sync credentials from parent window if inside Tauri iframe
  useEffect(() => {
    if (!isEmbeddedIframe) return;

    const handleMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "AURELINX_SEND_CREDS") {
        let hasToken = false;
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
          setToken(data.token);
          hasToken = true;
        }
        if (data.user) {
          const userStr = typeof data.user === "string" ? data.user : JSON.stringify(data.user);
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

    // Request credentials from the parent Tauri shell
    window.parent.postMessage({ type: "AURELINX_GET_CREDS" }, "*");

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
      setToken(null);
      setUser(null);
      setError(null);
      setLoading(false);
      if (isEmbeddedIframe) {
        window.parent.postMessage({ type: "AURELINX_CLEAR_CREDS" }, "*");
      }
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authAPI.login(email, password);

        // Save token
        localStorage.setItem("auth_token", response.access_token);
        setToken(response.access_token);

        // Get user data
        const userData = await resolveWithTimeout(authAPI.getCurrentUser());
        setUser(userData);
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(userData));

        // Save to parent if in iframe
        if (isEmbeddedIframe) {
          window.parent.postMessage({
            type: "AURELINX_SAVE_CREDS",
            token: response.access_token,
            user: userData,
            savedCreds: { email, password }
          }, "*");
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

  const register = useCallback(async (email, fullName, password) => {
    setLoading(true);
    setError(null);

    try {
      const userData = await authAPI.register(email, fullName, password);
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
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    if (isEmbeddedIframe) {
      window.parent.postMessage({
        type: "AURELINX_CLEAR_CREDS"
      }, "*");
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
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
