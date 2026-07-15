import React from "react";
import { motion } from "framer-motion";

const Card = ({
  children,
  onClick,
  variant = "default", // default, interactive, gradient
  className = "",
  ...props
}) => {
  const isInteractive =
    typeof onClick === "function" || variant === "interactive";

  const baseCard = "premium-card relative overflow-hidden";
  const interactiveStyles = isInteractive
    ? "premium-card-hover cursor-pointer border-white/5 hover:border-indigo-500/30"
    : "";

  const gradients = {
    default: "",
    interactive: "",
    gradient:
      "bg-gradient-to-br from-indigo-950/20 via-slate-950/40 to-cyan-950/10 border-indigo-900/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={isInteractive ? { y: -2 } : {}}
      transition={{ duration: 0.2 }}
      className={`${baseCard} ${interactiveStyles} ${gradients[variant]} ${className}`}
      {...props}
    >
      {/* Subtle backdrop reflection line */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      {/* Glowing inner shadow overlay for premium look */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 h-full w-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

export default Card;
