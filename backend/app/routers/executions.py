import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ExecutionTrace, ExecutionStep, Evaluation, Agent, TestSuite
from ..schemas import (
    TraceSummaryItem,
    TraceDetailResponse,
    ExecutionStepItem,
    EvaluationChecklistItem,
    RunEvaluationRequest,
    RunEvaluationResponse
)
from ..seed_data import seed_database

router = APIRouter(prefix="/api/v1/executions", tags=["executions"])

@router.get("/recent", response_model=List[TraceSummaryItem])
def get_recent_traces(
    status: Optional[str] = Query(None, pattern="^(ALL|PASSED|FAILED)$"),
    search: Optional[str] = None,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    query = db.query(ExecutionTrace)

    if status and status != "ALL":
        query = query.filter(ExecutionTrace.status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ExecutionTrace.user_query.ilike(search_term)) |
            (ExecutionTrace.agent_name.ilike(search_term)) |
            (ExecutionTrace.id.ilike(search_term))
        )

    traces = query.order_by(ExecutionTrace.created_at.desc()).limit(limit).all()

    return [
        TraceSummaryItem(
            trace_id=f"#{t.id}",
            agent_name=t.agent_name,
            user_query=t.user_query,
            tools_called=t.tools_called or [],
            duration_s=round(t.duration_ms / 1000.0, 2),
            tokens=t.total_tokens,
            status=t.status,
            failure_code=t.failure_type if t.status == "FAILED" else None,
            created_at=t.created_at.strftime("%H:%M:%S")
        )
        for t in traces
    ]

@router.get("/{trace_id}", response_model=TraceDetailResponse)
def get_trace_detail(trace_id: str, db: Session = Depends(get_db)):
    clean_id = trace_id.lstrip("#")
    trace = db.query(ExecutionTrace).filter(ExecutionTrace.id == clean_id).first()

    if not trace:
        raise HTTPException(status_code=404, detail=f"Trace {trace_id} not found")

    steps = db.query(ExecutionStep).filter(ExecutionStep.trace_id == clean_id).order_by(ExecutionStep.step_index).all()
    evaluation = db.query(Evaluation).filter(Evaluation.trace_id == clean_id).first()

    step_items = []
    if steps:
        for s in steps:
            # Title determination
            if s.step_type == "USER_INPUT":
                title = f"({s.step_index}) USER INPUT"
            elif s.step_type in ("TOOL_SELECTION", "TOOL_CALL_SELECTED"):
                title = f"({s.step_index}) AGENT TOOL SELECTION" + (f" (STEP {s.step_index // 2})" if s.step_index > 2 else "")
            elif s.step_type in ("TOOL_ARGUMENTS", "TOOL_EXECUTION_DISPATCH"):
                title = f"({s.step_index}) TOOL INPUT / ARGUMENTS"
            elif s.step_type in ("TOOL_RESULT", "TOOL_EXECUTION_RESULT"):
                title = f"({s.step_index}) TOOL EXECUTION RESULT"
            elif s.step_type == "FINAL_RESPONSE":
                title = f"({s.step_index}) FINAL AGENT RESPONSE"
            else:
                title = f"({s.step_index}) {s.step_type}"

            step_items.append(
                ExecutionStepItem(
                    step_index=s.step_index,
                    step_type=s.step_type,
                    title=title,
                    tool_name=s.tool_name,
                    tool_input=s.tool_input,
                    tool_output=s.tool_output,
                    assertion_match=s.assertion_match,
                    flag_warning=s.flag_warning,
                    duration_s=round(s.duration_ms / 1000.0, 2),
                    tokens=s.tokens,
                    timestamp_offset_s=round(s.timestamp_offset_s, 2)
                )
            )
    else:
        # Synthesize observable timeline steps from trace record so timeline is never empty
        dur_s = round(trace.duration_ms / 1000.0, 2)
        tools = trace.tools_called or []

        # 1. USER INPUT step
        step_items.append(
            ExecutionStepItem(
                step_index=1,
                step_type="USER_INPUT",
                title="(1) USER INPUT",
                tool_name=None,
                tool_input={"query": trace.user_query},
                tool_output=None,
                assertion_match=None,
                flag_warning=None,
                duration_s=0.0,
                tokens=trace.prompt_tokens or 0,
                timestamp_offset_s=0.0
            )
        )

        cur_idx = 2
        for i, tool in enumerate(tools):
            is_wrong_tool = (trace.failure_type == "WrongToolSelection")
            assertion = "NO" if is_wrong_tool else "YES"
            expected_tool = "Document Search" if tool == "Calculator" else ("Calculator" if tool == "Web Search" else "Web Search")
            flag = f"! FLAG: Wrong Tool Selection (Agent selected '{tool}' but assertion expected '{expected_tool}')" if is_wrong_tool else None

            # Tool Selection
            step_items.append(
                ExecutionStepItem(
                    step_index=cur_idx,
                    step_type="TOOL_SELECTION",
                    title=f"({cur_idx}) AGENT TOOL SELECTION",
                    tool_name=tool,
                    tool_input={"action": f"Invoke {tool} for context retrieval / computation"},
                    tool_output=None,
                    assertion_match=assertion,
                    flag_warning=flag,
                    duration_s=round(dur_s * 0.35, 2),
                    tokens=0,
                    timestamp_offset_s=round(dur_s * 0.3 * (i + 1), 2)
                )
            )
            cur_idx += 1

            # Tool Execution Result
            step_items.append(
                ExecutionStepItem(
                    step_index=cur_idx,
                    step_type="TOOL_RESULT",
                    title=f"({cur_idx}) TOOL EXECUTION RESULT",
                    tool_name=tool,
                    tool_input=None,
                    tool_output={"status": "success", "summary": f"Execution result obtained from {tool} service."},
                    assertion_match=None,
                    flag_warning=None,
                    duration_s=round(dur_s * 0.4, 2),
                    tokens=0,
                    timestamp_offset_s=round(dur_s * 0.7 * (i + 1), 2)
                )
            )
            cur_idx += 1

        # Final Agent Response
        final_flag = None
        if trace.failure_type == "GroundingHallucination":
            final_flag = "! FLAG: Grounding Hallucination (Output contains claims not found in context)"
        elif trace.failure_type == "LatencyViolation":
            final_flag = f"! FLAG: Latency SLA Exceeded ({trace.duration_ms:.0f}ms > 2000ms target)"
        elif trace.failure_type == "RepeatedToolCalls":
            final_flag = "! FLAG: Tool Efficiency Warning (Redundant tool calls detected)"

        step_items.append(
            ExecutionStepItem(
                step_index=cur_idx,
                step_type="FINAL_RESPONSE",
                title=f"({cur_idx}) FINAL AGENT RESPONSE",
                tool_name=None,
                tool_input=None,
                tool_output={"response": trace.final_response},
                assertion_match=None,
                flag_warning=final_flag,
                duration_s=round(dur_s * 0.25, 2),
                tokens=trace.completion_tokens or 0,
                timestamp_offset_s=dur_s
            )
        )

    checklist_items = []
    if evaluation and evaluation.checklist and len(evaluation.checklist) > 0:
        for chk in evaluation.checklist:
            checklist_items.append(
                EvaluationChecklistItem(
                    label=chk.get("label", "Check"),
                    status=chk.get("status", "PASSED"),
                    detail=chk.get("detail", "")
                )
            )
    else:
        # Dynamically evaluate based on evaluation / trace status and failure_type
        ftype = evaluation.failure_type if evaluation else trace.failure_type
        is_passed = (trace.status == "PASSED") if not evaluation else evaluation.is_passed
        reason = evaluation.failure_reason if (evaluation and evaluation.failure_reason) else None

        if is_passed:
            checklist_items = [
                EvaluationChecklistItem(label="Tool Selection Check", status="PASSED", detail="All required tools selected accurately"),
                EvaluationChecklistItem(label="Grounding Check", status="PASSED", detail="No ungrounded factual hallucinations detected"),
                EvaluationChecklistItem(label="Answer Correctness", status="PASSED", detail="Output verified against evaluation criteria"),
                EvaluationChecklistItem(label="Tool Efficiency", status="PASSED", detail="Optimal tool call sequence without redundant calls")
            ]
        else:
            if ftype == "WrongToolSelection":
                expected_tool = "Document Search" if (tools and tools[0] == "Calculator") else "Calculator"
                checklist_items = [
                    EvaluationChecklistItem(label="Tool Selection Check", status="FAILED", detail=reason or f"Agent selected '{tools[0] if tools else 'Tool'}'; test assertion expected '{expected_tool}'."),
                    EvaluationChecklistItem(label="Grounding Check", status="PASSED", detail="No ungrounded factual hallucinations detected"),
                    EvaluationChecklistItem(label="Answer Correctness", status="PASSED", detail="Output verified against criteria"),
                    EvaluationChecklistItem(label="Tool Efficiency", status="PASSED", detail="Executed without redundant calls")
                ]
            elif ftype == "GroundingHallucination":
                checklist_items = [
                    EvaluationChecklistItem(label="Tool Selection Check", status="PASSED", detail="All required tools selected accurately"),
                    EvaluationChecklistItem(label="Grounding Check", status="FAILED", detail=reason or "Output contains claims not substantiated by tool context"),
                    EvaluationChecklistItem(label="Answer Correctness", status="FAILED", detail="Factually inaccurate response due to hallucination"),
                    EvaluationChecklistItem(label="Tool Efficiency", status="PASSED", detail="Tool usage within bounds")
                ]
            elif ftype == "RepeatedToolCalls":
                checklist_items = [
                    EvaluationChecklistItem(label="Tool Selection Check", status="PASSED", detail="Required tools selected"),
                    EvaluationChecklistItem(label="Tool Efficiency", status="FAILED", detail=reason or "Repeated or redundant tool calls detected"),
                    EvaluationChecklistItem(label="Grounding Check", status="PASSED", detail="Output grounded in tool data"),
                    EvaluationChecklistItem(label="Answer Correctness", status="PASSED", detail="Output verified against criteria")
                ]
            elif ftype == "LatencyViolation":
                checklist_items = [
                    EvaluationChecklistItem(label="Tool Selection Check", status="PASSED", detail="Required tools selected"),
                    EvaluationChecklistItem(label="Task Completion SLA", status="FAILED", detail=reason or f"Execution latency ({trace.duration_ms:.0f}ms) exceeded SLA limit"),
                    EvaluationChecklistItem(label="Grounding Check", status="PASSED", detail="No ungrounded claims detected"),
                    EvaluationChecklistItem(label="Answer Correctness", status="PASSED", detail="Output verified against criteria")
                ]
            else:
                checklist_items = [
                    EvaluationChecklistItem(label="Evaluation Assertion", status="FAILED", detail=reason or "Evaluation assertion criteria failed"),
                    EvaluationChecklistItem(label="Tool Selection Check", status="PASSED", detail="Required tools selected"),
                    EvaluationChecklistItem(label="Grounding Check", status="PASSED", detail="No ungrounded claims detected")
                ]

    raw_json = {
        "trace_id": trace.id,
        "agent": trace.agent_name,
        "status": trace.status,
        "duration_ms": trace.duration_ms,
        "tokens": {
            "prompt": trace.prompt_tokens,
            "completion": trace.completion_tokens,
            "total": trace.total_tokens
        },
        "query": trace.user_query,
        "response": trace.final_response,
        "tools_called": trace.tools_called,
        "steps": [
            {
                "index": s.step_index,
                "type": s.step_type,
                "tool": s.tool_name,
                "input": s.tool_input,
                "output": s.tool_output,
                "tokens": s.tokens,
                "offset_s": s.timestamp_offset_s
            }
            for s in step_items
        ],
        "evaluation": {
            "passed": evaluation.is_passed if evaluation else True,
            "failure_type": evaluation.failure_type if evaluation else None,
            "reason": evaluation.failure_reason if evaluation else None
        }
    }

    return TraceDetailResponse(
        trace_id=f"#{trace.id}",
        agent_name=trace.agent_name,
        model="Gemini Flash",
        status=trace.status,
        duration_s=round(trace.duration_ms / 1000.0, 2),
        total_tokens=trace.total_tokens,
        prompt_tokens=trace.prompt_tokens,
        completion_tokens=trace.completion_tokens,
        estimated_cost_usd=trace.estimated_cost_usd,
        user_query=trace.user_query,
        final_response=trace.final_response,
        steps=step_items,
        checklist=checklist_items,
        raw_trace_json=raw_json
    )

def simulate_evaluation_run(run_id: str, agent_id: str, suite_id: str):
    # Simulated background worker that updates agent stats
    db = next(get_db())
    try:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if agent:
            agent.latest_status = "RUNNING"
            db.commit()

            import time
            time.sleep(2)  # Brief simulated execution

            agent.latest_status = "PASSED"
            agent.total_tests += 10
            agent.passed_tests += 10
            agent.total_tokens += 4200
            db.commit()
    finally:
        db.close()

@router.post("/run", response_model=RunEvaluationResponse)
def trigger_evaluation_run(
    payload: RunEvaluationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(Agent.id == payload.agent_id).first()
    suite = db.query(TestSuite).filter(TestSuite.id == payload.suite_id).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    run_id = f"run-{uuid.uuid4().hex[:8]}"
    total_tests = suite.total_cases if suite else 50

    # Execute in background task
    background_tasks.add_task(simulate_evaluation_run, run_id, payload.agent_id, payload.suite_id)

    return RunEvaluationResponse(
        run_id=run_id,
        status="RUNNING",
        total_tests=total_tests,
        message=f"Evaluation test run dispatched for {agent.name}.",
        estimated_duration_s=2.5
    )

@router.post("/admin/reset")
def reset_database_state(
    empty: bool = Query(False, description="Set to true to clear all data into empty state"),
    db: Session = Depends(get_db)
):
    if empty:
        db.query(Evaluation).delete()
        db.query(ExecutionStep).delete()
        db.query(ExecutionTrace).delete()
        db.query(TestRun).delete()
        db.query(Agent).delete()
        db.query(TestSuite).delete()
        db.commit()
        return {"status": "success", "message": "Database reset to empty state."}
    else:
        seed_database(db, force_reset=True)
        return {"status": "success", "message": "Database reset and re-seeded with canonical sample data."}
