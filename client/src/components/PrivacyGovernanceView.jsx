import { useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { privacyAPI } from "../services/apiClient";

export default function PrivacyGovernanceView() {
  const [data, setData] = useState({
    consents: [],
    retention: [],
    sensitive: [],
    exports: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyConsent, setBusyConsent] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [consents, retention, sensitive, exports] = await Promise.all([
        privacyAPI.listConsents(),
        privacyAPI.listRetentionPolicies(),
        privacyAPI.listSensitiveFields(),
        privacyAPI.listExports(),
      ]);
      setData({
        consents: consents || [],
        retention: retention || [],
        sensitive: sensitive || [],
        exports: exports || [],
      });
    } catch (err) {
      setError(err?.message || "Privacy controls could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const withdraw = async (id) => {
    setBusyConsent(id);
    setError("");
    try {
      await privacyAPI.withdrawConsent(id);
      await load();
    } catch (err) {
      setError(err?.message || "Consent withdrawal failed");
    } finally {
      setBusyConsent(null);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-[#06101e]/80 p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
            <Lock size={15} /> Privacy controls
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Tenant-scoped legal basis, retention, and sensitive-field policies.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
          title="Refresh privacy controls"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ["Legal-basis records", data.consents.length],
          ["Retention schedules", data.retention.length],
          ["Sensitive-field rules", data.sensitive.length],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="text-2xl font-mono text-white mt-1">
              {loading ? "—" : count}
            </div>
          </div>
        ))}
      </div>
      {data.consents.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Consent records
          </div>
          {data.consents.slice(0, 10).map((consent) => (
            <div
              key={consent.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
            >
              <div>
                <span className="text-white font-semibold">
                  {consent.purpose}
                </span>
                <span className="text-slate-500">
                  {" "}
                  · {consent.region} · {consent.legal_basis}
                </span>
                <div className="text-[10px] text-slate-500">
                  Subject: {consent.subject_ref}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase ${consent.status === "active" ? "text-emerald-300" : "text-slate-400"}`}
                >
                  {consent.status}
                </span>
                {consent.status === "active" && (
                  <button
                    disabled={busyConsent === consent.id}
                    onClick={() => withdraw(consent.id)}
                    className="rounded-md border border-rose-400/30 px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"
                  >
                    {busyConsent === consent.id ? "Withdrawing…" : "Withdraw"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.retention.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Retention schedules
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.retention.slice(0, 10).map((policy) => (
              <div
                key={policy.id}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
              >
                <span className="text-white font-semibold">
                  {policy.data_class}
                </span>
                <span className="text-slate-500"> · {policy.region}</span>
                <div className="text-[10px] text-slate-400">
                  {policy.retention_days} days · {policy.deletion_mode}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.sensitive.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Sensitive-field rules
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.sensitive.slice(0, 10).map((policy) => (
              <div
                key={policy.id}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
              >
                <span className="text-white font-semibold">
                  {policy.entity}.{policy.field_name}
                </span>
                <span className="text-slate-500">
                  {" "}
                  · {policy.classification}
                </span>
                <div className="text-[10px] text-slate-400">
                  {policy.redaction_mode} · roles:{" "}
                  {(policy.allowed_roles || []).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.exports.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Export requests
          </div>
          {data.exports.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.03] px-3 py-2 text-xs"
            >
              <div>
                <span className="text-white font-semibold">{item.scope}</span>
                <span className="text-slate-500"> · {item.region}</span>
                <div className="text-[10px] text-slate-400">{item.purpose}</div>
              </div>
              <span className="text-[10px] uppercase text-amber-300">
                {item.status?.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">
        Creating or changing a policy remains an explicit administrator
        operation. Destructive data actions continue to require approval.
      </p>
    </section>
  );
}
