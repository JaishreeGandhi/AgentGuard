from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class SummaryAnalytics(BaseModel):
    time_range: str
    total_executions: int
    evaluated_executions: int = 0
    passed_executions: int
    failed_executions: int
    infrastructure_failures: int = 0
    executions_delta_percent: float = 0.0
    success_rate: Optional[float] = None
    avg_latency_s: Optional[float] = None
    p95_latency_s: Optional[float] = None
    total_tokens: Optional[int] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
    test_suites_count: int = 0

class ActivityPoint(BaseModel):
    label: str
    timestamp: str
    total_runs: int
    passed_runs: int
    failed_runs: int

class ActivityResponse(BaseModel):
    time_range: str
    points: List[ActivityPoint]

class EvaluationBenchmarks(BaseModel):
    tool_selection_accuracy: Optional[float]
    answer_correctness: Optional[float]
    grounding_score: Optional[float]
    task_completion_rate: Optional[float]
    tool_efficiency: Optional[float]
    evaluated_runs_count: int

class FailureCategory(BaseModel):
    failure_type: str
    title: str
    count: int
    percentage: float
    description: str
    latest_evidence: str

class FailureInsightsResponse(BaseModel):
    total_failures: int
    failures: List[FailureCategory]

class AgentPerformanceItem(BaseModel):
    agent_id: str
    name: str
    model: str
    tests_executed: int
    success_rate_pct: Optional[float]
    passed_count: int
    failed_count: int
    avg_latency_s: Optional[float]
    tokens_formatted: str
    tokens_raw: int
    status: str
    available_tools: List[str]

class TraceSummaryItem(BaseModel):
    trace_id: str
    agent_name: str
    user_query: str
    tools_called: List[str]
    duration_s: float
    tokens: int
    status: str
    failure_code: Optional[str]
    created_at: str

class ExecutionStepItem(BaseModel):
    step_index: int
    step_type: str
    title: str
    tool_name: Optional[str] = None
    tool_input: Optional[Any] = None
    tool_output: Optional[Any] = None
    assertion_match: Optional[str] = None
    flag_warning: Optional[str] = None
    duration_s: float
    tokens: int
    timestamp_offset_s: float

class EvaluationChecklistItem(BaseModel):
    label: str
    status: str # PASSED, FAILED, WARNING
    detail: str

class TraceDetailResponse(BaseModel):
    trace_id: str
    agent_name: str
    model: str
    status: str
    duration_s: float
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    user_query: str
    final_response: str
    steps: List[ExecutionStepItem]
    checklist: List[EvaluationChecklistItem]
    raw_trace_json: Dict[str, Any]

class RunEvaluationRequest(BaseModel):
    agent_id: str
    suite_id: str

class RunEvaluationResponse(BaseModel):
    run_id: str
    status: str
    total_tests: int
    message: str
    estimated_duration_s: float

class AgentDetail(BaseModel):
    id: str
    name: str
    model: str
    available_tools: List[str]
    system_prompt: str

class SuiteDetail(BaseModel):
    id: str
    agent_id: str
    name: str
    description: str
    total_cases: int

