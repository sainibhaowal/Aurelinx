import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Sparkles,
  BrainCircuit,
  Target,
  Filter,
  GitCompare,
  Star,
  Cpu,
  Globe,
  DollarSign,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TalentCard from "./TalentCard";
import { UserManualButton } from "./UserManual";
import { analysisAPI, candidatesAPI } from "../services/apiClient";
import PremiumSelect from "./PremiumSelect";

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

const TalentScoutView = () => {
  const SCOUT_CACHE_KEY = "aurelinx_talent_scout_history_v1";
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (
        JSON.parse(window.localStorage.getItem(SCOUT_CACHE_KEY) || "null")
          ?.query || ""
      );
    } catch {
      return "";
    }
  });
  const [results, setResults] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return (
        JSON.parse(window.localStorage.getItem(SCOUT_CACHE_KEY) || "null")
          ?.results || []
      );
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (
        JSON.parse(window.localStorage.getItem(SCOUT_CACHE_KEY) || "null")
          ?.analysis || ""
      );
    } catch {
      return "";
    }
  });
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        window.localStorage.getItem(`${SCOUT_CACHE_KEY}_list`) || "[]",
      );
    } catch {
      return [];
    }
  });
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [selectedTalentLoading, setSelectedTalentLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [shortlist, setShortlist] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        window.localStorage.getItem("aurelinx_scout_shortlist_v1") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [candidateNotes, setCandidateNotes] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(
        window.localStorage.getItem("aurelinx_scout_notes_v1") || "{}",
      );
    } catch {
      return {};
    }
  });
  const [candidateStatus, setCandidateStatus] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(
        window.localStorage.getItem("aurelinx_scout_status_v1") || "{}",
      );
    } catch {
      return {};
    }
  });
  const [scoutRun, setScoutRun] = useState(null);
  const [scoutElapsed, setScoutElapsed] = useState(0);

  useEffect(() => {
    if (!loading || !scoutRun?.startedAt) return undefined;
    const timer = window.setInterval(
      () => setScoutElapsed(Date.now() - scoutRun.startedAt),
      100,
    );
    return () => window.clearInterval(timer);
  }, [loading, scoutRun?.startedAt]);

  const handleSearch = async () => {
    let config = {};
    try {
      const configRaw = localStorage.getItem("AURELINX_PROVIDERS_CONFIG");
      config = configRaw ? JSON.parse(configRaw) : {};
    } catch {
      config = {};
    }

    const activeProvider = (config.activeProvider || "lmstudio").toLowerCase();
    const providerConfig = config[activeProvider] || {};
    const activeKey = providerConfig.key || null;
    const selectedModel =
      providerConfig.selectedModel || config.lmstudio?.selectedModel || null;
    const baseUrl =
      providerConfig.endpoint ||
      providerConfig.base_url ||
      (activeProvider === "lmstudio"
        ? "http://127.0.0.1:1234/v1"
        : activeProvider === "opencode"
          ? "https://opencode.ai/zen/v1"
          : null);

    setLoading(true);
    const startedAt = Date.now();
    setScoutElapsed(0);
    setScoutRun({
      startedAt,
      status: "running",
      searched: null,
      returned: null,
      duration: null,
    });
    try {
      setAnalysis("");
      setResults([]);
      const data = await analysisAPI.analyzeTalent(
        `Analyze this hiring need: ${query}. Use the database to find the best conceptual matches. Provide a summary of WHY they fit.`,
        activeProvider,
        activeKey,
        baseUrl,
        selectedModel,
      );
      setScoutRun({
        startedAt,
        status: "complete",
        searched: data.searched_records ?? null,
        returned: data.returned_records ?? (data.candidates || []).length,
        duration: data.processing_time_ms ?? Date.now() - startedAt,
      });
      setResults(data.candidates || []);
      const saved = {
        query,
        results: data.candidates || [],
        analysis: data.analysis || "",
        savedAt: Date.now(),
      };
      localStorage.setItem(SCOUT_CACHE_KEY, JSON.stringify(saved));
      setHistory((previous) => {
        const next = [
          saved,
          ...previous.filter((item) => item.query !== query),
        ].slice(0, 10);
        localStorage.setItem(`${SCOUT_CACHE_KEY}_list`, JSON.stringify(next));
        return next;
      });

      const fullText = data.analysis || "";
      let index = 0;
      const step = 8;
      const interval = setInterval(() => {
        index += step;
        if (index >= fullText.length) {
          setAnalysis(fullText);
          clearInterval(interval);
        } else {
          setAnalysis(fullText.slice(0, index));
        }
      }, 15);
    } catch (err) {
      console.error(err);
      setScoutRun((previous) =>
        previous
          ? {
              ...previous,
              status: "error",
              duration: Date.now() - previous.startedAt,
            }
          : previous,
      );
      alert(
        "Analysis failed. Check the local LM Studio service or provider configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openTalentDetails = async (cand) => {
    if (!cand?.id) return;

    setSelectedTalentLoading(true);
    try {
      const record = await candidatesAPI.get(cand.id);
      setSelectedTalent(record);
    } catch (err) {
      console.error(err);
    } finally {
      setSelectedTalentLoading(false);
    }
  };

  const resultDepartments = [
    ...new Set(
      results.map((candidate) => candidate.department).filter(Boolean),
    ),
  ].sort();
  const resultRoles = [
    ...new Set(results.map((candidate) => candidate.role).filter(Boolean)),
  ].sort();
  const filteredResults = results.filter(
    (candidate) =>
      (!departmentFilter || candidate.department === departmentFilter) &&
      (!roleFilter || candidate.role === roleFilter) &&
      Number(candidate.match_score ?? 0) >= Number(minMatch),
  );
  const resultEmails = filteredResults
    .map((candidate) => String(candidate.email || "").toLowerCase())
    .filter(Boolean);
  const duplicateEmailCount = resultEmails.length - new Set(resultEmails).size;
  const incompleteCount = filteredResults.filter(
    (candidate) =>
      !candidate.full_name ||
      !candidate.email ||
      !candidate.role ||
      !candidate.department,
  ).length;
  const toggleShortlist = (candidate) => {
    setShortlist((previous) => {
      const next = previous.some((item) => item.id === candidate.id)
        ? previous.filter((item) => item.id !== candidate.id)
        : [...previous, candidate];
      localStorage.setItem("aurelinx_scout_shortlist_v1", JSON.stringify(next));
      return next;
    });
  };
  const toggleCompare = (candidate) =>
    setSelectedIds((previous) =>
      previous.includes(candidate.id)
        ? previous.filter((id) => id !== candidate.id)
        : previous.length < 3
          ? [...previous, candidate.id]
          : previous,
    );
  const saveCandidateNote = (candidateId, value) => {
    const next = { ...candidateNotes, [candidateId]: value };
    setCandidateNotes(next);
    localStorage.setItem("aurelinx_scout_notes_v1", JSON.stringify(next));
  };
  const saveCandidateStatus = (candidateId, value) => {
    const next = { ...candidateStatus, [candidateId]: value };
    setCandidateStatus(next);
    localStorage.setItem("aurelinx_scout_status_v1", JSON.stringify(next));
  };
  const exportCandidates = async (format) => {
    const { generateAurelinxReport } = await import("../utils/reportGenerator");
    generateAurelinxReport(
      {
        employees: [],
        candidates: shortlist.length ? shortlist : filteredResults,
      },
      `Talent Scout export: ${shortlist.length || filteredResults.length} candidate records.`,
      format,
    );
  };

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
            Talent Scout
          </h1>
          <p className="mt-2 max-w-3xl text-sm md:text-base leading-relaxed text-slate-400">
            Search the complete candidate pool and review evidence-backed
            matches.
          </p>
        </div>
        <UserManualButton defaultTab="scout" className="shrink-0 mt-1" />
      </header>

      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Search history
          </span>
          <span className="text-[10px] text-slate-500">
            Stored locally on this device · {history.length}/10
          </span>
        </div>
        {history.length ? (
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 10).map((item) => (
              <button
                key={`${item.query}-${item.savedAt}`}
                onClick={() => {
                  setQuery(item.query);
                  setResults(item.results || []);
                  setAnalysis(item.analysis || "");
                }}
                className="max-w-full truncate rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/40"
                title={item.query}
              >
                {item.query}
                <span className="ml-2 text-[9px] text-slate-500">
                  {new Date(item.savedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No searches saved yet. Your completed searches will appear here.
          </p>
        )}
        {shortlist.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-amber-300">
              Shortlist: {shortlist.length}
            </span>
            {["pdf", "excel", "markdown"].map((format) => (
              <button
                key={format}
                onClick={() => exportCandidates(format)}
                className="rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-300 hover:border-cyan-400/40"
              >
                Export {format}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10 md:mb-12">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Describe your ideal candidate (e.g. 'Senior UI architect with cloud experience')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-11 rounded-xl bg-slate-950/50 border border-white/10 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm"
            />
          </div>
          <button
            className="btn-primary flex items-center justify-center gap-2 min-w-[160px] px-5 h-11 rounded-xl shadow-none text-sm cursor-pointer"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <BrainCircuit size={18} />
            )}
            {loading ? "Analyzing..." : "Scout Talent"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-[0.12em]">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-emerald-400" /> Semantic Engine
            Active
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-cyan-300" /> Global Filters
            Applied
          </div>
        </div>
        {scoutRun && (
          <div
            className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4"
            aria-live="polite"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  Scout pipeline
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Server-side candidate search and evidence ranking · no full
                  database download to the browser
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${scoutRun.status === "error" ? "text-rose-300" : scoutRun.status === "complete" ? "text-emerald-300" : "text-cyan-200"}`}
              >
                {scoutRun.status === "complete"
                  ? `Completed in ${((scoutRun.duration || 0) / 1000).toFixed(1)}s`
                  : scoutRun.status === "error"
                    ? "Failed"
                    : `Running · ${(scoutElapsed / 1000).toFixed(1)}s`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {[
                "Prepare request",
                "Search full pool",
                "Rank evidence",
                "Generate explanation",
                "Return result cards",
              ].map((label, index) => {
                const complete =
                  scoutRun.status === "complete" ||
                  (scoutRun.status === "error" ? index < 2 : index === 0);
                const active = scoutRun.status === "running" && index === 1;
                return (
                  <div
                    key={label}
                    className={`relative rounded-lg border px-3 py-2 ${complete ? "border-emerald-300/25 bg-emerald-300/[0.07]" : active ? "border-cyan-300/45 bg-cyan-300/[0.09]" : "border-white/[0.08] bg-white/[0.025]"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${complete ? "bg-emerald-300/20 text-emerald-200" : active ? "bg-cyan-300/20 text-cyan-100" : "bg-white/[0.08] text-slate-500"}`}
                      >
                        {complete ? "✓" : index + 1}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${complete ? "text-emerald-100" : active ? "text-cyan-100" : "text-slate-500"}`}
                      >
                        {label}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {scoutRun.status === "complete" && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500">
                <span>
                  Database records searched:{" "}
                  <strong className="text-slate-300">
                    {scoutRun.searched ?? "reported by server"}
                  </strong>
                </span>
                <span>
                  Result cards returned:{" "}
                  <strong className="text-slate-300">
                    {scoutRun.returned}
                  </strong>
                </span>
                <span>Full profile data loads only when a card is opened.</span>
              </div>
            )}
          </div>
        )}
        {results.length > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Department
              <PremiumSelect
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="mt-1 h-9"
              >
                <option value="">All departments</option>
                {resultDepartments.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </PremiumSelect>
            </label>
            <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Role
              <PremiumSelect
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="mt-1 h-9"
              >
                <option value="">All roles</option>
                {resultRoles.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </PremiumSelect>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Minimum match score{" "}
              <input
                aria-label="Minimum stored candidate match score"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minMatch}
                onChange={(event) => setMinMatch(event.target.value)}
              />
              <span className="text-xs normal-case tracking-normal text-slate-300">
                Keep scores ≥ {Math.round(minMatch * 100)}% ·{" "}
                <strong className="text-cyan-200">
                  {filteredResults.length} visible
                </strong>
              </span>
            </label>
            <span className="text-[10px] text-slate-500">
              {filteredResults.length} of {results.length} returned ·{" "}
              {duplicateEmailCount} duplicate emails · {incompleteCount}{" "}
              incomplete profiles
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6 md:p-8 mb-10 md:mb-12 border-l-4 border-l-cyan-300 relative"
          >
            <div className="flex items-center gap-3 mb-6 text-cyan-200">
              <Sparkles size={24} />
              <h3 className="text-lg md:text-xl font-bold tracking-tight">
                Aurelinx Intelligence Report
              </h3>
            </div>
            <div className="text-slate-100/90 leading-relaxed text-base md:text-lg max-w-none">
              <MarkdownRenderer>{analysis}</MarkdownRenderer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredResults.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          {filteredResults.map((cand, idx) => (
            <motion.div
              key={cand.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="relative">
                <TalentCard
                  talent={cand}
                  type="candidate"
                  onOpenProfile={() => openTalentDetails(cand)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[10px]">
                  <button
                    onClick={() => toggleShortlist(cand)}
                    className={
                      shortlist.some((item) => item.id === cand.id)
                        ? "text-amber-300"
                        : "text-slate-500 hover:text-amber-300"
                    }
                  >
                    <Star size={12} className="inline" />{" "}
                    {shortlist.some((item) => item.id === cand.id)
                      ? "Shortlisted"
                      : "Shortlist"}
                  </button>
                  <button
                    onClick={() => toggleCompare(cand)}
                    className={
                      selectedIds.includes(cand.id)
                        ? "text-cyan-200"
                        : "text-slate-500 hover:text-cyan-200"
                    }
                  >
                    <GitCompare size={12} className="inline" />{" "}
                    {selectedIds.includes(cand.id) ? "Comparing" : "Compare"}
                  </button>
                  <PremiumSelect
                    value={candidateStatus[cand.id] || "new"}
                    onChange={(event) =>
                      saveCandidateStatus(cand.id, event.target.value)
                    }
                    className="ml-auto w-[110px] text-[9px]"
                  >
                    <option value="new">New</option>
                    <option value="review">Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="rejected">Rejected</option>
                  </PremiumSelect>
                </div>
                <input
                  value={candidateNotes[cand.id] || ""}
                  onChange={(event) =>
                    saveCandidateNote(cand.id, event.target.value)
                  }
                  placeholder="Add review note..."
                  className="mt-2 w-full rounded border border-white/10 bg-slate-950/50 px-2 py-1.5 text-[10px] text-slate-300 outline-none"
                />
              </div>
            </motion.div>
          ))}
        </motion.section>
      )}

      {results.length > 0 && filteredResults.length === 0 && (
        <div className="premium-card mt-4 p-6 text-center text-sm text-slate-400">
          No returned candidates meet the {Math.round(minMatch * 100)}% minimum
          match score. Lower the threshold to see more results.
        </div>
      )}

      {selectedIds.length > 0 && (
        <section className="premium-card mt-8 overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
              Candidate comparison
            </h3>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] text-slate-500 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {selectedIds
              .map((id) =>
                filteredResults.find((candidate) => candidate.id === id),
              )
              .filter(Boolean)
              .map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs"
                >
                  <div className="truncate font-bold text-white">
                    {candidate.full_name}
                  </div>
                  <div className="mt-2 space-y-1 text-slate-400">
                    <div>
                      Match:{" "}
                      <strong className="text-cyan-200">
                        {(Number(candidate.match_score || 0) * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      Sentiment:{" "}
                      <strong className="text-slate-200">
                        {candidate.sentiment_score ?? "N/A"}
                      </strong>
                    </div>
                    <div>Role: {candidate.role || "N/A"}</div>
                    <div>Department: {candidate.department || "N/A"}</div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {selectedTalent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedTalent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-3xl my-8 overflow-hidden rounded-xl border border-blue-500/40 bg-[#0b1329] p-6 md:p-8 text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.5)] shadow-blue-950/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dossier Title */}
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10 text-xs font-mono tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5 font-bold">
                  <Cpu size={12} className="text-blue-400" />
                  CANDIDATE REPORT // CONFIDENTIAL
                </span>
                <span className="text-blue-400 font-bold">
                  MATCH INDEX:{" "}
                  {selectedTalent.match_score != null
                    ? `${(selectedTalent.match_score * 100).toFixed(1)}%`
                    : "PENDING"}
                </span>
              </div>

              {/* Personnel Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Initials Avatar Badge */}
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-900/60 border border-white/5 relative overflow-hidden">
                  <div className="w-20 h-20 rounded-full border border-blue-500/40 flex items-center justify-center bg-slate-950 font-bold text-2xl tracking-wider text-blue-400">
                    {selectedTalent.full_name
                      ? selectedTalent.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "CD"}
                  </div>
                  <div className="text-[9px] font-mono mt-3 tracking-widest text-slate-400 uppercase">
                    Active Directory
                  </div>
                </div>

                {/* Core Details */}
                <div className="md:col-span-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-white mb-1">
                      {selectedTalent.full_name}
                    </h3>
                    <p className="text-slate-300 font-semibold text-sm mb-3">
                      {selectedTalent.role} — {selectedTalent.department}
                    </p>
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Globe size={12} className="text-slate-500" />{" "}
                      {selectedTalent.email}
                    </p>
                  </div>

                  {/* Micro Metadata */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-slate-500">
                    <div>
                      CANDIDATE ID:{" "}
                      <span className="text-slate-300">
                        {selectedTalent.id
                          ? selectedTalent.id.slice(0, 8)
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      APPLY DATE:{" "}
                      <span className="text-slate-300">
                        {selectedTalent.application_date
                          ? new Date(
                              selectedTalent.application_date,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Diagnostics & Salary Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Match Score Progress */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Match Index</span>
                    <span className="text-blue-400 font-bold">
                      {selectedTalent.match_score != null
                        ? `${(selectedTalent.match_score * 100).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-300"
                      style={{
                        width:
                          selectedTalent.match_score != null
                            ? `${selectedTalent.match_score * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 text-right">
                    PROFILE FIT
                  </div>
                </div>

                {/* Sentiment Vector */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Morale Sentiment</span>
                    <span className="text-slate-200 font-bold">
                      {selectedTalent.sentiment_score ?? "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{
                        width: `${(selectedTalent.sentiment_score ?? 0.5) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 text-right">
                    METRIC: INTERVIEW_SCORE
                  </div>
                </div>

                {/* Risk Factor */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-white/5 font-mono flex flex-col justify-between">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                    System Alert
                  </div>
                  <div className="text-xs font-bold tracking-wider text-cyan-400">
                    ACQUISITION_VIABLE
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 text-right">
                    STATUS: EXTERNAL
                  </div>
                </div>
              </div>

              {/* Financial Telemetry (Salary Expectations) */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/20 to-slate-900/60 border border-cyan-500/20 mb-6 font-mono">
                <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <DollarSign size={12} /> COMPENSATION EXPECTATION TELEMETRY
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1">
                    $
                    {selectedTalent.salary
                      ? selectedTalent.salary.toLocaleString()
                      : "110,000"}
                    <span className="text-xs text-slate-500 font-normal">
                      / yr expected base
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 font-bold">
                    MARKET COMPARE:{" "}
                    {((selectedTalent.salary || 110000) / 108000).toFixed(2)}x
                    Avg
                  </div>
                </div>
              </div>

              {/* Cognitive Matrix (Skills) */}
              <div className="mb-6 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">
                  Cognitive Skill Vector Matrix
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(selectedTalent.skills || []).map((skill, idx) => (
                    <div
                      key={`${skill.name}-${idx}`}
                      className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 flex flex-col justify-between"
                    >
                      <div className="text-xs text-slate-300 flex justify-between mb-1">
                        <span>{skill.name}</span>
                        <span className="text-cyan-400 font-bold">
                          Level {skill.level}/5
                        </span>
                      </div>
                      {/* Level Bar meter */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1.5 flex-1 rounded-sm ${
                              lvl <= skill.level
                                ? "bg-cyan-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                                : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!selectedTalent.skills ||
                    selectedTalent.skills.length === 0) && (
                    <div className="col-span-2 text-xs text-slate-500 italic">
                      No skills catalogued.
                    </div>
                  )}
                </div>
              </div>

              {/* Experience timeline */}
              <div className="mb-8 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">
                  Chronological Experience Record
                </div>
                <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
                  {(selectedTalent.experiences || []).map((experience, idx) => (
                    <div
                      key={`${experience.company}-${experience.position}-${idx}`}
                      className="relative"
                    >
                      {/* Glowing timeline node */}
                      <div className="absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border border-cyan-400 bg-slate-950 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          {experience.position}
                        </div>
                        <div className="text-[11px] text-cyan-400/90 mt-0.5 font-bold">
                          {experience.company}{" "}
                          <span className="text-slate-500">//</span>{" "}
                          {experience.duration_years ?? "N/A"} years tenure
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-2 p-2 rounded bg-slate-900/30 border border-white/5">
                          {experience.description ||
                            "No duties specification recorded."}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTalent.experiences ||
                    selectedTalent.experiences.length === 0) && (
                    <div className="text-xs text-slate-500 italic">
                      No historical records in archive.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Action */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10 font-mono text-[10px] text-slate-500">
                <span>AURELINX SECURITY SYSTEM // candidate_dossier_v3</span>
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="h-9 px-5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(45,212,191,0.1)]"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {selectedTalentLoading && !selectedTalent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md premium-card p-6 md:p-8 border border-white/15">
              <div className="text-sm text-slate-300">Loading profile...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TalentScoutView;
