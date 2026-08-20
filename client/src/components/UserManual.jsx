import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumSelect from "./PremiumSelect";
import {
  BookOpen,
  LayoutDashboard,
  X,
  MessageSquare,
  Search,
  BarChart3,
  Users,
  Network,
  Database,
  Key,
  ShieldAlert,
  Activity,
  Heart,
  ChevronRight,
  ChevronDown,
  Code,
  PieChart,
  TrendingUp,
  Cpu,
  Brain,
  Zap,
} from "lucide-react";

export const UserManualModal = ({
  isOpen,
  onClose,
  defaultTab = "overview",
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [expandedNodes, setExpandedNodes] = useState({
    dataops: true,
    risk_interventions: true,
  });

  const toggleNode = (nodeId, e) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const navTree = [
    { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    { id: "overview", label: "Overview & Setup", icon: BookOpen },
    { id: "workflows", label: "Workflow Chat & Agents", icon: MessageSquare },
    { id: "scout", label: "Talent Scout Matchmaker", icon: Search },
    { id: "analytics", label: "Analytics & Sentiment", icon: BarChart3 },
    { id: "directory", label: "Talent Directory", icon: Users },
    { id: "intelligence", label: "Intelligence Center", icon: Network },
    {
      id: "dataops",
      label: "Data Ops & Enterprise",
      icon: Database,
      hasChildren: true,
      children: [
        { id: "dataops_overview", label: "Console Overview", icon: Database },
        {
          id: "dataops_pipelines",
          label: "Data Pipelines & Sync",
          icon: Activity,
        },
        {
          id: "dataops_governance",
          label: "AI Governance & Models",
          icon: Cpu,
        },
        {
          id: "risk_interventions",
          label: "Risk & Interventions Engine",
          icon: ShieldAlert,
          hasChildren: true,
          children: [
            {
              id: "dataops_reviews",
              label: "📋 Reviews Queue & Triage",
              icon: Zap,
            },
            {
              id: "dataops_create",
              label: "➕ Create Intervention",
              icon: Activity,
            },
            {
              id: "dataops_active",
              label: "🔄 Active Interventions",
              icon: TrendingUp,
            },
            { id: "dataops_cfo", label: "📊 CFO Scenario Lab", icon: PieChart },
            {
              id: "dataops_attrition",
              label: "🔍 Explainable Attrition",
              icon: Brain,
            },
          ],
        },
        {
          id: "dataops_compliance",
          label: "Compliance & Audit Logs",
          icon: Key,
        },
      ],
    },
    { id: "integrations", label: "Providers & Webhooks", icon: Key },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                <LayoutDashboard className="h-5 w-5 text-cyan-400" /> Executive
                Dashboard
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Aurelinx is a workforce and talent-intelligence application. It
                connects operational views, search, analysis, decision support,
                and controlled follow-up actions in one auditable workspace.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4 text-xs leading-relaxed text-slate-300">
              <strong className="text-cyan-200">Why companies use it:</strong>{" "}
              to understand organizational signals, investigate evidence, make
              informed decisions, and move from analysis to an owned action
              without changing source records automatically.
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Headline metrics</h3>
              <div className="grid gap-2.5 md:grid-cols-2 text-xs text-slate-300">
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">Workforce</strong>A count
                  of people in the organization scope selected for the
                  workspace. It provides the population context for workforce
                  metrics.
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">Candidates</strong>A
                  separate hiring-pool count. Candidate measures remain separate
                  from workforce health and workforce risk measures.
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">At risk</strong>The
                  number of people matching the configured risk flag. The
                  percentage expresses that count relative to the workforce
                  scope.
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">Average morale</strong>An
                  aggregate sentiment indicator for the current scope. It is a
                  summary signal for investigation, not a diagnosis or a
                  definitive prediction about any person.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Risk composition</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                The risk panel groups the workforce scope by signal. These
                counts are matches per category and can overlap; they must not
                be added together.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="border-l-2 border-rose-300/60 pl-3">
                  <strong className="text-rose-200">
                    Retention probability pressure
                  </strong>
                  <p className="mt-1">
                    People below the configured retention-probability threshold.
                    This is a modeled estimate of possible departure pressure,
                    not a fact or certainty.
                  </p>
                </div>
                <div className="border-l-2 border-amber-300/60 pl-3">
                  <strong className="text-amber-200">Low morale signals</strong>
                  <p className="mt-1">
                    People below the configured sentiment threshold. It is a
                    prompt for respectful human review, not proof of
                    dissatisfaction.
                  </p>
                </div>
                <div className="border-l-2 border-violet-300/60 pl-3">
                  <strong className="text-violet-200">Policy risk flags</strong>
                  <p className="mt-1">
                    People matching the configured policy-risk rule. A flag is a
                    review signal and requires evidence before any action.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                These categories can overlap. Their counts describe separate
                signals and must not be added together.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                How the thresholds work
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Each threshold is an inclusive rule applied independently to
                every record in the current workforce scope. A record is counted
                when its value satisfies the rule; it is not counted when the
                value is exactly on the safe side of the boundary.
              </p>
              <div className="grid gap-2.5 md:grid-cols-3 text-xs text-slate-300">
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">
                    Retention &lt; 0.55
                  </strong>
                  <p className="mt-1">
                    A retention probability of 0.54 is included; 0.55 is not.
                    The value is a modeled likelihood signal, not a promise that
                    someone will leave.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">
                    Sentiment &lt; 0.45
                  </strong>
                  <p className="mt-1">
                    A sentiment score of 0.44 is included; 0.45 is not. The
                    score is a screening signal for human review, not a
                    diagnosis.
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <strong className="block text-white">
                    Department risk ≥ 25%
                  </strong>
                  <p className="mt-1">
                    A department is concentrated when at least one quarter of
                    its scoped people are flagged at risk. This driver counts
                    departments, not people.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Changing a source value or risk rule changes the next snapshot.
                Threshold matches are not additive because one person or
                department can satisfy more than one rule.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Workforce health and morale signal
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                <strong className="text-white">Morale signal</strong> is the
                arithmetic mean of the stored sentiment scores in the current
                workforce scope. The Dashboard label{" "}
                <strong className="text-white">Current model indicator</strong>{" "}
                means this is a calculated summary used for decision support; it
                is not a trained clinical measure or a historical trend. Open
                Sentiment Intelligence for filters, drilldowns, live snapshots,
                and trend history.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Workspace overview and actions
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Workspace Overview links to Analytics, Talent Scout, Grounded
                Query/Workflows, Intelligence Center, and Data Ops. Each area
                has a defined purpose and scope. Clicking a risk row opens its
                drilldown; creating an intervention records a controlled action
                and does not modify source records automatically.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Controls and day-to-day operation
              </h3>
              <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                <p>
                  <strong className="text-white">Manual</strong> opens this
                  guide at the Executive Dashboard section.
                </p>
                <p>
                  <strong className="text-white">Refresh</strong> requests the
                  latest workforce cards, candidate count, and analytics
                  snapshot. During the request, values show a loading state.
                  Refresh does not alter records or run an intervention.
                </p>
                <p>
                  <strong className="text-white">Export</strong> opens PDF,
                  Excel, and Markdown actions. Export runs against the report
                  scope and may take longer for a large scope; wait for the
                  success or error notification before closing the page.
                </p>
                <p>
                  <strong className="text-white">Import Data</strong> opens Data
                  Ops, where authorized users manage ingestion and validation.
                  Import is separate from Refresh; refresh reads the currently
                  available records after an import has completed.
                </p>
                <p>
                  <strong className="text-white">Workspace links</strong>{" "}
                  navigate to the relevant operational area without changing the
                  dashboard scope.
                </p>
                <p>
                  <strong className="text-white">Risk rows</strong> are
                  interactive. Select one to open its matching drilldown and
                  review evidence before creating any controlled action.
                </p>
                <p>
                  <strong className="text-white">Talent stream cards</strong>{" "}
                  are lightweight previews. Selecting a card opens the full
                  profile on demand; candidates remain separate from workforce
                  risk and morale calculations.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Loading, freshness, and failure states
              </h3>
              <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                <p>
                  <strong className="text-white">Loading</strong> is shown as a
                  placeholder while a request is in progress. Existing cached
                  values may remain visible until the new response replaces
                  them.
                </p>
                <p>
                  <strong className="text-white">Freshness</strong> means the
                  timestamp of the most recently returned snapshot, not the
                  timestamp of the underlying source system. The dashboard is a
                  current snapshot view; it does not invent historical values.
                  The current Dashboard does not display a separate freshness
                  badge, so use Refresh before a decision or export.
                </p>
                <p>
                  <strong className="text-white">Source and scope</strong>{" "}
                  identify which workspace population the metrics summarize. The
                  Dashboard shows the current-record scope; source/version and
                  ingestion details are managed in Data Ops. Workforce measures
                  and candidate measures must always be interpreted separately.
                </p>
                <p>
                  <strong className="text-white">Errors</strong> are surfaced
                  with an error notification when an API, authentication
                  session, or provider request fails. Retry with Refresh after
                  correcting the underlying connection or session; an error must
                  not be interpreted as a zero metric.
                </p>
                <p>
                  <strong className="text-white">Stale values</strong> should be
                  refreshed before a decision or export. If a refresh fails,
                  treat the last visible snapshot as unconfirmed until a
                  successful response is shown.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Exports</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Dashboard export actions generate PDF, Excel, or Markdown
                reports for the selected report scope. Reports include
                generation time and should be reviewed for scope, filters,
                observed fields, and modeled indicators before sharing.
              </p>
            </div>
          </div>
        );
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <BookOpen className="text-cyan-400 h-5 w-5" /> Aurelinx Platform
                Overview
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Welcome to Aurelinx, an enterprise-grade Talent Intelligence &
                Org Health Platform. Aurelinx integrates live business telemetry
                (Slack, Jira, Workday) with explainable Machine Learning models,
                policy compliance gates, and cognitive AI agents to help
                organizations optimize retention and build high-performance
                teams.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Quick Start Checklist
              </h3>
              <ol className="text-xs space-y-2.5 text-slate-200 list-decimal pl-4">
                <li>
                  <strong className="text-white">
                    Configure LLM Provider:
                  </strong>{" "}
                  Go to Settings ➔ Providers to set up your OpenAI, Claude,
                  Groq, or local LM Studio connection.
                </li>
                <li>
                  <strong className="text-white">
                    Review Workforce Analytics:
                  </strong>{" "}
                  Monitor the Dashboard to inspect attrition risk, morale
                  metrics, and high-risk clusters.
                </li>
                <li>
                  <strong className="text-white">Launch Interventions:</strong>{" "}
                  Identify at-risk employees and initiate structured
                  30/60/90-day mitigation plans.
                </li>
                <li>
                  <strong className="text-white">Setup Data Ingestion:</strong>{" "}
                  Connect secure Slack, Jira, and Workday webhooks to sync live
                  workforce events.
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                System Architecture Flow
              </h3>
              <div className="rounded-xl bg-slate-950/40 border border-white/5 p-4 text-xs font-mono text-cyan-200/90 leading-relaxed">
                [Integrations: Slack/Workday/Jira] ➔ [Webhook Ingestion API]{" "}
                <br />
                &nbsp;&nbsp;➔ [PostgreSQL database] ➔ [ONA Centrality Solvers]
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;➔ [Explainable ML Prediction Engine] ➔
                [Policy gates Audit]
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;➔ [Agentic Workflows Chat &
                Client Dashboard]
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
                <MessageSquare className="text-rose-400 h-5 w-5" /> Agentic
                Workflow Chat
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Workflow Chat is Aurelinx's cognitive agent console. Rather
                than a static conversational bot, this agent dynamically
                inspects your intent, executes database commands, checks
                compliance rules, and mutates tables in real-time.
              </p>
            </div>

            {/* Core Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-black text-pink-300 block flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" /> Database Mutations (Write
                  Ops)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Administrators can write, modify, or relocate resources using
                  natural language. The agent translates prompt instructions
                  into SQL transactions.
                </p>
              </div>

              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-black text-rose-300 block flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" /> RBAC Security & Safety
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Every mutation check is gated by Role-Based Access Control
                  (RBAC). General members are blocked from executing mutations.
                  Critical actions (like deletion) trigger mandatory safety
                  blocks.
                </p>
              </div>
            </div>

            {/* Architecture Flowchart */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-400" /> Workflows Agent
                Ingestion & Retrieval Pipeline
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="relative pl-6 border-l border-white/10 space-y-6">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-cyan-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest block">
                      1. INGESTION ENGINE
                    </span>
                    <h5 className="text-xs text-white font-bold mt-0.5">
                      Context Gathering & Parser
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Accepts user natural language prompts + rich file
                      attachments (PDFs, DOCX, CSV, Image OCR).
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-purple-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest block">
                      2. INTENT CLASSIFIER
                    </span>
                    <h5 className="text-xs text-white font-bold mt-0.5">
                      Dynamic Tool Policy
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Decides whether the query requests a readonly database
                      search, summary metrics snapshot, or administrative write
                      transactions.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                      3. RBAC & SECURITY CHECK
                    </span>
                    <h5 className="text-xs text-white font-bold mt-0.5">
                      Compliance Gatekeeper
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Authenticates user privileges. Blocks write operations for
                      regular members and redirects deletion operations to
                      human-in-the-loop gates.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">
                      4. TRANSACTION LAYER
                    </span>
                    <h5 className="text-xs text-white font-bold mt-0.5">
                      PostgreSQL Execution
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Commits data mutations, runs skills similarity searches,
                      or imports batch CSV rosters directly into Postgres.
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-rose-500 border-4 border-slate-950 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest block">
                      5. GENERATIVE STREAM
                    </span>
                    <h5 className="text-xs text-white font-bold mt-0.5">
                      SSE Token Typewriter
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Integrates tool query outcomes with conversation logs and
                      streams real-time Markdown via Server-Sent Events.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Parsing & Uploads */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Attachment Parsing Engines
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you drag and drop attachments into the chat input, the
                backend parses them using specific libraries depending on file
                suffix:
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300 list-disc pl-4">
                <li>
                  <strong className="text-white">TXT / MD / LOG / JSON:</strong>{" "}
                  Ingested directly as UTF-8 text strings.
                </li>
                <li>
                  <strong className="text-white">PDF Documents:</strong> Parsed
                  using{" "}
                  <code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">
                    pypdf
                  </code>{" "}
                  page-by-page.
                </li>
                <li>
                  <strong className="text-white">Word Documents (DOCX):</strong>{" "}
                  Read paragraph-by-paragraph using{" "}
                  <code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">
                    python-docx
                  </code>
                  .
                </li>
                <li>
                  <strong className="text-white">
                    Images (PNG / JPG / JPEG):
                  </strong>{" "}
                  Extracted using Tesseract OCR (
                  <code className="text-rose-300 bg-black/25 px-1 py-0.5 rounded font-mono">
                    pytesseract
                  </code>
                  ).
                </li>
                <li>
                  <strong className="text-white">CSV files:</strong> Parsed and
                  automatically imported into PostgreSQL as either candidate or
                  employee profiles based on status headers.
                </li>
              </ul>
            </div>

            {/* Supported Commands */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Data Mutations Command Reference
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Admins can input the following commands directly into the
                workflow chat to alter PostgreSQL database values:
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Command 1 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">
                    Set Employee Risk Flags
                  </span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Set employee liam@aurelinx.com risk to true"
                  </code>
                </div>

                {/* Command 2 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">
                    Reorganize Personnel Departments
                  </span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Move employee olivia@public.local to department
                    Engineering"
                  </code>
                </div>

                {/* Command 3 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">
                    Add New Workforce Entries
                  </span>
                  <code className="text-emerald-300 bg-black/30 px-1.5 py-0.5 rounded block w-full mt-1.5 font-mono text-[10px]">
                    "Add employee Silas Vance, email silas@aurelinx.com, role
                    Lead Developer, dept Technical"
                  </code>
                </div>

                {/* Command 4 */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-1">
                    Configure Integration Connections
                  </span>
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
                <h4 className="font-bold text-red-300">
                  Human-in-the-Loop Safe Aborts
                </h4>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  **Aurelinx Governance Protocol:** The agent is strictly
                  prohibited from executing deletion operations (
                  <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">
                    delete
                  </code>
                  ,{" "}
                  <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">
                    remove
                  </code>
                  , or{" "}
                  <code className="font-mono text-[10px] text-red-300 bg-black/30 px-1 py-0.5 rounded">
                    purge
                  </code>
                  ) under any circumstances. If requested, the pipeline safely
                  aborts the operation, prompting the administrator to verify
                  the deletion manually.
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
                <Search className="text-cyan-400 h-5 w-5" /> Talent Scout
                Matchmaker
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Talent Scout is the intelligent search and matchmaking component
                of Aurelinx, designed to connect high-level conceptual roles
                with matching personnel profiles.
              </p>
            </div>

            {/* Why Talent Scout? */}
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Why Talent Scout? The Failure of Keyword Searches
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Standard hiring software uses rigid **keyword matching**. If you
                search for <em>"Python developer"</em>, a resume containing{" "}
                <em>"FastAPI expert"</em> or <em>"Django engineer"</em> might be
                completely ignored simply because the exact word "Python" wasn't
                found.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Talent Scout solves this</strong> by using semantic
                token overlap and AI reasoning. It matches candidates based on
                the <em>concepts</em> and <em>context</em> of their skills,
                identifying suitable hires who would otherwise be filtered out.
              </p>
            </div>

            {/* Flow Diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" /> Talent Scout
                Matchmaking Pipeline
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(45,212,191,0.5)]">
                      1
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">
                      INPUT STAGE
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Natural Query
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Accepts natural prompts, extracts skill/role/dept tokens.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(45,212,191,0.5)]">
                      2
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">
                      MATCHING
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Token Scoring
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Intersects search tokens with Postgres skill sets, roles,
                      & CV match scores.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(45,212,191,0.5)]">
                      3
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">
                      SAFETY
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Retention Filter
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Evaluates target department workload & morale levels to
                      prevent placement shocks.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl relative hover:border-cyan-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(45,212,191,0.5)]">
                      4
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider block mt-1">
                      OUTPUT STAGE
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      LLM Summary Brief
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Typewriter streams recommendation rationales, strengths,
                      and candidate gap warning matrices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Calculations & Math */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Under the Hood: Score Calculations
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a search is submitted, the matching engine extracts tokens
                from your query and calculates match weights differently for
                candidates and employees:
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Employee Score */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">
                    👥 Internal Employees Scoring Formula
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Internal profiles are matched to identify transfer
                    opportunities. Sentiment is heavily weighted to help prevent
                    burnout, and active risks are penalized:
                  </p>
                  <div className="font-mono text-[10px] text-cyan-300 bg-black/20 p-2 rounded leading-normal">
                    Score = (Skill_Hits * 2.5) + (Role_Hits * 2.0) + (Dept_Hits
                    * 1.2) + (Sentiment_Score * 1.1) - (0.6 if At_Risk)
                  </div>
                </div>

                {/* Candidate Score */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">
                    👤 External Candidates Scoring Formula
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    External resumes are ranked primarily based on technical
                    fit, combining search overlap with their pre-calculated CV
                    parse score:
                  </p>
                  <div className="font-mono text-[10px] text-cyan-300 bg-black/20 p-2 rounded leading-normal">
                    Score = (Skill_Hits * 2.6) + (Role_Hits * 2.1) + (Dept_Hits
                    * 1.3) + (Sentiment_Score * 1.0) + (Match_Score * 1.8)
                  </div>
                </div>
              </div>
            </div>

            {/* The Intelligence Brief */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                What You Get: The AI Scout Brief
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rather than displaying raw data grids, the matched candidate
                payloads are sent to an LLM provider of choice. The system
                streams a typewriter brief containing:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                <li>
                  <strong className="text-white">Best Overall Match:</strong>{" "}
                  Identifies the single best candidate and provides a detailed
                  rationale.
                </li>
                <li>
                  <strong className="text-white">Strengths of Top 3:</strong>{" "}
                  Breaks down specific skill advantages and match factors.
                </li>
                <li>
                  <strong className="text-white">Risks & Gaps:</strong> Warns
                  you of potential skill gaps (e.g. candidate lacks cloud
                  experience) or onboarding issues.
                </li>
                <li>
                  <strong className="text-white">Final Recommendation:</strong>{" "}
                  Clear, actionable advice on next interview steps or job
                  offers.
                </li>
              </ul>
            </div>

            {/* Retention-Aware Warning */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> Retention-Aware Onboarding
              </h4>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                **Aurelinx is built on safety.** When a candidate matches a
                role, the system analyzes the target department's morale,
                workload, and attrition trends. If a candidate is placed into a
                team with high burnout, the engine flags a warning, advising
                leadership to stabilize the team prior to onboarding.
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
                <BarChart3 className="text-emerald-400 h-5 w-5" /> Sentiment
                Intelligence
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Sentiment Intelligence is a current workforce-snapshot view. It
                reads stored employee sentiment, retention, department, and
                policy-risk fields, then calculates transparent organizational
                indicators and review lists. It is not a clinical assessment or
                validated forecasting model.
              </p>
            </div>

            {/* Why Sentiment / Why Aurelinx Section */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Why Sentiment? The Philosophy of Aurelinx
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Organizations use this view to identify which stored workforce
                signals deserve human review instead of treating one metric as a
                decision.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelinx does not silently scan collaboration messages in this
                page. It presents the authenticated database snapshot and
                clearly separates observed fields from derived indicators.
              </p>
            </div>

            {/* Visual Sentiment Pipeline Diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" /> Sentiment
                Intelligence Flow
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  {/* Step A */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      A
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">
                      TELEMETRY INGEST
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Raw Ingestion
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Reads the authenticated employee snapshot and its stored
                      sentiment, retention, department, and risk fields.
                    </p>
                  </div>

                  {/* Step B */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      B
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">
                      NLP PARSER
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Valence Mapping
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Uses the normalized 0–1 sentiment values already stored on
                      employee records.
                    </p>
                  </div>

                  {/* Step C */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      C
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">
                      TELEMETRY SOLVER
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Three Pillars
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Calculates averages, threshold lists, department
                      breakdowns, and snapshot-to-snapshot velocity.
                    </p>
                  </div>

                  {/* Step D */}
                  <div className="p-3.5 bg-slate-900/60 border border-emerald-500/20 rounded-xl relative hover:border-emerald-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                      D
                    </span>
                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block mt-1">
                      THREAT CLASSIFIER
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Macro Status Index
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Maps the current employee at-risk ratio to Level 1, 2, or
                      3 review priority.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Metrics: Score, Velocity, Confidence */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                The Three Pillars of Live Indicators
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelinx measures three independent values to generate
                high-fidelity, actionable employee profiles:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pillar 1 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-cyan-300 block">
                    📊 Current sentiment score (0.0–1.0)
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The normalized sentiment value stored on an employee record.
                    Lower values are review signals; higher values are more
                    favorable within this dataset. It is not a diagnosis.
                  </p>
                  <div className="text-[10px] font-mono text-cyan-300 bg-black/30 p-1.5 rounded">
                    Organizational morale = Σ employee sentiment / employee
                    count
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-purple-300 block">
                    ⚡ Velocity (dM/dt)
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The difference between the current snapshot and the previous
                    captured snapshot. It is zero when no prior snapshot
                    differs; it is not guaranteed to represent seven days.
                  </p>
                  <div className="text-[10px] font-mono text-purple-300 bg-black/30 p-1.5 rounded">
                    Velocity = current snapshot score − previous snapshot score
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-black text-emerald-300 block">
                    🎯 Coverage (0% - 100%)
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The table's Coverage value describes record/data coverage.
                    It is a volume indicator, not statistical confidence or
                    model accuracy.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-300 bg-black/30 p-1.5 rounded">
                    Coverage = records represented / records in the current
                    scope
                  </div>
                </div>
              </div>
            </div>

            {/* System Status and Intervention Priorities */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Dashboard Telemetry & Priority Rules
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Sentiment Intelligence view displays two primary cards at
                the top representing macro-level metrics, and a table below for
                granular indicators:
              </p>
              <div className="space-y-4 text-xs">
                {/* System Status (Left Card) */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-primary" /> System
                    Status (Live Telemetry)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This left card displays the current authenticated employee
                    snapshot:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-slate-300">
                        Total Analyzed:
                      </strong>{" "}
                      Count of employees currently tracked by sentiment
                      telemetry.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Current Average Sentiment:
                      </strong>{" "}
                      The arithmetic mean of stored normalized 0.0–1.0 employee
                      sentiment scores.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Flagged Profiles:
                      </strong>{" "}
                      Count of employee records whose stored policy/risk flag is
                      true.
                    </li>
                  </ul>
                </div>

                {/* Intervention Priority (Right Card) */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />{" "}
                    Intervention Priority (Dynamic Ranking)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This right card represents a{" "}
                    <strong>macro review priority</strong>. It calculates the
                    current at-risk ratio (flagged employees divided by employee
                    scope) and maps it into three tiers:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-emerald-300">
                        Level 1 (Healthy/Safe):
                      </strong>{" "}
                      At-risk ratio is{" "}
                      <strong className="text-emerald-300">&lt; 10%</strong>.
                      Morale is balanced across departments.
                    </li>
                    <li>
                      <strong className="text-amber-300">
                        Level 2 (Caution/Warning):
                      </strong>{" "}
                      At-risk ratio is{" "}
                      <strong className="text-amber-300">10% - 20%</strong>.
                      Triggers early warning review for department workloads.
                    </li>
                    <li>
                      <strong className="text-rose-400">
                        Level 3 (Critical/Risk):
                      </strong>{" "}
                      At-risk ratio is{" "}
                      <strong className="text-rose-400">&ge; 20%</strong>.
                      Auto-escalates systemic risk, warning administrators of
                      attrition bottlenecks.
                    </li>
                  </ul>
                </div>

                {/* Individual Profile Priorities */}
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5 space-y-1.5">
                  <strong className="text-white block">
                    🚨 Individual Employee Intervention Priority
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Individual review urgency is based on the stored employee
                    risk flag and the configured workforce indicators. ONA is
                    available separately in Intel Center and is not used as
                    proof of employee sentiment:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 mt-2">
                    <div className="p-2 bg-red-500/10 border border-red-500/25 rounded">
                      <span className="text-red-400 font-bold block">
                        CRITICAL Priority
                      </span>
                      Stored risk flag plus multiple supporting review signals.
                    </div>
                    <div className="p-2 bg-orange-500/10 border border-orange-500/25 rounded">
                      <span className="text-orange-400 font-bold block">
                        HIGH Priority
                      </span>
                      Stored risk flag with a supporting low-sentiment or
                      low-retention signal.
                    </div>
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/25 rounded">
                      <span className="text-yellow-400 font-bold block">
                        MEDIUM Priority
                      </span>
                      One or more derived indicators requiring context.
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/25 rounded">
                      <span className="text-blue-400 font-bold block">
                        LOW Priority
                      </span>
                      No current stored risk flag.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizational Analytics & Workforce Distribution */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <PieChart className="text-cyan-400 h-4 w-4" /> Organizational
                Analytics & Workforce Distribution
              </h3>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-3 text-[11px] leading-relaxed text-slate-300">
                <strong className="text-cyan-200">
                  Separate from Sentiment Intelligence:
                </strong>{" "}
                Sentiment Intelligence is the dedicated normalized-sentiment and
                risk-review page. This Organizational Analytics section is the
                workforce distribution, department aggregation, server-side risk
                evidence, candidate hiring context, exports, and durable
                snapshot trend view. Candidate metrics here never alter employee
                sentiment or risk totals.
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The **Organizational Analytics** view aggregates individual
                employee risk telemetry to map macro department-level health and
                workforce layout.
              </p>

              {/* High-Level Diagram */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-3 text-xs text-slate-300">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Organizational Analytics Processing Flow
                </span>
                <div className="flex flex-col gap-2.5">
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-cyan-300 block">
                      1. WORKFORCE REGISTRATION (N)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Total database profiles registered across Active
                      Departments.
                    </span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-purple-300 block">
                      2. RISK DISTRIBUTION CALCULATOR
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Flags employees as at-risk and calculates department
                      concentrations.
                    </span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-emerald-300 block">
                      3. RULE-BASED RISK RATE
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Calculates the current snapshot coefficient (LOW, MEDIUM,
                      HIGH); it is not a validated predictive model.
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Variable Breakdown */}
              <div className="space-y-3 text-xs">
                {/* Total Workforce */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">
                    👥 Total Workforce (N)
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The absolute number of active internal staff profiles. This
                    acts as the denominator ($N$) for all organizational ratios.
                  </p>
                </div>

                {/* At-Risk Employees */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">
                    ⚠️ At-Risk Employees
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Employees actively flagged as flight risks. An individual is
                    marked as "At Risk" when their calculated retention
                    probability falls below target thresholds, indicating
                    burnout, declining morale, or low engagement signals.
                  </p>
                </div>

                {/* Active Departments */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">
                    🏢 Active Departments & Workforce Distribution
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Measures the count of administrative divisions. Department
                    distribution is computed by dividing the number of members
                    in a specific department by the total workforce ($N$):
                  </p>
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Distribution % = (Department Member Count / Total Workforce)
                    * 100
                  </div>
                </div>

                {/* Predictive Risk Vector */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">
                    🔮 Predictive Risk Vector & Risk Coefficient
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The risk vector is a derived review indicator based on the
                    current employee snapshot. It is not a validated prediction
                    of who will leave in the next 90 days. The priority
                    coefficient categorizes the current at-risk ratio:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 text-[10px] mt-1">
                    <li>
                      <strong className="text-slate-300">
                        LOW Risk Coefficient:
                      </strong>{" "}
                      Overall organization at-risk ratio &lt; 10%.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        MEDIUM Risk Coefficient:
                      </strong>{" "}
                      Overall organization at-risk ratio between 10% and 20%.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        HIGH Risk Coefficient:
                      </strong>{" "}
                      Overall organization at-risk ratio &ge; 20%.
                    </li>
                  </ul>
                </div>

                {/* Risk Concentration */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block">
                    📍 Highest Department Risk Concentration
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Isolates which department holds the densest cluster of
                    at-risk employees (e.g.{" "}
                    <em>
                      "Sales currently has the highest risk concentration at
                      40.0%"
                    </em>
                    ). It is calculated as:
                  </p>
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Dept Risk Concentration % = (At-Risk Employees in Department
                    / Total Employees in Department) * 100
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10px] mt-1.5">
                    <strong>Why it matters:</strong> If risk is clustered in a
                    single team (e.g. Sales), the root cause is likely localized
                    (e.g., poor local management, unreasonable quota pressures)
                    rather than systemic company-wide culture issues. This helps
                    target remedial training precisely.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] p-4 text-xs text-slate-300">
              <h4 className="font-bold text-cyan-200">
                Organizational Analytics: operational guide
              </h4>
              <p className="leading-relaxed">
                This page is an employee-workforce view. Candidate totals and
                match scores are shown in a separate hiring-context panel and
                never enter employee morale, risk, department, or gauge
                calculations.
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-100">Department:</strong>{" "}
                  filters every employee card, headline, department drill-down,
                  risk-evidence list, and the risk gauge. Choose “All employee
                  departments” to clear it.
                </li>
                <li>
                  <strong className="text-slate-100">At-risk only:</strong>{" "}
                  restricts the view to stored <code>is_at_risk</code> records.
                  With no matching rows, cards and the gauge intentionally show{" "}
                  <strong>0</strong>, never organization-wide fallback totals.
                </li>
                <li>
                  <strong className="text-slate-100">Gauge:</strong> filtered
                  ratio = matching at-risk employees ÷ matching employees × 100.
                  With no filter it uses the full employee snapshot. LOW
                  &lt;10%, MEDIUM 10–&lt;20%, HIGH ≥20%.
                </li>
                <li>
                  <strong className="text-slate-100">Thresholds:</strong> low
                  sentiment is <code>sentiment_score &lt; 0.45</code>; retention
                  pressure is <code>retention_prob &lt; 0.55</code>; department
                  concentration is <code>department at-risk share ≥ 25%</code>.
                  These are transparent review rules, not clinical or validated
                  predictive truth.
                </li>
                <li>
                  <strong className="text-slate-100">Exports:</strong> PDF,
                  Excel, and Markdown use the currently visible filtered
                  employee scope and include the filter context. A disabled
                  export means the current scope contains zero rows.
                </li>
                <li>
                  <strong className="text-slate-100">Drill-down:</strong>{" "}
                  selecting a distribution row focuses department evidence;
                  “Show all” clears the focus. Risk evidence is server-paginated
                  and loads more as its list is scrolled.
                </li>
                <li>
                  <strong className="text-slate-100">Create review:</strong>{" "}
                  creates a planned, medium-priority HR review request tied to
                  the employee and evidence context. It does not change the
                  employee record. A later high/critical escalation remains
                  administrator-protected. Success or permission/API failure is
                  shown inline.
                </li>
                <li>
                  <strong className="text-slate-100">History:</strong> the
                  latest 24 snapshots are stored in the tenant-scoped analytics
                  snapshot table. If the history endpoint is unavailable, the
                  live stream can still render current metrics and the page
                  shows an empty/failure state rather than fabricated history.
                </li>
                <li>
                  <strong className="text-slate-100">
                    Freshness and failures:
                  </strong>{" "}
                  the header timestamp is the snapshot generation time; a
                  disconnected stream means the page is not receiving updates.
                  Authentication/API failures are surfaced and do not silently
                  replace filtered results with stale totals.
                </li>
              </ul>
            </div>

            <div className="space-y-4 rounded-xl border border-cyan-400/30 bg-slate-950/80 p-5 text-xs text-slate-200">
              <h3 className="text-sm font-extrabold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                <BriefcaseBusiness size={16} className="text-cyan-400" />
                Create Review & Risk Intervention Workflows: End-to-End
                Operational Guide
              </h3>

              <div className="space-y-3 leading-relaxed text-slate-300">
                <p>
                  <strong className="text-white font-semibold">
                    1. What is a "Review"?
                  </strong>
                  <br />A <strong>Review Request</strong> is a preliminary,
                  documented HR triage ticket generated when an HRBP or Manager
                  discovers a high attrition risk signal in{" "}
                  <em>Operational Analytics</em>. It captures the target
                  employee, risk factors, department, and recommended triage
                  steps without altering the core employee record.
                </p>

                <p>
                  <strong className="text-white font-semibold">
                    2. Why does it exist and who uses it?
                  </strong>
                  <br />
                  Direct employee record modifications (such as compensation
                  adjustments, department transfers, or contract changes)
                  require strict administrative governance. The Review Queue
                  allows HR Business Partners to immediately capture AI
                  evidence, document retention risks, and schedule stay
                  conversations without violating permission policies or
                  triggering unauthorized database mutations.
                </p>

                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 space-y-2 font-mono text-[11px]">
                  <div className="font-sans font-bold text-cyan-300 uppercase text-[10px] tracking-wider mb-1">
                    End-to-End 5-Step Risk & Intervention Lifecycle:
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                      Step 1
                    </span>
                    <span>
                      <strong>Signal Discovery:</strong> AI models detect low
                      retention probability or high burnout indicators in
                      Operational Analytics.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                      Step 2
                    </span>
                    <span>
                      <strong>Create Review:</strong> Clicking "Create review"
                      logs a <code>planned</code> medium-priority review record
                      in the database.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                      Step 3
                    </span>
                    <span>
                      <strong>Triage Queue:</strong> The ticket appears in{" "}
                      <em>Reviews Queue</em>. The HRBP inspects risk drivers,
                      schedules stay meetings, or dismisses signals.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                      Step 4
                    </span>
                    <span>
                      <strong>Escalation:</strong> Clicking "⚡ Escalate to
                      Active Plan" elevates the request into a formal Active
                      Intervention Plan with assigned budget & HR owner.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                      Step 5
                    </span>
                    <span>
                      <strong>Outcome Scoring:</strong> Active plans record
                      auditable 30-day (Improved), 60-day (Neutral), and 90-day
                      (Degraded) impact checkpoints.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Calculations */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Mathematical Model Formulations
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Burnout Risk Vector
                  </strong>
                  A derived display indicator using employee risk flags and
                  normalized sentiment:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Burnout indicator = (at-risk ratio × 0.7) + ((1.0 − average
                    sentiment) × 0.3)
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Talent Density Score
                  </strong>
                  Measures organizational distribution balance:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Density = 1.0 - (largest_dept_count / total_workforce)
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Leadership Trust
                  </strong>
                  A derived display indicator based on current morale and
                  retention values; it is not a validated trust measure:
                  <div className="mt-1 font-mono text-[10px] text-emerald-300 bg-black/20 p-1.5 rounded">
                    Trust indicator = (average retention × 0.6) + (average
                    sentiment × 0.4)
                  </div>
                </div>
              </div>
            </div>

            {/* Warning block */}
            <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-none mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-300">
                  Risk Review Warning
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  If the overall risk percentage of your workforce exceeds 20%,
                  the system status auto-escalates to **Level 3 (High)** and
                  warns administrators to review ONA bottlenecks.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] leading-relaxed text-slate-300">
              <strong className="text-amber-200">
                Snapshot history and evidence boundary:
              </strong>{" "}
              this page reads the current authenticated employee snapshot. The
              chart keeps the latest 24 tenant-scoped snapshots in the durable
              analytics snapshot store; it is an operational trend, not a
              complete historical warehouse or an audited time series. Coverage
              describes record volume, not statistical confidence. Derived
              indicators support review and must not be treated as validated
              clinical or predictive truth.
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
                The Talent Directory is the searchable, paginated record
                browser. It presents lightweight employee and candidate
                metadata, keeps the two populations separate, and opens a full
                profile only when you select a card.
              </p>
            </div>

            {/* Directory scope card */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" /> Directory scope
                and safety
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Directory cards are read-only previews. They contain enough
                metadata to search and browse quickly, while skills, experience,
                and other full-profile fields are requested only after a profile
                is opened.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Employee risk and morale indicators are separate from candidate
                matching. The Directory does not change a record merely because
                it is viewed or flagged; controlled changes belong in authorized
                workflows.
              </p>
            </div>

            {/* Architecture flow diagram */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-purple-400" /> Data Processing
                & Attrition Pipeline
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      1
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">
                      SCOPE
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Metadata load
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Loads the configured directory metadata scope.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      2
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">
                      FIELDS
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Field display
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Reads stored fields and configured indicators for display.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      3
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">
                      SEPARATION
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      Scope separation
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Separates employee and candidate views without mixing
                      their metrics.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-slate-900/60 border border-purple-500/20 rounded-xl relative hover:border-purple-500/40 transition-colors">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-purple-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.5)]">
                      4
                    </span>
                    <span className="text-[9px] font-black text-purple-300 uppercase tracking-wider block mt-1">
                      DETAILS
                    </span>
                    <h6 className="text-xs text-white font-bold mt-1">
                      On-demand profile
                    </h6>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Opens a profile or sends the selected report scope to
                      export.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Glossary / Acronym Guide */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Acronyms & Technical Glossary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-purple-300 block mb-1">
                    ONA (Organizational Network Analysis)
                  </strong>
                  Study of communication and collaboration networks to map
                  communication patterns, influence nodes, and systemic
                  bottlenecks.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-cyan-300 block mb-1">
                    NLP (Natural Language Processing)
                  </strong>
                  A general term for language-analysis capabilities used by
                  applicable intelligence features; opening a Directory card
                  does not run a new NLP analysis.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-emerald-300 block mb-1">
                    ML (Machine Learning)
                  </strong>
                  A general term for modeled indicators. A Directory card
                  displays returned values; it does not claim that a new model
                  was trained or run during browsing.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-pink-300 block mb-1">
                    HRIS (Human Resources Info System)
                  </strong>
                  Core systems of record (like Workday) tracking employment,
                  compensation, job hierarchies, and roles.
                </div>
              </div>
            </div>

            {/* Core Classification: Employees vs Candidates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="text-cyan-400 h-4 w-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Employees
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  People in the employee/workforce scope. Employee cards can
                  show stored role, department, sentiment, retention, and risk
                  fields when those fields are available.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="text-pink-400 h-4 w-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">
                    Candidates
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  People in the candidate scope. Candidate cards use candidate
                  fields such as role, department, skills, application date, and
                  match score; they are not included in workforce risk or morale
                  totals.
                </p>
              </div>
            </div>

            {/* Metrics Breakdown: Sentiment & Risk Probability */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Understanding Directory Metrics
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block text-xs mb-1">
                    💬 Sentiment score (normalized 0–1)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This is a normalized signal used for workforce analysis. It
                    is not a diagnosis or a direct statement of how a person
                    feels.
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-slate-300">How it works:</strong>{" "}
                      The Directory displays the stored score returned by the
                      employee profile endpoint; the Directory itself does not
                      infer a new score while you browse.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Interpretation:
                      </strong>{" "}
                      Lower values are review signals and higher values are more
                      favorable signals within the configured scale. Use
                      Sentiment Intelligence for definitions, filters, and
                      trends.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-white block text-xs mb-1">
                    ⚠️ Retention probability (0%–100%)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    This is a stored or modeled probability-like indicator used
                    to prioritize review. It is not a guaranteed departure date
                    or outcome.
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-slate-300">How it works:</strong>{" "}
                      The Directory reads the value returned by the employee
                      profile endpoint and renders it as a percentage.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Why it matters:
                      </strong>{" "}
                      It helps users decide which records need evidence review;
                      it must not be used alone for an employment decision.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Optimal vs At Risk Comparison */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Retention Status Definitions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                    OPTIMAL
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The record does not currently match the configured at-risk
                    flag.
                  </p>
                  <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                    <li>
                      Review the displayed retention and sentiment values.
                    </li>
                    <li>Confirm the record is in the correct scope.</li>
                    <li>
                      Do not treat the label as a guarantee of future stability.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase">
                    AT RISK
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The record matches the configured at-risk flag and requires
                    evidence review.
                  </p>
                  <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                    <li>
                      Open the full profile to inspect the supporting fields.
                    </li>
                    <li>
                      Use Sentiment Intelligence or Analytics for broader
                      context.
                    </li>
                    <li>
                      Create a controlled intervention only after review and
                      authorization.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Skills & Levels ontology */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                The Skills Ontology & Level Scale
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aurelinx classifies capability metrics based on three tiers of
                execution:
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-cyan-300 block">
                    L1: Foundational
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Capable of performing supervised core tasks.
                  </span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-purple-300 block">
                    L2: Operational
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Performs autonomously in production setups.
                  </span>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-xs font-black text-emerald-300 block">
                    L3: Expert / Strategic
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Drives complex systems design & mentors teams.
                  </span>
                </div>
              </div>
            </div>

            {/* Actionable Operations */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Operational Checklist
              </h3>
              <ul className="text-xs space-y-2 text-slate-200 list-disc pl-4">
                <li>
                  Use tabs at the top (
                  <strong className="text-white">
                    All / Employees / Candidates
                  </strong>
                  ) to toggle records.
                </li>
                <li>
                  Search by name, email, role, or department. Search is
                  debounced and executed server-side across the full matching
                  population, not only the cards already loaded.
                </li>
                <li>
                  The first metadata page contains up to 100 rows. Scroll near
                  the end to load more lightweight metadata automatically; full
                  skills and experience are not loaded for every card.
                </li>
                <li>
                  Read the totals separately from the loaded-card count.
                  “Records in scope” is the authoritative count; the small
                  “shown” label describes rendered matching cards.
                </li>
                <li>
                  Click an employee card to open the personnel dossier. Click a
                  candidate card to open the candidate dossier. The dossier
                  request is made only after selection.
                </li>
                <li>
                  Use the Department, Risk status, and Sentiment range filters
                  to query the complete server-side population. “At-risk
                  employees only” applies only to employees; candidates remain
                  separate.
                </li>
                <li>
                  Scroll-to-load uses paginated metadata. Off-screen cards use
                  browser content-visibility optimization, while server-side
                  pagination prevents the full database from being loaded at
                  once. This is not a limit on search or totals.
                </li>
                <li>
                  <strong>Demo compensation display:</strong> when a sample
                  profile has no salary value, the dossier may show an
                  illustrative base salary and market index marked{" "}
                  <strong className="text-amber-200">DEMO</strong>. This is
                  presentation scaffolding, not an authoritative compensation
                  value.
                </li>
                <li>
                  Use the refresh icon to re-fetch directory pages, totals,
                  department totals, and risk totals. A spinner indicates the
                  request is running.
                </li>
                <li>
                  Use the export menu or{" "}
                  <strong className="text-white">Quick PDF</strong> to request a
                  report. Exports repeat the active tab, search, department,
                  risk, and sentiment filters and page through the matching
                  database population until complete.
                </li>
                <li>
                  If a warning appears, use{" "}
                  <strong className="text-white">Retry</strong>. Do not
                  interpret an error or missing response as a zero count.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 leading-relaxed space-y-2">
              <strong className="text-white block">
                Caching, freshness, and failures
              </strong>
              <p>
                The Directory may show a user-scoped cached metadata page for up
                to ten minutes so navigation stays fast. A stale-cache notice
                tells you to refresh before making a decision or exporting.
              </p>
              <p>
                Employee and candidate totals are requested separately.
                Department totals are also separated before the shared
                department union is displayed.
              </p>
              <p>
                Profile retrieval errors, search errors, and pagination errors
                are operational failures—not empty datasets. Retry after
                checking authentication and connectivity.
              </p>
              <p>
                The Directory is a read and review surface. To change a risk
                flag or create an HR action, use an authorized workflow with its
                audit and approval controls.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] text-xs text-slate-300 leading-relaxed space-y-2">
              <strong className="text-cyan-200 block">
                Profile quality, provenance, and audit details
              </strong>
              <p>
                Opening a dossier requests validation metadata in addition to
                the profile: source classification and directory version,
                missing required fields, exact duplicate-name/email warnings,
                and audit events available to the signed-in user for that
                record.
              </p>
              <p>
                A “review” status means a required field or duplicate warning
                needs attention; it does not delete, merge, or rewrite records.
                “No audit events” means none are available to this user, not
                that the record has never changed. Organization-wide audit
                review remains governed by the protected audit surface.
              </p>
              <p>
                Directory includes a lightweight ONA summary (network people,
                links, and leading influence/bridge signals) returned by the
                protected ONA service. The full interactive graph, filters, and
                node exploration remain in Intel Center. Directory does not
                train models or invent relationships.
              </p>
            </div>
          </div>
        );

      case "intelligence":
        return (
          <div className="space-y-8">
            {/* Header section */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Network className="text-pink-400 h-5 w-5" /> Intelligence
                Center (Decision Workbench)
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The **Intelligence Center** is the mathematical core of the
                Aurelinx platform. While typical enterprise directories rely on
                static lists, Aurelinx implements a dynamic decision workbench
                powered by graph algorithms, global combinatorial search
                solvers, and semi-parametric survival models to optimize
                organizational structures.
              </p>
              <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-relaxed text-slate-300">
                <strong className="text-amber-200">
                  Observed versus modeled:
                </strong>{" "}
                employee and network records come from the tenant data scope.
                Adjacency paths, team optimization, survival curves, and Markov
                career probabilities are modeled outputs. Team optimization
                results include a model version, deterministic seed, tenant
                scope, generated timestamp, and persisted scenario ID so a
                result can be reproduced and audited.
              </div>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-indigo-400" /> Math-Engine
                Architecture & Optimization Pipeline
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
              <h3 className="text-sm font-bold text-white">
                The Three Computational Pillars
              </h3>

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
                    **What is it**: A graph representation of competencies where
                    skills are nodes and edges represent learning/transfer
                    paths.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **Why we need it**: Keywords block candidates. A search for
                    a "React Developer" shouldn't ignore a "Vue.js Developer"
                    with years of framework knowledge.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What you get**: The graph solver computes adjacency path
                    weights (e.g. `Vue.js &rarr; JavaScript &rarr; React`). If
                    the total path cost is low, the engine flags them as a match
                    and suggests a micro-training learning path.
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
                    **What is it**: An optimization model that solves the team
                    configuration problem: picking a team of $K$ employees from
                    a pool of $N$ candidates to satisfy a set of skill matrix
                    demands while remaining under a budget cap (CFO Limit) and
                    minimizing cost.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold text-pink-200">
                    Why we need it: The Combinatorial Explosion
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Assembling a team is an NP-Hard combinatorial optimization
                    problem. Selecting a team of $K = 5$ members from an
                    organization of $N = 100$ employees yields $\binom{100}
                    {5} = 75,287,520$ possible combinations. Brute-force
                    calculation would halt the server, whereas Simulated
                    Annealing maps the search space and converges on the global
                    optimum in milliseconds.
                  </p>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      Core Mathematical Formulation
                    </strong>
                    <p className="leading-relaxed">
                      At each step, the model calculates the team&apos;s{" "}
                      <strong>Energy ($E$)</strong>, which we seek to maximize:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      E = (Coverage Percentage &times; 10.0) - Cost Penalty
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>Coverage Percentage:</strong> Evaluates skills
                        in the merged roster. For each target skill $T_j$ at
                        target level $L_j$, the solver checks team members&apos;
                        skills using Dijkstra graph distances: <br />
                        <code className="text-cyan-300">
                          effective_level = candidate_level &times; (1 / (1 +
                          dijkstra_distance))
                        </code>{" "}
                        <br />
                        The achievement ratio for that skill is bounded at 1.0:{" "}
                        <code className="text-cyan-300">
                          min(1.0, effective_level / L_j)
                        </code>
                        .
                      </li>
                      <li>
                        <strong>CFO Budget Cap Constraint:</strong> Salaries are
                        read from the <strong>recorded compensation</strong> on
                        each employee profile (
                        <code className="text-cyan-300">
                          EmployeeTable.salary
                        </code>
                        ), so the budget math reflects your real pay data. Only
                        when a profile has no salary record does the solver fall
                        back to a deterministic role-length estimate:{" "}
                        <code className="text-cyan-300">
                          cost = $80,000 + (length(role) &times; $1,500)
                        </code>
                        . Each roster member is labeled{" "}
                        <code className="text-cyan-300">
                          salary_source: employee_record | role_estimate
                        </code>{" "}
                        and the metrics report a{" "}
                        <code className="text-cyan-300">
                          salary_record_ratio
                        </code>{" "}
                        so you always know how much of the cost is real versus
                        estimated. If total cost exceeds the Budget Cap, a
                        severe penalty is applied: <br />
                        <code className="text-rose-400">
                          Cost Penalty = ((Total Cost - Budget Cap) / Budget
                          Cap) &times; 5.0
                        </code>
                        .
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                      The Metropolis-Hastings Acceptance Criterion
                    </strong>
                    <p className="leading-relaxed">
                      At each iteration, the solver proposes a neighboring team
                      by swapping a random roster member with a non-member. If
                      the energy difference (Delta E = E_new - E_current) is
                      greater than 0, the swap is{" "}
                      <strong>always accepted</strong>. If the candidate team is
                      worse (Delta E is less than 0), it is accepted
                      probabilistically based on the current{" "}
                      <strong>Temperature ($T$)</strong>:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      P(Accept) = exp(&Delta;E / T)
                    </div>
                    <p className="leading-relaxed">
                      *Why this works*: High temperature at the beginning (T_0 =
                      10.0) allows the solver to accept worse teams, exploring
                      the organization and escaping local suboptimal traps. As
                      the temperature cools down by a factor of alpha = 0.85 (T
                      = T &times; 0.85) toward T_min = 0.1, the solver
                      stabilizes, narrowing down to lock in the absolute global
                      optimum.
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      Stochastic Convergence (Why results may vary)
                    </strong>
                    <p className="leading-relaxed">
                      You may notice that running the solver multiple times for
                      the same inputs yields different employee names.{" "}
                      <strong>This is mathematically expected behavior:</strong>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        The search starts with a random initial team selection.
                      </li>
                      <li>
                        Because Simulated Annealing is a stochastic
                        (probabilistic) solver, the exploration path accepts
                        temporary suboptimal states randomly.
                      </li>
                      <li>
                        If your organization contains multiple employees with
                        matching/similar skill sets (e.g. multiple engineers
                        with Python or Docker), there exist{" "}
                        <strong>
                          multiple mathematically equivalent global optima
                        </strong>
                        . The solver will converge on different, but equally
                        perfect, teams depending on its random seed trajectory.
                      </li>
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
                      <li>
                        <strong>Assembly Roster:</strong> The optimized team
                        configuration showing the roles, recorded salary (or
                        fallback estimate), and per-member{" "}
                        <code>salary_source</code>.
                      </li>
                      <li>
                        <strong>Total Skills Coverage:</strong> The coverage
                        percentage and achievement pathways showing how the team
                        covers the matrix demand (including bridge matches).
                      </li>
                      <li>
                        <strong>Total Team Cost Calculation:</strong> Aggregated
                        real salaries verified against the CFO Limit.
                      </li>
                      <li>
                        <strong>Convergence Timeline:</strong> A dual-axis SVG
                        dashboard with real tick values and gridlines. The top
                        chart plots objective energy E(x) (teal), Best-so-far E*
                        (emerald dashed), and Skill Coverage % (indigo, right
                        axis) across every annealing step. The bottom chart
                        plots Team Cost bars against the Budget Cap line (rose
                        dashed) and the Temperature cooling curve (amber, right
                        axis). X-axis labels show the actual solver step
                        numbers; hovering shows the full per-step breakdown
                        (temperature, energy, best-so-far, coverage, cost, and
                        budget usage).
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-400 h-4.5 w-4.5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      3. Attrition Sandbox Simulator (Cox Proportional Hazards
                      Model)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **What is it**: An interactive forecasting sandbox powered
                    by the Cox Proportional Hazards regression model that
                    calculates employee survival probability and flight risk
                    over a 12-month timeline.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    **Why we need it**: Retaining key talent is a critical
                    business objective. Instead of relying on static indicators
                    or retroactive exit interviews, the engine uses
                    semi-parametric survival models to estimate the probability
                    of resignation based on organizational morale, compensation
                    adjustment, tenure milestones, and skill fatigue.
                  </p>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                      Mathematical Foundations
                    </strong>
                    <p className="leading-relaxed">
                      The engine is a Cox Proportional Hazards model with a
                      piecewise-constant baseline hazard h_0(t) by tenure
                      bucket, plus a log-linear covariate risk surface. Each
                      employee&apos;s hazard rate is:
                    </p>
                    <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                      h(t) = h_0(t) &times; seniority &times; exp(dept) &times;
                      exp(&sum; &beta;_i (X_i - X&#772;_i))
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>h_0(t) (Baseline Hazard Function):</strong>{" "}
                        Piecewise-constant monthly attrition risk by tenure
                        bucket, calibrated to industry tenure-attrition
                        benchmarks: probation (&lt;6 mo: 0.8%/mo), first
                        role-fit wave (6–12 mo: 1.3%/mo), 12–18 month peak
                        (1.7%/mo), post-peak fade (18–24 mo: 1.4%/mo),
                        career-climber wave (24–36 mo: 1.1%/mo), then decay to a
                        stable senior cohort (60+ mo: 0.5%/mo).
                      </li>
                      <li>
                        <strong>
                          Hazard Ratio (Simulated Attrition Multiplier):
                        </strong>{" "}
                        <code className="text-cyan-300">
                          exp(&sum; &beta;_i (X_i - X&#772;_i))
                        </code>{" "}
                        — the multiplicative hazard of the employee&apos;s
                        profile versus the population-average profile (HR =
                        1.00). Covariates are centered on the population mean,
                        so an average employee scores exactly x1.00. The ratio
                        is clamped to [x0.20, x6.00] to keep extreme profiles
                        from exploding.
                      </li>
                      <li>
                        <strong>Survival &amp; CI:</strong> S(t) =
                        exp(-&sum;h(t)); the shaded band is a 95% model band
                        around S(t) (log-cumulative-hazard standard error). The
                        gray band and dashed line are the population P10–P90
                        range and population median survival, both derived from
                        the live workforce.
                      </li>
                      <li>
                        <strong>Median Residual Tenure:</strong> The
                        interpolated month where S(t) crosses 50% — the point at
                        which the employee has a 50/50 chance of having left.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                      Baseline Covariates (SHAP Explainability)
                    </strong>
                    <p className="leading-relaxed">
                      Nine covariates drive the log hazard ratio. Each
                      one&apos;s SHAP-style contribution &beta;_i(X_i -
                      X&#772;_i) is shown as a multiplicative factor in the
                      waterfall; factors multiply exactly to the displayed
                      hazard ratio. Green = protective, red = risky:
                    </p>
                    <ul className="list-disc pl-4 space-y-2 text-[11px] leading-relaxed">
                      <li>
                        <strong>Organizational Morale Index:</strong> sentiment
                        score; coefficient &beta; = -1.5 per morale unit. Low
                        morale raises hazard, high morale protects.
                      </li>
                      <li>
                        <strong>Salary Compression:</strong> log of salary vs
                        department median salary; &beta; = -1.0 per log unit.
                        Paying 10% above median cuts hazard by ~10%; compression
                        raises it.
                      </li>
                      <li>
                        <strong>Historical Risk Trigger:</strong> the
                        administrative `is_at_risk` flag; &beta; = +0.8.
                      </li>
                      <li>
                        <strong>Skill Overload:</strong> every assigned skill
                        beyond the healthy baseline of 4 adds &beta; = +0.06
                        (burnout proxy).
                      </li>
                      <li>
                        <strong>Proficiency Depth:</strong> average skill level
                        (1–5) vs the 3.0 reference; &beta; = -0.25 per level.
                      </li>
                      <li>
                        <strong>Role-Skill Alignment:</strong> semantic coverage
                        of the role&apos;s required skill family by the
                        employee&apos;s stack (0–1); &beta; = -1.2 per unit vs
                        the 0.6 reference. Misaligned employees carry the
                        highest preventable risk.
                      </li>
                      <li>
                        <strong>Experience Maturity:</strong> years of
                        experience beyond the 10-year inflection; &beta; = +0.08
                        per year (senior talent is more poachable).
                      </li>
                      <li>
                        <strong>Tenure Fragmentation:</strong> number of past
                        employers beyond 3; &beta; = +0.12 per employer
                        (job-hopping signal).
                      </li>
                      <li>
                        <strong>Department Base Rate:</strong> calibrated offset
                        (e.g. Sales +35%, Support +22%, Engineering -8%, Legal
                        -20%).
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                    <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      Flight Risk Mitigation Simulator & Sandbox
                    </strong>
                    <p className="leading-relaxed">
                      This sandbox is a real what-if engine: every slider
                      movement re-runs the full Cox model client-side (identical
                      math to the server, same coefficients and population
                      means) and live-updates the hazard ratio, survival curve,
                      95% band, hazard function, SHAP waterfall, tier and
                      percentile — nothing is precomputed or cosmetic:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>Morale Index Slider:</strong> Simulates
                        structural interventions (team changes, workload relief)
                        lifting morale; the morale covariate contribution is
                        recomputed against the population mean.
                      </li>
                      <li>
                        <strong>Salary Increase Slider:</strong> Simulates a
                        raise (0–50%); the new salary is re-baselined against
                        the department median and the salary-compression
                        contribution is recomputed.
                      </li>
                      <li>
                        <strong>Skill Load Slider:</strong> Simulates
                        adding/removing assigned skills; the skill-overload
                        contribution is recomputed.
                      </li>
                      <li>
                        <strong>Net effect chips:</strong> show the exact Δ in
                        12-month attrition probability, Δ hazard ratio, new
                        median tenure and the simulated risk tier vs the
                        employee&apos;s recorded baseline.
                      </li>
                    </ul>
                    <p className="leading-relaxed mt-1">
                      <strong>The Benefit:</strong> managers get live,
                      mathematically-exact ROI of salary increases or task
                      redistribution before allocating budgets — with the same
                      engine that powers the registry, so the simulation and the
                      reporting never disagree.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* UI Controls Glossary */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">
                UI Controls & Technical Terminology
              </h3>

              <div className="space-y-3.5 text-xs text-left">
                {/* Control 1 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    🎯 Target Requirements & Skill Node
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    The skill token (e.g. `TypeScript`, `Docker`) selected as a
                    search requirement.
                  </p>
                </div>

                {/* Control 2 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    📊 Minimum Proficiency
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    The capability target required for the match (L1:
                    Foundational, L2: Operational, L3: Strategic).
                  </p>
                </div>

                {/* Control 3 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    🔗 Solving Adjacencies (Graph Theory)
                  </strong>
                  <p className="text-slate-300 leading-relaxed font-semibold text-cyan-300">
                    What is an Adjacency?
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    In graph theory, two nodes are &quot;adjacent&quot; if they
                    are directly connected by an edge. In Aurelinx, a skill
                    adjacency represents a direct transfer relationship between
                    two competencies (e.g., Python is adjacent to FastAPI).
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    **Solving Adjacencies** is the process of executing a
                    shortest-path solver (such as Dijkstra&#39;s algorithm) to
                    find indirect pathways (e.g. `Vue.js &rarr; JavaScript
                    &rarr; React`) when no direct match exists. This exposes
                    hidden talent by calculating the learning proximity between
                    skills.
                  </p>
                </div>

                {/* Control 4 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    🧮 Semantic Matching Matrix
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    The underlying grid computed by the Math-Engine that indexes
                    target requirements against candidate resumes. It calculates
                    the overlap score using semantic distances, role
                    similarities, and direct/indirect skill matches.
                  </p>
                </div>

                {/* Control 5 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    🗺️ Path Analysis
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    The visual mapping of skill distances (e.g., a Vue developer
                    matching a React project with a path cost of `0.15`). Path
                    Analysis shows you the exact sequence of competencies a
                    candidate needs to bridge the gap.
                  </p>
                </div>

                {/* Control 6 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    📊 Target Match Breakdown
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    An analytical panel detailing the transition options for a
                    selected candidate. It evaluates target skills against
                    candidate competencies and categorizes them (e.g.,{" "}
                    <em>Perfect Match</em>, <em>Highly Transferable</em>, or{" "}
                    <em>Trainable Gap</em>). It displays the exact transfer
                    sequence and computed semantic distance (e.g., `Vue.js
                    &rarr; JavaScript &rarr; React` with weight `0.15`). If no
                    connection is found, it marks the distance as infinite.
                  </p>
                </div>

                {/* Control 7 */}
                <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1">
                  <strong className="text-white block text-xs">
                    🕸️ Shortest Path Graph View (Dijkstra Visualizer)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    An interactive, neon-colored SVG network showing skills as
                    nodes and competency overlaps as links.
                  </p>
                  <ul className="text-slate-300 list-disc pl-4 space-y-1 mt-1">
                    <li>
                      <strong className="text-emerald-400">
                        Neon Green Nodes:
                      </strong>{" "}
                      Represent skills currently present in the candidate&apos;s
                      profile (their existing competency islands).
                    </li>
                    <li>
                      <strong className="text-cyan-400">
                        Neon Cyan Edges:
                      </strong>{" "}
                      Highlight the shortest mathematical transition path from
                      the candidate&apos;s existing skills to the required
                      target skills.
                    </li>
                    <li>
                      <strong className="text-cyan-300">
                        Traveling Light Particles:
                      </strong>{" "}
                      Flow dynamically along the active cyan paths, showing the
                      direction and speed of the learning/transition pathway.
                    </li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed mt-1">
                    This network changes the way managers look at human talent,
                    moving from a static keyword-matching list to a dynamic
                    network.
                  </p>
                </div>
              </div>
            </div>

            {/* ONA explanation block */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Network className="text-pink-400 h-4 w-4" /> ONA Network
                Centrality Blueprint
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong>What is ONA?</strong> ONA stands for{" "}
                  <strong>Organizational Network Analysis</strong>. While
                  traditional organizational charts show only the formal
                  reporting hierarchy, ONA models the informal network of
                  communications, collaborations, and advice flows. This reveals
                  the actual collaborative engine of the company, answering:{" "}
                  <em>
                    Who is the true node of influence? Who acts as the bridge
                    between isolated departments?
                  </em>
                </div>

                <div className="relative h-44 bg-slate-900/80 rounded-lg border border-white/5 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:14px_14px]" />

                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    <line
                      x1="20%"
                      y1="50%"
                      x2="40%"
                      y2="25%"
                      stroke="rgba(244,63,94,0.3)"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="20%"
                      y1="50%"
                      x2="40%"
                      y2="75%"
                      stroke="rgba(244,63,94,0.3)"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="40%"
                      y1="25%"
                      x2="60%"
                      y2="50%"
                      stroke="rgba(236,72,153,0.8)"
                      strokeWidth="3"
                    />
                    <line
                      x1="40%"
                      y1="75%"
                      x2="60%"
                      y2="50%"
                      stroke="rgba(236,72,153,0.8)"
                      strokeWidth="3"
                    />
                    <line
                      x1="60%"
                      y1="50%"
                      x2="80%"
                      y2="30%"
                      stroke="rgba(45,212,191,0.4)"
                      strokeWidth="2"
                    />
                    <line
                      x1="60%"
                      y1="50%"
                      x2="80%"
                      y2="70%"
                      stroke="rgba(45,212,191,0.4)"
                      strokeWidth="2"
                    />
                  </svg>

                  <div className="absolute left-[15%] top-[40%] flex flex-col items-center">
                    <div className="h-6 w-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      A
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      Isolated
                    </span>
                  </div>

                  <div className="absolute left-[36%] top-[15%] flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[10px] text-cyan-300 font-bold shadow-[0_0_8px_rgba(45,212,191,0.4)]">
                      B
                    </div>
                    <span className="text-[9px] text-cyan-300 mt-1">
                      High PageRank
                    </span>
                  </div>

                  <div className="absolute left-[36%] top-[65%] flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-[10px] text-cyan-300 font-bold shadow-[0_0_8px_rgba(45,212,191,0.4)]">
                      C
                    </div>
                    <span className="text-[9px] text-cyan-300 mt-1">
                      Team Hub
                    </span>
                  </div>

                  <div className="absolute left-[56%] top-[40%] flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-pink-500 border-2 border-pink-400 flex items-center justify-center text-[11px] text-slate-950 font-black shadow-[0_0_12px_rgba(236,72,153,0.6)]">
                      D
                    </div>
                    <span className="text-[9px] text-pink-400 font-extrabold mt-1">
                      Key Broker
                    </span>
                  </div>

                  <div className="absolute left-[76%] top-[20%] flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                      E
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      Operational
                    </span>
                  </div>

                  <div className="absolute left-[76%] top-[60%] flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                      F
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      Operational
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 text-left">
                  {/* Metric 1 */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                    <strong className="text-cyan-300 block flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" /> PageRank Centrality
                      (Influence)
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Measures:</strong> Overall connectivity and
                      communication propagation strength. High PageRank nodes
                      act as information multipliers.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-black/30 p-1.5 rounded">
                      PR(u) = (1-d)/N + d &times; &sum; [PR(v) / L(v)]
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      *Logic*: Adopted from Google&apos;s web-ranking algorithm,
                      it measures structural prestige. An employee receives high
                      PageRank if they are connected to other highly connected
                      employees, indicating key decision-makers who can
                      broadcast communications effectively.
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-1">
                    <strong className="text-pink-300 block flex items-center gap-1">
                      <Network className="h-3.5 w-3.5" /> Betweenness Centrality
                      (Bridges)
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Measures:</strong> Structural bridge strength
                      across siloed departments. High betweenness employees
                      prevent organizational communication bottlenecks.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-black/30 p-1.5 rounded">
                      C_B(v) = &sum; [&sigma;_st(v) / &sigma;_st]
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      *Logic*: Calculated via Brandes&apos; algorithm, it
                      represents the fraction of all shortest communication
                      paths that pass through an employee. High-betweenness
                      employees act as bridges (like Node <strong>D</strong>).
                      If a bridge is at risk of resigning, communication silos
                      will form.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2 text-left text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-indigo-300">
                    Dynamic Collaboration Weight Ingestion (Jira Logs)
                  </strong>
                  <p className="text-slate-300 leading-relaxed">
                    Rather than relying on self-reported survey matrices, the
                    collaboration links in the ONA graph are calculated by
                    compiling actual, passive interaction events:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>
                      <strong className="text-slate-300">
                        Shared Department adjacency:
                      </strong>{" "}
                      Injects a base connection weight of{" "}
                      <code className="text-indigo-300">+0.4</code>.
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Skills Overlap adjacency:
                      </strong>{" "}
                      Injects <code className="text-indigo-300">+0.1</code> per
                      overlapping skill (capped at{" "}
                      <code className="text-indigo-300">+0.4</code>).
                    </li>
                    <li>
                      <strong className="text-slate-300">
                        Dynamic Jira Log Ingestion:
                      </strong>{" "}
                      Evaluates project logs. If two employee emails are found
                      co-assigned or collaborating on the same Jira ticket, the
                      edge weight increases by{" "}
                      <code className="text-emerald-400">+0.3</code> per log
                      (capped at <code className="text-emerald-400">+0.9</code>
                      ).
                    </li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed">
                    An interaction link is established between two employees if
                    the total aggregate weight exceeds{" "}
                    <code className="text-indigo-300">0.1</code>. This makes the
                    force-directed graph a real representation of informal
                    workflow channels.
                  </p>
                </div>
              </div>
            </div>

            {/* Markov Career Path Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="text-cyan-400 h-4 w-4" /> Markov Career
                Path & Transition Horizon
              </h3>

              <div className="p-5 rounded-xl bg-slate-950/60 border border-white/10 space-y-4 text-left text-xs">
                <p className="text-slate-300 leading-relaxed">
                  <strong>What is it?</strong> The Markov Career Path is a
                  predictive modeling framework that maps potential employee
                  career progression as a probabilistic state transition
                  network. Rather than viewing career paths as static, linear
                  ladders, Aurelinx recognizes that employees move across
                  departments and roles stochastically, modeled as a{" "}
                  <strong>First-Order Markov Chain</strong>.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Why we need it:</strong> Traditional performance
                  reviews and development plans are qualitative and subjective.
                  By modeling career paths mathematically, managers can see
                  where employees are structurally headed, identify potential
                  retention risks, and design optimized development paths based
                  on actual skills gaps.
                </p>

                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                    Mathematical Modeling & Chapman-Kolmogorov Theorem
                  </strong>
                  <p className="leading-relaxed">
                    The career transition network represents roles as states.
                    The transition probability from state $i$ to state $j$ in a
                    single epoch (1 year) is denoted as P_ij.
                  </p>
                  <p className="leading-relaxed">
                    To personalize this progression, the base historical
                    transition rate is adjusted by the employee&apos;s{" "}
                    <strong>Skills Coverage Ratio</strong> for the target role:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P&apos;_ij = P_ij &times; Skills_Coverage_Ratio(employee,
                    role_j)
                  </div>
                  <p className="leading-relaxed">
                    This is then normalized across all outgoing transitions from
                    state $i$:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P&apos;&apos;_ij = P&apos;_ij / &sum;_k P&apos;_ik
                  </div>
                  <p className="leading-relaxed">
                    To compute the transition probabilities over a{" "}
                    <strong>3-year horizon</strong>, we apply the{" "}
                    <strong>Chapman-Kolmogorov Equations</strong> by raising the
                    transition probability matrix to the 3rd power:
                  </p>
                  <div className="p-2 bg-slate-950 font-mono text-[11px] text-center text-pink-300 rounded border border-white/5">
                    P^(3) = P^3
                  </div>
                  <p className="leading-relaxed">
                    The resulting values are the cumulative transition
                    probabilities displayed in the visual career tracker.
                  </p>
                </div>

                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-slate-300 text-xs">
                  <strong className="text-white block font-mono text-[10px] uppercase tracking-wider text-pink-300">
                    Understanding Career Tracker Terminology
                  </strong>
                  <ul className="list-disc pl-4 space-y-2 text-[11px] leading-relaxed">
                    <li>
                      <strong>Active Career Tracker:</strong> The visualization
                      workbench that loads an employee&apos;s profile and
                      renders their career path transition graph showing nodes
                      (roles) and connecting directional arrows.
                    </li>
                    <li>
                      <strong>Transition Probability (% Prob.):</strong> The
                      percentage displayed on each future role card represents
                      the mathematical probability that the employee will occupy
                      that role state at the end of the transition horizon (3
                      years).
                    </li>
                    <li>
                      <strong>Interactive Career Planning:</strong> If an
                      employee&apos;s transition probability to a desired role
                      (e.g., Lead Engineer) is low due to skill gaps, the
                      workbench outlines the precise skills they must acquire.
                      Once those skills are marked as acquired, the Skills
                      Coverage Ratio increases, raising their transition
                      probability and updating their career roadmap in
                      real-time.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Compliance approval gates */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Compliance Approval Gates
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                High-impact interventions or structural updates (such as
                releasing department reorganizations) trigger **Mandatory Policy
                Pack Gates**. These gates require administrative override keys
                to authorize releases.
              </p>
            </div>
          </div>
        );

      case "dataops":
      case "dataops_overview":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Database className="text-cyan-400 h-5 w-5" /> Data Ops &
                Enterprise Console
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                The Enterprise Console contains raw pipeline registries,
                telemetry logs, model cards, structural simulation sandboxes,
                and the **Reviews Queue & Risk Interventions Operational
                Engine**.
              </p>
            </div>

            {/* DEDICATED SUB-MANUAL NAVIGATION CONTROLS */}
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4 space-y-4 shadow-xl">
              <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" /> Enterprise
                Sub-Manual Chapters:
              </div>

              {/* SPECIAL FEATURED HIGHLIGHT BANNER FOR REVIEWS QUEUE */}
              <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/60 p-5 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-wider">
                      Sub-Manual Chapter 1
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      Reviews Queue & Operational Risk Interventions: End-to-End
                      Operational Guide
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono">
                    ✓ Live Workflow Spec v2.4
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  This detailed sub-manual explains the exact mathematics,
                  underlying calculations, business logic, card anatomy, button
                  operations, and decision workflows of the **Reviews Queue**
                  inside Data Ops & Enterprise.
                </p>

                {/* CHAPTER SECTION 1: WHAT IS REVIEWS QUEUE & WHY WE NEED IT */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" /> 1. What is the
                    Reviews Queue and Why is it Essential?
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-300">
                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1.5">
                      <strong className="text-white block text-sm">
                        Signal Discovery vs Human Triage
                      </strong>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Aurelinx continually scans organizational metrics
                        (morale, pay parity, workload) and flags risk signals.
                        Rather than mutating employee records automatically,
                        risk signals enter the <strong>Reviews Queue</strong> as
                        planned review tickets (
                        <code className="text-cyan-300">status: planned</code>).
                        This gives HR Business Partners and managers full audit
                        control to investigate evidence before spending budget.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1.5">
                      <strong className="text-white block text-sm">
                        Why We Need This Workspace
                      </strong>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Unmanaged employee attrition costs enterprises 1.5x to
                        2.0x annual salary per departed engineer or leader. The
                        Reviews Queue converts silent flight risk signals into{" "}
                        <strong>accountable, owned retention actions</strong>{" "}
                        with auditable budget tracking and outcome measurement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CHAPTER SECTION 2: MATHEMATICS, FORMULAS & CALCULATION ENGINE */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" /> 2.
                    Mathematical Calculations & Algorithmic Engines
                  </h4>

                  <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                      <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                        A. Flight Risk Probability
                      </div>
                      <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                        HR = exp(β₁·Morale + β₂·PayGap + β₃·Workload)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Evaluates Cox Proportional Hazards survival regression.
                        Combines sentiment drop, salary gap, and overtime hours
                        to calculate exact flight risk probability percentage
                        (e.g. <strong>78.4%</strong>).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                      <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                        B. Market Pay Parity Gap
                      </div>
                      <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                        Gap% = ((BaseSalary - MarketMedian) / MarketMedian) *
                        100
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Compares employee base salary against benchmarked market
                        medians for their role and level, identifying
                        compensation risk gaps (e.g.{" "}
                        <strong>-22.5% below median</strong>).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                      <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        C. Morale & Sentiment Score
                      </div>
                      <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                        Score = ∑(TokenSentiment * Weight) / N
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Aggregates anonymized feedback, communication sentiment
                        signals, and 1-on-1 survey indicators into a normalized
                        [0.0 to 1.0] scale (e.g.{" "}
                        <strong>0.38 / 1.0 Low Morale</strong>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* CHAPTER SECTION 3: ANATOMY OF A REVIEW REQUEST CARD */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" /> 3. Anatomy
                    of a Review Request Card
                  </h4>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between gap-3">
                      <div>
                        <strong className="text-cyan-300 block mb-1">
                          Header Metadata & Badges:
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          Displays ticket type (
                          <code className="text-cyan-200">Review Request</code>
                          ), target employee/team name, priority badge (
                          <code className="text-amber-300">
                            MEDIUM / HIGH / CRITICAL
                          </code>
                          ), department, and assigned HRBP owner.
                        </span>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-md bg-slate-800 border border-white/10 text-rose-300 font-mono text-[10px] font-bold self-start">
                        STATUS: PLANNED
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10">
                      <strong className="text-cyan-300 block mb-1">
                        Recommended Triage Action / Evidence Signal Box:
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Summarizes AI findings (e.g.{" "}
                        <em>
                          "Document a retention conversation and reassess
                          employee risk signals."
                        </em>
                        ) to give HR immediate triage guidance.
                      </span>
                    </div>
                  </div>
                </div>

                {/* CHAPTER SECTION 4: FULL OPERATIONAL WORKFLOW OF BUTTONS */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" /> 4.
                    Detailed Operation of Action Buttons
                  </h4>

                  <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-300">
                    {/* BUTTON 1 */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <span>⚡ Escalate to Active Plan</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Opens an interactive modal to enter{" "}
                        <strong>Allocated Retention Budget ($)</strong>,{" "}
                        <strong>Assigned HR Owner</strong>,{" "}
                        <strong>Priority Level</strong>, and{" "}
                        <strong>Strategy Notes</strong>. Upon confirming:
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                        <li>
                          Updates status to{" "}
                          <code className="text-cyan-300">in_progress</code>{" "}
                          with assigned budget.
                        </li>
                        <li>
                          Moves ticket from <em>Pending Reviews Queue</em> into{" "}
                          <em>Active Interventions Workflow</em>.
                        </li>
                        <li>
                          Renders a direct button:{" "}
                          <code className="text-emerald-300">
                            View in Active Interventions Workflow →
                          </code>
                          .
                        </li>
                      </ul>
                    </div>

                    {/* BUTTON 2 */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-cyan-500/20 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-cyan-300">
                        <span>📅 Schedule Retention Meeting</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Opens an interactive modal to set{" "}
                        <strong>Scheduled Date & Time</strong>,{" "}
                        <strong>HRBP Lead</strong>, and{" "}
                        <strong>Agenda Topics</strong>. Upon confirming:
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                        <li>Locks calendar timestamp in database record.</li>
                        <li>
                          Displays a prominent cyan calendar badge in Active
                          Interventions.
                        </li>
                        <li>
                          Enables 30/60/90-day retention outcome tracking.
                        </li>
                      </ul>
                    </div>

                    {/* BUTTON 3 */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-300">
                        <span>🚫 Dismiss Signal</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Opens a modal prompting for an{" "}
                        <strong>Audit Justification Reason</strong> (e.g.{" "}
                        <em>False positive signal</em>,{" "}
                        <em>Recently promoted</em>, <em>Planned departure</em>).
                        Upon confirming:
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                        <li>
                          Updates status to{" "}
                          <code className="text-rose-300">cancelled</code>.
                        </li>
                        <li>
                          Logs dismissal reason into compliance audit trail.
                        </li>
                        <li>Archives request out of active queues.</li>
                      </ul>
                    </div>

                    {/* BUTTON 4 */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-purple-500/20 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-purple-300">
                        <span>🔍 View Evidence & Audit</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Expands the{" "}
                        <strong>
                          Interactive 3-Part Operational Audit Hub
                        </strong>{" "}
                        directly on the card:
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                        <li>
                          <strong>Part 1:</strong> Flight Risk, Pay Gap, and
                          Morale Score visual progress bars.
                        </li>
                        <li>
                          <strong>Part 2:</strong> Chronological log of ticket
                          creation, HR assignments, budget approval, and notes.
                        </li>
                        <li>
                          <strong>Part 3:</strong> 30/60/90-day outcome scoring
                          checkpoints.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CHAPTER SECTION 5: ENTERPRISE GOVERNANCE, SECURITY & AUDIT COMPLIANCE PROTOCOLS */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-emerald-400" /> 5.
                    Enterprise Governance &amp; Audit Compliance Protocols
                  </h4>
                  <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                      <strong className="text-white block text-sm">
                        Human-in-the-Loop Safeguards
                      </strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        AI flight risk signals serve strictly as decision
                        support prompts. Aurelinx never alters employee
                        contracts, salaries, or roles automatically.
                        Administrative authorization is required for high-impact
                        actions.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                      <strong className="text-white block text-sm">
                        Immutable Audit Trails
                      </strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Every triage action (Escalate, Schedule Meeting,
                        Dismiss) is stamped with UTC timestamps, assigned user
                        credentials, and mandatory justification audit logs.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                      <strong className="text-white block text-sm">
                        Automated Signal Recalibration
                      </strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Risk probabilities and morale scores automatically
                        update when new verified HRIS compensation data or
                        communication sentiment snapshots are ingested.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GENERAL ENTERPRISE CONSOLE SUMMARY */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-white">
                Enterprise Connections &amp; Compliance Hub
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Enterprise Operations page registers HRIS/ATS connections,
                monitors sync jobs, manages evidence-linked interventions, and
                exposes model governance, disaster recovery, and compliance
                controls.
              </p>
              <div className="grid gap-2.5 md:grid-cols-3 text-xs text-slate-300">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-cyan-300 block mb-1">
                    Integration connections
                  </strong>
                  Register approved Workday, Greenhouse, or other HRIS/ATS
                  sources and monitor their sync status before data is used.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-cyan-300 block mb-1">
                    Intervention workflows
                  </strong>
                  Convert reviewed workforce signals into owned,
                  status-controlled HR actions with checkpoint history and audit
                  evidence.
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <strong className="text-cyan-300 block mb-1">
                    Governance &amp; compliance
                  </strong>
                  Review model quality, fairness, drift, policies, recovery
                  readiness, and audit events before production decisions.
                </div>
              </div>
            </div>
          </div>
        );

      case "risk_interventions":
      case "dataops_reviews":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-mono">
                <Database size={14} /> Data Ops &amp; Enterprise ➔ Risk &amp;
                Interventions Engine
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Zap className="text-amber-400 h-6 w-6" /> Reviews Queue &amp;
                Operational Risk Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Complete, detailed operational manual explaining the exact
                mathematics, underlying calculations, business logic, card
                anatomy, button operations, and decision workflows of the
                **Reviews Queue** inside Data Ops &amp; Enterprise.
              </p>
            </div>

            {/* FEATURED BANNER */}
            <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/60 p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-wider">
                    Dedicated Operational Handbook
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    Reviews Queue &amp; Triage Engine: Operational Specification
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono">
                  ✓ Spec v2.4 Active
                </span>
              </div>

              {/* SECTION 1: WHAT IS REVIEWS QUEUE & WHY WE NEED IT */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" /> 1. What is the
                  Reviews Queue and Why is it Essential?
                </h4>
                <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-300">
                  <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1.5">
                    <strong className="text-white block text-sm">
                      Signal Discovery vs Human Triage
                    </strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Aurelinx continually scans organizational metrics (morale,
                      pay parity, workload) and flags risk signals. Rather than
                      mutating employee records automatically, risk signals
                      enter the <strong>Reviews Queue</strong> as planned review
                      tickets (
                      <code className="text-cyan-300">status: planned</code>).
                      This gives HR Business Partners and managers full audit
                      control to investigate evidence before spending budget.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1.5">
                    <strong className="text-white block text-sm">
                      Why We Need This Workspace
                    </strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Unmanaged employee attrition costs enterprises 1.5x to
                      2.0x annual salary per departed engineer or leader. The
                      Reviews Queue converts silent flight risk signals into{" "}
                      <strong>accountable, owned retention actions</strong> with
                      auditable budget tracking and outcome measurement.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: MATHEMATICS & FORMULAS */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" /> 2. Mathematical
                  Calculations &amp; Algorithmic Engines
                </h4>

                <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                    <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                      A. Flight Risk Probability
                    </div>
                    <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                      HR = exp(β₁·Morale + β₂·PayGap + β₃·Workload)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Evaluates Cox Proportional Hazards survival regression.
                      Combines sentiment drop, salary gap, and overtime hours to
                      calculate exact flight risk probability percentage (e.g.{" "}
                      <strong>78.4% Critical Risk</strong>).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      B. Market Pay Parity Gap
                    </div>
                    <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                      Gap% = ((BaseSalary - MarketMedian) / MarketMedian) * 100
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Compares employee base salary against benchmarked market
                      medians for their role and level, identifying compensation
                      risk gaps (e.g. <strong>-22.5% below median</strong>).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-2">
                    <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                      C. Morale &amp; Sentiment Score
                    </div>
                    <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                      Score = ∑(TokenSentiment * Weight) / N
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Aggregates anonymized feedback, communication sentiment
                      signals, and 1-on-1 survey indicators into a normalized
                      [0.0 to 1.0] scale (e.g.{" "}
                      <strong>0.38 / 1.0 Low Morale</strong>).
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ANATOMY OF A REVIEW REQUEST CARD */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" /> 3. Anatomy
                  of a Review Request Card
                </h4>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between gap-3">
                    <div>
                      <strong className="text-cyan-300 block mb-1">
                        Header Metadata &amp; Badges:
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Displays ticket type (
                        <code className="text-cyan-200">Review Request</code>),
                        target employee/team name, priority badge (
                        <code className="text-amber-300">
                          MEDIUM / HIGH / CRITICAL
                        </code>
                        ), department, and assigned HRBP owner.
                      </span>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-md bg-slate-800 border border-white/10 text-rose-300 font-mono text-[10px] font-bold self-start">
                      STATUS: PLANNED
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10">
                    <strong className="text-cyan-300 block mb-1">
                      Recommended Triage Action / Evidence Signal Box:
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      Summarizes AI findings (e.g.{" "}
                      <em>
                        "Document a retention conversation and reassess employee
                        risk signals."
                      </em>
                      ) to give HR immediate triage guidance.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: FULL OPERATIONAL WORKFLOW OF BUTTONS */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" /> 4. Detailed
                  Operation of Action Buttons
                </h4>

                <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-300">
                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span>⚡ Escalate to Active Plan</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Opens an interactive modal to enter{" "}
                      <strong>Allocated Retention Budget ($)</strong>,{" "}
                      <strong>Assigned HR Owner</strong>,{" "}
                      <strong>Priority Level</strong>, and{" "}
                      <strong>Strategy Notes</strong>. Upon confirming:
                    </p>
                    <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                      <li>
                        Updates status to{" "}
                        <code className="text-cyan-300">in_progress</code> with
                        assigned budget.
                      </li>
                      <li>
                        Moves ticket from <em>Pending Reviews Queue</em> into{" "}
                        <em>Active Interventions Workflow</em>.
                      </li>
                      <li>
                        Renders a direct button:{" "}
                        <code className="text-emerald-300">
                          View in Active Interventions Workflow →
                        </code>
                        .
                      </li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-cyan-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-300">
                      <span>📅 Schedule Retention Meeting</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Opens an interactive modal to set{" "}
                      <strong>Scheduled Date &amp; Time</strong>,{" "}
                      <strong>HRBP Lead</strong>, and{" "}
                      <strong>Agenda Topics</strong>. Upon confirming:
                    </p>
                    <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                      <li>Locks calendar timestamp in database record.</li>
                      <li>
                        Displays a prominent cyan calendar badge in Active
                        Interventions.
                      </li>
                      <li>Enables 30/60/90-day retention outcome tracking.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-300">
                      <span>🚫 Dismiss Signal</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Opens a modal prompting for an{" "}
                      <strong>Audit Justification Reason</strong> (e.g.{" "}
                      <em>False positive signal</em>, <em>Recently promoted</em>
                      , <em>Planned departure</em>). Upon confirming:
                    </p>
                    <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                      <li>
                        Updates status to{" "}
                        <code className="text-rose-300">cancelled</code>.
                      </li>
                      <li>
                        Logs dismissal reason into compliance audit trail.
                      </li>
                      <li>Archives request out of active queues.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-purple-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-purple-300">
                      <span>🔍 View Evidence &amp; Audit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Expands the{" "}
                      <strong>Interactive 3-Part Operational Audit Hub</strong>{" "}
                      directly on the card:
                    </p>
                    <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
                      <li>
                        <strong>Part 1:</strong> Flight Risk, Pay Gap, and
                        Morale Score visual progress bars.
                      </li>
                      <li>
                        <strong>Part 2:</strong> Chronological log of ticket
                        creation, HR assignments, budget approval, and notes.
                      </li>
                      <li>
                        <strong>Part 3:</strong> 30/60/90-day outcome scoring
                        checkpoints.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* SECTION 5: ENTERPRISE GOVERNANCE, SECURITY & AUDIT COMPLIANCE PROTOCOLS */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-emerald-400" /> 5.
                  Enterprise Governance &amp; Audit Compliance Protocols
                </h4>
                <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                    <strong className="text-white block text-sm">
                      Human-in-the-Loop Safeguards
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      AI flight risk signals serve strictly as decision support
                      prompts. Aurelinx never alters employee contracts,
                      salaries, or roles automatically. Administrative
                      authorization is required for high-impact actions.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                    <strong className="text-white block text-sm">
                      Immutable Audit Trails
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Every triage action (Escalate, Schedule Meeting, Dismiss)
                      is stamped with UTC timestamps, assigned user credentials,
                      and mandatory justification audit logs.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 space-y-1">
                    <strong className="text-white block text-sm">
                      Automated Signal Recalibration
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Risk probabilities and morale scores automatically update
                      when new verified HRIS compensation data or communication
                      sentiment snapshots are ingested.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "dataops_create":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise ➔ Risk &amp; Interventions Engine
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Activity className="text-emerald-400 h-6 w-6" /> Create
                Intervention Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Operational instructions for proposing manual HR follow-up
                actions and retention plans.
              </p>
            </div>
            <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4 text-xs text-slate-300 shadow-xl">
              <h3 className="font-bold text-white text-sm">
                Proposing a New Intervention Step-by-Step:
              </h3>
              <ol className="list-decimal pl-5 space-y-3 text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-cyan-300">
                    Select Target Scope:
                  </strong>{" "}
                  Choose whether the action applies to an individual (
                  <code className="text-white">EMPLOYEE</code>), a team (
                  <code className="text-white">TEAM</code>), an entire
                  department (<code className="text-white">DEPARTMENT</code>),
                  or organization-wide (
                  <code className="text-white">ORGANIZATION</code>).
                </li>
                <li>
                  <strong className="text-cyan-300">
                    Assign HRBP Owner &amp; Priority:
                  </strong>{" "}
                  Assign the accountable HR Business Partner owner and select
                  urgency level (<code className="text-slate-300">LOW</code>,{" "}
                  <code className="text-amber-300">MEDIUM</code>,{" "}
                  <code className="text-orange-300">HIGH</code>, or{" "}
                  <code className="text-rose-400 font-bold">CRITICAL</code>).
                </li>
                <li>
                  <strong className="text-cyan-300">
                    Formulate Strategy &amp; Budget:
                  </strong>{" "}
                  Allocate planned retention budget ($) and document expected
                  outcome metrics (e.g.{" "}
                  <em>"1-on-1 workload rebalancing and compensation review"</em>
                  ).
                </li>
                <li>
                  <strong className="text-cyan-300">
                    Save Intervention Ticket:
                  </strong>{" "}
                  Clicking Save creates a planned ticket record (
                  <code className="text-cyan-300">status: planned</code>).
                  Aurelinx does not automatically discipline, contact, or modify
                  employee source records.
                </li>
              </ol>
            </div>
          </div>
        );

      case "dataops_active":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise ➔ Risk &amp; Interventions Engine
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <TrendingUp className="text-cyan-400 h-6 w-6" /> Active
                Interventions Workflow Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Lifecycle management, state transitions, and 30 / 60 / 90-day
                outcome checkpoint scoring.
              </p>
            </div>
            <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4 text-xs text-slate-300 shadow-xl">
              <h3 className="font-bold text-white text-sm">
                Intervention Lifecycle States:
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/20 space-y-1">
                  <strong className="text-cyan-300 block text-xs">
                    IN_PROGRESS
                  </strong>
                  <p className="text-[11px] text-slate-400">
                    Retention action active with assigned budget and active
                    owner.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/20 space-y-1">
                  <strong className="text-emerald-300 block text-xs">
                    COMPLETED
                  </strong>
                  <p className="text-[11px] text-slate-400">
                    Action completed successfully by HRBP lead.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/20 space-y-1">
                  <strong className="text-rose-300 block text-xs">
                    CANCELLED
                  </strong>
                  <p className="text-[11px] text-slate-400">
                    Dismissed or archived signal with audit reason logged.
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-white/10">
                <h4 className="font-bold text-cyan-300 text-xs">
                  30 / 60 / 90-Day Outcome Checkpoints
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  HR records human-verified outcome checkpoints after 30, 60,
                  and 90 days (
                  <code className="text-emerald-300">Improved</code>,{" "}
                  <code className="text-amber-300">Equal</code>,{" "}
                  <code className="text-rose-300">Worsened</code>). These
                  checkpoints calculate the overall intervention success score
                  (%) without modifying source records.
                </p>
              </div>
            </div>
          </div>
        );

      case "dataops_cfo":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise ➔ Risk &amp; Interventions Engine
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <PieChart className="text-purple-400 h-6 w-6" /> CFO Scenario
                Lab Simulation Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Financial impact forecasting, restructuring simulations, and
                replacement cost calculations.
              </p>
            </div>
            <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4 text-xs text-slate-300 shadow-xl">
              <h3 className="font-bold text-white text-sm">
                Financial Attrition Exposure Formula:
              </h3>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10 font-mono text-cyan-200 text-xs">
                Total Financial Risk Exposure = ∑ (Employee Base Salary ×
                Replacement Multiplier [1.5x - 2.0x])
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Re-allocating retention budget proactively saves enterprises
                significant capital compared to re-hiring, onboarding, and
                productivity loss.
              </p>
            </div>
          </div>
        );

      case "dataops_attrition":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise ➔ Risk &amp; Interventions Engine
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Brain className="text-rose-400 h-6 w-6" /> Explainable
                Attrition Drivers Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                SHAP feature attribution analysis identifying key drivers of
                employee turnover.
              </p>
            </div>
            <div className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 space-y-3 text-xs text-slate-300 shadow-xl">
              <h3 className="font-bold text-white text-sm">
                Top Risk Signal Categories:
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-400 leading-relaxed">
                <li>
                  <strong>Overtime Stress &amp; Fatigue:</strong> Excess
                  overtime hours above baseline.
                </li>
                <li>
                  <strong>Market Compensation Parity Disparity:</strong> Base
                  salary &gt; 20% below market median.
                </li>
                <li>
                  <strong>Sentiment &amp; Morale Drop:</strong> Significant drop
                  in survey and communication NLP score.
                </li>
              </ul>
            </div>
          </div>
        );

      case "dataops_pipelines":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise Console
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Activity className="text-cyan-400 h-6 w-6" /> Data Pipelines
                &amp; Sync Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Registry for webhooks, raw ingest event tables, and quarantine
                event validation logs.
              </p>
            </div>
          </div>
        );

      case "dataops_governance":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise Console
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Cpu className="text-emerald-400 h-6 w-6" /> AI Model Governance
                &amp; Model Cards Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Machine learning model cards, PR-AUC accuracy diagnostics,
                calibration charts, and fairness gap diagnostics.
              </p>
            </div>
          </div>
        );

      case "dataops_compliance":
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 font-mono">
                Data Ops &amp; Enterprise Console
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Key className="text-amber-400 h-6 w-6" /> Compliance &amp;
                Audit Logs Sub-Manual
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                SOC2 audit trails, disaster recovery runbooks, tenant isolation
                policies, and immutability logs.
              </p>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Key className="text-amber-400 h-5 w-5" /> Providers & Webhook
                Registry
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                Connect Aurelinx directly to external HRIS and communication
                suites. Secure connections use token headers and HMAC payload
                signatures.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Ingestion Webhooks
              </h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Slack Morale API
                  </strong>
                  Endpoint:{" "}
                  <code className="text-cyan-300">
                    /api/v1/integrations/slack
                  </code>{" "}
                  <br />
                  Ingests sentiment scores and message counts to dynamically
                  adjust employee risk parameters.
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Workday HRIS Sync
                  </strong>
                  Endpoint:{" "}
                  <code className="text-cyan-300">
                    /api/v1/integrations/workday
                  </code>{" "}
                  <br />
                  Syncs hiring events, role changes, and technical skill
                  libraries.
                </div>
                <div className="p-2.5 bg-slate-950/40 rounded border border-white/5">
                  <strong className="text-white block mb-0.5">
                    Jira Activity API
                  </strong>
                  Endpoint:{" "}
                  <code className="text-cyan-300">
                    /api/v1/integrations/jira
                  </code>{" "}
                  <br />
                  Ingests ticket assignment collaborations to construct ONA
                  coordinates.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">How to Integrate</h3>
              <ol className="text-xs space-y-1.5 text-slate-200 list-decimal pl-4">
                <li>
                  Create an API Token in Settings ➔ Integrations. Copy the key
                  securely.
                </li>
                <li>
                  Add webhooks in Slack, Jira, or Workday pointing to the
                  endpoints above.
                </li>
                <li>
                  Add header{" "}
                  <code className="text-cyan-300">
                    X-API-Key: [your_api_key]
                  </code>{" "}
                  on webhook requests.
                </li>
                <li>
                  Include <code className="text-cyan-300">X-Signature</code>{" "}
                  with SHA-256 HMAC of the body using the API key as secret for
                  signature verification.
                </li>
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
                  <h1 className="text-lg font-black text-white leading-none">
                    Aurelinx System User Manual
                  </h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                    Operational Guide & Telemetry Handbooks
                  </p>
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
              {/* Sidebar with Collapsible Table of Contents Tree */}
              <div className="w-72 border-r border-white/10 bg-slate-950/40 overflow-y-auto p-3 space-y-1 flex-none hidden md:block">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 px-3 py-2 flex items-center gap-1.5">
                  <BookOpen size={12} /> User Manual Table of Contents
                </div>
                {navTree.map((node) => {
                  const renderNode = (item, level = 0) => {
                    const Icon = item.icon || BookOpen;
                    const isActive = activeTab === item.id;
                    const hasChildren =
                      item.hasChildren &&
                      item.children &&
                      item.children.length > 0;
                    const isExpanded = expandedNodes[item.id];
                    const indentClass =
                      level === 1 ? "pl-5" : level === 2 ? "pl-8" : "pl-3";

                    return (
                      <div key={item.id} className="space-y-0.5">
                        <button
                          onClick={(e) => {
                            if (hasChildren) {
                              toggleNode(item.id, e);
                              if (item.children[0])
                                setActiveTab(item.children[0].id);
                            } else {
                              setActiveTab(item.id);
                            }
                          }}
                          className={`w-full flex items-center justify-between ${indentClass} pr-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                            isActive
                              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon
                              size={level === 0 ? 15 : 13}
                              className={
                                isActive ? "text-cyan-400" : "text-slate-400"
                              }
                            />
                            <span className="truncate text-[11px]">
                              {item.label}
                            </span>
                          </div>
                          {hasChildren && (
                            <span
                              onClick={(e) => toggleNode(item.id, e)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown size={13} />
                              ) : (
                                <ChevronRight size={13} />
                              )}
                            </span>
                          )}
                        </button>

                        {hasChildren && isExpanded && (
                          <div className="space-y-0.5 mt-0.5 border-l border-white/10 ml-3.5">
                            {item.children.map((child) =>
                              renderNode(child, level + 1),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderNode(node, 0);
                })}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/10">
                {/* Mobile Tab Selector */}
                <div className="md:hidden mb-6">
                  <PremiumSelect
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-white/10 text-xs text-white outline-none"
                  >
                    <option value="dashboard">Executive Dashboard</option>
                    <option value="overview">Overview & Setup</option>
                    <option value="workflows">Workflow Chat & Agents</option>
                    <option value="scout">Talent Scout Matchmaker</option>
                    <option value="analytics">Analytics & Sentiment</option>
                    <option value="directory">Talent Directory</option>
                    <option value="intelligence">Intelligence Center</option>
                    <optgroup label="Data Ops & Enterprise">
                      <option value="dataops_overview">
                        Enterprise Console Overview
                      </option>
                      <option value="dataops_pipelines">
                        Data Pipelines & Sync
                      </option>
                      <option value="dataops_governance">
                        AI Governance & Models
                      </option>
                      <option value="dataops_reviews">
                        📋 Reviews Queue & Triage
                      </option>
                      <option value="dataops_create">
                        ➕ Create Intervention Guide
                      </option>
                      <option value="dataops_active">
                        🔄 Active Interventions Workflow
                      </option>
                      <option value="dataops_cfo">📊 CFO Scenario Lab</option>
                      <option value="dataops_attrition">
                        🔍 Explainable Attrition Drivers
                      </option>
                      <option value="dataops_compliance">
                        Compliance & Audit Telemetry
                      </option>
                    </optgroup>
                    <option value="integrations">Providers & Webhooks</option>
                  </PremiumSelect>
                </div>

                {renderContent()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-between items-center text-[10px] text-slate-400">
              <div>Aurelinx Core Version v4.1.0-Release</div>
              <div className="flex items-center gap-1.5">
                <Code size={12} className="text-cyan-400" /> Grounded in ONA,
                ML, and Policy compliance
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
