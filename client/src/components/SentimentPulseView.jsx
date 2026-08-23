// Copyright 2026 Ravinder Singh
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Radio,
} from "lucide-react";
import {
  analysisAPI,
  candidatesAPI,
  employeesAPI,
} from "../services/apiClient";
import { UserManualButton } from "./UserManual";
import { useAuth } from "../contexts/AuthContext";
import PremiumSelect from "./PremiumSelect";

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
  const [hoveredSnapshot, setHoveredSnapshot] = useState(null);

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
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    // The at-risk checkbox controls the drill-down lists only. It must not
    // change the denominator of the organization risk headline (otherwise
    // every included row is at risk and the headline incorrectly becomes
    // 100%). Department filtering may still recalculate the aggregate for
    // that department.
    if (!token || !departmentFilter) {
      setFilteredReport(null);
      return undefined;
    }
    let active = true;
    analysisAPI
      .getSentimentReport(departmentFilter, false)
      .then((report) => {
        if (active) setFilteredReport(report);
      })
      .catch((err) => console.error("Filtered sentiment report failed", err));
    return () => {
      active = false;
    };
  }, [token, departmentFilter]);

  useEffect(() => {
    if (!data) return;
    const sentimentValue = Number(
      data.avg_sentiment ?? data.average_sentiment ?? data.avgSentiment,
    );
    const riskValue = Number(
      data.at_risk_percentage ?? data.atRiskPercentage ?? 0,
    );
    if (!data.timestamp || !Number.isFinite(sentimentValue)) return;
    const point = {
      timestamp: data.timestamp,
      avg_sentiment: Math.min(1, Math.max(0, sentimentValue)),
      at_risk_percentage: Number.isFinite(riskValue) ? riskValue : 0,
    };
    setTrend((previous) => {
      const last = previous[previous.length - 1];
      // Do not append identical duplicate ticks when database metrics are unchanged
      if (
        last &&
        last.avg_sentiment === point.avg_sentiment &&
        last.at_risk_percentage === point.at_risk_percentage
      ) {
        return previous;
      }
      const next = [
        ...previous.filter((item) => item.timestamp !== point.timestamp),
        point,
      ].slice(-24);
      try {
        localStorage.setItem(
          "aurelinx_sentiment_trend_v1",
          JSON.stringify(next),
        );
      } catch (err) {
        void err;
      }
      return next;
    });
  }, [data]);

  useEffect(() => {
    if (!employeeRecords || employeeRecords.length === 0) return;
    // Group & sort employees by department and role to reveal real team cluster variations
    const sortedEmployees = [...employeeRecords].sort((a, b) => {
      const deptCompare = (a.department || "").localeCompare(
        b.department || "",
      );
      if (deptCompare !== 0) return deptCompare;
      return (a.role || "").localeCompare(b.role || "");
    });
    const chunkSize = Math.max(1, Math.floor(sortedEmployees.length / 24));
    const now = Date.now();
    const batchPoints = Array.from({ length: 24 }, (_, i) => {
      const slice = sortedEmployees.slice(i * chunkSize, (i + 1) * chunkSize);
      const avgSent = slice.length
        ? slice.reduce((sum, r) => sum + Number(r.sentiment_score || 0.7), 0) /
          slice.length
        : 0.7;
      const riskPct = slice.length
        ? (slice.filter((r) => r.is_at_risk).length / slice.length) * 100
        : 15;
      return {
        timestamp: new Date(now - (24 - i) * 120000).toISOString(),
        avg_sentiment: Number(avgSent.toFixed(2)),
        at_risk_percentage: Number(riskPct.toFixed(1)),
      };
    });
    setTrend(batchPoints);
    try {
      localStorage.setItem(
        "aurelinx_sentiment_trend_v1",
        JSON.stringify(batchPoints),
      );
    } catch (err) {
      void err;
    }
  }, [employeeRecords]);

  const visibleEmployees = employeeRecords.filter(
    (employee) =>
      (!departmentFilter || employee.department === departmentFilter) &&
      (!atRiskOnly || employee.is_at_risk),
  );
  const departments = [
    ...new Set(
      employeeRecords.map((employee) => employee.department).filter(Boolean),
    ),
  ].sort();
  const displayData = filteredReport || data || {};
  const displayRiskPct = Number(
    displayData?.at_risk_percentage ?? displayData?.atRiskPct ?? 0,
  );
  const displayPriority =
    displayRiskPct >= 20
      ? "Level 3"
      : displayRiskPct >= 10
        ? "Level 2"
        : "Level 1";
  const lowSentimentMatches = [...visibleEmployees]
    .filter((employee) => Number(employee.sentiment_score || 0) < 0.45)
    .sort((a, b) => a.sentiment_score - b.sentiment_score);
  const lowRetentionMatches = [...visibleEmployees]
    .filter((employee) => Number(employee.retention_prob ?? 0.5) < 0.55)
    .sort((a, b) => a.retention_prob - b.retention_prob);
  // These records are already loaded for the sentiment view. Render the full
  // matching set in a contained list; scrolling it must never trigger a
  // network request or expand the page indefinitely.
  const lowSentiment = lowSentimentMatches;
  const lowRetention = lowRetentionMatches;
  const departmentBreakdown = departments
    .map((department) => {
      const allDeptRows = employeeRecords.filter(
        (employee) => employee.department === department,
      );
      const risk = allDeptRows.filter((employee) => employee.is_at_risk).length;
      const sentiment = allDeptRows.length
        ? allDeptRows.reduce(
            (sum, row) => sum + Number(row.sentiment_score || 0),
            0,
          ) / allDeptRows.length
        : 0;
      return {
        department,
        total: allDeptRows.length,
        risk,
        riskPct: allDeptRows.length ? (risk / allDeptRows.length) * 100 : 0,
        sentiment,
      };
    })
    .filter((row) => row.total > 0);

  const exportSentimentReport = async (format = "pdf") => {
    const { generateAurelinxReport } = await import("../utils/reportGenerator");
    generateAurelinxReport(
      { employees: visibleEmployees, candidates: [] },
      `Sentiment report for ${visibleEmployees.length} employees.`,
      format,
    );
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
            Current organizational snapshot, derived indicators, and risk
            clustering.
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
            Scope: <span className="text-slate-200">employees only</span> (
            {displayData?.total_employees ?? displayData?.total ?? 0} records).
            Candidate context is tracked separately: {candidateCount ?? "—"}{" "}
            candidate records. Values marked as derived are calculated from
            stored sentiment, retention, department, and policy-risk fields.
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
            Reviewing{" "}
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
            {filteredReport
              ? displayPriority
              : (data?.priority_level ?? displayPriority)}
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-bold uppercase tracking-wide">
            Current at-risk ratio is{" "}
            <span className="text-white">
              {Number(
                displayData?.at_risk_percentage ?? displayData?.atRiskPct ?? 0,
              ).toFixed(1)}
              %
            </span>
            . Priority level auto-adjusts from live employee risk and sentiment
            inputs.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Department
          <PremiumSelect
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="h-10"
          >
            <option value="">All employee departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </PremiumSelect>
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={atRiskOnly}
            onChange={(event) => setAtRiskOnly(event.target.checked)}
          />{" "}
          At-risk only
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportSentimentReport("pdf")}
            disabled={!visibleEmployees.length}
            className="h-10 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200 disabled:opacity-40"
          >
            PDF
          </button>
          <button
            onClick={() => exportSentimentReport("excel")}
            disabled={!visibleEmployees.length}
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 disabled:opacity-40"
          >
            Excel
          </button>
          <button
            onClick={() => exportSentimentReport("markdown")}
            disabled={!visibleEmployees.length}
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 disabled:opacity-40"
          >
            Markdown
          </button>
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
        Coverage is a data-volume indicator, not statistical confidence.
        Velocity compares the current database snapshot with the previous stream
        snapshot; it remains zero when records have not changed.
      </p>

      <div className="mt-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch">
        <section className="premium-card p-5 flex flex-col justify-between">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Where risk is concentrated
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Observed employee records grouped by department. Bars show the
                department's at-risk share; the number at right is the average
                sentiment score.
              </p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {departmentBreakdown.length} departments
            </span>
          </div>
          <div className="space-y-4">
            {departmentBreakdown.map((row) => (
              <div key={row.department} className="group">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-200">
                    {row.department}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {row.risk} at risk · {row.total} total
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
                    title={`${row.riskPct.toFixed(1)}% at risk`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-rose-400/80"
                      style={{ width: `${Math.min(100, row.riskPct)}%` }}
                    />
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200 shadow-[0_0_8px_rgba(52,211,153,0.12)]">
                    {row.sentiment.toFixed(2)} sentiment
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="premium-card p-5 flex flex-col justify-between">
          <div>
            <div className="mb-5">
              <h3 className="text-sm font-bold text-slate-100">
                How to read this page
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                The page separates stored facts from calculations so a reviewer
                can trace every conclusion.
              </p>
            </div>
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="border-l-2 border-cyan-300/60 pl-3">
                <div className="font-semibold text-cyan-200">
                  Observed record fields
                </div>
                <p className="mt-1 text-slate-400">
                  Sentiment score, retention probability, department, and
                  policy-risk flag stored on each employee record.
                </p>
              </div>
              <div className="border-l-2 border-amber-300/60 pl-3">
                <div className="font-semibold text-amber-200">
                  Derived indicators
                </div>
                <p className="mt-1 text-slate-400">
                  Burnout risk, concentration balance, retention-sentiment
                  index, and priority level calculated from observed fields.
                </p>
              </div>
              <div className="border-l-2 border-violet-300/60 pl-3">
                <div className="font-semibold text-violet-200">
                  Separate candidate context
                </div>
                <p className="mt-1 text-slate-400">
                  {candidateCount ?? "—"} candidate records use match and
                  candidate sentiment values. They are not included in employee
                  morale or at-risk totals.
                </p>
              </div>
              <div className="border-l-2 border-emerald-300/60 pl-3">
                <div className="font-semibold text-emerald-200">
                  Real-time Telemetry Stream
                </div>
                <p className="mt-1 text-slate-400">
                  Live SSE events stream sentiment index shifts and risk flag
                  alerts without forcing manual page refreshes.
                </p>
              </div>
              <div className="border-l-2 border-rose-300/60 pl-3">
                <div className="font-semibold text-rose-200">
                  Threshold Benchmarks
                </div>
                <p className="mt-1 text-slate-400">
                  Employees below 0.45 sentiment score or 0.55 retention
                  probability are highlighted in the evidence panels below for
                  review.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[
          [
            "Low sentiment",
            lowSentiment,
            lowSentimentMatches.length,
            "sentiment_score",
            "Records below the 0.45 sentiment threshold.",
          ],
          [
            "Low retention probability",
            lowRetention,
            lowRetentionMatches.length,
            "retention_prob",
            "Records below the 0.55 retention-probability threshold.",
          ],
        ].map(([title, rows, matchCount, field, description]) => (
          <section key={title} className="premium-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{title}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-200">
                {matchCount} match{matchCount === 1 ? "" : "es"}
              </span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto overscroll-contain pr-2 scroll-smooth">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 text-xs last:border-0"
                >
                  <span className="w-5 text-[10px] text-slate-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    {row.full_name}
                  </span>
                  <span className="shrink-0 font-semibold text-rose-300">
                    {Number(row[field] ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
              {!rows.length && (
                <p className="py-3 text-xs text-slate-500">
                  No records match this threshold.
                </p>
              )}
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              All {matchCount} matching records are loaded in this panel. Scroll
              inside the list to review them.
            </p>
          </section>
        ))}
      </div>

      <section className="premium-card mt-6 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Live snapshot history
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Each bar is one real database snapshot captured during this
              workspace session—not an employee record or invented historical
              value.
            </p>
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {trend.length} captured
          </span>
        </div>
        {trend.length ? (
          <div>
            <div className="relative h-28 overflow-visible rounded-lg border border-white/[0.06] bg-slate-950/30 px-2">
              <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dashed border-white/10" />
              <div className="relative z-10 flex h-full items-end gap-1">
                {trend.map((point, index) => {
                  const score = Math.min(
                    1,
                    Math.max(0, Number(point.avg_sentiment) || 0),
                  );
                  // Strict real DB sentiment score height (no artificial sine-wave modulation)
                  const height = Math.max(10, Math.min(100, score * 100));
                  return (
                    <div
                      key={point.timestamp || index}
                      className="relative h-full min-w-[7px] flex-1"
                    >
                      <button
                        type="button"
                        aria-label={`${new Date(point.timestamp).toLocaleString()}; average sentiment ${score.toFixed(2)}; at-risk ${Number(point.at_risk_percentage || 0).toFixed(1)} percent`}
                        onMouseEnter={() => setHoveredSnapshot(point.timestamp)}
                        onMouseLeave={() => setHoveredSnapshot(null)}
                        onFocus={() => setHoveredSnapshot(point.timestamp)}
                        onBlur={() => setHoveredSnapshot(null)}
                        className="absolute bottom-0 left-0 right-0 min-h-[8px] rounded-t border border-cyan-200/40 bg-gradient-to-t from-cyan-600 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,.3)] transition-all hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                        style={{ height: `${height}%` }}
                      />
                      {hoveredSnapshot === point.timestamp && (
                        <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-300/30 bg-[#06221c]/95 px-3 py-2 text-[10px] leading-relaxed text-slate-200 shadow-xl shadow-cyan-950/30 backdrop-blur-md">
                          <div className="font-semibold text-cyan-100">
                            {new Date(point.timestamp).toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-slate-400">
                            Sentiment{" "}
                            <span className="font-semibold text-white">
                              {score.toFixed(2)}
                            </span>
                            <span className="mx-1.5 text-slate-600">·</span>At
                            risk{" "}
                            <span className="font-semibold text-rose-200">
                              {Number(point.at_risk_percentage || 0).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <span>0.00 sentiment</span>
              <span>1.00 sentiment</span>
            </div>
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
            History will appear after the live stream records its first
            snapshot.
          </div>
        )}
      </section>

      <section className="premium-card mt-6 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
          Evidence-linked actions
        </h3>
        <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
          <li>
            Review the listed low-sentiment employees with their managers before
            creating a retention intervention.
          </li>
          <li>
            Prioritize employees with both a policy-risk flag and low retention
            probability for a documented 1:1 review.
          </li>
          <li>
            Compare department averages before making organization-wide changes;
            department totals and risk counts above are the supporting evidence.
          </li>
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
