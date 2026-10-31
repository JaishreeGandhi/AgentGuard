import React from "react";
import { CheckCircle2, AlertTriangle, Clock, Coins, Layers, ArrowUpRight } from "lucide-react";
import { SummaryAnalytics, ViewStateMode } from "../types/dashboard";

interface MetricCardsProps {
  data: SummaryAnalytics | null;
  mode: ViewStateMode;
  onFilterFailed: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ data, mode, onFilterFailed }) => {
  if (mode === "LOADING") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[#101622] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between h-[116px] animate-pulse"
          >
            <div className="h-3 w-20 bg-slate-800 rounded"></div>
            <div className="h-7 w-24 bg-slate-800 rounded my-2"></div>
            <div className="h-3 w-32 bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (mode === "ERROR") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[#101622] border border-rose-900/30 rounded-xl p-4 flex flex-col justify-between h-[116px]"
          >
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Metric</span>
            <span className="text-xl font-mono font-bold text-rose-400">--</span>
            <span className="text-[10px] text-rose-400/80">Error loading data</span>
          </div>
        ))}
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || !data || data.total_executions === 0;

  // Format values
  const totalExecutions = isEmpty ? "--" : data.total_executions.toLocaleString();
  const successRate = isEmpty ? "--" : `${data.success_rate.toFixed(1)}%`;
  const failedExecutions = isEmpty ? "--" : data.failed_executions.toLocaleString();
  const avgLatency = isEmpty ? "--" : `${data.avg_latency_s.toFixed(2)}s`;
  const tokenUsage = isEmpty
    ? "--"
    : data.total_tokens >= 1000000
    ? `${(data.total_tokens / 1000000).toFixed(2)}M`
    : `${(data.total_tokens / 1000).toFixed(1)}k`;
  const estCost = isEmpty ? "$0.00" : `$${data.estimated_cost_usd.toFixed(2)}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Total Test Executions */}
      <div className="bg-[#101622] border border-[#1e293b] hover:border-[#334155] transition-colors rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Executions
          </span>
          <Layers className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="my-1.5">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalExecutions}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
          {isEmpty ? (
            <span>No evaluations recorded</span>
          ) : (
            <>
              <span className="text-emerald-400 font-mono flex items-center">
                <ArrowUpRight className="w-3 h-3" />+{data.executions_delta_percent}%
              </span>
              <span className="text-slate-500">({data.test_suites_count} suites)</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Success Rate */}
      <div className="bg-[#101622] border border-[#1e293b] hover:border-[#334155] transition-colors rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Success Rate
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <div className={`text-2xl font-bold font-mono tracking-tight ${isEmpty ? "text-slate-500" : "text-emerald-400"}`}>
            {successRate}
          </div>
        </div>
        <div className="w-full">
          {!isEmpty ? (
            <div>
              <div className="w-full h-1.5 bg-[#161f30] rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${data.success_rate}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {data.passed_executions} of {data.total_executions} passed
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">Awaiting first run</span>
          )}
        </div>
      </div>

      {/* 3. Failed Executions */}
      <div
        onClick={onFilterFailed}
        className={`bg-[#101622] border border-[#1e293b] hover:border-rose-500/40 transition-colors rounded-xl p-4 flex flex-col justify-between cursor-pointer group ${
          !isEmpty && data.failed_executions > 0 ? "hover:bg-rose-500/[0.03]" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Failed Tests
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="my-1.5">
          <div className={`text-2xl font-bold font-mono tracking-tight ${isEmpty ? "text-slate-500" : "text-rose-400"}`}>
            {failedExecutions}
          </div>
        </div>
        <div className="text-[11px] text-rose-400/90 group-hover:text-rose-300 font-medium truncate flex items-center gap-1">
          {isEmpty ? "0 failures detected" : "Click to filter traces →"}
        </div>
      </div>

      {/* 4. Average Latency */}
      <div className="bg-[#101622] border border-[#1e293b] hover:border-[#334155] transition-colors rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Avg Latency
          </span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="my-1.5">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {avgLatency}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 truncate font-mono">
          {isEmpty ? "No latency data" : `p95: ${data.p95_latency_s.toFixed(2)}s`}
        </div>
      </div>

      {/* 5. Token Usage */}
      <div className="bg-[#101622] border border-[#1e293b] hover:border-[#334155] transition-colors rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Token Usage
          </span>
          <span className="text-[10px] font-mono text-cyan-400">Tokens</span>
        </div>
        <div className="my-1.5">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {tokenUsage}
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          {isEmpty
            ? "0 tokens logged"
            : `In:${(data.prompt_tokens / 1000).toFixed(0)}k Out:${(data.completion_tokens / 1000).toFixed(0)}k`}
        </div>
      </div>

      {/* 6. Estimated API Cost */}
      <div className="bg-[#101622] border border-[#1e293b] hover:border-[#334155] transition-colors rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Est. API Cost
          </span>
          <Coins className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="my-1.5">
          <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            {estCost}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {isEmpty ? "No charges" : "Gemini Flash card"}
        </div>
      </div>
    </div>
  );
};
