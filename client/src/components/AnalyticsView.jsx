import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, TrendingUp, Target, Loader2, Radio } from "lucide-react";
import { analysisAPI } from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";

const AnalyticsView = () => {
  const { token } = useAuth();
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
      <header className="mb-8">
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <MetricCard
          title="Total Workforce"
          value={stats.total}
          delta="Live SSE stream"
          color="primary"
        />
        <MetricCard
          title="At-Risk Employees"
          value={stats.atRisk}
          delta={`${stats.atRiskPct}% of workforce`}
          color="risk"
        />
        <MetricCard
          title="Active Departments"
          value={stats.depts.length}
          delta="Current org structure"
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
            {stats.depts.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white/60 uppercase tracking-widest">
                    {dept.name}
                  </span>
                  <span className="text-white">{dept.count} Members</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${stats.total > 0 ? (dept.count / stats.total) * 100 : 0}%`,
                    }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-10 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-8">
            <Target className="text-risk" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-tight">
              Predictive Risk Vector
            </h3>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-white/5 animate-pulse" />
              <div className="absolute w-32 h-32 rounded-full border-4 border-primary/20" />
            </div>
            <div className="text-center z-10">
              <div className="text-6xl font-black neon-text">
                {stats.atRiskPct.toFixed(1)}%
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-2">
                {stats.riskLevel} Risk Coefficient
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-sm text-white/50 leading-relaxed text-center uppercase tracking-wide font-bold">
            {stats.topRiskDepartment
              ? `${stats.topRiskDepartment} currently has the highest risk concentration at ${stats.topRiskDepartmentRatio.toFixed(1)}%.`
              : "No department-level risk concentration detected."}
          </div>
        </div>
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
