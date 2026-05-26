import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Radio,
} from "lucide-react";
import { analysisAPI } from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";

const SentimentPulseView = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(null);

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
      <header className="mb-8">
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
                Live Telemetry
              </p>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed font-medium">
            Analyzing{" "}
            <span className="text-white font-bold">
              {data?.total_employees ?? 0}
            </span>{" "}
            employees in real time. Current average sentiment score is{" "}
            <span className="text-white font-bold">
              {data?.avg_sentiment?.toFixed(2) ?? "0.00"}
            </span>
            , with{" "}
            <span className="text-white font-bold">
              {data?.at_risk_count ?? 0}
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
            {data?.priority_level ?? "Level 1"}
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-bold uppercase tracking-wide">
            Current at-risk ratio is{" "}
            <span className="text-white">
              {data?.at_risk_percentage?.toFixed(1) ?? "0.0"}%
            </span>
            . Priority level auto-adjusts from live employee risk and sentiment
            inputs.
          </p>
        </div>
      </div>

      <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-2">
        <TrendingUp size={14} /> Critical Metrics Breakdown
      </h2>

      <div className="premium-card overflow-hidden border-white/[0.08]">
        <table className="w-full text-left border-collapse">
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
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data?.metrics || []).map((m) => (
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
            {(!data?.metrics || data.metrics.length === 0) && (
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
