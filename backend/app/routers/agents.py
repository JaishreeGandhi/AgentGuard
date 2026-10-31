from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Agent, TestSuite
from ..schemas import AgentPerformanceItem, AgentDetail, SuiteDetail

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])

@router.get("/performance", response_model=List[AgentPerformanceItem])
def get_agent_performance(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    results = []
    for a in agents:
        success_pct = None
        if a.total_tests > 0:
            success_pct = round((a.passed_tests / a.total_tests) * 100, 1)

        avg_lat_s = None
        if a.total_tests > 0:
            avg_lat_s = round(a.avg_latency_ms / 1000.0, 2)

        # Format tokens (e.g. 380.2k)
        if a.total_tokens >= 1000:
            tok_formatted = f"{a.total_tokens / 1000.0:.1f}k"
        else:
            tok_formatted = str(a.total_tokens)

        results.append(
            AgentPerformanceItem(
                agent_id=a.id,
                name=a.name,
                model=a.model,
                tests_executed=a.total_tests,
                success_rate_pct=success_pct,
                passed_count=a.passed_tests,
                failed_count=a.failed_tests,
                avg_latency_s=avg_lat_s,
                tokens_formatted=tok_formatted,
                tokens_raw=a.total_tokens,
                status=a.latest_status,
                available_tools=a.available_tools or []
            )
        )
    return results

@router.get("", response_model=List[AgentDetail])
def list_agents(db: Session = Depends(get_db)):
    agents = db.query(Agent).all()
    return [
        AgentDetail(
            id=a.id,
            name=a.name,
            model=a.model,
            available_tools=a.available_tools or [],
            system_prompt=a.system_prompt or ""
        )
        for a in agents
    ]

@router.get("/{agent_id}/suites", response_model=List[SuiteDetail])
def get_agent_suites(agent_id: str, db: Session = Depends(get_db)):
    suites = db.query(TestSuite).filter(TestSuite.agent_id == agent_id).all()
    # If no agent-specific suite, return all available suites so modal always has options
    if not suites:
        suites = db.query(TestSuite).all()
    return [
        SuiteDetail(
            id=s.id,
            agent_id=s.agent_id or agent_id,
            name=s.name,
            description=s.description or "",
            total_cases=s.total_cases
        )
        for s in suites
    ]

