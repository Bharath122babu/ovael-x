import { useState } from "react";
import type { LearningLaunch } from "../../../types";
import { HistoryScreen } from "./HistoryScreen";
import { GapForensicsScreen } from "./GapForensicsScreen";
import { GraphScreen } from "./GraphScreen";
import { ProofScreen } from "./ProofScreen";

export function ProgressScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="progress-workspace">
      <nav className="workspace-tabs" aria-label="Progress views">
        {[
          ["overview", "Overview"],
          ["gaps", "What to practice"],
          ["graph", "Topic map"],
          ["proof", "Skills"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "overview" && <HistoryScreen onLearn={onLearn} />}
      {tab === "gaps" && <GapForensicsScreen onLearn={onLearn} />}
      {tab === "graph" && <GraphScreen onLearn={onLearn} />}
      {tab === "proof" && <ProofScreen onLearn={onLearn} />}
    </div>
  );
}
