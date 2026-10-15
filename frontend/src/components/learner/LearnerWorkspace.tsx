import type { LearnerScreen, LearningLaunch } from "../../types";
import { ProgressScreen } from "./screens/ProgressScreen";
import { LearnScreen } from "./screens/LearnScreen";
import { MaterialsScreen } from "./screens/MaterialsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { CoursesScreen } from "./screens/CoursesScreen";
import { ConnectionsScreen } from "./screens/ConnectionsScreen";
import { HistoryScreen } from "./screens/HistoryScreen";

export function LearnerWorkspace({
  screen,
  onNavigate,
  learningLaunch,
}: {
  screen: LearnerScreen;
  onNavigate: (screen: LearnerScreen, launch?: LearningLaunch) => void;
  learningLaunch: LearningLaunch | null;
}) {
  switch (screen) {
    case "courses":
      return (
        <CoursesScreen onLearn={(launch) => onNavigate("learn", launch)} />
      );
    case "materials":
      return (
        <MaterialsScreen onLearn={(launch) => onNavigate("learn", launch)} />
      );
    case "history":
      return (
        <ProgressScreen onLearn={(launch) => onNavigate("learn", launch)} />
      );
    case "session-history":
      return (
        <HistoryScreen onLearn={(launch) => onNavigate("learn", launch)} />
      );
    case "connections":
      return <ConnectionsScreen />;
    case "settings":
      return <SettingsScreen />;
    default:
      return <LearnScreen onNavigate={onNavigate} launch={learningLaunch} />;
  }
}
