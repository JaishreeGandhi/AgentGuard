import React, { useState, useEffect } from "react";
import { X, Play, Layers, Cpu, CheckCircle } from "lucide-react";
import { AgentPerformanceItem, SuiteDetail } from "../types/dashboard";
import { fetchSuites, triggerEvaluationRun } from "../api/client";

interface RunEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentPerformanceItem[];
  initialAgentId?: string | null;
  onRunStarted: () => void;
}

export const RunEvaluationModal: React.FC<RunEvaluationModalProps> = ({
  isOpen,
  onClose,
  agents,
  initialAgentId,
  onRunStarted
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [suites, setSuites] = useState<SuiteDetail[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultId = initialAgentId || (agents.length > 0 ? agents[0].agent_id : "");
      setSelectedAgentId(defaultId);
      if (defaultId) {
        fetchSuites(defaultId).then((data) => {
          setSuites(data);
          if (data.length > 0) setSelectedSuiteId(data[0].id);
        });
      }
    }
  }, [isOpen, initialAgentId, agents]);

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    fetchSuites(agentId).then((data) => {
      setSuites(data);
      if (data.length > 0) setSelectedSuiteId(data[0].id);
    });
  };

  const handleExecute = async () => {
    if (!selectedAgentId || !selectedSuiteId) return;

    setIsSubmitting(true);
    setRunMessage(null);
    try {
      const res = await triggerEvaluationRun(selectedAgentId, selectedSuiteId);
      setRunMessage(res.message);
      setTimeout(() => {
        setIsSubmitting(false);
        onRunStarted();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert("Error triggering evaluation: " + err.message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeAgent = agents.find((a) => a.agent_id === selectedAgentId);
  const activeSuite = suites.find((s) => s.id === selectedSuiteId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-[#101622] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#161f30]/60">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              RUN AGENT EVALUATION
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Trigger an offline evaluation test run against stored assertions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Agent Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Agent to Evaluate *
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="w-full bg-[#161f30] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.name} ({a.model})
                </option>
              ))}
            </select>
            {activeAgent && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Tools available:</span>
                <span className="font-mono text-cyan-400">
                  {activeAgent.available_tools.join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Test Suite Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Test Suite *
            </label>
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              className="w-full bg-[#161f30] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.total_cases} test cases)
                </option>
              ))}
            </select>
            {activeSuite && (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Description: {activeSuite.description}
              </p>
            )}
          </div>

          {/* Scope Summary Box */}
          <div className="p-4 rounded-xl bg-[#161f30] border border-[#1e293b] space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Evaluation Scope Summary
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Target:</span>
                <span className="font-semibold text-slate-200">
                  {activeAgent?.name || "Agent"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-400">Test Cases:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {activeSuite?.total_cases || 50} cases
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Framework:</span>
                <span className="font-mono text-xs text-slate-300">LangGraph Local</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Evaluator:</span>
                <span className="font-mono text-xs text-emerald-400">Assertion Engine</span>
              </div>
            </div>
          </div>

          {runMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{runMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#1e293b] bg-[#161f30]/40 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-[#161f30] hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExecute}
            disabled={isSubmitting || !selectedAgentId || !selectedSuiteId}
            className="flex items-center gap-2 bg-[#06b6d4] hover:bg-cyan-400 text-[#0a0d14] font-semibold text-xs px-5 py-2 rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSubmitting ? "Dispatching..." : "Execute Test Cases (▶)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

