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
        className="inline-flex items-center justify-center rounded-xl border border-cyan-300/40 bg-[#071726] shadow-[0_0_0_1.5px_rgba(34,211,238,0.2)]"
        style={{ width: size + 10, height: size + 10 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g transform="translate(25, 25) scale(0.68) translate(-11.733, -18.73)">
            <path
              fill="#ffffff"
              d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
            />
          </g>
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

