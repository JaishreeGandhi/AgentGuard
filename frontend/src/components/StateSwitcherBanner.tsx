import React from "react";
import { ViewStateMode } from "../types/dashboard";
import { RefreshCw, Database } from "lucide-react";

interface StateSwitcherBannerProps {
  currentMode: ViewStateMode;
  onModeChange: (mode: ViewStateMode) => void;
  onResetDb: (empty: boolean) => void;
}

export const StateSwitcherBanner: React.FC<StateSwitcherBannerProps> = ({
  currentMode,
  onModeChange,
  onResetDb
}) => {
  return (
    <div className="w-full bg-[#161f30]/80 border-b border-[#1e293b] px-6 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
          UI State Preview:
        </span>
        <div className="flex items-center gap-1">
          {(["LIVE", "EMPTY", "LOADING", "ERROR"] as ViewStateMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-all ${
                currentMode === mode
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode === "LIVE"
                ? "Live Operational"
                : mode === "EMPTY"
                ? "Empty State (--)"
                : mode === "LOADING"
                ? "Loading Skeleton"
                : "Error State"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onResetDb(false)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
          title="Restore standard sample data in SQLite"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Re-seed DB</span>
        </button>

        <button
          onClick={() => onResetDb(true)}
          className="flex items-center gap-1 text-[11px] text-rose-400/80 hover:text-rose-300 transition-colors"
          title="Clear SQLite to 0 records"
        >
          <Database className="w-3 h-3" />
          <span>Clear DB (Empty)</span>
        </button>
      </div>
    </div>
  );
};

