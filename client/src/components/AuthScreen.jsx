import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import AurelinxLogo from "./AurelinxLogo";
import { useAuth } from "../contexts/AuthContext";

const initialRegisterState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
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
  "Email-based account identity",
  "Password strength enforcement",
  "Instant workspace access",
];

const AuthScreen = () => {
  const { login, register, loading, savedCreds } = useAuth();
  const [mode, setMode] = useState("register");
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerError, setRegisterError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  const [showPasswordSuggestion, setShowPasswordSuggestion] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // Prefill saved credentials from Tauri parent shell if available (transition to login tab only, fields remain blank)
  useEffect(() => {
    if (savedCreds?.email && savedCreds?.password) {
      setMode("login");
    }
  }, [savedCreds]);

  // Handle OAuth callback parameters on mount
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
          localStorage.setItem("auth_user", JSON.stringify({
            email: oauthEmail,
            full_name: oauthName,
            is_active: true,
            is_admin: false,
          }));
        }
        // Redirect to main app dashboard
        window.location.href = "/app";
      }
    }
  }, []);

  const handleOAuth = (provider) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";
    window.location.href = `${apiBase}/api/v1/auth/${provider}/login`;
  };

  const passwordStrength = useMemo(
    () => getPasswordStrength(registerForm.password),
    [registerForm.password],
  );

  const updateRegisterField = (field, value) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
    setRegisterError("");
    setRegisterSuccess("");
  };

  const updateLoginField = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setLoginError("");
  };

  const switchToLogin = (email = "") => {
    setMode("login");
    setLoginForm((prev) => ({
      ...prev,
      email: email || prev.email,
      password: "",
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const firstName = registerForm.firstName.trim();
    const lastName = registerForm.lastName.trim();
    const email = registerForm.email.trim();
    const password = registerForm.password;
    const confirmPassword = registerForm.confirmPassword;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setRegisterError("Complete all fields before continuing.");
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    const result = await register(email, `${firstName} ${lastName}`, password);
    if (!result.success) {
      setRegisterError(result.error?.message || "Registration failed.");
      return;
    }

    setRegisterSuccess("Account created. Sign in with your new credentials.");
    setRegisterForm(initialRegisterState);
    switchToLogin(email);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError("Enter your email and password.");
      return;
    }
    const result = await login(loginForm.email.trim(), loginForm.password);
    if (!result.success) {
      setLoginError(result.error?.message || "Login failed.");
    }
  };

  return (
    <div
      className="min-h-screen text-slate-100 relative overflow-x-hidden overflow-y-auto flex"
      style={{ background: "#07111f" }}
    >
      {/* ── Ambient layer ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(103,232,249,0.045) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div
          className="absolute -top-32 right-0 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: "rgba(103,232,249,0.06)" }}
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
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-7"
              style={{ color: "rgba(103,232,249,0.55)" }}
            >
              {mode === "register" ? "01 — Create Account" : "02 — Sign In"}
            </p>

            <h1 className="text-[3.2rem] font-bold leading-[1.08] tracking-tight text-white mb-7">
              Intelligence begins
              <br />
              with <span style={{ color: "#67e8f9" }}>access.</span>
            </h1>

            <p className="text-slate-400 text-[15px] leading-7 max-w-sm">
              Register once, then sign in to your workforce analytics platform — talent data, AI insights, and enterprise connectors unified.
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
                  style={{ background: "rgba(103,232,249,0.35)" }}
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
          {mode === "register" ? "01" : "02"}
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 sm:px-10 relative z-10">
        <motion.div
          className="w-full"
          style={{ maxWidth: 440 }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <AurelinxLogo collapsed={false} size={22} />
          </div>

          {/* Glass card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Underline tabs */}
            <div
              className="flex gap-8 mb-9"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <TabBtn
                active={mode === "register"}
                onClick={() => setMode("register")}
              >
                Register
              </TabBtn>
              <TabBtn active={mode === "login"} onClick={() => setMode("login")}>
                Sign In
              </TabBtn>
            </div>

            <AnimatePresence mode="wait">
              {mode === "register" ? (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleRegister}
                  className="space-y-6"
                >
                  <div className="mb-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Create your account
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                      After signup you'll be directed to sign in.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <LineField
                      label="First Name"
                      value={registerForm.firstName}
                      onChange={(v) => updateRegisterField("firstName", v)}
                      placeholder="Alice"
                    />
                    <LineField
                      label="Last Name"
                      value={registerForm.lastName}
                      onChange={(v) => updateRegisterField("lastName", v)}
                      placeholder="Smith"
                    />
                  </div>

                  <LineField
                    label="Email"
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
                    placeholder="Create a strong password"
                  />

                  {/* Password strength meter */}
                  {registerForm.password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1 pb-2">
                        <div className="flex justify-between text-xs mb-1.5">
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

                  <LineField
                    label="Confirm Password"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(v) => updateRegisterField("confirmPassword", v)}
                    placeholder="Repeat your password"
                  />

                  {registerError && (
                    <StatusMsg tone="error" text={registerError} />
                  )}

                  <SubmitBtn loading={loading} accent="cyan">
                    {loading ? "Registering..." : "Create account"}
                  </SubmitBtn>

                  <p className="text-sm text-slate-500 text-center">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold transition-colors"
                      style={{ color: "#67e8f9" }}
                      onClick={() => switchToLogin(registerForm.email)}
                    >
                      Sign in
                    </button>
                  </p>

                  {/* ── Social Login Row ── */}
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700/50" />
                    </div>
                    <span className="relative px-3 text-xs text-slate-500 uppercase bg-[#07111f] bg-opacity-0 backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuth("github")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                      </svg>
                      GitHub
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleLogin}
                  className="space-y-6"
                >
                  <div className="mb-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Welcome back
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                      Sign in to manage your workspace.
                    </p>
                  </div>

                  <LineField
                    label="Email Address"
                    type="email"
                    value={loginForm.email}
                    onChange={(v) => updateLoginField("email", v)}
                    onFocus={() => setShowEmailSuggestion(true)}
                    onBlur={() => setTimeout(() => setShowEmailSuggestion(false), 200)}
                    placeholder="you@company.com"
                  >
                    {showEmailSuggestion && savedCreds?.email && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#091524] border border-[#67e8f9]/20 rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-md">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-[#67e8f9]/10 rounded-xl transition-all duration-150 flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setLoginForm(prev => ({ ...prev, email: savedCreds.email }));
                            setShowEmailSuggestion(false);
                          }}
                        >
                          <div className="flex-none h-2 w-2 rounded-full bg-[#67e8f9] animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Saved Account</div>
                            <div className="text-sm font-semibold text-slate-200 truncate">{savedCreds.email}</div>
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
                    onFocus={() => {
                      if (loginForm.email.trim() === savedCreds?.email && !loginForm.password) {
                        setShowPasswordSuggestion(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowPasswordSuggestion(false), 200)}
                    placeholder="••••••••"
                  >
                    {showPasswordSuggestion && savedCreds?.password && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#091524] border border-[#67e8f9]/20 rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-md">
                        <button
                          type="button"
                          disabled={isAuthenticating}
                          className="w-full text-left px-4 py-3 hover:bg-[#67e8f9]/10 rounded-xl transition-all duration-150 flex items-center gap-3 cursor-pointer disabled:opacity-50"
                          onClick={async () => {
                            setIsAuthenticating(true);
                            setAuthError("");
                            try {
                              if (window.__TAURI__ && window.__TAURI__.core) {
                                const success = await window.__TAURI__.core.invoke("authenticate_user");
                                if (success) {
                                  setLoginForm(prev => ({ ...prev, password: savedCreds.password }));
                                  setLoginError("");
                                } else {
                                  setAuthError("OS authentication failed or cancelled.");
                                }
                              } else {
                                setAuthError("OS authentication is only supported in desktop shell.");
                              }
                            } catch (e) {
                              console.error("OS authentication error:", e);
                              setAuthError("Failed to trigger OS authentication.");
                            } finally {
                              setIsAuthenticating(false);
                              setShowPasswordSuggestion(false);
                            }
                          }}
                        >
                          <span className="text-base">🔑</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Autofill Protection</div>
                            <div className="text-sm font-semibold text-slate-200">
                              {isAuthenticating ? "Awaiting system verification..." : "Use saved password (Verify via OS)"}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </LineField>

                  {authError && (
                    <div className="text-xs text-red-400 mt-1 font-semibold flex items-center gap-1.5 animate-pulse">
                      <AlertCircle size={12} />
                      {authError}
                    </div>
                  )}

                  {loginError && <StatusMsg tone="error" text={loginError} />}

                  <SubmitBtn loading={loading} accent="cyan">
                    {loading ? "Signing in..." : "Sign in to Workspace"}
                  </SubmitBtn>

                  <p className="text-sm text-slate-500 text-center">
                    New to Aurelinx?{" "}
                    <button
                      type="button"
                      className="font-semibold transition-colors"
                      style={{ color: "#67e8f9" }}
                      onClick={() => setMode("register")}
                    >
                      Create an account
                    </button>
                  </p>

                  {/* ── Social Login Row ── */}
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700/50" />
                    </div>
                    <span className="relative px-3 text-xs text-slate-500 uppercase bg-[#07111f] bg-opacity-0 backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuth("github")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                      </svg>
                      GitHub
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
    className="pb-3 text-sm font-semibold tracking-wide transition-colors"
    style={{
      color: active ? "#ffffff" : "rgba(148,163,184,0.5)",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      borderBottom: active ? "2px solid #67e8f9" : "2px solid transparent",
      marginBottom: "-1px",
      cursor: "pointer",
      padding: "0 0 12px 0",
    }}
  >
    {children}
  </button>
);

const LineField = ({ label, type = "text", value, onChange, placeholder, onFocus, onBlur, children }) => (
  <div className="relative">
    <label
      className="block text-[10px] uppercase font-semibold mb-2"
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
      className="auth-input w-full text-sm outline-none transition-colors"
      style={{
        background: "rgba(7,17,31,0.96)",
        border: "1px solid rgba(103,232,249,0.12)",
        borderRadius: "16px",
        color: "#dbe7f3",
        fontSize: "14px",
        padding: "14px 16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(103,232,249,0.42)";
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(103,232,249,0.12)";
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
      className="w-full h-12 rounded-2xl font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background:
          accent === "cyan"
            ? "linear-gradient(135deg, #0f766e, #0891b2)"
            : "linear-gradient(135deg, #0f766e, #166534)",
        color: "#d8f7ff",
        border: "1px solid rgba(103,232,249,0.18)",
        boxShadow: "0 14px 40px rgba(8,145,178,0.18)",
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
            ? "linear-gradient(135deg, #0f766e, #0891b2)"
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
