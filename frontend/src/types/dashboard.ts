export type TimeRange = "24h" | "7d" | "30d";

export type AgentStatus = "PASSED" | "FAILED" | "RUNNING" | "NOT_TESTED";

export interface SummaryAnalytics {
  time_range: string;
  total_executions: number;
  executions_delta_percent: number;
  success_rate: number;
  passed_executions: number;
  failed_executions: number;
  avg_latency_s: number;
  p95_latency_s: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  test_suites_count: number;
}

export interface ActivityPoint {
  label: string;
  timestamp: string;
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
}

export interface ActivityResponse {
  time_range: string;
  points: ActivityPoint[];
}

export interface EvaluationBenchmarks {
  tool_selection_accuracy: number | null;
  answer_correctness: number | null;
  grounding_score: number | null;
  task_completion_rate: number | null;
  tool_efficiency: number | null;
  evaluated_runs_count: number;
}

export interface FailureCategory {
  failure_type: string;
  title: string;
  count: number;
  percentage: number;
  description: string;
  latest_evidence: string;
}

export interface FailureInsightsResponse {
  total_failures: number;
  failures: FailureCategory[];
}

export interface AgentPerformanceItem {
  agent_id: string;
  name: string;
  model: string;
  tests_executed: number;
  success_rate_pct: number | null;
  passed_count: number;
  failed_count: number;
  avg_latency_s: number | null;
  tokens_formatted: string;
  tokens_raw: number;
  status: AgentStatus;
  available_tools: string[];
}

export interface TraceSummaryItem {
  trace_id: string;
  agent_name: string;
  user_query: string;
  tools_called: string[];
  duration_s: number;
  tokens: number;
  status: "PASSED" | "FAILED";
  failure_code: string | null;
  created_at: string;
}

export interface ExecutionStepItem {
  step_index: number;
  step_type: string;
  title: string;
  tool_name: string | null;
  tool_input: any;
  tool_output: any;
  assertion_match: string | null;
  flag_warning: string | null;
  duration_s: number;
  tokens: number;
  timestamp_offset_s: number;
}

export interface EvaluationChecklistItem {
  label: string;
  status: "PASSED" | "FAILED" | "WARNING";
  detail: string;
}

export interface TraceDetailResponse {
  trace_id: string;
  agent_name: string;
  model: string;
  status: "PASSED" | "FAILED";
  duration_s: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  user_query: string;
  final_response: string;
  steps: ExecutionStepItem[];
  checklist: EvaluationChecklistItem[];
  raw_trace_json: any;
}

export interface AgentDetail {
  id: string;
  name: string;
  model: string;
  available_tools: string[];
  system_prompt: string;
}

export interface SuiteDetail {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  total_cases: number;
}

export type ViewStateMode = "LIVE" | "EMPTY" | "LOADING" | "ERROR";

