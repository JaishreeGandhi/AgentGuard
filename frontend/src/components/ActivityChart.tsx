import React, { useState } from "react";
import { ActivityPoint, TimeRange, ViewStateMode } from "../types/dashboard";

interface ActivityChartProps {
  points: ActivityPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  mode: ViewStateMode;
  onTriggerRun: () => void;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  points,
  timeRange,
  onTimeRangeChange,
  mode,
  onTriggerRun
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (mode === "LOADING") {
    return (
      <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 h-[340px] flex flex-col justify-between animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 w-40 bg-slate-800 rounded"></div>
          <div className="h-6 w-24 bg-slate-800 rounded"></div>
        </div>
        <div className="h-48 w-full bg-slate-800/40 rounded my-4"></div>
        <div className="h-4 w-32 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || points.length === 0;
  const maxRuns = Math.max(...points.map((p) => p.total_runs), 100);

  return (
    <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]/60">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Execution Activity Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test volume and evaluation outcomes over time
          </p>
        </div>

        {/* Local time scale toggles */}
        <div className="flex items-center gap-1 bg-[#161f30] border border-[#1e293b] rounded-md p-0.5 text-[11px] font-medium">
          {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={`px-2 py-0.5 rounded transition-all ${
                timeRange === r
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Body */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mb-2.5">
            📊
          </div>
          <p className="text-xs font-medium text-slate-300">No Execution Activity Recorded</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Trigger an offline evaluation test run to view passing vs. failing activity trends.
          </p>
          <button
            onClick={onTriggerRun}
            className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium transition-colors"
          >
            + Run First Evaluation
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end pt-4 pb-2 relative">
          {/* Tooltip display */}
          <div className="h-6 mb-2 flex items-center justify-between text-xs font-mono">
            {hoveredIndex !== null && points[hoveredIndex] ? (
              <div className="flex items-center gap-3 bg-[#161f30] px-3 py-1 rounded-md border border-[#1e293b]">
                <span className="text-white font-semibold">{points[hoveredIndex].label}:</span>
                <span className="text-slate-300">{points[hoveredIndex].total_runs} Total</span>
                <span className="text-emerald-400 font-medium">({points[hoveredIndex].passed_runs} Passed)</span>
                {points[hoveredIndex].failed_runs > 0 && (
                  <span className="text-rose-400 font-medium">({points[hoveredIndex].failed_runs} Failed)</span>
                )}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px]">Hover over bars to inspect daily metrics</span>
            )}
            <div className="flex items-center gap-3 text-[11px] font-sans">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Passed
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                Failed
              </span>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="flex items-end justify-between gap-2 h-40 border-b border-[#1e293b] pb-1 px-2">
            {points.map((pt, idx) => {
              const passHeight = Math.round((pt.passed_runs / maxRuns) * 100);
              const failHeight = Math.round((pt.failed_runs / maxRuns) * 100);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                >
                  <div className="w-full max-w-[36px] h-32 flex flex-col justify-end items-stretch transition-transform group-hover:scale-y-[1.03]">
                    {/* Failed Segment (Rose) */}
                    {pt.failed_runs > 0 && (
                      <div
                        className={`w-full bg-rose-500 rounded-t-sm transition-opacity ${
                          isHovered ? "opacity-100" : "opacity-80"
                        }`}
                        style={{ height: `${Math.max(failHeight, 3)}%` }}
                      ></div>
                    )}
                    {/* Passed Segment (Emerald) */}
                    <div
                      className={`w-full bg-emerald-500 transition-opacity ${
                        pt.failed_runs === 0 ? "rounded-t-sm" : ""
                      } ${isHovered ? "opacity-100 brightness-110" : "opacity-85"}`}
                      style={{ height: `${Math.max(passHeight, 4)}%` }}
                    ></div>
                  </div>
                  <span
                    className={`text-[10px] font-mono mt-2 transition-colors ${
                      isHovered ? "text-cyan-400 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

