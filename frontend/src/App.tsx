import React, { useState, useEffect } from "react";
import { ShellHeader } from "./components/ShellHeader";
import { StateSwitcherBanner } from "./components/StateSwitcherBanner";
import { PageHeader } from "./components/PageHeader";
import { QuickActions } from "./components/QuickActions";
import { MetricCards } from "./components/MetricCards";
import { ActivityChart } from "./components/ActivityChart";
import { BenchmarkMetrics } from "./components/BenchmarkMetrics";
import { FailureInsights } from "./components/FailureInsights";
import { AgentTable } from "./components/AgentTable";
import { TraceTable } from "./components/TraceTable";
import { TraceDrawer } from "./components/TraceDrawer";
import { RunEvaluationModal } from "./components/RunEvaluationModal";
import {
  SummaryAnalytics,
  ActivityResponse,
  EvaluationBenchmarks,
  FailureInsightsResponse,
  AgentPerformanceItem,
  TraceSummaryItem,
  TimeRange,
  ViewStateMode
} from "./types/dashboard";
import {
  fetchSummaryAnalytics,
  fetchActivity,
  fetchMetrics,
  fetchFailures,
  fetchAgentPerformance,
  fetchRecentTraces,
  resetDatabase
} from "./api/client";

export const App: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [viewMode, setViewMode] = useState<ViewStateMode>("LIVE");

  // Core Data States
  const [summary, setSummary] = useState<SummaryAnalytics | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [metrics, setMetrics] = useState<EvaluationBenchmarks | null>(null);
  const [failures, setFailures] = useState<FailureInsightsResponse | null>(null);
  const [agents, setAgents] = useState<AgentPerformanceItem[]>([]);
  const [traces, setTraces] = useState<TraceSummaryItem[]>([]);

  // Filter States
  const [traceStatusFilter, setTraceStatusFilter] = useState<string>("ALL");

  // Overlays
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [activeModalAgentId, setActiveModalAgentId] = useState<string | null>(null);

  // Data loader
  const loadDashboardData = async () => {
    try {
      const [sum, act, met, fail, ag, tr] = await Promise.all([
        fetchSummaryAnalytics(timeRange),
        fetchActivity(timeRange),
        fetchMetrics(),
        fetchFailures(),
        fetchAgentPerformance(),
        fetchRecentTraces(traceStatusFilter)
      ]);
      setSummary(sum);
      setActivity(act);
      setMetrics(met);
      setFailures(fail);
      setAgents(ag);
      setTraces(tr);
    } catch (err) {
      console.error("Dashboard data load failed:", err);
      // If error occurs, we can default viewMode to ERROR if in LIVE
      if (viewMode === "LIVE") {
        setViewMode("ERROR");
      }
    }
  };

  useEffect(() => {
    if (viewMode === "LIVE") {
      loadDashboardData();
    }
  }, [timeRange, viewMode, traceStatusFilter]);

  const handleResetDb = async (empty: boolean) => {
    await resetDatabase(empty);
    if (empty) {
      setViewMode("EMPTY");
    } else {
      setViewMode("LIVE");
      loadDashboardData();
    }
  };

  const handleInspectFailedRuns = () => {
    setTraceStatusFilter("FAILED");
    const traceSection = document.getElementById("recent-traces-table");
    if (traceSection) {
      traceSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleViewAllTraces = () => {
    setTraceStatusFilter("ALL");
    const traceSection = document.getElementById("recent-traces-table");
    if (traceSection) {
      traceSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenRunModal = (agentId?: string) => {
    setActiveModalAgentId(agentId || null);
    setIsRunModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-[#f8fafc] flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 1. Global Shell Header */}
      <ShellHeader />

      {/* 2. Developer State Switcher (Allows live switching of the 4 requested states) */}
      <StateSwitcherBanner
        currentMode={viewMode}
        onModeChange={(m) => setViewMode(m)}
        onResetDb={handleResetDb}
      />

      {/* 3. 1440px Main Responsive Grid Container */}
      <main className="w-full max-w-[1440px] mx-auto px-6 py-6 space-y-6 flex-1">
        {/* Page Heading & Time Range & Primary CTA */}
        <PageHeader
          timeRange={timeRange}
          onTimeRangeChange={(r) => setTimeRange(r)}
          onOpenRunModal={() => handleOpenRunModal()}
        />

        {/* Quick Utility Actions */}
        <QuickActions
          onFilterFailed={handleInspectFailedRuns}
          onViewAllTraces={handleViewAllTraces}
          onNewAgent={() => handleOpenRunModal()}
          onNewSuite={() => handleOpenRunModal()}
          failedCount={summary?.failed_executions || 82}
        />

        {/* Core Job 1: Overall Evaluation Performance — 6 Metric KPI Cards */}
        <section aria-label="Evaluation Performance Metrics">
          <MetricCards
            data={summary}
            mode={viewMode}
            onFilterFailed={handleInspectFailedRuns}
          />
        </section>

        {/* Main Analytics Row: 8-Col Activity Chart + 4-Col Evaluation Benchmarks */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" aria-label="Activity and Benchmarks">
          <div className="lg:col-span-8">
            <ActivityChart
              points={activity?.points || []}
              timeRange={timeRange}
              onTimeRangeChange={(r) => setTimeRange(r)}
              mode={viewMode}
              onTriggerRun={() => handleOpenRunModal()}
            />
          </div>
          <div className="lg:col-span-4">
            <BenchmarkMetrics
              metrics={metrics}
              mode={viewMode}
            />
          </div>
        </section>

        {/* Core Job 3: Failure Insights — 12-Col Container */}
        <section aria-label="Failure Insights">
          <FailureInsights
            failures={failures?.failures || []}
            totalFailures={failures?.total_failures || 0}
            mode={viewMode}
            onSelectFailureType={handleInspectFailedRuns}
          />
        </section>

        {/* Core Job 2: Compare Registered Agents — 12-Col Table */}
        <section aria-label="Agent Performance Comparison">
          <AgentTable
            agents={agents}
            mode={viewMode}
            onRunEval={(agentId) => handleOpenRunModal(agentId)}
          />
        </section>

        {/* Core Job 4: Investigate Individual Execution Traces — 12-Col Table */}
        <section aria-label="Recent Execution Traces">
          <TraceTable
            traces={traces}
            mode={viewMode}
            onSelectTrace={(id) => setSelectedTraceId(id)}
            statusFilter={traceStatusFilter}
            onStatusFilterChange={(s) => setTraceStatusFilter(s)}
          />
        </section>
      </main>

      {/* Overlays */}
      {/* Overlay 1: Right-Side Sliding Drawer (Component 17b) */}
      <TraceDrawer
        traceId={selectedTraceId}
        onClose={() => setSelectedTraceId(null)}
      />

      {/* Overlay 2: Simplified Run Evaluation Modal (Component 8) */}
      <RunEvaluationModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        agents={agents}
        initialAgentId={activeModalAgentId}
        onRunStarted={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};

