import {
  SummaryAnalytics,
  ActivityResponse,
  EvaluationBenchmarks,
  FailureInsightsResponse,
  AgentPerformanceItem,
  TraceSummaryItem,
  TraceDetailResponse,
  AgentDetail,
  SuiteDetail,
  TimeRange
} from "../types/dashboard";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

export async function fetchSummaryAnalytics(timeRange: TimeRange): Promise<SummaryAnalytics> {
  const res = await fetch(`${BASE_URL}/analytics/summary?time_range=${timeRange}`);
  if (!res.ok) throw new Error("Failed to fetch summary analytics");
  return res.json();
}

export async function fetchActivity(timeRange: TimeRange): Promise<ActivityResponse> {
  const res = await fetch(`${BASE_URL}/analytics/activity?time_range=${timeRange}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export async function fetchMetrics(): Promise<EvaluationBenchmarks> {
  const res = await fetch(`${BASE_URL}/analytics/metrics`);
  if (!res.ok) throw new Error("Failed to fetch evaluation metrics");
  return res.json();
}

export async function fetchFailures(): Promise<FailureInsightsResponse> {
  const res = await fetch(`${BASE_URL}/analytics/failures`);
  if (!res.ok) throw new Error("Failed to fetch failure insights");
  return res.json();
}

export async function fetchAgentPerformance(): Promise<AgentPerformanceItem[]> {
  const res = await fetch(`${BASE_URL}/agents/performance`);
  if (!res.ok) throw new Error("Failed to fetch agent performance");
  return res.json();
}

export async function fetchAgents(): Promise<AgentDetail[]> {
  const res = await fetch(`${BASE_URL}/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function fetchSuites(agentId: string): Promise<SuiteDetail[]> {
  const res = await fetch(`${BASE_URL}/agents/${agentId}/suites`);
  if (!res.ok) throw new Error("Failed to fetch test suites");
  return res.json();
}

export async function fetchRecentTraces(statusFilter?: string, search?: string): Promise<TraceSummaryItem[]> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
  if (search) params.append("search", search);

  const res = await fetch(`${BASE_URL}/executions/recent?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch recent traces");
  return res.json();
}

export async function fetchTraceDetail(traceId: string): Promise<TraceDetailResponse> {
  const cleanId = traceId.replace("#", "");
  const res = await fetch(`${BASE_URL}/executions/${cleanId}`);
  if (!res.ok) throw new Error(`Failed to fetch trace detail for ${traceId}`);
  return res.json();
}

export async function triggerEvaluationRun(agentId: string, suiteId: string): Promise<{ run_id: string; message: string }> {
  const res = await fetch(`${BASE_URL}/executions/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, suite_id: suiteId })
  });
  if (!res.ok) throw new Error("Failed to trigger evaluation run");
  return res.json();
}

export async function resetDatabase(empty: boolean = false): Promise<void> {
  await fetch(`${BASE_URL}/executions/admin/reset?empty=${empty}`, { method: "POST" });
}

