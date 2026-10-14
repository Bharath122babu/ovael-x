import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api";
import { ovaelApi } from "../api/client";
import type {
  AuthUser,
  Course,
  DocumentRecord,
  Health,
  LearningMap,
  MCPConnection,
  MemorySettings,
  Subject,
  TeachingSession,
  UserProfile,
} from "../types";
type ConnectionState = "checking" | "online" | "offline";
interface Value {
  connection: ConnectionState;
  health: Health | null;
  user: AuthUser | null;
  profile: UserProfile | null;
  subjects: Subject[];
  map: LearningMap;
  sessions: TeachingSession[];
  documents: DocumentRecord[];
  courses: Course[];
  connections: MCPConnection[];
  memory: MemorySettings | null;
  loading: boolean;
  error: string;
  apiBase: string;
  localState: Record<string, unknown>[];
  login(name: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  setError(message: string): void;
  saveStateDelta(delta?: Record<string, unknown>): void;
  clearLocalState(): void;
}
const Context = createContext<Value | null>(null);
export function useOvael() {
  const value = useContext(Context);
  if (!value) throw new Error("OVAEL provider missing");
  return value;
}
export function OvaelProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<ConnectionState>("checking"),
    [health, setHealth] = useState<Health | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null),
    [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]),
    [map, setMap] = useState<LearningMap>({ nodes: [], edges: [] });
  const [sessions, setSessions] = useState<TeachingSession[]>([]),
    [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]),
    [connections, setConnections] = useState<MCPConnection[]>([]);
  const [memory, setMemory] = useState<MemorySettings | null>(null),
    [localState, setLocalState] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0),
    userRef = useRef<AuthUser | null>(null);
  const clearLocalState = useCallback(() => {
    if (userRef.current)
      sessionStorage.removeItem(`ovael.local-state.${userRef.current.user_id}`);
    setLocalState([]);
  }, []);
  useEffect(() => {
    if (
      !user ||
      !memory?.personalization_enabled ||
      !connections.some((item) => !item.revoked)
    )
      return;
    let cancelled = false;
    const relay = () =>
      void api("/v1/mcp/context-relay", "POST", {
        capsule: {
          concept_states: map.nodes
            .slice(0, 100)
            .map((node) => ({ concept_id: node.id, status: node.status })),
        },
      }).catch(() => {
        if (!cancelled)
          setError("Could not update connected apps. Try again in Settings.");
      });
    relay();
    const timer = window.setInterval(relay, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.user_id, memory?.personalization_enabled, connections, map]);
  const clear = useCallback(() => {
    clearLocalState();
    userRef.current = null;
    setUser(null);
    setProfile(null);
    setSubjects([]);
    setMap({ nodes: [], edges: [] });
    setSessions([]);
    setDocuments([]);
    setCourses([]);
    setConnections([]);
    setMemory(null);
  }, [clearLocalState]);
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const nextHealth = await ovaelApi.health();
      if (revision !== generation.current) return;
      setHealth(nextHealth);
      setConnection("online");
      let me: AuthUser;
      try {
        me = await ovaelApi.me();
      } catch (e) {
        if ((e as { status?: number }).status === 401) {
          if (revision === generation.current) clear();
          return;
        }
        throw e;
      }
      if (revision !== generation.current) return;
      if (userRef.current?.user_id !== me.user_id) clear();
      userRef.current = me;
      setUser(me);
      const tasks = [
        ovaelApi.profile(),
        ovaelApi.subjects(),
        ovaelApi.learningMap(),
        ovaelApi.learningSessions(),
        ovaelApi.documents(),
        ovaelApi.courses(),
        ovaelApi.mcpConnections(),
        ovaelApi.memorySettings(),
      ] as const;
      const results = await Promise.allSettled(tasks);
      if (revision !== generation.current) return;
      const [p, s, m, h, d, c, x, settings] = results;
      if (p.status === "fulfilled") setProfile(p.value);
      if (s.status === "fulfilled") setSubjects(s.value);
      if (m.status === "fulfilled") setMap(m.value);
      if (h.status === "fulfilled") setSessions(h.value);
      if (d.status === "fulfilled") setDocuments(d.value);
      if (c.status === "fulfilled") setCourses(c.value);
      if (x.status === "fulfilled") setConnections(x.value);
      if (settings.status === "fulfilled") setMemory(settings.value);
      const failed = results.flatMap((r, i) =>
        r.status === "rejected"
          ? [
              [
                "profile",
                "subjects",
                "graph",
                "history",
                "materials",
                "courses",
                "connections",
                "memory",
              ][i],
            ]
          : [],
      );
      if (failed.length)
        setError(
          `Could not refresh ${failed.join(", ")}. Retry when connected.`,
        );
      const raw = sessionStorage.getItem(`ovael.local-state.${me.user_id}`);
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        setLocalState(
          Array.isArray(parsed)
            ? parsed
                .filter((item) => item && typeof item === "object")
                .slice(-100)
            : [],
        );
      } catch {
        setLocalState([]);
      }
    } catch (e) {
      if (revision === generation.current) {
        setConnection("offline");
        setError(e instanceof Error ? e.message : "Could not connect.");
      }
    } finally {
      if (revision === generation.current) setLoading(false);
    }
  }, [clear]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  const login = useCallback(
    async (name: string, password: string) => {
      setLoading(true);
      setError("");
      try {
        await ovaelApi.login(name, password);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign in failed.");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );
  const logout = useCallback(async () => {
    await ovaelApi.logout();
    generation.current++;
    if (userRef.current)
      sessionStorage.removeItem(`ovael.session.${userRef.current.user_id}`);
    clear();
  }, [clear]);
  const saveStateDelta = useCallback(
    (delta?: Record<string, unknown>) => {
      if (
        !delta ||
        !userRef.current ||
        memory?.personalization_enabled !== true ||
        memory.memory_mode !== "local_first"
      )
        return;
      const uid = userRef.current.user_id;
      setLocalState((current) => {
        const next = [
          ...current.slice(-99),
          { ...delta, received_at: new Date().toISOString() },
        ];
        sessionStorage.setItem(
          `ovael.local-state.${uid}`,
          JSON.stringify(next),
        );
        return next;
      });
    },
    [memory],
  );
  const value = useMemo(
    () => ({
      connection,
      health,
      user,
      profile,
      subjects,
      map,
      sessions,
      documents,
      courses,
      connections,
      memory,
      loading,
      error,
      apiBase: "/v1",
      localState,
      login,
      logout,
      refresh,
      setError,
      saveStateDelta,
      clearLocalState,
    }),
    [
      connection,
      health,
      user,
      profile,
      subjects,
      map,
      sessions,
      documents,
      courses,
      connections,
      memory,
      loading,
      error,
      localState,
      login,
      logout,
      refresh,
      saveStateDelta,
      clearLocalState,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
