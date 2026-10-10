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

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AurelinxLogo from "./AurelinxLogo";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../services/apiBase";

const initialRegisterState = {
  email: "",
  password: "",
};

const initialLoginState = {
  email: "",
  password: "",
};

const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Weak", color: "#f87171", pct: 33, bars: 1 };
  if (score <= 4) return { label: "Fair", color: "#fbbf24", pct: 66, bars: 2 };
  return { label: "Strong", color: "#34d399", pct: 100, bars: 3 };
};

const FEATURES = [
  {
    id: "identity",
    title: "Automatic company identity extraction from email",
    icon: ShieldCheck,
  },
  {
    id: "challenge",
    title: "30-Second one-time email verification challenge",
    icon: Clock,
  },
  {
    id: "access",
    title: "Instant autonomous workspace & intelligence access",
    icon: Sparkles,
  },
];

const AuthScreen = () => {
  const {
    login,
    register,
    verifyEmail,
    resendVerification,
    verifyLogin,
    claimVerificationSession,
    loading,
    savedCreds,
  } = useAuth();

  const [mode, setModeState] = useState(() => {
    if (typeof window === "undefined") return "register";
    return window.location.pathname.startsWith("/login") ? "login" : "register";
  });

  const setMode = (newMode) => {
    setModeState(newMode);
    setVerificationStep("idle");
    setVerificationCode("");
    setVerificationStatus("idle");
    if (typeof window !== "undefined") {
      const targetPath = newMode === "login" ? "/login" : "/signup";
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, "", targetPath + window.location.search);
      }
    }
  };

  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerError, setRegisterError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Verification State Management ──
  const [verificationStep, setVerificationStep] = useState("idle");
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [countdown, setCountdown] = useState(30);
  const [activeEmail, setActiveEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationSessionToken, setVerificationSessionToken] = useState("");

  const countdownTimerRef = useRef(null);

  const finishApprovedSession = useCallback(async () => {
    if (!verificationSessionToken) return false;
    const result = await claimVerificationSession(verificationSessionToken);
    if (!result.success) {
      setVerifyError(
        result.error?.message || "Unable to complete email verification.",
      );
      return false;
    }
    if (result.status !== "approved") return false;

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setVerificationStatus("verified");
    window.setTimeout(() => {
      window.location.href = "/app";
    }, 900);
    return true;
  }, [claimVerificationSession, verificationSessionToken]);

  useEffect(() => {
    if (
      !verificationSessionToken ||
      verificationStatus === "verified" ||
      verificationStatus === "expired"
    ) {
      return undefined;
    }
    let active = true;
    const checkApproval = async () => {
      if (!active) return;
      await finishApprovedSession();
    };
    checkApproval();
    const timer = window.setInterval(checkApproval, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [finishApprovedSession, verificationSessionToken, verificationStatus]);

  const startCountdown = (initialSeconds = 30) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(initialSeconds);
    setVerificationStatus("counting");
    setVerifyError("");

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          setVerificationStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (savedCreds?.email && savedCreds?.password) {
      setMode("login");
    }
  }, [savedCreds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("oauth_token");
      const oauthRefresh = params.get("oauth_refresh");
      const oauthEmail = params.get("oauth_email");
      const oauthName = params.get("oauth_name");
      const error = params.get("error");

      if (error) {
        setLoginError(`Authentication failed: ${error.replace(/_/g, " ")}`);
      }

      if (oauthToken) {
        localStorage.setItem("auth_token", oauthToken);
        if (oauthRefresh) {
          localStorage.setItem("auth_refresh_token", oauthRefresh);
        }
        if (oauthEmail && oauthName) {
          localStorage.setItem(
            "auth_user",
            JSON.stringify({
              email: oauthEmail,
              full_name: oauthName,
              is_active: true,
              is_admin: false,
            }),
          );
        }
        window.location.href = "/app";
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const verifyToken = params.get("verify_email");
      const paramEmail = params.get("email") || "";

      if (verifyToken) {
        setActiveEmail(paramEmail);
        setVerificationStep("register_verify");
        setVerificationStatus("counting");
        setIsSubmittingCode(true);

        verifyEmail(paramEmail, verifyToken).then((res) => {
          setIsSubmittingCode(false);
          if (res.success) {
            if (countdownTimerRef.current)
              clearInterval(countdownTimerRef.current);
            setVerificationStatus("verified");
            const verifiedEmail = res.data?.email || paramEmail;
            if (verifiedEmail) {
              setLoginForm((prev) => ({ ...prev, email: verifiedEmail }));
            }
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", "/login?verified=1");
            }
          } else {
            setVerificationStatus("expired");
            setVerifyError(
              res.error?.message ||
                "Verification link is invalid or has expired.",
            );
          }
        });
      }
    }
  }, [verifyEmail]);

  const handleOAuth = (provider) => {
    const apiBase = API_BASE_URL;
    window.location.href = `${apiBase}/api/v1/auth/${provider}/login`;
  };

  const passwordStrength = useMemo(
    () => getPasswordStrength(registerForm.password),
    [registerForm.password],
  );

  const updateRegisterField = (field, value) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
    setRegisterError("");
  };

  const updateLoginField = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setLoginError("");
  };

  const switchToLogin = (email = "") => {
    setMode("login");
    setVerificationStep("idle");
    setLoginForm((prev) => ({
      ...prev,
      email: email || prev.email,
      password: "",
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const email = registerForm.email.trim();
    const password = registerForm.password;

    if (!email || !password) {
      setRegisterError("Enter your company email and a password.");
      return;
    }
    if (password.length < 8) {
      setRegisterError("Password must be at least 8 characters long.");
      return;
    }

    const result = await register(email, password);
    if (!result.success) {
      setRegisterError(result.error?.message || "Registration failed.");
      return;
    }

    setActiveEmail(email);
    setDemoCode(result.user?.demo_code || "");
    setVerificationSessionToken(result.user?.session_token || "");
    setVerificationStep("register_verify");
    startCountdown(result.user?.expires_in || 30);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const email = loginForm.email.trim();
    const password = loginForm.password;

    if (!email || !password) {
      setLoginError("Enter your email and password.");
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      const msg = result.error?.message || "";
      if (
        result.error?.status === 403 &&
        msg.toLowerCase().includes("not verified")
      ) {
        setActiveEmail(email);
        setVerificationStep("login_verify");
        startCountdown(30);
        resendVerification(email, "login").then((res) => {
          if (res.success) {
            setDemoCode(res.data?.demo_code || "");
            setVerificationSessionToken(res.data?.session_token || "");
            startCountdown(res.data?.expires_in || 30);
          }
        });
        return;
      }
      setLoginError(msg || "Login failed.");
      return;
    }

    window.location.href = "/app";
  };

  const handleConfirmVerification = async (codeToSubmit = verificationCode) => {
    const code = (codeToSubmit || verificationCode).trim();
    if (!code || code.length < 4) {
      setVerifyError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmittingCode(true);
    setVerifyError("");

    if (verificationStep === "register_verify") {
      const res = await verifyEmail(activeEmail, code);
      setIsSubmittingCode(false);

      if (!res.success) {
        setVerifyError(res.error?.message || "Invalid or expired code.");
        return;
      }

      await finishApprovedSession();
    } else if (verificationStep === "login_verify") {
      const res = await verifyLogin(activeEmail, code, loginForm.password);
      setIsSubmittingCode(false);

      if (!res.success) {
        setVerifyError(res.error?.message || "Invalid or expired code.");
        return;
      }

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setVerificationStatus("verified");

      setTimeout(() => {
        window.location.href = "/app";
      }, 900);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setVerifyError("");
    setVerificationCode("");
    const purpose = verificationStep === "login_verify" ? "login" : "register";
    const res = await resendVerification(activeEmail, purpose);

    if (res.success) {
      setDemoCode(res.data?.demo_code || "");
      setVerificationSessionToken(res.data?.session_token || "");
      startCountdown(res.data?.expires_in || 30);
    } else {
      setVerifyError(res.error?.message || "Failed to resend code. Try again.");
    }
    setIsResending(false);
  };

  return (
    <div className="auth-shell min-h-screen text-slate-100 relative overflow-x-hidden overflow-y-auto flex">
      {/* ── Ambient background grid ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="auth-grid absolute inset-0" />
        <div
          className="absolute -top-40 right-10 w-[550px] h-[550px] rounded-full blur-[140px]"
          style={{ background: "rgba(16,185,129,0.05)" }}
        />
        <div
          className="absolute bottom-10 left-10 w-[450px] h-[450px] rounded-full blur-[130px]"
          style={{ background: "rgba(56,189,248,0.04)" }}
        />
      </div>

      {/* ── LEFT EDITORIAL PANEL ── */}
      <aside className="auth-brand-panel hidden lg:flex flex-col w-[48%] xl:w-[46%] min-h-screen relative px-12 xl:px-16 py-12">
        {/* Top Header: Logo + Zero-Trust Tag */}
        <div className="flex items-center justify-between">
          <AurelinxLogo collapsed={false} size={24} />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero-Trust Gateway</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="my-auto py-10">
          <motion.div
            key={verificationStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {verificationStep !== "idle"
                  ? "Security Verification (30s)"
                  : mode === "register"
                    ? "01 - Create Account"
                    : "02 - Sign In"}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white tracking-tight leading-[1.08] mb-6">
              {verificationStep !== "idle" ? (
                <>
                  Verified with
                  <br />
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                    confidence.
                  </span>
                </>
              ) : (
                <>
                  Intelligence begins
                  <br />
                  with{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                    access.
                  </span>
                </>
              )}
            </h1>

            {/* Description */}
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-md font-normal">
              {verificationStep !== "idle"
                ? "Every employee account is guarded by time-sensitive 30-second cryptographic verification for zero-trust enterprise security."
                : "Register with your verified company email to access talent data, sentiment pulse, AI insights, and autonomous management."}
            </p>
          </motion.div>

          {/* Feature List */}
          <div className="mt-9 space-y-3">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.07 }}
                className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <feat.icon size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200 leading-snug">
                  {feat.title}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Enterprise Security Footer */}
        <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/[0.06]">
          <div className="flex items-center gap-3.5 text-[11px] font-mono text-slate-500 tracking-wider">
            <span>SOC2 TYPE II</span>
            <span>•</span>
            <span>256-BIT ENCRYPTED</span>
            <span>•</span>
            <span>TLS 1.3</span>
          </div>
          <div
            className="text-4xl font-mono font-bold text-white/[0.04] select-none pointer-events-none"
            aria-hidden="true"
          >
            {verificationStep !== "idle"
              ? "30"
              : mode === "register"
                ? "01"
                : "02"}
          </div>
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="auth-form-panel flex-1 flex items-center justify-center px-4 py-8 sm:px-10 sm:py-12 relative z-10">
        <motion.div
          className="w-full"
          style={{ maxWidth: 430 }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <AurelinxLogo collapsed={false} size={22} />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
              <span>Zero-Trust</span>
            </div>
          </div>

          {/* Modern Minimalist Glass Card */}
          <div className="auth-card p-6 sm:p-8">
            {/* Segmented Mode Switcher with Smooth Sliding Indicator */}
            {verificationStep === "idle" && (
              <div className="relative p-1 rounded-xl bg-[#070b10] border border-white/[0.08] flex mb-6">
                {/* Smooth sliding pill indicator with spring physics */}
                <motion.div
                  className="absolute top-1 bottom-1 rounded-lg bg-[#141c26] border border-white/[0.12] shadow-sm pointer-events-none"
                  initial={false}
                  animate={{
                    left: mode === "register" ? "4px" : "calc(50% + 2px)",
                    width: "calc(50% - 6px)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 38,
                    mass: 0.8,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`relative z-10 flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-150 cursor-pointer text-center select-none ${
                    mode === "register"
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Register
                </button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`relative z-10 flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-150 cursor-pointer text-center select-none ${
                    mode === "login"
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {/* ── 1. EMAIL VERIFICATION CHALLENGE VIEW ── */}
              {verificationStep !== "idle" ? (
                <motion.div
                  key="verify-screen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-center pb-1">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                      <ShieldCheck size={24} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {verificationStep === "register_verify"
                        ? "Verify your email"
                        : "2-Step Security Verification"}
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      We sent a 6-digit challenge code to{" "}
                      <span className="text-white font-medium">
                        {activeEmail}
                      </span>
                    </p>
                  </div>

                  {/* Sleek Countdown Progress Card */}
                  <div className="py-1">
                    <div
                      className={`w-full rounded-xl p-3.5 border transition-all text-xs sm:text-sm flex items-center justify-between gap-3 ${
                        verificationStatus === "verified"
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                          : verificationStatus === "expired"
                            ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                            : "bg-[#091118] border-emerald-500/25 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {verificationStatus === "verified" ? (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-400"
                          />
                        ) : verificationStatus === "expired" ? (
                          <AlertCircle size={18} className="text-rose-400" />
                        ) : (
                          <Clock
                            size={18}
                            className="text-emerald-400 animate-spin"
                          />
                        )}
                        <span className="font-medium text-xs">
                          {verificationStatus === "verified"
                            ? "Verification verified! Entering workspace..."
                            : verificationStatus === "expired"
                              ? "Verification challenge expired"
                              : `Cryptographic challenge (${countdown}s remaining)`}
                        </span>
                      </div>

                      {verificationStatus === "counting" && (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          00:{countdown.toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 6-Digit Code Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setVerificationCode(val);
                        if (val.length === 6) {
                          handleConfirmVerification(val);
                        }
                      }}
                      placeholder="••••••"
                      className="w-full font-mono text-center tracking-[0.45em] text-xl py-3 px-4 rounded-xl outline-none transition-all"
                      style={{
                        background: "rgba(7,11,16,0.95)",
                        border: "1px solid rgba(52,211,153,0.3)",
                        color: "#34d399",
                      }}
                    />
                  </div>

                  {/* Dev / Quick Verify Helper */}
                  {demoCode && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Sparkles
                          size={14}
                          className="text-emerald-400 shrink-0"
                        />
                        <span>
                          Simulated code:{" "}
                          <strong className="font-mono text-emerald-300">
                            {demoCode}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationCode(demoCode);
                          handleConfirmVerification(demoCode);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold transition-all cursor-pointer"
                      >
                        Auto-Verify
                      </button>
                    </div>
                  )}

                  {verifyError && <StatusMsg tone="error" text={verifyError} />}

                  <p className="text-center text-xs text-slate-500">
                    Check your inbox and spam folder. Enter code above or click
                    the verification link in your email.
                  </p>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {verificationStatus === "expired" ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10"
                      >
                        <RefreshCw size={15} />
                        {isResending
                          ? "Sending..."
                          : "Request New Security Code"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          isSubmittingCode || verificationStatus === "verified"
                        }
                        onClick={() => handleConfirmVerification()}
                        className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        {isSubmittingCode
                          ? "Verifying..."
                          : "Confirm Verification"}
                        <ArrowRight size={15} />
                      </button>
                    )}

                    {verificationStatus !== "expired" &&
                      verificationStatus !== "verified" && (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={isResending}
                          className="w-full py-1.5 text-center text-xs text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw size={12} className="mr-1 inline" />
                          {isResending
                            ? "Sending a new challenge..."
                            : "Didn't receive it? Resend verification code"}
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => {
                        if (countdownTimerRef.current)
                          clearInterval(countdownTimerRef.current);
                        setVerificationStep("idle");
                      }}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-1.5 transition-colors cursor-pointer"
                    >
                      ← Back to edit credentials
                    </button>
                  </div>
                </motion.div>
              ) : mode === "register" ? (
                /* ── 2. REGISTER FORM ── */
                <motion.form
                  key="register"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Create your account
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Enter email & password. Profile details are
                      auto-configured.
                    </p>
                  </div>

                  <MinimalField
                    label="Company Email"
                    type="email"
                    icon={Mail}
                    value={registerForm.email}
                    onChange={(v) => updateRegisterField("email", v)}
                    placeholder="you@company.com"
                  />

                  <MinimalField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    icon={Lock}
                    value={registerForm.password}
                    onChange={(v) => updateRegisterField("password", v)}
                    placeholder="Create a strong password (min 8 chars)"
                    togglePassword={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                  />

                  {/* Password Strength Indicator */}
                  {registerForm.password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden pt-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-slate-400">
                          Password Strength
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className="h-1 rounded-full transition-all duration-300"
                            style={{
                              background:
                                passwordStrength.bars >= bar
                                  ? passwordStrength.color
                                  : "rgba(255,255,255,0.08)",
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {registerError && (
                    <StatusMsg tone="error" text={registerError} />
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold text-[13.5px] tracking-wide bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:brightness-105 active:scale-[0.99] text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_16px_rgba(16,185,129,0.22)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      "Sending challenge..."
                    ) : (
                      <>
                        Create account & Verify Email
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-400 text-center">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      onClick={() => switchToLogin(registerForm.email)}
                    >
                      Sign in
                    </button>
                  </p>

                  {/* SSO Divider */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.08]" />
                    </div>
                    <span className="relative px-3 text-[10px] text-slate-500 uppercase tracking-widest bg-[#0c1117]">
                      Or continue with
                    </span>
                  </div>

                  {/* Google Workspace SSO */}
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    className="auth-social w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-slate-200 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google Workspace
                  </button>
                </motion.form>
              ) : (
                /* ── 3. SIGN IN FORM ── */
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Welcome back
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Sign in to manage your enterprise workspace.
                    </p>
                  </div>

                  <MinimalField
                    label="Email Address"
                    type="email"
                    icon={Mail}
                    value={loginForm.email}
                    onChange={(v) => updateLoginField("email", v)}
                    onFocus={() => setShowEmailSuggestion(true)}
                    onBlur={() =>
                      setTimeout(() => setShowEmailSuggestion(false), 200)
                    }
                    placeholder="you@company.com"
                  >
                    {showEmailSuggestion && savedCreds?.email && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#091524] border border-emerald-500/20 rounded-xl p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-md">
                        <button
                          type="button"
                          className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-500/10 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer"
                          onClick={() => {
                            setLoginForm((prev) => ({
                              ...prev,
                              email: savedCreds.email,
                            }));
                            setShowEmailSuggestion(false);
                          }}
                        >
                          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                              Saved Account
                            </div>
                            <div className="text-xs font-semibold text-slate-200 truncate">
                              {savedCreds.email}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </MinimalField>

                  <MinimalField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    icon={Lock}
                    value={loginForm.password}
                    onChange={(v) => updateLoginField("password", v)}
                    placeholder="••••••••"
                    togglePassword={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    }
                  />

                  {loginError && <StatusMsg tone="error" text={loginError} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold text-[13.5px] tracking-wide bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:brightness-105 active:scale-[0.99] text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_16px_rgba(16,185,129,0.22)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      "Signing in..."
                    ) : (
                      <>
                        Sign In to Workspace
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-400 text-center">
                    New to Aurelinx?{" "}
                    <button
                      type="button"
                      className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      onClick={() => setMode("register")}
                    >
                      Register company account
                    </button>
                  </p>

                  {/* SSO Divider */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.08]" />
                    </div>
                    <span className="relative px-3 text-[10px] text-slate-500 uppercase tracking-widest bg-[#0c1117]">
                      Or continue with
                    </span>
                  </div>

                  {/* Google Workspace SSO */}
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    className="auth-social w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-slate-200 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google Workspace
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ── Clean Reusable Micro-Components ── */

const MinimalField = ({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  togglePassword,
  onFocus,
  onBlur,
  children,
}) => (
  <div className="relative">
    <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5">
      {label}
    </label>
    <div className="relative flex items-center">
      {Icon && (
        <div className="absolute left-3.5 pointer-events-none text-slate-500">
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : "email"}
        className={`auth-input w-full ${Icon ? "pl-10" : "pl-3.5"} ${togglePassword ? "pr-10" : "pr-3.5"} py-2.5 text-sm outline-none`}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {togglePassword && (
        <div className="absolute right-3.5 flex items-center">
          {togglePassword}
        </div>
      )}
    </div>
    {children}
  </div>
);

const StatusMsg = ({ tone, text }) => {
  const isError = tone === "error";
  return (
    <div
      className={`w-full min-w-0 max-w-full rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2.5 ${
        isError
          ? "bg-rose-500/10 border border-rose-500/25 text-rose-300"
          : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
      }`}
    >
      {isError ? (
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
        {text}
      </span>
    </div>
  );
};

export default AuthScreen;
