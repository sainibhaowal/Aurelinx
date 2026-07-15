import React from "react";
import { motion } from "framer-motion";

const AureliusLogo = ({ size = 24, collapsed = false }) => {
  return (
    <div
      className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="inline-flex items-center justify-center rounded-xl border border-cyan-300/50 bg-[#0a2238] shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
        style={{ width: size + 8, height: size + 8 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="#22d3ee"
            strokeWidth="1.6"
          />
          <path
            d="M8.5 16L12 8L15.5 16"
            stroke="#e2e8f0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 13.1H14"
            stroke="#e2e8f0"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-extrabold tracking-tight text-cyan-300"
        >
          Aurelius
        </motion.span>
      )}
    </div>
  );
};

export default AureliusLogo;
