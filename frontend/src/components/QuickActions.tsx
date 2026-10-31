import React from "react";
import { PlusCircle, FileText, ListFilter, AlertOctagon } from "lucide-react";

interface QuickActionsProps {
  onFilterFailed: () => void;
  onViewAllTraces: () => void;
  onNewAgent: () => void;
  onNewSuite: () => void;
  failedCount?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onFilterFailed,
  onViewAllTraces,
  onNewAgent,
  onNewSuite,
  failedCount = 82
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5 py-1">
      <button
        onClick={onNewAgent}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101622] hover:bg-[#161f30] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-medium transition-colors"
      >
        <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
        <span>+ New Agent</span>
      </button>

      <button
        onClick={onNewSuite}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101622] hover:bg-[#161f30] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-medium transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-purple-400" />
        <span>+ New Test Suite</span>
      </button>

      <button
        onClick={onViewAllTraces}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101622] hover:bg-[#161f30] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-medium transition-colors"
      >
        <ListFilter className="w-3.5 h-3.5 text-slate-400" />
        <span>View All Traces</span>
      </button>

      <button
        onClick={onFilterFailed}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
      >
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        <span>Inspect Failed Runs ({failedCount})</span>
      </button>
    </div>
  );
};

