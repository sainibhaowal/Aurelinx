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

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
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

  if (score <= 2) return { label: "Weak", color: "#f87171", pct: 33 };
  if (score <= 4) return { label: "Fair", color: "#fbbf24", pct: 66 };
  return { label: "Strong", color: "#34d399", pct: 100 };
};

const FEATURES = [
  "Automatic company identity extraction from email",
  "30-Second one-time email verification challenge",
  "Instant autonomous workspace & intelligence access",
];

const AuthScreen = () => {
  const {
    login,
    register,
    verifyEmail,
    resendVerification,
    verifyLogin,
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

  // ── Verification State Management ──
  // verificationStep: 'idle' | 'register_verify' | 'login_verify'
  const [verificationStep, setVerificationStep] = useState("idle");
  // verificationStatus: 'idle' | 'counting' | 'expired' | 'verified'
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [countdown, setCountdown] = useState(30);
  const [activeEmail, setActiveEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const countdownTimerRef = useRef(null);

  // Start 30s countdown timer
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

  // Prefill saved credentials from Tauri parent shell if available
  useEffect(() => {
    if (savedCreds?.email && savedCreds?.password) {
      setMode("login");
    }
  }, [savedCreds]);

  // Handle OAuth callback parameters on mount (Google only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("oauth_token");
      const oauthEmail = params.get("oauth_email");
      const oauthName = params.get("oauth_name");
      const error = params.get("error");

      if (error) {
        setLoginError(`Authentication failed: ${error.replace(/_/g, " ")}`);
      }

      if (oauthToken) {
        localStorage.setItem("auth_token", oauthToken);
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

  // ── 1. Handle Simple Email + Password Registration ──
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

    // Enter 30-Second Verification Screen
    setActiveEmail(email);
    setDemoCode(result.user?.demo_code || "");
    setVerificationStep("register_verify");
    startCountdown(result.user?.expires_in || 30);
  };

  // ── 2. Handle Direct Sign In Submit ──
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
      setLoginError(result.error?.message || "Login failed.");
      return;
    }

    // Direct Login Successful -> Redirect to app
    window.location.href = "/app";
  };

  // ── 3. Handle 30s Verification Code Confirmation ──
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

      // Success: Turn indicator green and redirect to Sign In
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setVerificationStatus("verified");

      setTimeout(() => {
        setRegisterForm(initialRegisterState);
        switchToLogin(activeEmail);
      }, 1400);
    } else if (verificationStep === "login_verify") {
      const res = await verifyLogin(activeEmail, code, loginForm.password);
      setIsSubmittingCode(false);

      if (!res.success) {
        setVerifyError(res.error?.message || "Invalid or expired code.");
        return;
      }

      // Success: Turn indicator green and enter app
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setVerificationStatus("verified");

      setTimeout(() => {
        window.location.href = "/app";
      }, 900);
    }
  };

  // ── 4. Handle Resend Verification Link ──
  const handleResend = async () => {
    setVerifyError("");
    setVerificationCode("");
    const purpose = verificationStep === "login_verify" ? "login" : "register";
    const res = await resendVerification(activeEmail, purpose);

    if (res.success) {
      setDemoCode(res.data?.demo_code || "");
      startCountdown(res.data?.expires_in || 30);
    } else {
      setVerifyError(res.error?.message || "Failed to resend code. Try again.");
    }
  };

  return (
    <div
      className="min-h-screen text-slate-100 relative overflow-x-hidden overflow-y-auto flex"
      style={{ background: "#04100b" }}
    >
      {/* ── Ambient layer ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(110,231,183,0.045) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div
          className="absolute -top-32 right-0 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: "rgba(110,231,183,0.06)" }}
        />
        <div
          className="absolute bottom-0 left-[15%] w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ background: "rgba(110,231,183,0.05)" }}
        />
      </div>

      {/* ── LEFT EDITORIAL PANEL ── */}
      <aside
        className="hidden lg:flex flex-col w-[46%] min-h-screen relative px-14 py-12"
        style={{
          background: "rgba(4,10,18,0.75)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex-none">
          <AurelinxLogo collapsed={false} size={24} />
        </div>

        {/* Main copy */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            key={mode + verificationStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-7"
              style={{ color: "rgba(110,231,183,0.55)" }}
            >
              {verificationStep !== "idle"
                ? "Security Verification (30s)"
                : mode === "register"
                  ? "01 — Create Account"
                  : "02 — Sign In"}
            </p>

            <h1 className="text-[3.2rem] font-bold leading-[1.08] tracking-tight text-white mb-7">
              {verificationStep !== "idle" ? (
                <>
                  Verified with
                  <br />
                  <span style={{ color: "#6ee7b7" }}>confidence.</span>
                </>
              ) : (
                <>
                  Intelligence begins
                  <br />
                  with <span style={{ color: "#6ee7b7" }}>access.</span>
                </>
              )}
            </h1>

            <p className="text-slate-400 text-[15px] leading-7 max-w-sm">
              {verificationStep !== "idle"
                ? "Every employee account is guarded by time-sensitive 30-second cryptographic verification for zero-trust enterprise security."
                : "Register with your verified company email to access talent data, sentiment pulse, AI insights, and autonomous management."}
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="mt-14 space-y-5">
            {FEATURES.map((item, i) => (
              <motion.div
                key={item}
                className="flex items-center gap-5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
              >
                <div
                  className="flex-none h-px w-8"
                  style={{ background: "rgba(110,231,183,0.35)" }}
                />
                <span className="text-sm text-slate-300">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ghost number */}
        <div
          className="select-none leading-none font-black -mb-6 -ml-2"
          style={{ fontSize: "11rem", color: "rgba(255,255,255,0.025)" }}
          aria-hidden="true"
        >
          {verificationStep !== "idle"
            ? "30"
            : mode === "register"
              ? "01"
              : "02"}
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center px-3.5 py-4 sm:px-10 sm:py-12 relative z-10">
        <motion.div
          className="w-full"
          style={{ maxWidth: 440 }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-4 sm:mb-8">
            <AurelinxLogo collapsed={false} size={22} />
          </div>

          {/* Glass card */}
          <div
            className="rounded-2xl sm:rounded-3xl p-4 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Underline tabs (only when not in verification view) */}
            {verificationStep === "idle" && (
              <div
                className="flex gap-6 mb-4 sm:mb-8"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <TabBtn
                  active={mode === "register"}
                  onClick={() => setMode("register")}
                >
                  Register
                </TabBtn>
                <TabBtn
                  active={mode === "login"}
                  onClick={() => setMode("login")}
                >
                  Sign In
                </TabBtn>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ── 30-SECOND VERIFICATION SCREEN (REGISTER & LOGIN) ── */}
              {verificationStep !== "idle" ? (
                <motion.div
                  key="verify-screen"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                      <Mail size={22} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {verificationStep === "register_verify"
                        ? "Verify your email"
                        : "2-Step Security Verification"}
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Sent to{" "}
                      <span className="text-white font-medium">
                        {activeEmail}
                      </span>
                    </p>
                  </div>

                  {/* 30-Second Indicator Button */}
                  <div className="pt-1 pb-2">
                    <div
                      className={`relative w-full rounded-2xl p-4 transition-all duration-500 text-center font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between gap-3 ${
                        verificationStatus === "verified"
                          ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 text-slate-950 shadow-emerald-500/40"
                          : verificationStatus === "expired"
                            ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-red-500/30"
                            : "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white shadow-orange-500/30 animate-pulse"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {verificationStatus === "verified" ? (
                          <CheckCircle2 size={20} className="text-slate-950" />
                        ) : verificationStatus === "expired" ? (
                          <AlertCircle size={20} />
                        ) : (
                          <Clock size={20} className="animate-spin" />
                        )}
                        <span>
                          {verificationStatus === "verified"
                            ? "Verification Done! Account Created"
                            : verificationStatus === "expired"
                              ? "Verification expired (30s limit)"
                              : `Awaiting email verification (${countdown}s)...`}
                        </span>
                      </div>

                      {verificationStatus === "counting" && (
                        <span className="font-mono text-sm px-2 py-0.5 rounded-lg bg-black/30 border border-white/20">
                          {countdown}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 6-Digit Code Input */}
                  <div>
                    <label
                      className="block text-[9px] sm:text-[10px] uppercase font-semibold mb-1 sm:mb-1.5"
                      style={{
                        letterSpacing: "0.2em",
                        color: "rgba(148,163,184,0.5)",
                      }}
                    >
                      6-Digit Confirmation Code
                    </label>
                    <div className="flex gap-2">
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
                        placeholder="123456"
                        className="w-full font-mono text-center tracking-[0.4em] text-lg sm:text-xl py-3 px-4 rounded-xl outline-none transition-colors"
                        style={{
                          background: "rgba(7,17,31,0.96)",
                          border: "1px solid rgba(110,231,183,0.2)",
                          color: "#6ee7b7",
                        }}
                      />
                    </div>
                  </div>

                  {/* Dev / Demo Quick Verify Helper */}
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

                  {/* Confirm or Resend Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {verificationStatus === "expired" ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
                      >
                        <RefreshCw size={16} />
                        Send New Verification Link (30s)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          isSubmittingCode || verificationStatus === "verified"
                        }
                        onClick={() => handleConfirmVerification()}
                        className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        {isSubmittingCode
                          ? "Verifying..."
                          : "Confirm Verification"}
                        <ArrowRight size={15} />
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
                /* ── REGISTER FORM ── */
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleRegister}
                  className="space-y-3.5 sm:space-y-5"
                >
                  <div className="mb-1 sm:mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Create your account
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                      Enter email & password. Profile details are
                      auto-configured.
                    </p>
                  </div>

                  <LineField
                    label="Company Email"
                    type="email"
                    value={registerForm.email}
                    onChange={(v) => updateRegisterField("email", v)}
                    placeholder="you@company.com"
                  />

                  <LineField
                    label="Password"
                    type="password"
                    value={registerForm.password}
                    onChange={(v) => updateRegisterField("password", v)}
                    placeholder="Create a strong password (min 8 chars)"
                  />

                  {/* Password strength meter */}
                  {registerForm.password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-0.5 pb-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: "rgba(148,163,184,0.5)" }}>
                            Password Strength
                          </span>
                          <span
                            className="font-bold"
                            style={{ color: passwordStrength.color }}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div
                          className="h-1 w-full rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${passwordStrength.pct}%`,
                              background: passwordStrength.color,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {registerError && (
                    <StatusMsg tone="error" text={registerError} />
                  )}

                  <SubmitBtn loading={loading} accent="cyan">
                    {loading
                      ? "Sending verification..."
                      : "Create account & Verify Email"}
                  </SubmitBtn>

                  <p className="text-xs sm:text-sm text-slate-500 text-center">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold transition-colors cursor-pointer"
                      style={{ color: "#6ee7b7" }}
                      onClick={() => switchToLogin(registerForm.email)}
                    >
                      Sign in
                    </button>
                  </p>

                  {/* ── Social Login Row (Google only, No GitHub) ── */}
                  <div className="relative my-3 sm:my-5 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700/50" />
                    </div>
                    <span className="relative px-3 text-[10px] sm:text-xs text-slate-500 uppercase bg-[#04100b] bg-opacity-0 backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer"
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
                  </div>
                </motion.form>
              ) : (
                /* ── LOGIN FORM ── */
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleLogin}
                  className="space-y-3.5 sm:space-y-5"
                >
                  <div className="mb-1 sm:mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Welcome back
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                      Sign in to manage your workspace.
                    </p>
                  </div>

                  <LineField
                    label="Email Address"
                    type="email"
                    value={loginForm.email}
                    onChange={(v) => updateLoginField("email", v)}
                    onFocus={() => setShowEmailSuggestion(true)}
                    onBlur={() =>
                      setTimeout(() => setShowEmailSuggestion(false), 200)
                    }
                    placeholder="you@company.com"
                  >
                    {showEmailSuggestion && savedCreds?.email && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#091524] border border-[#6ee7b7]/20 rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-md">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-[#6ee7b7]/10 rounded-xl transition-all duration-150 flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setLoginForm((prev) => ({
                              ...prev,
                              email: savedCreds.email,
                            }));
                            setShowEmailSuggestion(false);
                          }}
                        >
                          <div className="flex-none h-2 w-2 rounded-full bg-[#6ee7b7] animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                              Saved Account
                            </div>
                            <div className="text-sm font-semibold text-slate-200 truncate">
                              {savedCreds.email}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </LineField>

                  <LineField
                    label="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(v) => updateLoginField("password", v)}
                    placeholder="••••••••"
                  />

                  {loginError && <StatusMsg tone="error" text={loginError} />}

                  <SubmitBtn loading={loading} accent="emerald">
                    {loading ? "Signing in..." : "Sign In to Workspace"}
                  </SubmitBtn>

                  <p className="text-xs sm:text-sm text-slate-500 text-center">
                    New to Aurelinx?{" "}
                    <button
                      type="button"
                      className="font-semibold transition-colors cursor-pointer"
                      style={{ color: "#6ee7b7" }}
                      onClick={() => setMode("register")}
                    >
                      Register company account
                    </button>
                  </p>

                  {/* ── Social Login Row (Google only, No GitHub) ── */}
                  <div className="relative my-3 sm:my-5 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700/50" />
                    </div>
                    <span className="relative px-3 text-[10px] sm:text-xs text-slate-500 uppercase bg-[#04100b] bg-opacity-0 backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
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
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const TabBtn = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="pb-2 text-xs sm:text-sm font-semibold tracking-wide transition-colors"
    style={{
      color: active ? "#ffffff" : "rgba(148,163,184,0.5)",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      borderBottom: active ? "2px solid #6ee7b7" : "2px solid transparent",
      marginBottom: "-1px",
      cursor: "pointer",
      padding: "0 0 8px 0",
    }}
  >
    {children}
  </button>
);

const LineField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
  children,
}) => (
  <div className="relative">
    <label
      className="block text-[9px] sm:text-[10px] uppercase font-semibold mb-1 sm:mb-1.5"
      style={{ letterSpacing: "0.2em", color: "rgba(148,163,184,0.5)" }}
    >
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={type === "password" ? "new-password" : "email"}
      className="auth-input w-full text-xs sm:text-sm outline-none transition-colors py-2.5 px-3.5 sm:py-3.5 sm:px-4"
      style={{
        background: "rgba(7,17,31,0.96)",
        border: "1px solid rgba(110,231,183,0.12)",
        borderRadius: "14px",
        color: "#dbe7f3",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(110,231,183,0.42)";
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(110,231,183,0.12)";
        if (onBlur) onBlur(e);
      }}
    />
    {children}
  </div>
);

const SubmitBtn = ({ loading, accent, children }) => {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-10 sm:h-12 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      style={{
        background:
          accent === "cyan"
            ? "linear-gradient(135deg, #0f766e, #0d9488)"
            : "linear-gradient(135deg, #0f766e, #166534)",
        color: "#d8f7ff",
        border: "1px solid rgba(110,231,183,0.18)",
        boxShadow: "0 10px 30px rgba(8,145,178,0.18)",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background =
            accent === "cyan"
              ? "linear-gradient(135deg, #115e59, #0e7490)"
              : "linear-gradient(135deg, #115e59, #14532d)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          accent === "cyan"
            ? "linear-gradient(135deg, #0f766e, #0d9488)"
            : "linear-gradient(135deg, #0f766e, #166534)";
      }}
    >
      {children}
      {!loading && <ArrowRight size={15} />}
    </button>
  );
};

const StatusMsg = ({ tone, text }) => {
  const isError = tone === "error";
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm flex items-start gap-3"
      style={{
        background: isError
          ? "rgba(248,113,113,0.08)"
          : "rgba(52,211,153,0.08)",
        border: `1px solid ${isError ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}`,
        color: isError ? "#fca5a5" : "#6ee7b7",
      }}
    >
      {isError ? (
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
};

export default AuthScreen;
