import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Database,
  Eye,
  Plug,
  ShieldCheck,
  Sliders,
  User,
} from "lucide-react";

export type SettingsTab =
  | "personalization"
  | "profile"
  | "security"
  | "accessibility"
  | "data"
  | "integrations"
  | "services";

export const TAB_CONFIG: Record<
  SettingsTab,
  { label: string; icon: LucideIcon }
> = {
  personalization: { label: "Personalization", icon: Sliders },
  profile: { label: "Profile", icon: User },
  security: { label: "Security & Sessions", icon: ShieldCheck },
  accessibility: { label: "Accessibility & Display", icon: Eye },
  data: { label: "Sharing & Data", icon: Database },
  integrations: { label: "MCP Connections", icon: Plug },
  services: { label: "System Health", icon: Activity },
};
