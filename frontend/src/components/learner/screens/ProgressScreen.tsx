import { useState } from "react";
import {
  Activity,
  Target,
  GitFork,
  Award,
  Layers,
  CheckCircle2,
} from "lucide-react";
import type { LearningLaunch } from "../../../types";
import { useOvael } from "../../../context/OvaelContext";
import { HistoryScreen } from "./HistoryScreen";
import { GapForensicsScreen } from "./GapForensicsScreen";
import { GraphScreen } from "./GraphScreen";
import { ProofScreen } from "./ProofScreen";

export function ProgressScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const [tab, setTab] = useState<"overview" | "gaps" | "graph" | "proof">("overview");
  const { sessions, map, courses } = useOvael();

  const totalSessions = sessions.length;
  const mappedConcepts = map.nodes.length;

  return (
    <div className="progress-workspace">
      {/* Analytics Subnavigation Header */}
      <header className="progress-nav-shell">
        <div className="progress-nav-left">
          <p className="eyebrow blue">Analytics & Evidence</p>
          <h1 className="progress-title">Learning Intelligence</h1>
        </div>

        {/* Global Overview Metrics Strip */}
        <div className="progress-top-stats" aria-label="Quick metrics">
          <span className="stat-pill" title={`${totalSessions} total recorded sessions`}>
            <Activity size={14} />
            <strong>{totalSessions}</strong> sessions
          </span>
          <span className="stat-pill" title={`${mappedConcepts} mapped concept nodes`}>
            <Layers size={14} />
            <strong>{mappedConcepts}</strong> concepts
          </span>
          <span className="stat-pill" title={`${courses.length} active courses`}>
            <CheckCircle2 size={14} />
            <strong>{courses.length}</strong> courses
          </span>
        </div>
      </header>

      {/* Segmented View Switcher Tabs */}
      <nav className="progress-tabs-bar" aria-label="Progress view destinations">
        <button
          type="button"
          aria-current={tab === "overview" ? "page" : undefined}
          className={`progress-tab-item ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          <Activity size={16} />
          <span>Overview & History</span>
        </button>

        <button
          type="button"
          aria-current={tab === "gaps" ? "page" : undefined}
          className={`progress-tab-item ${tab === "gaps" ? "active" : ""}`}
          onClick={() => setTab("gaps")}
        >
          <Target size={16} />
          <span>Practice Priorities</span>
        </button>

        <button
          type="button"
          aria-current={tab === "graph" ? "page" : undefined}
          className={`progress-tab-item ${tab === "graph" ? "active" : ""}`}
          onClick={() => setTab("graph")}
        >
          <GitFork size={16} />
          <span>Topic Map</span>
        </button>

        <button
          type="button"
          aria-current={tab === "proof" ? "page" : undefined}
          className={`progress-tab-item ${tab === "proof" ? "active" : ""}`}
          onClick={() => setTab("proof")}
        >
          <Award size={16} />
          <span>Skills Evidence</span>
        </button>
      </nav>

      {/* Main Tab Content */}
      <div className="progress-tab-content">
        {tab === "overview" && <HistoryScreen onLearn={onLearn} />}
        {tab === "gaps" && <GapForensicsScreen onLearn={onLearn} />}
        {tab === "graph" && <GraphScreen onLearn={onLearn} />}
        {tab === "proof" && <ProofScreen onLearn={onLearn} />}
      </div>
    </div>
  );
}
