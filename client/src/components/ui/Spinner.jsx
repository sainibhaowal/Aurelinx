import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner = ({
  size = 'md', // sm, md, lg
  color = 'primary', // primary, secondary, accent, white
  label = '',
  className = '',
  ...props
}) => {
  const sizes = {
    sm: 16,
    md: 28,
    lg: 40,
  };

  const colors = {
    primary: 'text-indigo-500',
    secondary: 'text-cyan-400',
    accent: 'text-emerald-400',
    white: 'text-white',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} {...props}>
      <Loader2
        size={sizes[size]}
        className={`animate-spin ${colors[color]} shrink-0`}
      />
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 select-none animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

export default Spinner;
