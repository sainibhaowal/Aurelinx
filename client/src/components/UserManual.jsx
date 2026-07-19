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
  Code,
  PieChart,
  TrendingUp,
  Cpu,
  Brain,
  Zap
} from "lucide-react";

const MATH_ENGINE_PIPELINE_ASCII = `+---------------------------------------------------------------------------------+
|                                USER INPUT STAGE                                 |
|  [Define Skill Node] + [Proficiency Scale] + [Budget Limit] + [Max Team Size]   |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            1. SEMANTIC ADJACENCY RESOLVER                       |
|   * Dijkstra shortest path finder computes similarity weight distance matrix.   |
|   * Resolves conceptual transfers: [Vue.js] --> [JS] --> [React]                |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            2. COMBINATORIAL TEAM BUILDER                        |
|   * Simulated Annealing starts global exploration at high temperature (T).      |
|   * Roster perturbation swaps candidates to optimize overall capability cost.   |
|   * Cools parameter T to converge on global budget/skill optima.               |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            3. SURVIVAL SANDBOX FORECASTER                       |
|   * Applies Cox Proportional Hazards Model to predict attrition probability.    |
|   * Computes Hazard Ratios: HR = exp(B1*Morale + B2*Salary + B3*Workload).      |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                               OUTPUT RESULTS STAGE                              |
|   * Optimal Team Roster + Learning Paths + 12-Month Retention Probabilities      |
+---------------------------------------------------------------------------------+`;

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
                <BookOpen className="text-cyan-400 h-5 w-5" /> Aurelinx Platform Overview
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Welcome to Aurelinx, an enterprise-grade Talent Intelligence & Org Health Platform. Aurelinx integrates live business telemetry (Slack, Jira, Workday) with explainable Machine Learning models, policy compliance gates, and cognitive AI agents to help organizations optimize retention and build high-performance teams.
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
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="text-rose-400 h-5 w-5" /> Agentic Workflow Chat
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Workflow Chat is Aurelinx's cognitive agent console. Rather than a static conversational bot, this agent dynamically inspects your intent, executes database commands, checks compliance rules, and mutates tables in real-time.
              </p>
            </div>

            {/* Core Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-black text-pink-300 block flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" /> Database Mutations (Write Ops)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Administrators can write, modify, or relocate resources using natural language. The agent translates prompt instructions into SQL transactions.
                </p>
              </div>

              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-black text-rose-300 block flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" /> RBAC Security & Safety
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Every mutation check is gated by Role-Based Access Control (RBAC). General members are blocked from executing mutations. Critical actions (like deletion) trigger mandatory safety blocks.
                </p>
              </div>
            </div>

            {/* Architecture Flowchart */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-400" /> Workflows Agent Ingestion & Retrieval Pipeline
              </h3>
              
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="relative pl-6 border-l border-white/10 space-y-6">
                  
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-cyan-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest block">1. INGESTION ENGINE</span>
                    <h5 className="text-xs text-white font-bold mt-0.5">Context Gathering & Parser</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Accepts user natural language prompts + rich file attachments (PDFs, DOCX, CSV, Image OCR).</p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-purple-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest block">2. INTENT CLASSIFIER</span>
                    <h5 className="text-xs text-white font-bold mt-0.5">Dynamic Tool Policy</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Decides whether the query requests a readonly database search, summary metrics snapshot, or administrative write transactions.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">3. RBAC & SECURITY CHECK</span>
                    <h5 className="text-xs text-white font-bold mt-0.5">Compliance Gatekeeper</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Authenticates user privileges. Blocks write operations for regular members and redirects deletion operations to human-in-the-loop gates.</p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">4. TRANSACTION LAYER</span>
                    <h5 className="text-xs text-white font-bold mt-0.5">PostgreSQL Execution</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Commits data mutations, runs skills similarity searches, or imports batch CSV rosters directly into Postgres.</p>
                  </div>

                  {/* Step 5 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-rose-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest block">5. GENERATIVE STREAM</span>
                    <h5 className="text-xs text-white font-bold mt-0.5">SSE Token Typewriter</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Integrates tool query outcomes with conversation logs and streams real-time Markdown via Server-Sent Events.</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Parsing & Uploads */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Attachment Parsing Engines</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you drag and drop attachments into the chat input, the backend parses them using specific libraries depending on file suffix:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300 list-disc pl-4">
                <li><strong className="text-white">TXT / MD / LOG / JSON:</strong> Ingested directly as UTF-8 text strings.</li>
                <li><strong className="text-white">PDF Documents:</strong> Parsed using <code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">pypdf</code> page-by-page.</li>
                <li><strong className="text-white">Word Documents (DOCX):</strong> Read paragraph-by-paragraph using <code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">python-docx</code>.</li>
                <li><strong className="text-white">Images (PNG / JPG / JPEG):</strong> Extracted using Tesseract OCR (<code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">pytesseract</code>).</li>
                <li><strong className="text-white">CSV files:</strong> Parsed and automatically imported into PostgreSQL as either candidate or employee profiles based on status headers.</li>
              </ul>
            </div>

            {/* Supported Commands */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Data Mutations Command Reference</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Admins can input the following commands directly into the workflow chat to alter PostgreSQL database values:
              </p>
              
              <div className="space-y-3.5 text-xs">
                {/* Command 1 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">Set Employee Risk Flags</span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Set employee liam@aurelinx.com risk to true"
                  </code>
                </div>

                {/* Command 2 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">Reorganize Personnel Departments</span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Move employee olivia@public.local to department Engineering"
                  </code>
                </div>

                {/* Command 3 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">Add New Workforce Entries</span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Add employee Silas Vance, email silas@aurelinx.com, role Lead Developer, dept Technical"
                  </code>
                </div>

                {/* Command 4 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">Configure Integration Connections</span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Add connection Slack Sync, provider slack, type messaging"
                  </code>
                </div>
              </div>
            </div>

            {/* Deletion Warning */}
            <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-none mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-red-300">Human-in-the-Loop Safe Aborts</h4>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  **Aurelinx Governance Protocol:** The agent is strictly prohibited from executing deletion operations (<code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">delete</code>, <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">remove</code>, or <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">purge</code>) under any circumstances. If requested, the pipeline safely aborts the operation, prompting the administrator to verify the deletion manually.
                </p>
              </div>
            </div>
          </div>
        );

      case "scout":
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Search className="text-cyan-400 h-5 w-5" /> Talent Scout Matchmaker
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Talent Scout is the intelligent search and matchmaking component of Aurelinx, designed to connect high-level conceptual roles with matching personnel profiles.
              </p>
            </div>

            {/* Why Talent Scout? */}
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Why Talent Scout? The Failure of Keyword Searches
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Standard hiring software uses rigid **keyword matching**. If you search for <em>"Python developer"</em>, a resume containing <em>"FastAPI expert"</em> or <em>"Django engineer"</em> might be completely ignored simply because the exact word "Python" wasn't found.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Talent Scout solves this</strong> by using semantic token overlap and AI reasoning. It matches candidates based on the <em>concepts</em> and <em>context</em> of their skills, identifying suitable hires who would otherwise be filtered out.
              </p>
            </div>

            {/* Flow Diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" /> Talent Scout Matchmaking Pipeline
              </h3>
              
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      1
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">INPUT STAGE</span>
                    <h6 className="text-xs text-white font-bold mt-1">Natural Query</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Accepts natural prompts, extracts skill/role/dept tokens.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      2
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">MATCHING</span>
                    <h6 className="text-xs text-white font-bold mt-1">Token Scoring</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Intersects search tokens with Postgres skill sets, roles, & CV match scores.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      3
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">SAFETY</span>
                    <h6 className="text-xs text-white font-bold mt-1">Retention Filter</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Evaluates target department workload & morale levels to prevent placement shocks.</p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      4
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">OUTPUT STAGE</span>
                    <h6 className="text-xs text-white font-bold mt-1">LLM Summary Brief</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Typewriter streams recommendation rationales, strengths, and candidate gap warning matrices.</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Core Calculations & Math */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Under the Hood: Score Calculations</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a search is submitted, the matching engine extracts tokens from your query and calculates match weights differently for candidates and employees:
              </p>
              
              <div className="space-y-3.5 text-xs">
                {/* Employee Score */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">👥 Internal Employees Scoring Formula</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Internal profiles are matched to identify transfer opportunities. Sentiment is heavily weighted to help prevent burnout, and active risks are penalized:
                  </p>
                  <div className="font-mono text-[10px] text-cyan-300 bg-black/20 p-2 rounded leading-normal">
                    Score = (Skill_Hits * 2.5) + (Role_Hits * 2.0) + (Dept_Hits * 1.2) + (Sentiment_Score * 1.1) - (0.6 if At_Risk)
                  </div>
                </div>

                {/* Candidate Score */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">👤 External Candidates Scoring Formula</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    External resumes are ranked primarily based on technical fit, combining search overlap with their pre-calculated CV parse score:
                  </p>
                  <div className="font-mono text-[10px] text-cyan-300 bg-black/20 p-2 rounded leading-normal">
                    Score = (Skill_Hits * 2.6) + (Role_Hits * 2.1) + (Dept_Hits * 1.3) + (Sentiment_Score * 1.0) + (Match_Score * 1.8)
                  </div>
                </div>
              </div>
            </div>

            {/* The Intelligence Brief */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">What You Get: The AI Scout Brief</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rather than displaying raw data grids, the matched candidate payloads are sent to an LLM provider of choice. The system streams a typewriter brief containing:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                <li><strong className="text-white">Best Overall Match:</strong> Identifies the single best candidate and provides a detailed rationale.</li>
                <li><strong className="text-white">Strengths of Top 3:</strong> Breaks down specific skill advantages and match factors.</li>
                <li><strong className="text-white">Risks & Gaps:</strong> Warns you of potential skill gaps (e.g. candidate lacks cloud experience) or onboarding issues.</li>
                <li><strong className="text-white">Final Recommendation:</strong> Clear, actionable advice on next interview steps or job offers.</li>
              </ul>
            </div>

            {/* Retention-Aware Warning */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> Retention-Aware Onboarding
              </h4>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                **Aurelinx is built on safety.** When a candidate matches a role, the system analyzes the target department's morale, workload, and attrition trends. If a candidate is placed into a team with high burnout, the engine flags a warning, advising leadership to stabilize the team prior to onboarding.
              </p>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="text-emerald-400 h-5 w-5" /> Sentiment Intelligence & Org Pulse
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Sentiment Intelligence is the core forecasting engine of Aurelinx. It maps the continuous emotional health of your workforce by analyzing active communication streams.
              </p>
            </div>

            {/* Why Sentiment / Why Aurelinx Section */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Why Sentiment? The Philosophy of Aurelinx
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Traditional organizations rely on **annual surveys** to measure company culture. Surveys fail because they suffer from <em>recency bias</em>, <em>low participation rates</em>, and are <em>too late</em>—by the time the survey is analyzed, key talent has already resigned.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Aurelinx was built to solve this.</strong> It replaces static surveys with passive, privacy-preserving **live sentiment telemetry**. By scanning the emotional tone of collaboration logs, Aurelinx detects early warning signs of burnout, team conflict, and career dissatisfaction in real-time.
              </p>
            </div>

            {/* Visual Sentiment Pipeline Diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" /> Sentiment Intelligence Flow
              </h3>
              
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  
                  {/* Step A */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      A
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">TELEMETRY INGEST</span>
                    <h6 className="text-xs text-white font-bold mt-1">Raw Ingestion</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Pipes active communications from Slack, Jira commits, and Git messages.</p>
                  </div>

                  {/* Step B */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      B
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">NLP PARSER</span>
                    <h6 className="text-xs text-white font-bold mt-1">Valence Mapping</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Applies rolling sentiment vectors to identify communication moods.</p>
                  </div>

                  {/* Step C */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      C
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">TELEMETRY SOLVER</span>
                    <h6 className="text-xs text-white font-bold mt-1">Three Pillars</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Calculates current morale, velocity trends, and communication confidence.</p>
                  </div>

                  {/* Step D */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      D
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">THREAT CLASSIFIER</span>
                    <h6 className="text-xs text-white font-bold mt-1">Macro Status Index</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Aggregates flagged ratios to assign overall Level 1, 2, or 3 priority alerts.</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Core Metrics: Score, Velocity, Confidence */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">The Three Pillars of Live Indicators</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelinx measures three independent values to generate high-fidelity, actionable employee profiles:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pillar 1 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-cyan-300 block">📊 Current Score (1.0 - 5.0)</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The moving average of emotional valence from recent workspace posts. A score of <strong>5.0</strong> indicates high motivation, while <strong>1.0</strong> indicates severe disengagement.
                  </p>
                  <div className="text-[10px] font-mono text-cyan-300 bg-black/30 p-1.5 rounded">
                    Score = (Σ Positive) / (Σ Total Messages)
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-purple-300 block">⚡ Velocity (dM/dt)</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The rate of change of morale over a rolling 7-day window. A negative velocity means morale is plummeting, while positive velocity indicates improvement.
                  </p>
                  <div className="text-[10px] font-mono text-purple-300 bg-black/30 p-1.5 rounded">
                    Velocity = ΔScore / ΔTime
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-emerald-300 block">🎯 Confidence Level (0% - 100%)</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Represents the reliability of the score. If an employee messages frequently, confidence is 90%+. If they write very little, the score defaults to neutral with low confidence.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-300 bg-black/30 p-1.5 rounded">
                    Confidence = min(1.0, msg_count / 15)
                  </div>
                </div>
              </div>
            </div>

            {/* System Status and Intervention Priorities */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Dashboard Telemetry & Priority Rules</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Sentiment Intelligence view displays two primary cards at the top representing macro-level metrics, and a table below for granular indicators:
              </p>
              <div className="space-y-4 text-xs">
                
                {/* System Status (Left Card) */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-primary" /> System Status (Live Telemetry)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This left card displays the raw live telemetry counts ingested by the Aurelinx pipeline:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">Total Analyzed:</strong> Count of employees currently tracked by sentiment telemetry.</li>
                    <li><strong className="text-slate-300">Current Average Sentiment:</strong> The rolling organizational morale average (scaled 1.0 to 5.0).</li>
                    <li><strong className="text-slate-300">Flagged Profiles:</strong> Total count of employees actively marked as "At Risk" based on low morale or high attrition probability.</li>
                  </ul>
                </div>

                {/* Intervention Priority (Right Card) */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Intervention Priority (Dynamic Ranking)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This right card represents the <strong>macro organizational threat level</strong>. It calculates the company-wide At-Risk Ratio (ratio of flagged employees to the total workforce) and maps it into three priority tiers:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-emerald-300">Level 1 (Healthy/Safe):</strong> At-risk ratio is <strong className="text-emerald-300">&lt; 10%</strong>. Morale is balanced across departments.
                    </li>
                    <li>
                      <strong className="text-amber-300">Level 2 (Caution/Warning):</strong> At-risk ratio is <strong className="text-amber-300">10% - 20%</strong>. Triggers early warning review for department workloads.
                    </li>
                    <li>
                      <strong className="text-rose-400">Level 3 (Critical/Risk):</strong> At-risk ratio is <strong className="text-rose-400">&ge; 20%</strong>. Auto-escalates systemic risk, warning administrators of attrition bottlenecks.
                    </li>
                  </ul>
                </div>

                {/* Individual Profile Priorities */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">🚨 Individual Employee Intervention Priority</strong>
                  <p className="text-slate-300 leading-relaxed">
                    Within the talent directory and profiles, individual employees are ranked to determine how urgently HR must step in. This is calculated using a combination of Attrition Risk (ML) and ONA Betweenness Centrality:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 mt-2">
                    <div className="p-2 bg-red-500/10 border border-red-500/25 rounded">
                      <span className="text-red-400 font-bold block">CRITICAL Priority</span>
                      ML Risk &gt; 80%, low morale, and high PageRank influence bottleneck.
                    </div>
                    <div className="p-2 bg-orange-500/10 border border-orange-500/25 rounded">
                      <span className="text-orange-400 font-bold block">HIGH Priority</span>
                      ML Risk &gt; 50% with declining velocity.
                    </div>
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/25 rounded">
                      <span className="text-yellow-400 font-bold block">MEDIUM Priority</span>
                      Moderately high risk with stable velocity.
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/25 rounded">
                      <span className="text-blue-400 font-bold block">LOW Priority</span>
                      Low attrition likelihood; normal telemetry logs.
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Organizational Analytics & Workforce Distribution */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <PieChart className="text-cyan-400 h-4 w-4" /> Organizational Analytics & Workforce Distribution
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The **Organizational Analytics** view aggregates individual employee risk telemetry to map macro department-level health and workforce layout.
              </p>

              {/* High-Level Diagram */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-3 text-xs text-slate-300">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Organizational Analytics Processing Flow
                </span>
                <div className="flex flex-col gap-2.5">
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-cyan-300 block">1. WORKFORCE REGISTRATION (N)</span>
                    <span className="text-[10px] text-slate-400 block">Total database profiles registered across Active Departments.</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-purple-300 block">2. RISK DISTRIBUTION CALCULATOR</span>
                    <span className="text-[10px] text-slate-400 block">Flags employees as at-risk and calculates department concentrations.</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-emerald-300 block">3. PREDICTIVE RISK VECTOR</span>
                    <span className="text-[10px] text-slate-400 block">Calculates the total organization Risk Coefficient (LOW, MEDIUM, HIGH).</span>
                  </div>
                </div>
              </div>

              {/* Detailed Variable Breakdown */}
              <div className="space-y-3 text-xs">
                {/* Total Workforce */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">👥 Total Workforce (N)</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The absolute number of active internal staff profiles. This acts as the denominator ($N$) for all organizational ratios.
                  </p>
                </div>

                {/* At-Risk Employees */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">⚠️ At-Risk Employees</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Employees actively flagged as flight risks. An individual is marked as "At Risk" when their calculated retention probability falls below target thresholds, indicating burnout, declining morale, or low engagement signals.
                  </p>
                </div>

                {/* Active Departments */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">🏢 Active Departments & Workforce Distribution</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Measures the count of administrative divisions. Department distribution is computed by dividing the number of members in a specific department by the total workforce ($N$):
                  </p>
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Distribution % = (Department Member Count / Total Workforce) * 100
                  </div>
                </div>

                {/* Predictive Risk Vector */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">🔮 Predictive Risk Vector & Risk Coefficient</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Unlike historical metrics that analyze why people *left*, the **Predictive Risk Vector** uses active telemetry (Jira workload density, Slack mood shifts) to forecast who is *likely* to leave in the next 90 days. The **Risk Coefficient** categorizes this threat level:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 text-[10px] mt-1">
                    <li><strong className="text-slate-300">LOW Risk Coefficient:</strong> Overall organization at-risk ratio &lt; 10%.</li>
                    <li><strong className="text-slate-300">MEDIUM Risk Coefficient:</strong> Overall organization at-risk ratio between 10% and 20%.</li>
                    <li><strong className="text-slate-300">HIGH Risk Coefficient:</strong> Overall organization at-risk ratio &ge; 20%.</li>
                  </ul>
                </div>

                {/* Risk Concentration */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">📍 Highest Department Risk Concentration</strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Isolates which department holds the densest cluster of at-risk employees (e.g. <em>"Sales currently has the highest risk concentration at 40.0%"</em>). It is calculated as:
                  </p>
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Dept Risk Concentration % = (At-Risk Employees in Department / Total Employees in Department) * 100
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10px] mt-1.5">
                    <strong>Why it matters:</strong> If risk is clustered in a single team (e.g. Sales), the root cause is likely localized (e.g., poor local management, unreasonable quota pressures) rather than systemic company-wide culture issues. This helps target remedial training precisely.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Calculations */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Mathematical Model Formulations</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">Burnout Risk Vector</strong>
                  Calculates potential burnout using employee risk indicators and sentiment:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Burnout = (at_risk_ratio * 0.7) + ((1.0 - (avg_sentiment / 5.0)) * 0.3)
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
                    Trust = (avg_retention_prob * 0.6) + ((avg_sentiment / 5.0) * 0.4)
                  </div>
                </div>
              </div>
            </div>

            {/* Warning block */}
            <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-none mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-300">Predictive Risk Warning</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  If the overall risk percentage of your workforce exceeds 20%, the system status auto-escalates to **Level 3 (High)** and warns administrators to review ONA bottlenecks.
                </p>
              </div>
            </div>
          </div>
        );

      case "directory":
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Users className="text-purple-400 h-5 w-5" /> Talent Directory
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Talent Directory is Aurelinx's primary analytical gateway. It acts as a unified interface that aggregates live organizational telemetry, predictive machine learning models, and skills inventory.
              </p>
            </div>

            {/* ONA Deep Dive Feature Card */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <Network className="h-4 w-4 text-purple-400" /> Focus: Organizational Network Analysis (ONA)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>What is ONA?</strong> ONA stands for <strong>Organizational Network Analysis</strong>. Rather than viewing a company as a flat list or static hierarchy, ONA models the organization as a living network of nodes (employees) and edges (interactions like Slack messages, Jira ticket collaborations, and Git code reviews).
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                By tracking these connections, Aurelinx detects who is doing the heavy lifting, who acts as an key information broker, and who is structurally isolated. When an employee with high network value (many incoming collaboration links) displays low morale, the system flags them as high-risk, as their departure would cause a major communication gap.
              </p>
            </div>

            {/* Architecture flow diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-purple-400" /> Data Processing & Attrition Pipeline
              </h3>
              
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      1
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">TELEMETRY</span>
                    <h6 className="text-xs text-white font-bold mt-1">Telemetry Ingest</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Aggregates Slack logs, Jira assignments, Git commits, & Workday profiles.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      2
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">INTELLIGENCE</span>
                    <h6 className="text-xs text-white font-bold mt-1">Scoring Models</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Calculates NLP communication sentiment & ML Attrition Risk probability.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      3
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">STATE CONTROL</span>
                    <h6 className="text-xs text-white font-bold mt-1">Aggregation</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Categorizes employee profiles into OPTIMAL or AT-RISK classification pools.</p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      4
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">HR INITIATIVE</span>
                    <h6 className="text-xs text-white font-bold mt-1">Direct Action</h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Enables structured 30/60/90-day intervention setups and exportable PDF Briefings.</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Terms Glossary / Acronym Guide */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Acronyms & Technical Glossary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-purple-300 block mb-1">ONA (Organizational Network Analysis)</strong>
                  Study of communication and collaboration networks to map communication patterns, influence nodes, and systemic bottlenecks.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-cyan-300 block mb-1">NLP (Natural Language Processing)</strong>
                  AI algorithms that analyze human language text to classify communication tone as positive, negative, or neutral.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-emerald-300 block mb-1">ML (Machine Learning)</strong>
                  Algorithms that study historical features to predict future probabilities, such as attrition risks.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-pink-300 block mb-1">HRIS (Human Resources Info System)</strong>
                  Core systems of record (like Workday) tracking employment, compensation, job hierarchies, and roles.
                </div>
              </div>
            </div>

            {/* Core Classification: Employees vs Candidates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="text-cyan-400 h-4 w-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">Employees</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Internal workforce resources. Evaluated using ONA (Organizational Network Analysis) connection graphs, live sentiment analysis, and continuous performance and attrition modeling.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="text-pink-400 h-4 w-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">Candidates</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  External database of applicants. Indexed conceptual profiles matched against jobs using semantic distance algorithms in the Talent Scout.
                </p>
              </div>
            </div>

            {/* Metrics Breakdown: Sentiment & Risk Probability */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Understanding Directory Metrics</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block text-xs mb-1">💬 Morale Sentiment (Scale: 1-5)</strong>
                  <p className="text-slate-300 leading-relaxed">
                    This represents the qualitative emotional state of the individual.
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">How it works:</strong> Natural Language Processing (NLP) runs continuously on collaboration logs (Slack messages, commit descriptions, ticket updates).</li>
                    <li><strong className="text-slate-300">Interpretation:</strong> <code className="text-red-300">1-2</code> indicates poor morale, potential dissatisfaction, or conflict. <code className="text-emerald-300">4-5</code> indicates strong engagement and satisfaction.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block text-xs mb-1">⚠️ Attrition Risk Probability (Percentage: 0% - 100%)</strong>
                  <p className="text-slate-300 leading-relaxed">
                    This represents the likelihood of an employee leaving the company within the next 90 days.
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-400">
                    <li><strong className="text-slate-300">How it works:</strong> The machine learning model processes active indicators: sentiment trends, PageRank (influence bottleneck), work overload (commit rates), and interaction volume.</li>
                    <li><strong className="text-slate-300">Why the name:</strong> It directly maps the calculated threat percentage to help HR prioritize retention budgets before attrition happens.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Optimal vs At Risk Comparison */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Retention Status Definitions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">OPTIMAL</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The employee is highly retained and emotionally stable. 
                  </p>
                  <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                    <li>Risk Probability is low (typically &lt; 30%)</li>
                    <li>Morale sentiment is stable (&gt; 3.0)</li>
                    <li>Balanced workload and network connections</li>
                  </ul>
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase">AT RISK</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The employee is a high flight risk requiring active attention.
                  </p>
                  <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                    <li>Risk Probability is high (&gt; 50%)</li>
                    <li>Morale sentiment shows downward trend</li>
                    <li>High betweenness centrality indicating bottleneck stress</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Skills & Levels ontology */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">The Skills Ontology & Level Scale</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelinx classifies capability metrics based on three tiers of execution:
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-cyan-300 block">L1: Foundational</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Capable of performing supervised core tasks.</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-purple-300 block">L2: Operational</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Performs autonomously in production setups.</span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-emerald-300 block">L3: Expert / Strategic</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Drives complex systems design & mentors teams.</span>
                </div>
              </div>
            </div>

            {/* Actionable Operations */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Operational Checklist</h3>
              <ul className="text-xs space-y-2 text-slate-200 list-disc pl-4">
                <li>Use tabs at the top (<strong className="text-white">All / Employees / Candidates</strong>) to toggle records.</li>
                <li>Filter records in real-time using search queries for name, role, or department.</li>
                <li>Click the <strong className="text-white">Quick PDF</strong> button to generate printable executive personnel reports.</li>
                <li>Click on any individual card to open their profile modal and review details, historical risk trends, and specific skill tiers.</li>
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
          <div className="space-y-8">
            {/* Header section */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Network className="text-pink-400 h-5 w-5" /> Intelligence Center (Decision Workbench)
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The **Intelligence Center** is the mathematical core of the Aurelinx platform. While typical enterprise directories rely on static lists, Aurelinx implements a dynamic decision workbench powered by graph algorithms, global combinatorial search solvers, and semi-parametric survival models to optimize organizational structures.
              </p>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-indigo-400" /> Math-Engine Architecture & Optimization Pipeline
              </h3>
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="font-mono text-[10px] text-cyan-200/90 leading-relaxed whitespace-pre overflow-x-auto p-4 bg-slate-900/50 rounded-lg border border-white/5">
{`+---------------------------------------------------------------------------------+
|                                USER INPUT STAGE                                 |
|  [Define Skill Node] + [Proficiency Scale] + [Budget Limit] + [Max Team Size]   |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            1. SEMANTIC ADJACENCY RESOLVER                       |
|   * Dijkstra shortest path finder computes similarity weight distance matrix.   |
|   * Resolves conceptual transfers: [Vue.js] --> [JS] --> [React]                |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            2. COMBINATORIAL TEAM BUILDER                        |
|   * Simulated Annealing starts global exploration at high temperature (T).      |
|   * Roster perturbation swaps candidates to optimize overall capability cost.   |
|   * Cools parameter T to converge on global budget/skill optima.               |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            3. SURVIVAL SANDBOX FORECASTER                       |
|   * Applies Cox Proportional Hazards Model to predict attrition probability.    |
|   * Computes Hazard Ratios: HR = exp(B1*Morale + B2*Salary + B3*Workload).      |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                               OUTPUT RESULTS STAGE                              |
|   * Optimal Team Roster + Learning Paths + 12-Month Retention Probabilities      |
+---------------------------------------------------------------------------------+`}
                </div>
              </div>
            </div>

            {/* The Three Computational Pillars */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">The Three Computational Pillars</h3>
              
              <div className="space-y-4">
                {/* Pillar 1 */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <Brain className="text-indigo-400 h-4.5 w-4.5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      1. Semantic Skills Graph (Dijkstra's Solver)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What is it**: A graph representation of competencies where skills are nodes and edges represent learning/transfer paths.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **Why we need it**: Keywords block candidates. A search for a "React Developer" shouldn't ignore a "Vue.js Developer" with years of framework knowledge.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What you get**: The graph solver computes adjacency path weights (e.g. `Vue.js &rarr; JavaScript &rarr; React`). If the total path cost is low, the engine flags them as a match and suggests a micro-training learning path.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <Zap className="text-pink-400 h-4.5 w-4.5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">
                      2. Optimal Team Assembly (Simulated Annealing Math)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What is it**: An optimization model that solves the team configuration problem: picking a team of $K$ employees from a pool of $N$ candidates to satisfy a set of skill matrix demands while remaining under a budget cap (CFO Limit) and minimizing cost.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold text-pink-200">
                    Why we need it: The Combinatorial Explosion
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Assembling a team is an NP-Hard combinatorial optimization problem. Selecting a team of $K = 5$ members from an organization of $N = 100$ employees yields $\binom{100}{5} = 75,287,520$ possible combinations. Brute-force calculation would halt the server, whereas Simulated Annealing maps the search space and converges on the global optimum in milliseconds.
                  </p>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      Core Mathematical Formulation
                    </strong>
                    <p className="leading-relaxed">
                      At each step, the model calculates the team&apos;s <strong>Energy ($E$)</strong>, which we seek to maximize:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      E = (Coverage Percentage &times; 10.0) - Cost Penalty
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>Coverage Percentage:</strong> Evaluates skills in the merged roster. For each target skill $T_j$ at target level $L_j$, the solver checks team members&apos; skills using Dijkstra graph distances: <br />
                        <code className="text-cyan-300">effective_level = candidate_level &times; (1 / (1 + dijkstra_distance))</code> <br />
                        The achievement ratio for that skill is bounded at 1.0: <code className="text-cyan-300">min(1.0, effective_level / L_j)</code>.
                      </li>
                      <li>
                        <strong>CFO Budget Cap Constraint:</strong> Salaries are algorithmically estimated from role lengths: <code className="text-cyan-300">cost = $80,000 + (length(role) &times; $1,500)</code>. If total cost exceeds the Budget Cap, a severe penalty is applied: <br />
                        <code className="text-rose-400">Cost Penalty = ((Total Cost - Budget Cap) / Budget Cap) &times; 5.0</code>.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                      The Metropolis-Hastings Acceptance Criterion
                    </strong>
                    <p className="leading-relaxed">
                      At each iteration, the solver proposes a neighboring team by swapping a random roster member with a non-member. If the energy difference (Delta E = E_new - E_current) is greater than 0, the swap is <strong>always accepted</strong>. If the candidate team is worse (Delta E is less than 0), it is accepted probabilistically based on the current <strong>Temperature ($T$)</strong>:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      P(Accept) = exp(&Delta;E / T)
                    </div>
                    <p className="leading-relaxed">
                      *Why this works*: High temperature at the beginning (T_0 = 10.0) allows the solver to accept worse teams, exploring the organization and escaping local suboptimal traps. As the temperature cools down by a factor of alpha = 0.85 (T = T &times; 0.85) toward T_min = 0.1, the solver stabilizes, narrowing down to lock in the absolute global optimum.
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      Stochastic Convergence (Why results may vary)
                    </strong>
                    <p className="leading-relaxed">
                      You may notice that running the solver multiple times for the same inputs yields different employee names. <strong>This is mathematically expected behavior:</strong>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>The search starts with a random initial team selection.</li>
                      <li>Because Simulated Annealing is a stochastic (probabilistic) solver, the exploration path accepts temporary suboptimal states randomly.</li>
                      <li>If your organization contains multiple employees with matching/similar skill sets (e.g. multiple engineers with Python or Docker), there exist <strong>multiple mathematically equivalent global optima</strong>. The solver will converge on different, but equally perfect, teams depending on its random seed trajectory.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                      Roster & Convergence Outputs
                    </strong>
                    <p className="leading-relaxed">
                      When a run finishes, the workbench displays:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li><strong>Assembly Roster:</strong> The optimized team configuration showing the roles and estimated cost.</li>
                      <li><strong>Total Skills Coverage:</strong> The coverage percentage and achievement pathways showing how the team covers the matrix demand (including bridge matches).</li>
                      <li><strong>Total Team Cost Calculation:</strong> Aggregated salaries verified against the CFO Limit.</li>
                      <li><strong>Convergence Timeline:</strong> An SVG line chart showing how the system energy stabilized as temperature cooled down.</li>
                    </ul>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-400 h-4.5 w-4.5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      3. Attrition Sandbox Simulator (Cox Proportional Hazards Model)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What is it**: An interactive forecasting sandbox powered by the Cox Proportional Hazards regression model that calculates employee survival probability and flight risk over a 12-month timeline.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **Why we need it**: Retaining key talent is a critical business objective. Instead of relying on static indicators or retroactive exit interviews, the engine uses semi-parametric survival models to estimate the probability of resignation based on organizational morale, compensation adjustment, tenure milestones, and skill fatigue.
                  </p>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      Mathematical Foundations
                    </strong>
                    <p className="leading-relaxed">
                      The model calculates the hazard rate $h(t)$ for an employee at tenure $t$ using the formulation:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      h(t) = h_0(t) &times; exp(&sum; &beta;_i &times; X_i)
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>h_0(t) (Baseline Hazard Function):</strong> Represents the underlying risk of resignation over time. Based on historical data, attrition rates are not flat; they feature Gaussian peaks at organizational boundaries: 1-year (12 months) and 3-year (36 months) milestones. <br />
                        <code className="text-cyan-300">h_0(t) = 0.04 + 0.1 &times; exp(-0.5 &times; ((t - 12) / 3)^2) + 0.06 &times; exp(-0.5 &times; ((t - 36) / 6)^2)</code>
                      </li>
                      <li>
                        <strong>Hazard Multiplier (Simulated Attrition Multiplier):</strong> The exponential term <code className="text-cyan-300">exp(&sum; &beta;_i &times; X_i)</code>. A multiplier above 1.0 indicates accelerated flight risk compared to average baseline probability (e.g. x1.25), whereas a multiplier below 1.0 (e.g. x0.45) represents protective factors.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                      Baseline Covariates (SHAP Explainability)
                    </strong>
                    <p className="leading-relaxed">
                      The parameters $X_i$ represent covariates that directly modify the log hazard ratio:
                    </p>
                    <ul className="list-disc pl-4 space-y-2 text-[11px] leading-relaxed">
                      <li>
                        <strong>Organizational Morale Index:</strong> Calculated from sentiment scores. Low sentiment pushes the hazard ratio up; high sentiment provides a protective buffer. The effect is modeled as: <br />
                        <code className="text-cyan-300">moraleEffect = -2.5 &times; (Morale_Simulated - Morale_Original)</code>
                      </li>
                      <li>
                        <strong>Historical Risk Trigger Flag:</strong> Represents administrative flags (`is_at_risk`). If active, it injects a major baseline hazard penalty of <code className="text-cyan-300">+1.2</code> to the log hazard ratio.
                      </li>
                      <li>
                        <strong>Skill Density / Task Fatigue:</strong> A proxy for employee overload. If an employee has a high skill count, they are prone to task fatigue and burnout. The workload adjustment delta modifies the log hazard ratio: <br />
                        <code className="text-cyan-300">workloadEffect = 0.25 &times; (Skills_Simulated - Skills_Original)</code>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      Flight Risk Mitigation Simulator & Sandbox
                    </strong>
                    <p className="leading-relaxed">
                      This sandbox provides managers with control sliders to simulate &quot;what-if&quot; scenarios for any selected employee:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li><strong>Morale Index Slider:</strong> Simulates structural interventions (e.g. team changes, workload relief) to lift morale.</li>
                      <li><strong>Salary Boost Slider:</strong> Simulates a target salary raise (0% to 50%). It offsets the hazard ratio: <code className="text-cyan-300">salaryEffect = -1.8 &times; Salary_Boost</code>.</li>
                      <li><strong>Workload Skill Slider:</strong> Simulates adding or removing technical ownership responsibilities to adjust task complexity and prevent burnout.</li>
                    </ul>
                    <p className="leading-relaxed mt-1">
                      <strong>The Benefit:</strong> Managers get live updates of the adjusted hazard ratio and the resulting 12-month survival curve, allowing them to calculate the exact ROI of salary increases or task redistribution before allocating budgets.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* UI Controls Glossary */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">UI Controls & Technical Terminology</h3>
              
              <div className="space-y-3.5 text-xs text-left">
                {/* Control 1 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">🎯 Target Requirements & Skill Node</strong>
                  <p className="text-slate-300 leading-relaxed">
                    The skill token (e.g. `TypeScript`, `Docker`) selected as a search requirement.
                  </p>
                </div>

                {/* Control 2 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">📊 Minimum Proficiency</strong>
                  <p className="text-slate-300 leading-relaxed">
                    The capability target required for the match (L1: Foundational, L2: Operational, L3: Strategic).
                  </p>
                </div>

                {/* Control 3 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">🔗 Solving Adjacencies (Graph Theory)</strong>
                  <p className="text-slate-300 leading-relaxed font-semibold text-cyan-300">
                    What is an Adjacency?
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    In graph theory, two nodes are &quot;adjacent&quot; if they are directly connected by an edge. In Aurelinx, a skill adjacency represents a direct transfer relationship between two competencies (e.g., Python is adjacent to FastAPI). 
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    **Solving Adjacencies** is the process of executing a shortest-path solver (such as Dijkstra&#39;s algorithm) to find indirect pathways (e.g. `Vue.js &rarr; JavaScript &rarr; React`) when no direct match exists. This exposes hidden talent by calculating the learning proximity between skills.
                  </p>
                </div>

                {/* Control 4 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">🧮 Semantic Matching Matrix</strong>
                  <p className="text-slate-300 leading-relaxed">
                    The underlying grid computed by the Math-Engine that indexes target requirements against candidate resumes. It calculates the overlap score using semantic distances, role similarities, and direct/indirect skill matches.
                  </p>
                </div>

                {/* Control 5 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">🗺️ Path Analysis</strong>
                  <p className="text-slate-300 leading-relaxed">
                    The visual mapping of skill distances (e.g., a Vue developer matching a React project with a path cost of `0.15`). Path Analysis shows you the exact sequence of competencies a candidate needs to bridge the gap.
                  </p>
                </div>

                {/* Control 6 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">📊 Target Match Breakdown</strong>
                  <p className="text-slate-300 leading-relaxed">
                    An analytical panel detailing the transition options for a selected candidate. It evaluates target skills against candidate competencies and categorizes them (e.g., <em>Perfect Match</em>, <em>Highly Transferable</em>, or <em>Trainable Gap</em>). It displays the exact transfer sequence and computed semantic distance (e.g., `Vue.js &rarr; JavaScript &rarr; React` with weight `0.15`). If no connection is found, it marks the distance as infinite.
                  </p>
                </div>

                {/* Control 7 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">🕸️ Shortest Path Graph View (Dijkstra Visualizer)</strong>
                  <p className="text-slate-300 leading-relaxed">
                    An interactive, neon-colored SVG network showing skills as nodes and competency overlaps as links.
                  </p>
                  <ul className="text-slate-300 list-disc pl-4 space-y-1 mt-1">
                    <li><strong className="text-emerald-400">Neon Green Nodes:</strong> Represent skills currently present in the candidate&apos;s profile (their existing competency islands).</li>
                    <li><strong className="text-cyan-400">Neon Cyan Edges:</strong> Highlight the shortest mathematical transition path from the candidate&apos;s existing skills to the required target skills.</li>
                    <li><strong className="text-cyan-300">Traveling Light Particles:</strong> Flow dynamically along the active cyan paths, showing the direction and speed of the learning/transition pathway.</li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed mt-1">
                    This network changes the way managers look at human talent, moving from a static keyword-matching list to a dynamic network.
                  </p>
                </div>
              </div>
            </div>

            {/* ONA explanation block */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Network className="text-pink-400 h-4 w-4" /> ONA Network Centrality Blueprint
              </h3>
              
              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong>What is ONA?</strong> ONA stands for <strong>Organizational Network Analysis</strong>. While traditional organizational charts show only the formal reporting hierarchy, ONA models the informal network of communications, collaborations, and advice flows. This reveals the actual collaborative engine of the company, answering: <em>Who is the true node of influence? Who acts as the bridge between isolated departments?</em>
                </div>

                <div className="relative h-44 bg-slate-900/80 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:14px_14px]" />
                  
                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    <line x1="20%" y1="50%" x2="40%" y2="25%" stroke="rgba(244,63,94,0.3)" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="20%" y1="50%" x2="40%" y2="75%" stroke="rgba(244,63,94,0.3)" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="40%" y1="25%" x2="60%" y2="50%" stroke="rgba(236,72,153,0.8)" strokeWidth="3" />
                    <line x1="40%" y1="75%" x2="60%" y2="50%" stroke="rgba(236,72,153,0.8)" strokeWidth="3" />
                    <line x1="60%" y1="50%" x2="80%" y2="30%" stroke="rgba(6,182,212,0.4)" strokeWidth="2" />
                    <line x1="60%" y1="50%" x2="80%" y2="70%" stroke="rgba(6,182,212,0.4)" strokeWidth="2" />
                  </svg>

                  <div className="absolute left-[15%] top-[40%] flex flex-col items-center">
                    <div className="h-6 w-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      A
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">Isolated</span>
                  </div>

                  <div className="absolute left-[36%] top-[15%] flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[10px] text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                      B
                    </div>
                    <span className="text-[9px] text-cyan-300 mt-1">High PageRank</span>
                  </div>

                  <div className="absolute left-[36%] top-[65%] flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[10px] text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                      C
                    </div>
                    <span className="text-[9px] text-cyan-300 mt-1">Team Hub</span>
                  </div>

                  <div className="absolute left-[56%] top-[40%] flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-pink-500 border-2 border-pink-400 flex items-center justify-center text-[11px] text-slate-950 font-black shadow-[0_0_12px_rgba(236,72,153,0.6)]">
                      D
                    </div>
                    <span className="text-[9px] text-pink-400 font-extrabold mt-1">Key Broker</span>
                  </div>

                  <div className="absolute left-[76%] top-[20%] flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                      E
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">Operational</span>
                  </div>

                  <div className="absolute left-[76%] top-[60%] flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                      F
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">Operational</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 text-left">
                  {/* Metric 1 */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                    <strong className="text-cyan-300 block flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" /> PageRank Centrality (Influence)
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Measures:</strong> Overall connectivity and communication propagation strength. High PageRank nodes act as information multipliers.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-black/30 p-1.5 rounded">
                      PR(u) = (1-d)/N + d &times; &sum; [PR(v) / L(v)]
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      *Logic*: Adopted from Google&apos;s web-ranking algorithm, it measures structural prestige. An employee receives high PageRank if they are connected to other highly connected employees, indicating key decision-makers who can broadcast communications effectively.
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                    <strong className="text-pink-300 block flex items-center gap-1">
                      <Network className="h-3.5 w-3.5" /> Betweenness Centrality (Bridges)
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Measures:</strong> Structural bridge strength across siloed departments. High betweenness employees prevent organizational communication bottlenecks.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-black/30 p-1.5 rounded">
                      C_B(v) = &sum; [&sigma;_st(v) / &sigma;_st]
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      *Logic*: Calculated via Brandes&apos; algorithm, it represents the fraction of all shortest communication paths that pass through an employee. High-betweenness employees act as bridges (like Node <strong>D</strong>). If a bridge is at risk of resigning, communication silos will form.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2 text-left text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-indigo-300">
                    Dynamic Collaboration Weight Ingestion (Jira Logs)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Rather than relying on self-reported survey matrices, the collaboration links in the ONA graph are calculated by compiling actual, passive interaction events:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li><strong className="text-slate-300">Shared Department adjacency:</strong> Injects a base connection weight of <code className="text-indigo-300">+0.4</code>.</li>
                    <li><strong className="text-slate-300">Skills Overlap adjacency:</strong> Injects <code className="text-indigo-300">+0.1</code> per overlapping skill (capped at <code className="text-indigo-300">+0.4</code>).</li>
                    <li><strong className="text-slate-300">Dynamic Jira Log Ingestion:</strong> Evaluates project logs. If two employee emails are found co-assigned or collaborating on the same Jira ticket, the edge weight increases by <code className="text-emerald-400">+0.3</code> per log (capped at <code className="text-emerald-400">+0.9</code>).</li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed">
                    An interaction link is established between two employees if the total aggregate weight exceeds <code className="text-indigo-300">0.1</code>. This makes the force-directed graph a real representation of informal workflow channels.
                  </p>
                </div>
              </div>
            </div>

            {/* Markov Career Path Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="text-cyan-400 h-4 w-4" /> Markov Career Path & Transition Horizon
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4 text-left text-xs">
                <p className="text-slate-300 leading-relaxed">
                  <strong>What is it?</strong> The Markov Career Path is a predictive modeling framework that maps potential employee career progression as a probabilistic state transition network. Rather than viewing career paths as static, linear ladders, Aurelinx recognizes that employees move across departments and roles stochastically, modeled as a <strong>First-Order Markov Chain</strong>.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Why we need it:</strong> Traditional performance reviews and development plans are qualitative and subjective. By modeling career paths mathematically, managers can see where employees are structurally headed, identify potential retention risks, and design optimized development paths based on actual skills gaps.
                </p>

                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                    Mathematical Modeling & Chapman-Kolmogorov Theorem
                  </strong>
                  <p className="leading-relaxed">
                    The career transition network represents roles as states. The transition probability from state $i$ to state $j$ in a single epoch (1 year) is denoted as P_ij.
                  </p>
                  <p className="leading-relaxed">
                    To personalize this progression, the base historical transition rate is adjusted by the employee&apos;s <strong>Skills Coverage Ratio</strong> for the target role:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P&apos;_ij = P_ij &times; Skills_Coverage_Ratio(employee, role_j)
                  </div>
                  <p className="leading-relaxed">
                    This is then normalized across all outgoing transitions from state $i$:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P&apos;&apos;_ij = P&apos;_ij / &sum;_k P&apos;_ik
                  </div>
                  <p className="leading-relaxed">
                    To compute the transition probabilities over a <strong>3-year horizon</strong>, we apply the <strong>Chapman-Kolmogorov Equations</strong> by raising the transition probability matrix to the 3rd power:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P^(3) = P^3
                  </div>
                  <p className="leading-relaxed">
                    The resulting values are the cumulative transition probabilities displayed in the visual career tracker.
                  </p>
                </div>

                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                    Understanding Career Tracker Terminology
                  </strong>
                  <ul className="list-disc pl-4 space-y-2 text-[11px] leading-relaxed">
                    <li>
                      <strong>Active Career Tracker:</strong> The visualization workbench that loads an employee&apos;s profile and renders their career path transition graph showing nodes (roles) and connecting directional arrows.
                    </li>
                    <li>
                      <strong>Transition Probability (% Prob.):</strong> The percentage displayed on each future role card represents the mathematical probability that the employee will occupy that role state at the end of the transition horizon (3 years).
                    </li>
                    <li>
                      <strong>Interactive Career Planning:</strong> If an employee&apos;s transition probability to a desired role (e.g., Lead Engineer) is low due to skill gaps, the workbench outlines the precise skills they must acquire. Once those skills are marked as acquired, the Skills Coverage Ratio increases, raising their transition probability and updating their career roadmap in real-time.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Compliance approval gates */}
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
                Connect Aurelinx directly to external HRIS and communication suites. Secure connections use token headers and HMAC payload signatures.
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
                  <h1 className="text-lg font-black text-white leading-none">Aurelinx System User Manual</h1>
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
              <div>Aurelinx Core Version v4.1.0-Release</div>
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
