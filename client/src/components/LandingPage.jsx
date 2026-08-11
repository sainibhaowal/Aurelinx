import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  TrendingUp,
  Workflow,
  Activity,
  RefreshCw,
  Cpu,
  Database,
  ShieldCheck,
  Award,
  Lock,
  Terminal,
  Settings,
  BrainCircuit,
  Search,
  BarChart3,
  Network,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import {
  analysisAPI,
  enterpriseAPI,
  leanAPI,
  healthAPI,
} from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";
import NeonParticlesWave from "./NeonParticlesWave";
import { UserManualModal } from "./UserManual";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const simulatorScenarios = [
  {
    name: "Workday HRIS Attrition Event",
    source: "Workday HRIS Ingest Sync",
    tag: "HRIS",
    tagColor: "#6ee7b7",
    payload: {
      email: "elena.rodriguez@aurelinx.io",
      department: "Engineering",
      morale: 0.32,
      retention_prob: 0.45,
      external_id: "WD-89241",
      region: "us-east",
    },
    steps: [
      {
        title: "Bronze Raw Event Ingest",
        desc: "Workday API sync scheduler triggers extraction. Raw JSON record is captured and saved securely to RawEventTable for compliance audit.",
        log: "INFO: Sync job captured external record WD-89241. Writing raw payload to RawEventTable. Size: 284 bytes.",
      },
      {
        title: "Silver Data Contract Gate",
        desc: 'Validates raw payload against DataContractTable schema. Schema matches active definition: "email" and "morale" fields validated.',
        log: "SUCCESS: Data contract for WD-89241 is valid. Quality score: 1.00. Upserting canonical employee.",
      },
      {
        title: "Gold Explainable AI Inference",
        desc: "Aurelinx Ruleboost ML model scores the employee. Morale score of 0.32 evaluates to a high exit probability of 84% (is_at_risk=True).",
        log: "ML_ENGINE: Inferred exit risk for WD-89241 is 84.15%. Flagged is_at_risk = True.",
      },
      {
        title: "Regional Compliance Policy Gate",
        desc: "Policy packs evaluate the high risk trigger. Action requires Multi-Party Admin Authorization key to reveal sensitive PII morale metadata.",
        log: 'POLICY_GATE: Action "PII_MORALE_EXPORT" requires multi-party approval under policy "Regional Privacy Pact (us-east)".',
      },
      {
        title: "Active Retention Intervention",
        desc: "Aurelinx automatically queues a high-priority 30-day retention loop, mapping owner assignment, estimated retention cost, and target ROI.",
        log: "TASK_QUEUE: Created active retention intervention task #INT-3029. Owner: HR Director US. Cost: $4,500.",
      },
    ],
  },
  {
    name: "Greenhouse ATS PM Candidate Ingest",
    source: "Greenhouse ATS Webhook",
    tag: "ATS",
    tagColor: "#6ee7b7",
    payload: {
      email: "marcus.vance@talenthub.com",
      role: "Principal Product Manager",
      department: "Product Management",
      match_score: 0.89,
      external_id: "GH-8902",
      region: "global",
    },
    steps: [
      {
        title: "Bronze Raw Event Ingest",
        desc: "Webhook triggers application event ingestion. Raw applicant info parsed and appended to RawEventTable for historical validation.",
        log: "INFO: Ingested applicant webhook event GH-8902. Appended raw record.",
      },
      {
        title: "Silver Data Contract Gate",
        desc: "Verifies required recruiter mappings. Schema checks pass, matching all essential candidate table definitions.",
        log: "SUCCESS: Data contract check passed for GH-8902. Quality Score: 0.98. Synchronized.",
      },
      {
        title: "Gold Explainable AI Inference",
        desc: "Match score engine infers fit alignment. MARCUS evaluates at 89% suitability ratio matching core department PM specs.",
        log: "ML_ENGINE: Suitability score evaluated at 89% matching canonical role PM.",
      },
      {
        title: "Regional Compliance Policy Gate",
        desc: "No compliance restrictions or blocked parameters detected. Automatically validated for recruitment workspace deployment.",
        log: "POLICY_GATE: Candidate sync verified. Security release gate status: APPROVED.",
      },
      {
        title: "Active Recruitment Sync",
        desc: "Synchronizes Marcus Vance to active talent pool directory. Sync completed cleanly across silver candidate registries.",
        log: "DATABASE: Candidate row inserted into CanonicalCandidateTable. Triggering sync alert.",
      },
    ],
  },
  {
    name: "Quarantine Anomalous Event Ingest",
    source: "Legacy Payroll CSV Upload",
    tag: "ERR",
    tagColor: "#f87171",
    payload: {
      email: "",
      department: "Operations",
      morale: 0.9,
      external_id: "ERR-88912",
      region: "eu-west",
    },
    steps: [
      {
        title: "Bronze Raw Event Ingest",
        desc: "Batch ingest parses external legacy payroll spreadsheet. Ingests raw payroll fields.",
        log: "WARNING: Captured legacy event batch ERR-88912. Raw record size: 142 bytes.",
      },
      {
        title: "Silver Data Contract Gate",
        desc: 'SCHEMA DRIFT ERROR DETECTED: Required field "email" is blank or missing. Execution immediately halted to avoid data corruption!',
        log: 'CRITICAL: Data contract failed. Field "email" is blank. Writing record to QuarantineEventTable.',
      },
      {
        title: "Gold AI Scoring (HALTED)",
        desc: "Model scoring is bypassed and quarantined. System prevents AI models from running on corrupt or malformed inputs.",
        log: "ML_ENGINE: Execution bypassed. Record is quarantined.",
      },
      {
        title: "Regional Compliance Policy Gate",
        desc: "Generates security compliance alert log. Quarantined record triggers automatic notification to administrator dashboard.",
        log: "SECURITY: Logged quarantine event. Alert: Missing Identity Signature on region eu-west.",
      },
      {
        title: "Administrative Action Queue",
        desc: "Locks anomalous item in secure Quarantine Registry. Requires manual review or data mapping adjustments to unlock sync pipeline.",
        log: "QUARANTINE: Secured record ERR-88912 in quarantine registry. Reason: Missing Identity PII.",
      },
    ],
  },
];

const PLATFORM_MODULES = [
  {
    icon: Database,
    accent: "#6ee7b7",
    title: "Bronze → Silver → Gold Ingest Pipelines",
    body: "Secure webhook syncs capture events from Slack, Jira, and Workday. System logs validate data schemas in real-time, quarantine structural anomalies to the integrity queue, and sync records transactionally.",
    tags: ["X-API-Key Ingestion", "HMAC-SHA256 Signatures", "Quarantine Logs"],
  },
  {
    icon: Cpu,
    accent: "#a78bfa",
    title: "Explainable ML Registry & Model Cards",
    body: "Calculates predictive retention probabilities on tenant-isolated records. Features validation diagnostics including PR-AUC scores, calibration error metrics, and model training snapshots.",
    tags: ["PR-AUC Calibration", "Model Drift log", "Drift retrain snapshots"],
  },
  {
    icon: Lock,
    accent: "#6ee7b7",
    title: "Regional Compliance Policy Gates",
    body: "Enforces regional compliance protocols. Administrative operations trigger approval requirement gates, audit log entries, and require manual override verification.",
    tags: ["Compliance Policy Packs", "Approval Gates", "Audit Event Logs"],
  },
  {
    icon: Workflow,
    accent: "#fbbf24",
    title: "Active Retention Interventions Hub",
    body: "Enables organizational leaders to configure and track 30/60/90-day retention loop tasks, measuring recovery cost estimates and turnover mitigation ROI.",
    tags: ["Outcome Tracker", "Recovery Costs", "Turnover ROI Metrics"],
  },
  {
    icon: BrainCircuit,
    accent: "#f43f5e",
    title: "Multi-Step Agentic Workflow Chat",
    body: "Features a live ReAct orchestration loop with interactive status transitions (Think ➔ Plan ➔ Explore ➔ Modify ➔ Verify ➔ Complete). Directly translates natural language queries into secure database read/write actions.",
    tags: ["Interactive State Tracker", "Dynamic SQL Mutations", "Context Trace Inspector"],
  },
  {
    icon: Search,
    accent: "#2dd4bf",
    title: "Semantic Talent Scout Matchmaker",
    body: "Enables conceptual candidate matchmaking using description prompts. Employs a hybrid scoring algorithm indexing roles, departments, skill hierarchies, and matched coordinates.",
    tags: ["Conceptual Skill Search", "Typewriter Token Streaming", "Talent Profile Modal"],
  },
  {
    icon: BarChart3,
    accent: "#10b981",
    title: "Sentiment Intelligence & Morale Analytics",
    body: "Monitors organizational health and burnout risk indices in real-time. Computes leadership trust, morale velocities, and burnout levels using streaming Server-Sent Events (SSE).",
    tags: ["burnout risk vector", "morale velocity trends", "live SSE analytics"],
  },
  {
    icon: Network,
    accent: "#ec4899",
    title: "Organizational Network Analysis (ONA)",
    body: "Maps employee pull request reviews and collaborations onto an interactive ONA graph. Computes influence scores using PageRank, Brandes Betweenness centrality, and Dijkstra skill pathways.",
    tags: ["PageRank Centrality", "Spring-Physics Physics", "Dijkstra skill distances"],
  }
];

const MATH_PILLARS = [
  {
    title: "Semantic Skills Graph & Adjacencies",
    formula: "G = (V, E) | min(D_ij)",
    accent: "#14b8a6",
    desc: "Resolves multidimensional skill match requirements by building a weighted directional adjacency matrix. Evaluates skills overlap, identifies critical gaps, and projects the shortest path from candidate vectors to target role nodes.",
    highlight: "Shortest Path Dijkstra Routing",
    applied: "Semantic Talent Scout",
  },
  {
    title: "Optimal Team Assembly (Simulated Annealing)",
    formula: "P = exp(ΔE / T) | T_k = T_0 · α^k",
    accent: "#fbbf24",
    desc: "Searches the vast combinatorics space of employee-skill pairings using a stochastic simulated annealing engine. Constrained by strict budget caps, maximum team size limits, and role-skill density matrices.",
    highlight: "Metropolis-Hastings Solver",
    applied: "Team Assembly Sandbox",
  },
  {
    title: "Attrition Sandbox & Cox Hazards",
    formula: "h(t) = h₀(t) · exp(Σ βᵢ·Xᵢ)",
    accent: "#ef4444",
    desc: "Estimates cumulative baseline hazards across double-Gaussian peak tenures. Integrates SHAP-covariate weights (morale, salary ratio, workload fatigue) to compute dynamic hazard multipliers and flight risk mitigation paths.",
    highlight: "Proportional Hazards Regression",
    applied: "Attrition Risk Scoring",
  },
  {
    title: "Organizational Network Analysis (ONA)",
    formula: "PR(u) = (1−d)/N + d · Σ (PR(v) / L(v))",
    accent: "#ec4899",
    desc: "Maps pull request reviews, collaboration commits, and communication telemetry weights onto an interactive organizational interaction graph. Computes influence via PageRank and bridge-strength via Betweenness.",
    highlight: "Brandes Betweenness Centrality",
    applied: "ONA Influence Graph",
  },
  {
    title: "Markov Career Path Horizons",
    formula: "P⁽ⁿ⁾ = Pⁿ | Σᵢ Pᵢⱼ = 1",
    accent: "#a78bfa",
    desc: "Models internal role transitions as a discrete-time Markov chain. Projects state probability matrices over a 3-year horizon, scaling step velocity dynamically with employee skills coverage ratios.",
    highlight: "Chapman-Kolmogorov Projection",
    applied: "Career Path Simulator",
  },
];

/* ─────────────────────────────────────────
   HELPERS: PREMIUM DECORATIVE PRIMITIVES
───────────────────────────────────────── */
// Mouse-follow spotlight: set --mx/--my CSS vars on the card itself.
const spotlightMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
};

const AuroraBlob = ({ color, className = "", size = 480, delay = "0s" }) => (
  <div
    aria-hidden="true"
    className={`aurora-blob ${className}`}
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
      animationDelay: delay,
    }}
  />
);

const GradientWord = ({ children }) => (
  <span className="gradient-headline">{children}</span>
);

const CountUp = ({ value, format = (v) => v.toLocaleString(), duration = 950 }) => {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef(null);
  const started = React.useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const from = 0;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(from + (Number(value) - from) * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{format(display)}</span>;
};

/* ─────────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────────── */
const GlassCard = ({ children, className = "", style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{ y: -4, transition: { type: "spring", stiffness: 350, damping: 25 } }}
    className={`group relative rounded-[22px] luxe-card ${className}`}
    style={{
      background:
        "linear-gradient(160deg, rgba(52,122,86,0.14), rgba(4,16,11,0.55) 55%), rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(16px) saturate(130%)",
      WebkitBackdropFilter: "blur(16px) saturate(130%)",
      boxShadow:
        "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 20px 60px rgba(2,10,6,0.55)",
      willChange: "transform, opacity",
      ...style,
    }}
    onMouseMove={spotlightMove}
  >
    {children}
  </motion.div>
);

const SectionLabel = ({ children }) => (
  <p
    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em]"
    style={{
      background: "rgba(110,231,183,0.07)",
      border: "1px solid rgba(110,231,183,0.22)",
      color: "#6ee7b7",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: "#6ee7b7", boxShadow: "0 0 8px rgba(110,231,183,0.9)" }}
    />
    {children}
  </p>
);

const SectionHeading = ({ children }) => (
  <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight text-white [text-shadow:0_0_40px_rgba(110,231,183,0.15)]">
    {children}
  </h2>
);

const Tag = ({ children, accent = null }) => (
  <span
    className="rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
    style={{
      background: accent ? `${accent}0d` : "rgba(255,255,255,0.04)",
      border: `1px solid ${accent ? `${accent}30` : "rgba(255,255,255,0.08)"}`,
      color: accent || "rgba(148,163,184,0.7)",
    }}
  >
    {children}
  </span>
);

/* ─────────────────────────────────────────
   CAPABILITY TICKER (endless marquee)
───────────────────────────────────────── */
const TICKER_PALETTE = ["#34d399", "#fbbf24", "#2dd4bf", "#a3e635", "#fb7185", "#a78bfa"];

const Ticker = ({ items, className = "" }) => (
  <div className={`ticker-mask ${className}`} aria-hidden="true">
    <div className="ticker-track items-center">
      {[0, 1].map((dup) => (
        <div key={dup} className="flex items-center gap-10 pr-10">
          {items.map((item, i) => (
            <span
              key={`${dup}-${i}`}
              className="flex items-center gap-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "rgba(148,163,184,0.55)" }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{
                  background: TICKER_PALETTE[i % TICKER_PALETTE.length],
                  boxShadow: `0 0 6px ${TICKER_PALETTE[i % TICKER_PALETTE.length]}80`,
                }}
              />
              {item}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────
   RADIAL GAUGE (real data driven)
───────────────────────────────────────── */
const RadialGauge = ({ value, label, sub, color, format, size = 148, stroke = 8 }) => {
  const clamped = Math.max(0, Math.min(1, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - clamped)}
            className="gauge-track"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="text-[22px] font-black tabular-nums"
            style={{ color, textShadow: `0 0 18px ${color}55` }}
          >
            {format ? format(clamped) : `${Math.round(clamped * 100)}%`}
          </div>
          {sub && (
            <div
              className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
      <div
        className="text-[9px] font-black uppercase tracking-[0.2em]"
        style={{ color: "rgba(148,163,184,0.6)" }}
      >
        {label}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   WAVEFORM (audio-style live bars)
───────────────────────────────────────── */
const Waveform = ({ count = 9, color = "#6ee7b7", height = 40 }) => (
  <div className="flex items-end gap-1.5" style={{ height }} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="wave-bar w-1 rounded-full"
        style={{
          height: `${12 + ((i * 37) % 26)}px`,
          background: color,
          animationDelay: `${(i % 5) * 0.12}s`,
          opacity: 0.35 + ((i % 3) * 0.2),
        }}
      />
    ))}
  </div>
);

/* ─────────────────────────────────────────
   HERO TELEMETRY ORB (REAL data only)
───────────────────────────────────────── */
const HeroOrb = ({ snapshot, sreStatus, pingLatency, onEnterWorkspace }) => {
  const hasLive = Boolean(snapshot && snapshot.total != null);
  const ok = sreStatus === "operational";

  return (
    <div className="relative mx-auto mt-12 flex h-[400px] w-full max-w-[620px] items-center justify-center">
      {/* Soft glow pool */}
      <div className="orb-vignette absolute inset-0" aria-hidden="true" />

      {/* Rotating rings */}
      <div className="orb-ring absolute h-[380px] w-[380px] rounded-full border border-cyan-400/10" aria-hidden="true" />
      <div
        className="orb-ring absolute h-[300px] w-[300px] rounded-full border border-dashed border-indigo-400/15"
        style={{ animationDuration: "58s" }}
        aria-hidden="true"
      />
      <div className="orb-ring reverse absolute h-[236px] w-[236px] rounded-full border border-cyan-300/10" aria-hidden="true" />

      {/* Orbit satellites */}
      {[
        { cls: "left-1/2 top-0 -translate-x-1/2", delay: "0s" },
        { cls: "right-0 top-1/2 -translate-y-1/2", delay: "0.4s" },
        { cls: "left-[12%] bottom-[16%]", delay: "0.8s" },
      ].map((dot, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full animate-pulse"
          style={{
            background: i === 0 ? "#34d399" : i === 1 ? "#a78bfa" : "#6ee7b7",
            boxShadow: `0 0 14px ${i === 0 ? "rgba(52,211,153,0.9)" : i === 1 ? "rgba(167,139,250,0.9)" : "rgba(110,231,183,0.9)"}`,
            animationDelay: dot.delay,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Core */}
      <div
        className="core-breathe relative flex h-[172px] w-[172px] flex-col items-center justify-center rounded-full px-4 text-center"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.14), rgba(4,16,11,0.6))",
          border: "1px solid rgba(110,231,183,0.25)",
          boxShadow:
            "0 0 60px rgba(52,211,153,0.16), inset 0 0 40px rgba(52,211,153,0.08)",
        }}
      >
        {hasLive ? (
          <>
            <div
              className="text-[9px] font-black uppercase tracking-[0.28em]"
              style={{ color: "rgba(110,231,183,0.65)" }}
            >
              Talent Pool
            </div>
            <div
              className="mt-1 text-4xl font-black tabular-nums"
              style={{ color: "#6ee7b7", textShadow: "0 0 24px rgba(110,231,183,0.5)" }}
            >
              <CountUp
                value={Number(snapshot.total)}
                format={(v) => Math.round(v).toLocaleString()}
              />
            </div>
            <div
              className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.55)" }}
            >
              Streaming from your tenant
            </div>
          </>
        ) : (
          <>
            <div
              className="text-[9px] font-black uppercase tracking-[0.28em]"
              style={{ color: "rgba(110,231,183,0.65)" }}
            >
              Aurelinx Core
            </div>
            <div className="mt-2.5">
              <Waveform count={9} />
            </div>
            <div
              className="mt-2.5 text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.55)" }}
            >
              Standing by · SSE ready
            </div>
            <button
              type="button"
              onClick={onEnterWorkspace}
              className="btn-shine mt-2.5 rounded-full px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                color: "#020a07",
              }}
            >
              Connect workspace
            </button>
          </>
        )}
      </div>

      {/* Floating chips */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[4%] top-[20%] flex items-center gap-2 rounded-[14px] px-3.5 py-2.5"
        style={{
          background: "rgba(4,16,11,0.88)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? "animate-pulse" : ""}`}
          style={{ background: ok ? "#6ee7b7" : "#f87171", boxShadow: ok ? "0 0 8px rgba(110,231,183,0.8)" : "none" }}
        />
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "rgba(226,232,240,0.85)" }}
        >
          SRE Gateway · {ok ? "Operational" : sreStatus}
          {pingLatency ? ` · ${pingLatency}ms` : ""}
        </span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="absolute right-[3%] top-[14%] flex items-center gap-2 rounded-[14px] px-3.5 py-2.5"
        style={{
          background: "rgba(4,16,11,0.88)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(8px)",
        }}
      >
        <BrainCircuit className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "rgba(226,232,240,0.85)" }}
        >
          Explainable ML
        </span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
        className="absolute bottom-[22%] left-[2%] flex items-center gap-2 rounded-[14px] px-3.5 py-2.5"
        style={{
          background: "rgba(4,16,11,0.88)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(8px)",
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#6ee7b7" }} />
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "rgba(226,232,240,0.85)" }}
        >
          Policy Gates Enforced
        </span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 2.1 }}
        className="absolute bottom-[16%] right-[5%] flex items-center gap-2 rounded-[14px] px-3.5 py-2.5"
        style={{
          background: "rgba(4,16,11,0.88)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Workflow className="h-3.5 w-3.5" style={{ color: "#6ee7b7" }} />
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "rgba(226,232,240,0.85)" }}
        >
          Bronze → Gold
        </span>
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────
   FORMULA TYPEWRITER
───────────────────────────────────────── */
const FormulaTypewriter = ({ formula, active }) => {
  const [len, setLen] = useState(0);

  useEffect(() => {
    if (!active) {
      setLen(0);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setLen(i);
      if (i >= formula.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [active, formula]);

  return (
    <span>
      {formula.slice(0, len)}
      {active && len < formula.length && <span className="term-cursor" />}
    </span>
  );
};

/* ─────────────────────────────────────────
   CONNECTOR TILE
───────────────────────────────────────── */
/* Per-tile accent cycle — every connector exposes its own color instead
   of sharing one monochrome chrome */
const CONNECTOR_PALETTE = ["#34d399", "#fbbf24", "#2dd4bf", "#a3e635", "#fb7185", "#a78bfa"];

const ConnectorTile = ({ name, type, status, index = 0 }) => {
  const statusStyle = {
    active: {
      color: "#6ee7b7",
      bg: "rgba(110,231,183,0.06)",
      border: "rgba(110,231,183,0.2)",
    },
    draft: {
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.06)",
      border: "rgba(251,191,36,0.2)",
    },
    error: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.06)",
      border: "rgba(248,113,113,0.2)",
    },
    supported: {
      color: "#6ee7b7",
      bg: "rgba(110,231,183,0.06)",
      border: "rgba(110,231,183,0.2)",
    },
  };
  const s = statusStyle[String(status).toLowerCase()] || statusStyle.supported;
  const accent = CONNECTOR_PALETTE[index % CONNECTOR_PALETTE.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      onMouseMove={spotlightMove}
      className="group spotlight-card luxe-card relative overflow-hidden rounded-[18px] px-5 py-5 border border-white/10 bg-white/[0.02] hover:border-white/15 transition-colors duration-300 shadow-xl"
      style={{ willChange: "transform, opacity", "--card-accent": accent }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `${accent}14`,
              border: `1px solid ${accent}30`,
              boxShadow: `0 0 12px ${accent}20`,
            }}
          >
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: accent }}
            >
              {name.slice(0, 2)}
            </span>
          </div>
          <div>
            <div
              className="text-sm font-semibold text-white transition-colors duration-200 group-hover:text-white"
              style={{ color: accent }}
            >
              {name}
            </div>
            <div
              className="mt-0.5 text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              {type}
            </div>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
          style={{
            color: s.color,
            background: s.bg,
            border: `1px solid ${s.border}`,
          }}
        >
          {status}
        </span>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   SLIDER FILL (gradient progress thumb track)
───────────────────────────────────────── */
const sliderFill = (min, max, value, color1 = "rgba(52,211,153,0.6)", color2 = "rgba(163,230,53,0.6)") => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, ${color1}, ${color2} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
  };
};

/* ─────────────────────────────────────────
   FOOTER LINK (enterprise-style anchor)
───────────────────────────────────────── */
const FooterLink = ({ onClick, href = null, children }) => {
  const inner = (
    <>
      <span
        className="h-px w-0 rounded-full transition-all duration-200 group-hover:w-3"
        style={{ background: "#34d399", boxShadow: "0 0 6px rgba(52,211,153,0.7)" }}
      />
      <span>{children}</span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
        className="group inline-flex items-center gap-1.5 text-xs transition-colors duration-150 hover:text-cyan-300"
        style={{ color: "rgba(148,163,184,0.7)" }}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 text-left text-xs transition-colors duration-150 hover:text-cyan-300 cursor-pointer"
      style={{ color: "rgba(148,163,184,0.7)" }}
    >
      {inner}
    </button>
  );
};

const FooterColumn = ({ title, children }) => (
  <div>
    <h5 className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
      {title}
    </h5>
    <ul className="mt-4 space-y-3">{children}</ul>
  </div>
);

/* ─────────────────────────────────────────
   BRAND ICON (official brand mark paths)
───────────────────────────────────────── */
const BRAND_PATHS = {
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

const BrandIcon = ({ name, size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={BRAND_PATHS[name]} />
  </svg>
);

/* ─────────────────────────────────────────
   LUXE VERTICAL SCROLLBAR (interactive)
   - clickable track (smooth jump to position)
   - draggable glowing thumb
   - hover expands + live percentage bubble
   - ZERO React re-renders while scrolling:
     thumb/progress sync via rAF + direct DOM writes
   - Drag uses window-level pointer listeners and
     forces instant scroll (scroll-behavior:auto),
     so the thumb never fights a smooth-scroll tween
───────────────────────────────────────── */
const getThumbGeometry = (el) => {
  const viewport = window.innerHeight;
  const trackHeight = Math.max(0, viewport - 20); /* 10px pad top/bottom */
  const max = Math.max(0, el.scrollHeight - viewport);
  const thumbHeight =
    max <= 0
      ? 0
      : Math.max(56, Math.min(trackHeight, trackHeight * (viewport / el.scrollHeight)));
  return {
    viewport,
    trackHeight,
    max,
    thumbHeight,
    travel: Math.max(1, trackHeight - thumbHeight),
  };
};

const LuxeScrollbar = () => {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const bubbleRef = useRef(null);
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  /* Imperative sync loop — no setState on scroll, so the page never re-renders */
  useEffect(() => {
    const el = document.getElementById("landing-scroll-root");
    if (!el) return;

    let rafId = 0;

    const update = () => {
      rafId = 0;
      const { trackHeight, max, thumbHeight } = getThumbGeometry(el);
      const thumbTop = max <= 0 ? 0 : (el.scrollTop / max) * (trackHeight - thumbHeight);
      const pct = max <= 0 ? 0 : Math.round((el.scrollTop / max) * 100);

      const thumb = thumbRef.current;
      const bubble = bubbleRef.current;
      if (thumb) {
        thumb.style.top = `${thumbTop}px`;
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.opacity = max <= 0 ? "0" : "1";
      }
      if (bubble) {
        bubble.style.top = `${thumbTop + thumbHeight / 2}px`;
        bubble.textContent = `${pct}%`;
      }
      const track = trackRef.current;
      if (track) track.setAttribute("aria-valuenow", pct);
      const bar = document.querySelector(".scroll-progress-bar");
      if (bar) bar.style.width = `${pct}%`;
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      el.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /* Window-level drag — thumb tracks the cursor 1:1, zero latency:
     content scrolls proportionally to the thumb, so drag speed is
     exactly under the user's control (like a native scrollbar) */
  useEffect(() => {
    const onMove = (e) => {
      const drag = dragStart.current;
      if (!drag) return;
      const el = document.getElementById("landing-scroll-root");
      if (!el) return;
      const { max, travel } = getThumbGeometry(el);
      if (max <= 0) return;
      const thumbTop = Math.max(0, Math.min(travel, e.clientY + drag.offset));
      // Instant scrubbing — never let scroll-behavior:smooth tween fight the drag
      el.style.scrollBehavior = "auto";
      el.scrollTop = (thumbTop / travel) * max;
    };
    const onEnd = () => {
      if (!dragStart.current) return;
      dragStart.current = null;
      setDragging(false);
      const el = document.getElementById("landing-scroll-root");
      if (el) el.style.scrollBehavior = "";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      const el = document.getElementById("landing-scroll-root");
      if (el) el.style.scrollBehavior = "";
    };
  }, []);

  const jump = (clientY) => {
    const el = document.getElementById("landing-scroll-root");
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const { trackHeight, thumbHeight } = getThumbGeometry(el);
    const ratio = (clientY - rect.top - thumbHeight / 2) / trackHeight;
    const target = ratio * (el.scrollHeight - el.clientHeight);
    el.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-[70] flex w-[20px] items-stretch justify-center"
      aria-hidden="true"
    >
      <div
        ref={trackRef}
        role="scrollbar"
        aria-controls="landing-scroll-root"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className={`pointer-events-auto relative select-none self-stretch rounded-full transition-all duration-300 ${hovering || dragging ? "w-[10px]" : "w-[6px]"}`}
        style={{
          top: 10,
          bottom: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.45)",
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onPointerDown={(e) => {
          if (e.target === thumbRef.current) return;
          jump(e.clientY);
        }}
      >
        {/* Thumb */}
        <div
          ref={thumbRef}
          className={`absolute left-1/2 w-full -translate-x-1/2 rounded-full touch-none will-change-[top,height] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            top: 0,
            height: 56,
            background: "linear-gradient(180deg, #34d399 0%, #a3e635 100%)",
            boxShadow: dragging
              ? "0 0 20px rgba(52,211,153,0.65), inset 0 0 6px rgba(255,255,255,0.3)"
              : "0 0 12px rgba(52,211,153,0.4), inset 0 0 6px rgba(255,255,255,0.22)",
            opacity: 0,
            transition: "box-shadow 0.2s ease",
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const el = document.getElementById("landing-scroll-root");
            if (!el) return;
            const { max, travel } = getThumbGeometry(el);
            const currentThumbTop = max <= 0 ? 0 : (el.scrollTop / max) * travel;
            // Preserve the grab point: thumb follows the cursor 1:1 from here
            dragStart.current = { offset: currentThumbTop - e.clientY };
            setDragging(true);
          }}
        />

        {/* Live percentage bubble */}
        <div
          ref={bubbleRef}
          className="pointer-events-none absolute right-full mr-3 rounded-md border px-2 py-1 text-[9px] font-black tabular-nums tracking-wider"
          style={{
            top: 28,
            background: "rgba(4,16,11,0.94)",
            borderColor: "rgba(110,231,183,0.25)",
            color: "#6ee7b7",
            boxShadow: "0 6px 18px rgba(2,10,6,0.55), 0 0 12px rgba(52,211,153,0.18)",
            opacity: hovering || dragging ? 1 : 0,
            transform: `translateY(-50%) ${hovering || dragging ? "translateX(0)" : "translateX(8px)"}`,
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          0%
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const LandingPage = ({ onEnterWorkspace, onOpenEnterprise }) => {
  const { token, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [connections, setConnections] = useState([]);
  const [drRunbooks, setDrRunbooks] = useState([]);
  const [procurement, setProcurement] = useState([]);
  const [driftLogs, setDriftLogs] = useState([]);
  const [modelCards, setModelCards] = useState([]);
  const [activeAccordionTab, setActiveAccordionTab] = useState("dr");
  const [pingLatency, setPingLatency] = useState(null);
  const [sreStatus, setSreStatus] = useState("offline");
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [simActiveStep, setSimActiveStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState([]);
  const [calcWorkforce, setCalcWorkforce] = useState(1500);
  const [calcSalary, setCalcSalary] = useState(120000);
  const [calcTurnover, setCalcTurnover] = useState(15);
  const [calcReduction, setCalcReduction] = useState(25);
  const [activePillar, setActivePillar] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const simSectionRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const t0 = Date.now();
        const healthCheck = await healthAPI.check();
        const isHealthy =
          healthCheck?.status === "healthy" || healthCheck?.status === "ok";
        if (active) {
          setPingLatency(Date.now() - t0);
          setSreStatus(isHealthy ? "operational" : "degraded");
        }
        if (!isHealthy) {
          return;
        }

        if (!token || !isAuthenticated) {
          if (active) {
            setSnapshot(null);
            setConnections([]);
            setDrRunbooks([]);
            setProcurement([]);
            setDriftLogs([]);
            setModelCards([]);
          }
          return;
        }

        const [snapData, connData, runbookData, procData, driftData, cardData] =
          await Promise.all([
            analysisAPI.getAnalyticsSnapshot().catch(() => null),
            enterpriseAPI.listConnections().catch(() => []),
            leanAPI.listDRRunbooks().catch(() => []),
            leanAPI.listProcurementArtifacts().catch(() => []),
            leanAPI.listDrift().catch(() => []),
            leanAPI.listModelCards().catch(() => []),
          ]);
        if (active) {
          if (snapData) setSnapshot(snapData);
          if (connData) setConnections(connData);
          if (runbookData) setDrRunbooks(runbookData);
          if (procData) setProcurement(procData);
          if (driftData) setDriftLogs(driftData);
          if (cardData) setModelCards(cardData);
        }
      } catch {
        if (active) setSreStatus("offline");
      }
    };
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [token, isAuthenticated]);

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimActiveStep(0);
    const scenario = simulatorScenarios[selectedScenarioIdx];
    setSimLogs([
      `[${new Date().toLocaleTimeString()}] INGEST_TRIGGER: Starting pipeline run for "${scenario.name}"...`,
    ]);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < 5) {
        setSimActiveStep(step);
        setSimLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${scenario.steps[step].log}`,
        ]);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setSimLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] PIPELINE_SUCCESS: Run complete. Security clearance: VERIFIED.`,
        ]);
      }
    }, 1800);
  };

  const handleScenarioChange = (idx) => {
    if (isSimulating) return;
    setSelectedScenarioIdx(idx);
    setSimActiveStep(0);
    setSimLogs([
      `[${new Date().toLocaleTimeString()}] INGEST_STANDBY: Scenario changed. Pipeline ready for execution.`,
    ]);
  };

  /* Auto-play the pipeline once when it scrolls into view */
  useEffect(() => {
    const node = simSectionRef.current;
    if (!node) return;
    let triggered = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered && !isSimulating) {
          triggered = true;
          setTimeout(startSimulation, 700);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const hasLive = Boolean(snapshot && snapshot.total != null);

  const displayConnectors =
    connections.length > 0
      ? connections.map((c) => ({
        name: c.name,
        type: String(c.source_type).toUpperCase(),
        status: String(c.status).toUpperCase(),
      }))
      : [
        {
          name: "Workday HRIS API",
          type: "Core Employee DB",
          status: "ACTIVE",
        },
        {
          name: "Greenhouse ATS",
          type: "Candidate Pipeline",
          status: "SUPPORTED",
        },
        {
          name: "SAP SuccessFactors",
          type: "Performance Analytics",
          status: "SUPPORTED",
        },
        {
          name: "Oracle HCM Cloud",
          type: "Workforce Planning",
          status: "SUPPORTED",
        },
        { name: "BambooHR", type: "Directory Sync", status: "SUPPORTED" },
        {
          name: "ADP Workforce",
          type: "Compensation Mapping",
          status: "SUPPORTED",
        },
      ];

  /* ── Fallback compliance data ── */
  const fallbackRunbooks = [
    {
      name: "Core Database Recovery",
      env: "production",
      rto: 15,
      rpo: 5,
      note: "Daily SRE backups mirroring the primary PostgreSQL cluster across active instances.",
      status: "validated",
    },
    {
      name: "API Server Recovery",
      env: "production",
      rto: 5,
      rpo: 0,
      note: "FastAPI health-check ping and autoscaling trigger protocols.",
      status: "validated",
    },
  ];
  const fallbackProcurement = [
    {
      title: "SOC 2 Type II Security Inquest",
      type: "Compliance",
      ver: "2026.1",
      status: "approved",
      notes:
        "Continuous SRE log analysis auditing data gates and schema isolation boundaries.",
    },
    {
      title: "Standard GDPR DPA Addendum",
      type: "Legal",
      ver: "v4",
      status: "enforced",
      notes: "Guarantees absolute tenant default isolation database schemas.",
    },
    {
      title: "CAIQ Security Questionnaire",
      type: "Assessment",
      ver: "v2",
      status: "compliant",
      notes: "100% compliance mapping across raw, silver, and gold pipelines.",
    },
    {
      title: "MSA API Service Level Agreement",
      type: "Contract",
      ver: "2026.2",
      status: "signed",
      notes: "99.95% API uptime guaranteed under secondary local sync modes.",
    },
  ];

  /* ROI computations */
  const departures = Math.round((calcWorkforce * calcTurnover) / 100);
  const costToday = departures * calcSalary * 1.5;
  const retainedCount = Math.round(departures * (calcReduction / 100));
  const savings = retainedCount * calcSalary * 1.5;
  const afterCost = costToday - savings;
  const afterPct = costToday > 0 ? Math.max(0, (afterCost / costToday) * 100) : 0;

  /* Capability ticker items */
  const tickerItems = [
    "Workday HRIS",
    "Greenhouse ATS",
    "SAP SuccessFactors",
    "Oracle HCM Cloud",
    "BambooHR",
    "ADP Workforce",
    "Slack Morale Pipeline",
    "Jira PR Telemetry",
    "REST API & Webhooks",
    "Bronze → Silver → Gold",
    "Policy Release Gates",
    "Retention Intervention Loops",
    "Explainable ML Model Cards",
  ];

  /* Illustrative risk pattern (decorative narrative visual) */
  const RISK_SIGNAL = [3.1, 2.2, 3.6, 2.8, 4.2, 3.4, 5.1, 4.0, 6.3, 5.2, 7.4, 6.8];
  const RISK_MAX = Math.max(...RISK_SIGNAL);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div
      id="landing-scroll-root"
      className="relative h-screen w-full overflow-x-hidden overflow-y-auto text-slate-100"
      style={{ background: "#04100b" }}
    >
      {/* Scroll progress hairline — width synced imperatively by LuxeScrollbar */}
      <div className="scroll-progress-bar" aria-hidden="true" />

      {/* Interactive vertical scrollbar (zero-re-render sync) */}
      <LuxeScrollbar />

      {/* ── AMBIENT BACKGROUND ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 select-none"
        aria-hidden="true"
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(110,231,183,0.04) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      {/* FULL VIEWPORT END-TO-END HERO PARTICLES BACKGROUND WITH FADE-OUT MASK */}
      <div
        className="absolute top-0 left-0 right-0 h-[85vh] min-h-[600px] max-h-[1000px] overflow-hidden pointer-events-none z-0"
        style={{
          maskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 65%, transparent 100%)"
        }}
      >
        <NeonParticlesWave />
      </div>

      <div className="relative z-10 mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-10">
        {/* ══════════ NAV ══════════ */}
        <header className="sticky top-4 z-50 mb-4 pt-4">
          <div
            className="flex items-center justify-between rounded-full px-5 py-3"
            style={{
              background: "rgba(4,16,11,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Logo */}
            <div
              onClick={() => {
                const el = document.getElementById("section-0");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-3 select-none cursor-pointer hover:opacity-80 transition-opacity"
              title="Scroll to Top"
            >
              <div
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
              >
                <img
                  src="/aurelinx-logo-4k.svg"
                  alt="Aurelinx Logo"
                  style={{ width: "120%", height: "120%", objectFit: "contain" }}
                />
              </div>
              <div>
                <div className="text-xs font-black tracking-[0.28em] text-white">
                  AURELINX
                </div>
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "rgba(148,163,184,0.4)" }}
                >
                  MANAGEMENT OS
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav
              className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-widest lg:flex"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              {[
                "Overview",
                "Pipeline",
                "Math Engine",
                "Specs",
                "Connectors",
                "Compliance",
              ].map((item, i) => (
                <a
                  key={item}
                  href={`#section-${i}`}
                  className="transition-colors hover:text-white"
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* SRE ping (REAL) */}
              <div
                className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(148,163,184,0.6)",
                }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${sreStatus === "operational" ? "animate-pulse" : ""}`}
                  style={{
                    background:
                      sreStatus === "operational" ? "#6ee7b7" : "#f87171",
                  }}
                />
                {sreStatus} {pingLatency ? `· ${pingLatency}ms` : ""}
              </div>

              <button
                type="button"
                onClick={onEnterWorkspace}
                className="btn-shine inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{
                  background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                  color: "#020a07",
                  boxShadow: "0 8px 24px -8px rgba(52,211,153,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "none";
                }}
              >
                Workspace <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ══════════ HERO ══════════ */}
        <section id="section-0" className="relative pb-8 pt-16 lg:pt-20 overflow-hidden">
          {/* Aurora glows + center beam behind the hero copy (particles stay on top) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden" aria-hidden="true">
            <AuroraBlob color="rgba(52,211,153,0.5)" className="left-[8%] -top-40" size={520} />
            <AuroraBlob color="rgba(251,191,36,0.4)" className="right-[6%] -top-24" size={560} delay="4s" />
            <AuroraBlob color="rgba(163,230,53,0.3)" className="left-[42%] top-10" size={420} delay="8s" />
            <div className="hero-beam" />
          </div>

          <div className="relative z-10 mx-auto flex max-w-[860px] flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionLabel>
                <Activity className="h-3.5 w-3.5" />
                Live workforce analytics &amp; policy governance
              </SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="mt-7 text-[clamp(2.6rem,5.5vw,4.2rem)] font-extrabold leading-[1.02] tracking-tight text-white"
            >
              Operational HR intelligence
              <br />
              with a <GradientWord>calmer, sharper</GradientWord> workflow.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 max-w-[580px] text-base leading-relaxed"
              style={{ color: "rgba(148,163,184,0.7)" }}
            >
              Aurelinx converts raw talent inputs, risk indicators, and
              compliance gate parameters into a unified, dense control panel
              built for security-conscious enterprise teams.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="btn-shine inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                  color: "#020a07",
                  boxShadow: "0 12px 34px -8px rgba(52,211,153,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(100deg, #34d399 0%, #fbbf24 100%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(100deg, #34d399 0%, #a3e635 100%)";
                }}
              >
                Enter Workspace <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenEnterprise}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(226,232,240,0.85)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <Building2 className="h-4 w-4" /> Operations Setup
              </button>
            </motion.div>

            {/* Capability tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2"
            >
              {[
                ["Live PostgreSQL Sync", null],
                ["Policy Release Gates", "#6ee7b7"],
                ["Explainable ML Model Cards", "#a78bfa"],
              ].map(([label, accent]) => (
                <Tag key={label} accent={accent}>{label}</Tag>
              ))}
            </motion.div>

            {/* HONEST LIVE STATUS LINE (real SRE + real data source) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "rgba(148,163,184,0.45)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${sreStatus === "operational" ? "animate-pulse" : ""}`}
                  style={{
                    background: sreStatus === "operational" ? "#6ee7b7" : "#f87171",
                  }}
                />
                Gateway {sreStatus}
                {pingLatency ? ` · ${pingLatency}ms` : ""}
              </span>
              <span className="opacity-40">·</span>
              <span>Your live tenant telemetry appears here when you connect</span>
            </motion.div>

            {/* TELEMETRY ORB — real data when connected, no invented numbers */}
            <HeroOrb
              snapshot={snapshot}
              sreStatus={sreStatus}
              pingLatency={pingLatency}
              onEnterWorkspace={onEnterWorkspace}
            />
          </div>

          {/* Capability ticker */}
          <div
            className="mt-10 border-y border-white/5 py-1"
            aria-hidden="true"
          >
            <Ticker items={tickerItems} />
          </div>

          {/* Scroll hint */}
          <div className="mt-8 flex justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="scroll-hint flex flex-col items-center gap-1.5 select-none"
              aria-hidden="true"
            >
              <span
                className="text-[9px] font-bold uppercase tracking-[0.3em]"
                style={{ color: "rgba(148,163,184,0.4)" }}
              >
                Scroll
              </span>
              <ChevronRight
                className="h-4 w-4 rotate-90"
                style={{ color: "#6ee7b7" }}
              />
            </motion.div>
          </div>
        </section>

        {/* ══════════ PROBLEM → SOLUTION NARRATIVE BAND ══════════ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-2">
            {/* Left: the silent problem */}
            <div>
              <SectionLabel>
                <AlertTriangle className="h-3.5 w-3.5" /> The Cost of Silence
              </SectionLabel>
              <h2 className="mt-5 text-[clamp(1.9rem,3.5vw,2.8rem)] font-extrabold leading-[1.08] tracking-tight text-white">
                Attrition never sends a <GradientWord>memo</GradientWord>.
              </h2>
              <p
                className="mt-5 max-w-[540px] text-sm leading-relaxed"
                style={{ color: "rgba(148,163,184,0.65)" }}
              >
                Risk signals drift through sentiment, engagement, and workload
                data for weeks before a resignation lands. Spreadsheets and
                quarterly reviews catch it after the exit interview — when the
                cost is already sunk.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Zap,
                    accent: "#6ee7b7",
                    title: "Detect early",
                    desc: "Morale, retention probability, and burnout vectors scored continuously — not quarterly.",
                  },
                  {
                    icon: ShieldCheck,
                    accent: "#6ee7b7",
                    title: "Act with control",
                    desc: "Policy gates govern every sensitive action, with approval chains and full audit trails.",
                  },
                  {
                    icon: TrendingUp,
                    accent: "#a78bfa",
                    title: "Recover the value",
                    desc: "30/60/90-day retention loops with tracked costs and measurable ROI.",
                  },
                ].map(({ icon: Icon, accent, title, desc }) => (
                  <div
                    key={title}
                    className="flex items-start gap-4 rounded-[18px] p-4 transition-colors duration-300"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                      e.currentTarget.style.borderColor = accent + "35";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                      style={{
                        background: `${accent}12`,
                        border: `1px solid ${accent}30`,
                      }}
                    >
                      <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{title}</div>
                      <p
                        className="mt-1 text-xs leading-relaxed"
                        style={{ color: "rgba(148,163,184,0.6)" }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: the pattern you miss */}
            <div className="rounded-[24px] p-6 sm:p-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div
                  className="text-[10px] font-black uppercase tracking-[0.24em]"
                  style={{ color: "rgba(148,163,184,0.4)" }}
                >
                  What you miss before the resignation
                </div>
                <Tag>Illustrative pattern</Tag>
              </div>

              {/* Animated bar chart */}
              <div className="mt-8 flex h-48 items-end gap-2 sm:gap-3">
                {RISK_SIGNAL.map((v, i) => {
                  const isPeak = i === 10;
                  const isRising = i >= 8;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.7,
                        delay: i * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex-1 origin-bottom"
                    >
                      <div
                        className="w-full rounded-t-md transition-colors duration-300"
                        style={{
                          height: `${(v / RISK_MAX) * 100}%`,
                          minHeight: 6,
                          background: isPeak
                            ? "linear-gradient(180deg, #f43f5e, rgba(244,63,94,0.35))"
                            : isRising
                              ? "linear-gradient(180deg, #fbbf24, rgba(251,191,36,0.3))"
                              : "linear-gradient(180deg, #34d399, rgba(52,211,153,0.25))",
                          boxShadow: isPeak
                            ? "0 0 18px rgba(244,63,94,0.4)"
                            : "0 0 12px rgba(52,211,153,0.12)",
                        }}
                        title={`Month ${i + 1}`}
                      />
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(148,163,184,0.35)" }}>
                <span>Months before exit</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#f43f5e" }} />
                  signal spike
                </span>
              </div>

              <div
                className="mt-6 rounded-[16px] p-4"
                style={{
                  background: "rgba(244,63,94,0.05)",
                  border: "1px solid rgba(244,63,94,0.18)",
                }}
              >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "#f43f5e" }}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  The detection gap
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(226,232,240,0.75)" }}>
                  Sentiment and morale drift are measurable weeks before exit.
                  Aurelinx scores them continuously and surfaces the signal —
                  before it becomes a goodbye.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ SIMULATOR ══════════ */}
        <section
          id="section-1"
          ref={simSectionRef}
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Header */}
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <Activity className="h-3.5 w-3.5" /> Continuous Ingest Sync
            </SectionLabel>
            <SectionHeading>
              Interactive <GradientWord>Ingestion Pipeline</GradientWord> Simulator
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Aurelinx pipelines continuously sync files and API endpoints,
              curate them into Silver SQL tables, score exit risks, check
              security policies, and trigger retention interventions. Select a
              scenario and trace its journey.
            </p>
          </div>

          {/* Console layout */}
          <div className="mx-auto mt-12 grid max-w-[1600px] gap-5 md:grid-cols-[280px_1fr] lg:grid-cols-[360px_1fr]">
            {/* Scenario panel */}
            <div className="space-y-3">
              <div
                className="text-[10px] font-black uppercase tracking-[0.26em] mb-3"
                style={{ color: "rgba(148,163,184,0.4)" }}
              >
                Select Scenario
              </div>
              {simulatorScenarios.map((s, idx) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleScenarioChange(idx)}
                  className="w-full rounded-[18px] p-4 text-left transition-all duration-200 select-none"
                  style={{
                    background:
                      idx === selectedScenarioIdx
                        ? "rgba(110,231,183,0.05)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${idx === selectedScenarioIdx ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}
                  onMouseEnter={(e) => {
                    if (idx !== selectedScenarioIdx)
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    if (idx !== selectedScenarioIdx)
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.07)";
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {s.name}
                      </div>
                      <div
                        className="mt-1 text-[10px] uppercase tracking-wider"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      >
                        {s.source}
                      </div>
                    </div>
                    <span
                      className="flex-none rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: `${s.tagColor}12`,
                        border: `1px solid ${s.tagColor}30`,
                        color: s.tagColor,
                      }}
                    >
                      {s.tag}
                    </span>
                  </div>
                </button>
              ))}

              {/* Run button */}
              <button
                type="button"
                onClick={startSimulation}
                disabled={isSimulating}
                className="btn-shine mt-3 w-full flex h-12 items-center justify-center gap-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all select-none"
                style={{
                  background: isSimulating
                    ? "rgba(110,231,183,0.06)"
                    : "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                  border: `1px solid ${isSimulating ? "rgba(110,231,183,0.2)" : "transparent"}`,
                  color: isSimulating ? "#6ee7b7" : "#020a07",
                  cursor: isSimulating ? "not-allowed" : "pointer",
                  opacity: isSimulating ? 0.7 : 1,
                  boxShadow: isSimulating
                    ? "none"
                    : "0 12px 34px -10px rgba(52,211,153,0.45)",
                }}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isSimulating ? "animate-spin" : ""}`}
                />
                {isSimulating
                  ? "Running Simulation…"
                  : "Trigger Simulation Run"}
              </button>
              <p
                className="text-center text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "rgba(148,163,184,0.35)" }}
              >
                Auto-plays on scroll · run it again anytime
              </p>
            </div>

            {/* State machine + terminal */}
            <GlassCard className="p-6 flex flex-col gap-6">
              {/* Header */}
              <div
                className="flex items-center justify-between border-b pb-4"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "rgba(148,163,184,0.4)" }}
                >
                  <Cpu className="h-4 w-4" style={{ color: "#6ee7b7" }} />
                  Pipeline State Monitor
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(148,163,184,0.5)",
                  }}
                >
                  sync: live_production_tenant
                </span>
              </div>

              {/* Step bar */}
              <div className="relative grid grid-cols-5 gap-1">
                {/* Track line */}
                <div
                  className="absolute top-[18px] left-[10%] right-[10%] h-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div
                  className="absolute top-[18px] left-[10%] h-px transition-all duration-500"
                  style={{
                    background: "#6ee7b7",
                    width: `${simActiveStep * 20}%`,
                  }}
                />

                {["Bronze", "Silver", "Gold", "Gate", "Action"].map(
                  (name, i) => {
                    const isActive = i === simActiveStep;
                    const isDone = i < simActiveStep;
                    const isErrScenario =
                      simulatorScenarios[selectedScenarioIdx].name.includes(
                        "Quarantine",
                      );
                    const isErr = isErrScenario && isDone && i >= 1;

                    return (
                      <div
                        key={name}
                        className="relative z-10 flex flex-col items-center gap-2.5 select-none"
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black transition-all duration-300"
                          style={{
                            background: isErr
                              ? "rgba(248,113,113,0.1)"
                              : isDone
                                ? "rgba(110,231,183,0.1)"
                                : isActive
                                  ? "rgba(110,231,183,0.08)"
                                  : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isErr ? "rgba(248,113,113,0.4)" : isDone ? "rgba(110,231,183,0.4)" : isActive ? "rgba(110,231,183,0.5)" : "rgba(255,255,255,0.08)"}`,
                            color: isErr
                              ? "#f87171"
                              : isDone
                                ? "#6ee7b7"
                                : isActive
                                  ? "#6ee7b7"
                                  : "rgba(148,163,184,0.4)",
                            boxShadow: isActive
                              ? "0 0 14px rgba(110,231,183,0.25)"
                              : "none",
                          }}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{
                            color: isActive
                              ? "#6ee7b7"
                              : isDone
                                ? "rgba(110,231,183,0.6)"
                                : "rgba(148,163,184,0.3)",
                          }}
                        >
                          {name}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Active step detail */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={simActiveStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="rounded-[16px] p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: "rgba(110,231,183,0.6)" }}
                  >
                    {
                      simulatorScenarios[selectedScenarioIdx].steps[
                        simActiveStep
                      ].title
                    }
                  </div>
                  <p
                    className="mt-2 text-xs leading-relaxed"
                    style={{ color: "rgba(148,163,184,0.7)" }}
                  >
                    {
                      simulatorScenarios[selectedScenarioIdx].steps[
                        simActiveStep
                      ].desc
                    }
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Terminal */}
              <div>
                <div
                  className="flex items-center justify-between rounded-t-[14px] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderBottom: "none",
                    color: "rgba(148,163,184,0.4)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Terminal
                      className="h-3.5 w-3.5"
                      style={{ color: "#6ee7b7" }}
                    />
                    SRE logs console
                  </div>
                  <span
                    className="h-2 w-2 animate-pulse rounded-full"
                    style={{
                      background: "#6ee7b7",
                      boxShadow: "0 0 8px rgba(110,231,183,0.6)",
                    }}
                  />
                </div>
                <div
                  className={`rounded-b-[14px] p-4 font-mono text-[10px] leading-6 text-left overflow-y-auto max-h-[130px] ${isSimulating ? "term-cursor" : ""}`}
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isSimulating
                      ? "inset 0 0 24px rgba(52,211,153,0.04)"
                      : "none",
                  }}
                >
                  {simLogs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        color:
                          log.includes("CRITICAL") || log.includes("WARNING")
                            ? "#f87171"
                            : log.includes("SUCCESS")
                              ? "#6ee7b7"
                              : log.includes("ML_ENGINE")
                                ? "#6ee7b7"
                                : "rgba(148,163,184,0.6)",
                      }}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ══════════ LIVE METRICS BAND (REAL DATA ONLY) ══════════ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <Gauge className="h-3.5 w-3.5" /> Live Tenant Telemetry
            </SectionLabel>
            <SectionHeading>
              Real numbers, <GradientWord>streamed live</GradientWord> from your tenant
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              No demo values — these gauges read directly from the Aurelinx
              analytics snapshot of your connected workspace, refreshed every
              15 seconds.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-[1200px]">
            {hasLive ? (
              <GlassCard className="p-8">
                <div className="flex items-center justify-center gap-2 pb-6">
                  <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "#6ee7b7", boxShadow: "0 0 10px rgba(110,231,183,0.9)" }} />
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.24em]"
                    style={{ color: "rgba(110,231,183,0.8)" }}
                  >
                    Streaming live · refreshes every 15s
                  </span>
                </div>
                <div className="flex flex-wrap items-start justify-center gap-10 lg:gap-16">
                  <div className="flex flex-col items-center gap-3">
                    <RadialGauge
                      value={(100 - Number(snapshot.atRiskPct)) / 100}
                      label="Retention Pulse"
                      sub="of workforce"
                      color="#6ee7b7"
                      format={(v) => `${(v * 100).toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <RadialGauge
                      value={Number(snapshot.atRiskPct) / 100}
                      label="Risk Cluster"
                      sub="flagged cases"
                      color="#f87171"
                      format={(v) => `${(v * 100).toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <RadialGauge
                      value={Number(snapshot.avgSentiment)}
                      label="Avg Morale"
                      sub="sentiment index"
                      color="#6ee7b7"
                      format={(v) => v.toFixed(2)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex h-[148px] w-[148px] flex-col items-center justify-center rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(110,231,183,0.2)",
                        boxShadow: "0 0 30px rgba(52,211,153,0.08)",
                      }}
                    >
                      <div
                        className="text-[26px] font-black tabular-nums"
                        style={{ color: "#a78bfa", textShadow: "0 0 18px rgba(167,139,250,0.4)" }}
                      >
                        <CountUp
                          value={Number(snapshot.total)}
                          format={(v) => Math.round(v).toLocaleString()}
                        />
                      </div>
                      <div
                        className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      >
                        active records
                      </div>
                    </div>
                    <div
                      className="text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "rgba(148,163,184,0.6)" }}
                    >
                      Workforce Size
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  {[
                    [`${snapshot.atRisk} cases above 70% exit probability`, "#f87171"],
                    ["Served over Server-Sent Events", "#6ee7b7"],
                    ["Tenant-isolated PostgreSQL core", "#a78bfa"],
                  ].map(([label, accent]) => (
                    <Tag key={label} accent={accent}>{label}</Tag>
                  ))}
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-10 text-center">
                <div className="flex flex-col items-center gap-5">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(110,231,183,0.06)",
                      border: "1px solid rgba(110,231,183,0.2)",
                    }}
                  >
                    <Activity className="h-7 w-7" style={{ color: "#6ee7b7" }} />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white">
                      Your live telemetry appears here
                    </div>
                    <p
                      className="mt-2 mx-auto max-w-[520px] text-sm leading-relaxed"
                      style={{ color: "rgba(148,163,184,0.6)" }}
                    >
                      Connect your workspace and the gauges above fill with
                      real data from your own tenant — no placeholders, no demo
                      numbers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="btn-shine inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                      color: "#020a07",
                      boxShadow: "0 12px 34px -8px rgba(52,211,153,0.5)",
                    }}
                  >
                    Enter Workspace <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </GlassCard>
            )}
          </div>
        </section>

        {/* ══════════ MATH ENGINE — INTERACTIVE EXPLORER ══════════ */}
        <section
          id="section-2"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <BrainCircuit className="h-3.5 w-3.5" /> Analytical Core
            </SectionLabel>
            <SectionHeading>
              Aurelinx <GradientWord>Math-Engine</GradientWord> Pillars
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Mathematically-grounded solvers and simulation parameters powering advanced workforce optimizations, career projection pathways, and retention sandbox analytics. Select a pillar to explore it.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[1500px] gap-5 lg:grid-cols-[340px_1fr]">
            {/* Pillar selector */}
            <div className="space-y-2.5">
              {MATH_PILLARS.map((pillar, idx) => (
                <button
                  key={pillar.title}
                  type="button"
                  onClick={() => setActivePillar(idx)}
                  className="w-full rounded-[18px] p-4 text-left transition-all duration-200 select-none"
                  style={{
                    background:
                      idx === activePillar
                        ? `${pillar.accent}0d`
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${idx === activePillar ? `${pillar.accent}40` : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[10px] font-black"
                      style={{
                        background: `${pillar.accent}14`,
                        border: `1px solid ${pillar.accent}30`,
                        color: pillar.accent,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block truncate text-xs font-bold text-white"
                        title={pillar.title}
                      >
                        {pillar.title}
                      </span>
                      <span
                        className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: pillar.accent }}
                      >
                        {pillar.highlight}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Explorer panel */}
            <GlassCard className="relative overflow-hidden p-7 sm:p-9">
              <div className="scan-line" aria-hidden="true" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePillar}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  {(() => {
                    const pillar = MATH_PILLARS[activePillar];
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                            style={{
                              background: `${pillar.accent}12`,
                              border: `1px solid ${pillar.accent}30`,
                              color: pillar.accent,
                            }}
                          >
                            {pillar.highlight}
                          </span>
                          <span
                            className="text-[9px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: "rgba(148,163,184,0.4)" }}
                          >
                            Applied in: {pillar.applied}
                          </span>
                        </div>

                        <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
                          {pillar.title}
                        </h3>
                        <p
                          className="mt-4 max-w-[760px] text-sm leading-relaxed"
                          style={{ color: "rgba(148,163,184,0.7)" }}
                        >
                          {pillar.desc}
                        </p>

                        <div
                          className="mt-7 rounded-2xl p-5 font-mono text-[15px] sm:text-base"
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            border: `1px solid ${pillar.accent}25`,
                            color: pillar.accent,
                            boxShadow: `inset 0 0 30px ${pillar.accent}08`,
                            textShadow: `0 0 20px ${pillar.accent}30`,
                          }}
                        >
                          <FormulaTypewriter
                            formula={pillar.formula}
                            active
                          />
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                          <span
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: "rgba(148,163,184,0.4)" }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#6ee7b7" }} />
                            Live in the executive workspace
                          </span>
                          <button
                            type="button"
                            onClick={onEnterWorkspace}
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            style={{
                              background: `${pillar.accent}12`,
                              border: `1px solid ${pillar.accent}30`,
                              color: pillar.accent,
                            }}
                          >
                            Open workspace <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </GlassCard>
          </div>
        </section>

        {/* ══════════ MODULES — INTERACTIVE PLATFORM TOUR ══════════ */}
        <section
          id="section-3"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <Settings className="h-3.5 w-3.5" /> Platform Specs
            </SectionLabel>
            <SectionHeading>
              Core <GradientWord>Platform Modules</GradientWord>
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Aurelinx converts raw talent inputs, risk indicators, and
              compliance gate parameters into a beautifully unified, highly
              dense control panel. Explore each module.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[1500px] gap-5 lg:grid-cols-[300px_1fr]">
            {/* Module selector */}
            <div className="space-y-2">
              {PLATFORM_MODULES.map((mod, idx) => {
                const Icon = mod.icon;
                const isActive = idx === activeModule;
                return (
                  <button
                    key={mod.title}
                    type="button"
                    onClick={() => setActiveModule(idx)}
                    className="w-full rounded-[16px] p-3.5 text-left transition-all duration-200 select-none"
                    style={{
                      background: isActive
                        ? `${mod.accent}0d`
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? `${mod.accent}40` : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-transform duration-300"
                        style={{
                          background: `${mod.accent}14`,
                          border: `1px solid ${mod.accent}30`,
                          transform: isActive ? "scale(1.08)" : "scale(1)",
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: mod.accent }} />
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block truncate text-[11px] font-bold text-white"
                          title={mod.title}
                        >
                          {mod.title}
                        </span>
                        <span
                          className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: "rgba(148,163,184,0.4)" }}
                        >
                          Module {String(idx + 1).padStart(2, "0")}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tour panel */}
            <GlassCard className="relative overflow-hidden p-7 sm:p-9">
              <div className="scan-line" aria-hidden="true" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  {(() => {
                    const mod = PLATFORM_MODULES[activeModule];
                    const Icon = mod.icon;
                    return (
                      <>
                        <div className="flex items-start gap-5">
                          <div
                            className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl"
                            style={{
                              background: `${mod.accent}14`,
                              border: `1px solid ${mod.accent}35`,
                              boxShadow: `0 0 24px ${mod.accent}20`,
                            }}
                          >
                            <Icon className="h-6 w-6" style={{ color: mod.accent }} />
                          </div>
                          <div>
                            <div
                              className="text-[9px] font-black uppercase tracking-[0.24em]"
                              style={{ color: mod.accent }}
                            >
                              Module {String(activeModule + 1).padStart(2, "0")} · {PLATFORM_MODULES.length} modules
                            </div>
                            <h3 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white">
                              {mod.title}
                            </h3>
                          </div>
                        </div>

                        <p
                          className="mt-6 max-w-[820px] text-sm leading-relaxed"
                          style={{ color: "rgba(148,163,184,0.7)" }}
                        >
                          {mod.body}
                        </p>

                        <div className="mt-7 flex flex-wrap gap-2">
                          {mod.tags.map((t) => (
                            <Tag key={t} accent={mod.accent}>{t}</Tag>
                          ))}
                        </div>

                        <div
                          className="mt-7 rounded-[16px] p-4"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span
                              className="text-[9px] font-bold uppercase tracking-[0.2em]"
                              style={{ color: "rgba(148,163,184,0.4)" }}
                            >
                              Deep-dive available inside the workspace
                            </span>
                            <button
                              type="button"
                              onClick={onEnterWorkspace}
                              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                              style={{
                                background: `${mod.accent}12`,
                                border: `1px solid ${mod.accent}30`,
                                color: mod.accent,
                              }}
                            >
                              Explore module <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </GlassCard>
          </div>
        </section>

        {/* ══════════ ROI CALCULATOR — ENTERPRISE GRADE ══════════ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center mb-12">
            <SectionLabel>
              <Gauge className="h-3.5 w-3.5" /> Value Realization
            </SectionLabel>
            <SectionHeading>
              Interactive <GradientWord>Turnover ROI</GradientWord> Calculator
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Benchmark model based on industry research: employee replacement
              costs (recruiting, onboarding, productivity lag) average{" "}
              <span className="text-cyan-300 font-semibold">1.5x base salary</span>{" "}
              (SHRM / Gallup). Adjust the variables and watch the forecast
              update live.
            </p>
          </div>

          <div className="mx-auto max-w-[1600px]">
            <GlassCard className="p-8 grid gap-8 lg:grid-cols-2">
              {/* Sliders Side */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Total Workforce Size</span>
                    <span className="text-cyan-400 font-mono font-bold">{calcWorkforce.toLocaleString()} employees</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={calcWorkforce}
                    onChange={(e) => setCalcWorkforce(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={sliderFill(100, 10000, calcWorkforce)}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>100</span>
                    <span>10,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Average Employee Salary</span>
                    <span className="text-cyan-400 font-mono font-bold">${calcSalary.toLocaleString()} / year</span>
                  </div>
                  <input
                    type="range"
                    min="40000"
                    max="300000"
                    step="5000"
                    value={calcSalary}
                    onChange={(e) => setCalcSalary(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={sliderFill(40000, 300000, calcSalary)}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>$40,000</span>
                    <span>$300,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Annual Employee Turnover Rate</span>
                    <span className="text-cyan-400 font-mono font-bold">{calcTurnover}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    step="1"
                    value={calcTurnover}
                    onChange={(e) => setCalcTurnover(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                    style={sliderFill(5, 45, calcTurnover)}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>5% (Healthy)</span>
                    <span>45% (High Attrition)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-300">Target Retention Improvement</span>
                    <span className="text-emerald-400 font-mono font-bold">{calcReduction}% reduction</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={calcReduction}
                    onChange={(e) => setCalcReduction(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                    style={sliderFill(10, 50, calcReduction, "rgba(52,211,153,0.6)", "rgba(16,185,129,0.6)")}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>10% (Conservative)</span>
                    <span>50% (Ambitious)</span>
                  </div>
                </div>

                <div
                  className="rounded-[16px] p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.4)" }}>
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#6ee7b7" }} />
                    How the model works
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Annual departures × 1.5× salary = total attrition cost.
                    Aurelinx retention loops (30/60/90-day interventions) are
                    modeled to recover a share of those departures, which is
                    your direct savings.
                  </p>
                </div>
              </div>

              {/* Computations Side */}
              <div className="flex flex-col justify-between rounded-2xl bg-slate-950/40 border border-white/5 p-6">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      AURELINX IMPACT FORECAST
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: "rgba(110,231,183,0.08)",
                        border: "1px solid rgba(110,231,183,0.2)",
                        color: "#6ee7b7",
                      }}
                    >
                      Updates live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Annual Departures</div>
                      <div className="text-xl font-bold text-white font-mono">
                        {departures} <span className="text-xs font-normal text-slate-400">exits/yr</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Retained via Aurelinx</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">
                        +{retainedCount} <span className="text-xs font-normal text-slate-400">/ yr</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost comparison bars */}
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-400">Current annual attrition cost</span>
                        <span className="font-mono text-rose-400 font-bold">${costToday.toLocaleString()}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="bar-fill h-full rounded-full"
                          style={{
                            width: "100%",
                            background: "linear-gradient(90deg, rgba(244,63,94,0.75), rgba(244,63,94,0.3))",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-400">With Aurelinx retention loops</span>
                        <span className="font-mono text-emerald-400 font-bold">${afterCost.toLocaleString()}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="bar-fill h-full rounded-full"
                          style={{
                            width: `${afterPct}%`,
                            background: "linear-gradient(90deg, rgba(52,211,153,0.75), rgba(52,211,153,0.3))",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-5 mt-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Cost Per Exit (1.5x Multiplier)</span>
                      <span className="font-bold text-slate-300 font-mono">
                        ${(calcSalary * 1.5).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Avg Retention Loop Cost</span>
                      <span className="font-bold text-slate-300 font-mono">
                        $4,500 / intervention
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">
                    ESTIMATED NET ANNUAL SAVINGS
                  </div>
                  <div
                    className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight"
                    style={{ textShadow: "0 0 32px rgba(52,211,153,0.35)" }}
                  >
                    ${" "}
                    <CountUp
                      key={`${calcWorkforce}-${calcSalary}-${calcTurnover}-${calcReduction}`}
                      value={savings}
                      format={(v) => Math.round(v).toLocaleString()}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    *Savings projection based on standard organizational replacement cost indexes (SHRM, Gallup). Net returns vary by department role specificity.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ══════════ CONNECTORS ══════════ */}
        <section
          id="section-4"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>Connectors &amp; Integrations</SectionLabel>
            <SectionHeading>
              Enterprise <GradientWord>Data Integrations</GradientWord> Hub
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Ingest, reconcile, and sync workforce records from your primary
              HRIS, ATS, and directory systems with live validation.
            </p>
          </div>

          <div className="mt-12 mx-auto max-w-[1600px]">
            <Ticker items={tickerItems} className="mb-8" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayConnectors.slice(0, 6).map((c, i) => (
                <ConnectorTile key={`${c.name}-${i}`} {...c} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ COMPLIANCE ══════════ */}
        <section
          id="section-5"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <ShieldCheck className="h-3.5 w-3.5" /> SRE &amp; Security Compliance
            </SectionLabel>
            <SectionHeading>
              System Specifications &amp; <GradientWord>Audit Readiness</GradientWord>
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Review technical metrics, CAIQ compliance packs, disaster recovery
              profiles, and model drifts fetched directly from the Aurelinx
              APIs.
            </p>
          </div>

          {/* Accordion */}
          <div className="mx-auto mt-12 max-w-[1600px]">
            <GlassCard className="p-6">
              {/* Tabs */}
              <div
                className="flex gap-2 border-b pb-4 overflow-x-auto"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {[
                  { id: "dr", label: "Disaster Recovery", Icon: Database },
                  { id: "procurement", label: "Procurement Pack", Icon: Award },
                  { id: "drift", label: "ML Drift & Cards", Icon: Cpu },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveAccordionTab(id)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all"
                    style={{
                      background:
                        activeAccordionTab === id
                          ? "rgba(110,231,183,0.08)"
                          : "transparent",
                      border: `1px solid ${activeAccordionTab === id ? "rgba(110,231,183,0.25)" : "transparent"}`,
                      color:
                        activeAccordionTab === id
                          ? "#6ee7b7"
                          : "rgba(148,163,184,0.5)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 text-left">
                {/* DR Tab */}
                {activeAccordionTab === "dr" && (
                  <div>
                    <p
                      className="mb-4 text-xs"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Real disaster recovery runbooks extracted from the system
                      database. DR tests are automatically scheduled.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(drRunbooks.length > 0
                        ? drRunbooks.map((r) => ({
                          name: r.runbook_name,
                          env: r.environment,
                          rto: r.rto_minutes,
                          rpo: r.rpo_minutes,
                          note: r.notes,
                          status: r.status,
                        }))
                        : fallbackRunbooks
                      ).map((rb, i) => (
                        <div
                          key={i}
                          className="rounded-[16px] p-4"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                              {rb.name}
                            </span>
                            <span
                              className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                              style={{
                                background: "rgba(110,231,183,0.08)",
                                border: "1px solid rgba(110,231,183,0.2)",
                                color: "#6ee7b7",
                              }}
                            >
                              {rb.status}
                            </span>
                          </div>
                          <div
                            className="mt-1 text-[10px] uppercase tracking-wider"
                            style={{ color: "rgba(148,163,184,0.4)" }}
                          >
                            Environment: {rb.env}
                          </div>
                          <p
                            className="mt-2 text-xs leading-relaxed"
                            style={{ color: "rgba(148,163,184,0.6)" }}
                          >
                            {rb.note}
                          </p>
                          <div
                            className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-[10px] font-bold uppercase tracking-widest"
                            style={{
                              borderColor: "rgba(255,255,255,0.06)",
                              color: "rgba(148,163,184,0.5)",
                            }}
                          >
                            <span>RTO: {rb.rto} mins</span>
                            <span>RPO: {rb.rpo} mins</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procurement Tab */}
                {activeAccordionTab === "procurement" && (
                  <div>
                    <p
                      className="mb-4 text-xs"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Review procurement checklists and standard compliance
                      artifacts.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(procurement.length > 0
                        ? procurement.map((p) => ({
                          title: p.title,
                          type: p.artifact_type,
                          ver: p.version,
                          status: p.status,
                          notes: p.notes,
                        }))
                        : fallbackProcurement
                      ).map((pa, i) => (
                        <div
                          key={i}
                          className="rounded-[16px] p-4"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                              {pa.title}
                            </span>
                            <span
                              className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                              style={{
                                background: "rgba(110,231,183,0.08)",
                                border: "1px solid rgba(110,231,183,0.2)",
                                color: "#6ee7b7",
                              }}
                            >
                              {pa.status}
                            </span>
                          </div>
                          <div
                            className="mt-1 text-[10px] uppercase tracking-wider"
                            style={{ color: "rgba(148,163,184,0.4)" }}
                          >
                            Type: {pa.type} · Version {pa.ver}
                          </div>
                          <p
                            className="mt-2 text-xs leading-relaxed"
                            style={{ color: "rgba(148,163,184,0.6)" }}
                          >
                            {pa.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drift Tab */}
                {activeAccordionTab === "drift" && (
                  <div>
                    <p
                      className="mb-4 text-xs"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Review explainable ML model cards, metrics calibrations,
                      and structural data drift checks.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          title: "Model Drift Monitoring",
                          status: "healthy",
                          sub: "Model Name: attrition_v1",
                          rows: [
                            [
                              "Drift score baseline",
                              driftLogs.length > 0
                                ? driftLogs[0].drift_score
                                : "0.0815",
                            ],
                            ["Calibration error", "0.024"],
                            ["Retraining Status", "Not Needed"],
                          ],
                        },
                        {
                          title: "Active Model Card Specifications",
                          status: "approved",
                          sub: "Champion Version: attrition_v1_champion",
                          rows: [
                            [
                              "PR-AUC accuracy",
                              modelCards.length > 0
                                ? modelCards[0].pr_auc
                                : "0.94",
                            ],
                            [
                              "Fairness discrepancy gap",
                              modelCards.length > 0
                                ? modelCards[0].fairness_gap
                                : "0.04",
                            ],
                            ["Calibration Score", "99.8% Compliant"],
                          ],
                        },
                      ].map((card, i) => (
                        <div
                          key={i}
                          className="rounded-[16px] p-4"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                              {card.title}
                            </span>
                            <span
                              className="rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                              style={{
                                background: "rgba(110,231,183,0.08)",
                                border: "1px solid rgba(110,231,183,0.2)",
                                color: "#6ee7b7",
                              }}
                            >
                              {card.status}
                            </span>
                          </div>
                          <div
                            className="mt-1 text-[10px] uppercase tracking-wider"
                            style={{ color: "rgba(148,163,184,0.4)" }}
                          >
                            {card.sub}
                          </div>
                          <div className="mt-4 space-y-2">
                            {card.rows.map(([label, val]) => (
                              <div
                                key={label}
                                className="flex items-center justify-between text-xs"
                              >
                                <span
                                  style={{ color: "rgba(148,163,184,0.6)" }}
                                >
                                  {label}
                                </span>
                                <span className="font-mono text-white">
                                  {val}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* ══════════ CLOSING CTA PANEL ══════════ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="relative mx-auto max-w-[1100px] overflow-hidden rounded-[28px] p-10 sm:p-14 text-center"
            style={{
              background:
                "radial-gradient(120% 130% at 50% 0%, rgba(52,211,153,0.14), rgba(4,16,11,0.9) 60%)",
              border: "1px solid rgba(110,231,183,0.22)",
              boxShadow: "0 30px 90px -25px rgba(52,211,153,0.3)",
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 -top-40 flex justify-center" aria-hidden="true">
              <AuroraBlob color="rgba(52,211,153,0.4)" size={460} />
            </div>
            <div className="relative">
              <SectionLabel>
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready when you are
              </SectionLabel>
              <h2 className="mt-6 text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-tight text-white">
                See your workforce <GradientWord>clearly</GradientWord> — no blind spots.
              </h2>
              <p
                className="mx-auto mt-5 max-w-[560px] text-sm leading-relaxed"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Connect your HRIS and stream real-time attrition, morale, and
                policy telemetry into one calm, sharp control panel.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="btn-shine inline-flex h-12 items-center gap-2 rounded-xl px-7 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                    color: "#020a07",
                    boxShadow: "0 12px 34px -8px rgba(52,211,153,0.5)",
                  }}
                >
                  Enter Workspace <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenEnterprise}
                  className="inline-flex h-12 items-center gap-2 rounded-xl px-7 text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(226,232,240,0.85)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <Settings className="h-4 w-4" /> Operations Setup
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ PRODUCTION ENTERPRISE FOOTER ══════════ */}
        <footer
          className="mt-20 pt-16 pb-12 relative overflow-hidden"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(5, 12, 24, 0.6)" }}
        >
          {/* Gradient hairline top edge */}
          <div
            className="pointer-events-none absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(110,231,183,0.45), rgba(163,230,53,0.35), transparent)" }}
            aria-hidden="true"
          />

          {/* Ambient Glow */}
          <div
            className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[140px] opacity-20"
            style={{ background: "radial-gradient(circle, #6ee7b7 0%, #2dd4bf 50%, transparent 80%)" }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            {/* CTA strip */}
            <div
              className="flex flex-col gap-6 rounded-2xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="space-y-1 text-left">
                <h4 className="text-lg font-extrabold tracking-tight text-white">
                  Ready to see your workforce clearly?
                </h4>
                <p className="text-xs text-slate-400">
                  Launch the workspace console or configure enterprise webhook
                  gateways in seconds.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: sreStatus === "operational" ? "rgba(110,231,183,0.08)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${sreStatus === "operational" ? "rgba(110,231,183,0.25)" : "rgba(248,113,113,0.25)"}`,
                    color: sreStatus === "operational" ? "#6ee7b7" : "#f87171",
                  }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${sreStatus === "operational" ? "animate-pulse" : ""}`}
                    style={{ background: sreStatus === "operational" ? "#6ee7b7" : "#f87171" }}
                  />
                  All systems operational
                  {pingLatency ? ` · ${pingLatency}ms` : ""}
                </div>
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="btn-shine px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 active:scale-95"
                  style={{
                    background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                    color: "#020a07",
                    boxShadow: "0 8px 24px -8px rgba(52,211,153,0.5)",
                  }}
                >
                  Launch App <ArrowRight size={14} className="inline" />
                </button>
                <button
                  type="button"
                  onClick={onOpenEnterprise}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  <Settings size={14} className="inline text-cyan-400 mr-1.5" />
                  Ops Setup
                </button>
              </div>
            </div>

            {/* Main grid */}
            <div className="mt-14 grid gap-12 lg:grid-cols-12">

              {/* Brand column */}
              <div className="lg:col-span-4 space-y-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
                    <img
                      src="/aurelinx-logo-4k.svg"
                      alt="Aurelinx Logo"
                      style={{ width: "120%", height: "120%", objectFit: "contain" }}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-[0.24em] text-white">
                      AURELINX
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Management OS · v4.4
                    </div>
                  </div>
                </div>

                <p className="max-w-[360px] text-xs leading-relaxed text-slate-400">
                  Autonomous talent intelligence and HRIS ingestion middleware
                  for security-conscious enterprise teams — real-time attrition,
                  morale, and policy telemetry in one calm, sharp control panel.
                </p>

                {/* Socials */}
                <div className="flex items-center gap-2.5">
                  {[
                    { name: "github", label: "GitHub", href: "https://github.com/sainibhaowal/Aurelinx" },
                    { name: "x", label: "X (Twitter)", href: null },
                    { name: "linkedin", label: "LinkedIn", href: null },
                    { name: "youtube", label: "YouTube", href: null },
                  ].map(({ name, label, href }) =>
                    href ? (
                      <a
                        key={name}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={label}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all duration-200 hover:border-cyan-400/40 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      >
                        <BrandIcon name={name} />
                      </a>
                    ) : (
                      <button
                        key={name}
                        type="button"
                        title={label}
                        onClick={onOpenEnterprise}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500 transition-all duration-200 hover:border-cyan-400/40 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      >
                        <BrandIcon name={name} />
                      </button>
                    )
                  )}
                </div>

                {/* Newsletter */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Product updates
                  </div>
                  {subscribed ? (
                    <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-xs text-emerald-300">
                      <CheckCircle2 size={14} />
                      Subscribed — product updates on the way.
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setSubscribed(true);
                      }}
                      className="mt-2.5 flex gap-2"
                    >
                      <input
                        type="email"
                        required
                        placeholder="Work email"
                        className="h-9 w-full min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50"
                      />
                      <button
                        type="submit"
                        className="btn-shine h-9 flex-none rounded-lg px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        style={{
                          background: "linear-gradient(100deg, #34d399 0%, #a3e635 100%)",
                          color: "#020a07",
                        }}
                      >
                        Subscribe
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Link columns */}
              <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-8">
                <FooterColumn title="Product">
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-0");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Platform Overview</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-1");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Ingest Pipeline</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-2");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Math Engine</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-3");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Platform Modules</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-4");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Connectors</FooterLink>
                  </li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-5");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Compliance &amp; Audit</FooterLink>
                  </li>
                </FooterColumn>

                <FooterColumn title="Solutions">
                  <li><FooterLink onClick={onEnterWorkspace}>Enterprise Suite</FooterLink></li>
                  <li><FooterLink onClick={onEnterWorkspace}>Attrition Analytics</FooterLink></li>
                  <li><FooterLink onClick={onEnterWorkspace}>Talent Intelligence</FooterLink></li>
                  <li><FooterLink onClick={onOpenEnterprise}>Data Governance</FooterLink></li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-5");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>Security &amp; Policy</FooterLink>
                  </li>
                </FooterColumn>

                <FooterColumn title="Resources">
                  <li><FooterLink onClick={() => setManualOpen(true)}>Documentation</FooterLink></li>
                  <li><FooterLink onClick={onOpenEnterprise}>API Reference</FooterLink></li>
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("section-0");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}>System Status</FooterLink>
                  </li>
                  <li><FooterLink onClick={onEnterWorkspace}>Changelog</FooterLink></li>
                  <li><FooterLink href="mailto:support@aurelinx.com">Support</FooterLink></li>
                </FooterColumn>

                <FooterColumn title="Company">
                  <li>
                    <FooterLink onClick={() => {
                      const el = document.getElementById("landing-scroll-root");
                      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
                    }}>About</FooterLink>
                  </li>
                  <li><FooterLink onClick={onOpenEnterprise}>Careers</FooterLink></li>
                  <li><FooterLink onClick={onEnterWorkspace}>Blog</FooterLink></li>
                  <li><FooterLink href="mailto:sales@aurelinx.com">Contact Sales</FooterLink></li>
                  <li><FooterLink onClick={onOpenEnterprise}>Press Kit</FooterLink></li>
                </FooterColumn>
              </div>
            </div>

            {/* Trust & compliance band */}
            <div
              className="mt-14 flex flex-col gap-5 border-y py-6 md:flex-row md:items-center md:justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {[
                  ["SOC 2 Type II", "#6ee7b7"],
                  ["GDPR Compliant", "#6ee7b7"],
                  ["EU AI Act Ready", "#a78bfa"],
                  ["Zero-Knowledge Isolation", null],
                  ["HMAC-SHA256 Signatures", null],
                ].map(([label, accent]) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    <ShieldCheck size={12} style={{ color: accent || "#6ee7b7" }} />
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(148,163,184,0.6)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                System Status: Operational ({pingLatency ? `${pingLatency}ms` : "checking…"})
              </div>
            </div>

            {/* Legal row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-6 text-[11px] text-slate-500">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>&copy; {new Date().getFullYear()} Aurelinx Inc. All rights reserved.</span>
                <span className="opacity-40">•</span>
                <span className="cursor-default hover:text-slate-300">Privacy Policy</span>
                <span className="opacity-40">•</span>
                <span className="cursor-default hover:text-slate-300">Terms of Service</span>
                <span className="opacity-40">•</span>
                <span className="cursor-default hover:text-slate-300">Security</span>
                <span className="opacity-40">•</span>
                <span className="cursor-default hover:text-slate-300">Cookies</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-cyan-400">
                  Ingestion Region: us-east-1 (Multi-AZ Encrypted)
                </span>
              </div>
            </div>

          </div>
        </footer>

        {/* User manual modal (opened from footer Documentation link) */}
        <UserManualModal
          isOpen={manualOpen}
          onClose={() => setManualOpen(false)}
          defaultTab="overview"
        />
      </div>
    </div>
  );
};

export default LandingPage;
