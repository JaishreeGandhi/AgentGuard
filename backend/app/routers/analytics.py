import math
import datetime
from typing import Optional, List, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, desc
from ..database import get_db
from ..models import ExecutionTrace, Evaluation, TestSuite
from ..schemas import (
    SummaryAnalytics,
    ActivityResponse,
    ActivityPoint,
    EvaluationBenchmarks,
    FailureInsightsResponse,
    FailureCategory
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

def calculate_p95_nearest_rank(durations_ms: list[float]) -> Optional[float]:
    """
    Calculates P95 latency in seconds using the exact nearest-rank method:
    rank = ceil(0.95 * N)
    p95 = sorted_durations[rank - 1] / 1000.0
    """
    if not durations_ms:
        return None
    sorted_durations = sorted(durations_ms)
    n = len(sorted_durations)
    rank = math.ceil(0.95 * n)  # 1-indexed nearest rank
    return round(sorted_durations[rank - 1] / 1000.0, 2)

def get_time_boundaries(time_range: str) -> Tuple[Optional[datetime.datetime], Optional[datetime.datetime]]:
    """
    Returns (cutoff_date, previous_cutoff_date) in UTC.
    All boundaries use datetime.utcnow() to match SQLite naive UTC datetimes.
    """
    now = datetime.datetime.utcnow()
    if time_range == "24h":
        cutoff = now - datetime.timedelta(hours=24)
        prev_cutoff = cutoff - datetime.timedelta(hours=24)
    elif time_range == "7d":
        # 7 calendar days inclusive: from midnight 6 days ago up to now
        cutoff = (now - datetime.timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_cutoff = cutoff - datetime.timedelta(days=7)
    elif time_range == "30d":
        cutoff = (now - datetime.timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_cutoff = cutoff - datetime.timedelta(days=30)
    else:  # "all"
        cutoff = None
        prev_cutoff = None
    return cutoff, prev_cutoff

def apply_source_filter(query, source: str):
    """
    Applies strict data source provenance filter:
    - all: SEED, MOCK, LIVE
    - non_seed: MOCK, LIVE
    - live_only: LIVE
    - mock_only: MOCK
    - seed_only: SEED
    """
    if source == "non_seed":
        return query.filter(ExecutionTrace.execution_mode.in_(["MOCK", "LIVE"]))
    elif source == "live_only":
        return query.filter(ExecutionTrace.execution_mode == "LIVE")
    elif source == "mock_only":
        return query.filter(ExecutionTrace.execution_mode == "MOCK")
    elif source == "seed_only":
        return query.filter(ExecutionTrace.execution_mode == "SEED")
    return query

@router.get("/summary", response_model=SummaryAnalytics)
def get_summary_analytics(
    time_range: str = Query("7d", pattern="^(24h|7d|30d|all)$"),
    source: str = Query("all", pattern="^(all|non_seed|live_only|mock_only|seed_only)$"),
    db: Session = Depends(get_db)
):
    cutoff, prev_cutoff = get_time_boundaries(time_range)

    # Base query with source filtering
    base_query = apply_source_filter(db.query(ExecutionTrace), source)

    # Filter to active window
    if cutoff is not None:
        window_query = base_query.filter(ExecutionTrace.created_at >= cutoff)
    else:
        window_query = base_query

    # 1. Total Executions (All attempted executions in window: N_total)
    total_executions = window_query.count()

    if total_executions == 0:
        return SummaryAnalytics(
            time_range=time_range,
            total_executions=0,
            evaluated_executions=0,
            passed_executions=0,
            failed_executions=0,
            infrastructure_failures=0,
            executions_delta_percent=0.0,
            success_rate=None,
            avg_latency_s=None,
            p95_latency_s=None,
            total_tokens=0,
            prompt_tokens=0,
            completion_tokens=0,
            estimated_cost_usd=0.0,
            test_suites_count=db.query(TestSuite).count()
        )

    # 2. Distinct populations
    passed_executions = window_query.filter(ExecutionTrace.status == "PASSED").count()
    failed_executions = window_query.filter(ExecutionTrace.status == "FAILED").count()
    infra_failures = window_query.filter(ExecutionTrace.status.in_(["ERROR", "INTERRUPTED"])).count()
    evaluated_executions = passed_executions + failed_executions

    # Success rate strictly evaluated on N_evaluated (infra errors excluded from denominator)
    success_rate = None
    if evaluated_executions > 0:
        success_rate = round((passed_executions / evaluated_executions) * 100.0, 1)

    # 3. Latency calculations (over evaluated executions with duration)
    evaluated_durations = [
        row[0] for row in window_query.filter(
            ExecutionTrace.status.in_(["PASSED", "FAILED"]),
            ExecutionTrace.duration_ms.isnot(None)
        ).with_entities(ExecutionTrace.duration_ms).all()
    ]

    avg_latency_s = None
    p95_latency_s = None
    if evaluated_durations:
        avg_latency_s = round((sum(evaluated_durations) / len(evaluated_durations)) / 1000.0, 2)
        p95_latency_s = calculate_p95_nearest_rank(evaluated_durations)

    # 4. Token Usage & Cost (direct SQL sums)
    token_sums = window_query.with_entities(
        func.sum(ExecutionTrace.total_tokens),
        func.sum(ExecutionTrace.prompt_tokens),
        func.sum(ExecutionTrace.completion_tokens),
        func.sum(ExecutionTrace.estimated_cost_usd)
    ).first()

    total_tokens = int(token_sums[0] or 0)
    prompt_tokens = int(token_sums[1] or 0)
    completion_tokens = int(token_sums[2] or 0)
    estimated_cost_usd = round(float(token_sums[3] or 0.0), 2)

    # 5. Executions Delta % against preceding identical window
    delta_percent = 0.0
    if cutoff is not None and prev_cutoff is not None:
        prev_count = base_query.filter(
            ExecutionTrace.created_at >= prev_cutoff,
            ExecutionTrace.created_at < cutoff
        ).count()
        if prev_count > 0:
            delta_percent = round(((total_executions - prev_count) / prev_count) * 100.0, 1)

    # 6. Test Suites Count
    test_suites_count = db.query(distinct(TestSuite.id)).count()

    return SummaryAnalytics(
        time_range=time_range,
        total_executions=total_executions,
        evaluated_executions=evaluated_executions,
        passed_executions=passed_executions,
        failed_executions=failed_executions,
        infrastructure_failures=infra_failures,
        executions_delta_percent=delta_percent,
        success_rate=success_rate,
        avg_latency_s=avg_latency_s,
        p95_latency_s=p95_latency_s,
        total_tokens=total_tokens,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        estimated_cost_usd=estimated_cost_usd,
        test_suites_count=test_suites_count
    )

@router.get("/activity", response_model=ActivityResponse)
def get_execution_activity(
    time_range: str = Query("7d", pattern="^(24h|7d|30d|all)$"),
    source: str = Query("all", pattern="^(all|non_seed|live_only|mock_only|seed_only)$"),
    db: Session = Depends(get_db)
):
    cutoff, _ = get_time_boundaries(time_range)
    now = datetime.datetime.utcnow()

    # Determine discrete day buckets based on time_range
    if time_range == "24h":
        bucket_count = 6
        step_hours = 4
        buckets = []
        for i in range(bucket_count):
            start = cutoff + datetime.timedelta(hours=i * step_hours)
            end = start + datetime.timedelta(hours=step_hours)
            label = start.strftime("%H:%M")
            buckets.append((label, start, end))
    elif time_range == "30d":
        bucket_count = 4
        step_days = 7
        buckets = []
        for i in range(bucket_count):
            start = cutoff + datetime.timedelta(days=i * step_days)
            end = start + datetime.timedelta(days=step_days)
            label = f"Wk {i+1}"
            buckets.append((label, start, end))
    else:  # "7d" and "all" (default to 7 daily buckets)
        start_date = (now - datetime.timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        buckets = []
        for i in range(7):
            day_start = start_date + datetime.timedelta(days=i)
            day_end = day_start + datetime.timedelta(days=1)
            label = day_start.strftime("%a")
            buckets.append((label, day_start, day_end))

    # Query all traces in active window with source filter
    base_query = apply_source_filter(db.query(ExecutionTrace), source)
    if cutoff is not None:
        traces = base_query.filter(ExecutionTrace.created_at >= cutoff).all()
    else:
        traces = base_query.all()

    # Aggregate traces into continuous buckets
    points = []
    for label, b_start, b_end in buckets:
        matching = [t for t in traces if b_start <= t.created_at < b_end]
        total_runs = len(matching)
        passed_runs = sum(1 for t in matching if t.status == "PASSED")
        failed_runs = total_runs - passed_runs

        points.append(
            ActivityPoint(
                label=label,
                timestamp=b_start.isoformat() + "Z",
                total_runs=total_runs,
                passed_runs=passed_runs,
                failed_runs=failed_runs
            )
        )

    # In case of remaining traces between last bucket and now, fold into final bucket
    # so sum(points.total_runs) == summary.total_executions strictly
    last_end = buckets[-1][2]
    leftovers = [t for t in traces if t.created_at >= last_end]
    if leftovers and points:
        points[-1].total_runs += len(leftovers)
        points[-1].passed_runs += sum(1 for t in leftovers if t.status == "PASSED")
        points[-1].failed_runs = points[-1].total_runs - points[-1].passed_runs

    return ActivityResponse(time_range=time_range, points=points)

@router.get("/metrics", response_model=EvaluationBenchmarks)
def get_evaluation_metrics(
    time_range: str = Query("7d", pattern="^(24h|7d|30d|all)$"),
    source: str = Query("all", pattern="^(all|non_seed|live_only|mock_only|seed_only)$"),
    db: Session = Depends(get_db)
):
    cutoff, _ = get_time_boundaries(time_range)

    # Query Evaluation joined with ExecutionTrace to apply time and source filters
    query = db.query(Evaluation).join(ExecutionTrace, Evaluation.trace_id == ExecutionTrace.id)
    query = apply_source_filter(query, source)

    if cutoff is not None:
        query = query.filter(ExecutionTrace.created_at >= cutoff)

    evals = query.all()
    if not evals:
        return EvaluationBenchmarks(
            tool_selection_accuracy=None,
            answer_correctness=None,
            grounding_score=None,
            task_completion_rate=None,
            tool_efficiency=None,
            evaluated_runs_count=0
        )

    # Compute averages only for rows where metric was applicable (score is not None)
    def avg_metric(scores):
        valid = [s for s in scores if s is not None]
        return round((sum(valid) / len(valid)) * 100.0, 1) if valid else None

    tool_sel = avg_metric([e.tool_selection_score for e in evals])
    ans_corr = avg_metric([e.answer_correctness_score for e in evals])
    grounding = avg_metric([e.grounding_score for e in evals])
    task_comp = avg_metric([e.task_completion_score for e in evals])
    tool_eff = avg_metric([e.tool_efficiency_score for e in evals])

    return EvaluationBenchmarks(
        tool_selection_accuracy=tool_sel,
        answer_correctness=ans_corr,
        grounding_score=grounding,
        task_completion_rate=task_comp,
        tool_efficiency=tool_eff,
        evaluated_runs_count=len(evals)
    )

@router.get("/failures", response_model=FailureInsightsResponse)
def get_failure_insights(
    time_range: str = Query("7d", pattern="^(24h|7d|30d|all)$"),
    source: str = Query("all", pattern="^(all|non_seed|live_only|mock_only|seed_only)$"),
    db: Session = Depends(get_db)
):
    cutoff, _ = get_time_boundaries(time_range)

    # Base query for failed evaluation traces
    base_query = apply_source_filter(db.query(ExecutionTrace), source)
    failed_query = base_query.filter(ExecutionTrace.status == "FAILED")

    if cutoff is not None:
        failed_query = failed_query.filter(ExecutionTrace.created_at >= cutoff)

    total_failures = failed_query.count()
    if total_failures == 0:
        return FailureInsightsResponse(total_failures=0, failures=[])

    # Group by failure_type and count
    type_counts = (
        failed_query.with_entities(
            ExecutionTrace.failure_type,
            func.count(ExecutionTrace.id)
        )
        .group_by(ExecutionTrace.failure_type)
        .order_by(desc(func.count(ExecutionTrace.id)))
        .all()
    )

    title_map = {
        "WrongToolSelection": ("Wrong Tool Selection", "Expected specific tool, but agent selected an unauthorized or incorrect tool."),
        "GroundingHallucination": ("Grounding / Hallucinate", "Unsupported claims in final model output not grounded in retrieved context."),
        "RepeatedToolCalls": ("Repeated Tool Calls", "Multiple redundant tool invocations without progressive refinement."),
        "LatencyViolation": ("Latency / Budget Violation", "Execution exceeded maximum allowable step duration or token allocation."),
    }

    results = []
    for ftype, count in type_counts:
        code = ftype or "UnclassifiedFailure"
        title, desc_text = title_map.get(code, (code, "Assertion failed during evaluation."))
        pct = round((count / total_failures) * 100.0, 1)

        # Retrieve the latest trace query for evidence context
        latest_trace = failed_query.filter(ExecutionTrace.failure_type == code).order_by(ExecutionTrace.created_at.desc()).first()
        evidence = latest_trace.user_query if latest_trace else "Test assertion failed."

        results.append(
            FailureCategory(
                failure_type=code,
                title=title,
                count=count,
                percentage=pct,
                description=desc_text,
                latest_evidence=evidence
            )
        )

    return FailureInsightsResponse(total_failures=total_failures, failures=results)
