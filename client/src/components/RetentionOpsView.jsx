// RetentionOps: sync health + risk proof + approvals inbox, fully wired.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Activity, AlertTriangle } from "lucide-react";
import { enterpriseAPI, actionsAPI } from "../services/apiClient";

const RetentionOpsView = () => {
  const [health, setHealth] = useState(null);
  const [email, setEmail] = useState("");
  const [risk, setRisk] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, ap, pr] = await Promise.allSettled([
        enterpriseAPI.getSyncHealth(),
        actionsAPI.listPendingApprovals(),
        actionsAPI.listProposals(),
      ]);
      if (h.status === "fulfilled") setHealth(h.value);
      setApprovals(ap.status === "fulfilled" ? ap.value || [] : []);
      setProposals(
        pr.status === "fulfilled"
          ? (pr.value || []).filter((p) => p.status === "pending_approval")
          : [],
      );
      const denied = [h, ap, pr].some(
        (r) =>
          r.status === "rejected" &&
          /403|Forbidden|admin/i.test(r.reason?.message || ""),
      );
      if (denied)
        setError(
          "Some sections need an admin login (approvals). Sync + risk still load.",
        );
      else {
        const failed = [h, ap, pr].find((r) => r.status === "rejected");
        if (failed)
          setError(failed.reason?.message || "Unable to load retention ops");
      }
    } catch (e) {
      setError(e?.message || "Unable to load retention ops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lookup = async () => {
    if (!email.trim()) return;
    setError("");
    try {
      const r = await enterpriseAPI.getRiskExplain(email.trim());
      setRisk(r);
    } catch (e) {
      setError(e?.message || "Risk lookup failed");
    }
  };

  const decide = async (id, decision) => {
    try {
      await actionsAPI.decideProposal(id, decision);
      load();
    } catch (e) {
      setError(e?.message || "Decision failed");
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div className="text-cyan-300 text-xs font-extrabold uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={15} /> Retention Ops — live wired
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-white/10 text-slate-300"
          aria-label="Refresh retention ops"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <section className="premium-card p-4">
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <Activity size={14} /> Sync health (nightly HRIS)
        </div>
        {!health ? (
          <div className="text-xs text-slate-500 py-3">
            {loading ? "Loading…" : "No data"}
          </div>
        ) : (
          <div className="text-xs text-slate-300 mt-2 space-y-1">
            <div>
              Connections: {health.connections?.length || 0} · Quarantined:{" "}
              {health.quarantined_total || 0}
            </div>
            {(health.connections || []).map((c) => (
              <div key={c.id}>
                {c.name || c.provider} · {c.status} ·{" "}
                {c.last_sync_status || "never"} · {c.last_sync_summary || ""}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="premium-card p-4">
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <AlertTriangle size={14} /> HRIS signals (not a survival forecast)
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          This descriptive score summarizes stored sentiment, retention, and
          policy flags. It is not a calibrated probability of leaving.
        </p>
        <div className="flex gap-2 mt-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee email"
            className="flex-1 rounded-lg bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white"
          />
          <button
            onClick={lookup}
            className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs"
          >
            Explain
          </button>
        </div>
        {risk?.explanation && (
          <div className="text-xs text-slate-300 mt-2 space-y-1">
            <div>
              Score {risk.explanation.risk_score} · Tier {risk.explanation.tier}
            </div>
            {(risk.explanation.drivers || []).map((d, i) => (
              <div key={i}>
                · {d.driver}: {d.reason}
              </div>
            ))}
            <div className="text-slate-500">
              Org trend: {risk.org_trend?.direction} ({risk.org_trend?.delta})
            </div>
          </div>
        )}
      </section>

      <section className="premium-card p-4">
        <div className="text-xs font-bold text-white">
          Approvals inbox ({approvals.length} pending approvals ·{" "}
          {proposals.length} proposals)
        </div>
        <div className="space-y-2 mt-2">
          {approvals.map((a) => (
            <div
              key={a.id}
              className="text-xs text-slate-300 border border-white/10 rounded-lg p-2"
            >
              {a.action_type} · {a.reason || ""}
            </div>
          ))}
          {proposals.map((p) => (
            <div
              key={p.id}
              className="text-xs text-slate-300 border border-white/10 rounded-lg p-2 flex items-center justify-between"
            >
              <span>
                {p.action_type} · {p.provider}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => decide(p.id, "approve")}
                  className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-400/30"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(p.id, "reject")}
                  className="px-2 py-1 rounded bg-rose-500/20 border border-rose-400/30"
                >
                  Reject
                </button>
              </span>
            </div>
          ))}
          {!approvals.length && !proposals.length && !loading && (
            <div className="text-xs text-slate-500">Inbox clear.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RetentionOpsView;
