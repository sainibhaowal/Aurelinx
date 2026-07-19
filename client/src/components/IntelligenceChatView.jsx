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
  Brain,
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

// ── Premium Collapsible inline Thinking / Reasoning Box for DeepSeek-style models ──
const ThinkingMessageContent = ({ text, children, isBusy }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Hook to count thinking time dynamically while busy
  useEffect(() => {
    if (!isBusy) return;
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isBusy]);

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

  // Determine if active thinking is occurring
  const isThinkingActive = isBusy && parsed.content === "";

  // Only render if we actually have model thoughts (past or current) or are currently thinking
  if (!parsed.thinking && !isThinkingActive) {
    if (parsed.content) {
      return (
        <div className="mt-2 min-w-0 w-full overflow-hidden pt-2">
          <MarkdownRenderer>{parsed.content}</MarkdownRenderer>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 w-full text-left my-1.5">
      {/* Premium Collapsible Thinking Header */}
      <div className="flex flex-col">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit font-medium cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Brain
              size={12}
              className={
                isThinkingActive
                  ? "text-cyan-400 animate-pulse"
                  : "text-slate-500"
              }
            />
            {isThinkingActive ? (
              <span>Thinking... {elapsed > 0 ? `(${elapsed}s)` : ""}</span>
            ) : (
              <span>Thought for {elapsed > 0 ? `${elapsed}s` : "trace"}</span>
            )}
          </span>
          <span className="text-[10px] text-slate-500 font-mono transition-transform duration-200">
            {isOpen ? "▼" : "▶"}
          </span>
        </button>

        {/* Collapsible Model Cognitive Reasoning Block */}
        {isOpen && (
          <div className="mt-2 pl-3 border-l border-cyan-500/25 flex flex-col gap-2.5 relative ml-1.5">
            <div className="flex gap-2.5 items-start bg-slate-900/30 p-2.5 rounded-lg border border-white/5 font-sans italic select-text w-full">
              <div className="flex-1 max-h-48 overflow-y-auto custom-scrollbar">
                {parsed.thinking.trim() ? (
                  <CompactMarkdownRenderer>
                    {parsed.thinking.trim()}
                  </CompactMarkdownRenderer>
                ) : (
                  <div className="flex items-center gap-1.5 font-mono text-[7px] text-slate-500">
                    <span className="inline-block h-2 w-2 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
                    <span>Analyzing cognitive pathways...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {parsed.content && (
        <div className="mt-2 min-w-0 w-full overflow-hidden border-t border-white/5 pt-2">
          <MarkdownRenderer>{parsed.content}</MarkdownRenderer>
        </div>
      )}
    </div>
  );
};

const AgenticStepTracker = ({ phase, streamText }) => {
  const steps = [
    { id: "thinking", label: "Think", desc: "Analyzing request intent and query scope" },
    { id: "planning", label: "Plan", desc: "Context payload generation and RBAC check" },
    { id: "exploring", label: "Explore", desc: "Retrieving records from PostgreSQL database" },
    { id: "modifying", label: "Modify", desc: "Applying database write mutations", optional: true },
    { id: "verifying", label: "Verify", desc: "Running compliance audit and safeguards" },
    { id: "completing", label: "Complete", desc: "Streaming response token chunks" }
  ];

  // Helper to determine status icon
  const getStepStatus = (stepId, index) => {
    const activeIndex = steps.findIndex(s => s.id === phase);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (phase === "done") return "completed";
    if (phase === "error") return "error";
    if (activeIndex === -1) return "pending";
    if (stepIndex < activeIndex) return "completed";
    if (stepIndex === activeIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex flex-col gap-2 bg-slate-950/40 p-4 border border-cyan-500/10 rounded-xl my-2">
      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-1.5">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Agentic Orchestration State
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Multi-Step Loop</span>
      </div>
      
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id, idx);
          
          return (
            <div key={step.id} className="flex items-start gap-3 text-left">
              <div className="mt-0.5 flex-shrink-0">
                {status === "completed" && (
                  <span className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-400/50 inline-flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    ✓
                  </span>
                )}
                {status === "active" && (
                  <span className="h-4 w-4 rounded-full bg-cyan-500/20 border border-cyan-400 inline-flex items-center justify-center text-cyan-400 text-[10px] font-bold animate-pulse">
                    ●
                  </span>
                )}
                {status === "pending" && (
                  <span className="h-4 w-4 rounded-full bg-slate-900 border border-white/10 inline-flex items-center justify-center text-slate-600 text-[9px]">
                    ○
                  </span>
                )}
                {status === "error" && (
                  <span className="h-4 w-4 rounded-full bg-rose-500/20 border border-rose-400 inline-flex items-center justify-center text-rose-400 text-[10px] font-bold">
                    ✗
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${status === "active" ? "text-cyan-300" : status === "completed" ? "text-slate-300" : "text-slate-500"}`}>
                    {step.label}
                  </span>
                </div>
                <p className={`text-[11px] leading-tight ${status === "active" ? "text-slate-300" : "text-slate-500"}`}>
                  {step.desc}
                </p>
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
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const abortRef = useRef(null);
  const chatEndRef = useRef(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const sendMessage = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setStreamText("");
    setStreamPhase("starting");
    const controller = new AbortController();
    abortRef.current = controller;
    const userText = input.trim();
    setInput("");

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
      const model =
        providerCfg.selectedModel || cfg.lmstudio?.selectedModel || null;
      const baseUrl =
        providerCfg.endpoint ||
        providerCfg.base_url ||
        (provider === "lmstudio"
          ? "http://127.0.0.1:1234/v1"
          : provider === "opencode"
            ? "https://opencode.ai/zen/v1"
            : null);
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
            setStreamText("");
            setStreamPhase("done");
            loadMessages(session.id).catch(console.error);
          },
          onError: (err) => {
            setStreamPhase("error");
            setStreamText("");
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

      if (e?.status === 404 || /404/.test(String(e?.message || ""))) {
        const created = await chatAPI.createSession("New Workflow Session");
        setSessions((prev) => [
          created,
          ...prev.filter((s) => s.id !== created.id),
        ]);
        setSelectedSessionId(created.id);
        sessionId = created.id;
        try {
          const cfgRaw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
          const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
          const provider = cfg.activeProvider || "lmstudio";
          const providerCfg = cfg[provider] || {};
          const model =
            providerCfg.selectedModel || cfg.lmstudio?.selectedModel || null;
          const baseUrl =
            providerCfg.endpoint ||
            providerCfg.base_url ||
            (provider === "lmstudio"
              ? "http://127.0.0.1:1234/v1"
              : provider === "opencode"
                ? "https://opencode.ai/zen/v1"
                : null);
          const fallback = await chatAPI.sendMessage(sessionId, {
            content: userText,
            provider,
            api_key: providerCfg.key || null,
            base_url: baseUrl,
            model,
          });
          setMessages((prev) => [
            ...prev,
            fallback.user_message,
            fallback.assistant_message,
          ]);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === fallback.session.id ? fallback.session : s,
            ),
          );
          setStreamPhase("done");
          setStreamText("");
          setInput("");
          return;
        } catch (retryError) {
          console.error(retryError);
        }
      }

      try {
        const cfgRaw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
        const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
        const provider = cfg.activeProvider || "lmstudio";
        const providerCfg = cfg[provider] || {};
        const model =
          providerCfg.selectedModel || cfg.lmstudio?.selectedModel || null;
        const baseUrl =
          providerCfg.endpoint ||
          providerCfg.base_url ||
          (provider === "lmstudio"
            ? "http://127.0.0.1:1234/v1"
            : provider === "opencode"
              ? "https://opencode.ai/zen/v1"
              : null);
        const fallback = await chatAPI.sendMessage(sessionId, {
          content: userText,
          provider,
          api_key: providerCfg.key || null,
          base_url: baseUrl,
          model,
        });
        setMessages((prev) => [
          ...prev,
          fallback.user_message,
          fallback.assistant_message,
        ]);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === fallback.session.id ? fallback.session : s,
          ),
        );
        setStreamPhase("done");
        setStreamText("");
        setInput("");
      } catch (fallbackError) {
        console.error(fallbackError);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content:
              "I could not generate a response. Check provider configuration and backend logs.",
            tool_trace: null,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamPhase("error");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const cancelStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setBusy(false);
      setStreamPhase("cancelled");
    }
  };

  return (
    <div className="relative w-full h-full min-h-0">
      <div
        className={`premium-card p-4 flex flex-col h-full min-h-0 transition-[margin-right] duration-300 ${drawerOpen ? "mr-[356px]" : "mr-[76px]"}`}
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
          </div>
        </div>

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
            <>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-4 border min-w-0 ${m.role === "user" ? "ml-16 bg-primary/10 border-primary/30" : "mr-4 bg-white/5 border-white/10"}`}
                  >
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1.5">
                      {m.role}
                    </div>
                    <div className="text-sm">
                      {m.role === "assistant" ? (
                        <ThinkingMessageContent
                          text={m.content || ""}
                          isBusy={false}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}
                    </div>
                    {m.role === "assistant" && m.tool_trace && (
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer text-cyan-300 font-semibold hover:text-cyan-200">
                          View Ingested Context Trace
                        </summary>
                        <pre className="mt-2 p-2.5 rounded-lg bg-black/35 border border-white/10 overflow-x-auto whitespace-pre-wrap text-slate-300">
                          {m.tool_trace}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {busy && (
                  <div className="rounded-2xl p-4 border mr-4 bg-[#081220]/45 border-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.02)] backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>assistant</span>
                    </div>
                    <AgenticStepTracker phase={streamPhase} streamText={streamText} />
                    <div className="text-sm border-t border-white/5 pt-3">
                      <ThinkingMessageContent text={streamText} isBusy={busy} />
                    </div>
                  </div>
                )}
                {!messages.length && (
                  <div className="text-sm text-slate-400">
                    Start a chat session and ask Aurelinx to search, analyze,
                    and update data.
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-auto pt-3 border-t border-white/5">
                <div className="text-xs text-slate-400 mb-2">Attachments:</div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.length === 0 && (
                    <span className="text-xs text-slate-500">none</span>
                  )}
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
                <div className="relative z-10">
                  {/* Pulsing glow background when AI is streaming */}
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
                    {/* Vector Attachment Button */}
                    <label className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0">
                      <Paperclip size={18} />
                      <input
                        type="file"
                        className="hidden"
                        onChange={uploadFile}
                      />
                    </label>

                    {/* Seamless Borderless Input */}
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

                    {/* Vector Send / Stop Action Button */}
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
            </>
          )}
        </div>
      </div>

      <aside
        className={`absolute top-0 right-0 h-full transition-all duration-300 ease-out ${drawerOpen ? "w-[340px]" : "w-[64px]"}`}
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
                        onClick={() => setSelectedSessionId(s.id)}
                      >
                        {s.title}
                      </button>
                      <button
                        onClick={() => renameSession(s.id)}
                        className="p-1 text-slate-300 hover:text-white"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
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
                  onClick={bulkDelete}
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
