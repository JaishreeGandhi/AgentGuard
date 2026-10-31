import React, { useState } from "react";
import { Search, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { TraceSummaryItem, ViewStateMode } from "../types/dashboard";

interface TraceTableProps {
  traces: TraceSummaryItem[];
  mode: ViewStateMode;
  onSelectTrace: (traceId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const TraceTable: React.FC<TraceTableProps> = ({
  traces,
  mode,
  onSelectTrace,
  statusFilter,
  onStatusFilterChange
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (mode === "LOADING") {
    return (
      <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 animate-pulse">
        <div className="h-4 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/60 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || traces.length === 0;

  const filteredTraces = traces.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (
      searchTerm &&
      !t.user_query.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.trace_id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const renderToolBadge = (toolName: string, idx: number) => {
    let classes = "bg-slate-800/60 text-slate-300 border-slate-700/50";
    if (toolName.includes("Document Search")) {
      classes = "bg-blue-950/60 text-blue-400 border-blue-800/40";
    } else if (toolName.includes("Calculator")) {
      classes = "bg-purple-950/60 text-purple-400 border-purple-800/40";
    } else if (toolName.includes("Web Search")) {
      classes = "bg-sky-950/60 text-sky-400 border-sky-800/40";
    }

    return (
      <span
        key={idx}
        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${classes}`}
      >
        {toolName}
      </span>
    );
  };

  return (
    <div id="recent-traces-table" className="bg-[#101622] border border-[#1e293b] rounded-xl p-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]/60 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Recent Execution Traces
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Granular event logs and tool invocations across test scenarios (Click any row to inspect timeline)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-[#161f30] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED">Passed Only</option>
            <option value="FAILED">Failed Only</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search queries, trace IDs..."
              className="bg-[#161f30] border border-[#1e293b] rounded-md pl-8 pr-3 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isEmpty ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No execution traces found. Execute a test suite to view execution telemetry.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e293b] text-slate-400 font-semibold bg-[#161f30]/40">
                <th className="py-2.5 px-3">TRACE ID</th>
                <th className="py-2.5 px-3">AGENT</th>
                <th className="py-2.5 px-3">USER QUERY SAMPLE</th>
                <th className="py-2.5 px-3">TOOLS CALLED</th>
                <th className="py-2.5 px-3 text-right">TIME</th>
                <th className="py-2.5 px-3 text-right">TOKENS</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3">FAILURE CODE</th>
                <th className="py-2.5 px-3 text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredTraces.map((trace) => (
                <tr
                  key={trace.trace_id}
                  onClick={() => onSelectTrace(trace.trace_id)}
                  className={`cursor-pointer transition-colors group ${
                    trace.status === "FAILED"
                      ? "hover:bg-rose-500/[0.05]"
                      : "hover:bg-[#161f30]/60"
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-medium text-cyan-400 group-hover:underline">
                    {trace.trace_id}
                  </td>
                  <td className="py-3 px-3 text-white font-medium">{trace.agent_name}</td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={trace.user_query}>
                    &quot;{trace.user_query}&quot;
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {trace.tools_called.map((tool, i) => renderToolBadge(tool, i))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {trace.duration_s.toFixed(2)}s
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {trace.tokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {trace.status === "PASSED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
                        <XCircle className="w-2.5 h-2.5" />
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">
                    {trace.failure_code ? (
                      <span className="text-rose-400 font-medium">{trace.failure_code}</span>
                    ) : (
                      <span className="text-slate-500">--</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 group-hover:text-cyan-400 transition-colors">
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

