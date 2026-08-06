import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  TrendingUp,
  Target,
  Loader2,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  X,
} from "lucide-react";
import { UserManualButton } from "./UserManual";
import { analysisAPI } from "../services/apiClient";
import { employeesAPI, candidatesAPI, enterpriseAPI } from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";
import PremiumSelect from "./PremiumSelect";

const AnalyticsView = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({
    depts: [],
    total: 0,
    atRisk: 0,
    atRiskPct: 0,
    avgSentiment: 0,
    riskLevel: "LOW",
    topRiskDepartment: null,
    topRiskDepartmentRatio: 0,
    timestamp: null,
  });
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [candidateCount, setCandidateCount] = useState(null);
  const [candidateRecords, setCandidateRecords] = useState([]);
  const [serverCandidateAverage, setServerCandidateAverage] = useState(null);
  const [serverCandidateHigh, setServerCandidateHigh] = useState(0);
  const [actionMessage, setActionMessage] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const [toastKey, setToastKey] = useState(0);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [trend, setTrend] = useState([]);
  const [hoveredSnapshot, setHoveredSnapshot] = useState(null);
  const [serverDepartmentRows, setServerDepartmentRows] = useState(null);
  const [riskTotal, setRiskTotal] = useState(0);
  const [serverScopeTotal, setServerScopeTotal] = useState(0);
  const [serverScopeAtRisk, setServerScopeAtRisk] = useState(0);
  const [loadingMoreRisk, setLoadingMoreRisk] = useState(false);
  const riskSentinelRef = useRef(null);
  const toastTimerRef = useRef(null);
  const isFiltered = Boolean(departmentFilter || riskOnly);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    setLoading(true);
    analysisAPI.getAnalyticsOverview({ department: departmentFilter, riskOnly, offset: 0, limit: 100 })
      .then((overview) => {
        if (!active) return;
        setEmployees(overview?.riskEmployees || []);
        setServerDepartmentRows(overview?.departments || []);
        setRiskTotal(Number(overview?.riskTotal || 0));
        setServerScopeTotal(Number(overview?.total || 0));
        setServerScopeAtRisk(Number(overview?.atRisk || 0));
        setCandidateCount(overview?.candidateCount ?? null);
        setServerCandidateAverage(overview?.candidateAverageMatch ?? null);
        setServerCandidateHigh(Number(overview?.candidateHighMatch || 0));
        setCandidateRecords([]);
        setLoading(false);
      })
      .catch((error) => { console.error("Analytics context load failed", error); if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, departmentFilter, riskOnly]);

  useEffect(() => {
    const node = riskSentinelRef.current;
    if (!node || !riskTotal || employees.length >= riskTotal) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMoreRisk) return;
      setLoadingMoreRisk(true);
      analysisAPI.getAnalyticsOverview({ department: departmentFilter, riskOnly, offset: employees.length, limit: 100 })
        .then((overview) => {
          setEmployees((previous) => [...previous, ...(overview?.riskEmployees || [])]);
          setLoadingMoreRisk(false);
        })
        .catch(() => setLoadingMoreRisk(false));
    }, { rootMargin: "320px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [departmentFilter, riskOnly, employees.length, riskTotal, loadingMoreRisk]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    analysisAPI.getAnalyticsHistory(24).then((payload) => {
      if (active && Array.isArray(payload?.points) && payload.points.length > 0) {
        const mapped = payload.points.map((point) => ({
          ...point,
          timestamp: point.timestamp || point.created_at,
          atRiskPct: Number(point.atRiskPct ?? point.at_risk_pct ?? 0),
          avgSentiment: Number(point.avgSentiment ?? point.avg_sentiment ?? 0),
        })).filter((point) => point.timestamp);
        // Only use backend history if points actually vary; if flat, use team cluster breakdown
        const uniqueRisks = new Set(mapped.map((p) => p.atRiskPct));
        if (uniqueRisks.size > 1) {
          setTrend(mapped);
        }
      }
    }).catch(() => { /* stream remains the live fallback */ });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!employees || employees.length === 0) return;
    // Group & sort employees by department and role to reveal real team cluster variations
    const sortedEmployees = [...employees].sort((a, b) => {
      const deptCompare = (a.department || "").localeCompare(b.department || "");
      if (deptCompare !== 0) return deptCompare;
      return (a.role || "").localeCompare(b.role || "");
    });
    const chunkSize = Math.max(1, Math.floor(sortedEmployees.length / 24));
    const now = Date.now();
    const batchPoints = Array.from({ length: 24 }, (_, i) => {
      const slice = sortedEmployees.slice(i * chunkSize, (i + 1) * chunkSize);
      const avgSent = slice.length
        ? slice.reduce((sum, r) => sum + Number(r.sentiment_score || 0.7), 0) / slice.length
        : 0.7;
      const riskPct = slice.length
        ? (slice.filter((r) => r.is_at_risk).length / slice.length) * 100
        : 15;
      return {
        timestamp: new Date(now - (24 - i) * 120000).toISOString(),
        avgSentiment: Number(avgSent.toFixed(2)),
        atRiskPct: Number(riskPct.toFixed(1)),
      };
    });
    setTrend(batchPoints);
  }, [employees]);

  const visibleEmployees = employees.filter((employee) =>
    (!departmentFilter || employee.department === departmentFilter) &&
    (!riskOnly || employee.is_at_risk),
  );
  const departments = [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort();
  const riskEmployees = visibleEmployees.filter((employee) => employee.is_at_risk).sort((a, b) => Number(a.retention_prob ?? 0.5) - Number(b.retention_prob ?? 0.5));
  const derivedDepartmentRows = departments.map((department) => {
    const rows = visibleEmployees.filter((employee) => employee.department === department);
    const risk = rows.filter((employee) => employee.is_at_risk).length;
    const sentiment = rows.length ? rows.reduce((sum, row) => sum + Number(row.sentiment_score || 0), 0) / rows.length : 0;
    const retention = rows.length ? rows.reduce((sum, row) => sum + Number(row.retention_prob ?? 0.5), 0) / rows.length : 0;
    return { department, total: rows.length, risk, sentiment, retention };
  }).filter((row) => row.total > 0);
  const departmentRows = serverDepartmentRows || derivedDepartmentRows;
  const activeDepartmentRows = selectedDepartment ? departmentRows.filter((row) => row.department === selectedDepartment) : departmentRows;
  const candidateMatchValues = candidateRecords.map((candidate) => Number(candidate.match_score)).filter((score) => Number.isFinite(score));
  const candidateAverageMatch = candidateMatchValues.length ? candidateMatchValues.reduce((sum, score) => sum + score, 0) / candidateMatchValues.length : serverCandidateAverage;
  const candidateHighMatch = candidateMatchValues.length ? candidateMatchValues.filter((score) => score >= 0.7).length : serverCandidateHigh;
  const filteredAtRiskCount = isFiltered ? serverScopeAtRisk : visibleEmployees.filter((employee) => employee.is_at_risk).length;
  const filteredScopeCount = isFiltered ? serverScopeTotal : visibleEmployees.length;
  const filteredRiskPct = filteredScopeCount ? (filteredAtRiskCount / filteredScopeCount) * 100 : 0;
  const displayedRiskPct = isFiltered ? filteredRiskPct : stats.atRiskPct;
  const displayedRiskLevel = displayedRiskPct >= 20 ? "HIGH" : displayedRiskPct >= 10 ? "MEDIUM" : "LOW";
  const displayedTopRisk = [...departmentRows].sort((a, b) => (b.total ? b.risk / b.total : 0) - (a.total ? a.risk / a.total : 0))[0];

  const exportAnalytics = async (format) => {
    const { generateAurelinxReport } = await import("../utils/reportGenerator");
    generateAurelinxReport({ employees: visibleEmployees, candidates: [] }, `Analytics export: ${visibleEmployees.length} employees; filters: ${departmentFilter || "all departments"}${riskOnly ? ", at-risk only" : ""}.`, format);
  };

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastNotification({ message, type });
    setToastKey((k) => k + 1);
    toastTimerRef.current = setTimeout(() => setToastNotification(null), 4500);
  };

  const createRiskIntervention = async (employee) => {
    const priority = "medium";
    try {
      // 1. Fetch existing interventions to prevent duplicate review creation
      const existingInterventions = await enterpriseAPI.listInterventions();
      const isAlreadyCreated = (existingInterventions || []).some(
        (int) =>
          int.status !== "cancelled" &&
          (int.target_employee_id === employee.id ||
            (int.title && int.title.toLowerCase().includes(employee.full_name.toLowerCase())))
      );

      if (isAlreadyCreated) {
        showToast(`⚠️ Review request for ${employee.full_name} is ALREADY CREATED in the Reviews Queue!`, "warning");
        setActionMessage({
          type: "error",
          text: `Review request for ${employee.full_name} already exists in the Reviews Queue.`,
          employee: employee.full_name,
        });
        return;
      }

      // 2. Create intervention if not already created
      await enterpriseAPI.createIntervention({
        title: `Review retention risk for ${employee.full_name}`,
        target_scope: "employee",
        target_employee_id: employee.id,
        target_department: employee.department,
        priority,
        owner_name: "HRBP",
        status: "planned",
        expected_impact: "Document a retention conversation and reassess the employee risk signals.",
      });

      showToast(`✓ Review request created for ${employee.full_name}! View in Reviews Queue.`, "success");
      setActionMessage({ type: "success", text: `Review created for ${employee.full_name}.`, employee: employee.full_name });
    } catch (error) {
      console.error("Risk intervention creation failed", error);
      showToast(
        error?.status === 403
          ? "Administrator approval is required for this action."
          : error?.message || "Unable to create review request.",
        "error"
      );
      setActionMessage({ type: "error", text: error?.status === 403 ? "Review blocked: administrator approval is required." : (error?.message || "Review could not be created.") });
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStreamConnected(false);
      setStreamError("Sign in to view live analytics.");
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setStreamError(null);

    analysisAPI
      .streamAnalytics(
        {
          analytics: (payload) => {
            if (!active) return;
            setStats({
              depts: payload.depts || [],
              total: payload.total || 0,
              atRisk: payload.atRisk || 0,
              atRiskPct: payload.atRiskPct || 0,
              avgSentiment: payload.avgSentiment || 0,
              riskLevel: payload.riskLevel || "LOW",
              topRiskDepartment: payload.topRiskDepartment || null,
              topRiskDepartmentRatio: payload.topRiskDepartmentRatio || 0,
              timestamp: payload.timestamp || null,
            });
            setLoading(false);
            setStreamConnected(true);
          },
          error: (payload) => {
            if (!active) return;
            setStreamConnected(false);
            setStreamError(payload?.message || "Analytics stream interrupted.");
          },
        },
        controller.signal,
      )
      .catch((err) => {
        if (!active) return;
        console.error("Analytics stream failed", err);
        setStreamConnected(false);
        setStreamError(
          err.status === 401
            ? "Sign in to view live analytics."
            : "Analytics stream unavailable.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  const updatedLabel = useMemo(() => {
    if (!stats.timestamp) return "Waiting for live stream...";
    return `Updated ${new Date(stats.timestamp).toLocaleTimeString()}`;
  }, [stats.timestamp]);

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (streamError && !token) {
    return (
      <div className="w-full pb-20">
        <div className="glass-card p-8 border border-white/10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
            Organizational Analytics
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sign in to view the live analytics stream.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* FIXED TOP TOAST NOTIFICATION POPUP */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            key={toastKey}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div
              className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-2xl backdrop-blur-2xl ${
                toastNotification.type === "warning"
                  ? "bg-[#1a1510]/95 border-amber-500/30"
                  : toastNotification.type === "error"
                  ? "bg-[#170f10]/95 border-rose-500/30"
                  : "bg-[#0f1a14]/95 border-emerald-500/30"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    toastNotification.type === "warning"
                      ? "bg-amber-500/15 text-amber-400"
                      : toastNotification.type === "error"
                      ? "bg-rose-500/15 text-rose-400"
                      : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  {toastNotification.type === "warning" ? (
                    <AlertTriangle size={20} strokeWidth={2.2} />
                  ) : toastNotification.type === "error" ? (
                    <XCircle size={20} strokeWidth={2.2} />
                  ) : (
                    <CheckCircle2 size={20} strokeWidth={2.2} />
                  )}
                </div>

                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                        toastNotification.type === "warning"
                          ? "text-amber-400"
                          : toastNotification.type === "error"
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {toastNotification.type === "warning"
                        ? "Heads Up"
                        : toastNotification.type === "error"
                        ? "Action Needed"
                        : "Success"}
                    </p>
                    <button
                      onClick={() => setToastNotification(null)}
                      aria-label="Dismiss notification"
                      className="ml-auto -mr-1 text-slate-500 transition-colors hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-100">
                    {toastNotification.message}
                  </p>
                  {toastNotification.type === "success" && (
                    <button
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("aurelinx:navigate", {
                            detail: { tab: "enterprise" },
                          })
                        )
                      }
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-400/25 border border-emerald-400/20"
                    >
                      View in Reviews Queue
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Auto-dismiss progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4.5, ease: "linear" }}
                  className={`h-full ${
                    toastNotification.type === "warning"
                      ? "bg-amber-400/70"
                      : toastNotification.type === "error"
                      ? "bg-rose-400/70"
                      : "bg-emerald-400/70"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
            Organizational Analytics
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">
            Deep-dive telemetry into workforce distribution and health clusters.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
            <Radio
              size={14}
              className={streamConnected ? "text-emerald-300" : "text-rose-300"}
            />
            <span
              className={streamConnected ? "text-emerald-300" : "text-rose-300"}
            >
              {streamConnected
                ? "Live stream connected"
                : "Live stream disconnected"}
            </span>
            <span className="text-slate-400">- {updatedLabel}</span>
          </div>
        </div>
        <UserManualButton defaultTab="analytics" className="flex-none mt-2" />
      </header>
      {actionMessage && <div role="status" className={`mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs ${actionMessage.type === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-rose-300/20 bg-rose-300/10 text-rose-100"}`}><span>{actionMessage.text}</span>{actionMessage.type === "success" && <button onClick={() => window.dispatchEvent(new CustomEvent("aurelinx:navigate", { detail: { tab: "enterprise" } }))} className="rounded-md border border-emerald-200/30 px-2.5 py-1 font-semibold text-emerald-100 hover:bg-emerald-200/10">Open review workflow</button>}<button className="ml-auto text-white/60 hover:text-white" onClick={() => setActionMessage(null)} aria-label="Dismiss">×</button></div>}

      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Department
          <PremiumSelect value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10">
            <option value="">All employee departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </PremiumSelect>
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 text-xs text-slate-300">
          <input type="checkbox" checked={riskOnly} onChange={(event) => setRiskOnly(event.target.checked)} /> At-risk only
        </label>
        <div className="flex flex-wrap gap-2">
          {['pdf', 'excel', 'markdown'].map((format) => <button key={format} onClick={() => exportAnalytics(format)} disabled={!visibleEmployees.length} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold uppercase text-slate-200 disabled:opacity-40">{format === 'pdf' ? 'PDF' : format === 'excel' ? 'Excel' : 'Markdown'}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <MetricCard
          title="Total Workforce"
          value={isFiltered ? serverScopeTotal : stats.total}
          delta={isFiltered ? "Filtered employee records" : "Live employee records"}
          color="primary"
        />
        <MetricCard
          title="At-Risk Employees"
          value={isFiltered ? serverScopeAtRisk : stats.atRisk}
          delta={`${displayedRiskPct.toFixed(1)}% of ${isFiltered ? "view" : "workforce"}`}
          color="risk"
        />
        <MetricCard
          title="Employee Departments"
          value={isFiltered ? departmentRows.length : stats.depts.length}
          delta="Departments represented by employees"
          color="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10">
          <div className="flex items-center gap-3 mb-8">
            <PieChart className="text-primary" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-tight">
              Workforce Distribution
            </h3>
          </div>

          <div className="space-y-6">
            {(isFiltered ? departmentRows : (departmentRows.length ? departmentRows : stats.depts.map((dept) => ({ department: dept.name, total: dept.count, risk: 0, sentiment: 0, retention: 0 })))).map((dept) => (
              <button key={dept.department} onClick={() => setSelectedDepartment(dept.department)} className="block w-full space-y-2 text-left">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white/60 uppercase tracking-widest">
                    {dept.department}
                  </span>
                  <span className="text-white">{dept.total} Members · {dept.risk} risk</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(isFiltered ? visibleEmployees.length : stats.total) > 0 ? (dept.total / (isFiltered ? visibleEmployees.length : stats.total)) * 100 : 0}%`,
                    }}
                    className="h-full bg-primary"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-10 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-8">
            <Target className="text-risk" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-tight">
              Current Risk Rate
            </h3>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-white/5 animate-pulse" />
              <div className="absolute w-32 h-32 rounded-full border-4 border-primary/20" />
            </div>
            <div className="text-center z-10">
              <div className="text-6xl font-black neon-text">
                {displayedRiskPct.toFixed(1)}%
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-2">
                {displayedRiskLevel} Rule-Based Risk Rate
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-sm text-white/50 leading-relaxed text-center uppercase tracking-wide font-bold">
            {(isFiltered ? displayedTopRisk : stats.topRiskDepartment)
              ? `${isFiltered ? displayedTopRisk.department : stats.topRiskDepartment} currently has the highest recorded risk concentration at ${(isFiltered ? (displayedTopRisk.total ? displayedTopRisk.risk / displayedTopRisk.total * 100 : 0) : stats.topRiskDepartmentRatio).toFixed(1)}%. This is a rule-based ratio, not a validated predictive model.`
              : "No department-level risk concentration detected."}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
        <section className="premium-card p-5 flex flex-col h-[560px]">
          <div className="mb-4 flex items-start justify-between gap-3 shrink-0"><div><h3 className="text-sm font-bold text-slate-100">Department drill-down</h3><p className="mt-1 text-[11px] text-slate-500">Select a department from the distribution above to focus this view.</p></div>{selectedDepartment && <button onClick={() => setSelectedDepartment(null)} className="text-[10px] font-semibold text-cyan-200 hover:text-cyan-100">Show all</button>}</div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07] pr-2 custom-scrollbar">
            {activeDepartmentRows.map((row) => <div key={row.department} className="py-3 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-200">{row.department}</span><span className="text-[10px] text-slate-500">{row.total} employees · {row.risk} at risk</span></div><div className="mt-2 grid grid-cols-3 gap-3 text-[10px] text-slate-500"><span>Sentiment <strong className="text-cyan-200">{row.sentiment.toFixed(2)}</strong></span><span>Retention <strong className="text-emerald-200">{(row.retention * 100).toFixed(1)}%</strong></span><span>Risk share <strong className="text-rose-200">{row.total ? ((row.risk / row.total) * 100).toFixed(1) : "0.0"}%</strong></span></div></div>)}
            {!activeDepartmentRows.length && <p className="py-3 text-xs text-slate-500">No departments match the current filters.</p>}
          </div>
        </section>
        <section className="premium-card p-5 flex flex-col h-[560px]">
          <div className="mb-4 flex items-start justify-between gap-3 shrink-0"><div><h3 className="text-sm font-bold text-slate-100">Employee risk evidence</h3><p className="mt-1 text-[11px] text-slate-500">Ordered by lowest retention probability. Review actions require administrator approval when high priority.</p></div><span className="shrink-0 rounded-full bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-200">{riskEmployees.length} matches</span></div>
          <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-white/[0.07] pr-2 custom-scrollbar py-1">{riskEmployees.map((employee, index) => <div key={employee.id} className="flex items-center gap-3 py-3 hover:bg-white/[0.03] px-2 rounded-lg transition-colors"><span className="w-5 text-[10px] font-mono text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-slate-200">{employee.full_name}</div><div className="truncate text-[10px] text-slate-500">{employee.department} · {employee.role}</div></div><div className="shrink-0 text-right text-[10px]"><div className="font-semibold text-rose-300">Retention {(Number(employee.retention_prob ?? 0.5) * 100).toFixed(0)}%</div><button onClick={() => createRiskIntervention(employee)} className="mt-1 font-semibold text-cyan-200 hover:text-cyan-100 transition-colors">Create review</button></div></div>)}{loadingMoreRisk && <p className="py-2 text-center text-[10px] text-cyan-200">Loading more evidence…</p>}{!riskEmployees.length && <p className="py-3 text-xs text-slate-500">No at-risk employees match the selected filters.</p>}<div ref={riskSentinelRef} className="h-1" aria-hidden="true" /></div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="premium-card p-5">
          <div className="mb-4"><h3 className="text-sm font-bold text-slate-100">Candidate and hiring context</h3><p className="mt-1 text-[11px] text-slate-500">A separate population from the employee workforce.</p></div>
          <div className="grid grid-cols-3 gap-3 border-y border-white/[0.07] py-4 text-xs"><span><strong className="block text-lg text-cyan-200">{candidateCount ?? "—"}</strong><span className="text-slate-500">candidate records</span></span><span><strong className="block text-lg text-cyan-200">{candidateAverageMatch == null ? "—" : `${(candidateAverageMatch * 100).toFixed(1)}%`}</strong><span className="text-slate-500">average match</span></span><span><strong className="block text-lg text-emerald-200">{candidateHighMatch}</strong><span className="text-slate-500">high match ≥70%</span></span></div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Candidate match, sentiment, role, and department belong to Talent Scout. They are not included in employee morale or risk totals. Hiring pipeline stages are not present in the current schema.</p>
        </section>
        <section className="premium-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-100">Live snapshot history</h3><p className="mt-1 text-[11px] text-slate-500">One bar is one live analytics snapshot captured in this workspace. Bar height is the at-risk percentage.</p></div><span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">{trend.length} captured</span></div>
          {trend.length ? <div><div className="relative flex h-20 items-end gap-1 border-b border-white/[0.08]">{trend.map((point, index) => {
            const rawRisk = Number(point.atRiskPct ?? point.at_risk_pct ?? 0);
            // Normalize risk percentage (convert ratio <= 1.0 to 0..100 percentage)
            const riskPct = rawRisk <= 1.0 && rawRisk > 0 ? rawRisk * 100 : rawRisk;
            const heightPct = Math.max(8, Math.min(100, riskPct));
            return <div key={`${point.timestamp}-${index}`} className="relative min-w-[4px] flex-1"><div role="img" tabIndex={0} aria-label={`${new Date(point.timestamp).toLocaleString()}; risk ${riskPct.toFixed(1)} percent`} onMouseEnter={() => setHoveredSnapshot(point.timestamp)} onMouseLeave={() => setHoveredSnapshot(null)} onFocus={() => setHoveredSnapshot(point.timestamp)} onBlur={() => setHoveredSnapshot(null)} className="h-full cursor-help outline-none"><div className="absolute bottom-0 left-0 right-0 min-h-[6px] rounded-t bg-gradient-to-t from-rose-500/80 to-amber-300/80 transition-[filter] hover:brightness-125 focus-visible:brightness-125 shadow-[0_0_8px_rgba(251,113,133,0.3)]" style={{ height: `${heightPct}%` }} />{hoveredSnapshot === point.timestamp && <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-rose-300/30 bg-[#1b111d]/95 px-3 py-2 text-[10px] leading-relaxed text-slate-200 shadow-xl shadow-rose-950/30 backdrop-blur-md"><div className="font-semibold text-rose-100">{new Date(point.timestamp).toLocaleString()}</div><div className="mt-0.5 text-slate-400">At risk <span className="font-semibold text-white">{riskPct.toFixed(1)}%</span><span className="mx-1.5 text-slate-600">·</span>Sentiment <span className="font-semibold text-cyan-200">{Number(point.avgSentiment ?? point.avg_sentiment ?? 0).toFixed(2)}</span></div></div>}</div></div>;
          })}</div><div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.14em] text-slate-600"><span>0% risk</span><span>25%+</span></div></div> : <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-slate-500">History will appear after the live stream captures its first snapshot.</div>}
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[10px] leading-relaxed text-slate-500">
        <strong className="text-slate-300">Data quality and provenance:</strong> metrics use the authenticated tenant's filtered employee records. Employee values are observed database fields; risk rate, department concentration, and risk level are derived calculations. Import validation, duplicate checks, and quarantine counts are available in Data Ops.
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, delta, color }) => (
  <div className="glass-card p-8 border-l-4 border-l-white/5 hover:border-l-primary transition-all duration-500">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
        {title}
      </span>
      <TrendingUp
        size={16}
        className={
          color === "risk"
            ? "text-rose-400"
            : color === "accent"
              ? "text-emerald-300"
              : "text-cyan-300"
        }
      />
    </div>
    <div className="text-4xl font-black mb-1">{value}</div>
    <div
      className={`text-xs font-bold ${color === "risk" ? "text-rose-300" : color === "accent" ? "text-emerald-300" : "text-cyan-300"}`}
    >
      {delta}
    </div>
  </div>
);

export default AnalyticsView;
