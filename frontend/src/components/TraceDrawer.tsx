import React, { useEffect, useState } from "react";
import { X, Download, AlertTriangle, CheckCircle2, XCircle, Terminal } from "lucide-react";
import { TraceDetailResponse } from "../types/dashboard";
import { fetchTraceDetail } from "../api/client";

interface TraceDrawerProps {
  traceId: string | null;
  onClose: () => void;
}

export const TraceDrawer: React.FC<TraceDrawerProps> = ({ traceId, onClose }) => {
  const [detail, setDetail] = useState<TraceDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchTraceDetail(traceId)
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load trace detail");
        setLoading(false);
      });
  }, [traceId]);

  if (!traceId) return null;

  const downloadJson = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail.raw_trace_json, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentguard-trace-${traceId.replace("#", "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-[#101622] border-l border-[#1e293b] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#161f30]/60">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-base text-cyan-400">
                  TRACE INSPECTOR: {traceId}
                </span>
                {detail && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                      detail.status === "PASSED"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {detail.status === "PASSED" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {detail.status}
                  </span>
                )}
              </div>
              {detail && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                  <span>Agent: <strong className="text-white font-sans">{detail.agent_name}</strong></span>
                  <span>•</span>
                  <span>Model: {detail.model}</span>
                  <span>•</span>
                  <span>Duration: {detail.duration_s}s</span>
                  <span>•</span>
                  <span>Tokens: {detail.total_tokens.toLocaleString()}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Observable Execution Timeline */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]/60">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Observable Execution Timeline
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Privacy: Internal Chain-of-Thought concealed)
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading execution steps...
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* Steps */}
                {detail.steps && detail.steps.length > 0 ? (
                  detail.steps.map((st) => (
                    <div
                      key={st.step_index}
                      className="relative pl-6 pb-2 border-l-2 border-[#1e293b] last:border-l-0"
                    >
                      {/* Timeline Node Dot */}
                      <div
                        className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-mono ${
                          st.flag_warning
                            ? "bg-rose-950 border-rose-500 text-rose-300"
                            : st.step_type === "TOOL_SELECTION"
                            ? "bg-cyan-950 border-cyan-400 text-cyan-300"
                            : st.step_type === "FINAL_RESPONSE"
                            ? "bg-emerald-950 border-emerald-400 text-emerald-300"
                            : "bg-slate-900 border-slate-600 text-slate-300"
                        }`}
                      >
                        {st.step_index}
                      </div>

                      {/* Step Card */}
                      <div className="bg-[#161f30] border border-[#1e293b] rounded-lg p-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200">
                            {st.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>+{st.timestamp_offset_s.toFixed(2)}s</span>
                            {st.tokens > 0 && <span>| {st.tokens} tokens</span>}
                          </div>
                        </div>

                        {/* Tool selection specifics */}
                        {st.tool_name && (
                          <div className="text-xs text-slate-300 mb-1.5 flex items-center gap-2">
                            <span className="text-slate-500">Selected Tool:</span>
                            <span className="font-mono px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 text-[11px]">
                              {st.tool_name}
                            </span>
                            {st.assertion_match && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  st.assertion_match === "YES"
                                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                    : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                }`}
                              >
                                Assertion: {st.assertion_match}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Flag / Warning */}
                        {st.flag_warning && (
                          <div className="mb-2 p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <span>{st.flag_warning}</span>
                          </div>
                        )}

                        {/* Input / Output payload JSON */}
                        {st.tool_input && (
                          <pre className="mt-1 p-2 rounded bg-[#0a0d14] text-[11px] font-mono text-cyan-300/90 overflow-x-auto border border-[#1e293b]/50">
                            {JSON.stringify(st.tool_input, null, 2)}
                          </pre>
                        )}

                        {st.tool_output && (
                          <pre className="mt-1.5 p-2 rounded bg-[#0a0d14] text-[11px] font-mono text-slate-300 overflow-x-auto border border-[#1e293b]/50">
                            {JSON.stringify(st.tool_output, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg bg-[#161f30] border border-[#1e293b] text-slate-400 text-xs font-mono">
                    No granular intermediate event steps recorded for this execution trace.
                  </div>
                )}

                {/* Evaluation Checklist Result */}
                <div className="mt-4 p-4 rounded-xl bg-[#161f30] border border-[#1e293b]">
                  <div className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                    <span>EVALUATION RESULT CHECKLIST</span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        detail.status === "PASSED" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      Status: {detail.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {detail.checklist.map((chk, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {chk.status === "PASSED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span
                            className={`font-semibold ${
                              chk.status === "PASSED" ? "text-slate-200" : "text-rose-300"
                            }`}
                          >
                            {chk.label}:{" "}
                          </span>
                          <span
                            className={
                              chk.status === "PASSED" ? "text-slate-400" : "text-rose-200/90"
                            }
                          >
                            {chk.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-3.5 border-t border-[#1e293b] bg-[#161f30]/40 flex items-center justify-between">
            <button
              onClick={downloadJson}
              disabled={!detail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161f30] hover:bg-slate-800 border border-[#1e293b] text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Raw Trace JSON</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
