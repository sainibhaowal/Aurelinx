import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/** Accessible, app-owned select control. It intentionally does not use the
 * browser option popup so the glass surface is consistent across platforms. */
const PremiumSelect = ({ value = "", onChange, children, className = "", disabled = false, ...rest }) => {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 140 });

  const options = useMemo(() => React.Children.toArray(children).filter((child) => child?.props?.value !== undefined).map((child) => ({
    value: String(child.props.value),
    label: child.props.children,
    disabled: Boolean(child.props.disabled),
  })), [children]);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === String(value)));
  const selected = options[selectedIndex] || options[0] || { value: "", label: "Select…" };
  const filtered = options.filter((option) => String(option.label ?? "").toLowerCase().includes(search.toLowerCase()));
  
  const layoutClassName = className.split(/\s+/).filter((token) => /^(w-|h-|min-|max-|flex|grow|shrink|mt-|mb-|ml-|mr-|mx-|my-|self-|z-)/.test(token)).join(" ");

  useLayoutEffect(() => {
    if (open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 180),
        width: Math.max(rect.width, 140),
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updateCoords = () => {
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 6,
          left: Math.min(rect.left, window.innerWidth - 180),
          width: Math.max(rect.width, 140),
        });
      }
    };
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (open) setActiveIndex(Math.max(0, filtered.findIndex((option) => option.value === selected.value)));
  }, [open, selected.value, filtered.length]);

  const choose = (option) => {
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value } });
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((current) => !current); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((current) => Math.min(Math.max(current + (event.key === "ArrowDown" ? 1 : -1), 0), filtered.length - 1));
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${layoutClassName}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`premium-select-trigger flex h-full min-h-9 w-full items-center justify-between gap-3 rounded-[0.7rem] border border-white/20 bg-[#071710]/90 px-3 py-2 text-left text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_8px_24px_rgba(1,8,20,.3)] backdrop-blur-xl transition hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="min-w-0 truncate">{selected.label}</span>
        <span className={`text-cyan-400 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
          className="overflow-hidden rounded-xl border border-cyan-400/40 bg-[#071710]/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.85),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-2xl"
          role="listbox"
          aria-label={rest["aria-label"]}
        >
          {options.length > 7 && (
            <input
              autoFocus
              value={search}
              onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Filter options…"
              className="mb-1.5 h-8 w-full rounded-lg border border-white/15 bg-slate-950/80 px-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          )}
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === selected.value}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex min-h-9 w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition font-medium ${
                  option.value === selected.value
                    ? "bg-cyan-400/20 text-cyan-200 font-bold"
                    : index === activeIndex
                    ? "bg-white/[0.12] text-white"
                    : "text-slate-200 hover:bg-white/[0.08] hover:text-white"
                } disabled:opacity-40`}
              >
                {option.label}
              </button>
            ))}
            {!filtered.length && (
              <div className="px-2.5 py-3 text-xs text-slate-400">No options found.</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PremiumSelect;
