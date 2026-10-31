import React from "react";
import { AlertCircle, Search, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { FailureCategory, ViewStateMode } from "../types/dashboard";

interface FailureInsightsProps {
  failures: FailureCategory[];
  totalFailures: number;
  mode: ViewStateMode;
  onSelectFailureType: (failureType: string) => void;
}

export const FailureInsights: React.FC<FailureInsightsProps> = ({
  failures,
  totalFailures,
  mode,
  onSelectFailureType
}) => {
  if (mode === "LOADING") {
    return (
      <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 animate-pulse">
        <div className="h-4 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#161f30] rounded-lg p-4 h-28"></div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || totalFailures === 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "WRONG_TOOL_SELECTION":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case "GROUNDING_HALLUCINATION":
        return <Search className="w-4 h-4 text-purple-400" />;
      case "REPEATED_TOOL_CALLS":
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case "LATENCY_BUDGET_VIOLATION":
        return <Clock className="w-4 h-4 text-sky-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]/60">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Failure Insights
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {isEmpty ? "0 recorded failures" : `Computed from ${totalFailures} recorded assertion failures`}
          </span>
        </div>
      </div>

      {/* Body */}
      {isEmpty ? (
        <div className="flex items-center gap-3.5 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg p-4 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="font-semibold text-emerald-300">Zero Failures Recorded</div>
            <div className="text-emerald-400/80 mt-0.5">
              All tested agent executions in the active window passed 100% of configured assertions.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {failures.map((f, idx) => (
            <div
              key={idx}
              onClick={() => onSelectFailureType(f.failure_type)}
              className="bg-[#161f30] hover:bg-[#1c273d] border border-[#1e293b] hover:border-slate-700 rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getIcon(f.failure_type)}
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {f.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-lg font-bold font-mono text-white">
                    {f.count} runs
                  </span>
                  <span className="text-xs font-mono text-rose-400 font-medium">
                    ({f.percentage.toFixed(1)}%)
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {f.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1e293b]/80 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-cyan-400 transition-colors">
                <span>Filter trace table</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

