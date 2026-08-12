"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";
import { intelligenceAPI } from "../services/apiClient";

const MarkdownRenderer = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="text-lg font-black text-cyan-300 mt-4 mb-2 border-b border-cyan-500/20 pb-1 uppercase tracking-wider">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-base font-extrabold text-cyan-400 mt-3 mb-1.5 border-l-2 border-cyan-400/50 pl-2">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-bold text-cyan-300/80 mt-2.5 mb-1">
          {children}
        </h3>
      ),
      p: ({ children }) => (
        <p className="text-sm text-slate-200 leading-relaxed my-1.5">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold text-cyan-200">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic text-slate-300">{children}</em>
      ),
      ul: ({ children }) => (
        <ul className="my-2 space-y-1 pl-4 list-disc marker:text-cyan-500">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-cyan-500">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="text-sm text-slate-200 leading-relaxed">
          {children}
        </li>
      ),
      table: ({ children }) => (
        <div className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/20 shadow-lg shadow-black/30">
          <table className="min-w-full text-xs border-collapse table-auto">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-cyan-950/60 border-b border-cyan-500/20">
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-white/5">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="hover:bg-white/[0.02] transition-colors duration-150">
          {children}
        </tr>
      ),
      th: ({ children, style }) => (
        <th
          className="px-3 py-2 text-left font-bold uppercase tracking-wider text-cyan-400 text-[10px]"
          style={style}
        >
          {children}
        </th>
      ),
      td: ({ children, style }) => (
        <td
          className="px-3 py-2 text-slate-200 text-xs break-words"
          style={style}
        >
          {children}
        </td>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

const getProviderConfig = () => {
  if (typeof window === "undefined") return { provider: "lmstudio", key: null, baseUrl: null, model: null };
  try {
    const raw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
    if (raw) {
      const cfg = JSON.parse(raw);
      return {
        provider: cfg.activeProvider || "lmstudio",
        key: cfg.providers?.[cfg.activeProvider]?.key || null,
        baseUrl: cfg.providers?.[cfg.activeProvider]?.endpoint || cfg.providers?.[cfg.activeProvider]?.base_url || null,
        model: cfg.providers?.[cfg.activeProvider]?.selectedModel || null,
      };
    }
  } catch {}
  return { provider: "lmstudio", key: null, baseUrl: null, model: null };
};

/**
 * AIExplanationPanel — reusable collapsible panel that sends context to the LLM
 * and renders a structured Markdown explanation inline.
 *
 * Props:
 * - subtab: one of "skill-match" | "team-builder" | "attrition" | "ona" | "career-path"
 * - context: object containing the relevant intelligence data for the LLM to explain
 * - buttonText: label for the trigger button (default "Explain with AI")
 * - autoRefresh: if true, re-fetches explanation when `context` changes (debounced 2s)
 * - disabled: if true, the button is greyed out (e.g. no employee selected yet)
 */
export default function AIExplanationPanel({
  subtab,
  context,
  buttonText = "Explain with AI",
  autoRefresh = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const debounceRef = useRef(null);
  const lastContextRef = useRef(null);

  const fetchExplanation = useCallback(
    async (ctx) => {
      if (!ctx || (typeof ctx === "object" && Object.keys(ctx).length === 0)) return;
      setLoading(true);
      setError("");
      try {
        const { provider, key, baseUrl, model } = getProviderConfig();
        const res = await intelligenceAPI.explain(subtab, ctx, provider, key, baseUrl, model);
        setExplanation(res.explanation || "No explanation returned.");
        setHasFetched(true);
      } catch (err) {
        setError(err?.message || "Failed to get AI explanation.");
      } finally {
        setLoading(false);
      }
    },
    [subtab]
  );

  const handleManualClick = () => {
    if (disabled) return;
    const wasOpen = open;
    setOpen(!wasOpen);
    if (!wasOpen && !hasFetched) {
      fetchExplanation(context);
    }
  };

  // Auto-refresh: debounced re-fetch when context changes (e.g. slider moved)
  useEffect(() => {
    if (!autoRefresh || !open || !context) return;
    const ctxStr = JSON.stringify(context);
    if (ctxStr === lastContextRef.current) return;
    lastContextRef.current = ctxStr;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchExplanation(context);
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoRefresh, open, context, fetchExplanation]);

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/15 bg-slate-950/60 overflow-hidden">
      {/* Header / trigger button */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={handleManualClick}
          disabled={disabled}
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer select-none ${
            disabled
              ? "text-slate-600 cursor-not-allowed"
              : "text-cyan-300 hover:text-cyan-200"
          }`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {buttonText}
          {open && !loading && <ChevronUp size={14} className="ml-1" />}
          {!open && !loading && disabled && <ChevronDown size={14} className="ml-1 opacity-40" />}
        </button>
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Collapsible panel body */}
      {open && (
        <div className="border-t border-white/5 px-4 py-3 max-h-[420px] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/20 rounded-lg p-3 mb-2 border border-rose-500/20">
              {error}
            </div>
          )}
          {loading && !explanation && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
              <Loader2 size={14} className="animate-spin" />
              <span>AI is analyzing the data…</span>
            </div>
          )}
          {loading && explanation && (
            <div className="flex items-center gap-2 text-xs text-cyan-400/60 mb-2">
              <Loader2 size={12} className="animate-spin" />
              <span>Updating…</span>
            </div>
          )}
          {explanation && (
            <div className="text-sm">
              <MarkdownRenderer>{explanation}</MarkdownRenderer>
            </div>
          )}
          {!loading && !explanation && !error && (
            <div className="text-xs text-slate-500 py-4">No explanation available.</div>
          )}
        </div>
      )}
    </div>
  );
}
