import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  LockKeyhole,
  PlugZap,
  ServerCog,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api } from "../../../api";
import { RichText } from "../../content/RichText";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import type { MCPConnection } from "../../../types";
const scopeLabels: Record<string, string> = {
  "learning.context.read": "Read active learning context",
  "learning.external_events.submit": "Submit external learning evidence",
  "learning.map.read": "Read the learning-map projection",
  "learning.materials.search": "Search authorized materials",
  "learning.session.create": "Start a teaching session",
  "learning.session.interact": "Continue a teaching session",
  "learning.suggestions.submit": "Suggest a teaching strategy",
};
function publicMcpUrl(serverUrl?: string) {
  if (typeof window !== "undefined" && ovaelApi.baseUrl.startsWith("/"))
    return `${window.location.origin}/mcp/`;
  return serverUrl || "http://127.0.0.1:8000/mcp/";
}
export function ConnectionsScreen() {
  const { connections, map, memory, refresh, setError } = useOvael();
  const [clientName, setClientName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [issued, setIssued] = useState<MCPConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [tools, setTools] = useState<
    Array<{
      name: string;
      description?: string;
      inputSchema: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean };
    }>
  >([]);
  const [tool, setTool] = useState("");
  const [args, setArgs] = useState("{}");
  const [result, setResult] = useState("");
  const [resultError, setResultError] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const query = async (run = false) => {
    if (remoteBusy) return;
    setRemoteBusy(true);
    setRemoteError("");
    setResult("");
    setCopied("");
    try {
      const argumentsValue = run ? JSON.parse(args) : {};
      if (
        !argumentsValue ||
        typeof argumentsValue !== "object" ||
        Array.isArray(argumentsValue)
      )
        throw new Error("Arguments must be a JSON object.");
      const response = await api("/v1/connections/servers/query", "POST", {
        url,
        token,
        tool: run ? tool : undefined,
        arguments: argumentsValue,
      });
      if (run) {
        setResult(response.text);
        setResultError(response.is_error);
      } else {
        setTools(response.tools);
        setTool(
          response.tools.find(
            (item: { annotations?: { readOnlyHint?: boolean } }) =>
              item.annotations?.readOnlyHint,
          )?.name || "",
        );
      }
    } catch (e) {
      setRemoteError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setRemoteBusy(false);
    }
  };
  const importResult = async () => {
    setRemoteBusy(true);
    setRemoteError("");
    try {
      await ovaelApi.uploadDocument(
        new File([result], `${tool.replace(/[^a-z0-9_-]/gi, "-")}-notes.md`, {
          type: "text/markdown",
        }),
        undefined,
        true,
      );
      await refresh();
      setCopied("notes");
    } catch (e) {
      setRemoteError(
        e instanceof Error ? e.message : "Could not save the result.",
      );
    } finally {
      setRemoteBusy(false);
    }
  };
  const active = useMemo(
    () => connections.filter((connection) => !connection.revoked),
    [connections],
  );
  const revoked = useMemo(
    () => connections.filter((connection) => connection.revoked),
    [connections],
  );
  const selected =
    active.find((connection) => connection.connection_id === selectedId) ||
    active[0];
  const endpoint = publicMcpUrl(issued?.mcp_url);
  const clientConfig = issued?.access_token
    ? JSON.stringify(
        {
          mcpServers: {
            ovael: {
              type: "http",
              url: endpoint,
              headers: { Authorization: `Bearer ${issued.access_token}` },
            },
          },
        },
        null,
        2,
      )
    : "";
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  };
  const create = async () => {
    if (!clientName.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (memory?.personalization_enabled) {
        const capsule = {
          concept_states: map.nodes
            .slice(0, 100)
            .map((node) => ({ concept_id: node.id, status: node.status })),
        };
        await api("/v1/mcp/context-relay", "POST", { capsule });
      }
      const result = await ovaelApi.createMcpConnection(clientName.trim());
      setIssued(result);
      setSelectedId(result.connection_id);
      setClientName("");
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection could not be created",
      );
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (connection: MCPConnection) => {
    if (
      !window.confirm(
        `Revoke ${connection.client_name}? That client will immediately lose access.`,
      )
    )
      return;
    setBusy(true);
    try {
      await ovaelApi.revokeMcpConnection(connection.connection_id);
      if (issued?.connection_id === connection.connection_id) setIssued(null);
      setSelectedId("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="integrations-panel">
      <h2>Connected tools</h2>
      <p>Connect an MCP server to use its tools with your materials.</p>
      <form
        className="integration-form"
        onSubmit={(e) => {
          e.preventDefault();
          void query();
        }}
      >
        <label>
          Server URL
          <input
            type="url"
            value={url}
            disabled={remoteBusy}
            placeholder="https://your-server.example/mcp/"
            onChange={(e) => {
              setUrl(e.target.value);
              setTools([]);
              setResult("");
            }}
            required
          />
        </label>
        <label>
          Access token (if required)
          <input
            type="password"
            autoComplete="off"
            value={token}
            disabled={remoteBusy}
            onChange={(e) => {
              setToken(e.target.value);
              setTools([]);
            }}
          />
        </label>
        <button className="primary-button" disabled={remoteBusy || !url.trim()}>
          {remoteBusy ? "Connecting…" : "Find tools"}
        </button>
      </form>
      {remoteError && (
        <p className="form-error" role="alert">
          {remoteError}
        </p>
      )}
      {!!tools.length && (
        <section className="remote-tools">
          <label>
            Available tools
            <select
              value={tool}
              disabled={remoteBusy}
              onChange={(e) => {
                setTool(e.target.value);
                setArgs("{}");
                setResult("");
              }}
            >
              <option value="">Choose a read-only tool</option>
              {tools.map((item) => (
                <option
                  key={item.name}
                  value={item.name}
                  disabled={!item.annotations?.readOnlyHint}
                >
                  {item.name}
                  {!item.annotations?.readOnlyHint ? " (not read-only)" : ""}
                </option>
              ))}
            </select>
          </label>
          <p>{tools.find((item) => item.name === tool)?.description}</p>
          {tool && (
            <>
              <details>
                <summary>Expected arguments</summary>
                <pre>
                  {JSON.stringify(
                    tools.find((item) => item.name === tool)?.inputSchema,
                    null,
                    2,
                  )}
                </pre>
              </details>
              <label>
                Arguments
                <textarea
                  value={args}
                  rows={4}
                  disabled={remoteBusy}
                  onChange={(e) => setArgs(e.target.value)}
                />
              </label>
              <button
                className="secondary-button"
                disabled={remoteBusy}
                onClick={() => void query(true)}
              >
                Run tool
              </button>
            </>
          )}
          {result && (
            <div className="remote-result">
              <h3>{resultError ? "Tool returned an error" : "Result"}</h3>
              <RichText markdown={result} />
              {!resultError && (
                <button
                  className="secondary-button"
                  disabled={remoteBusy || copied === "notes"}
                  onClick={() => void importResult()}
                >
                  {copied === "notes"
                    ? "Added to Materials"
                    : "Add to Materials"}
                </button>
              )}
            </div>
          )}
          <button
            className="quiet-button"
            disabled={remoteBusy}
            onClick={() => {
              setTools([]);
              setToken("");
              setResult("");
              setTool("");
            }}
          >
            Disconnect
          </button>
        </section>
      )}
      <details className="export-connection">
        <summary>Use OVAEL-X in another app</summary>
        <p>Add OVAEL-X as a server in an app that supports MCP over HTTP.</p>
        <div className="connection-create">
          <label>
            App name
            <input
              value={clientName}
              disabled={busy}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="For example: Claude Desktop"
            />
          </label>
          <button
            className="secondary-button"
            disabled={busy || !clientName.trim()}
            onClick={() => void create()}
          >
            {busy ? "Creating…" : "Create access token"}
          </button>
        </div>
        {issued?.access_token && (
          <section className="mcp-setup">
            <p>Save this configuration now. The token is shown once.</p>
            <pre>{clientConfig}</pre>
            <button
              className="secondary-button"
              onClick={() =>
                void copy(clientConfig, "config").catch(() =>
                  setError(
                    "Could not copy. Select the configuration and copy it manually.",
                  ),
                )
              }
            >
              {copied === "config" ? "Copied" : "Copy configuration"}
            </button>
          </section>
        )}
        <ul className="connected-apps">
          {active.map((connection) => (
            <li key={connection.connection_id}>
              <span>
                {connection.client_name}
                <small>
                  Expires {new Date(connection.expires_at).toLocaleDateString()}
                </small>
              </span>
              <button
                disabled={busy}
                className="text-button"
                onClick={() =>
                  void revoke(connection).catch((e) => setError(e.message))
                }
              >
                Revoke access
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
