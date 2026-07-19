import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";

const ApprovalModal = ({ isOpen, action, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card"
          style={{ width: "450px", padding: "32px", textAlign: "center" }}
        >
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderRadius: "50%",
              }}
            >
              <ShieldAlert size={48} color="#f59e0b" />
            </div>
          </div>

          <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>
            Aurelinx Requires Approval
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "32px",
              lineHeight: "1.6",
            }}
          >
            The AI Agent is recommending the following high-impact action:
            <br />
            <strong style={{ color: "white" }}>{action}</strong>
          </p>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                border: "1px solid var(--glass-border)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <XCircle size={18} /> Reject
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <CheckCircle size={18} /> Approve Action
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ApprovalModal;
