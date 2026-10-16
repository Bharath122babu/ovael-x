import type { SettingsTab } from "./types";
import { TAB_CONFIG } from "./types";

interface SettingsSidebarProps {
  tab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

const ORDERED_TABS: SettingsTab[] = [
  "personalization",
  "profile",
  "security",
  "accessibility",
  "data",
  "integrations",
  "services",
];

export function SettingsSidebar({ tab, onSelectTab }: SettingsSidebarProps) {
  return (
    <nav className="settings-sidebar-nav" aria-label="Settings categories">
      {ORDERED_TABS.map((item) => {
        const cfg = TAB_CONFIG[item];
        const IconComponent = cfg.icon;
        const isActive = tab === item;

        return (
          <button
            key={item}
            type="button"
            className={`settings-nav-pill ${isActive ? "active" : ""}`}
            onClick={() => onSelectTab(item)}
          >
            <IconComponent size={16} />
            <span>{cfg.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
