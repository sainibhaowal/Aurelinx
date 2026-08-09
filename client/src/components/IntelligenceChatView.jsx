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
  Download,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import { chatAPI } from "../services/apiClient";

// ── Premium Markdown renderer — full GFM: tables, code, blockquotes, lists, task lists, images ──
const TableWithActions = ({ children }) => {
  const [flash, setFlash] = useState("");

  const extractTableData = () => {
    const cellText = (node) => {
      if (node == null) return "";
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(cellText).join("");
      if (node && typeof node === "object" && node.props && node.props.children !== undefined) {
        return cellText(node.props.children);
      }
      return "";
    };
    const rows = [];
    const collect = (node) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(collect); return; }
      if (typeof node !== "object") return;
      if (node.type === "tr") {
        const cells = [];
        const walkCells = (n) => {
          if (!n) return;
          if (Array.isArray(n)) { n.forEach(walkCells); return; }
          if (typeof n === "object" && n.props && n.props.children !== undefined) {
            if (n.type === "td" || n.type === "th") cells.push(cellText(n.props.children));
            else walkCells(n.props.children);
          }
        };
        walkCells(node.props && node.props.children);
        rows.push(cells);
        return;
      }
      if (node.props && node.props.children !== undefined) collect(node.props.children);
    };
    collect(children);
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  };

  const tableToCsv = (data) =>
    data.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  const copyTable = async () => {
    try {
      await navigator.clipboard.writeText(tableToCsv(extractTableData()));
      setFlash("copied");
    } catch (e) {
      setFlash("error");
    }
    window.setTimeout(() => setFlash(""), 1600);
  };

  const exportTableExcel = async () => {
    const data = extractTableData();
    if (!data.length) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Table");
    XLSX.writeFile(wb, `aurelinx-table-${Date.now()}.xlsx`);
  };

  return (
    <div className="group/table my-4 relative rounded-xl border border-white/10 shadow-lg shadow-black/30">
      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/table:opacity-100">
        <button
          type="button"
          onClick={copyTable}
          className="inline-flex items-center rounded-md border border-white/10 bg-slate-950/90 px-1.5 py-1 text-slate-300 hover:text-cyan-200 shadow-md transition-colors"
          title="Copy table (CSV)"
        >
          {flash === "copied" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
        <button
          type="button"
          onClick={exportTableExcel}
          className="inline-flex items-center rounded-md border border-emerald-400/25 bg-slate-950/90 px-1.5 py-1 text-emerald-300 hover:text-emerald-200 shadow-md transition-colors"
          title="Export table to Excel (.xlsx)"
        >
          <FileSpreadsheet size={11} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse table-auto">{children}</table>
      </div>
    </div>
  );
};

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
      table: TableWithActions,
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
  // During active streaming: if <think> opened but </think> not yet closed,
  // parsed.content is "" — but any text BEFORE <think> should still show.
  const preThinkContent = (() => {
    if (!rawText) return "";
    const thinkStart = rawText.indexOf("<think>");
    return thinkStart > 0 ? rawText.slice(0, thinkStart).trim() : "";
  })();
  const visibleContent = parsed.thinking ? (parsed.content || preThinkContent) : rawText;
  if (!visibleContent) return null;

  return (
    <div className="mt-2 min-w-0 w-full overflow-hidden pt-2">
      <MarkdownRenderer>{visibleContent}</MarkdownRenderer>
    </div>
  );
};

const toolTarget = (step) => {
  const input = step.safe_input || {};
  const args =
    input && typeof input === "object" && (input.arguments || input) || {};
  const entity = args.entity || args.type || "";
  const identifier = args.identifier || args.id || args.email || "";
  if (entity && identifier) return `${entity} ${identifier}`;
  if (entity) return entity;
  if (identifier) return identifier;
  return (step.tool || step.tool_name || "records").replaceAll(".", " ");
};

const naturalStepDetail = (step) => {
  const summary = step.result_summary;
  if (step.type === "model_reasoning") {
    return step.status === "running" ? "Thinking" : "Thought";
  }
  if (step.type === "agent_started") return "Working on your request";
  if (step.type === "agent_failed") {
    return `Provider turn failed${summary?.reason ? `: ${summary.reason}` : ""}`;
  }
  if (step.type === "tool_call" || step.type === "tool_result" || step.type === "tool_execution") {
    const toolName = step.tool || step.tool_name || "tool";
    const target = toolTarget(step);
    if (step.status === "blocked") {
      return `Step stopped by policy guardrail`;
    }
    if (step.status === "running") {
      return `→ ${toolName} ${target}`;
    }
    return `← ${toolName} ${target}`;
  }
  if (step.type === "final_response_started") return "Streaming the final answer";
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
  toolName === "modify" ||
  toolName === "write" ||
  toolName === "delete" ||
  toolName.startsWith("data.") ||
  toolName.includes("mutat");

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

const RenderToolResultCard = ({ toolName, result }) => {
  if (!result) return null;

  // 1. Search card — grouped entity results from the dynamic search tool
  if (toolName === "search") {
    const groups = Array.isArray(result.groups)
      ? result.groups
      : Array.isArray(result.records)
        ? [{ entity: result.entity || "records", matches: result.records }]
        : null;
    if (!groups) return null;
    return (
      <div className="mt-2 space-y-2">
        <div className="text-[10px] font-medium text-slate-400">
          Found {groups.reduce((sum, g) => sum + (g.matches?.length || 0), 0)} matching record(s):
        </div>
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1.5">
            {groups.length > 1 && (
              <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400/70">{group.entity}</div>
            )}
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {(group.matches || []).slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-cyan-500/20 bg-slate-900/80 p-2 text-[11px]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-300">
                    {(item.full_name?.[0] || item.first_name?.[0] || item.name?.[0] || item.title?.[0] || "R").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-200">{item.full_name || item.policy_name || item.title || item.name || "Matched record"}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-[9px]">
                      {item.role && <span className="rounded bg-cyan-400/10 px-1 text-cyan-300">{item.role}</span>}
                      {item.department && <span className="rounded bg-white/[0.06] px-1 text-slate-400">{item.department}</span>}
                      {item.provider && <span className="rounded bg-white/[0.06] px-1 text-slate-400">{item.provider}</span>}
                      {item.status && <span className="rounded bg-white/[0.06] px-1 text-slate-400">{item.status}</span>}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">{item.email || (item.content ? `${String(item.content).slice(0, 60)}…` : "Verified")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Read card — one verified record end to end
  if (toolName === "read" && Array.isArray(result.records)) {
    return (
      <div className="mt-2 rounded-md border border-cyan-500/20 bg-slate-900/80 p-2 text-[11px]">
        <div className="mb-1 text-[10px] font-medium text-slate-400">{result.returned} record(s) read:</div>
        <div className="space-y-1">
          {result.records.map((item, i) => (
            <details key={i} className="rounded border border-white/10 bg-slate-950/35 p-1.5">
              <summary className="cursor-pointer text-[10px] text-slate-300">
                {item.full_name || item.policy_name || item.name || item.content ? `${String(item.content || "").slice(0, 80)}…` : item.id}
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-relaxed text-slate-400">
                {displayPayload(item)}
              </pre>
            </details>
          ))}
        </div>
      </div>
    );
  }

  // 3. Analyse card — headcount distribution + key analytics
  if (toolName === "analyse") {
    const analysis = result.analysis || result;
    const analytics = analysis.workforce_analytics || {};
    const depts = analytics.departments;
    const sentiment = analysis.sentiment;
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
          {analytics.total_workforce != null && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px]">
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-slate-300">Workforce {analytics.total_workforce}</span>
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300">At risk {analytics.at_risk}</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">Avg morale {analytics.avg_morale}</span>
            </div>
          )}
          {sentiment?.average_sentiment != null && (
            <div className="mt-1 text-[9px] text-slate-400">Sentiment average: {sentiment.average_sentiment}</div>
          )}
        </div>
      );
    }
  }

  // 4. Modify diff card
  if (toolName === "modify") {
    const mutation = result.result || {};
    const changes = mutation.changes || {};
    const entries = Object.entries(changes);
    return (
      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <span>⚡ Admin Modification Committed</span>
          </div>
          <span className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            ✓ Verified by read-back
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-300">
          {mutation.entity || "record"} · {mutation.identifier || "verified identifier"}
        </div>
        {entries.length > 0 && (
          <div className="mt-2 space-y-1 rounded border border-white/10 bg-slate-950/35 p-1.5">
            {entries.slice(0, 5).map(([key, change]) => (
              <div key={key} className="grid grid-cols-[5rem_1fr_auto_1fr] items-center gap-1 text-[10px]">
                <span className="truncate text-slate-500">{key}</span>
                <span className="truncate text-rose-300">{String(change?.from ?? "—")}</span>
                <span className="text-amber-300">→</span>
                <span className="truncate text-emerald-300">{String(change?.to ?? "—")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. Write card
  if (toolName === "write" && result.result?.created) {
    return (
      <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]">
        <div className="font-semibold text-emerald-300">✓ New {result.result.entity || "record"} created and verified</div>
        <div className="mt-1 truncate text-[10px] text-slate-400">
          {result.result.record?.full_name || result.result.record?.title || result.result.record?.email || result.result.record?.id}
        </div>
      </div>
    );
  }

  // 6. Delete — prepared spec awaiting human approval
  if (toolName === "delete" || (result.approval_required && toolName === "delete")) {
    const spec = result.spec || {};
    return (
      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
          <span>🔒 Deletion Prepared — Authorization Required</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-300">
          {spec.entity || result.entity || "Record"} · {spec.identifier || "verified identifier"}
          {result.matches_found != null && <> · {result.matches_found} match(es) found</>}
        </div>
        <div className="mt-1 text-[9px] text-slate-500">The exact action is stored; deletion executes only after an authorized human approves it.</div>
      </div>
    );
  }

  // 7. Observe card — patterns, symptoms, prediction
  if (toolName === "observe" && result.observation) {
    const observation = result.observation;
    const patterns = observation.patterns || {};
    const symptoms = observation.symptoms || [];
    const prediction = observation.prediction || {};
    return (
      <div className="mt-2 space-y-1.5 rounded-md border border-violet-500/30 bg-violet-500/5 p-2 text-[11px]">
        <div className="font-semibold text-violet-300">🔭 System Observation</div>
        {patterns.employees_total != null && (
          <div className="flex flex-wrap gap-1.5 text-[9px]">
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-slate-300">Employees {patterns.employees_total}</span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-slate-300">Candidates {patterns.candidates_total}</span>
            {patterns.at_risk_ratio != null && (
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300">At-risk ratio {patterns.at_risk_ratio}</span>
            )}
          </div>
        )}
        {symptoms.length > 0 && (
          <ul className="space-y-1 text-[9px] text-slate-300">
            {symptoms.slice(0, 5).map((symptom, i) => (
              <li key={i} className="flex gap-1"><span className="text-amber-300">•</span>{symptom}</li>
            ))}
          </ul>
        )}
        {prediction.recommended_action && (
          <div className="rounded border border-white/10 bg-slate-950/35 p-1.5 text-[9px] text-violet-200">
            Prediction: {prediction.recommended_action}
            {prediction.attention_needed === "yes" && <> · attention needed</>}
          </div>
        )}
      </div>
    );
  }

  return null;
};

const AgenticStepTracker = ({ steps = [], onApproval, phase }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedAll, setExpandedAll] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Deterministic settling: a finished stream is history. Any step still
  // marked "running" on a non-active stream is deterministically finalized so
  // restored conversations never show eternal live elapsed timers (the stuck
  // "Thinking ... 7207.2s" symptom). The live tracker keeps animating while
  // the phase is genuinely active.
  const settling = !phase || phase === "done" || phase === "error";
  const deterministicSteps = useMemo(() => {
    if (!settling) return steps;
    const wasRunning = steps.map((step) => step.status === "running");
    const list = steps.map((step) => {
      if (step.type === "model_reasoning" && step.status === "running") {
        return { ...step, status: "completed", duration_ms: Number(step.duration_ms || 0) };
      }
      if (step.status === "running") {
        return { ...step, status: "completed", duration_ms: Number(step.duration_ms || 0) };
      }
      return step;
    });
    const collapsed = [];
    for (let index = 0; index < list.length; index += 1) {
      const step = list[index];
      const next = list[index + 1];
      if (
        step.type === "model_reasoning" &&
        wasRunning[index] &&
        next &&
        next.type === "model_reasoning"
      ) {
        collapsed.push({
          ...next,
          started_at: step.started_at || next.started_at,
          created_at: step.created_at || next.created_at,
          result_summary: {
            ...(next.result_summary || {}),
            ...(step.result_summary || {}),
          },
        });
        index += 1;
        continue;
      }
      collapsed.push(step);
    }
    return collapsed;
  }, [steps, settling]);

  const hasRunningStep = deterministicSteps.some((step) => step.status === "running");

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
    const visible = deterministicSteps.filter((step) => {
      if (step.tool === "conversation.context") return false;
      if ([
        "workflow_started",
        "agent_started",
        "validation_completed",
        "workflow_completed",
        "final_response_completed",
        "final_response_started",
        "agent_decision",
        "controller_call",
        "controller_output_normalized",
        "controller_output_repaired"
      ].includes(step.type)) return false;
      if (step.type === "workflow_failed" && deterministicSteps.some((item) => item.type === "agent_failed")) return false;
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
  }, [deterministicSteps]);

  // Telemetry Calculations. Token throughput is only shown when the stream
  // provides token metadata; character-derived values are explicitly marked
  // as estimates rather than presenting invented precision.
  const telemetry = useMemo(() => {
    const totalDuration = deterministicSteps.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0) || 120;
    const reasoningStep = deterministicSteps.find((s) => s.type === "model_reasoning");
    const reasoningChars = reasoningStep?.result_summary?.characters || 0;
    const explicitTokens = deterministicSteps.reduce(
      (acc, step) => acc + Number(step.tokens || step.token_count || step.result_summary?.tokens || 0),
      0,
    );
    const estimatedTokens = explicitTokens || (reasoningChars ? Math.round(reasoningChars / 4) : 0);
    const activeDuration = deterministicSteps.reduce(
      (max, step) => Math.max(max, step.status === "running" ? runningDuration(step) : Number(step.duration_ms || 0)),
      totalDuration,
    );
    const throughput = estimatedTokens && activeDuration > 0
      ? `${(estimatedTokens / (activeDuration / 1000)).toFixed(1)}${explicitTokens ? "" : "~"}`
      : "—";
    const isRunning = deterministicSteps.some((s) => s.status === "running");
    return {
      latency: `${totalDuration}ms`,
      throughput,
      tokensEstimated: !explicitTokens && Boolean(estimatedTokens),
      reasoningChars,
      reasoningDuration: reasoningStep ? stepDuration(reasoningStep) : 0,
      tokenCount: estimatedTokens,
      status: isRunning ? "Streaming" : "Idle / Ready",
    };
  }, [deterministicSteps, currentTime]);

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
    <div className="flex flex-col gap-1 my-2">

      {/* Steps List */}
      <div className="flex flex-col gap-1 font-mono text-[12px] text-slate-300">
        {filteredSteps.map((step, index) => {
          const id = step.event_id || `${step.type}-${index}`;
          const status = step.status || "running";
          const isError = status === "failed" || status === "blocked";
          const isToolExecution = step.type === "tool_execution";
          const isReasoning = step.type === "model_reasoning";
          const duration = stepDuration(step);
          const durationLabel = formatDuration(duration);
          const toolName = toolNameForStep(step);

          const isExpanded = expandedAll || expandedId === id;

          let displayTitle = step.message || step.type;
          if (isReasoning) {
            displayTitle = status === "running"
              ? `Thinking... ${durationLabel}`
              : `Thought for ${durationLabel}`;
          } else if (isToolExecution) {
            const matches = step.result?.returned ?? step.result?.matches_found ?? (Array.isArray(step.result?.matches) ? step.result.matches.length : null);
            const matchSuffix = matches != null ? ` (${matches} matches)` : "";
            displayTitle = `${toolName}${matchSuffix}`;
          }

          return (
            <div key={id} className="group flex flex-col min-w-0">
              <button
                type="button"
                onClick={() => setExpandedId((current) => current === id ? null : id)}
                className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer text-left w-full border border-transparent hover:border-white/5 select-none"
              >
                {/* Chevron Arrow Icon */}
                <span className="text-slate-500 group-hover:text-cyan-300 transition-colors text-[11px] w-3 flex-shrink-0 font-bold">
                  {isExpanded ? "⌄" : "›"}
                </span>

                {/* Status Indicator Icon */}
                <span className="flex-shrink-0 text-[11px]">
                  {status === "completed" ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : isError ? (
                    <span className="text-rose-400 font-bold">✕</span>
                  ) : status === "waiting" ? (
                    <span className="text-amber-400 font-bold">⏱</span>
                  ) : (
                    <span className="text-cyan-400 animate-pulse font-bold">●</span>
                  )}
                </span>

                {/* Main Label */}
                <span
                  className={`truncate font-medium ${
                    isError
                      ? "text-rose-300"
                      : status === "running"
                      ? "text-cyan-300"
                      : isReasoning
                      ? "text-slate-400"
                      : "text-slate-200"
                  }`}
                >
                  {displayTitle}
                </span>

                {/* Timing Badge */}
                {duration > 0 && !isReasoning && (
                  <span className="ml-auto flex-shrink-0 text-[10px] font-mono text-slate-500 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">
                    {durationLabel}
                  </span>
                )}
              </button>

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="ml-5 mt-1 mb-2 p-2.5 rounded-lg border border-white/10 bg-slate-950/90 text-[11px] text-slate-300 space-y-2">
                  {isReasoning ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-cyan-400 font-semibold border-b border-white/5 pb-1">
                        <span className="flex items-center gap-1.5">
                          {status === "running" ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                          Live Thinking{' '}
                          {status === "running" ? "· thinking…" : ""}
                        </span>
                        <span className="font-mono">{step.result_summary?.characters || 0} chars</span>
                      </div>
                      <pre className="p-2.5 rounded bg-black/40 border border-white/5 font-mono text-[11px] leading-relaxed text-cyan-100/90 overflow-y-auto whitespace-pre-wrap break-words max-h-52 min-h-[3rem]">
                        {step.result_summary?.text
                          ? <>{step.result_summary.text}{status === "running" && <span className="inline-block w-1.5 h-3.5 bg-cyan-400/80 animate-pulse ml-0.5 align-text-bottom" />}</>
                          : (
                            <span className="text-slate-500">
                              {status === "running" ? "thinking…" : "No reasoning text captured — this model may not expose thinking."}
                            </span>
                          )}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {step.safe_input && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1">Input Parameters</div>
                          <pre className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                            {displayPayload(step.safe_input)}
                          </pre>
                        </div>
                      )}
                      {(step.result || step.output_metadata || step.result_summary) && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">Output Metadata</div>
                          <pre className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                            {displayPayload(step.result || step.output_metadata || step.result_summary)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Human Approval Action Buttons */}
                  {step.type === "approval_required" && step.result_summary?.approval_id && onApproval && (
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[11px] text-emerald-300 hover:bg-emerald-500/30 transition-colors font-sans font-medium"
                        onClick={() => onApproval("approve", step)}
                      >
                        ✓ Approve exact action
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-300 hover:bg-rose-500/30 transition-colors font-sans font-medium"
                        onClick={() => onApproval("reject", step)}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
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
  const [feedbackMap, setFeedbackMap] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [agentSteps, setAgentSteps] = useState([]);
  // Keep the session history out of the way on first visit. Users can still
  // expand it with the rail control whenever they need to switch workflows.
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const sendMessage = async (overrideText) => {
    const override = typeof overrideText === "string" ? String(overrideText).trim() : "";
    const userText = override || (input || "").trim();
    if (!userText || busy) return;
    setBusy(true);
    setStreamText("");
    setStreamPhase("starting");
    const controller = new AbortController();
    abortRef.current = controller;
    if (override) setInput(userText);
    setEditingId(null);
    setEditDraft("");
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
                      text: event.text || item.result_summary?.text || "",
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
            setAgentSteps((previous) => (
              previous.map((item) => (
                item.status === "running"
                  ? { ...item, status: item.type === "model_reasoning" ? "failed" : "completed" }
                  : item
              ))
            ));
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
    window.setTimeout(() => sendMessage(lastFailedPrompt), 0);
  };

  const copyMessage = async (messageId, content) => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopiedMsgId(messageId);
    } catch (e) {
      console.warn("copy failed", e);
    }
    window.setTimeout(() => setCopiedMsgId(null), 1400);
  };

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditDraft(message.content || "");
  };

  const saveEdit = () => {
    const text = (editDraft || "").trim();
    if (!text || busy) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx < 0) return;
    setMessages((prev) => prev.slice(0, idx));
    setEditingId(null);
    setEditDraft("");
    window.setTimeout(() => sendMessage(text), 0);
  };

  const regenerateFrom = (assistantMessage) => {
    if (busy) return;
    const idx = messages.findIndex((m) => m.id === assistantMessage.id);
    if (idx < 0) return;
    const prior = messages.slice(0, idx).reverse().find((m) => m.role === "user");
    if (!prior) return;
    setMessages((prev) => {
      const at = prev.findIndex((m) => m.id === prior.id);
      return at >= 0 ? prev.slice(0, at) : prev;
    });
    setStreamText("");
    window.setTimeout(() => sendMessage(prior.content), 0);
  };

  const submitFeedback = async (messageId, rating) => {
    setFeedbackMap((prev) => ({ ...prev, [messageId]: rating }));
    try {
      await chatAPI.sendFeedback(selectedSessionId, { message_id: messageId, rating });
    } catch (e) {
      console.warn("Feedback could not be saved", e);
    }
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
        className={`w-full max-w-[900px] p-4 flex flex-1 flex-col min-h-0 pb-0 mx-auto transition-transform duration-300 ${drawerOpen ? "sm:-translate-x-[170px]" : ""}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/20 text-cyan-200">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold">
                Aurelinx Grounded Query
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen((v) => !v)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
                title="What Aurelinx Grounded Query can do"
                aria-label="What Aurelinx Grounded Query can do"
              >
                <Info size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Ask verified questions about workforce, candidates, analytics, and controlled workflows.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <UserManualButton defaultTab="workflows" />
            <button
              onClick={clearMessages}
              disabled={!selectedSession}
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs inline-flex items-center gap-2"
            >
              <Eraser size={13} /> Clear Query
            </button>
            <div className="relative group">
              <button disabled={!messages.length} aria-label="Export query transcript" title="Export query transcript" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs disabled:opacity-40"><Download size={14} /></button>
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
              What Grounded Query can do
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                • Answer questions from verified workforce and candidate records.
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
                • Show the scope, records, calculations, and evidence behind each answer.
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
                No Active Query Sessions
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                Start a query session to search, analyze, and run controlled workflows.
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
              {messages.map((m) => {
                const isEditing = editingId === m.id;
                const hasActions = !busy && !isEditing;
                return (
                  <div
                    key={m.id}
                    className={`min-w-0 ${m.role === "user" ? "ml-16 rounded-2xl p-4 bg-primary/10 border border-primary/30" : "mr-4 py-2"}`}
                  >
                    {m.role === "user" && (
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">You</div>
                        {hasActions && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyMessage(m.id, m.content)}
                              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10 hover:text-cyan-200 transition-colors"
                              title="Copy your message"
                            >
                              {copiedMsgId === m.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10 hover:text-cyan-200 transition-colors"
                              title="Edit and regenerate from scratch"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}
                      </div>
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
                        {hasActions && !String(m.id || "").startsWith("error-") && !String(m.id || "").startsWith("stream-error-") && (
                          <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyMessage(m.id, m.content)}
                              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-cyan-200 transition-colors"
                              title="Copy this answer"
                            >
                              {copiedMsgId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => regenerateFrom(m)}
                              className="inline-flex items-center rounded-md border border-cyan-400/20 bg-cyan-500/10 p-1.5 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
                              title="Regenerate the answer from scratch"
                            >
                              <RefreshCw size={12} />
                            </button>
                            <span className="mx-0.5 h-3.5 w-px bg-white/10" />
                            <button
                              type="button"
                              onClick={() => submitFeedback(m.id, "up")}
                              className={`inline-flex items-center rounded-md border p-1.5 transition-colors ${
                                feedbackMap[m.id] === "up"
                                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              }`}
                              title="Good response — helps the model improve"
                            >
                              <ThumbsUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => submitFeedback(m.id, "down")}
                              className={`inline-flex items-center rounded-md border p-1.5 transition-colors ${
                                feedbackMap[m.id] === "down"
                                  ? "border-rose-400/40 bg-rose-500/20 text-rose-300"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                              }`}
                              title="Bad response — the model will improve the next answer"
                            >
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={Math.min(6, Math.max(2, (editDraft || "").split("\n").length))}
                          autoFocus
                          className="w-full rounded-xl border border-cyan-400/30 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60 resize-y"
                          placeholder="Edit your request…"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-950 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <Send size={11} />
                            Regenerate with Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditDraft(""); }}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                );
              })}
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
                    <div className="text-sm relative">
                      <ThinkingMessageContent text={streamText} isBusy={busy} />
                      {busy && streamText && (
                        <span
                          className="inline-block w-[2px] h-[1em] ml-0.5 align-middle bg-cyan-400 rounded-sm"
                          style={{ animation: "blink-cursor 0.8s step-end infinite" }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!messages.length && (
                <div className="text-sm text-slate-400">
                Start a grounded query to search, analyze, and update data.
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
        style={!drawerOpen ? { top: "50%", bottom: "auto", transform: "translateY(-50%)" } : undefined}
        className={`absolute z-40 transition-all duration-300 ease-out ${drawerOpen ? "inset-y-0 right-0 h-full w-[calc(100vw-16px)] sm:w-[340px]" : "right-0 top-1/2 h-12 w-10 -translate-y-1/2 rounded-l-2xl rounded-r-none"}`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Collapse workflow history" : `Expand workflow history (${sessions.length} sessions)`}
          title={drawerOpen ? "Collapse workflow history" : `Open workflow history · ${sessions.length} sessions`}
          className={`absolute top-1/2 z-[70] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-[#091525]/[0.98] text-slate-300 shadow-xl backdrop-blur-xl transition hover:border-cyan-300/45 hover:text-cyan-200 ${drawerOpen ? "-left-5" : "left-0"}`}
        >
          {drawerOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        </button>
        <div className={`h-full min-h-0 overflow-hidden border border-white/15 bg-[#091525]/[0.98] shadow-[-24px_0_60px_rgba(1,8,20,0.45)] backdrop-blur-xl ${drawerOpen ? "rounded-2xl" : "rounded-l-2xl rounded-r-none"}`}>
          <div
            className={`flex items-center ${drawerOpen ? "justify-between px-3 py-3" : "h-full justify-center px-0 py-0"}`}
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
          ) : null}
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
