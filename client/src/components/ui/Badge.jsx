import React from "react";

const Badge = ({
  children,
  color = "primary", // primary, secondary, success, warning, danger, info
  variant = "glow", // solid, outline, glow
  className = "",
  ...props
}) => {
  const baseBadge =
    "inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border whitespace-nowrap select-none";

  const variants = {
    solid: {
      primary: "bg-indigo-600 border-indigo-500 text-white",
      secondary: "bg-slate-700 border-slate-600 text-slate-100",
      success: "bg-emerald-600 border-emerald-500 text-white",
      warning: "bg-amber-600 border-amber-500 text-white",
      danger: "bg-rose-600 border-rose-500 text-white",
      info: "bg-cyan-600 border-cyan-500 text-white",
    },
    outline: {
      primary: "bg-transparent border-indigo-500/30 text-indigo-400",
      secondary: "bg-transparent border-white/10 text-slate-300",
      success: "bg-transparent border-emerald-500/30 text-emerald-400",
      warning: "bg-transparent border-amber-500/30 text-amber-400",
      danger: "bg-transparent border-rose-500/30 text-rose-400",
      info: "bg-transparent border-cyan-500/30 text-cyan-400",
    },
    glow: {
      primary:
        "bg-indigo-500/5 border-indigo-500/20 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.06)]",
      secondary: "bg-white/2 border-white/8 text-slate-300 shadow-sm",
      success:
        "bg-emerald-500/5 border-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.06)]",
      warning:
        "bg-amber-500/5 border-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.06)]",
      danger:
        "bg-rose-500/5 border-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.06)]",
      info: "bg-cyan-500/5 border-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,180,212,0.06)]",
    },
  };

  return (
    <span
      className={`${baseBadge} ${variants[variant][color]} ${className}`}
      {...props}
    >
      {/* Tiny dot inside glowing badges */}
      {variant === "glow" && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-current`}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
