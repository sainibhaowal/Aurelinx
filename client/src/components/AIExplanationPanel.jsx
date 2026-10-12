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
  GripHorizontal,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { intelligenceAPI } from "../services/apiClient";
import { getExplanationProviderConfig } from "../services/explanationProviderConfig";
import { usePersistentState } from "../services/workspacePersistence";

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

const stripPrefilledReportHeader = (text = "") => {
  if (!text.startsWith("# ")) return text;
  const divider = text.indexOf("\n---\n\n");
  const header = divider < 0 ? "" : text.slice(0, divider);
  if (divider < 0 || !header.includes("**Scenario ID:**")) return text;
  return text.slice(divider + "\n---\n\n".length).trimStart();
};

/**
 * AIExplanationPanel — reusable collapsible panel that sends context to the LLM
 * and renders a structured Markdown explanation inline.
 *
 * Props:
 * - subtab: one of "skill-match" | "team-builder" | "attrition" | "ona" | "career-path"
 * - context: object containing the relevant intelligence data for the LLM to explain
 * - buttonText: label for the trigger button (default "Explain with AI")
 * - disabled: if true, the button is greyed out (e.g. no employee selected yet)
 */
export default function AIExplanationPanel({
  subtab,
  context,
  resultKey = null,
  buttonText = "Explain with AI",
  disabled = false,
}) {
  const [open, setOpen] = usePersistentState(
    `ai-explanation-open:${subtab}`,
    false,
  );
  // Window size is explicit and user-controlled: half, full, or a dragged
  // custom height. Changing size never refetches — only Explain/Regenerate do.
  const [sizeMode, setSizeMode] = usePersistentState(
    `ai-explanation-size:${subtab}`,
    "half",
  );
  const [customHeight, setCustomHeight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const bodyRef = useRef(null);
  const dragStateRef = useRef(null);
  const [savedExplanation, setSavedExplanation] = usePersistentState(
    `ai-explanation:${subtab}`,
    { resultKey: null, text: "", complete: false },
  );
  const savedTextForResult =
    savedExplanation?.resultKey === resultKey
      ? stripPrefilledReportHeader(savedExplanation?.text || "")
      : "";
  const [explanation, setExplanation] = useState(savedTextForResult);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const explanationRef = useRef(savedTextForResult);
  const explanationKeyRef = useRef(savedExplanation?.resultKey ?? null);

  useEffect(() => {
    if (savedExplanation?.resultKey !== resultKey) {
      explanationRef.current = "";
      explanationKeyRef.current = resultKey;
      setExplanation("");
      setSavedExplanation({ resultKey, text: "", complete: false });
      return;
    }
    const savedText = savedExplanation?.text || "";
    const normalizedText = stripPrefilledReportHeader(savedText);
    explanationRef.current = normalizedText;
    explanationKeyRef.current = savedExplanation?.resultKey ?? null;
    setExplanation(normalizedText);
    if (normalizedText !== savedText) {
      setSavedExplanation((previous) => ({
        ...previous,
        text: normalizedText,
        complete: false,
      }));
    }
  }, [
    resultKey,
    savedExplanation?.resultKey,
    savedExplanation?.text,
    setSavedExplanation,
  ]);

  useEffect(() => {
    if (!explanation) return undefined;
    const timer = window.setTimeout(() => {
      setSavedExplanation((previous) => ({
        resultKey: explanationKeyRef.current,
        text: explanationRef.current,
        complete: previous?.complete || false,
      }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [explanation, setSavedExplanation]);

  const fetchExplanation = useCallback(
    async (ctx, resultKey = null) => {
      if (!ctx || (typeof ctx === "object" && Object.keys(ctx).length === 0))
        return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setOpen(true);
      setCustomHeight(null);
      setLoading(true);
      setError("");
      setStreamStatus("");
      setStreamStatus("Starting your explanation…");
      explanationRef.current = "";
      explanationKeyRef.current = resultKey;
      setExplanation("");
      setSavedExplanation({
        resultKey,
        text: "",
        complete: false,
      });
      let receivedText = false;
      try {
        const { provider, key, baseUrl, model } =
          getExplanationProviderConfig();
        setProviderName(provider || "lmstudio");
        await intelligenceAPI.explainStream(
          subtab,
          ctx,
          (token) => {
            if (!controller.signal.aborted && token) {
              receivedText = true;
              setStreamStatus("");
              const nextText = `${explanationRef.current}${token}`;
              explanationRef.current = nextText;
              setExplanation(nextText);
            }
          },
          provider,
          key,
          baseUrl,
          model,
          controller.signal,
          false,
          setStreamStatus,
        );
        if (!receivedText && !controller.signal.aborted) {
          setError("The model finished without returning explanation text.");
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const baseMessage = err?.message || "Failed to get AI explanation.";
          const providerHint =
            providerName || getExplanationProviderConfig().provider;
          setError(
            `${baseMessage} (provider: ${providerHint || "lmstudio"} — check that the model server or API key is configured and reachable, then retry.)`,
          );
        }
      } finally {
        setStreamStatus("");
        if (controllerRef.current === controller) {
          setSavedExplanation({
            resultKey,
            text: explanationRef.current,
            complete: !controller.signal.aborted && receivedText,
          });
        }
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [subtab, setSavedExplanation],
  );

  const hasCompleteExplanation =
    Boolean(savedExplanation?.complete) &&
    savedExplanation?.resultKey === resultKey &&
    Boolean(savedExplanation?.text);

  // The main button never refetches silently: it generates only when there is
  // no finished explanation for this exact result; otherwise it just opens.
  // While streaming it acts as Stop. Regenerate always starts a fresh run.
  const handleMainClick = useCallback(() => {
    if (disabled) return;
    if (loading) {
      controllerRef.current?.abort();
      return;
    }
    if (hasCompleteExplanation) {
      setOpen(true);
      return;
    }
    fetchExplanation(context, resultKey);
  }, [
    disabled,
    loading,
    hasCompleteExplanation,
    fetchExplanation,
    context,
    resultKey,
  ]);

  const handleStopAndClose = useCallback(() => {
    controllerRef.current?.abort();
    setOpen(false);
  }, []);

  const applySize = useCallback(
    (mode) => {
      setSizeMode(mode);
      setCustomHeight(null);
      setOpen(true);
    },
    [setSizeMode],
  );

  const onGripPointerDown = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const el = event.currentTarget;
    el.setPointerCapture?.(event.pointerId);
    dragStateRef.current = {
      startY: event.clientY,
      startHeight: bodyRef.current?.offsetHeight || 320,
    };
  }, []);

  const onGripPointerMove = useCallback(
    (event) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const next = Math.min(
        Math.max(drag.startHeight + (drag.startY - event.clientY), 160),
        Math.round(window.innerHeight * 0.85),
      );
      setSizeMode("custom");
      setCustomHeight(next);
    },
    [setSizeMode],
  );

  const onGripPointerUp = useCallback((event) => {
    dragStateRef.current = null;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
  }, []);

  const bodyMaxHeightClass =
    sizeMode === "full" ? "max-h-[78dvh]" : "max-h-[45dvh]";

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/15 bg-slate-950/60 overflow-hidden">
      {/* Header: explicit buttons — Generate/Stop, Regenerate, Half, Full, Minimize, Close.
          Opening, sizing, or minimizing never triggers a new generation. */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleMainClick}
            disabled={disabled && !loading}
            title={
              loading
                ? "Stop generating"
                : hasCompleteExplanation
                  ? "Open the saved explanation"
                  : "Generate the explanation"
            }
            className={`flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-xs font-bold uppercase tracking-wider transition cursor-pointer select-none ${
              disabled && !loading
                ? "text-slate-600 cursor-not-allowed"
                : "text-cyan-300 hover:text-cyan-200 hover:bg-cyan-300/5"
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Sparkles size={14} className="shrink-0" />
            )}
            <span className="truncate">{loading ? "Stop" : buttonText}</span>
            {!open && !loading && (
              <ChevronDown size={14} className="ml-1 shrink-0" />
            )}
          </button>
          {hasCompleteExplanation && !loading && (
            <button
              type="button"
              onClick={() => fetchExplanation(context, resultKey)}
              disabled={disabled}
              title="Generate a fresh explanation"
              aria-label="Regenerate explanation"
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => applySize("half")}
            title="Half-height window"
            aria-label="Half-height explanation window"
            className={`rounded-lg p-1.5 transition cursor-pointer ${sizeMode === "half" && open ? "bg-cyan-300/10 text-cyan-300" : "text-slate-500 hover:bg-white/5 hover:text-cyan-300"}`}
          >
            <Minimize2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => applySize("full")}
            title="Full-height window"
            aria-label="Full-height explanation window"
            className={`rounded-lg p-1.5 transition cursor-pointer ${sizeMode === "full" && open ? "bg-cyan-300/10 text-cyan-300" : "text-slate-500 hover:bg-white/5 hover:text-cyan-300"}`}
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Minimize to the bar"
            aria-label="Minimize explanation"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300 cursor-pointer"
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            onClick={handleStopAndClose}
            title="Stop and close"
            aria-label="Stop and close explanation"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Collapsible panel body */}
      {open && (
        <>
          {/* Drag adjuster: hold and pull up/down to size the window yourself */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Drag to resize the explanation window"
            title="Drag up or down to resize"
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={onGripPointerUp}
            onPointerCancel={onGripPointerUp}
            className="flex cursor-ns-resize items-center justify-center gap-2 border-b border-white/5 bg-white/[0.02] py-1 text-slate-600 transition select-none hover:bg-white/[0.05] hover:text-slate-400"
            style={{ touchAction: "none" }}
          >
            <GripHorizontal size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              Drag to resize
            </span>
          </div>
          <div
            ref={bodyRef}
            className={`border-t border-white/5 px-4 py-3 overflow-y-auto custom-scrollbar ${sizeMode === "custom" ? "" : bodyMaxHeightClass}`}
            style={
              sizeMode === "custom" && customHeight
                ? { maxHeight: customHeight }
                : undefined
            }
          >
            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/20 rounded-lg p-3 mb-2 border border-rose-500/20">
                {error}
              </div>
            )}
            {loading && !explanation && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <Loader2 size={14} className="animate-spin" />
                <span>
                  {streamStatus || "Waiting for the model’s first answer text…"}
                </span>
              </div>
            )}
            {loading && explanation && (
              <div className="flex items-center gap-2 text-xs text-cyan-400/60 mb-2">
                <Loader2 size={12} className="animate-spin" />
                <span>{streamStatus || "Writing your explanation…"}</span>
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
            {(explanation || error) && !loading && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                {(sizeMode === "full" || sizeMode === "custom") && (
                  <button
                    type="button"
                    onClick={() => applySize("half")}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Show less
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  Close explanation
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
