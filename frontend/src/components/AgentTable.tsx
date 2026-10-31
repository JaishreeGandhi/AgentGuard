import React, { useState } from "react";
import { Play, Search, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { AgentPerformanceItem, AgentStatus, ViewStateMode } from "../types/dashboard";

interface AgentTableProps {
  agents: AgentPerformanceItem[];
  mode: ViewStateMode;
  onRunEval: (agentId: string) => void;
}

export const AgentTable: React.FC<AgentTableProps> = ({ agents, mode, onRunEval }) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (mode === "LOADING") {
    return (
      <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5 animate-pulse">
        <div className="h-4 w-44 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/60 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = mode === "EMPTY" || agents.length === 0;

  const filteredAgents = agents.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const renderStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Passed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Running
          </span>
        );
      case "NOT_TESTED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800/40 border border-slate-700/40 text-slate-400">
            <MinusCircle className="w-3 h-3" />
            Not Tested
          </span>
        );
    }
  };

  return (
    <div className="bg-[#101622] border border-[#1e293b] rounded-xl p-5">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]/60 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Agent Performance Table
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side reliability and efficiency benchmarks for registered agents
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#161f30] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="NOT_TESTED">Not Tested</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agents..."
              className="bg-[#161f30] border border-[#1e293b] rounded-md pl-8 pr-3 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isEmpty ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No registered agents found. Click &quot;+ New Agent&quot; above to add your first agent.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e293b] text-slate-400 font-semibold bg-[#161f30]/40">
                <th className="py-2.5 px-3">AGENT NAME</th>
                <th className="py-2.5 px-3">BASE MODEL</th>
                <th className="py-2.5 px-3 text-right">TESTS</th>
                <th className="py-2.5 px-3">SUCCESS RATE</th>
                <th className="py-2.5 px-3 text-right">FAILED</th>
                <th className="py-2.5 px-3 text-right">AVG LATENCY</th>
                <th className="py-2.5 px-3 text-right">TOKENS</th>
                <th className="py-2.5 px-3 text-center">STATUS**</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredAgents.map((agent) => (
                <tr
                  key={agent.agent_id}
                  className="hover:bg-[#161f30]/50 transition-colors group"
                >
                  <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                    <span>{agent.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({agent.available_tools.join(", ")})</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono">{agent.model}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {agent.tests_executed.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {agent.success_rate_pct !== null ? (
                      <span className="text-emerald-400 font-medium">
                        {agent.success_rate_pct.toFixed(1)}%{" "}
                        <span className="text-slate-500 text-[10px]">({agent.passed_count})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">--</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {agent.failed_count > 0 ? (
                      <span className="text-rose-400 font-medium">{agent.failed_count}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {agent.avg_latency_s !== null ? `${agent.avg_latency_s.toFixed(2)}s` : "--"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {agent.tokens_formatted}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderStatusBadge(agent.status)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onRunEval(agent.agent_id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161f30] hover:bg-cyan-500/20 border border-[#1e293b] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 font-medium transition-all"
                    >
                      <Play className="w-3 h-3 fill-current text-cyan-400" />
                      <span>Run Eval</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-3 mt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>** Status strictly reflects LATEST evaluation execution, not historical average</span>
        <span>4 Registered Agents</span>
      </div>
    </div>
  );
};
