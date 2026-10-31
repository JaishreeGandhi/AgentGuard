import unittest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models import Base, ExecutionTrace, Evaluation, ExecutionStep
from backend.app.routers.executions import get_trace_detail

class TestExecutionsAPI(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_failed_grounding_trace_checklist_and_steps(self):
        """Failed trace with GroundingHallucination must accurately reflect FAILED in Grounding Check."""
        tr = ExecutionTrace(
            id="tr-test-grounding",
            agent_id="agent-math",
            agent_name="MathSolver-Bot",
            execution_mode="MOCK",
            status="FAILED",
            user_query="Calculate 2 + 2",
            final_response="Output claims 2 + 2 = 5",
            duration_ms=750.0,
            prompt_tokens=400,
            completion_tokens=150,
            total_tokens=550,
            failure_type="GroundingHallucination",
            tools_called=["Calculator"]
        )
        self.db.add(tr)

        ev = Evaluation(
            id="eval-tr-test-grounding",
            trace_id="tr-test-grounding",
            is_passed=False,
            failure_type="GroundingHallucination",
            failure_reason="Output contradicts mathematical facts",
            checklist=[]
        )
        self.db.add(ev)
        self.db.commit()

        detail = get_trace_detail("tr-test-grounding", self.db)
        self.assertEqual(detail.status, "FAILED")
        
        # Verify steps synthesized
        self.assertGreater(len(detail.steps), 0)
        self.assertEqual(detail.steps[0].step_type, "USER_INPUT")
        self.assertEqual(detail.steps[-1].step_type, "FINAL_RESPONSE")
        self.assertIn("Grounding Hallucination", detail.steps[-1].flag_warning)

        # Verify checklist is NOT all PASSED
        chk_map = {item.label: item.status for item in detail.checklist}
        self.assertEqual(chk_map.get("Grounding Check"), "FAILED")
        self.assertEqual(chk_map.get("Answer Correctness"), "FAILED")
        self.assertEqual(chk_map.get("Tool Selection Check"), "PASSED")

    def test_failed_wrong_tool_selection_trace(self):
        """Failed trace with WrongToolSelection must mark Tool Selection Check as FAILED."""
        tr = ExecutionTrace(
            id="tr-test-wrong-tool",
            agent_id="agent-docqa",
            agent_name="DocumentQA-Bot",
            execution_mode="MOCK",
            status="FAILED",
            user_query="Search sales report",
            final_response="Done",
            duration_ms=1100.0,
            prompt_tokens=300,
            completion_tokens=100,
            total_tokens=400,
            failure_type="WrongToolSelection",
            tools_called=["Web Search"]
        )
        self.db.add(tr)

        ev = Evaluation(
            id="eval-tr-test-wrong-tool",
            trace_id="tr-test-wrong-tool",
            is_passed=False,
            failure_type="WrongToolSelection",
            failure_reason="Expected Document Search but called Web Search",
            checklist=[]
        )
        self.db.add(ev)
        self.db.commit()

        detail = get_trace_detail("tr-test-wrong-tool", self.db)
        self.assertEqual(detail.status, "FAILED")

        chk_map = {item.label: item.status for item in detail.checklist}
        self.assertEqual(chk_map.get("Tool Selection Check"), "FAILED")
        self.assertEqual(chk_map.get("Grounding Check"), "PASSED")

    def test_passed_trace_checklist(self):
        """Passed trace must have all checklist items as PASSED."""
        tr = ExecutionTrace(
            id="tr-test-pass",
            agent_id="agent-math",
            agent_name="MathSolver-Bot",
            execution_mode="MOCK",
            status="PASSED",
            user_query="Calculate 10 * 10",
            final_response="100",
            duration_ms=500.0,
            prompt_tokens=200,
            completion_tokens=50,
            total_tokens=250,
            failure_type=None,
            tools_called=["Calculator"]
        )
        self.db.add(tr)
        self.db.commit()

        detail = get_trace_detail("tr-test-pass", self.db)
        self.assertEqual(detail.status, "PASSED")
        self.assertTrue(all(item.status == "PASSED" for item in detail.checklist))

if __name__ == "__main__":
    unittest.main()

