import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, outline, ghost, danger
  size = "md", // sm, md, lg
  isLoading = false,
  disabled = false,
  icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 outline-none select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 border border-indigo-500/20",
    secondary:
      "bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10 shadow-sm",
    outline:
      "bg-transparent hover:bg-white/5 text-slate-200 border border-white/15",
    ghost:
      "bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-100",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/15 border border-rose-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2
          className="animate-spin shrink-0"
          size={size === "sm" ? 14 : size === "md" ? 16 : 18}
        />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span className="truncate">{children}</span>
    </motion.button>
  );
};

export default Button;
