import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  X,
  MessageSquare,
  Search,
  BarChart3,
  Users,
  Network,
  Database,
  Key,
  ShieldAlert,
  Terminal,
  Activity,
  Heart,
  ChevronRight,
  Code
} from "lucide-react";

export const UserManualModal = ({ isOpen, onClose, defaultTab = "overview" }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { id: "overview", label: "Overview & Setup", icon: BookOpen },
    { id: "workflows", label: "Workflow Chat & Agents", icon: MessageSquare },
    { id: "scout", label: "Talent Scout Matchmaker", icon: Search },
    { id: "analytics", label: "Analytics & Sentiment", icon: BarChart3 },
    { id: "directory", label: "Talent Directory", icon: Users },
    { id: "intelligence", label: "Intelligence Center", icon: Network },
    { id: "dataops", label: "Data Ops & Enterprise", icon: Database },
    { id: "integrations", label: "Providers & Webhooks", icon: Key },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <BookOpen className="text-cyan-400 h-5 w-5" /> Aurelius Platform Overview
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Welcome to Aurelius, an enterprise-grade Talent Intelligence & Org Health Platform. Aurelius integrates live business telemetry (Slack, Jira, Workday) with explainable Machine Learning models, policy compliance gates, and cognitive AI agents to help organizations optimize retention and build high-performance teams.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">Quick Start Checklist</h3>
              <ol className="text-xs space-y-2.5 text-slate-200 list-decimal pl-4">
                <li>
                  <strong className="text-white">Configure LLM Provider:</strong> Go to Settings ➔ Providers to set up your OpenAI, Claude, Groq, or local LM Studio connection.
                </li>
                <li>
                  <strong className="text-white">Review Workforce Analytics:</strong> Monitor the Dashboard to inspect attrition risk, morale metrics, and high-risk clusters.
                </li>
                <li>
                  <strong className="text-white">Launch Interventions:</strong> Identify at-risk employees and initiate structured 30/60/90-day mitigation plans.
                </li>
                <li>
                  <strong className="text-white">Setup Data Ingestion:</strong> Connect secure Slack, Jira, and Workday webhooks to sync live workforce events.
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">System Architecture Flow</h3>
              <div className="rounded-xl bg-slate-950/40 border border-white/5 p-4 text-xs font-mono text-cyan-200/90 leading-relaxed">
                [Integrations: Slack/Workday/Jira] ➔ [Webhook Ingestion API] <br />
                &nbsp;&nbsp;➔ [PostgreSQL database] ➔ [ONA Centrality Solvers]<br />
                &nbsp;&nbsp;&nbsp;&nbsp;➔ [Explainable ML Prediction Engine] ➔ [Policy gates Audit]<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;➔ [Agentic Workflows Chat & Client Dashboard]
              </div>
            </div>
          </div>
        );

      case "workflows":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="text-rose-400 h-5 w-5" /> Agentic Workflow Chat
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Workflow Chat is a cognitive agent console. Instead of just answering questions, the agent actively inspects your intent, gathers database parameters, makes decisions, and performs database actions.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Interactive Progress Timeline</h3>
              <p className="text-xs text-slate-300">
                Each chat response triggers a real-time ReAct loop which you can monitor through the following status indicators:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">🧠 1. Thinking</span>
                  Analyzing the intent of your query and mapping scopes.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-purple-300 font-bold block mb-1">📋 2. Planning</span>
                  Verifying credential privileges and building prompt payloads.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-emerald-300 font-bold block mb-1">🔍 3. Exploring</span>
                  Retrieving relevant workforce, ONA, and candidate records.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-amber-300 font-bold block mb-1">🛠️ 4. Modifying</span>
                  Applying SQL database mutations (inserts, updates, moves) if requested.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-red-300 font-bold block mb-1">🔒 5. Verifying</span>
                  Checking target alterations against regional compliance filters.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-green-300 font-bold block mb-1">✓ 6. Completing</span>
                  Streaming final markdown answers and custom data tables.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Example Commands to Use</h3>
              <ul className="text-xs space-y-2 pl-4 list-disc text-slate-200">
                <li><strong className="text-white">Read actions:</strong> <code className="text-cyan-300 bg-black/30 px-1 py-0.5 rounded">"Show me highest risk employees in Sales and explain why"</code></li>
                <li><strong className="text-white">Update risk flags:</strong> <code className="text-cyan-300 bg-black/30 px-1 py-0.5 rounded">"Set employee olivia@public.local risk to true"</code></li>
                <li><strong className="text-white">Modify department:</strong> <code className="text-cyan-300 bg-black/30 px-1 py-0.5 rounded">"Move Liam Parker to Human Resources department"</code></li>
                <li><strong className="text-white">Insert records:</strong> <code className="text-cyan-300 bg-black/30 px-1 py-0.5 rounded">"Add employee Silas Vance, email silas@aurelius.com, role Lead developer, department Technical"</code></li>
              </ul>
            </div>
          </div>
        );

      case "scout":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Search className="text-cyan-400 h-5 w-5" /> Talent Scout Matchmaker
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Talent Scout employs a hybrid skill ontology solver. It matches candidate CVs against target positions by conceptual alignment, resolving skill gaps and evaluating organizational fit.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">How to Run a Search</h3>
              <ol className="text-xs space-y-2 text-slate-200 list-decimal pl-4">
                <li>Enter a conceptual description of your hiring need (e.g., <em className="text-cyan-300">"Looking for a Senior Python backend engineer with database experience"</em>).</li>
                <li>Click the <strong className="text-white">Scout Talent</strong> button.</li>
                <li>The system retrieves match configurations, ranks candidate profiles, and starts **typewriter token streaming** to output the intelligence brief.</li>
                <li>Inspect candidate profiles by clicking on cards to view their full credentials, email, morale scores, and career history.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> Retention Aware Recruiting
              </h4>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                Aurelius Talent Scout integrates directory metrics. If a candidate matches, the system evaluates their target department's morale, attrition rate, and workload density to warning leaders of potential early burnout risks before hire.
              </p>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="text-emerald-400 h-5 w-5" /> Analytics & Sentiment Pulse
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Aurelius performs continuous statistical modeling on your organization. The metrics stream live over Server-Sent Events (SSE) directly from active database logs.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Core Sentiment Calculations</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Burnout Risk Vector</strong>
                  Calculates potential burnout using employee risk indicators and sentiment:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Burnout = (at_risk_ratio * 0.7) + ((1.0 - avg_sentiment) * 0.3)
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Talent Density Score</strong>
                  Measures organizational distribution balance:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Density = 1.0 - (largest_dept_count / total_workforce)
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Leadership Trust</strong>
                  Estimates alignment with management based on morale and retention averages:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Trust = (avg_retention_prob * 0.6) + (avg_sentiment * 0.4)
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-none mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-300">Predictive Risk warning</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  If the overall risk percentage of your workforce exceeds 20%, the system status auto-escalates to **Level 3 (High)** and warns administrators to review ONA bottlenecks.
                </p>
              </div>
            </div>
          </div>
        );

      case "directory":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Users className="text-purple-400 h-5 w-5" /> Talent Directory
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Directory is the central point-of-truth for your workforce. It aggregates both full-time employees and candidate records into a unified filtering layout.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">How to Use the Directory</h3>
              <ul className="text-xs space-y-2 text-slate-200 list-disc pl-4">
                <li>Use tabs at the top (<strong className="text-white">All / Employees / Candidates</strong>) to slice the lists.</li>
                <li>Filter records in real-time using search queries for name, role, or department.</li>
                <li>Quickly review risk levels (<span className="text-red-400 font-bold">AT-RISK</span> vs <span className="text-emerald-400 font-bold">OPTIMAL</span>) for every individual at a glance.</li>
                <li>Click the <strong className="text-white">Quick PDF</strong> button to generate printable executive personnel matrices.</li>
              </ul>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block mb-1">Healing Tip:</strong>
              If you notice an employee is incorrectly listed as AT-RISK, you can click on their profile, launch an intervention, or use the **Workflow Chat** to modify their status:
              <code className="block mt-2 p-1.5 bg-black/40 text-cyan-300 rounded font-mono">
                "Set employee [email] risk to false"
              </code>
            </div>
          </div>
        );

      case "intelligence":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Network className="text-pink-400 h-5 w-5" /> Intelligence Center & ONA
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Intelligence Center computes Organizational Network Analysis (ONA) using Dijkstra paths, PageRank influence indexes, and Brandes Betweenness centrality solvers.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Interactive Centrality Graph</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The network graph is fully interactive. Node size corresponds to the employee's PageRank influence index, and edge connections map actual PR code reviews and Jira collaborations:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-200 list-disc pl-4">
                <li><strong className="text-white">Betweenness Centrality:</strong> Exposes employees who act as information brokers. High brokerage combined with low morale indicates critical attrition bottlenecks.</li>
                <li><strong className="text-white">PageRank Centrality:</strong> Highlights key decision-makers who hold high structural value inside the organization.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Compliance Approval Gates</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                High-impact interventions or structural updates (such as releasing department reorganizations) trigger **Mandatory Policy Pack Gates**. These gates require administrative override keys to authorize releases.
              </p>
            </div>
          </div>
        );

      case "dataops":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Database className="text-cyan-400 h-5 w-5" /> Data Ops & Enterprise Console
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Enterprise Console contains raw pipeline registries, telemetry logs, model cards, and structural simulation sandboxes.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Key Data Ops Surfaces</h3>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Raw Ingest Event Table</strong>
                  Inspects raw sync event logs from webhooks prior to schema normalization.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Quarantine Event Logs</strong>
                  Contains transactions that failed validation constraints or schema structural integrity checks, preventing database corruption.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Scenario Simulator</strong>
                  Runs forecasting scenarios (e.g. reorg attrition estimates) to project workforce impact.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">ML Model Cards</strong>
                  Lists active prediction metrics: PR-AUC, calibration error charts, and fairness gap diagnostics.
                </div>
              </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Key className="text-amber-400 h-5 w-5" /> Providers & Webhook Registry
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Connect Aurelius directly to external HRIS and communication suites. Secure connections use token headers and HMAC payload signatures.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Ingestion Webhooks</h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">Slack Morale API</strong>
                  Endpoint: <code className="text-cyan-300">/api/v1/integrations/slack</code> <br />
                  Ingests sentiment scores and message counts to dynamically adjust employee risk parameters.
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">Workday HRIS Sync</strong>
                  Endpoint: <code className="text-cyan-300">/api/v1/integrations/workday</code> <br />
                  Syncs hiring events, role changes, and technical skill libraries.
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">Jira Activity API</strong>
                  Endpoint: <code className="text-cyan-300">/api/v1/integrations/jira</code> <br />
                  Ingests ticket assignment collaborations to construct ONA coordinates.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">How to Integrate</h3>
              <ol className="text-xs space-y-1.5 text-slate-200 list-decimal pl-4">
                <li>Create an API Token in Settings ➔ Integrations. Copy the key securely.</li>
                <li>Add webhooks in Slack, Jira, or Workday pointing to the endpoints above.</li>
                <li>Add header <code className="text-cyan-300">X-API-Key: [your_api_key]</code> on webhook requests.</li>
                <li>Include <code className="text-cyan-300">X-Signature</code> with SHA-256 HMAC of the body using the API key as secret for signature verification.</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-4xl h-[85vh] premium-card border border-white/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-cyan-400" />
                <div>
                  <h1 className="text-lg font-black text-white leading-none">Aurelius System User Manual</h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Operational Guide & Telemetry Handbooks</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/10 bg-slate-950/30 overflow-y-auto p-3 space-y-1 flex-none hidden md:block">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 py-2">
                  Manual Sections
                </div>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/25"
                          : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Icon size={16} className={isActive ? "text-cyan-400" : "text-slate-400"} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/10">
                {/* Mobile Tab Selector */}
                <div className="md:hidden mb-6">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs text-white outline-none"
                  >
                    {tabs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {renderContent()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-between items-center text-[10px] text-slate-400">
              <div>Aurelius Core Version v4.1.0-Release</div>
              <div className="flex items-center gap-1.5">
                <Code size={12} className="text-cyan-400" /> Grounded in ONA, ML, and Policy compliance
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const UserManualButton = ({ defaultTab, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer ${className}`}
        title="Open User Manual"
      >
        <BookOpen size={14} className="text-cyan-400" />
        <span>Manual</span>
      </button>

      <UserManualModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={defaultTab}
      />
    </>
  );
};
