import datetime
from enum import Enum
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class TestRunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"                             # All test cases executed, 100% assertions passed
    COMPLETED_WITH_FAILURES = "COMPLETED_WITH_FAILURES" # All test cases executed, >=1 assertion failed
    FAILED = "FAILED"                                   # Infrastructure / runtime error (e.g. 401/403 auth, crash)
    INTERRUPTED = "INTERRUPTED"                         # Aborted mid-flight by restart or process kill

class TraceStatus(str, Enum):
    PASSED = "PASSED"                                   # Agent finished, all assertions passed
    FAILED = "FAILED"                                   # Agent finished, >=1 assertion failed
    ERROR = "ERROR"                                     # Infrastructure error during this execution
    INTERRUPTED = "INTERRUPTED"                         # Execution aborted by server restart

def resolve_test_run_status(trace_statuses: list[str]) -> str:
    """
    Deterministically maps individual trace statuses to the overall TestRunStatus.
    Safeguards:
    - Empty trace list is NEVER marked COMPLETED; resolves to FAILED.
    - Infrastructure aborts (INTERRUPTED, ERROR) resolve to INTERRUPTED or FAILED.
    - Assertion failures resolve to COMPLETED_WITH_FAILURES.
    - All PASSED resolves to COMPLETED.
    """
    if not trace_statuses:
        return TestRunStatus.FAILED.value

    # Check for infrastructure aborts first
    if any(s == TraceStatus.INTERRUPTED.value for s in trace_statuses):
        return TestRunStatus.INTERRUPTED.value
    if any(s == TraceStatus.ERROR.value for s in trace_statuses):
        return TestRunStatus.FAILED.value

    # Check for evaluation outcomes
    if all(s == TraceStatus.PASSED.value for s in trace_statuses):
        return TestRunStatus.COMPLETED.value
    if any(s == TraceStatus.FAILED.value for s in trace_statuses):
        return TestRunStatus.COMPLETED_WITH_FAILURES.value

    return TestRunStatus.FAILED.value

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    model = Column(String, default="Gemini Flash")
    system_prompt = Column(Text, default="")
    available_tools = Column(JSON, default=list)  # e.g. ["Document Search", "Calculator", "Web Search"]
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    total_tokens = Column(Integer, default=0)
    latest_status = Column(String, default="NOT_TESTED")  # PASSED, FAILED, RUNNING, NOT_TESTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_suites = relationship("TestSuite", back_populates="agent", cascade="all, delete-orphan")
    traces = relationship("ExecutionTrace", back_populates="agent")

class TestSuite(Base):
    __tablename__ = "test_suites"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"))
    name = Column(String, index=True)
    description = Column(Text, default="")
    total_cases = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("Agent", back_populates="test_suites")
    test_cases = relationship("TestCase", back_populates="suite", cascade="all, delete-orphan")

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(String, primary_key=True, index=True)
    suite_id = Column(String, ForeignKey("test_suites.id"))
    query = Column(Text, nullable=False)
    expected_tools = Column(JSON, default=list)
    expected_answer = Column(Text, default="")
    evaluation_conditions = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    suite = relationship("TestSuite", back_populates="test_cases")

class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(String, primary_key=True, index=True)
    suite_id = Column(String, ForeignKey("test_suites.id"))
    agent_id = Column(String, ForeignKey("agents.id"))
    execution_mode = Column(String, default="MOCK", index=True)  # SEED, MOCK, LIVE
    status = Column(String, default=TestRunStatus.PENDING.value, index=True)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class ExecutionTrace(Base):
    __tablename__ = "execution_traces"

    id = Column(String, primary_key=True, index=True)  # e.g. "tr-009840"
    test_run_id = Column(String, nullable=True)
    test_case_id = Column(String, nullable=True)
    agent_id = Column(String, ForeignKey("agents.id"))
    agent_name = Column(String, index=True)
    execution_mode = Column(String, default="MOCK", index=True)  # SEED, MOCK, LIVE
    status = Column(String, index=True)  # PASSED, FAILED, ERROR, INTERRUPTED
    user_query = Column(Text)
    query_hmac = Column(String, nullable=True, index=True)
    final_response = Column(Text, default="")
    duration_ms = Column(Float, default=0.0)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Float, nullable=True, default=0.0)
    failure_type = Column(String, nullable=True)  # WrongToolSelection, Hallucination, RepeatedToolCall, LatencyViolation, PROVIDER_AUTH_ERROR
    tools_called = Column(JSON, default=list)  # e.g. ["Document Search"]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("Agent", back_populates="traces")
    steps = relationship("ExecutionStep", back_populates="trace", cascade="all, delete-orphan", order_by="ExecutionStep.step_index")
    evaluation = relationship("Evaluation", back_populates="trace", uselist=False, cascade="all, delete-orphan")

class ExecutionStep(Base):
    __tablename__ = "execution_steps"

    id = Column(String, primary_key=True, index=True)
    trace_id = Column(String, ForeignKey("execution_traces.id"))
    step_index = Column(Integer, nullable=False)
    step_type = Column(String, nullable=False)  # USER_INPUT, LLM_INVOCATION, TOOL_CALL_SELECTED, TOOL_EXECUTION_DISPATCH, TOOL_EXECUTION_RESULT, FINAL_RESPONSE
    tool_name = Column(String, nullable=True)
    tool_input = Column(JSON, nullable=True)
    tool_output = Column(JSON, nullable=True)
    assertion_match = Column(String, nullable=True)  # YES, NO, or null
    flag_warning = Column(String, nullable=True)
    duration_ms = Column(Float, default=0.0)
    tokens = Column(Integer, nullable=True)
    timestamp_offset_s = Column(Float, default=0.0)

    trace = relationship("ExecutionTrace", back_populates="steps")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True, index=True)
    trace_id = Column(String, ForeignKey("execution_traces.id"))
    is_passed = Column(Boolean, default=True)
    tool_selection_score = Column(Float, nullable=True)
    answer_correctness_score = Column(Float, nullable=True)
    task_completion_score = Column(Float, nullable=True)
    grounding_score = Column(Float, nullable=True)
    tool_efficiency_score = Column(Float, nullable=True)
    failure_type = Column(String, nullable=True)
    failure_reason = Column(Text, nullable=True)
    failure_evidence = Column(JSON, nullable=True)
    checklist = Column(JSON, default=list)
    evaluated_at = Column(DateTime, default=datetime.datetime.utcnow)

    trace = relationship("ExecutionTrace", back_populates="evaluation")
