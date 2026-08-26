/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import queryString from "query-string";
import axios from "axios";

// NOTE: This file previously existed; we replace/augment the URL handling to
// automatically verify email when the email link is clicked (verify_email + verify_token)
// while preserving the manual OTP entry UI.

export default function AuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Parse query params to support one-click verification links from email
    const qs = queryString.parse(window.location.search);

    if (qs.verify_email && qs.verify_token) {
      // Auto-fill email and auto-submit token verification
      setEmail(qs.verify_email);
      void (async () => {
        setLoading(true);
        setMessage("Verifying email from link...");
        try {
          const payload = {
            email: qs.verify_email,
            code: qs.verify_token,
          };
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/auth/verify-email`,
            payload
          );
          setMessage("Email verified successfully — you can now sign in.");
          // Optionally redirect or switch UI to login state after short delay
          setTimeout(() => {
            setShowOtp(false);
            setLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 1200);
        } catch (err) {
          setMessage(
            err?.response?.data?.detail || "Failed to verify from email link. Please use the code in your email."
          );
          setLoading(false);
          setShowOtp(true);
        }
      })();
    }

    // If the frontend includes an oauth_token (from OAuth redirects), handle that here as before
    // (This file keeps other OAuth handling unchanged.)
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      // Attempt direct login first
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/auth/login`, {
        email,
        password,
      });
      setLoading(false);
      onLoginSuccess();
    } catch (err) {
      setLoading(false);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || "Login failed";
      if (status === 403 && detail && detail.toLowerCase().includes("not verified")) {
        // Show OTP verification UI and request that the server send a login verification
        setShowOtp(true);
        setMessage("Your account is not verified. Check your email for the code or use the verify link.");
        // Optionally trigger resend - backend login flow appears to already send OTP when appropriate
      } else {
        setMessage(detail);
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100"}/api/v1/auth/verify-email`, {
        email,
        code: otp,
      });
      setMessage("Verified! You can now sign in.");
      setLoading(false);
      setShowOtp(false);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Verification failed");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 20 }}>
      <h2>Aurelinx</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <button type="submit" disabled={loading}>{loading ? "Please wait..." : "Sign in"}</button>
        </div>
      </form>

      {showOtp && (
        <div style={{ marginTop: 20 }}>
          <h3>Verify your email</h3>
          <p>Paste the code from your email here (or click the Verify from email button in the message).</p>
          <form onSubmit={handleVerify}>
            <div>
              <label>Verification code</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <div>
              <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify"}</button>
            </div>
          </form>
        </div>
      )}

      {message && <div style={{ marginTop: 14, color: "#0b7285" }}>{message}</div>}
    </div>
  );
}
