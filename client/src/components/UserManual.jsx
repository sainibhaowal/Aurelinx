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
