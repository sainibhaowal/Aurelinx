import React from "react";
import { motion } from "framer-motion";

const AurelinxLogo = ({ size = 24, collapsed = false }) => {
  return (
    <div
      className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="inline-flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size + 10, height: size + 10 }}
      >
        <img
          src="/aurelinx-logo-4k.svg"
          alt="Aurelinx Logo"
          style={{ width: "120%", height: "120%", objectFit: "contain" }}
        />
      </motion.div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-extrabold tracking-tight text-cyan-300"
        >
          Aurelinx
        </motion.span>
      )}
    </div>
  );
};

export default AurelinxLogo;

