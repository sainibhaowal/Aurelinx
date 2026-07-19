import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  analysisAPI,
  enterpriseAPI,
  leanAPI,
  healthAPI,
} from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";
import NeonParticlesWave from "./NeonParticlesWave";

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
      email: "elena.rodriguez@aurelius.io",
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
        desc: "Aurelius Ruleboost ML model scores the employee. Morale score of 0.32 evaluates to a high exit probability of 84% (is_at_risk=True).",
        log: "ML_ENGINE: Inferred exit risk for WD-89241 is 84.15%. Flagged is_at_risk = True.",
      },
      {
        title: "Regional Compliance Policy Gate",
        desc: "Policy packs evaluate the high risk trigger. Action requires Multi-Party Admin Authorization key to reveal sensitive PII morale metadata.",
        log: 'POLICY_GATE: Action "PII_MORALE_EXPORT" requires multi-party approval under policy "Regional Privacy Pact (us-east)".',
      },
      {
        title: "Active Retention Intervention",
        desc: "Aurelius automatically queues a high-priority 30-day retention loop, mapping owner assignment, estimated retention cost, and target ROI.",
        log: "TASK_QUEUE: Created active retention intervention task #INT-3029. Owner: HR Director US. Cost: $4,500.",
      },
    ],
  },
  {
    name: "Greenhouse ATS PM Candidate Ingest",
    source: "Greenhouse ATS Webhook",
    tag: "ATS",
    tagColor: "#67e8f9",
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
    accent: "#67e8f9",
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
    accent: "#06b6d4",
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

/* ─────────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────────── */
const GlassCard = ({ children, className = "", style = {} }) => (
  <div
    className={`rounded-[22px] ${className}`}
    style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(14px)",
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p
    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em]"
    style={{
      background: "rgba(103,232,249,0.08)",
      border: "1px solid rgba(103,232,249,0.2)",
      color: "#67e8f9",
    }}
  >
    {children}
  </p>
);

const SectionHeading = ({ children }) => (
  <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight text-white">
    {children}
  </h2>
);

const Tag = ({ children }) => (
  <span
    className="rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(148,163,184,0.7)",
    }}
  >
    {children}
  </span>
);

/* ─────────────────────────────────────────
   CONNECTOR TILE
───────────────────────────────────────── */
const ConnectorTile = ({ name, type, status }) => {
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
      color: "#67e8f9",
      bg: "rgba(103,232,249,0.06)",
      border: "rgba(103,232,249,0.2)",
    },
  };
  const s = statusStyle[String(status).toLowerCase()] || statusStyle.supported;

  return (
    <div
      className="group relative overflow-hidden rounded-[18px] px-5 py-5 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
            style={{
              background: "rgba(103,232,249,0.06)",
              border: "1px solid rgba(103,232,249,0.15)",
            }}
          >
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "#67e8f9" }}
            >
              {name.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{name}</div>
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
    </div>
  );
};

/* ─────────────────────────────────────────
   MINI SIGNAL ROW
───────────────────────────────────────── */
const MiniSignal = ({ index, active, label, value }) => (
  <div
    className="flex items-center justify-between rounded-[14px] px-3.5 py-3 transition-all duration-300"
    style={{
      background: active ? "rgba(103,232,249,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${active ? "rgba(103,232,249,0.2)" : "rgba(255,255,255,0.06)"}`,
    }}
  >
    <div className="flex items-center gap-3">
      <span
        className={`h-2 w-2 flex-none rounded-full ${active ? "animate-pulse" : ""}`}
        style={{
          background: active ? "#67e8f9" : "rgba(255,255,255,0.15)",
          boxShadow: active ? "0 0 10px rgba(103,232,249,0.7)" : "none",
        }}
      />
      <div>
        <div
          className="text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "rgba(148,163,184,0.4)" }}
        >
          0{index + 1}
        </div>
        <div className="text-sm font-semibold text-white">{label}</div>
      </div>
    </div>
    <div className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
      {value}
    </div>
  </div>
);

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
  const [systemEpoch, setSystemEpoch] = useState(new Date().toISOString());
  const [calcWorkforce, setCalcWorkforce] = useState(1500);
  const [calcSalary, setCalcSalary] = useState(120000);
  const [calcTurnover, setCalcTurnover] = useState(15);
  const [calcReduction, setCalcReduction] = useState(25);

  useEffect(() => {
    const timer = setInterval(
      () => setSystemEpoch(new Date().toISOString()),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

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

  const displayStats = snapshot
    ? [
      { label: "Workforce Size", value: snapshot.total },
      { label: "Risk Cluster", value: snapshot.atRisk },
      {
        label: "Avg Morale",
        value: Number(snapshot.avgSentiment).toFixed(2),
      },
    ]
    : [
      { label: "Workforce Size", value: "1,240" },
      { label: "Risk Cluster", value: "42" },
      { label: "Avg Morale", value: "0.78" },
    ];

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

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div
      className="relative min-h-screen overflow-x-hidden overflow-y-auto text-slate-100"
      style={{ background: "#07111f" }}
    >
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
              "radial-gradient(rgba(103,232,249,0.04) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-10">
        {/* ══════════ NAV ══════════ */}
        <header className="sticky top-4 z-50 mb-4 pt-4">
          <div
            className="flex items-center justify-between rounded-full px-5 py-3"
            style={{
              background: "rgba(7,17,31,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 select-none">
              <div
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
              >
                <img
                  src="/icon.png"
                  alt="Aurelius Logo"
                  style={{ width: "120%", height: "120%", objectFit: "contain" }}
                />
              </div>
              <div>
                <div className="text-xs font-black tracking-[0.28em] text-white">
                  AURELIUS
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
              {/* SRE ping */}
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
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{ background: "#67e8f9", color: "#07111f" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#a5f3fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#67e8f9";
                }}
              >
                Workspace <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ══════════ HERO ══════════ */}
        <section id="section-0" className="relative pb-16 pt-16 lg:pt-20 overflow-hidden">
          <NeonParticlesWave />
          <div className="relative z-10 mx-auto flex max-w-[860px] flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionLabel>
                <Activity className="h-3.5 w-3.5" />
                Live workforce analytics & policy governance
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
              with a <span style={{ color: "#67e8f9" }}>
                calmer, sharper
              </span>{" "}
              workflow.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 max-w-[580px] text-base leading-relaxed"
              style={{ color: "rgba(148,163,184,0.7)" }}
            >
              Aurelius converts raw talent inputs, risk indicators, and
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
                className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all active:scale-[0.98]"
                style={{ background: "#67e8f9", color: "#07111f" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#a5f3fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#67e8f9";
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
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(226,232,240,0.85)",
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2"
            >
              {[
                "Live PostgreSQL Sync",
                "Policy Release Gates",
                "Explainable ML Model Cards",
              ].map((label) => (
                <Tag key={label}>{label}</Tag>
              ))}
            </motion.div>
          </div>

          {/* ── LIVE PREVIEW GRID ── */}
          <div className="mx-auto mt-14 grid max-w-[1600px] gap-5 lg:grid-cols-[260px_1fr_230px]">
            {/* LEFT — Workspace streams */}
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
            >
              <GlassCard className="p-5 h-full">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.24em]"
                    style={{ color: "rgba(148,163,184,0.4)" }}
                  >
                    Workspace Streams
                  </span>
                  <span
                    className="h-2 w-2 animate-pulse rounded-full"
                    style={{
                      background: "#67e8f9",
                      boxShadow: "0 0 10px rgba(103,232,249,0.8)",
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ["Workspace View", "Executive control"],
                    ["Directory Ingest", "Live people records"],
                    ["Policy Enforcer", "Blocked compliance gates"],
                    ["Enterprise Sync", "Secure connector status"],
                  ].map(([label, note], i) => (
                    <MiniSignal
                      key={label}
                      index={i}
                      active={i === 0}
                      label={label}
                      value={note}
                    />
                  ))}
                </div>
                <div
                  className="mt-4 rounded-[16px] p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="text-[9px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "rgba(148,163,184,0.4)" }}
                  >
                    Primary Core Task
                  </div>
                  <div className="mt-2 text-base font-black text-white">
                    Risk Mitigation
                  </div>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    Continuous analysis of organizational sentiment drifts and
                    attrition risks.
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            {/* CENTER — Main telemetry dock */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.27 }}
            >
              <GlassCard className="p-5 h-full flex flex-col">
                {/* Card header */}
                <div
                  className="flex items-center justify-between border-b pb-4"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <div
                      className="text-[10px] font-black uppercase tracking-[0.24em]"
                      style={{ color: "rgba(148,163,184,0.4)" }}
                    >
                      Live Telemetry Control
                    </div>
                    <div className="mt-1 text-base font-bold text-white">
                      Aurelius Management OS
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider"
                    style={{
                      background: "rgba(110,231,183,0.08)",
                      border: "1px solid rgba(110,231,183,0.2)",
                      color: "#6ee7b7",
                    }}
                  >
                    SRE: Healthy
                  </span>
                </div>

                {/* Radar ring */}
                <div
                  className="relative mt-5 flex flex-1 min-h-[320px] items-center justify-center rounded-[18px] overflow-hidden"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Rotating rings */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 50,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute h-[300px] w-[300px] rounded-full pointer-events-none"
                    style={{ border: "1px solid rgba(103,232,249,0.06)" }}
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 70,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute h-[220px] w-[220px] rounded-full pointer-events-none"
                    style={{ border: "1px dashed rgba(255,255,255,0.04)" }}
                  />

                  {/* Core metric blob */}
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{
                      duration: 9,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute flex h-[155px] w-[155px] flex-col items-center justify-center rounded-[24px]"
                    style={{
                      background: "rgba(103,232,249,0.04)",
                      border: "1px solid rgba(103,232,249,0.15)",
                    }}
                  >
                    <div
                      className="text-[9px] font-black uppercase tracking-[0.26em]"
                      style={{ color: "rgba(103,232,249,0.5)" }}
                    >
                      Talent Pool
                    </div>
                    <div
                      className="mt-2 text-5xl font-black"
                      style={{ color: "#67e8f9" }}
                    >
                      {snapshot ? snapshot.total : "1,240"}
                    </div>
                    <div
                      className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Active Records
                    </div>
                  </motion.div>

                  {/* Float widget — top left */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute left-4 top-4 w-[130px] rounded-[16px] p-3.5"
                    style={{
                      background: "rgba(7,17,31,0.9)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ color: "#f87171" }}
                    >
                      <TrendingUp className="h-3 w-3" /> Risk High
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      {snapshot ? `${snapshot.atRisk} cases` : "42 cases"}
                    </div>
                    <div
                      className="mt-0.5 text-[10px]"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Flagged exit alerts
                    </div>
                  </motion.div>

                  {/* Float widget — bottom right */}
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-4 right-4 w-[130px] rounded-[16px] p-3.5"
                    style={{
                      background: "rgba(7,17,31,0.9)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ color: "#6ee7b7" }}
                    >
                      <Workflow className="h-3 w-3" /> Policy Gate
                    </div>
                    <div className="mt-2 text-lg font-black text-white">
                      Enforced
                    </div>
                    <div
                      className="mt-0.5 text-[10px]"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      Gates Operational
                    </div>
                  </motion.div>
                </div>

                {/* Bottom metric cards */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Risk Overview",
                      value: snapshot ? snapshot.atRisk : "42 cases",
                      sub: "Exit prob > 70%",
                    },
                    {
                      label: "Retention Pulse",
                      value: snapshot
                        ? `${(100 - snapshot.atRiskPct).toFixed(0)}%`
                        : "96.6%",
                      sub: "Stable workforce",
                    },
                    {
                      label: "Policy State",
                      value: "Active",
                      sub: "Auth required",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-[16px] p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        className="text-[9px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: "rgba(148,163,184,0.4)" }}
                      >
                        {card.label}
                      </div>
                      <div className="mt-2 text-lg font-black text-white">
                        {card.value}
                      </div>
                      <div
                        className="mt-0.5 text-[9px]"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      >
                        {card.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* RIGHT — Access governance */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.27 }}
            >
              <GlassCard className="p-5 h-full">
                <div
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "rgba(148,163,184,0.4)" }}
                >
                  <ShieldCheck
                    className="h-3.5 w-3.5"
                    style={{ color: "#67e8f9" }}
                  />
                  Access Governance
                </div>
                <div
                  className="mt-4 rounded-[16px] p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="text-[9px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: "rgba(148,163,184,0.4)" }}
                  >
                    Tenant Isolation
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    default
                  </div>
                  <p
                    className="mt-1.5 text-xs leading-relaxed"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    System partitions all analytics queries utilizing
                    high-isolation schemas.
                  </p>
                </div>
                <div className="mt-4 space-y-2.5">
                  {displayStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between rounded-[14px] px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        className="text-xs font-semibold"
                        style={{ color: "rgba(148,163,184,0.6)" }}
                      >
                        {stat.label}
                      </div>
                      <div className="text-sm font-black text-white">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </section>

        {/* ══════════ SIMULATOR ══════════ */}
        <section
          id="section-1"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Header */}
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <Activity className="h-3.5 w-3.5" /> Continuous Ingest Sync
            </SectionLabel>
            <SectionHeading>
              Interactive Ingestion Pipeline Simulator
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Aurelius pipelines continuously sync files and API endpoints,
              curate them into Silver SQL tables, score exit risks, check
              security policies, and trigger retention interventions. Select a
              scenario and trace its journey.
            </p>
          </div>

          {/* Console layout */}
          <div className="mx-auto mt-12 grid max-w-[1600px] gap-5 lg:grid-cols-[360px_1fr]">
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
                        ? "rgba(103,232,249,0.05)"
                        : "rgba(255,255,255,0.02)",
                    border: `1px solid ${idx === selectedScenarioIdx ? "rgba(103,232,249,0.25)" : "rgba(255,255,255,0.07)"}`,
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
                className="mt-3 w-full flex h-12 items-center justify-center gap-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all select-none"
                style={{
                  background: isSimulating
                    ? "rgba(103,232,249,0.06)"
                    : "#67e8f9",
                  border: `1px solid ${isSimulating ? "rgba(103,232,249,0.2)" : "transparent"}`,
                  color: isSimulating ? "#67e8f9" : "#07111f",
                  cursor: isSimulating ? "not-allowed" : "pointer",
                  opacity: isSimulating ? 0.7 : 1,
                }}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isSimulating ? "animate-spin" : ""}`}
                />
                {isSimulating
                  ? "Running Simulation…"
                  : "Trigger Simulation Run"}
              </button>
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
                  <Cpu className="h-4 w-4" style={{ color: "#67e8f9" }} />
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
                  sync: default_tenant
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
                    background: "#67e8f9",
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
                                ? "rgba(103,232,249,0.1)"
                                : isActive
                                  ? "rgba(103,232,249,0.08)"
                                  : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isErr ? "rgba(248,113,113,0.4)" : isDone ? "rgba(103,232,249,0.4)" : isActive ? "rgba(103,232,249,0.5)" : "rgba(255,255,255,0.08)"}`,
                            color: isErr
                              ? "#f87171"
                              : isDone
                                ? "#67e8f9"
                                : isActive
                                  ? "#67e8f9"
                                  : "rgba(148,163,184,0.4)",
                            boxShadow: isActive
                              ? "0 0 14px rgba(103,232,249,0.25)"
                              : "none",
                          }}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{
                            color: isActive
                              ? "#67e8f9"
                              : isDone
                                ? "rgba(103,232,249,0.6)"
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
                    style={{ color: "rgba(103,232,249,0.6)" }}
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
                      style={{ color: "#67e8f9" }}
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
                  className="rounded-b-[14px] p-4 font-mono text-[10px] leading-6 text-left overflow-y-auto max-h-[130px]"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.06)",
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
                                ? "#67e8f9"
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

        {/* ══════════ MATH ENGINE ══════════ */}
        <section
          id="section-2"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <BrainCircuit className="h-3.5 w-3.5" /> Analytical Core
            </SectionLabel>
            <SectionHeading>Aurelius Math-Engine Pillars</SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Mathematically-grounded solvers and simulation parameters powering advanced workforce optimizations, career projection pathways, and retention sandbox analytics.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[1600px] gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Semantic Skills Graph & Adjacencies",
                formula: "G = (V, E) | min(D_ij)",
                accent: "#0ea5a4",
                desc: "Resolves multidimensional skill match requirements by building a weighted directional adjacency matrix. Evaluates skills overlap, identifies critical gaps, and projects the shortest path from candidate vectors to target role nodes.",
                highlight: "Shortest Path Dijkstra Routing",
              },
              {
                title: "Optimal Team Assembly (Simulated Annealing)",
                formula: "P = exp(ΔE / T) | T_k = T_0 * α^k",
                accent: "#fbbf24",
                desc: "Searches the vast combinatorics space of employee-skill pairings using a stochastic simulated annealing engine. Constrained by strict budget caps, maximum team size limits, and role-skill density matrices.",
                highlight: "Metropolis-Hastings Solver",
              },
              {
                title: "Attrition Sandbox & Cox Hazards",
                formula: "h(t) = h_0(t) * exp(Σ β_i * X_i)",
                accent: "#ef4444",
                desc: "Estimates cumulative baseline hazards across double-Gaussian peak tenures. Integrates SHAP-covariate weights (morale, salary ratio, workload fatigue) to compute dynamic hazard multipliers and flight risk mitigation paths.",
                highlight: "Proportional Hazards Regression",
              },
              {
                title: "Organizational Network Analysis (ONA)",
                formula: "PR(u) = (1-d)/N + d * Σ (PR(v) / L(v))",
                accent: "#ec4899",
                desc: "Maps pull request reviews, collaboration commits, and communication telemetry weights onto an interactive organizational interaction graph. Computes influence via PageRank and bridge-strength via Betweenness.",
                highlight: "Brandes Betweenness Centrality",
              },
              {
                title: "Markov Career Path Horizons",
                formula: "P^(n) = P^n | Σ P_ij = 1",
                accent: "#a78bfa",
                desc: "Models internal role transitions as a discrete-time Markov chain. Projects state probability matrices over a 3-year horizon, scaling step velocity dynamically with employee skills coverage ratios.",
                highlight: "Chapman-Kolmogorov Horizon Projection",
              }
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="group relative overflow-hidden rounded-[22px] p-6 transition-all duration-300 flex flex-col justify-between"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = pillar.accent + "40";
                  e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: pillar.accent + "12",
                        border: "1px solid " + pillar.accent + "30",
                        color: pillar.accent,
                      }}
                    >
                      {pillar.highlight}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mb-2 leading-snug">
                    {pillar.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed mb-6"
                    style={{ color: "rgba(148,163,184,0.65)" }}
                  >
                    {pillar.desc}
                  </p>
                </div>
                <div
                  className="rounded-xl p-3 font-mono text-[11px] text-center"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    color: pillar.accent,
                  }}
                >
                  {pillar.formula}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ MODULES ══════════ */}
        <section
          id="section-3"
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center">
            <SectionLabel>
              <Settings className="h-3.5 w-3.5" /> Platform Specs
            </SectionLabel>
            <SectionHeading>Core Platform Modules</SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Aurelius converts raw talent inputs, risk indicators, and
              compliance gate parameters into a beautifully unified, highly
              dense control panel.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[1600px] gap-5 sm:grid-cols-2">
            {PLATFORM_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="group rounded-[20px] p-6 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.035)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
                    style={{
                      background: `${mod.accent}0d`,
                      border: `1px solid ${mod.accent}25`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: mod.accent }} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">
                    {mod.title}
                  </h3>
                  <p
                    className="mt-2 text-[13px] leading-relaxed"
                    style={{ color: "rgba(148,163,184,0.6)" }}
                  >
                    {mod.body}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {mod.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════ ROI CALCULATOR ══════════ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="mx-auto max-w-[700px] text-center mb-12">
            <SectionLabel>Value Realization</SectionLabel>
            <SectionHeading>Interactive Turnover ROI Calculator</SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Industry metrics show employee replacement costs (recruiting, onboarding, productivity lag) average 1.5x base salary. Adjust variables to see your organization's potential savings.
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
                    className="w-full h-1.5 bg-slate-950/70 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
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
                    className="w-full h-1.5 bg-slate-950/70 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
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
                    className="w-full h-1.5 bg-slate-950/70 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
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
                    className="w-full h-1.5 bg-slate-950/70 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>10% (Conservative)</span>
                    <span>50% (Ambitious)</span>
                  </div>
                </div>
              </div>

              {/* Computations Side */}
              <div className="flex flex-col justify-between rounded-2xl bg-slate-950/40 border border-white/5 p-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-6">
                    AURELIUS IMPACT FORECAST
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Annual Departures</div>
                      <div className="text-xl font-bold text-white font-mono">
                        {Math.round(calcWorkforce * (calcTurnover / 100))} <span className="text-xs font-normal text-slate-400">exits/yr</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Total Attrition Cost</div>
                      <div className="text-xl font-bold text-rose-400 font-mono">
                        ${(Math.round(calcWorkforce * (calcTurnover / 100)) * calcSalary * 1.5).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Retained Employees via Aurelius</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        +{Math.round(calcWorkforce * (calcTurnover / 100) * (calcReduction / 100))} / year
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Cost Per Exit (1.5x Multiplier)</span>
                      <span className="font-bold text-slate-300 font-mono">
                        ${(calcSalary * 1.5).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">
                    ESTIMATED NET ANNUAL SAVINGS
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight glow-text">
                    ${(Math.round(calcWorkforce * (calcTurnover / 100) * (calcReduction / 100)) * calcSalary * 1.5).toLocaleString()}
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
            <SectionLabel>Connectors & Integrations</SectionLabel>
            <SectionHeading>Enterprise Data Integrations Hub</SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Ingest, reconcile, and sync workforce records from your primary
              HRIS, ATS, and directory systems with live validation.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1600px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayConnectors.slice(0, 6).map((c, i) => (
              <ConnectorTile key={`${c.name}-${i}`} {...c} />
            ))}
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
              <ShieldCheck className="h-3.5 w-3.5" /> SRE & Security Compliance
            </SectionLabel>
            <SectionHeading>
              System Specifications & Audit Readiness
            </SectionHeading>
            <p
              className="mt-5 text-sm leading-relaxed"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Review technical metrics, CAIQ compliance packs, disaster recovery
              profiles, and model drifts fetched directly from the Aurelius
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
                          ? "rgba(103,232,249,0.08)"
                          : "transparent",
                      border: `1px solid ${activeAccordionTab === id ? "rgba(103,232,249,0.25)" : "transparent"}`,
                      color:
                        activeAccordionTab === id
                          ? "#67e8f9"
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
                                background: "rgba(103,232,249,0.08)",
                                border: "1px solid rgba(103,232,249,0.2)",
                                color: "#67e8f9",
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

        {/* ══════════ FOOTER ══════════ */}
        <footer
          className="py-10"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* SRE telemetry row */}
          <div className="mb-8 grid gap-5 sm:grid-cols-4">
            {[
              {
                label: "SRE Health Sync",
                value: `API ${sreStatus}`,
                accent: sreStatus === "operational" ? "#6ee7b7" : "#f87171",
                dot: true,
              },
              {
                label: "Network Latency",
                value: pingLatency ? `${pingLatency} ms` : "—",
                mono: true,
              },
              {
                label: "Active Tenant",
                value: "default_isolated",
                mono: true,
                accent: "rgba(103,232,249,0.8)",
              },
              {
                label: "System Epoch",
                value: systemEpoch,
                mono: true,
                accent: "#67e8f9",
              },
            ].map((item) => (
              <div key={item.label}>
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "rgba(148,163,184,0.35)" }}
                >
                  {item.label}
                </div>
                <div
                  className={`mt-1.5 flex items-center gap-2 text-xs font-bold ${item.mono ? "font-mono" : ""}`}
                  style={{ color: item.accent || "rgba(226,232,240,0.8)" }}
                >
                  {item.dot && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${sreStatus === "operational" ? "animate-pulse" : ""}`}
                      style={{ background: item.accent, flexShrink: 0 }}
                    />
                  )}
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(148,163,184,0.35)" }}
            >
              Aurelius OS &copy; {new Date().getFullYear()} — Operational talent
              intelligence.
            </div>
            <div
              className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(148,163,184,0.4)" }}
            >
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="transition-colors hover:text-white"
              >
                Open Workspace
              </button>
              <button
                type="button"
                onClick={onOpenEnterprise}
                className="transition-colors hover:text-white"
              >
                Operations Setup
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
