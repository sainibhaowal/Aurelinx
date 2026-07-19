import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Sparkles,
  BrainCircuit,
  Target,
  Filter,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TalentCard from "./TalentCard";
import { UserManualButton } from "./UserManual";
import { analysisAPI, candidatesAPI } from "../services/apiClient";

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

const TalentScoutView = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [selectedTalentLoading, setSelectedTalentLoading] = useState(false);

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
      setResults(data.candidates || []);
      
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

  return (
    <div className="w-full">


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

      {results.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          {results.map((cand, idx) => (
            <motion.div
              key={cand.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <TalentCard
                talent={cand}
                type="candidate"
                onOpenProfile={() => openTalentDetails(cand)}
              />
            </motion.div>
          ))}
        </motion.section>
      )}

      <AnimatePresence>
        {selectedTalent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedTalent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-2xl premium-card p-6 md:p-8 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-extrabold mb-2">
                {selectedTalent.full_name}
              </h3>
              <p className="text-slate-300 mb-6">
                {selectedTalent.role} - {selectedTalent.department}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Email
                  </div>
                  <div>{selectedTalent.email || "N/A"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Retention
                  </div>
                  <div>
                    {selectedTalent.retention_prob
                      ? `${(selectedTalent.retention_prob * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Sentiment
                  </div>
                  <div>{selectedTalent.sentiment_score ?? "N/A"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Risk
                  </div>
                  <div>
                    {selectedTalent.is_at_risk
                      ? "High Attrition Risk"
                      : "Optimal Retention"}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Top Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedTalent.skills || [])
                    .slice(0, 12)
                    .map((skill, idx) => (
                      <span
                        key={`${skill.name}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                      >
                        {skill.name} (L{skill.level})
                      </span>
                    ))}
                  {(!selectedTalent.skills ||
                    selectedTalent.skills.length === 0) && (
                    <span className="text-slate-400 text-sm">
                      No skills found.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                >
                  Close
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
