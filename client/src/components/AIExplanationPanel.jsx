// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { intelligenceAPI } from "../services/apiClient";
import { getExplanationProviderConfig } from "../services/explanationProviderConfig";

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
        <li className="text-sm text-slate-200 leading-relaxed">{children}</li>
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

/**
 * AIExplanationPanel — reusable collapsible panel that sends context to the LLM
 * and renders a structured Markdown explanation inline.
 *
 * Props:
 * - subtab: one of "skill-match" | "team-builder" | "attrition" | "ona" | "career-path"
 * - context: object containing the relevant intelligence data for the LLM to explain
 * - buttonText: label for the trigger button (default "Explain with AI")
 * - autoRun: generate a new streamed explanation when a completed result key changes
 * - autoRunKey: changes only when the current result has materially changed
 * - disabled: if true, the button is greyed out (e.g. no employee selected yet)
 */
export default function AIExplanationPanel({
  subtab,
  context,
  buttonText = "Explain with AI",
  autoRun = false,
  autoRunKey = null,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const contextRef = useRef(context);
  const lastAutoRunRef = useRef(null);
  contextRef.current = context;

  const fetchExplanation = useCallback(
    async (ctx) => {
      if (!ctx || (typeof ctx === "object" && Object.keys(ctx).length === 0))
        return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setOpen(true);
      setExpanded(false);
      setLoading(true);
      setError("");
      setExplanation("");
      let receivedText = false;
      try {
        const { provider, key, baseUrl, model } =
          getExplanationProviderConfig();
        await intelligenceAPI.explainStream(
          subtab,
          ctx,
          (token) => {
            if (!controller.signal.aborted && token) {
              receivedText = true;
              setExplanation((previous) => previous + token);
            }
          },
          provider,
          key,
          baseUrl,
          model,
          controller.signal,
        );
        if (!receivedText && !controller.signal.aborted) {
          setError("The model finished without returning explanation text.");
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err?.message || "Failed to get AI explanation.");
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [subtab],
  );

  useEffect(() => {
    if (!autoRun) return undefined;
    if (disabled || autoRunKey == null) {
      controllerRef.current?.abort();
      return undefined;
    }
    const key =
      typeof autoRunKey === "string" ? autoRunKey : JSON.stringify(autoRunKey);
    if (key === lastAutoRunRef.current) return undefined;
    lastAutoRunRef.current = key;
    controllerRef.current?.abort();
    const timer = setTimeout(() => {
      fetchExplanation(contextRef.current);
    }, 250);
    return () => {
      clearTimeout(timer);
    };
  }, [autoRun, autoRunKey, disabled, fetchExplanation]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/15 bg-slate-950/60 overflow-hidden">
      {/* Header / trigger button */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => fetchExplanation(context)}
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
          {!open && <ChevronDown size={14} className="ml-1" />}
        </button>
        {open && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={
                expanded ? "Collapse explanation" : "Expand explanation"
              }
              className="text-slate-500 hover:text-cyan-300 transition"
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse AI explanation"
              className="text-slate-500 hover:text-slate-300 transition"
            >
              <ChevronUp size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Collapsible panel body */}
      {open && (
        <div
          className={`border-t border-white/5 px-4 py-3 overflow-y-auto custom-scrollbar ${expanded ? "max-h-[75vh]" : "max-h-[420px]"}`}
        >
          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/20 rounded-lg p-3 mb-2 border border-rose-500/20">
              {error}
            </div>
          )}
          {loading && !explanation && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
              <Loader2 size={14} className="animate-spin" />
              <span>Analyzing this result and streaming the explanation…</span>
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
            <div className="text-xs text-slate-500 py-4">
              Choose “Explain with AI” to generate an explanation for this
              result.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
