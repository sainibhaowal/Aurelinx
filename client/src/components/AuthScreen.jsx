import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import AureliusLogo from "./AureliusLogo";
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
  "Gated workspace access",
];

const AuthScreen = () => {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerError, setRegisterError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

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
          <AureliusLogo collapsed={false} size={24} />
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
              Register once, then sign in to your workforce analytics platform —
              talent data, AI insights, and enterprise connectors unified.
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
            <AureliusLogo collapsed={false} size={22} />
          </div>

          {/* Underline tabs */}
          <div
            className="flex gap-8 mb-9"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <TabBtn active={mode === "login"} onClick={() => setMode("login")}>
              Sign In
            </TabBtn>
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
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] mb-2">
                        <span className="text-slate-500">Strength</span>
                        <span style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div
                        className="h-[2px] w-full rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: passwordStrength.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${passwordStrength.pct}%` }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  <LineField
                    label="Repeat Password"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(v) => updateRegisterField("confirmPassword", v)}
                    placeholder="Repeat your password"
                  />

                  {registerError && (
                    <StatusMsg tone="error" text={registerError} />
                  )}
                  {registerSuccess && (
                    <StatusMsg tone="success" text={registerSuccess} />
                  )}

                  <SubmitBtn loading={loading} accent="cyan">
                    {loading ? "Creating account…" : "Create account"}
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
                      Sign in to your Aurelius workspace.
                    </p>
                  </div>

                  <LineField
                    label="Email"
                    type="email"
                    value={loginForm.email}
                    onChange={(v) => updateLoginField("email", v)}
                    placeholder="you@company.com"
                  />

                  <LineField
                    label="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(v) => updateLoginField("password", v)}
                    placeholder="Enter your password"
                  />

                  {registerSuccess && (
                    <StatusMsg tone="success" text={registerSuccess} />
                  )}
                  {loginError && <StatusMsg tone="error" text={loginError} />}

                  <SubmitBtn loading={loading} accent="emerald">
                    {loading ? "Signing in…" : "Sign in"}
                  </SubmitBtn>

                  {/* Public registration is disabled. Admin accounts are managed securely. */}
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

const LineField = ({ label, type = "text", value, onChange, placeholder }) => (
  <div>
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
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(103,232,249,0.12)";
      }}
    />
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
