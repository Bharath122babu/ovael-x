import { useState, useRef, type KeyboardEvent } from "react";
import {
  Activity,
  Target,
  GitFork,
  Award,
  Layers,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { LearningLaunch } from "../../../types";
import { useOvael } from "../../../context/OvaelContext";
import { HistoryScreen } from "./HistoryScreen";
import { GapForensicsScreen } from "./GapForensicsScreen";
import { GraphScreen } from "./GraphScreen";
import { ProofScreen } from "./ProofScreen";

export type ProgressTabId = "overview" | "gaps" | "graph" | "proof";

interface TabDefinition {
  id: ProgressTabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDefinition[] = [
  { id: "overview", label: "Overview & History", icon: Activity },
  { id: "gaps", label: "Practice Priorities", icon: Target },
  { id: "graph", label: "Topic Map", icon: GitFork },
  { id: "proof", label: "Skills Evidence", icon: Award },
];

export function ProgressScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const [tab, setTab] = useState<ProgressTabId>("overview");
  const tabListRef = useRef<HTMLElement>(null);
  const { sessions, map, courses } = useOvael();

  const totalSessions = sessions?.length ?? 0;
  const mappedConcepts = map?.nodes?.length ?? 0;
  const totalCourses = courses?.length ?? 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = TABS[nextIndex];
      setTab(nextTab.id);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div className="progress-workspace">
      {/* Learning Analytics Editorial Header */}
      <header className="progress-nav-shell">
        <div className="progress-header-left">
          <span className="progress-eyebrow">LEARNING ANALYTICS</span>
          <h1 className="progress-title">Learning Intelligence</h1>
          <p className="progress-lead">
            Explore your learning activity, discover knowledge gaps, and track your understanding.
          </p>
        </div>

        {/* Refined Summary Metrics Strip */}
        <div className="progress-metrics-group" aria-label="Learning metrics summary">
          <div
            className="progress-metric-block"
            title={`${totalSessions} recorded study sessions`}
          >
            <div className="metric-icon-wrap icon-cobalt" aria-hidden="true">
              <Activity size={16} />
            </div>
            <div className="metric-info">
              <span className="metric-val">{totalSessions}</span>
              <span className="metric-lbl">Recorded Sessions</span>
            </div>
          </div>

          <div className="progress-metric-divider" aria-hidden="true" />

          <div
            className="progress-metric-block"
            title={`${mappedConcepts} mapped concept nodes`}
          >
            <div className="metric-icon-wrap icon-teal" aria-hidden="true">
              <Layers size={16} />
            </div>
            <div className="metric-info">
              <span className="metric-val">{mappedConcepts}</span>
              <span className="metric-lbl">Mapped Concepts</span>
            </div>
          </div>

          <div className="progress-metric-divider" aria-hidden="true" />

          <div
            className="progress-metric-block"
            title={`${totalCourses} courses in curriculum`}
          >
            <div className="metric-icon-wrap icon-neutral" aria-hidden="true">
              <CheckCircle2 size={16} />
            </div>
            <div className="metric-info">
              <span className="metric-val">{totalCourses}</span>
              <span className="metric-lbl">Courses</span>
            </div>
          </div>
        </div>
      </header>

      {/* Editorial Four-View Tab Navigation */}
      <nav
        className="progress-tabs-bar"
        role="tablist"
        aria-label="Learning intelligence views"
        ref={tabListRef}
      >
        {TABS.map((item, index) => {
          const Icon = item.icon;
          const isSelected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={`progress-tab-item ${isSelected ? "active" : ""}`}
              onClick={() => setTab(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <Icon size={16} aria-hidden="true" className="tab-icon" />
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Content Panel */}
      <div
        className="progress-tab-content"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && <HistoryScreen onLearn={onLearn} />}
        {tab === "gaps" && <GapForensicsScreen onLearn={onLearn} />}
        {tab === "graph" && <GraphScreen onLearn={onLearn} />}
        {tab === "proof" && <ProofScreen onLearn={onLearn} />}
      </div>
    </div>
  );
}
