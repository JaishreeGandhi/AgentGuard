import unittest
import datetime
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    Agent, TestSuite, ExecutionTrace, Evaluation,
    TestRunStatus, TraceStatus, resolve_test_run_status
)
from app.config import settings, get_secret_key
from app.routers.analytics import (
    calculate_p95_nearest_rank,
    get_summary_analytics,
    get_execution_activity,
    get_evaluation_metrics,
    get_failure_insights
)
from app.seed_data import seed_database

# Create isolated in-memory test database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

class TestAnalyticsUnitAndIntegration(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=test_engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=test_engine)

    # -------------------------------------------------------------
    # 1. P95 Nearest-Rank Mathematical Unit Tests
    # -------------------------------------------------------------
    def test_p95_latency_small_sample(self):
        """Small sample: N=5 durations [100, 200, 300, 400, 500]ms -> rank=ceil(0.95*5)=5 -> 500ms (0.50s)"""
        durations = [100.0, 200.0, 300.0, 400.0, 500.0]
        p95 = calculate_p95_nearest_rank(durations)
        self.assertEqual(p95, 0.50)

    def test_p95_latency_ten_sample(self):
        """Sample: N=10 durations [10, 20, ..., 100]ms -> rank=ceil(0.95*10)=10 -> 100ms (0.10s)"""
        durations = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
        p95 = calculate_p95_nearest_rank(durations)
        self.assertEqual(p95, 0.10)

    def test_p95_latency_large_sample(self):
        """Large sample: N=100 durations [10, 20, ..., 1000]ms -> rank=ceil(0.95*100)=95 -> 950ms (0.95s)"""
        durations = [i * 10.0 for i in range(1, 101)]
        p95 = calculate_p95_nearest_rank(durations)
        self.assertEqual(p95, 0.95)

    def test_p95_latency_empty_sample(self):
        """Empty durations list returns None."""
        self.assertIsNone(calculate_p95_nearest_rank([]))

    # -------------------------------------------------------------
    # 2. Status Enums & Outcome Mapping Safeguards
    # -------------------------------------------------------------
    def test_resolve_test_run_status_empty_list(self):
        """Safeguard 1: An empty trace list must NEVER resolve to COMPLETED; must resolve to FAILED."""
        status = resolve_test_run_status([])
        self.assertEqual(status, TestRunStatus.FAILED.value)

    def test_resolve_test_run_status_outcomes(self):
        """Verifies deterministic outcome mapping."""
        # All passed -> COMPLETED
        self.assertEqual(
            resolve_test_run_status([TraceStatus.PASSED.value, TraceStatus.PASSED.value]),
            TestRunStatus.COMPLETED.value
        )
        # Agent assertion failure -> COMPLETED_WITH_FAILURES
        self.assertEqual(
            resolve_test_run_status([TraceStatus.PASSED.value, TraceStatus.FAILED.value]),
            TestRunStatus.COMPLETED_WITH_FAILURES.value
        )
        # Infrastructure error -> FAILED
        self.assertEqual(
            resolve_test_run_status([TraceStatus.PASSED.value, TraceStatus.ERROR.value]),
            TestRunStatus.FAILED.value
        )
        # Interrupted execution -> INTERRUPTED
        self.assertEqual(
            resolve_test_run_status([TraceStatus.PASSED.value, TraceStatus.INTERRUPTED.value]),
            TestRunStatus.INTERRUPTED.value
        )

    # -------------------------------------------------------------
    # 3. Secret Key Production vs Development Safeguard
    # -------------------------------------------------------------
    def test_secret_key_production_vs_development(self):
        """Safeguard 2: Requires AGENTGUARD_SECRET_KEY in production, falls back to ephemeral key in dev."""
        orig_env = settings.ENVIRONMENT
        orig_key = settings.AGENTGUARD_SECRET_KEY

        try:
            # In production without key -> must raise ValueError
            settings.ENVIRONMENT = "production"
            settings.AGENTGUARD_SECRET_KEY = None
            with self.assertRaises(ValueError):
                get_secret_key()

            # In development without key -> returns valid random hex string
            settings.ENVIRONMENT = "development"
            settings.AGENTGUARD_SECRET_KEY = None
            key = get_secret_key()
            self.assertIsNotNone(key)
            self.assertEqual(len(key), 64)  # 32 bytes hex
        finally:
            settings.ENVIRONMENT = orig_env
            settings.AGENTGUARD_SECRET_KEY = orig_key

    # -------------------------------------------------------------
    # 4. Analytics Summary: Empty Database Handling
    # -------------------------------------------------------------
    def test_summary_empty_database(self):
        """Asserts empty DB returns total_executions=0, success_rate=None, avg_latency=None without ZeroDivisionError."""
        res = get_summary_analytics(time_range="7d", source="all", db=self.db)
        self.assertEqual(res.total_executions, 0)
        self.assertIsNone(res.success_rate)
        self.assertIsNone(res.avg_latency_s)
        self.assertIsNone(res.p95_latency_s)
        self.assertEqual(res.total_tokens, 0)
        self.assertEqual(res.estimated_cost_usd, 0.0)

    # -------------------------------------------------------------
    # 5. Infrastructure Error Isolation in Metrics
    # -------------------------------------------------------------
    def test_infrastructure_errors_counted_in_totals_but_excluded_from_success_rate(self):
        """Traces with ERROR and INTERRUPTED increment total_executions but do NOT enter success_rate denominator."""
        now = datetime.datetime.utcnow()
        # Seed 2 PASSED traces and 1 ERROR trace
        t1 = ExecutionTrace(id="t1", agent_id="a1", agent_name="Bot", execution_mode="MOCK", status="PASSED", duration_ms=1000.0, created_at=now)
        t2 = ExecutionTrace(id="t2", agent_id="a1", agent_name="Bot", execution_mode="MOCK", status="PASSED", duration_ms=1200.0, created_at=now)
        t3 = ExecutionTrace(id="t3", agent_id="a1", agent_name="Bot", execution_mode="MOCK", status="ERROR", duration_ms=None, failure_type="PROVIDER_AUTH_ERROR", created_at=now)
        self.db.add_all([t1, t2, t3])
        self.db.commit()

        res = get_summary_analytics(time_range="7d", source="all", db=self.db)

        self.assertEqual(res.total_executions, 3)          # N_total = 3
        self.assertEqual(res.evaluated_executions, 2)      # N_evaluated = 2 (PASSED + FAILED only)
        self.assertEqual(res.passed_executions, 2)
        self.assertEqual(res.failed_executions, 0)
        self.assertEqual(res.infrastructure_failures, 1)   # ERROR counted under infra
        self.assertEqual(res.success_rate, 100.0)          # 2/2 * 100 = 100%, NOT 2/3 (66%)!

    # -------------------------------------------------------------
    # 6. Source Filtering: all, non_seed, seed_only, live_only, mock_only
    # -------------------------------------------------------------
    def test_source_filters(self):
        """Verifies strict provenance filtering across SEED, MOCK, and LIVE traces."""
        now = datetime.datetime.utcnow()
        t_seed = ExecutionTrace(id="ts", agent_id="a1", agent_name="Bot", execution_mode="SEED", status="PASSED", duration_ms=1000.0, created_at=now)
        t_mock = ExecutionTrace(id="tm", agent_id="a1", agent_name="Bot", execution_mode="MOCK", status="PASSED", duration_ms=1200.0, created_at=now)
        t_live = ExecutionTrace(id="tl", agent_id="a1", agent_name="Bot", execution_mode="LIVE", status="PASSED", duration_ms=1400.0, created_at=now)
        self.db.add_all([t_seed, t_mock, t_live])
        self.db.commit()

        # source=all -> 3
        res_all = get_summary_analytics(time_range="7d", source="all", db=self.db)
        self.assertEqual(res_all.total_executions, 3)

        # source=non_seed -> 2 (MOCK + LIVE)
        res_non_seed = get_summary_analytics(time_range="7d", source="non_seed", db=self.db)
        self.assertEqual(res_non_seed.total_executions, 2)

        # source=seed_only -> 1 (SEED)
        res_seed = get_summary_analytics(time_range="7d", source="seed_only", db=self.db)
        self.assertEqual(res_seed.total_executions, 1)

        # source=live_only -> 1 (LIVE)
        res_live = get_summary_analytics(time_range="7d", source="live_only", db=self.db)
        self.assertEqual(res_live.total_executions, 1)

        # source=mock_only -> 1 (MOCK)
        res_mock = get_summary_analytics(time_range="7d", source="mock_only", db=self.db)
        self.assertEqual(res_mock.total_executions, 1)

    def test_source_filter_seed_only(self):
        """Dedicated test confirming source=seed_only strictly queries execution_mode='SEED'."""
        now = datetime.datetime.utcnow()
        t_seed = ExecutionTrace(id="ts1", agent_id="a1", agent_name="Bot", execution_mode="SEED", status="PASSED", duration_ms=1000.0, created_at=now)
        t_live = ExecutionTrace(id="tl1", agent_id="a1", agent_name="Bot", execution_mode="LIVE", status="PASSED", duration_ms=1400.0, created_at=now)
        self.db.add_all([t_seed, t_live])
        self.db.commit()

        res_seed = get_summary_analytics(time_range="7d", source="seed_only", db=self.db)
        self.assertEqual(res_seed.total_executions, 1)
        self.assertEqual(res_seed.passed_executions, 1)

    # -------------------------------------------------------------
    # 7. Activity Timeline & Summary Population Synchronization
    # -------------------------------------------------------------
    def test_activity_synchronization_with_summary(self):
        """Guarantees sum(activity.points.total_runs) == summary.total_executions strictly."""
        seed_database(self.db, force_reset=True)

        res_sum = get_summary_analytics(time_range="7d", source="all", db=self.db)
        res_act = get_execution_activity(time_range="7d", source="all", db=self.db)

        total_from_summary = res_sum.total_executions
        total_from_activity = sum(p.total_runs for p in res_act.points)

        self.assertEqual(total_from_summary, 1420)
        self.assertEqual(total_from_activity, 1420)
        self.assertEqual(total_from_summary, total_from_activity)

    # -------------------------------------------------------------
    # 8. Activity Chart Continuous Zero Fill
    # -------------------------------------------------------------
    def test_activity_chart_continuous_zero_fill(self):
        """All 7 day buckets appear in points even when a day has 0 runs."""
        res_act = get_execution_activity(time_range="7d", source="all", db=self.db)
        self.assertEqual(len(res_act.points), 7)

    # -------------------------------------------------------------
    # 9. Evaluation Benchmarks Independent Applicability
    # -------------------------------------------------------------
    def test_evaluation_benchmarks_calculation(self):
        """Calculates benchmark averages omitting null scores."""
        seed_database(self.db, force_reset=True)

        res_met = get_evaluation_metrics(time_range="7d", source="all", db=self.db)
        self.assertGreater(res_met.evaluated_runs_count, 0)
        self.assertIsNotNone(res_met.tool_selection_accuracy)
        self.assertIsNotNone(res_met.answer_correctness)
        self.assertIsNotNone(res_met.grounding_score)

    # -------------------------------------------------------------
    # 10. Failure Insights Grouping & Percentages
    # -------------------------------------------------------------
    def test_failure_insights_grouping(self):
        """Failure categories group by failure_type and percentages sum to 100% of N_failed."""
        seed_database(self.db, force_reset=True)

        res_fail = get_failure_insights(time_range="7d", source="all", db=self.db)
        self.assertEqual(res_fail.total_failures, 82)
        self.assertGreater(len(res_fail.failures), 0)

        total_pct = sum(f.percentage for f in res_fail.failures)
        self.assertAlmostEqual(total_pct, 100.0, places=0)

if __name__ == "__main__":
    unittest.main()
