import React from "react";
import { Play } from "lucide-react";
import { TimeRange } from "../types/dashboard";

interface PageHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onOpenRunModal: () => void;
  isEngineReady?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  timeRange,
  onTimeRangeChange,
  onOpenRunModal,
  isEngineReady = true
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
      {/* Title & Engine Status */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Agent Overview
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isEngineReady ? "Evaluation Engine Ready" : "Initializing..."}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Monitor agent reliability, inspect tool execution timelines, and identify root-cause failure modes.
        </p>
      </div>

      {/* Right Controls: Time Range + Primary CTA */}
      <div className="flex items-center gap-3">
        {/* Segmented Time Range */}
        <div className="flex items-center bg-[#161f30] border border-[#1e293b] rounded-lg p-0.5 text-xs font-medium">
          {(["24h", "7d", "30d"] as TimeRange[]).map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {range === "24h" ? "24h" : range === "7d" ? "Last 7d" : "Last 30d"}
              </button>
            );
          })}
        </div>

        {/* Primary CTA */}
        <button
          onClick={onOpenRunModal}
          className="flex items-center gap-2 bg-[#06b6d4] hover:bg-cyan-400 text-[#0a0d14] font-semibold text-xs px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>+ Run Evaluation</span>
        </button>
      </div>
    </div>
  );
};
