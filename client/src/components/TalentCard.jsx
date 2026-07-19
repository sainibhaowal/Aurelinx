import React from "react";
import { User, Briefcase, ExternalLink } from "lucide-react";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

const TalentCard = ({ talent, onOpenProfile }) => {
  const hasOpenAction = typeof onOpenProfile === "function";
  const riskProbability = talent.retention_prob ?? talent.match_score ?? 0;
  const statusLabel =
    typeof talent.is_at_risk === "boolean"
      ? talent.is_at_risk
        ? "At-Risk"
        : "Optimal"
      : talent.match_score != null
        ? "Candidate"
        : "Optimal";

  return (
    <Card
      onClick={onOpenProfile}
      variant="interactive"
      className="group h-full flex flex-col justify-between p-4 sm:p-5"
    >
      <div className="flex items-start gap-3.5 relative z-10 h-full">
        {/* Avatar Area */}
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 flex items-center justify-center border border-white/10 shrink-0 shadow-inner group-hover:from-indigo-500/20 transition-all duration-500">
          <User
            className="text-white/20 group-hover:text-cyan-400 transition-colors"
            size={18}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0 flex-1">
              <h3
                className="text-sm md:text-base font-extrabold text-white tracking-tight leading-snug truncate mb-1"
                title={talent.full_name}
              >
                {talent.full_name}
              </h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 min-w-0">
                <Briefcase size={10} className="text-indigo-400 shrink-0" />
                <span className="truncate flex-shrink" title={talent.role}>
                  {talent.role}
                </span>
                <span className="text-white/10 shrink-0">-</span>
                <span
                  className="truncate flex-shrink"
                  title={talent.department}
                >
                  {talent.department}
                </span>
              </p>
            </div>

            <Badge
              color={talent.is_at_risk ? "danger" : "success"}
              variant="glow"
              className="shrink-0 text-[8px] px-2 py-0.5 tracking-wider font-extrabold uppercase"
            >
              {statusLabel}
            </Badge>
          </div>

          {/* Skill Tag Pills */}
          <div className="flex flex-wrap gap-1.5 my-2.5">
            {talent.skills?.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5 text-[8px] font-bold text-slate-400 group-hover:text-slate-200 group-hover:border-indigo-500/20 transition-colors uppercase tracking-wider"
              >
                {skill.name}{" "}
                <span className="text-cyan-400 ml-1.5 font-black">
                  L{skill.level}
                </span>
              </span>
            ))}
          </div>

          {/* Footer Metrics */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto gap-3">
            <div className="flex gap-4 sm:gap-5">
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Sentiment
                </p>
                <p className="text-xs font-black text-white">
                  {talent.sentiment_score}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Risk Prob
                </p>
                <p className="text-xs font-black text-white">
                  {riskProbability ? (riskProbability * 100).toFixed(0) : "0"}%
                </p>
              </div>
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (hasOpenAction) onOpenProfile();
              }}
              disabled={!hasOpenAction}
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={12} />}
              className="w-8 h-8 p-0 rounded-lg hover:bg-indigo-600/20 hover:border-indigo-500/40 shrink-0"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TalentCard;
