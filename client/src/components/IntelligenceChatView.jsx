import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Plus,
  Send,
  Trash2,
  Pencil,
  Paperclip,
  Eraser,
  X,
  Square,
  PanelRightClose,
  PanelRightOpen,
  Info,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import { chatAPI } from "../services/apiClient";

// ── Premium Markdown renderer — full GFM: tables, code, blockquotes, lists, task lists, images ──
const MarkdownRenderer = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // ── Headings (H1–H6) ──
      h1: ({ children }) => (
        <h1 className="text-xl font-black text-cyan-300 mt-5 mb-2 border-b border-cyan-500/20 pb-1">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-lg font-extrabold text-cyan-400 mt-4 mb-2">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-base font-bold text-cyan-300/80 mt-3 mb-1.5">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="text-sm font-bold text-slate-300 mt-2 mb-1">
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className="text-xs font-bold text-slate-400 mt-2 mb-1 uppercase tracking-wider">
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className="text-xs font-semibold text-slate-500 mt-1 mb-0.5 uppercase tracking-wider">
          {children}
        </h6>
      ),

      // ── Paragraph ──
      p: ({ children }) => (
        <p className="text-sm text-slate-200 leading-relaxed my-1.5">
          {children}
        </p>
      ),

      // ── Bold, Italic, Strikethrough ──
      strong: ({ children }) => (
        <strong className="font-bold text-cyan-100">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic text-slate-300">{children}</em>
      ),
      del: ({ children }) => (
        <del className="line-through text-slate-500">{children}</del>
      ),

      // ── Code (inline and block) — react-markdown v10 uses node.position to differentiate ──
      code: ({ node, className, children, ...props }) => {
        // If the parent is a <pre>, this is a fenced code block — render as block code
        const isBlock =
          node?.position?.start?.line !== node?.position?.end?.line ||
          (className && className.startsWith("language-"));
        if (isBlock) {
          const lang = className ? className.replace("language-", "") : "";
          return (
            <code
              className="block font-mono text-xs text-cyan-100 leading-relaxed"
              data-lang={lang}
              {...props}
            >
              {children}
            </code>
          );
        }
        // Inline code
        return (
          <code
            className="px-1.5 py-0.5 rounded-md bg-slate-950 border border-cyan-900/40 text-cyan-300 font-mono text-xs"
            {...props}
          >
            {children}
          </code>
        );
      },

      // ── Fenced Code Block container ──
      pre: ({ children }) => (
        <pre className="my-3 p-4 rounded-xl bg-[#050d18] border border-cyan-900/30 overflow-x-auto font-mono text-xs whitespace-pre shadow-inner shadow-black/40">
          {children}
        </pre>
      ),

      // ── Blockquote ──
      blockquote: ({ children }) => (
        <blockquote className="my-3 pl-3 border-l-2 border-cyan-500/50 bg-cyan-500/5 rounded-r-lg py-2 pr-3 text-slate-300 text-sm">
          {children}
        </blockquote>
      ),

      // ── Horizontal Rule ──
      hr: () => (
        <hr className="my-5 border-0 h-px bg-gradient-to-r from-transparent via-cyan-700/30 to-transparent" />
      ),

      // ── Unordered List ──
      ul: ({ className, children }) => {
        // GFM task lists get a special class from remark-gfm
        const isTaskList = className?.includes("contains-task-list");
        return (
          <ul
            className={`my-2 space-y-1 ${isTaskList ? "pl-0 list-none" : "pl-1"}`}
          >
            {children}
          </ul>
        );
      },

      // ── Ordered List ──
      ol: ({ children, start }) => (
        <ol
          className="my-2 space-y-1 pl-5 list-decimal marker:text-cyan-600"
          start={start}
        >
          {children}
        </ol>
      ),

      // ── List Item (with task list checkbox support) ──
      li: ({ className, checked, children }) => {
        const isTask = className?.includes("task-list-item");
        if (isTask) {
          return (
            <li className="flex items-start gap-2 text-sm text-slate-200 leading-relaxed list-none">
              <span
                className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border inline-flex items-center justify-center text-[10px] ${
                  checked
                    ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300"
                    : "bg-slate-900 border-white/15 text-transparent"
                }`}
              >
                {checked ? "✓" : ""}
              </span>
              <span className={checked ? "line-through text-slate-500" : ""}>
                {children}
              </span>
            </li>
          );
        }
        return (
          <li className="flex gap-2 text-sm text-slate-200 leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-500/70 flex-shrink-0" />
            <span>{children}</span>
          </li>
        );
      },

      // ── GFM Task List Checkbox (prevent default input rendering) ──
      input: ({ type, checked }) => {
        if (type === "checkbox") return null; // handled by li above
        return <input type={type} checked={checked} readOnly />;
      },

      // ── Links ──
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline underline-offset-2 decoration-cyan-700/50 hover:text-cyan-300 hover:decoration-cyan-500 transition-colors"
        >
          {children}
        </a>
      ),

      // ── Images ──
      img: ({ src, alt }) => (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <img
            src={src}
            alt={alt || ""}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
          {alt && (
            <div className="px-3 py-1.5 text-xs text-slate-400 bg-black/30">
              {alt}
            </div>
          )}
        </div>
      ),

      // ── GFM Tables — premium glassmorphic dark styling ──
      table: ({ children }) => (
        <div className="my-4 overflow-x-auto rounded-xl border border-white/10 shadow-lg shadow-black/30 -mx-1">
          <table className="min-w-full text-sm border-collapse table-auto">
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
        <tr className="hover:bg-white/[0.03] transition-colors duration-150">
          {children}
        </tr>
      ),
      th: ({ children, style }) => (
        <th
          className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-cyan-400"
          style={style}
        >
          {children}
        </th>
      ),
      td: ({ children, style }) => (
        <td
          className="px-3 py-2 text-slate-200 text-sm break-words"
          style={style}
        >
          {children}
        </td>
      ),
      sup: ({ children }) => (
        <sup className="text-[10px] text-cyan-400 font-bold">{children}</sup>
      ),
      section: ({ children, ...props }) => (
        <section
          className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-400"
          {...props}
        >
          {children}
        </section>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

// ── Compact Markdown renderer with micro-typography (font-size 10px to 11px) and zero vertical spacing/margins for thinking panels ──
const CompactMarkdownRenderer = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="text-[11px] font-black text-cyan-300/90 my-0.5 p-0 border-b border-cyan-500/10 pb-0.5">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-[11px] font-extrabold text-cyan-400 my-0.5 p-0">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-[10.5px] font-bold text-cyan-300/80 my-0.5 p-0">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="text-[10.5px] font-bold text-slate-350 my-0.5 p-0">
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className="text-[10px] font-bold text-slate-400 my-0.5 p-0 uppercase tracking-wider">
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className="text-[10px] font-semibold text-slate-550 my-0.5 p-0 uppercase tracking-wider">
          {children}
        </h6>
      ),
      p: ({ children }) => (
        <p className="text-[10.5px] text-slate-300 leading-normal my-0.5 p-0">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold text-cyan-200/95">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic text-slate-400">{children}</em>
      ),
      del: ({ children }) => (
        <del className="line-through text-slate-600">{children}</del>
      ),
      code: ({ node, className, children, ...props }) => {
        const isBlock =
          node?.position?.start?.line !== node?.position?.end?.line ||
          (className && className.startsWith("language-"));
        if (isBlock) {
          const lang = className ? className.replace("language-", "") : "";
          return (
            <code
              className="block font-mono text-[10px] text-cyan-200/80 leading-tight my-0.5 p-0"
              data-lang={lang}
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code
            className="px-1 py-0 rounded bg-slate-950/80 border border-cyan-900/30 text-cyan-400 font-mono text-[10px]"
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }) => (
        <pre className="my-1 p-1 rounded bg-black/45 border border-cyan-950/40 overflow-x-auto font-mono text-[10px] whitespace-pre shadow-inner">
          {children}
        </pre>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-0.5 pl-2 border-l border-cyan-500/30 bg-cyan-500/2 rounded-r py-0.5 pr-2 text-slate-400 text-[10.5px]">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-1 border-0 h-px bg-cyan-900/10" />,
      ul: ({ className, children }) => {
        const isTaskList = className?.includes("contains-task-list");
        return (
          <ul
            className={`my-0.5 p-0 list-none space-y-0 ${isTaskList ? "" : "pl-0.5"}`}
          >
            {children}
          </ul>
        );
      },
      ol: ({ children, start }) => (
        <ol
          className="my-0.5 p-0 space-y-0 pl-3 list-decimal marker:text-cyan-800"
          start={start}
        >
          {children}
        </ol>
      ),
      li: ({ className, checked, children }) => {
        const isTask = className?.includes("task-list-item");
        if (isTask) {
          return (
            <li className="flex items-start gap-1 text-[10.5px] text-slate-300 leading-tight list-none my-0.5 p-0">
              <span
                className={`mt-0.5 flex-shrink-0 h-2.5 w-2.5 rounded border inline-flex items-center justify-center text-[7px] ${checked ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-slate-950 border-white/5 text-transparent"}`}
              >
                {checked ? "✓" : ""}
              </span>
              <span className={checked ? "line-through text-slate-550" : ""}>
                {children}
              </span>
            </li>
          );
        }
        return (
          <li className="flex gap-1 text-[10.5px] text-slate-300 leading-tight my-0.5 p-0">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-cyan-600/40 flex-shrink-0" />
            <span>{children}</span>
          </li>
        );
      },
      input: ({ type, checked }) => {
        if (type === "checkbox") return null;
        return <input type={type} checked={checked} readOnly />;
      },
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400/90 underline decoration-cyan-800/40 hover:text-cyan-300 text-[10.5px]"
        >
          {children}
        </a>
      ),
      img: ({ src, alt }) => (
        <div className="my-0.5 rounded border border-white/5 overflow-hidden max-w-xs">
          <img
            src={src}
            alt={alt || ""}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      ),
      table: ({ children }) => (
        <div className="my-1 overflow-x-auto rounded border border-white/5">
          <table className="min-w-full text-[10px] border-collapse table-auto">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-cyan-950/40 border-b border-cyan-500/10">
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-white/5">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="hover:bg-white/[0.01] transition-colors">{children}</tr>
      ),
      th: ({ children, style }) => (
        <th
          className="px-1 py-0.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-cyan-400/80"
          style={style}
        >
          {children}
        </th>
      ),
      td: ({ children, style }) => (
        <td
          className="px-1 py-0.5 text-slate-350 text-[10px] break-words"
          style={style}
        >
          {children}
        </td>
      ),
      sup: ({ children }) => (
        <sup className="text-[8px] text-cyan-500/80 font-bold">{children}</sup>
      ),
      section: ({ children, ...props }) => (
        <section
          className="my-0.5 pt-0.5 border-t border-white/5 text-[8.5px] text-slate-500"
          {...props}
        >
          {children}
        </section>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

// Provider reasoning is represented by model_reasoning workflow events. The
// private reasoning text itself is never rendered as an assistant answer.
const ThinkingMessageContent = ({ text, children, isBusy }) => {
  const rawText = useMemo(() => {
    if (text) return text;
    if (typeof children === "string") return children;
    if (Array.isArray(children)) return children.join("");
    return "";
  }, [text, children]);

  const parsed = useMemo(() => {
    if (!rawText) {
      return { thinking: "", content: "" };
    }
    const thinkStart = rawText.indexOf("<think>");
    if (thinkStart === -1) {
      return { thinking: "", content: rawText };
    }
    const thinkEnd = rawText.indexOf("</think>");
    if (thinkEnd === -1) {
      return {
        thinking: rawText.slice(thinkStart + 7),
        content: "",
      };
    }
    return {
      thinking: rawText.slice(thinkStart + 7, thinkEnd),
      content: rawText.slice(thinkEnd + 8),
    };
  }, [rawText]);

  // A streamed <think> block is telemetry, not answer content. The live
  // timeline shows whether the provider entered/exited reasoning, so do not
  // create a second fake reasoning card here.
  const visibleContent = parsed.thinking ? parsed.content : rawText;
  if (!visibleContent || (isBusy && parsed.thinking && !parsed.content)) return null;

  return (
    <div className="mt-2 min-w-0 w-full overflow-hidden pt-2">
      <MarkdownRenderer>{visibleContent}</MarkdownRenderer>
    </div>
  );
};

const naturalStepDetail = (step) => {
  const summary = step.result_summary;
  if (step.type === "model_reasoning") {
    const streamed = summary?.characters ? ` · ${summary.characters} reasoning chars` : "";
    return step.status === "running" ? `Thinking${streamed}` : `Reasoning complete${streamed}`;
  }
  if (step.type === "agent_started") return "Working on your request";
  if (step.type === "agent_failed") {
    return `Provider turn failed${summary?.reason ? `: ${summary.reason}` : ""}`;
  }
  if (step.type === "tool_call" || step.type === "tool_result" || step.type === "tool_execution") {
    const labels = {
      "employee.search": "employee records",
      "candidate.search": "candidate records",
      "database.overview": "database totals",
      "dashboard.snapshot": "workforce analytics",
      "workspace.snapshot": "workspace records",
      "document.csv_ingest": "the attached CSV",
      "data.mutate": "data modification",
      "data.verify": "data verification",
    };
    const toolName = step.tool || step.tool_name || "unknown";
    const target = labels[toolName] || toolName.replaceAll(".", " ");
    if (step.status === "running") {
      return `Executing ${target}`;
    }
    if (step.status === "completed") {
      if (summary?.query) return `Searched ${target} for "${summary.query}"`;
      if (summary?.count != null) return `Verified ${summary.count} record(s) in ${target}`;
      return step.display_message || `${target} verified successfully`;
    }
    if (step.status === "blocked") {
      return `Step stopped by policy guardrail`;
    }
  }
  if (step.type === "final_response_started") return "Writing answer";
  if (step.type === "final_response_completed") return "Final answer generated";
  return step.display_message || "Workflow activity recorded.";
};

const workflowTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const toolNameForStep = (step) => step?.tool || step?.tool_name || "unknown";

const isMutationTool = (toolName = "") =>
  toolName.startsWith("data.") || toolName.includes("mutat");

const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  if (milliseconds < 1000) return `${Math.max(0, Math.round(milliseconds))}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
};

const displayPayload = (payload) => {
  if (payload == null) return "No payload recorded";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const firstObject = (...values) =>
  values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || null;

const RenderToolResultCard = ({ toolName, result, inputArgs, status }) => {
  if (!result) return null;

  // 1. Employee Search micro cards
  if (toolName === "employee.search" && Array.isArray(result.result || result.employees)) {
    const items = result.result || result.employees;
    return (
      <div className="mt-2 space-y-1.5">
        <div className="text-[10px] font-medium text-slate-400">Found {items.length} employee record(s):</div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {items.slice(0, 4).map((emp, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-cyan-500/20 bg-slate-900/80 p-2 text-[11px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-300">
                {(emp.first_name?.[0] || emp.name?.[0] || "E").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-200">{emp.first_name} {emp.last_name}</div>
                <div className="mt-0.5 flex flex-wrap gap-1 text-[9px]">
                  <span className="rounded bg-cyan-400/10 px-1 text-cyan-300">{emp.role || emp.title || "Employee"}</span>
                  <span className="rounded bg-white/[0.06] px-1 text-slate-400">{emp.department || "Staff"}</span>
                </div>
                <div className="truncate text-[10px] text-slate-500">{emp.email || "Verified"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Candidate Search micro cards
  if (toolName === "candidate.search" && Array.isArray(result.result || result.candidates)) {
    const items = result.result || result.candidates;
    return (
      <div className="mt-2 space-y-1.5">
        <div className="text-[10px] font-medium text-slate-400">Found {items.length} candidate record(s):</div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {items.slice(0, 4).map((cand, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-slate-900/80 p-2 text-[11px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-300">
                {(cand.first_name?.[0] || cand.name?.[0] || "C").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-200">{cand.first_name} {cand.last_name}</div>
                <div className="truncate text-[10px] text-slate-400">{cand.target_role || "Candidate"} · {cand.status || "Verified"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Workforce / Dashboard Snapshot visual metrics
  if (toolName === "dashboard.snapshot" && typeof result === "object") {
    const depts = result.departments || result.result?.departments;
    if (depts) {
      const entries = Object.entries(depts).slice(0, 6);
      const maxCount = Math.max(...entries.map(([, count]) => Number(count) || 0), 1);
      return (
        <div className="mt-2 rounded-md border border-cyan-500/20 bg-slate-900/80 p-2 text-[11px]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Department Headcount Distribution</div>
          <div className="space-y-1">
            {entries.map(([dept, count], idx) => (
              <div key={idx} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-[10px]">
                <span className="truncate text-slate-300">{dept}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
                    style={{ width: `${Math.max(4, ((Number(count) || 0) / maxCount) * 100)}%` }}
                  />
                </span>
                <span className="font-mono text-cyan-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // 4. Data Mutation Diff card
  if (toolName === "data.mutate") {
    const before = firstObject(result.before, result.previous, result.result?.before);
    const after = firstObject(result.after, result.updated, result.result?.after);
    const approvalSignature = result.approval_signature || result.approval_id || result.result?.approval_signature;
    const changedKeys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
      .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
    return (
      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <span>⚡ Admin Mutation Applied</span>
          </div>
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
            status === "completed" && approvalSignature
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }`}>
            {status === "completed" && approvalSignature ? "✓ Approval signature verified" : "⚠ Approval gate"}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-300">
          Query: {inputArgs?.query || inputArgs?.arguments?.query || "Database record update"}
        </div>
        {changedKeys.length > 0 && (
          <div className="mt-2 space-y-1 rounded border border-white/10 bg-slate-950/35 p-1.5">
            {changedKeys.slice(0, 5).map((key) => (
              <div key={key} className="grid grid-cols-[5rem_1fr_auto_1fr] items-center gap-1 text-[10px]">
                <span className="truncate text-slate-500">{key}</span>
                <span className="truncate text-rose-300">{String(before?.[key] ?? "—")}</span>
                <span className="text-amber-300">→</span>
                <span className="truncate text-emerald-300">{String(after?.[key] ?? "—")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

const AgenticStepTracker = ({ steps = [], onApproval }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedAll, setExpandedAll] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const hasRunningStep = steps.some((step) => step.status === "running");

  useEffect(() => {
    if (!hasRunningStep) return undefined;
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [hasRunningStep]);

  const runningDuration = (step) => {
    const startedAt = step.started_at || step.created_at;
    const timestamp = startedAt ? new Date(startedAt).getTime() : NaN;
    return Number.isFinite(timestamp) ? Math.max(0, currentTime - timestamp) : 0;
  };

  const stepDuration = (step) =>
    step.status === "running"
      ? runningDuration(step)
      : Number(step.duration_ms || 0);

  // Merge each tool call and result into one stable execution card. Correlation
  // IDs are preferred; the per-tool queue is a safe fallback for older events.
  const mergedSteps = useMemo(() => {
    const visible = steps.filter((step) => {
      if (step.tool === "conversation.context") return false;
      if (["workflow_started", "agent_started", "validation_completed", "workflow_completed", "final_response_completed"].includes(step.type)) return false;
      if (step.type === "workflow_failed" && steps.some((item) => item.type === "agent_failed")) return false;
      return true;
    });

    const pendingByKey = new Map();
    const pendingByTool = new Map();
    const result = [];

    const correlationKey = (step) => {
      const id = step.tool_call_id || step.call_id || step.parent_event_id || step.sequence;
      return id == null ? null : `${toolNameForStep(step)}:${id}`;
    };

    visible.forEach((step) => {
      if (step.type === "tool_call") {
        const mergedItem = {
          ...step,
          type: "tool_execution",
          status: "running",
          safe_input: step.safe_input,
          result: null,
        };
        const key = correlationKey(step);
        if (key) pendingByKey.set(key, mergedItem);
        const tool = toolNameForStep(step);
        pendingByTool.set(tool, [...(pendingByTool.get(tool) || []), mergedItem]);
        result.push(mergedItem);
      } else if (step.type === "tool_result") {
        const tool = toolNameForStep(step);
        const key = correlationKey(step);
        const queue = pendingByTool.get(tool) || [];
        const matched = (key && pendingByKey.get(key)) || queue.find((item) => item.status === "running");
        if (matched) {
          matched.status = step.status || "completed";
          matched.result = step.result_summary;
          matched.output_metadata = step.output_metadata || step.metadata || step.result_summary?.metadata;
          matched.display_message = step.display_message || matched.display_message;
          matched.duration_ms = step.duration_ms || matched.duration_ms;
          pendingByTool.set(tool, queue.filter((item) => item !== matched));
        } else {
          result.push({
            ...step,
            type: "tool_execution",
            status: step.status || "completed",
            result: step.result_summary,
            output_metadata: step.output_metadata || step.metadata || step.result_summary?.metadata,
          });
        }
      } else {
        result.push(step);
      }
    });

    return result;
  }, [steps]);

  // Telemetry Calculations. Token throughput is only shown when the stream
  // provides token metadata; character-derived values are explicitly marked
  // as estimates rather than presenting invented precision.
  const telemetry = useMemo(() => {
    const totalDuration = steps.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0) || 120;
    const reasoningStep = steps.find((s) => s.type === "model_reasoning");
    const reasoningChars = reasoningStep?.result_summary?.characters || 0;
    const explicitTokens = steps.reduce(
      (acc, step) => acc + Number(step.tokens || step.token_count || step.result_summary?.tokens || 0),
      0,
    );
    const estimatedTokens = explicitTokens || (reasoningChars ? Math.round(reasoningChars / 4) : 0);
    const activeDuration = steps.reduce(
      (max, step) => Math.max(max, step.status === "running" ? runningDuration(step) : Number(step.duration_ms || 0)),
      totalDuration,
    );
    const throughput = estimatedTokens && activeDuration > 0
      ? `${(estimatedTokens / (activeDuration / 1000)).toFixed(1)}${explicitTokens ? "" : "~"}`
      : "—";
    const isRunning = steps.some((s) => s.status === "running");
    return {
      latency: `${totalDuration}ms`,
      throughput,
      tokensEstimated: !explicitTokens && Boolean(estimatedTokens),
      reasoningChars,
      reasoningDuration: reasoningStep ? stepDuration(reasoningStep) : 0,
      tokenCount: estimatedTokens,
      status: isRunning ? "Active IPC" : "Idle / Ready",
    };
  }, [steps, currentTime]);

  // Filter tabs logic
  const filteredSteps = useMemo(() => {
    if (filterTab === "queries") {
      return mergedSteps.filter((s) => s.type === "tool_execution" && !isMutationTool(toolNameForStep(s)));
    }
    if (filterTab === "mutations") {
      return mergedSteps.filter((s) => s.type === "tool_execution" && isMutationTool(toolNameForStep(s)));
    }
    if (filterTab === "reasoning") {
      return mergedSteps.filter((s) => s.type === "model_reasoning");
    }
    if (filterTab === "errors") {
      return mergedSteps.filter((s) => s.status === "failed" || s.status === "blocked" || String(s.type || "").endsWith("_failed"));
    }
    return mergedSteps;
  }, [mergedSteps, filterTab]);

  const filterCounts = useMemo(() => ({
    all: mergedSteps.length,
    queries: mergedSteps.filter((s) => s.type === "tool_execution" && !isMutationTool(toolNameForStep(s))).length,
    mutations: mergedSteps.filter((s) => s.type === "tool_execution" && isMutationTool(toolNameForStep(s))).length,
    reasoning: mergedSteps.filter((s) => s.type === "model_reasoning").length,
    errors: mergedSteps.filter((s) => s.status === "failed" || s.status === "blocked" || String(s.type || "").endsWith("_failed")).length,
  }), [mergedSteps]);

  return (
    <div className="flex flex-col gap-2 my-2">
      {/* 2. Enterprise Telemetry & Policy Header */}
      <div className="rounded-lg border border-cyan-500/20 bg-slate-950/70 p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            <span className="text-[11px] font-bold tracking-wider text-slate-200">
              AURELINX HARNESS RUNTIME
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-slate-400">⚡ <strong className="font-mono text-cyan-300">{telemetry.latency}</strong></span>
            <span className="text-slate-400">🚀 <strong className="font-mono text-cyan-300">{telemetry.throughput} tok/s</strong></span>
            <span className="text-slate-400">🛡️ <strong className="text-emerald-300">Deny-All Strict</strong></span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">
          <span className="uppercase tracking-wider text-slate-500">Active Runtime</span>
          <span className="font-mono text-cyan-300">Google Antigravity Go Binary · Local IPC</span>
          <span className="text-slate-600">{telemetry.status}</span>
        </div>

        {/* 5. Filter Chips */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {[
              { id: "all", label: `All Events (${filterCounts.all})` },
              { id: "queries", label: `Database Queries (${filterCounts.queries})` },
              { id: "mutations", label: `Mutations (${filterCounts.mutations})` },
              { id: "errors", label: `Errors (${filterCounts.errors})` },
              { id: "reasoning", label: `Reasoning (${filterCounts.reasoning})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                  filterTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setFilterTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-[9px] uppercase tracking-wider text-cyan-400/80 hover:text-cyan-300"
            onClick={() => setExpandedAll((current) => !current)}
          >
            {expandedAll ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-1.5 max-h-[32rem] overflow-y-auto pr-1">
        {filteredSteps.map((step, index) => {
          const id = step.event_id || `${step.type}-${index}`;
          const status = step.status || "running";
          const isError = status === "failed" || status === "blocked";
          const statusColor = status === "completed"
            ? "text-emerald-300"
            : isError
              ? "text-rose-300"
                : status === "waiting"
                  ? "text-amber-300"
                  : "text-cyan-300";
          const message = naturalStepDetail(step);
          const toolName = toolNameForStep(step);
          const isToolExecution = step.type === "tool_execution";
          const isExpanded = expandedAll || expandedId === `${id}:payload`;
          const isInputExpanded = expandedAll || expandedId === `${id}:input`;
          const isOutputExpanded = expandedAll || expandedId === `${id}:output`;
          const isThinkingExpanded = expandedAll || expandedId === `${id}:thinking`;
          const durationLabel = formatDuration(stepDuration(step));

          return (
            <div key={id} className="relative flex items-start gap-2.5 rounded-lg border border-white/5 bg-slate-900/40 p-2 text-left">
              <div className="relative z-10 mt-0.5 flex-shrink-0">
                <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold border ${
                  status === "completed" ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" :
                  isError ? "bg-rose-500/20 border-rose-400/60 text-rose-300" :
                  status === "waiting" ? "bg-amber-500/20 border-amber-400/60 text-amber-300" :
                  "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 animate-pulse"
                }`}>
                  {status === "completed" ? "✓" : isError ? "!" : status === "waiting" ? "…" : "●"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`text-xs font-medium leading-relaxed ${statusColor}`}>
                      {status === "completed" ? "✓ " : status === "running" ? "● " : ""}{message}
                    </span>
                    {isToolExecution && (
                      <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                        {status === "running" ? `${durationLabel} elapsed` : durationLabel}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[9px] font-mono text-slate-500">
                    {workflowTime(step.created_at)}
                  </span>
                </div>

                {/* 4. Live Chain of Thought Telemetry Drawer */}
                {step.type === "model_reasoning" && (
                  <div className="mt-1.5 rounded border border-cyan-500/20 bg-slate-950/60 p-2 text-[10px] text-slate-300">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between font-mono text-[9px] text-cyan-400"
                      onClick={() => setExpandedId((current) => current === `${id}:thinking` ? null : `${id}:thinking`)}
                    >
                      <span>🧠 CHAIN OF THOUGHT TELEMETRY {isThinkingExpanded ? "⌃" : "⌄"}</span>
                      <span>{step.result_summary?.characters || 0} chars · {formatDuration(stepDuration(step))}</span>
                    </button>
                    {isThinkingExpanded && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 sm:grid-cols-3">
                        <span className="rounded bg-white/[0.03] px-1.5 py-1">Characters <b className="text-cyan-300">{step.result_summary?.characters || 0}</b></span>
                        <span className="rounded bg-white/[0.03] px-1.5 py-1">Duration <b className="text-cyan-300">{formatDuration(stepDuration(step))}</b></span>
                        <span className="rounded bg-white/[0.03] px-1.5 py-1">Token estimate <b className="text-cyan-300">{Math.max(0, Math.round((step.result_summary?.characters || 0) / 4))}</b></span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Rich Visual Artifact Cards */}
                {step.type === "tool_execution" && (
                  <RenderToolResultCard
                    toolName={toolName}
                    result={step.result}
                    inputArgs={step.safe_input}
                    status={status}
                  />
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isToolExecution ? (
                    <>
                      <button
                        type="button"
                        className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${isInputExpanded ? "border-cyan-500/40 text-cyan-300" : "border-white/10 text-slate-500 hover:text-cyan-300"}`}
                        onClick={() => setExpandedId((current) => current === `${id}:input` ? null : `${id}:input`)}
                      >
                        {isInputExpanded ? "Hide input" : "Input parameters"}
                      </button>
                      <button
                        type="button"
                        className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${isOutputExpanded ? "border-emerald-500/40 text-emerald-300" : "border-white/10 text-slate-500 hover:text-emerald-300"}`}
                        onClick={() => setExpandedId((current) => current === `${id}:output` ? null : `${id}:output`)}
                      >
                        {isOutputExpanded ? "Hide output" : "Output metadata"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="text-[9px] uppercase tracking-wider text-slate-500 hover:text-cyan-300"
                      onClick={() => setExpandedId((current) => current === `${id}:payload` ? null : `${id}:payload`)}
                    >
                      {isExpanded ? "Hide payload" : "Show payload"}
                    </button>
                  )}
                  {step.duration_ms != null && <span className="text-[9px] font-mono text-slate-600">· {durationLabel}</span>}
                </div>

                {isToolExecution && isInputExpanded && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-cyan-500/15 bg-slate-950/90 p-2 text-left font-mono text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
                    {displayPayload(step.safe_input)}
                  </pre>
                )}

                {isToolExecution && isOutputExpanded && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-emerald-500/15 bg-slate-950/90 p-2 text-left font-mono text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
                    {displayPayload(step.output_metadata || step.result)}
                  </pre>
                )}

                {!isToolExecution && isExpanded && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-cyan-500/15 bg-slate-950/90 p-2 text-left font-mono text-[9px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
                    {displayPayload(step.result || step.safe_input || step)}
                  </pre>
                )}

                {step.type === "approval_required" && step.result_summary?.approval_id && onApproval && (
                  <div className="flex gap-2 mt-2">
                    <button type="button" className="px-2.5 py-1 rounded border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-500/10" onClick={() => onApproval("approve", step)}>
                      Approve exact action
                    </button>
                    <button type="button" className="px-2.5 py-1 rounded border border-rose-500/30 text-[10px] text-rose-300 hover:bg-rose-500/10" onClick={() => onApproval("reject", step)}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


const IntelligenceChatView = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [streamText, setStreamText] = useState("");
  const [streamPhase, setStreamPhase] = useState(null);
  const [agentSteps, setAgentSteps] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const abortRef = useRef(null);
  const messagesScrollRef = useRef(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );
  const workflowSummary = useMemo(() => {
    const events = messages.flatMap((message) => Array.isArray(message.workflow_events) ? message.workflow_events : []);
    const tools = new Set(events.map((event) => event.tool || event.tool_name).filter(Boolean));
    const approvals = events.filter((event) => ["approval_required", "approval_granted", "approval_rejected"].includes(event.type)).length;
    const errors = events.filter((event) => String(event.status || "").toLowerCase() === "failed" || String(event.type || "").includes("error")).length;
    const records = events.reduce((sum, event) => sum + Number(event.result_summary?.records_affected || event.result_summary?.count || 0), 0);
    return { tools: tools.size, approvals, errors, records };
  }, [messages]);

  const loadSessions = async () => {
    const data = await chatAPI.listSessions();
    setSessions(data);
    if (data.length) {
      if (!selectedSessionId || !data.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(data[0].id);
      }
    } else {
      setSelectedSessionId(null);
    }
  };

  const loadMessages = async (sessionId) => {
    if (!sessionId) return;
    const [msgData, attData] = await Promise.all([
      chatAPI.listMessages(sessionId),
      chatAPI.listAttachments(sessionId),
    ]);
    setMessages(msgData);
    setAttachments(attData);
  };

  useEffect(() => {
    loadSessions().catch(console.error);
  }, []);

  useEffect(() => {
    loadMessages(selectedSessionId).catch(console.error);
  }, [selectedSessionId]);

  const scrollToBottom = () => {
    const messagesContainer = messagesScrollRef.current;
    if (!messagesContainer) return;

    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText, busy]);

  const createSession = async () => {
    const created = await chatAPI.createSession("New Workflow Session");
    setSessions((prev) => [created, ...prev]);
    setSelectedSessionId(created.id);
  };

  const renameSession = async (sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    setRenameTarget(session);
    setRenameValue(session?.title || "");
  };

  const confirmRenameSession = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const updated = await chatAPI.renameSession(
      renameTarget.id,
      renameValue.trim(),
    );
    setSessions((prev) =>
      prev.map((s) => (s.id === renameTarget.id ? updated : s)),
    );
    setRenameTarget(null);
    setRenameValue("");
  };

  const deleteSession = async (sessionId) => {
    // 1. Optimistically update local React state instantly
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(remaining[0]?.id || null);
      setMessages([]);
    }

    // 2. Perform deletion on backend in the background
    try {
      await chatAPI.deleteSession(sessionId);
    } catch (error) {
      console.warn("Session deletion error on backend, syncing:", error);
      // Quietly reload sessions from backend on failure to ensure correct state
      const data = await chatAPI.listSessions();
      setSessions(data);
    }
  };

  const requestDeleteSession = (sessionId) => setDeleteTarget({ type: "single", id: sessionId });
  const confirmDeleteSession = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.type === "bulk") await bulkDelete();
    else await deleteSession(target.id);
  };

  const formatSessionTime = (value) => {
    if (!value) return "No activity yet";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "No activity yet" : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  };

  const clearMessages = async () => {
    if (!selectedSessionId) return;

    // 1. Optimistically clear messages and attachments on the UI instantly
    setMessages([]);
    setAttachments([]);
    setStreamText("");
    setStreamPhase("cleared");

    // 2. Perform clear in backend
    try {
      await chatAPI.clearSessionMessages(selectedSessionId);
      await loadSessions();
    } catch (error) {
      console.warn("Clear messages error on backend, reverting:", error);
      // Revert if clear fails
      await loadSessions();
      await loadMessages(selectedSessionId);
    }
  };

  const bulkDelete = async () => {
    if (!selectedSessions.length) return;

    const originalSessions = sessions;
    const originalSelected = selectedSessions;

    // 1. Optimistically update local React state instantly
    const remaining = sessions.filter((s) => !originalSelected.includes(s.id));
    setSessions(remaining);
    setSelectedSessions([]);
    if (originalSelected.includes(selectedSessionId)) {
      setSelectedSessionId(remaining[0]?.id || null);
      setMessages([]);
    }

    // 2. Perform bulk deletion on backend in the background
    try {
      await chatAPI.bulkDeleteSessions(originalSelected);
      // Silently reload to ensure sync
      const data = await chatAPI.listSessions();
      setSessions(data);
    } catch (error) {
      console.warn("Bulk session deletion error on backend, reverting:", error);
      // Revert on failure
      setSessions(originalSessions);
      setSelectedSessions(originalSelected);
    }
  };

  const uploadFile = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file || !selectedSessionId) return;
    await chatAPI.uploadAttachment(selectedSessionId, file);
    await loadMessages(selectedSessionId);
  };

  const removeAttachment = async (attachmentId) => {
    if (!selectedSessionId) return;
    await chatAPI.deleteAttachment(selectedSessionId, attachmentId);
    await loadMessages(selectedSessionId);
  };

  const resolveApproval = async (decision, event) => {
    const approvalId = event?.result_summary?.approval_id;
    if (!approvalId || !event?.run_id) return;
    try {
      const result = decision === "approve"
        ? await chatAPI.approveWorkflow(event.run_id, approvalId)
        : await chatAPI.rejectWorkflow(event.run_id, approvalId);
      setAgentSteps((previous) => [
        ...previous,
        {
          event_id: `approval-resolution-${Date.now()}`,
          run_id: event.run_id,
          type: decision === "approve" ? "approval_granted" : "approval_rejected",
          phase: "governance",
          status: decision === "approve" ? "completed" : "blocked",
          display_message: decision === "approve"
            ? "Admin approval granted and action executed"
            : "Admin rejected the action; no mutation executed",
          result_summary: result?.result || result,
        },
      ]);
      if (selectedSessionId) await loadMessages(selectedSessionId);
    } catch (error) {
      console.error("Workflow approval failed", error);
      setAgentSteps((previous) => [
        ...previous,
        {
          event_id: `approval-error-${Date.now()}`,
          run_id: event.run_id,
          type: "approval_error",
          phase: "governance",
          status: "failed",
          display_message: error?.message || "Approval could not be resolved",
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setStreamText("");
    setStreamPhase("starting");
    const controller = new AbortController();
    abortRef.current = controller;
    const userText = input.trim();
    setLastFailedPrompt("");
    setInput("");
    setAgentSteps([]);

    // Add optimistic user message to display input immediately
    const optimisticUserMsg = {
      id: "optimistic-user-msg-" + Date.now(),
      role: "user",
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    let sessionId = selectedSessionId;
    try {
      if (!sessionId) {
        const created = await chatAPI.createSession("New Workflow Session");
        setSessions((prev) => [created, ...prev]);
        setSelectedSessionId(created.id);
        sessionId = created.id;
      }

      const cfgRaw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
      const provider = cfg.activeProvider || "lmstudio";
      const providerCfg = cfg[provider] || {};
      const providerDefaults = {
        anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-20241022" },
        custom: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
        google: { baseUrl: "https://generativelanguage.googleapis.com", model: "gemini-1.5-flash" },
        groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-70b-versatile" },
        lmstudio: { baseUrl: "http://127.0.0.1:1234/v1", model: "liquid/lfm2.5-1.2b" },
        ollama: { baseUrl: "http://127.0.0.1:11434/v1", model: "llama3" },
        openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
        opencode: { baseUrl: "https://opencode.ai/zen/v1", model: "gpt-5.5" },
      };
      const defaults = providerDefaults[provider] || providerDefaults.lmstudio;
      const model = providerCfg.selectedModel || defaults.model;
      const baseUrl =
        providerCfg.endpoint ||
        providerCfg.base_url ||
        defaults.baseUrl;
      const payload = {
        content: userText,
        provider,
        api_key: providerCfg.key || null,
        base_url: baseUrl,
        model,
      };
      const streamResult = await chatAPI.sendMessageStream(
        sessionId,
        payload,
        {
          onStatus: ({ phase }) => setStreamPhase(phase),
          onAgentStep: (event) => {
            setAgentSteps((previous) => {
              const next = [...previous];
              const index = next.findIndex((item) => item.event_id === event.event_id);
              if (index >= 0) next[index] = event;
              else next.push(event);
              return next;
            });
            setStreamPhase(event.phase || event.type || null);
          },
          onReasoningDelta: (event) => {
            if (!event?.event_id) return;
            setAgentSteps((previous) => previous.map((item) => (
              item.event_id === event.event_id
                ? {
                    ...item,
                    result_summary: {
                      ...(item.result_summary || {}),
                      characters: event.characters,
                    },
                  }
                : item
            )));
          },
          onChunk: ({ text }) => setStreamText((prev) => prev + text),
          onDone: ({ assistant_message, user_message, session }) => {
            setMessages((prev) => [
              ...prev.filter(m => !m.id.toString().startsWith("optimistic-user-msg-")),
              user_message,
              assistant_message
            ]);
            setSessions((prev) =>
              prev.map((s) => (s.id === session.id ? session : s)),
            );
            if (session.title === "New Workflow Session" && userText) {
              const autoTitle = userText.length > 48 ? `${userText.slice(0, 48)}…` : userText;
              chatAPI.renameSession(session.id, autoTitle)
                .then((updated) => setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s))))
                .catch((error) => console.warn("Automatic session title failed", error));
            }
            setStreamText("");
            setStreamPhase("done");
            loadMessages(session.id).catch(console.error);
          },
          onError: (err) => {
            setStreamPhase("error");
            setStreamText("");
            setLastFailedPrompt(userText);
            setMessages((prev) => [
              ...prev.filter(m => !m.id.toString().startsWith("optimistic-user-msg-")),
              {
                id: `stream-error-${Date.now()}`,
                role: "assistant",
                content: `Streaming failed: ${err?.message || "unknown error"}`,
                tool_trace: null,
                created_at: new Date().toISOString(),
              },
            ]);
          },
        },
        controller.signal,
      );
      if (!streamResult) {
        throw new Error("No streamed response received");
      }
    } catch (e) {
      if (e.name === "AbortError") {
        return;
      }

      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: e?.message || "The request could not be completed. Check the provider configuration and try again.",
          tool_trace: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setLastFailedPrompt(userText);
      setStreamPhase("error");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const retryLastPrompt = () => {
    if (!lastFailedPrompt || busy) return;
    setInput(lastFailedPrompt);
    window.setTimeout(() => sendMessage(), 0);
  };

  const exportTranscript = async (format = "markdown") => {
    if (!messages.length) return;
    const title = selectedSession?.title || "Aurelinx Workflow Session";
    const rows = messages.map((message) => ({
      role: message.role,
      content: message.content || "",
      timestamp: message.created_at || "",
    }));
    const stamp = Date.now();
    if (format === "markdown") {
      const body = [`# ${title}`, "", `Generated: ${new Date().toISOString()}`, "", ...rows.map((row) => `## ${row.role}\n\n${row.content}\n\n_${row.timestamp}_\n`)].join("\n");
      const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `aurelinx-workflow-${stamp}.md`; link.click(); URL.revokeObjectURL(url);
      return;
    }
    if (format === "excel") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Transcript");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Tools", workflowSummary.tools], ["Records affected", workflowSummary.records], ["Approvals", workflowSummary.approvals], ["Errors", workflowSummary.errors]]), "Summary");
      XLSX.writeFile(workbook, `aurelinx-workflow-${stamp}.xlsx`);
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(title, 15, 18); doc.setFontSize(9);
    let y = 28;
    rows.forEach((row) => { const lines = doc.splitTextToSize(`${row.role.toUpperCase()} (${row.timestamp})\n${row.content}`, 180); if (y + lines.length * 5 > 280) { doc.addPage(); y = 18; } doc.text(lines, 15, y); y += lines.length * 5 + 5; });
    doc.save(`aurelinx-workflow-${stamp}.pdf`);
  };

  const cancelStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setBusy(false);
      setStreamPhase("cancelled");
    }
  };

  return (
    <div className="absolute inset-0 flex min-h-0 w-full flex-col overflow-hidden">
      <div
        className="p-4 flex flex-1 flex-col min-h-0 pb-0 mr-[8px]"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/20 text-cyan-200">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold">
                Aurelinx Intelligence Chat
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen((v) => !v)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
                title="What Aurelinx Intelligence Chat can do"
                aria-label="What Aurelinx Intelligence Chat can do"
              >
                <Info size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Agentic control over dashboard, directory, sentiment, analytics,
              scout and data tools.
            </p>
            {selectedSession && (
              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Started {formatSessionTime(selectedSession.created_at)} · Updated {formatSessionTime(selectedSession.updated_at)} · Scope: authenticated workspace
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <UserManualButton defaultTab="workflows" />
            <button
              onClick={clearMessages}
              disabled={!selectedSession}
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs inline-flex items-center gap-2"
            >
              <Eraser size={13} /> Clear Chat
            </button>
            <div className="relative group">
              <button disabled={!messages.length} className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs disabled:opacity-40">Export</button>
              {messages.length > 0 && <div className="absolute right-0 top-full z-30 hidden w-36 rounded-lg border border-white/10 bg-[#0f1f33] p-1 shadow-xl group-hover:block"><button onClick={() => exportTranscript("pdf")} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10">PDF</button><button onClick={() => exportTranscript("excel")} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10">Excel</button><button onClick={() => exportTranscript("markdown")} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10">Markdown</button></div>}
            </div>
          </div>
        </div>

        {selectedSession && messages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <span>Tools <strong className="text-cyan-200">{workflowSummary.tools}</strong></span>
            <span>Records affected <strong className="text-slate-200">{workflowSummary.records}</strong></span>
            <span>Approvals <strong className="text-amber-200">{workflowSummary.approvals}</strong></span>
            <span>Errors <strong className="text-rose-300">{workflowSummary.errors}</strong></span>
          </div>
        )}

        {helpOpen && (
          <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-xs text-slate-300">
            <div className="font-bold uppercase tracking-[0.16em] text-cyan-300 mb-2">
              What this chat can do
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                • Answer live questions from Postgres-backed workforce and
                candidate data.
              </div>
              <div>
                • Explain morale, retention probability, at-risk signals, and
                department risk clusters.
              </div>
              <div>
                • Surface Talent Scout, Intel Center, Data Ops, Enterprise Ops,
                policies, and interventions.
              </div>
              <div>
                • Stream token-by-token responses and support file attachments
                in sessions.
              </div>
              <div>
                • Report system status, model drift, quarantine, release gates,
                and runbooks.
              </div>
              <div>
                • Give direct counts and exact answers when the data exists in
                the app.
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-white/[0.01] border border-white/5 rounded-2xl backdrop-blur-md my-auto max-w-xl mx-auto py-16">
              <Bot size={40} className="text-cyan-400 mb-4 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-200 mb-2">
                No Active Workflow Sessions
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                Create a new session to begin interacting with the Aurelinx
                Intelligence agent.
              </p>
              <button
                onClick={createSession}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)] cursor-pointer"
              >
                Start New Session
              </button>
            </div>
          ) : (
            <div
              ref={messagesScrollRef}
              className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`min-w-0 ${m.role === "user" ? "ml-16 rounded-2xl p-4 bg-primary/10 border border-primary/30" : "mr-4 py-2"}`}
                >
                  {m.role === "user" && (
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400 mb-1.5">You</div>
                  )}
                  {m.role === "assistant" ? (
                    <div className="min-w-0">
                      {m.workflow_events?.length > 0 && (
                        <div className="mt-2 pt-2">
                          <AgenticStepTracker steps={m.workflow_events} onApproval={resolveApproval} />
                        </div>
                      )}
                      <ThinkingMessageContent
                        text={m.content || ""}
                        isBusy={false}
                      />
                      {(String(m.id || "").startsWith("error-") || String(m.id || "").startsWith("stream-error-")) && lastFailedPrompt && (
                        <button onClick={retryLastPrompt} className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/20">Retry request</button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="mr-4 py-2">
                  <div className="min-w-0">
                    <div className="mt-2 pt-2">
                      <AgenticStepTracker phase={streamPhase} steps={agentSteps} onApproval={resolveApproval} />
                    </div>
                    {streamText && (
                      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-cyan-400/70">
                        <span>Live answer</span>
                        <span>{streamText.length} characters received</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <ThinkingMessageContent text={streamText} isBusy={busy} />
                    </div>
                  </div>
                </div>
              )}
              {!messages.length && (
                <div className="text-sm text-slate-400">
                  Start a chat session and ask Aurelinx to search, analyze,
                  and update data.
                </div>
              )}
              <div />
            </div>
          )}

          <div className="pt-2 border-t border-white/5 pb-0 flex-shrink-0">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/10 bg-white/5"
                  >
                    {a.original_name}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        a.parsing_status === "parsed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : a.parsing_status === "failed"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {a.parsing_status}
                    </span>
                    <button
                      onClick={() => removeAttachment(a.id)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative z-10">
              {busy && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-400/20 via-cyan-500/25 to-indigo-500/20 blur-md -z-10 animate-pulse pointer-events-none" />
              )}

              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-2xl bg-[#081220]/95 border transition-all duration-500 ${
                  busy
                    ? "border-cyan-400/40 shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                    : "border-white/10 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(45,212,191,0.12)]"
                }`}
              >
                <label className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0">
                  <Paperclip size={18} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={uploadFile}
                  />
                </label>

                <textarea
                  className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-slate-100 placeholder:text-slate-500 text-sm py-2 resize-none h-9 max-h-28 overflow-y-auto leading-relaxed custom-scrollbar"
                  placeholder="Ask Aurelinx to analyze, search, update employee data, or drive workflows..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  onClick={busy ? cancelStream : sendMessage}
                  disabled={!busy && (!input.trim() || !selectedSession)}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 cursor-pointer ${
                    busy
                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/35 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                      : "bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(45,212,191,0.25)] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                  }`}
                  title={busy ? "Stop stream" : "Send message"}
                >
                  {busy ? (
                    <Square
                      size={13}
                      fill="currentColor"
                      className="animate-pulse"
                    />
                  ) : (
                    <Send
                      size={15}
                      fill="none"
                      strokeWidth={2.5}
                      className="mr-0.5"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside
        className={`absolute z-40 top-0 right-0 h-full transition-all duration-300 ease-out ${drawerOpen ? "w-[calc(100vw-16px)] sm:w-[340px]" : "w-[64px]"}`}
      >
        <div className="premium-card h-full min-h-0 overflow-hidden flex flex-col">
          <div
            className={`flex items-center ${drawerOpen ? "justify-between px-3 py-3" : "justify-center px-2 py-3"}`}
          >
            {drawerOpen && (
              <div className="font-bold text-sm uppercase tracking-[0.14em] text-slate-300">
                Workflow Sessions
              </div>
            )}
            <div className="flex items-center gap-2">
              {drawerOpen && (
                <button
                  onClick={createSession}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <Plus size={14} />
                </button>
              )}
              <button
                onClick={() => setDrawerOpen((v) => !v)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                aria-label={
                  drawerOpen
                    ? "Collapse sessions drawer"
                    : "Expand sessions drawer"
                }
              >
                {drawerOpen ? (
                  <PanelRightClose size={14} />
                ) : (
                  <PanelRightOpen size={14} />
                )}
              </button>
            </div>
          </div>

          {drawerOpen ? (
            <>
              <div className="px-3 pb-3 space-y-2 overflow-y-auto flex-1 min-h-0">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border p-2 ${selectedSessionId === s.id ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(s.id)}
                        onChange={(e) =>
                          setSelectedSessions((prev) =>
                            e.target.checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id),
                          )
                        }
                      />
                      <button
                        className="flex-1 text-left text-sm font-semibold truncate"
                        onClick={() => { setSelectedSessionId(s.id); if (window.innerWidth < 640) setDrawerOpen(false); }}
                      >
                        <span className="min-w-0"><span className="block truncate">{s.title}</span><span className="block truncate text-[9px] font-normal text-slate-500">{formatSessionTime(s.updated_at || s.created_at)}</span></span>
                      </button>
                      <button
                        onClick={() => renameSession(s.id)}
                        className="p-1 text-slate-300 hover:text-white"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => requestDeleteSession(s.id)}
                        className="p-1 text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/5">
                <button
                  onClick={() => selectedSessions.length && setDeleteTarget({ type: "bulk" })}
                  className="w-full h-9 rounded-lg border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 text-sm font-semibold"
                >
                  Delete Selected
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-start gap-3 px-2 py-3">
              <div className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-primary/80" />
                {sessions.length}
              </div>
              <button
                onClick={createSession}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                title="New session"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {deleteTarget && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md premium-card p-5 shadow-2xl border-white/15">
            <h3 className="text-base font-extrabold text-white">{deleteTarget?.type === "bulk" ? "Delete selected workflow sessions?" : "Delete workflow session?"}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">This permanently removes the session messages, workflow events, and attachments. This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Cancel</button><button onClick={confirmDeleteSession} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/20">Delete permanently</button></div>
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md premium-card p-5 shadow-2xl border-white/15">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20 text-cyan-200">
                <Pencil size={16} />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Rename session</h3>
                <p className="text-xs text-slate-400">
                  Use the app modal instead of a browser dialog.
                </p>
              </div>
            </div>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full h-11 rounded-lg bg-slate-900/80 border border-white/10 px-3 outline-none"
              placeholder="Session name"
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRenameSession();
                if (e.key === "Escape") setRenameTarget(null);
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRenameTarget(null)}
                className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmRenameSession}
                disabled={!renameValue.trim()}
                className="h-10 px-4 rounded-lg btn-primary text-sm disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligenceChatView;
