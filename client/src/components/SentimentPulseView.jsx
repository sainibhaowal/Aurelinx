import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Radio,
} from "lucide-react";
import { analysisAPI, candidatesAPI, employeesAPI } from "../services/apiClient";
import { UserManualButton } from "./UserManual";
import { useAuth } from "../contexts/AuthContext";

const SentimentPulseView = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [employeeRecords, setEmployeeRecords] = useState([]);
  const [candidateCount, setCandidateCount] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [filteredReport, setFilteredReport] = useState(null);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStreamConnected(false);
      setStreamError("Sign in to view live sentiment telemetry.");
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setStreamError(null);

    analysisAPI
      .streamSentiment(
        {
          sentiment: (payload) => {
            if (!active) return;
            setData(payload);
            setLoading(false);
            setStreamConnected(true);
          },
          error: (payload) => {
            if (!active) return;
            setStreamConnected(false);
            setStreamError(payload?.message || "Sentiment stream interrupted.");
          },
        },
        controller.signal,
      )
      .catch((err) => {
        if (!active) return;
        console.error("Sentiment stream failed", err);
        setStreamConnected(false);
        setStreamError(
          err.status === 401
            ? "Sign in to view live sentiment telemetry."
            : "Sentiment stream unavailable.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    Promise.all([employeesAPI.list(0, 10000), candidatesAPI.count()])
      .then(([employees, candidates]) => {
        if (!active) return;
        setEmployeeRecords(employees || []);
        setCandidateCount(candidates?.count ?? null);
      })
      .catch((err) => console.error("Sentiment context load failed", err));
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token || (!departmentFilter && !atRiskOnly)) {
      setFilteredReport(null);
      return undefined;
    }
    let active = true;
    analysisAPI.getSentimentReport(departmentFilter || null, atRiskOnly)
      .then((report) => { if (active) setFilteredReport(report); })
      .catch((err) => console.error("Filtered sentiment report failed", err));
    return () => { active = false; };
  }, [token, departmentFilter, atRiskOnly]);

  useEffect(() => {
    if (!data) return;
    const point = { timestamp: data.timestamp, avg_sentiment: data.avg_sentiment, at_risk_percentage: data.at_risk_percentage };
    setTrend((previous) => {
      const next = [...previous.filter((item) => item.timestamp !== point.timestamp), point].slice(-24);
      try { localStorage.setItem("aurelinx_sentiment_trend_v1", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [data]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("aurelinx_sentiment_trend_v1") || "[]");
      if (Array.isArray(cached)) setTrend(cached.slice(-24));
    } catch {}
  }, []);

  const visibleEmployees = employeeRecords.filter((employee) =>
    (!departmentFilter || employee.department === departmentFilter) &&
    (!atRiskOnly || employee.is_at_risk),
  );
  const departments = [...new Set(employeeRecords.map((employee) => employee.department).filter(Boolean))].sort();
  const displayData = filteredReport || data || {};
  const displayRiskPct = Number(displayData?.at_risk_percentage ?? displayData?.atRiskPct ?? 0);
  const displayPriority = displayRiskPct >= 20 ? "Level 3" : displayRiskPct >= 10 ? "Level 2" : "Level 1";
  const lowSentiment = [...visibleEmployees].filter((employee) => Number(employee.sentiment_score || 0) < 0.45).sort((a, b) => a.sentiment_score - b.sentiment_score).slice(0, 8);
  const lowRetention = [...visibleEmployees].filter((employee) => Number(employee.retention_prob ?? 0.5) < 0.55).sort((a, b) => a.retention_prob - b.retention_prob).slice(0, 8);
  const departmentBreakdown = departments.map((department) => {
    const rows = visibleEmployees.filter((employee) => employee.department === department);
    const risk = rows.filter((employee) => employee.is_at_risk).length;
    return { department, total: rows.length, risk, sentiment: rows.length ? rows.reduce((sum, row) => sum + Number(row.sentiment_score || 0), 0) / rows.length : 0 };
  }).filter((row) => row.total > 0);

  const exportSentimentReport = async (format = "pdf") => {
    const { generateAurelinxReport } = await import("../utils/reportGenerator");
    generateAurelinxReport({ employees: visibleEmployees, candidates: [] }, `Sentiment report for ${visibleEmployees.length} employees.`, format);
  };

  const priorityColorClass = useMemo(() => {
    if (!data) return "text-emerald-300";
    if (data.priority_color === "risk") return "text-rose-400";
    if (data.priority_color === "warning") return "text-amber-300";
    return "text-emerald-300";
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
          Initializing Live Sentiment Stream...
        </p>
      </div>
    );
  }

  if (streamError && !token) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <ShieldAlert className="text-rose-300" size={32} />
        <p className="text-sm text-white/70">
          Sign in to view live sentiment telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">
            Sentiment Intelligence
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">
            Real-time organizational health tracking and risk clustering.
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
            <span className="text-slate-400">
              - Updated{" "}
              {data?.timestamp
                ? new Date(data.timestamp).toLocaleTimeString()
                : "N/A"}
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
            Scope: <span className="text-slate-200">employees only</span> ({displayData?.total_employees ?? displayData?.total ?? 0} records). Candidate context is tracked separately: {candidateCount ?? "—"} candidate records. Values marked as derived are calculated from stored sentiment, retention, department, and policy-risk fields.
          </div>
        </div>
        <UserManualButton defaultTab="analytics" className="flex-none mt-2" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-card p-8 border-l-2 border-l-primary/30">
          <div className="flex items-center gap-5 mb-8">
            <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">
                System Status
              </h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                Live Database Snapshot
              </p>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed font-medium">
            Analyzing{" "}
            <span className="text-white font-bold">
              {displayData?.total_employees ?? displayData?.total ?? 0}
            </span>{" "}
            employees in real time. Current average sentiment score is{" "}
            <span className="text-white font-bold">
              {Number(displayData?.avg_sentiment ?? 0).toFixed(2)}
            </span>
            , with{" "}
            <span className="text-white font-bold">
              {displayData?.at_risk_count ?? displayData?.atRisk ?? 0}
            </span>{" "}
            profiles flagged at risk.
          </p>
        </div>

        <div className="glass-card p-8 border-l-2 border-l-rose-400/30">
          <div className="flex items-center gap-5 mb-8">
            <div
              className={`p-3 bg-white/5 rounded-xl ${priorityColorClass} border border-white/10`}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">
                Intervention Priority
              </h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                Dynamic Ranking
              </p>
            </div>
          </div>
          <div
            className={`text-4xl font-black mb-4 tracking-tighter ${priorityColorClass}`}
          >
            {filteredReport ? displayPriority : data?.priority_level ?? displayPriority}
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-bold uppercase tracking-wide">
            Current at-risk ratio is{" "}
            <span className="text-white">
              {Number(displayData?.at_risk_percentage ?? displayData?.atRiskPct ?? 0).toFixed(1)}%
            </span>
            . Priority level auto-adjusts from live employee risk and sentiment
            inputs.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Department
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-950/70 px-3 text-sm normal-case tracking-normal text-slate-200 outline-none">
            <option value="">All employee departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 text-xs text-slate-300">
          <input type="checkbox" checked={atRiskOnly} onChange={(event) => setAtRiskOnly(event.target.checked)} /> At-risk only
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportSentimentReport("pdf")} disabled={!visibleEmployees.length} className="h-10 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200 disabled:opacity-40">PDF</button>
          <button onClick={() => exportSentimentReport("excel")} disabled={!visibleEmployees.length} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 disabled:opacity-40">Excel</button>
          <button onClick={() => exportSentimentReport("markdown")} disabled={!visibleEmployees.length} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 disabled:opacity-40">Markdown</button>
        </div>
      </div>

      <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-2">
        <TrendingUp size={14} /> Derived Workforce Metrics
      </h2>

      <div className="premium-card overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
              <th className="p-5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                Indicator
              </th>
              <th className="p-5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 text-center">
                Current Score
              </th>
              <th className="p-5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 text-center">
                Velocity
              </th>
              <th className="p-5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 text-right">
                Coverage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(displayData?.metrics || []).map((m) => (
            <MetricRow
                key={m.name}
                name={m.name}
                score={Number(m.score).toFixed(2)}
                velocity={
                  Number(m.velocity) >= 0
                    ? `+${Number(m.velocity).toFixed(3)}`
                    : Number(m.velocity).toFixed(3)
                }
                confidence={`${(Number(m.confidence) * 100).toFixed(1)}%`}
              />
            ))}
            {(!displayData?.metrics || displayData.metrics.length === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-300 text-sm"
                >
                  No live sentiment metrics available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Coverage is a data-volume indicator, not statistical confidence. Velocity compares the current database snapshot with the previous stream snapshot; it remains zero when records have not changed.
      </p>

      <div className="mt-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="premium-card p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Department sentiment and risk</h3>
          <div className="space-y-3">
            {departmentBreakdown.map((row) => (
              <div key={row.department} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex justify-between gap-3 text-xs"><span className="truncate text-slate-200">{row.department}</span><span className="text-slate-400">{row.total} employees</span></div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Average sentiment: <strong className="text-cyan-200">{row.sentiment.toFixed(2)}</strong></span><span>At risk: <strong className="text-rose-300">{row.risk}</strong></span></div>
              </div>
            ))}
          </div>
        </section>
        <section className="premium-card p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Observed data vs modeled indicators</h3>
          <div className="space-y-2 text-xs leading-relaxed text-slate-400">
            <p><strong className="text-slate-200">Observed:</strong> employee sentiment score, retention probability, department, and policy-risk flag stored on each record.</p>
            <p><strong className="text-slate-200">Modeled:</strong> burnout risk, department concentration balance, retention-sentiment index, and priority level derived from those fields.</p>
            <p><strong className="text-slate-200">Candidate context:</strong> {candidateCount ?? "—"} candidates are tracked separately using match score and candidate sentiment; they are not included in employee morale totals.</p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[['Low sentiment employees', lowSentiment, 'sentiment_score'], ['Low retention employees', lowRetention, 'retention_prob']].map(([title, rows, field]) => (
          <section key={title} className="premium-card p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{title}</h3>
            <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-xs"><span className="min-w-0 truncate text-slate-200">{row.full_name}</span><span className="shrink-0 text-rose-300">{Number(row[field] ?? 0).toFixed(2)}</span></div>)}{!rows.length && <p className="text-xs text-slate-500">No records match this indicator.</p>}</div>
          </section>
        ))}
      </div>

      <section className="premium-card mt-6 p-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Snapshot trend history</h3>
        <p className="mb-4 text-[10px] text-slate-500">Stored snapshots from this workspace session; no synthetic historical values are invented.</p>
        <div className="flex items-end gap-1 h-20">{trend.map((point) => <div key={point.timestamp} title={`${new Date(point.timestamp).toLocaleString()} · sentiment ${Number(point.avg_sentiment).toFixed(2)}`} className="flex-1 min-w-[4px] rounded-t bg-cyan-400/60" style={{ height: `${Math.max(8, Number(point.avg_sentiment || 0) * 100)}%` }} />)}</div>
      </section>

      <section className="premium-card mt-6 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Evidence-linked actions</h3>
        <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
          <li>Review the listed low-sentiment employees with their managers before creating a retention intervention.</li>
          <li>Prioritize employees with both a policy-risk flag and low retention probability for a documented 1:1 review.</li>
          <li>Compare department averages before making organization-wide changes; department totals and risk counts above are the supporting evidence.</li>
        </ul>
      </section>
    </div>
  );
};

const MetricRow = ({ name, score, velocity, confidence }) => (
  <tr className="hover:bg-white/[0.02] transition-colors group">
    <td className="p-5">
      <span className="text-xs font-black uppercase tracking-widest text-white/80">
        {name}
      </span>
    </td>
    <td className="p-5 text-center">
      <span className="text-sm font-black text-white">{score}</span>
    </td>
    <td className="p-5 text-center">
      <span
        className={`text-[10px] font-black ${velocity.startsWith("+") ? "text-emerald-300" : velocity === "0.000" ? "text-white/30" : "text-rose-300"}`}
      >
        {velocity}
      </span>
    </td>
    <td className="p-5 text-right">
      <span className="text-[10px] font-bold text-white/40 tracking-widest">
        {confidence}
      </span>
    </td>
  </tr>
);

export default SentimentPulseView;
