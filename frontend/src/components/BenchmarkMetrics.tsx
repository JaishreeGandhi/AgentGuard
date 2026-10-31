import React from "react";
import { EvaluationBenchmarks, ViewStateMode } from "../types/dashboard";

interface BenchmarkMetricsProps {
  metrics: EvaluationBenchmarks | null;
  mode: ViewStateMode;
}

export const BenchmarkMetrics: React.FC<BenchmarkMetricsProps> = ({ metrics, mode }) => {
  if (mode === "LOADING") {
    return (
      <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 h-[340px] flex flex-col justify-between animate-pulse">
        <div className="h-4 w-36 bg-slate-800 rounded"></div>
        <div className="space-y-4 my-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-slate-800 rounded"></div>
                <div className="h-3 w-10 bg-slate-800 rounded"></div>
              </div>
              <div className="h-2 w-full bg-slate-800/60 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || !metrics || metrics.evaluated_runs_count === 0;

  const items = [
    {
      label: "Tool Selection Accuracy",
      value: isEmpty || metrics.tool_selection_accuracy === null ? null : metrics.tool_selection_accuracy,
      color: "bg-cyan-400",
      description: "Appropriate tool chosen for query context"
    },
    {
      label: "Answer Correctness",
      value: isEmpty || metrics.answer_correctness === null ? null : metrics.answer_correctness,
      color: "bg-purple-400",
      description: "Deterministic & semantic assertion match"
    },
    {
      label: "Grounding Score",
      value: isEmpty || metrics.grounding_score === null ? null : metrics.grounding_score,
      color: "bg-emerald-400",
      description: "Output fully derived from tool contexts"
    },
    {
      label: "Task Completion Rate",
      value: isEmpty || metrics.task_completion_rate === null ? null : metrics.task_completion_rate,
      color: "bg-sky-400",
      description: "Finished without unhandled error or loop"
    },
    {
      label: "Tool Efficiency",
      value: isEmpty || metrics.tool_efficiency === null ? null : metrics.tool_efficiency,
      color: "bg-amber-400",
      description: "Completed without redundant tool loops"
    }
  ];

  return (
    <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between h-[340px]">
      {/* Header */}
      <div className="pb-2 border-b border-[#1e293b]/60">
        <h2 className="text-sm font-semibold text-white tracking-wide">
          Evaluation Metrics
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
          {isEmpty
            ? "Awaiting completed evaluations"
            : `Calculated across ${metrics.evaluated_runs_count.toLocaleString()} completed evaluations`}
        </p>
      </div>

      {/* Progress Bars */}
      <div className="flex-1 flex flex-col justify-around py-2">
        {items.map((item, idx) => {
          const valDisplay = item.value !== null ? `${item.value.toFixed(1)}%` : "--";
          const barWidth = item.value !== null ? `${item.value}%` : "0%";

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                  {item.label}
                </span>
                <span className="font-mono text-slate-200 font-semibold">{valDisplay}</span>
              </div>
              <div className="w-full h-1.5 bg-[#161f30] rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: barWidth }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="pt-2 border-t border-[#1e293b]/60">
        <span className="text-[10px] text-slate-500 font-mono">
          * Shows &quot;--&quot; when 0 applicable test assertions exist
        </span>
      </div>
    </div>
  );
};

