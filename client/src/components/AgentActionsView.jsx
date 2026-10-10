import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { actionsAPI } from "../services/apiClient";

const statusStyle = {
  pending_approval: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  approved: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
  running: "text-blue-300 border-blue-400/30 bg-blue-400/10",
  completed: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  rejected: "text-rose-300 border-rose-400/30 bg-rose-400/10",
  failed: "text-rose-300 border-rose-400/30 bg-rose-400/10",
  expired: "text-slate-300 border-white/15 bg-white/5",
};

const AgentActionsView = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextProposals, nextCapabilities] = await Promise.all([
        actionsAPI.listProposals(),
        actionsAPI.listCapabilities(),
      ]);
      setProposals(nextProposals || []);
      setCapabilities(nextCapabilities?.connections || []);
    } catch (err) {
      setError(err?.message || "Unable to load action proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (proposal, operation) => {
    setBusy(proposal.id);
    setError("");
    try {
      const next =
        operation === "execute"
          ? await actionsAPI.executeProposal(proposal.id)
          : await actionsAPI.decideProposal(proposal.id, operation);
      setProposals((items) =>
        items.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (err) {
      setError(err?.message || "Action update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="premium-card p-5 space-y-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-extrabold uppercase tracking-widest">
            <ShieldCheck size={15} /> Agent Actions &amp; Approvals
          </div>
          <p className="text-xs text-slate-400 mt-1">
            External HR actions remain blocked until an authorized reviewer
            approves them.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/10"
          aria-label="Refresh action proposals"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}
      {capabilities.length > 0 && (
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.03] p-3">
          <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-2">
            Connected action capabilities
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {capabilities.map((item) => (
              <div
                key={item.connection_id}
                className="text-[10px] text-slate-300"
              >
                <span className="font-bold text-white">
                  {item.name || item.provider}
                </span>
                <span className="text-slate-500"> · </span>
                {item.supported_actions?.length
                  ? item.supported_actions.join(", ")
                  : "No outbound actions declared"}
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && !proposals.length ? (
        <div className="text-xs text-slate-500 py-6">
          Loading governed actions…
        </div>
      ) : null}
      {!loading && !proposals.length ? (
        <div className="text-xs text-slate-500 py-6">
          No action proposals require review.
        </div>
      ) : null}
      <div className="space-y-2">
        {proposals.map((proposal) => {
          const status = proposal.status || "pending_approval";
          const waiting = busy === proposal.id;
          return (
            <div
              key={proposal.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    {proposal.action_type}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {proposal.provider} · {proposal.id}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle[status] || statusStyle.expired}`}
                >
                  {status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Requested{" "}
                {proposal.created_at
                  ? new Date(proposal.created_at).toLocaleString()
                  : "—"}
              </div>
              {proposal.failure_reason && (
                <div className="text-xs text-rose-300">
                  {proposal.failure_reason}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {status === "pending_approval" && (
                  <>
                    <button
                      disabled={waiting}
                      onClick={() => update(proposal, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button
                      disabled={waiting}
                      onClick={() => update(proposal, "reject")}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                )}
                {status === "approved" && (
                  <button
                    disabled={waiting}
                    onClick={() => update(proposal, "execute")}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200"
                  >
                    <Play size={13} /> Execute approved action
                  </button>
                )}
                {waiting && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Clock3 size={13} /> Working…
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AgentActionsView;
