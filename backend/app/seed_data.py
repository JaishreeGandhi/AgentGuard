import datetime
import random
from sqlalchemy.orm import Session
from .models import Agent, TestSuite, TestCase, ExecutionTrace, ExecutionStep, Evaluation, TestRun

def seed_database(db: Session, force_reset: bool = False):
    if force_reset:
        db.query(Evaluation).delete()
        db.query(ExecutionStep).delete()
        db.query(ExecutionTrace).delete()
        db.query(TestCase).delete()
        db.query(TestSuite).delete()
        db.query(TestRun).delete()
        db.query(Agent).delete()
        db.commit()

    # Check if already seeded
    if db.query(Agent).first():
        return

    now = datetime.datetime.utcnow()

    # 1. Register Agents
    agents_data = [
        {
            "id": "agent-docqa",
            "name": "DocumentQA-Bot",
            "model": "Gemini Flash",
            "system_prompt": "You are a factual document research assistant. Always retrieve internal files before answering queries.",
            "available_tools": ["Document Search"],
            "total_tests": 620,
            "passed_tests": 596,
            "failed_tests": 24,
            "avg_latency_ms": 1050.0,
            "total_tokens": 380200,
            "latest_status": "PASSED"
        },
        {
            "id": "agent-math",
            "name": "MathSolver-Bot",
            "model": "Gemini Flash",
            "system_prompt": "You are a precise calculation assistant. For any arithmetic or formula evaluation, use the Calculator tool.",
            "available_tools": ["Calculator"],
            "total_tests": 400,
            "passed_tests": 390,
            "failed_tests": 10,
            "avg_latency_ms": 820.0,
            "total_tokens": 194100,
            "latest_status": "PASSED"
        },
        {
            "id": "agent-research",
            "name": "Research-Agent",
            "model": "Gemini Flash",
            "system_prompt": "You are a multi-step research agent. Find factual web data and perform required numerical calculations.",
            "available_tools": ["Web Search", "Calculator"],
            "total_tests": 400,
            "passed_tests": 352,
            "failed_tests": 48,
            "avg_latency_ms": 2100.0,
            "total_tokens": 268300,
            "latest_status": "FAILED"
        },
        {
            "id": "agent-sql",
            "name": "SQL-Writer",
            "model": "Gemini Flash",
            "system_prompt": "You generate valid ANSI SQL queries for internal analytics schemas.",
            "available_tools": ["Database Query"],
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "avg_latency_ms": 0.0,
            "total_tokens": 0,
            "latest_status": "NOT_TESTED"
        }
    ]

    for a in agents_data:
        db.add(Agent(**a))
    db.commit()

    # 2. Add Test Suites (24 suites total for realistic dashboard summary)
    suites = []
    # Primary 3 featured suites
    primary_suites = [
        ("suite-financial-docs", "agent-docqa", "Financial-Docs-Verification-Suite", "Evaluates grounding and precision on internal PDF financial filings.", 50),
        ("suite-math-calc", "agent-math", "Arithmetic-and-Interest-Suite", "Deterministic validation of compound interest, tax, and percentage calculations.", 40),
        ("suite-web-research", "agent-research", "Live-Web-Synthesis-Suite", "Multi-hop query routing and verification against live news & SEC filings.", 35),
    ]
    for sid, aid, name, desc, cases in primary_suites:
        s = TestSuite(id=sid, agent_id=aid, name=name, description=desc, total_cases=cases, created_at=now - datetime.timedelta(days=10))
        db.add(s)
        suites.append(s)

    # 21 additional suites to reach the exact 24 test suites count
    for i in range(1, 22):
        aid = "agent-docqa" if i % 2 == 0 else "agent-math"
        s = TestSuite(
            id=f"suite-extra-{i:02d}",
            agent_id=aid,
            name=f"Enterprise-Benchmark-Suite-{i:02d}",
            description=f"Regression suite {i} for automated nightly assertions.",
            total_cases=25,
            created_at=now - datetime.timedelta(days=15)
        )
        db.add(s)
        suites.append(s)
    db.commit()

    # 3. Add the 5 Canonical Detailed Traces (from wireframe)
    trace_fail = ExecutionTrace(
        id="tr-009840",
        agent_id="agent-research",
        agent_name="Research-Agent",
        execution_mode="SEED",
        status="FAILED",
        user_query="Find the total revenue of Alphabet in Q3 2024 and calculate 15% tax",
        final_response="Alphabet's revenue was $88.27B. 15% estimated tax is approximately $13.24B.",
        duration_ms=3420.0,
        prompt_tokens=850,
        completion_tokens=390,
        total_tokens=1240,
        estimated_cost_usd=0.00031,
        failure_type="WrongToolSelection",
        tools_called=["Web Search", "Web Search"],
        created_at=now - datetime.timedelta(minutes=14)
    )
    db.add(trace_fail)
    db.commit()

    # Steps for #tr-009840
    steps_fail = [
        ExecutionStep(
            id="step-1",
            trace_id="tr-009840",
            step_index=1,
            step_type="USER_INPUT",
            tool_name=None,
            tool_input={"query": "Find the total revenue of Alphabet in Q3 2024 and calculate 15% tax"},
            tool_output=None,
            assertion_match=None,
            flag_warning=None,
            duration_ms=0.0,
            tokens=0,
            timestamp_offset_s=0.0
        ),
        ExecutionStep(
            id="step-2",
            trace_id="tr-009840",
            step_index=2,
            step_type="TOOL_CALL_SELECTED",
            tool_name="Web Search",
            tool_input={"query": "Alphabet Q3 2024 total revenue SEC filing"},
            tool_output=None,
            assertion_match="YES",
            flag_warning=None,
            duration_ms=820.0,
            tokens=412,
            timestamp_offset_s=0.82
        ),
        ExecutionStep(
            id="step-3",
            trace_id="tr-009840",
            step_index=3,
            step_type="TOOL_EXECUTION_DISPATCH",
            tool_name="Web Search",
            tool_input={"tool": "Web Search", "query": "Alphabet Q3 2024 total revenue SEC filing"},
            tool_output=None,
            assertion_match=None,
            flag_warning=None,
            duration_ms=20.0,
            tokens=0,
            timestamp_offset_s=0.84
        ),
        ExecutionStep(
            id="step-4",
            trace_id="tr-009840",
            step_index=4,
            step_type="TOOL_EXECUTION_RESULT",
            tool_name="Web Search",
            tool_input=None,
            tool_output={"status": "success", "output": "Revenues were $88.27 billion for Q3 2024, up 15% from Q3 2023... Operating margin 32%."},
            assertion_match=None,
            flag_warning=None,
            duration_ms=1310.0,
            tokens=0,
            timestamp_offset_s=2.15
        ),
        ExecutionStep(
            id="step-5",
            trace_id="tr-009840",
            step_index=5,
            step_type="TOOL_CALL_SELECTED",
            tool_name="Web Search",
            tool_input={"query": "15% of 88.27 billion tax calculation"},
            tool_output=None,
            assertion_match="NO",
            flag_warning="! FLAG: Wrong Tool Selection / Redundant Call (Expected: Calculator)",
            duration_ms=450.0,
            tokens=510,
            timestamp_offset_s=2.60
        ),
        ExecutionStep(
            id="step-6",
            trace_id="tr-009840",
            step_index=6,
            step_type="FINAL_RESPONSE",
            tool_name=None,
            tool_input=None,
            tool_output={"response": "Alphabet's revenue was $88.27B. 15% estimated tax is approximately $13.24B."},
            assertion_match=None,
            flag_warning=None,
            duration_ms=820.0,
            tokens=318,
            timestamp_offset_s=3.42
        )
    ]
    for st in steps_fail:
        db.add(st)

    eval_fail = Evaluation(
        id="eval-tr-009840",
        trace_id="tr-009840",
        is_passed=False,
        tool_selection_score=0.5,
        answer_correctness_score=0.95,
        task_completion_score=1.0,
        grounding_score=1.0,
        tool_efficiency_score=0.5,
        failure_type="WrongToolSelection",
        failure_reason="Agent invoked 'Web Search' a second time for calculation instead of selecting 'Calculator'.",
        checklist=[
            {"label": "Tool Selection Check", "status": "FAILED", "detail": "Expected 'Calculator' at step 2, got 'Web Search'"},
            {"label": "Tool Efficiency Check", "status": "FAILED", "detail": "Redundant web search executed for arithmetic task"},
            {"label": "Grounding Check", "status": "PASSED", "detail": "Factual revenue number verified against SEC filing text"},
            {"label": "Answer Correctness", "status": "PASSED", "detail": "Calculated value $13.24B matches 15% of $88.27B"}
        ]
    )
    db.add(eval_fail)
    db.commit()

    # 4. Add the 4 other primary recent traces
    primary_traces = [
        ("tr-009842", "agent-docqa", "DocumentQA-Bot", "PASSED", "What is the return policy for purchases made in November?", 1120.0, 340, 142, 482, 0.00012, ["Document Search"], 5),
        ("tr-009841", "agent-math", "MathSolver-Bot", "PASSED", "Calculate compound interest for $10,000 at 6.5% over 5 years.", 740.0, 150, 60, 210, 0.00005, ["Calculator"], 9),
        ("tr-009839", "agent-docqa", "DocumentQA-Bot", "PASSED", "Where is the contract NDA template file stored?", 980.0, 240, 100, 340, 0.00008, ["Document Search"], 22),
        ("tr-009838", "agent-research", "Research-Agent", "PASSED", "Compare Nvidia H100 vs B200 tensor core specs", 2890.0, 680, 300, 980, 0.00024, ["Web Search"], 35)
    ]
    for tid, aid, aname, st, q, dur, pin, pout, ptot, cost, tools, mins_ago in primary_traces:
        tr = ExecutionTrace(
            id=tid,
            agent_id=aid,
            agent_name=aname,
            execution_mode="SEED",
            status=st,
            user_query=q,
            final_response="Verified response.",
            duration_ms=dur,
            prompt_tokens=pin,
            completion_tokens=pout,
            total_tokens=ptot,
            estimated_cost_usd=cost,
            failure_type=None,
            tools_called=tools,
            created_at=now - datetime.timedelta(minutes=mins_ago)
        )
        db.add(tr)
        ev = Evaluation(
            id=f"eval-{tid}",
            trace_id=tid,
            is_passed=True,
            tool_selection_score=1.0,
            answer_correctness_score=1.0,
            task_completion_score=1.0,
            grounding_score=1.0,
            tool_efficiency_score=1.0,
            checklist=[
                {"label": "Tool Selection Check", "status": "PASSED", "detail": f"Correctly selected {tools}"},
                {"label": "Grounding Check", "status": "PASSED", "detail": "Output strictly grounded in tool response"},
                {"label": "Answer Correctness", "status": "PASSED", "detail": "All factual claims verified"}
            ]
        )
        db.add(ev)
    db.commit()

    # 5. Seed Historical Baseline Traces to match the 1,420 total test executions
    # Day-by-day distribution matching wireframe activity chart:
    # Mon: 120 (114 pass, 6 fail), Tue: 185 (175 pass, 10 fail), Wed: 140 (132 pass, 8 fail),
    # Thu: 240 (224 pass, 16 fail), Fri: 290 (272 pass, 18 fail), Sat: 165 (154 pass, 11 fail),
    # Sun (Today): 280 (267 pass, 13 fail). Total = 1,420 (1,338 Passed, 82 Failed).
    daily_distribution = [
        (6, 120, 6),   # 6 days ago (Mon): 120 total, 6 fail
        (5, 185, 10),  # 5 days ago (Tue): 185 total, 10 fail
        (4, 140, 8),   # 4 days ago (Wed): 140 total, 8 fail
        (3, 240, 16),  # 3 days ago (Thu): 240 total, 16 fail
        (2, 290, 18),  # 2 days ago (Fri): 290 total, 18 fail
        (1, 165, 11),  # 1 day ago (Sat): 165 total, 11 fail
        (0, 275, 12),  # Today (Sun): 275 (already seeded 5 above = 280 total, 12 + 1 = 13 fail)
    ]

    # Failure types distribution matching wireframe failure insights:
    # 34 WrongToolSelection (1 already seeded above -> 33)
    # 21 GroundingHallucination
    # 15 RepeatedToolCalls
    # 12 LatencyViolation
    failure_pool = (
        ["WrongToolSelection"] * 33 +
        ["GroundingHallucination"] * 21 +
        ["RepeatedToolCalls"] * 15 +
        ["LatencyViolation"] * 12
    )
    random.seed(42)  # Deterministic seed
    random.shuffle(failure_pool)

    fail_idx = 0
    trace_counter = 1000

    # Batch insert traces & evaluations
    batch_traces = []
    batch_evals = []

    for days_ago, total_count, fail_count in daily_distribution:
        pass_count = total_count - fail_count
        # Anchor strictly to midnight of that calendar day
        calendar_day = (now - datetime.timedelta(days=days_ago)).replace(hour=0, minute=0, second=0, microsecond=0)

        for i in range(total_count):
            is_fail = (i < fail_count)
            trace_counter += 1
            tid = f"tr-hist-{trace_counter}"
            
            # Agent distribution: ~44% DocQA, ~28% Math, ~28% Research
            r = (trace_counter % 100)
            if r < 44:
                aid, aname, tools = "agent-docqa", "DocumentQA-Bot", ["Document Search"]
                lat = 1050.0 + (random.random() * 200 - 100)
            elif r < 72:
                aid, aname, tools = "agent-math", "MathSolver-Bot", ["Calculator"]
                lat = 820.0 + (random.random() * 150 - 75)
            else:
                aid, aname, tools = "agent-research", "Research-Agent", ["Web Search"]
                lat = 2100.0 + (random.random() * 400 - 200)

            ftype = None
            if is_fail and fail_idx < len(failure_pool):
                ftype = failure_pool[fail_idx]
                fail_idx += 1

            # Tokens: average ~593 tokens per run (610.2k in, 232.4k out across 1,420 runs)
            pin = int(430 + (random.random() * 100 - 50))
            pout = int(163 + (random.random() * 60 - 30))
            cost = (pin / 1e6 * 0.15) + (pout / 1e6 * 0.60)

            # Jitter timestamp strictly within that calendar day
            trace_time = calendar_day + datetime.timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
            if trace_time > now:
                trace_time = now - datetime.timedelta(minutes=random.randint(1, 30))

            tr = ExecutionTrace(
                id=tid,
                agent_id=aid,
                agent_name=aname,
                execution_mode="SEED",
                status="FAILED" if is_fail else "PASSED",
                user_query=f"Historical test scenario {trace_counter}",
                final_response="Completed output.",
                duration_ms=round(lat, 1),
                prompt_tokens=pin,
                completion_tokens=pout,
                total_tokens=pin + pout,
                estimated_cost_usd=round(cost, 6),
                failure_type=ftype,
                tools_called=tools,
                created_at=trace_time
            )
            batch_traces.append(tr)

            # Build realistic checklist and failure reasoning for historical records
            reason = None
            if is_fail:
                if ftype == "WrongToolSelection":
                    expected_tool = "Document Search" if tools[0] == "Calculator" else ("Calculator" if tools[0] == "Web Search" else "Web Search")
                    reason = f"Agent invoked '{tools[0]}' instead of expected '{expected_tool}'."
                    hist_checklist = [
                        {"label": "Tool Selection Check", "status": "FAILED", "detail": f"Agent selected '{tools[0]}'; test assertion expected '{expected_tool}'."},
                        {"label": "Grounding Check", "status": "PASSED", "detail": "Output strictly grounded in tool response."},
                        {"label": "Answer Correctness", "status": "PASSED", "detail": "Output parsed successfully against schema."},
                        {"label": "Tool Efficiency", "status": "PASSED", "detail": "Executed without redundant invocations."}
                    ]
                elif ftype == "GroundingHallucination":
                    reason = "Output contains claims not found in tool execution output."
                    hist_checklist = [
                        {"label": "Tool Selection Check", "status": "PASSED", "detail": f"Selected {tools[0]} accurately."},
                        {"label": "Grounding Check", "status": "FAILED", "detail": "Output contains claims not substantiated by tool execution context."},
                        {"label": "Answer Correctness", "status": "FAILED", "detail": "Factual hallucination violates grounding verification policy."},
                        {"label": "Tool Efficiency", "status": "PASSED", "detail": "Tools executed within bounds."}
                    ]
                elif ftype == "RepeatedToolCalls":
                    reason = "Agent executed redundant repeated tool calls for simple query."
                    hist_checklist = [
                        {"label": "Tool Selection Check", "status": "PASSED", "detail": f"Selected {tools[0]}."},
                        {"label": "Tool Efficiency", "status": "FAILED", "detail": "Agent executed repeated identical tool calls for simple query."},
                        {"label": "Grounding Check", "status": "PASSED", "detail": "Grounded in retrieved data."},
                        {"label": "Answer Correctness", "status": "PASSED", "detail": "Response is correct."}
                    ]
                elif ftype == "LatencyViolation":
                    reason = f"Duration {lat:.0f}ms breached P95 SLA target (2000ms)."
                    hist_checklist = [
                        {"label": "Tool Selection Check", "status": "PASSED", "detail": f"Selected {tools[0]} accurately."},
                        {"label": "Task Completion SLA", "status": "FAILED", "detail": f"Duration {lat:.0f}ms breached P95 SLA target (2000ms)."},
                        {"label": "Grounding Check", "status": "PASSED", "detail": "No grounding issues detected."},
                        {"label": "Answer Correctness", "status": "PASSED", "detail": "Response is correct."}
                    ]
                else:
                    reason = "Evaluation assertion check failed."
                    hist_checklist = [
                        {"label": "Evaluation Assertion", "status": "FAILED", "detail": "Evaluation criteria assertion failed."},
                        {"label": "Tool Selection Check", "status": "PASSED", "detail": "Tools selected."},
                        {"label": "Grounding Check", "status": "PASSED", "detail": "Grounded."}
                    ]
            else:
                hist_checklist = [
                    {"label": "Tool Selection Check", "status": "PASSED", "detail": f"Correctly selected {tools[0]}"},
                    {"label": "Grounding Check", "status": "PASSED", "detail": "Output strictly grounded in tool response"},
                    {"label": "Answer Correctness", "status": "PASSED", "detail": "All factual claims verified"},
                    {"label": "Tool Efficiency", "status": "PASSED", "detail": "No redundant tool invocations"}
                ]

            ev = Evaluation(
                id=f"eval-{tid}",
                trace_id=tid,
                is_passed=not is_fail,
                tool_selection_score=0.0 if ftype == "WrongToolSelection" else 1.0,
                answer_correctness_score=0.0 if ftype == "GroundingHallucination" else 0.95,
                task_completion_score=0.0 if ftype == "LatencyViolation" else 1.0,
                grounding_score=0.0 if ftype == "GroundingHallucination" else 1.0,
                tool_efficiency_score=0.5 if ftype == "RepeatedToolCalls" else 1.0,
                failure_type=ftype,
                failure_reason=reason,
                checklist=hist_checklist,
                evaluated_at=trace_time
            )
            batch_evals.append(ev)

    # Fast bulk save in SQLite
    db.bulk_save_objects(batch_traces)
    db.bulk_save_objects(batch_evals)
    db.commit()
