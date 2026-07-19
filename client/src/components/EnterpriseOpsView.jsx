import { useEffect, useState } from "react";
import {
  Link2,
  ShieldAlert,
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Upload,
  Database,
  Cpu,
  Globe,
  Activity,
  Shield,
  Layers,
  Play,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart3,
  Lock,
  FileSpreadsheet,
  Zap,
  HelpCircle,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import { enterpriseAPI, leanAPI } from "../services/apiClient";

const EnterpriseOpsView = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pipelines"); // 'pipelines', 'ai-gov', 'workflows', 'compliance'

  // Data States
  const [connections, setConnections] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [attrition, setAttrition] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [models, setModels] = useState([]);
  const [drifts, setDrifts] = useState([]);
  const [quarantine, setQuarantine] = useState([]);
  const [modelTop, setModelTop] = useState([]);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [modelCards, setModelCards] = useState([]);
  const [fairness, setFairness] = useState(null);
  const [releaseGates, setReleaseGates] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [drRunbooks, setDrRunbooks] = useState([]);
  const [procurementArtifacts, setProcurementArtifacts] = useState([]);
  const [drillResult, setDrillResult] = useState(null);
  const [dataSummary, setDataSummary] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [executivePacket, setExecutivePacket] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [syncJobs, setSyncJobs] = useState([]);

  // Form States
  const [connForm, setConnForm] = useState({
    name: "",
    source_type: "hris",
    provider: "",
    status: "draft",
    auth_type: "api_key",
    base_url: "",
  });

  const [intForm, setIntForm] = useState({
    title: "",
    target_scope: "team",
    target_department: "",
    priority: "medium",
    owner_name: "",
    expected_impact: "",
  });

  const [syncState, setSyncState] = useState({});

  const [importFiles, setImportFiles] = useState({
    employees: null,
    candidates: null,
    employee_skills: null,
    candidate_skills: null,
    employee_experience: null,
    candidate_experience: null,
    bundle: null,
  });

  const [contractForm, setContractForm] = useState({
    source_type: "hris",
    provider: "workday",
    required_fields: "external_id,full_name,email,department,role",
  });

  const [mappingForm, setMappingForm] = useState({
    source_field: "",
    canonical_field: "",
    transform_rule: "",
    required: true,
  });

  const [policyForm, setPolicyForm] = useState({
    region: "global",
    policy_name: "",
    action_type: "intervention",
    min_confidence: 0.75,
    requires_approval: true,
    blocked_if_missing_evidence: true,
    blocked_actions: "",
  });

  const [drForm, setDrForm] = useState({
    runbook_name: "",
    environment: "prod",
    rto_minutes: 120,
    rpo_minutes: 15,
    status: "draft",
    notes: "",
  });

  const [artifactForm, setArtifactForm] = useState({
    artifact_type: "msa",
    title: "",
    version: "v1",
    status: "draft",
    notes: "",
  });

  const trackImportJob = async (jobId, scope, kind = null) => {
    while (true) {
      const job = await leanAPI.getImportJobStatus(jobId);
      const nextState = {
        phase: job.phase || "running",
        percent: Number(job.progress || 0),
        message: job.message || "Processing import...",
      };

      if (scope === "bundle") {
        setUploadProgress((prev) => ({ ...prev, bundle: nextState }));
      } else if (kind) {
        setUploadProgress((prev) => ({ ...prev, [kind]: nextState }));
      }

      if (job.status === "completed") {
        if (scope === "bundle") {
          setUploadProgress((prev) => ({
            ...prev,
            bundle: {
              phase: "completed",
              percent: 100,
              message: "Import completed.",
            },
          }));
        } else if (kind) {
          setUploadProgress((prev) => ({
            ...prev,
            [kind]: {
              phase: "completed",
              percent: 100,
              message: "Import completed.",
            },
          }));
        }
        await loadAll();
        return job.result;
      }

      if (job.status === "failed") {
        const error = new Error(job.error || "Import failed");
        if (scope === "bundle") {
          setUploadProgress((prev) => ({
            ...prev,
            bundle: {
              phase: "failed",
              percent: nextState.percent || 100,
              message: error.message,
            },
          }));
        } else if (kind) {
          setUploadProgress((prev) => ({
            ...prev,
            [kind]: {
              phase: "failed",
              percent: nextState.percent || 100,
              message: error.message,
            },
          }));
        }
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [connData, intData, explainData] = await Promise.all([
        enterpriseAPI.listConnections(),
        enterpriseAPI.listInterventions(),
        enterpriseAPI.getAttritionExplain(15),
      ]);
      setConnections(connData || []);
      setInterventions(intData || []);
      setAttrition(explainData?.items || []);

      const [contractData, modelData, quarantineData] = await Promise.all([
        leanAPI.listContracts(),
        leanAPI.listModels(),
        leanAPI.listQuarantine(30),
      ]);
      setContracts(contractData || []);
      setModels(modelData || []);
      setQuarantine(quarantineData || []);

      const [driftData, scenarioData, policyData] = await Promise.all([
        leanAPI.listDrift(),
        leanAPI.listScenarios(),
        leanAPI.listPolicyPacks(),
      ]);
      setDrifts(driftData || []);
      setScenarios(scenarioData || []);
      setPolicies(policyData || []);

      const [cardData, fairnessData, gateData, auditData] = await Promise.all([
        leanAPI.listModelCards(),
        leanAPI.getFairnessSummary(),
        leanAPI.listReleaseGates(),
        leanAPI.listAuditEvents(),
      ]);
      setModelCards(cardData || []);
      setFairness(fairnessData || null);
      setReleaseGates(gateData || []);
      setAuditEvents(auditData || []);

      const [drData, artifactData] = await Promise.all([
        leanAPI.listDRRunbooks(),
        leanAPI.listProcurementArtifacts(),
      ]);
      setDrRunbooks(drData || []);
      setProcurementArtifacts(artifactData || []);

      const [summaryData, packetData] = await Promise.all([
        leanAPI.getDataSummary(),
        leanAPI.getExecutivePacket("monthly"),
      ]);
      setDataSummary(summaryData || null);
      setExecutivePacket(packetData || null);

      // Auto select connection if available
      if (connData?.[0]?.id) {
        const connectionId = connData[0].id;
        setSelectedConnectionId(connectionId);
        const [mapData, jobData] = await Promise.all([
          leanAPI.listFieldMappings(connectionId),
          leanAPI.listSyncJobs(connectionId),
        ]);
        setFieldMappings(mapData || []);
        setSyncJobs(jobData || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (isMounted) {
        await loadAll().catch(console.error);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const createConnection = async () => {
    if (!connForm.name.trim() || !connForm.provider.trim()) return;
    await enterpriseAPI.createConnection({
      ...connForm,
      name: connForm.name.trim(),
      provider: connForm.provider.trim(),
      base_url: connForm.base_url?.trim() || null,
    });
    setConnForm((prev) => ({ ...prev, name: "", provider: "", base_url: "" }));
    await loadAll();
  };

  const createIntervention = async () => {
    if (!intForm.title.trim()) return;
    await enterpriseAPI.createIntervention({
      ...intForm,
      title: intForm.title.trim(),
      target_department: intForm.target_department?.trim() || null,
      owner_name: intForm.owner_name?.trim() || null,
      expected_impact: intForm.expected_impact?.trim() || null,
    });
    setIntForm({
      title: "",
      target_scope: "team",
      target_department: "",
      priority: "medium",
      owner_name: "",
      expected_impact: "",
    });
    await loadAll();
  };

  const setInterventionStatus = async (id, status) => {
    await enterpriseAPI.updateIntervention(id, { status });
    await loadAll();
  };

  const triggerSync = async (connectionId) => {
    await enterpriseAPI.triggerConnectionSync(connectionId);
    await enterpriseAPI.streamConnectionSync(connectionId, {
      onSync: (payload) => {
        setSyncState((prev) => ({ ...prev, [connectionId]: payload }));
      },
    });
    await loadAll();
  };

  const upsertOutcome = async (interventionId, checkpointDay, status) => {
    await enterpriseAPI.upsertInterventionOutcome(interventionId, {
      checkpoint_day: checkpointDay,
      status,
      notes: `Checkpoint ${checkpointDay} status updated to ${status}`,
    });
    await loadAll();
  };

  const createContract = async () => {
    const required_fields = contractForm.required_fields
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await leanAPI.createContract({
      source_type: contractForm.source_type,
      provider: contractForm.provider.trim().toLowerCase(),
      required_fields,
      version: "v1",
      status: "active",
    });
    await loadAll();
  };

  const runLeanSync = async (connectionId) => {
    await leanAPI.syncConnection(connectionId);
    await loadAll();
  };

  const trainAndScore = async () => {
    await leanAPI.trainModel();
    const scored = await leanAPI.scoreModel(20);
    setModelTop(scored.top || []);
    await loadAll();
  };

  const runScenario = async () => {
    const out = await leanAPI.runScenario({
      scenario_name: "Budget Allocation v1",
      budget_cap: 250000,
      target_hires: 20,
      target_retentions: 40,
      retention_priority: 0.65,
      hiring_priority: 0.35,
      retention_unit_cost: 3000,
      hire_unit_cost: 10000,
    });
    setScenarioResult(out);
    await loadAll();
  };

  const createPolicy = async () => {
    if (!policyForm.policy_name.trim()) return;
    const blocked_actions = policyForm.blocked_actions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await leanAPI.createPolicyPack({
      ...policyForm,
      policy_name: policyForm.policy_name.trim(),
      blocked_actions,
      min_confidence: Number(policyForm.min_confidence),
    });
    setPolicyForm((p) => ({ ...p, policy_name: "", blocked_actions: "" }));
    await loadAll();
  };

  const createDrRunbook = async () => {
    if (!drForm.runbook_name.trim()) return;
    await leanAPI.createDRRunbook({
      ...drForm,
      runbook_name: drForm.runbook_name.trim(),
      rto_minutes: Number(drForm.rto_minutes),
      rpo_minutes: Number(drForm.rpo_minutes),
      notes: drForm.notes?.trim() || null,
    });
    setDrForm({
      runbook_name: "",
      environment: "prod",
      rto_minutes: 120,
      rpo_minutes: 15,
      status: "draft",
      notes: "",
    });
    await loadAll();
  };

  const drillRunbook = async (runbookId) => {
    const result = await leanAPI.runDRDrill(runbookId);
    setDrillResult(result || null);
    await loadAll();
  };

  const createProcurementArtifact = async () => {
    if (!artifactForm.title.trim()) return;
    await leanAPI.createProcurementArtifact({
      ...artifactForm,
      title: artifactForm.title.trim(),
      notes: artifactForm.notes?.trim() || null,
    });
    setArtifactForm({
      artifact_type: "msa",
      title: "",
      version: "v1",
      status: "draft",
      notes: "",
    });
    await loadAll();
  };

  const retrainModel = async () => {
    await leanAPI.retrainModel();
    await loadAll();
  };

  const approveModelCard = async (id) => {
    await leanAPI.approveModelCard(id);
    await loadAll();
  };

  const promoteModelCard = async (id) => {
    await leanAPI.promoteModelCard(id);
    await loadAll();
  };

  const rollbackModelCard = async (id) => {
    await leanAPI.rollbackModelCard(id);
    await loadAll();
  };

  const approveReleaseGate = async (id) => {
    await leanAPI.approveReleaseGate(id);
    await loadAll();
  };

  const uploadImport = async (kind) => {
    const file = importFiles[kind];
    if (!file) return;
    setUploadProgress((prev) => ({
      ...prev,
      [kind]: { phase: "uploading", percent: 0, message: "Uploading CSV..." },
    }));
    const queued = await leanAPI.importCsvAsync(kind, file, (percent) => {
      setUploadProgress((prev) => ({
        ...prev,
        [kind]: {
          phase: percent >= 100 ? "queued" : "uploading",
          percent,
          message:
            percent >= 100
              ? "Upload complete. Waiting for backend import..."
              : `Uploading CSV... ${percent}%`,
        },
      }));
    });
    await trackImportJob(queued.job_id, "csv", kind);
  };

  const uploadBundleImport = async () => {
    const file = importFiles.bundle;
    if (!file) return;
    setUploadProgress((prev) => ({
      ...prev,
      bundle: {
        phase: "uploading",
        percent: 0,
        message: "Uploading ZIP bundle...",
      },
    }));
    const queued = await leanAPI.importDatasetBundleAsync(file, (percent) => {
      setUploadProgress((prev) => ({
        ...prev,
        bundle: {
          phase: percent >= 100 ? "queued" : "uploading",
          percent,
          message:
            percent >= 100
              ? "Upload complete. Waiting for backend bundle import..."
              : `Uploading ZIP bundle... ${percent}%`,
        },
      }));
    });
    await trackImportJob(queued.job_id, "bundle");
  };

  const validateImport = async (kind) => {
    const file = importFiles[kind];
    if (!file) return;
    setUploadProgress((prev) => ({
      ...prev,
      [kind]: {
        phase: "validating",
        percent: 0,
        message: "Uploading file for validation...",
      },
    }));
    const result = await leanAPI.validateCsv(kind, file, (percent) => {
      setUploadProgress((prev) => ({
        ...prev,
        [kind]: {
          phase: percent >= 100 ? "processing" : "validating",
          percent,
          message:
            percent >= 100
              ? "Computing validation score..."
              : `Validating file... ${percent}%`,
        },
      }));
    });
    setValidationResults((prev) => ({ ...prev, [kind]: result }));
    setUploadProgress((prev) => ({
      ...prev,
      [kind]: {
        phase: "validated",
        percent: 100,
        message: "Validation complete.",
      },
    }));
  };

  const refreshExecutivePacket = async () => {
    const packet = await leanAPI.getExecutivePacket("monthly");
    setExecutivePacket(packet || null);
  };

  const createMapping = async () => {
    if (
      !selectedConnectionId ||
      !mappingForm.source_field.trim() ||
      !mappingForm.canonical_field.trim()
    )
      return;
    await leanAPI.createFieldMapping(selectedConnectionId, {
      source_field: mappingForm.source_field.trim(),
      canonical_field: mappingForm.canonical_field.trim(),
      transform_rule: mappingForm.transform_rule.trim() || null,
      required: mappingForm.required,
    });
    setMappingForm({
      source_field: "",
      canonical_field: "",
      transform_rule: "",
      required: true,
    });
    const [mapData, jobData] = await Promise.all([
      leanAPI.listFieldMappings(selectedConnectionId),
      leanAPI.listSyncJobs(selectedConnectionId),
    ]);
    setFieldMappings(mapData || []);
    setSyncJobs(jobData || []);
  };

  const onSelectConnection = async (connId) => {
    setSelectedConnectionId(connId);
    setLoading(true);
    try {
      const [mapData, jobData] = await Promise.all([
        leanAPI.listFieldMappings(connId),
        leanAPI.listSyncJobs(connId),
      ]);
      setFieldMappings(mapData || []);
      setSyncJobs(jobData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper status color styling methods
  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (
      [
        "active",
        "compliant",
        "improved",
        "approved",
        "completed",
        "success",
        "prod",
      ].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
          {status}
        </span>
      );
    }
    if (
      [
        "draft",
        "neutral",
        "paused",
        "in_review",
        "pending",
        "stage",
        "dev",
      ].includes(s)
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />{" "}
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const p = String(priority || "").toLowerCase();
    if (p === "critical" || p === "high") {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-extrabold uppercase tracking-widest">
          {priority}
        </span>
      );
    }
    if (p === "medium") {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-widest">
          {priority}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-extrabold uppercase tracking-widest">
        {priority}
      </span>
    );
  };

  return (
    <div className="w-full pb-20 text-slate-100 antialiased selection:bg-cyan-500/30">
      {/* Header Panel */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6 text-left">
        <div className="flex-1 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">
              <Database size={12} className="animate-pulse" /> Core Infrastructure
              & ML Ops
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display">
              Enterprise Operations
            </h1>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-3xl">
              Pipeline connectors, automated data validation, explainable
              attrition risks, and real-time model compliance.
            </p>
          </div>
          <UserManualButton defaultTab="dataops" className="ml-4 mt-6" />
        </div>
        <button
          onClick={() => loadAll()}
          disabled={loading}
          className="h-10 px-4 self-start lg:self-center rounded-xl border border-white/10 hover:bg-white/5 bg-white/[0.02] text-xs font-semibold inline-flex items-center gap-2 transition-all active:scale-95 text-slate-200 hover:text-white hover:border-cyan-400/30"
        >
          <RefreshCw
            size={14}
            className={
              loading ? "animate-spin text-cyan-400" : "text-slate-400"
            }
          />
          {loading ? "Syncing Workspace..." : "Refresh Operations"}
        </button>
      </header>

      {/* Dynamic Business Guide */}
      <div className="premium-card p-5 border border-cyan-500/20 bg-cyan-500/5 mb-8 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 flex-shrink-0">
            <Link2 size={20} className="animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
              Enterprise Connections & Compliance Hub
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4 max-w-5xl">
              This dashboard manages the operational backbone and data pipelines
              of Aurelinx. It registers active integrations, monitors sync jobs,
              audits model fairness, retrains models, tracks SRE Disaster
              Recovery drills, and details corporate compliance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="font-extrabold text-[10px] text-cyan-400 uppercase tracking-wider mb-1">
                  1. Integration Connections
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  The data gateway. Register your Greenhouse ATS or Workday HRIS
                  systems. Use "Realtime Sync" or "Pipeline Sync" to pull fresh
                  employees and applications directly into your talent
                  dashboard.
                </p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="font-extrabold text-[10px] text-cyan-400 uppercase tracking-wider mb-1">
                  2. Intervention & Action Flows
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Turn predictive metrics into tangible actions. When our AI
                  flags an employee at risk of resigning, track the retention
                  efforts (interventions) here and log progress updates to
                  evaluate long-term success.
                </p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="font-extrabold text-[10px] text-cyan-400 uppercase tracking-wider mb-1">
                  3. Model Governance & Compliance
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Audit, retrain, and validate AI models. Monitor model
                  accuracy, fairness gaps, and feature drift, ensuring your
                  automated talent screening conforms to corporate standards and
                  regional HR policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Oversight Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Connections Stat */}
        <div className="premium-card p-4 flex items-center gap-4 relative overflow-hidden group hover:border-cyan-400/25 transition-all text-left">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <Link2 size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PIPELINES
            </div>
            <div className="text-lg font-black text-white flex items-baseline gap-1.5 mt-0.5">
              {connections.length}{" "}
              <span className="text-[10px] font-normal text-cyan-400">
                {connections.filter((c) => c.status === "active").length} active
              </span>
            </div>
          </div>
        </div>

        {/* Interventions Stat */}
        <div className="premium-card p-4 flex items-center gap-4 relative overflow-hidden group hover:border-amber-400/25 transition-all text-left">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              INTERVENTIONS
            </div>
            <div className="text-lg font-black text-white flex items-baseline gap-1.5 mt-0.5">
              {interventions.filter((i) => i.status === "in_progress").length}{" "}
              <span className="text-[10px] font-normal text-amber-400">
                / {interventions.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Model Integrity Stat */}
        <div className="premium-card p-4 flex items-center gap-4 relative overflow-hidden group hover:border-emerald-400/25 transition-all text-left">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Cpu size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              GOVERNANCE & BIAS
            </div>
            <div className="text-sm font-black text-white flex items-baseline gap-1 mt-0.5 uppercase truncate max-w-[150px]">
              {fairness
                ? fairness.compliant
                  ? "COMPLIANT"
                  : "ATTN REQUIRED"
                : "ACTIVE"}
              {fairness?.max_gap !== undefined && (
                <span className="text-[9px] font-normal text-emerald-400">
                  gap: {fairness.max_gap}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recovery Stat */}
        <div className="premium-card p-4 flex items-center gap-4 relative overflow-hidden group hover:border-rose-400/25 transition-all text-left">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              DR DRILL STATUS
            </div>
            <div className="text-sm font-black text-white flex items-baseline gap-1.5 mt-0.5">
              {drRunbooks.length} runbooks{" "}
              <span className="text-[10px] font-normal text-rose-400">
                {drillResult ? "DRILL COMPLETE" : "PENDING"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-px mb-8 overflow-x-auto scrollbar-none">
        {[
          {
            id: "pipelines",
            label: "Data Pipelines",
            icon: <Database size={14} />,
            desc: "Connections, CSV, mappings",
          },
          {
            id: "ai-gov",
            label: "AI & Governance",
            icon: <Cpu size={14} />,
            desc: "Fairness, cards, release gates",
          },
          {
            id: "workflows",
            label: "Risk & Interventions",
            icon: <BriefcaseBusiness size={14} />,
            desc: "Outcomes, explainable attrition",
          },
          {
            id: "compliance",
            label: "Compliance & Audit",
            icon: <Shield size={14} />,
            desc: "DR, policies, packets, trail",
          },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-4 border-b-2 font-semibold text-xs uppercase tracking-wider transition-all whitespace-nowrap relative ${
                active
                  ? "border-cyan-400 text-cyan-400 bg-cyan-500/[0.02]"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]"
              }`}
            >
              {tab.icon}
              <div className="text-left">
                <div className="font-extrabold">{tab.label}</div>
              </div>
              {active && (
                <div className="absolute inset-x-0 bottom-0 h-px bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Panes */}
      <div className="text-left">
        {/* TAB 1: DATA PIPELINES */}
        {activeTab === "pipelines" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Connections & Field Mappings Forms */}
            <div className="lg:col-span-1 space-y-8">
              {/* Integration Form Card */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40 relative">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <Link2 size={16} className="text-cyan-400" />
                  <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                    Register Connection
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Connection Name
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="e.g. Workday HRIS"
                      value={connForm.name}
                      onChange={(e) =>
                        setConnForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Provider
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="workday / greenhouse / etc."
                      value={connForm.provider}
                      onChange={(e) =>
                        setConnForm((p) => ({ ...p, provider: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Source Type
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none cursor-pointer"
                        value={connForm.source_type}
                        onChange={(e) =>
                          setConnForm((p) => ({
                            ...p,
                            source_type: e.target.value,
                          }))
                        }
                      >
                        <option value="hris">HRIS</option>
                        <option value="ats">ATS</option>
                        <option value="engagement">Engagement</option>
                        <option value="productivity">Productivity</option>
                        <option value="finance">Finance</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Status
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none cursor-pointer"
                        value={connForm.status}
                        onChange={(e) =>
                          setConnForm((p) => ({ ...p, status: e.target.value }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Base URL (optional)
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="https://api.workday.com/v1"
                      value={connForm.base_url}
                      onChange={(e) =>
                        setConnForm((p) => ({ ...p, base_url: e.target.value }))
                      }
                    />
                  </div>
                  <button
                    onClick={createConnection}
                    className="w-full h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/25 hover:text-white transition-all text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={14} /> Add Connection
                  </button>
                </div>
              </section>

              {/* Field Mappings Form Card */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Field Mapping
                    </h2>
                  </div>
                  {selectedConnectionId && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-wider">
                      Selected ID: {selectedConnectionId}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Source Column
                      </label>
                      <input
                        type="text"
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                        placeholder="e.g. emp_id"
                        value={mappingForm.source_field}
                        onChange={(e) =>
                          setMappingForm((p) => ({
                            ...p,
                            source_field: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Canonical Field
                      </label>
                      <input
                        type="text"
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                        placeholder="e.g. external_id"
                        value={mappingForm.canonical_field}
                        onChange={(e) =>
                          setMappingForm((p) => ({
                            ...p,
                            canonical_field: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Transform Rule (optional)
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="e.g. str_to_lower"
                      value={mappingForm.transform_rule}
                      onChange={(e) =>
                        setMappingForm((p) => ({
                          ...p,
                          transform_rule: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
                    <input
                      type="checkbox"
                      id="mapping-req"
                      className="h-4 w-4 rounded border-white/10 bg-slate-950 text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      checked={mappingForm.required}
                      onChange={(e) =>
                        setMappingForm((p) => ({
                          ...p,
                          required: e.target.checked,
                        }))
                      }
                    />
                    <label
                      htmlFor="mapping-req"
                      className="text-xs font-medium text-slate-300 cursor-pointer select-none"
                    >
                      Mark as required mapping
                    </label>
                  </div>
                  <button
                    onClick={createMapping}
                    disabled={!selectedConnectionId}
                    className="w-full h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 active:scale-95"
                  >
                    Add Field Mapping
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Connection Registry list, CSV Imports, Data Contracts, Sync Logs */}
            <div className="lg:col-span-2 space-y-8">
              {/* Connections Active Registry */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Connections Active Registry
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    Total Pipeline Sources: {connections.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {connections.map((c) => {
                    const isSelected = selectedConnectionId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => onSelectConnection(c.id)}
                        className={`rounded-xl border p-4 bg-slate-950/20 transition-all cursor-pointer group relative ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/[0.02]"
                            : "border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                                {c.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-semibold text-slate-300 uppercase">
                                {c.source_type}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-semibold text-slate-300 uppercase">
                                {c.provider}
                              </span>
                            </div>
                            {c.base_url && (
                              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                {c.base_url}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(c.status)}
                          </div>
                        </div>

                        {syncState[c.id] && (
                          <div className="mt-3 bg-cyan-950/20 border border-cyan-400/20 rounded-lg p-2.5 text-xs text-cyan-300 relative overflow-hidden">
                            <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                              <span>Phase: {syncState[c.id].phase}</span>
                              <span>{syncState[c.id].progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-cyan-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 transition-all duration-300"
                                style={{
                                  width: `${syncState[c.id].progress}%`,
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-cyan-400/70 mt-1 leading-normal">
                              {syncState[c.id].message}
                            </div>
                          </div>
                        )}

                        <div
                          className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap gap-2 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="px-3 h-8 rounded-lg border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1.5 transition-all"
                            onClick={() => triggerSync(c.id)}
                          >
                            <Play size={10} className="text-cyan-400" />{" "}
                            Realtime Sync
                          </button>
                          <button
                            className="px-3 h-8 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[10px] font-bold uppercase tracking-wider text-cyan-400 inline-flex items-center gap-1.5 transition-all"
                            onClick={() => runLeanSync(c.id)}
                          >
                            <Zap size={10} /> Pipeline Sync
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!connections.length && !loading && (
                    <div className="text-center py-8 rounded-xl border border-white/5 border-dashed bg-white/[0.01]">
                      <HelpCircle
                        size={24}
                        className="mx-auto text-slate-600 mb-2"
                      />
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        No connections registered
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Fill out the credentials form to add HRIS data pipe.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Data File Hub / Imports */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Local Data Import Hub
                    </h2>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 mb-6 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between relative z-10">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Upload size={11} className="text-cyan-400" /> CSV or
                        ZIP Import
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5 max-w-xl">
                        Upload individual CSVs directly into Postgres, or use a
                        single ZIP bundle to load the full dataset in one pass.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                      <div className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2">
                        Employees:{" "}
                        <strong className="text-slate-100">
                          {dataSummary?.employees ?? 0}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2">
                        Candidates:{" "}
                        <strong className="text-slate-100">
                          {dataSummary?.candidates ?? 0}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2">
                        Skills:{" "}
                        <strong className="text-slate-100">
                          {dataSummary?.skills ?? 0}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2">
                        Experience:{" "}
                        <strong className="text-slate-100">
                          {dataSummary?.experience ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual CSV Uploads */}
                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5 pb-2">
                    Upload Individual CSV Schemas
                  </div>

                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Upload size={11} className="text-cyan-400" /> ZIP
                          Bundle Import
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5 max-w-xl">
                          Upload a single `aurelinx-dataset-bundle.zip` to load
                          employees, candidates, skills, and experience in one
                          pass.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".zip"
                          id="dataset-bundle-file"
                          className="hidden"
                          onChange={(e) =>
                            setImportFiles((p) => ({
                              ...p,
                              bundle: e.target.files?.[0] || null,
                            }))
                          }
                        />
                        <label
                          htmlFor="dataset-bundle-file"
                          className="h-8 px-3 rounded-lg border border-dashed border-cyan-400/30 bg-slate-950/40 text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all hover:border-cyan-400/60"
                        >
                          <span className="truncate max-w-[180px]">
                            {importFiles.bundle
                              ? importFiles.bundle.name
                              : "Select ZIP Bundle"}
                          </span>
                          <FileSpreadsheet
                            size={10}
                            className="text-cyan-400"
                          />
                        </label>
                        <button
                          onClick={uploadBundleImport}
                          disabled={!importFiles.bundle}
                          className="h-8 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[10px] font-bold text-cyan-400 uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 inline-flex items-center gap-1.5"
                        >
                          Upload ZIP
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                      Required inside the ZIP:
                      <span className="text-slate-300">
                        {" "}
                        `employees_public.csv`, `candidates_public.csv`,
                        `employee_skills_public.csv`,
                        `candidate_skills_public.csv`,
                        `employee_experience_public.csv`,
                        `candidate_experience_public.csv`
                      </span>
                    </div>
                    {uploadProgress.bundle?.message && (
                      <div className="mt-3 rounded-lg bg-cyan-950/20 border border-cyan-400/20 p-2 font-mono text-[9px]">
                        <div className="flex items-center justify-between text-cyan-300 font-bold mb-1">
                          <span>
                            {uploadProgress.bundle.phase.toUpperCase()}
                          </span>
                          <span>{uploadProgress.bundle.percent}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-cyan-950 overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-300"
                            style={{
                              width: `${uploadProgress.bundle.percent}%`,
                            }}
                          />
                        </div>
                        <div className="text-[9px] text-cyan-400/70 mt-1">
                          {uploadProgress.bundle.message}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ["employees", "Employees CSV", "employees_public.csv"],
                      ["candidates", "Candidates CSV", "candidates_public.csv"],
                      [
                        "employee_skills",
                        "Employee Skills CSV",
                        "employee_skills_public.csv",
                      ],
                      [
                        "candidate_skills",
                        "Candidate Skills CSV",
                        "candidate_skills_public.csv",
                      ],
                      [
                        "employee_experience",
                        "Employee Experience CSV",
                        "employee_experience_public.csv",
                      ],
                      [
                        "candidate_experience",
                        "Candidate Experience CSV",
                        "candidate_experience_public.csv",
                      ],
                    ].map(([key, label, filename]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/5 bg-slate-950/15 p-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs">
                              {label}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">
                              {filename}
                            </span>
                          </div>

                          <input
                            type="file"
                            accept=".csv"
                            id={`csv-file-${key}`}
                            className="hidden"
                            onChange={(e) =>
                              setImportFiles((p) => ({
                                ...p,
                                [key]: e.target.files?.[0] || null,
                              }))
                            }
                          />
                          <label
                            htmlFor={`csv-file-${key}`}
                            className="w-full mt-2.5 h-8 px-3 rounded-lg border border-dashed border-white/10 hover:border-cyan-400/30 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all"
                          >
                            <span className="truncate max-w-[150px]">
                              {importFiles[key]
                                ? importFiles[key].name
                                : "Select Schema CSV"}
                            </span>
                            <FileSpreadsheet
                              size={10}
                              className="text-slate-500"
                            />
                          </label>
                        </div>

                        {validationResults[key] && (
                          <div className="mt-3 rounded-lg border border-white/5 bg-black/35 p-2 font-mono text-[10px] text-slate-300">
                            <div className="flex items-center justify-between text-cyan-400 font-extrabold uppercase text-[9px] mb-1">
                              <span>Quality Rating</span>
                              <span>
                                {Math.round(
                                  (validationResults[key].metrics
                                    ?.quality_score || 0) * 100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-slate-500 text-[9px]">
                              <div>
                                Rows:{" "}
                                {validationResults[key].metrics?.total_rows ??
                                  0}
                              </div>
                              <div>
                                Miss:{" "}
                                {validationResults[key].metrics
                                  ?.missing_required_rows ?? 0}
                              </div>
                              <div>
                                Dupes:{" "}
                                {validationResults[key].metrics
                                  ?.duplicate_rows ?? 0}
                              </div>
                            </div>
                          </div>
                        )}

                        {uploadProgress[key]?.message && (
                          <div className="mt-3 rounded-lg bg-cyan-950/20 border border-cyan-400/20 p-2 font-mono text-[9px]">
                            <div className="flex items-center justify-between text-cyan-300 font-bold mb-1">
                              <span>
                                {uploadProgress[key].phase.toUpperCase()}
                              </span>
                              <span>{uploadProgress[key].percent}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-cyan-950 overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 transition-all duration-300"
                                style={{
                                  width: `${uploadProgress[key].percent}%`,
                                }}
                              />
                            </div>
                            <div className="text-[9px] text-cyan-400/70 mt-1">
                              {uploadProgress[key].message}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-white/5 flex gap-2 justify-end">
                          <button
                            onClick={() => validateImport(key)}
                            disabled={!importFiles[key]}
                            className="h-7 px-2.5 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                          >
                            Validate
                          </button>
                          <button
                            onClick={() => uploadImport(key)}
                            disabled={!importFiles[key]}
                            className="h-7 px-2.5 rounded-lg border border-white/10 hover:bg-white/10 text-[9px] font-bold text-slate-300 uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                          >
                            Upload CSV
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Current Counts:</span>
                  <span>
                    Employees:{" "}
                    <strong className="text-slate-200">
                      {dataSummary?.employees ?? 0}
                    </strong>{" "}
                    | Candidates:{" "}
                    <strong className="text-slate-200">
                      {dataSummary?.candidates ?? 0}
                    </strong>{" "}
                    | Skills:{" "}
                    <strong className="text-slate-200">
                      {dataSummary?.skills ?? 0}
                    </strong>{" "}
                    | Experience:{" "}
                    <strong className="text-slate-200">
                      {dataSummary?.experience ?? 0}
                    </strong>
                  </span>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Field Mappings Registry */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-cyan-400" />
                      <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                        Field Mappings Registry
                      </h2>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {fieldMappings.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs flex justify-between items-center gap-3"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="font-mono text-cyan-400">
                              {m.source_field}
                            </span>
                            <ArrowRight size={10} className="text-slate-500" />
                            <span className="font-mono text-emerald-400">
                              {m.canonical_field}
                            </span>
                          </div>
                          {m.transform_rule && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Transform: {m.transform_rule}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            m.required
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                          }`}
                        >
                          {m.required ? "required" : "optional"}
                        </span>
                      </div>
                    ))}
                    {!fieldMappings.length && (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No active mappings defined.
                      </div>
                    )}
                  </div>
                </section>

                {/* Sync Jobs Queue */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-cyan-400" />
                      <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                        Pipeline Jobs
                      </h2>
                    </div>
                    <button
                      onClick={async () => {
                        if (!selectedConnectionId) return;
                        const jobs =
                          await leanAPI.listSyncJobs(selectedConnectionId);
                        setSyncJobs(jobs || []);
                      }}
                      disabled={!selectedConnectionId}
                      className="px-2 py-1 rounded border border-white/10 hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider disabled:opacity-40"
                    >
                      Reload
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {syncJobs.map((j) => (
                      <div
                        key={j.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold uppercase text-[10px] text-slate-300">
                            {j.provider} pipeline
                          </span>
                          {getStatusBadge(j.status)}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-500 font-mono">
                          <div>
                            Bronze:{" "}
                            <span className="text-amber-400 font-bold">
                              {j.bronze_events}
                            </span>
                          </div>
                          <div>
                            Silver:{" "}
                            <span className="text-emerald-400 font-bold">
                              {j.silver_upserts}
                            </span>
                          </div>
                          <div>
                            Quarantine:{" "}
                            <span className="text-rose-400 font-bold">
                              {j.quarantined}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!syncJobs.length && (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No historical sync logs.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Data Contracts */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-cyan-400" />
                      <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                        Lean Data Contracts
                      </h2>
                    </div>
                    <button
                      onClick={createContract}
                      className="px-2 py-1 rounded border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider"
                    >
                      Create
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <select
                      className="h-8 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs"
                      value={contractForm.source_type}
                      onChange={(e) =>
                        setContractForm((p) => ({
                          ...p,
                          source_type: e.target.value,
                        }))
                      }
                    >
                      <option value="hris">HRIS</option>
                      <option value="ats">ATS</option>
                    </select>
                    <input
                      className="h-8 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs"
                      placeholder="workday / greenhouse"
                      value={contractForm.provider}
                      onChange={(e) =>
                        setContractForm((p) => ({
                          ...p,
                          provider: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="h-8 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs col-span-2"
                      placeholder="Required fields (comma sep)"
                      value={contractForm.required_fields}
                      onChange={(e) =>
                        setContractForm((p) => ({
                          ...p,
                          required_fields: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {contracts.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-2 text-xs"
                      >
                        <div className="font-bold text-slate-200 uppercase text-[10px]">
                          {c.provider} ({c.source_type})
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5 max-w-[300px] truncate">
                          {(c.required_fields || []).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Quarantine Queue */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-cyan-400" />
                      <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                        Quarantine Queue
                      </h2>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-extrabold uppercase">
                      Attention Required
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {quarantine.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-lg border border-amber-300/20 bg-amber-500/5 p-2.5 text-xs text-left"
                      >
                        <div className="font-bold text-slate-200 flex items-center justify-between">
                          <span>{q.provider.toUpperCase()}</span>
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded uppercase">
                            {q.source_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono mt-1 leading-normal">
                          {q.reason}
                        </div>
                      </div>
                    ))}
                    {!quarantine.length && (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        <CheckCircle2
                          size={20}
                          className="mx-auto text-emerald-500 mb-2"
                        />
                        Quarantine queue is empty.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI & MODEL GOVERNANCE */}
        {activeTab === "ai-gov" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Governance model lists, active MLOps */}
            <div className="lg:col-span-1 space-y-8">
              {/* Model Cards Registry */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Model Governance Cards
                    </h2>
                  </div>
                  <button
                    onClick={retrainModel}
                    className="h-7 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all"
                  >
                    Retrain
                  </button>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {modelCards.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-white/5 bg-slate-950/20 p-3.5 text-xs text-left"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-100">
                          {m.model_name} {m.version}
                        </span>
                        {getStatusBadge(m.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-slate-950/40 p-2 rounded-lg font-mono text-[9px] text-slate-400 my-2">
                        <div>
                          AUC:{" "}
                          <span className="text-cyan-400 font-extrabold">
                            {m.pr_auc}
                          </span>
                        </div>
                        <div>
                          Cal:{" "}
                          <span className="text-cyan-400 font-extrabold">
                            {m.calibration_error}
                          </span>
                        </div>
                        <div>
                          Gap:{" "}
                          <span className="text-cyan-400 font-extrabold">
                            {m.fairness_gap}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-3">
                        <button
                          onClick={() => approveModelCard(m.id)}
                          className="px-2 py-1 rounded bg-slate-950 border border-white/10 hover:border-cyan-400/30 text-[9px] text-slate-300 font-bold uppercase transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => promoteModelCard(m.id)}
                          className="px-2 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-[9px] text-slate-950 font-extrabold uppercase transition-all"
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => rollbackModelCard(m.id)}
                          className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-[9px] text-rose-400 font-bold uppercase transition-all"
                        >
                          Rollback
                        </button>
                      </div>
                    </div>
                  ))}
                  {!modelCards.length && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No model governance cards registered.
                    </div>
                  )}
                </div>
              </section>

              {/* Model Drift Snapshots */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <BarChart3 size={16} className="text-cyan-400" />
                  <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                    Model Drift Snapshots
                  </h2>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {drifts.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-white/5 bg-slate-950/20 p-3 text-xs text-left"
                    >
                      <div className="font-bold text-slate-200 mb-1">
                        {d.model_name} ({d.model_version})
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Drift Factor Score:</span>
                        <span
                          className={
                            d.needs_retraining
                              ? "text-rose-400 font-extrabold"
                              : "text-cyan-400 font-bold"
                          }
                        >
                          {(d.drift_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all duration-350 ${d.needs_retraining ? "bg-rose-400" : "bg-cyan-400"}`}
                          style={{ width: `${d.drift_score * 100}%` }}
                        />
                      </div>
                      {d.needs_retraining && (
                        <div className="mt-2.5 px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertTriangle size={10} /> Retraining Recommended
                        </div>
                      )}
                    </div>
                  ))}
                  {!drifts.length && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No active drift signals detected.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Fairness, Release Gates, MLOps registry */}
            <div className="lg:col-span-2 space-y-8">
              {/* Fairness & Release Gates */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Fairness & Demographics Gap Audit
                    </h2>
                  </div>
                  <div className="text-xs">
                    Compliance status:{" "}
                    <strong className="text-cyan-400 uppercase">
                      {fairness
                        ? fairness.compliant
                          ? "compliant"
                          : "attention required"
                        : "n/a"}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Fairness groups */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                      Statistical Subgroups Analysis
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {(fairness?.groups || []).map((g) => (
                        <div
                          key={g.group}
                          className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs text-left"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white text-[11px]">
                              {g.group}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">
                              Count: {g.count}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-mono">
                            <div>
                              Risk Rate:{" "}
                              <span className="text-slate-200 font-bold">
                                {g.at_risk_rate}
                              </span>
                            </div>
                            <div>
                              Ref Gap:{" "}
                              <span
                                className={
                                  Math.abs(g.gap_from_reference) > 0.05
                                    ? "text-rose-400 font-bold"
                                    : "text-emerald-400 font-bold"
                                }
                              >
                                {g.gap_from_reference}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Release gates */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                      Compliance Release Gates
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {releaseGates.map((g) => (
                        <div
                          key={g.id}
                          className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs text-left"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-bold text-slate-200">
                                {g.artifact_name}
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                Version: {g.version} | Env: {g.environment}
                              </span>
                            </div>
                            {getStatusBadge(g.status)}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono mt-1 max-w-[280px] truncate">
                            Checks: {(g.required_checks || []).join(", ")}
                          </div>
                          {g.status === "pending" && (
                            <button
                              onClick={() => approveReleaseGate(g.id)}
                              className="w-full mt-2 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-[9px] text-slate-950 font-extrabold uppercase tracking-wider transition-all"
                            >
                              Approve Release Gate
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ML Ops Registry & CFO Lab Pre-run */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Lean ML Ops Deployment Center
                    </h2>
                  </div>
                  <button
                    onClick={trainAndScore}
                    className="h-8 px-4 rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 text-[10px] font-extrabold uppercase tracking-wider transition-all"
                  >
                    Train & Score Engine
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Models list */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                      Algorithmic Models ({models.length})
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {models.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs text-left"
                        >
                          <div className="font-bold text-slate-200">
                            {m.model_name} ({m.version})
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                            <span>Status: {m.status}</span>
                            <span>
                              Risk Rate:{" "}
                              <strong className="text-slate-300">
                                {m.metrics?.risk_rate ?? 0}
                              </strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scored employees Top risk preview */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                      High-Risk Scoring Output (Top preview)
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {modelTop.map((r) => (
                        <div
                          key={r.employee_id}
                          className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-2 text-xs flex justify-between items-center text-left"
                        >
                          <div>
                            <span className="font-bold text-slate-200">
                              {r.full_name}
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              ID: {r.employee_id}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/20">
                            Risk: {(r.risk_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                      {!modelTop.length && (
                        <div className="text-center py-6 text-slate-600 text-xs">
                          Run 'Train & Score' to generate risk predictions.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 3: WORKFLOWS & RISK */}
        {activeTab === "workflows" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Create Intervention & CFO Scenario Lab */}
            <div className="lg:col-span-1 space-y-8">
              {/* Create Intervention */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <BriefcaseBusiness size={16} className="text-cyan-400" />
                  <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                    Create Intervention
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Intervention Title
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="e.g. Salary Adjust & Career Mapping"
                      value={intForm.title}
                      onChange={(e) =>
                        setIntForm((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Target Scope
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none cursor-pointer"
                        value={intForm.target_scope}
                        onChange={(e) =>
                          setIntForm((p) => ({
                            ...p,
                            target_scope: e.target.value,
                          }))
                        }
                      >
                        <option value="employee">Employee</option>
                        <option value="team">Team</option>
                        <option value="department">Department</option>
                        <option value="org">Organization</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Priority
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none cursor-pointer"
                        value={intForm.priority}
                        onChange={(e) =>
                          setIntForm((p) => ({
                            ...p,
                            priority: e.target.value,
                          }))
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        Department
                      </label>
                      <input
                        type="text"
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                        placeholder="e.g. Engineering"
                        value={intForm.target_department}
                        onChange={(e) =>
                          setIntForm((p) => ({
                            ...p,
                            target_department: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                        HRBP Owner
                      </label>
                      <input
                        type="text"
                        className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                        placeholder="Owner name"
                        value={intForm.owner_name}
                        onChange={(e) =>
                          setIntForm((p) => ({
                            ...p,
                            owner_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Expected Impact Metrics
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950/50 border border-white/10 text-slate-200 placeholder:text-slate-600 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none"
                      placeholder="e.g. Retain high-risk senior talent for 6+ months"
                      value={intForm.expected_impact}
                      onChange={(e) =>
                        setIntForm((p) => ({
                          ...p,
                          expected_impact: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    onClick={createIntervention}
                    className="w-full h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/25 hover:text-white transition-all text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={14} /> Add Active Intervention
                  </button>
                </div>
              </section>

              {/* CFO Scenario Lab */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      CFO Scenario Lab
                    </h2>
                  </div>
                  <button
                    onClick={runScenario}
                    className="h-7 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all"
                  >
                    Run Scenario
                  </button>
                </div>

                {scenarioResult ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-slate-950/50 border border-white/5 p-3 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-sans font-bold">
                        Input Constrained Budget
                      </div>
                      <div className="flex justify-between items-center mb-1 text-slate-300">
                        <span>Max Cap:</span>
                        <span className="text-white font-bold">
                          $
                          {scenarioResult.input?.budget_cap?.toLocaleString() ||
                            scenarioResult.input_payload?.budget_cap?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Min Hires:</span>
                        <span>{scenarioResult.input?.target_hires || 20}</span>
                      </div>
                    </div>

                    <div className="bg-cyan-950/20 border border-cyan-400/20 p-3 rounded-xl">
                      <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-sans font-bold">
                        Optimal CFO Recommendation
                      </div>
                      <div className="flex justify-between items-center mb-1 text-slate-200">
                        <span>Retention Actions:</span>
                        <span className="text-white font-bold">
                          {scenarioResult.recommendation?.retention_actions ||
                            scenarioResult.output_payload?.retention_actions}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1 text-slate-200">
                        <span>Hiring Actions:</span>
                        <span className="text-white font-bold">
                          {scenarioResult.recommendation?.hiring_actions ||
                            scenarioResult.output_payload?.hiring_actions}
                        </span>
                      </div>
                      <div className="h-px bg-cyan-400/20 my-2" />
                      <div className="flex justify-between items-center mb-1 text-cyan-300">
                        <span>Used budget:</span>
                        <span className="font-bold">
                          $
                          {scenarioResult.recommendation?.used_budget?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-cyan-400">
                        <span>Remaining budget:</span>
                        <span className="font-bold">
                          $
                          {scenarioResult.recommendation?.remaining_budget?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <HelpCircle
                      size={20}
                      className="mx-auto text-slate-600 mb-2"
                    />
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      No Scenario Computed
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Click 'Run Scenario' to process budget allocation limits.
                    </p>
                  </div>
                )}

                {/* Historical Scenarios Log */}
                {scenarios.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Historical Scenarios ({scenarios.length})
                    </div>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {scenarios.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg bg-slate-950/30 border border-white/5 p-2 text-[10px] font-mono text-slate-400"
                        >
                          <div className="font-sans font-bold text-slate-200 text-xs">
                            {s.scenario_name}
                          </div>
                          <div className="mt-0.5">
                            Budget:{" "}
                            <span className="text-cyan-400 font-bold">
                              ${s.input_payload?.budget_cap?.toLocaleString() || s.budget_cap?.toLocaleString()}
                            </span>{" "}
                            | Hires:{" "}
                            <span className="text-slate-300 font-bold">
                              {s.input_payload?.target_hires ?? s.target_hires}
                            </span>{" "}
                            | Retain:{" "}
                            <span className="text-slate-300 font-bold">
                              {s.input_payload?.target_retentions ?? s.target_retentions}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Interventions queue, attrition explain list */}
            <div className="lg:col-span-2 space-y-8">
              {/* Active Interventions Workflow */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Active Interventions Workflow
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    Active Interventions: {interventions.length}
                  </span>
                </div>

                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {interventions.map((i) => (
                    <div
                      key={i.id}
                      className="rounded-xl border border-white/5 bg-slate-950/20 p-4 text-xs text-left relative overflow-hidden group hover:border-white/10 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {i.title}
                            </span>
                            {getPriorityBadge(i.priority)}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono uppercase block mt-0.5">
                            Scope: {i.target_scope}{" "}
                            {i.target_department &&
                              `| Dept: ${i.target_department}`}{" "}
                            {i.owner_name && `| Owner: ${i.owner_name}`}
                          </span>
                        </div>
                        {getStatusBadge(i.status)}
                      </div>

                      {i.expected_impact && (
                        <div className="text-slate-400 leading-normal text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-white/5 my-3">
                          <strong className="text-slate-200">
                            Impact Metric:
                          </strong>{" "}
                          {i.expected_impact}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 justify-end pt-2.5 border-t border-white/5">
                        <button
                          className="h-8 px-3 rounded-lg border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1 transition-all active:scale-95"
                          onClick={() =>
                            setInterventionStatus(i.id, "in_progress")
                          }
                        >
                          Start
                        </button>
                        <button
                          className="h-8 px-3 rounded-lg border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1 transition-all active:scale-95"
                          onClick={() =>
                            setInterventionStatus(i.id, "completed")
                          }
                        >
                          Complete
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-1 align-middle self-center" />
                        <button
                          className="h-8 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all text-[10px] font-extrabold uppercase"
                          onClick={() => upsertOutcome(i.id, 30, "improved")}
                        >
                          30d Improve
                        </button>
                        <button
                          className="h-8 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/25 transition-all text-[10px] font-extrabold uppercase"
                          onClick={() => upsertOutcome(i.id, 60, "neutral")}
                        >
                          60d Equal
                        </button>
                        <button
                          className="h-8 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/25 transition-all text-[10px] font-extrabold uppercase"
                          onClick={() => upsertOutcome(i.id, 90, "worsened")}
                        >
                          90d Degrade
                        </button>
                      </div>
                    </div>
                  ))}
                  {!interventions.length && (
                    <div className="text-center py-10 rounded-xl border border-white/5 border-dashed bg-white/[0.01]">
                      <HelpCircle
                        size={24}
                        className="mx-auto text-slate-600 mb-2"
                      />
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        No interventions tracked
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Add risk actions to track organizational retention.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Explainable Attrition Top 15 */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <ShieldAlert
                    size={16}
                    className="text-rose-400 animate-pulse"
                  />
                  <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                    Explainable Attrition Analysis (Highest Risks)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
                  {attrition.map((a) => (
                    <div
                      key={a.employee_id}
                      className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-xs text-left relative overflow-hidden group hover:border-rose-500/30 transition-all"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.03] blur-[30px] rounded-full pointer-events-none" />
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <span className="font-bold text-slate-200 text-sm">
                            {a.full_name}
                          </span>
                          <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                            {a.role} | {a.department}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            Risk: {(a.risk_probability * 100).toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-slate-500 block font-mono mt-1">
                            Conf: {(a.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 my-2.5" />

                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 font-sans">
                        Primary Algorithmic Drivers:
                      </div>
                      <ul className="space-y-1 text-[10px] text-slate-300 font-mono">
                        {(a.drivers || []).slice(0, 2).map((d, idx) => (
                          <li
                            key={`${a.employee_id}-${idx}`}
                            className="flex items-start gap-1"
                          >
                            <span className="text-rose-400 font-bold">•</span>
                            <span>
                              {d.factor}:{" "}
                              <strong className="text-slate-400">
                                {d.evidence}
                              </strong>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {!attrition.length && (
                    <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                      No attrition metrics computed yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLIANCE & SECURITY */}
        {activeTab === "compliance" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: SRE admin, compliance policy form, procurement artifacts form */}
            <div className="lg:col-span-1 space-y-8">
              {/* DR / SRE Admin recovery runbooks */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      DR / SRE Recoveries
                    </h2>
                  </div>
                  <button
                    onClick={createDrRunbook}
                    className="h-7 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all"
                  >
                    Create
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <input
                      className="w-full h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Runbook Name"
                      value={drForm.runbook_name}
                      onChange={(e) =>
                        setDrForm((p) => ({
                          ...p,
                          runbook_name: e.target.value,
                        }))
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs cursor-pointer"
                        value={drForm.environment}
                        onChange={(e) =>
                          setDrForm((p) => ({
                            ...p,
                            environment: e.target.value,
                          }))
                        }
                      >
                        <option value="dev">DEV</option>
                        <option value="stage">STAGE</option>
                        <option value="prod">PROD</option>
                      </select>
                      <select
                        className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs cursor-pointer"
                        value={drForm.status}
                        onChange={(e) =>
                          setDrForm((p) => ({ ...p, status: e.target.value }))
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                        type="number"
                        min="0"
                        placeholder="RTO (minutes)"
                        value={drForm.rto_minutes}
                        onChange={(e) =>
                          setDrForm((p) => ({
                            ...p,
                            rto_minutes: e.target.value,
                          }))
                        }
                      />
                      <input
                        className="h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                        type="number"
                        min="0"
                        placeholder="RPO (minutes)"
                        value={drForm.rpo_minutes}
                        onChange={(e) =>
                          setDrForm((p) => ({
                            ...p,
                            rpo_minutes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <input
                      className="w-full h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Notes (optional)"
                      value={drForm.notes}
                      onChange={(e) =>
                        setDrForm((p) => ({ ...p, notes: e.target.value }))
                      }
                    />
                  </div>

                  <div className="h-px bg-white/5" />

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {drRunbooks.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-3 text-xs text-left"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-bold text-slate-200">
                              {r.runbook_name}
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">
                              RTO: {r.rto_minutes}m | RPO: {r.rpo_minutes}m
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 items-end">
                            {getStatusBadge(r.environment)}
                            <button
                              onClick={() => drillRunbook(r.id)}
                              className="px-2 py-0.5 rounded border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] text-cyan-400 font-bold uppercase transition-all"
                            >
                              Run Drill
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {drillResult && (
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/5 p-3 text-xs text-left font-mono">
                      <div className="font-bold text-cyan-400 mb-1.5 uppercase font-sans text-[10px] tracking-wider">
                        Drill Recovery Logs
                      </div>
                      <div className="text-slate-300 text-[10px] leading-relaxed">
                        • Runbook:{" "}
                        <span className="text-white font-extrabold">
                          {drillResult.runbook_name ||
                            drillResult.name ||
                            "n/a"}
                        </span>
                        <br />• Status Result:{" "}
                        <span className="text-emerald-400 font-extrabold">
                          {drillResult.result ||
                            drillResult.status ||
                            "complete"}
                        </span>
                        <br />• Exec Time:{" "}
                        <span className="text-slate-400">
                          {drillResult.performed_at || "now"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Compliance policies creator */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Compliance Policies
                    </h2>
                  </div>
                  <button
                    onClick={createPolicy}
                    className="h-7 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all"
                  >
                    Create
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Policy Name"
                      value={policyForm.policy_name}
                      onChange={(e) =>
                        setPolicyForm((p) => ({
                          ...p,
                          policy_name: e.target.value,
                        }))
                      }
                    />
                    <select
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs cursor-pointer"
                      value={policyForm.action_type}
                      onChange={(e) =>
                        setPolicyForm((p) => ({
                          ...p,
                          action_type: e.target.value,
                        }))
                      }
                    >
                      <option value="intervention">Intervention</option>
                      <option value="export">Export</option>
                      <option value="sync">Sync</option>
                      <option value="recommendation">Recommendation</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Region (e.g. EU)"
                      value={policyForm.region}
                      onChange={(e) =>
                        setPolicyForm((p) => ({ ...p, region: e.target.value }))
                      }
                    />
                    <input
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Min Confidence"
                      type="number"
                      step="0.05"
                      value={policyForm.min_confidence}
                      onChange={(e) =>
                        setPolicyForm((p) => ({
                          ...p,
                          min_confidence: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <input
                    className="w-full h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                    placeholder="Blocked actions (comma sep)"
                    value={policyForm.blocked_actions}
                    onChange={(e) =>
                      setPolicyForm((p) => ({
                        ...p,
                        blocked_actions: e.target.value,
                      }))
                    }
                  />
                </div>
              </section>

              {/* Procurement Artifacts Form */}
              <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Procurement Artifacts
                    </h2>
                  </div>
                  <button
                    onClick={createProcurementArtifact}
                    className="h-7 px-3 rounded-lg border border-cyan-400/20 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 uppercase tracking-wider transition-all"
                  >
                    Create
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs cursor-pointer"
                      value={artifactForm.artifact_type}
                      onChange={(e) =>
                        setArtifactForm((p) => ({
                          ...p,
                          artifact_type: e.target.value,
                        }))
                      }
                    >
                      <option value="msa">MSA</option>
                      <option value="dpa">DPA</option>
                      <option value="sig">SIG</option>
                      <option value="caiq">CAIQ</option>
                      <option value="sla">SLA</option>
                      <option value="security_pack">Security Pack</option>
                    </select>
                    <select
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs cursor-pointer"
                      value={artifactForm.status}
                      onChange={(e) =>
                        setArtifactForm((p) => ({
                          ...p,
                          status: e.target.value,
                        }))
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <input
                    className="w-full h-9 px-3 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                    placeholder="Title"
                    value={artifactForm.title}
                    onChange={(e) =>
                      setArtifactForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Version (e.g. v1)"
                      value={artifactForm.version}
                      onChange={(e) =>
                        setArtifactForm((p) => ({
                          ...p,
                          version: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="h-9 px-2 rounded-lg bg-slate-950/50 border border-white/10 text-slate-300 text-xs outline-none"
                      placeholder="Notes"
                      value={artifactForm.notes}
                      onChange={(e) =>
                        setArtifactForm((p) => ({
                          ...p,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Compliance policies list, executive Monthly pack, procurement artifacts list, audit events */}
            <div className="lg:col-span-2 space-y-8">
              {/* Executive packet summary */}
              <section className="premium-card p-5 border border-white/5 relative overflow-hidden bg-gradient-to-br from-[#0f1f33]/70 to-[#07111f]/70">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/[0.02] blur-[30px] rounded-full pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      CHRO & CFO Executive Briefing Packet
                    </h2>
                  </div>
                  <button
                    onClick={refreshExecutivePacket}
                    className="h-8 px-4 rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 text-[10px] font-extrabold uppercase tracking-wider transition-all"
                  >
                    Refresh Packet
                  </button>
                </div>

                {executivePacket ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                    {/* workforce stats */}
                    <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-1.5">
                          Workforce Summary
                        </div>
                        <div className="font-bold mb-2 text-white text-sm leading-snug">
                          {executivePacket.headline}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 font-mono">
                        <div>
                          Staff:{" "}
                          <span className="text-white font-bold">
                            {executivePacket.summary?.workforce ?? 0}
                          </span>
                        </div>
                        <div>
                          Risks:{" "}
                          <span className="text-rose-400 font-bold">
                            {executivePacket.summary?.at_risk ?? 0}
                          </span>
                        </div>
                        <div>
                          Ratio:{" "}
                          <span className="text-amber-400 font-bold">
                            {executivePacket.summary?.risk_pct ?? 0}%
                          </span>
                        </div>
                      </div>
                      {executivePacket.summary?.top_risk_department && (
                        <div className="text-[10px] text-slate-500 mt-2 font-mono">
                          Top Impact Dept:{" "}
                          <span className="text-slate-300">
                            {executivePacket.summary.top_risk_department}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* actions recommended list */}
                    <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3.5">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-2">
                        Recommended HRBP Action Items
                      </div>
                      <ul className="space-y-1.5 text-slate-300 text-[11px] list-none">
                        {(executivePacket.actions || []).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span className="leading-snug">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* governance counts */}
                    <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3.5">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-2">
                        Governance & Security Assets
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase font-sans">
                            Policies
                          </div>
                          <div className="text-lg font-black text-cyan-400">
                            {
                              (executivePacket.governance?.policies || [])
                                .length
                            }
                          </div>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase font-sans">
                            Runbooks
                          </div>
                          <div className="text-lg font-black text-cyan-400">
                            {
                              (executivePacket.governance?.dr_runbooks || [])
                                .length
                            }
                          </div>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase font-sans">
                            Artifacts
                          </div>
                          <div className="text-lg font-black text-cyan-400">
                            {
                              (
                                executivePacket.governance
                                  ?.procurement_artifacts || []
                              ).length
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* risk drivers list */}
                    <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3.5">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold mb-2">
                        Top System Risk Drivers
                      </div>
                      <div className="space-y-1.5 max-h-[85px] overflow-y-auto font-mono text-[10px]">
                        {(executivePacket.risk_drivers || []).map((driver) => (
                          <div
                            key={driver.factor}
                            className="flex justify-between items-center text-slate-300"
                          >
                            <span>{driver.factor}</span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 text-[9px] font-bold">
                              {driver.count} impacted
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No monthly pack brief generated yet.
                  </div>
                )}
              </section>

              {/* Policies & procurement lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Policies List */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                    <Globe size={15} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Policies Registry
                    </h2>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {policies.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs text-left flex justify-between items-center gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-200">
                            {p.policy_name}
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                            Action: {p.action_type} | Conf: {p.min_confidence}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-extrabold uppercase font-mono">
                          {p.region}
                        </span>
                      </div>
                    ))}
                    {!policies.length && (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No policies registered.
                      </div>
                    )}
                  </div>
                </section>

                {/* Procurement Artifacts List */}
                <section className="premium-card p-5 border border-white/5 bg-slate-900/40">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                    <Lock size={15} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Compliance Artifacts
                    </h2>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {procurementArtifacts.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border border-white/5 bg-slate-950/20 p-2.5 text-xs text-left"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-200">
                            {a.title}
                          </span>
                          {getStatusBadge(a.status)}
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>Type: {a.artifact_type.toUpperCase()}</span>
                          <span>Version: {a.version}</span>
                        </div>
                        {a.notes && (
                          <div className="text-[9px] text-slate-500 mt-1 leading-normal italic">
                            Note: {a.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    {!procurementArtifacts.length && (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No artifacts registered.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Enterprise Audit Trail */}
              <section className="premium-card p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-cyan-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white">
                      Enterprise Audit Trail Log
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase tracking-widest font-mono">
                    Security Active
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {auditEvents.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-xs text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono"
                    >
                      <div>
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 mr-2">
                          {e.action}
                        </span>
                        <span className="text-slate-400">
                          Resource: {e.resource_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {e.created_at}
                      </span>
                    </div>
                  ))}
                  {!auditEvents.length && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No historical audit events logged.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseOpsView;
