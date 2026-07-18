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
  TrendingUp
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
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="text-rose-400 h-5 w-5" /> Agentic Workflow Chat
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Workflow Chat is Aurelius's cognitive agent console. Rather than a static conversational bot, this agent dynamically inspects your intent, executes database commands, checks compliance rules, and mutates tables in real-time.
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
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-400" /> Workflows Agent Ingestion & Retrieval Pipeline
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-300 space-y-3">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-bold w-24 flex-none">[1. Ingestion]</span>
                    <span className="text-slate-400">User prompts + File uploads (PDF, DOCX, CSV, Images OCR)</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 font-bold w-24 flex-none">[2. Intent Solver]</span>
                    <span className="text-slate-400">Parser detects if query requires search, snapshot analysis, or data mutations</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-bold w-24 flex-none">[3. RBAC Gate]</span>
                    <span className="text-slate-400">Validates user token privileges against target actions (Admins vs Members)</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300 font-bold w-24 flex-none">[4. Execution]</span>
                    <span className="text-slate-400">Queries database tables, processes CSV imports, or issues warnings</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold w-24 flex-none">[5. LLM Stream]</span>
                    <span className="text-slate-400">Combines live data context with prompt and streams Server-Sent Events (SSE)</span>
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
                    "Set employee liam@aurelius.com risk to true"
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
                    "Add employee Silas Vance, email silas@aurelius.com, role Lead Developer, dept Technical"
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
                  **Aurelius Governance Protocol:** The agent is strictly prohibited from executing deletion operations (<code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">delete</code>, <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">remove</code>, or <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">purge</code>) under any circumstances. If requested, the pipeline safely aborts the operation, prompting the administrator to verify the deletion manually.
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
                Talent Scout is the intelligent search and matchmaking component of Aurelius, designed to connect high-level conceptual roles with matching personnel profiles.
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
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" /> Talent Scout Matchmaking Pipeline
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-300 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                  
                  {/* Step 1 */}
                  <div className="flex-1 p-2 bg-cyan-500/5 rounded border border-cyan-500/20 w-full">
                    <span className="text-[10px] font-bold text-cyan-400 block">1. CONCEPTUAL INPUT</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Natural language prompt & AI provider key</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step 2 */}
                  <div className="flex-1 p-2 bg-cyan-500/5 rounded border border-cyan-500/20 w-full">
                    <span className="text-[10px] font-bold text-cyan-400 block">2. TOKEN OVERLAP SCORE</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Cross-calculates skill, role, & dept hits</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step 3 */}
                  <div className="flex-1 p-2 bg-cyan-500/5 rounded border border-cyan-500/20 w-full">
                    <span className="text-[10px] font-bold text-cyan-400 block">3. RETENTION SCREENING</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Checks target dept sentiment and burnout risk</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step 4 */}
                  <div className="flex-1 p-2 bg-cyan-500/5 rounded border border-cyan-500/20 w-full">
                    <span className="text-[10px] font-bold text-cyan-400 block">4. STREAMED BRIEF</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">LLM streams recommendations & gap warnings</span>
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
                **Aurelius is built on safety.** When a candidate matches a role, the system analyzes the target department's morale, workload, and attrition trends. If a candidate is placed into a team with high burnout, the engine flags a warning, advising leadership to stabilize the team prior to onboarding.
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
                Sentiment Intelligence is the core forecasting engine of Aurelius. It maps the continuous emotional health of your workforce by analyzing active communication streams.
              </p>
            </div>

            {/* Why Sentiment / Why Aurelius Section */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Why Sentiment? The Philosophy of Aurelius
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Traditional organizations rely on **annual surveys** to measure company culture. Surveys fail because they suffer from <em>recency bias</em>, <em>low participation rates</em>, and are <em>too late</em>—by the time the survey is analyzed, key talent has already resigned.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Aurelius was built to solve this.</strong> It replaces static surveys with passive, privacy-preserving **live sentiment telemetry**. By scanning the emotional tone of collaboration logs, Aurelius detects early warning signs of burnout, team conflict, and career dissatisfaction in real-time.
              </p>
            </div>

            {/* Visual Sentiment Pipeline Diagram */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" /> Sentiment Intelligence Flow
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-300 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                  
                  {/* Step A */}
                  <div className="flex-1 p-2 bg-emerald-500/5 rounded border border-emerald-500/20 w-full">
                    <span className="text-[10px] font-bold text-emerald-400 block">A. RAW INGESTION</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Slack, Jira, Git messages</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step B */}
                  <div className="flex-1 p-2 bg-emerald-500/5 rounded border border-emerald-500/20 w-full">
                    <span className="text-[10px] font-bold text-emerald-400 block">B. NLP VECTORIZER</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Valence-shifting text analysis</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step C */}
                  <div className="flex-1 p-2 bg-emerald-500/5 rounded border border-emerald-500/20 w-full">
                    <span className="text-[10px] font-bold text-emerald-400 block">C. INDICATORS SOLVER</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Score + Velocity + Confidence</span>
                  </div>

                  <div className="text-slate-600 font-bold hidden md:block">➔</div>

                  {/* Step D */}
                  <div className="flex-1 p-2 bg-emerald-500/5 rounded border border-emerald-500/20 w-full">
                    <span className="text-[10px] font-bold text-emerald-400 block">D. THREAT GATEWAY</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">System Status & Action triggers</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Core Metrics: Score, Velocity, Confidence */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">The Three Pillars of Live Indicators</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelius measures three independent values to generate high-fidelity, actionable employee profiles:
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
                    This left card displays the raw live telemetry counts ingested by the Aurelius pipeline:
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
                The Talent Directory is Aurelius's primary analytical gateway. It acts as a unified interface that aggregates live organizational telemetry, predictive machine learning models, and skills inventory.
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
                By tracking these connections, Aurelius detects who is doing the heavy lifting, who acts as an key information broker, and who is structurally isolated. When an employee with high network value (many incoming collaboration links) displays low morale, the system flags them as high-risk, as their departure would cause a major communication gap.
              </p>
            </div>

            {/* Architecture flow diagram */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-purple-400" /> Data Processing & Attrition Pipeline
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center">
                  
                  {/* Step 1 */}
                  <div className="flex-1 p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">1. Telemetry Ingest</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Slack, Jira, Git logs, & HRIS</span>
                  </div>

                  <div className="text-slate-500 font-bold hidden md:block">➔</div>
                  <div className="text-slate-500 font-bold md:hidden">↓</div>

                  {/* Step 2 */}
                  <div className="flex-1 p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">2. Scoring Models</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">NLP Sentiment & ML Risk Calc</span>
                  </div>

                  <div className="text-slate-500 font-bold hidden md:block">➔</div>
                  <div className="text-slate-500 font-bold md:hidden">↓</div>

                  {/* Step 3 */}
                  <div className="flex-1 p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">3. Aggregation</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Optimal vs At-Risk classification</span>
                  </div>

                  <div className="text-slate-500 font-bold hidden md:block">➔</div>
                  <div className="text-slate-500 font-bold md:hidden">↓</div>

                  {/* Step 4 */}
                  <div className="flex-1 p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">4. Direct Action</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Interventions & PDF Briefings</span>
                  </div>

                </div>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Real-time events sync dynamically to update employee statuses, allowing leaders to monitor attrition threats as they develop.
                </p>
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
                Aurelius classifies capability metrics based on three tiers of execution:
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
