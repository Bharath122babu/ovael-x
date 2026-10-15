import { useMemo, useState } from "react";
import {
  Plug,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Play,
  FileText,
  AlertCircle,
  X,
  Server,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { api } from "../../../api";
import { RichText } from "../../content/RichText";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import type { MCPConnection } from "../../../types";

function publicMcpUrl(serverUrl?: string): string {
  if (typeof window !== "undefined" && ovaelApi.baseUrl.startsWith("/")) {
    return `${window.location.origin}/mcp/`;
  }
  return serverUrl || "http://127.0.0.1:8000/mcp/";
}

export function ConnectionsScreen() {
  const { connections, map, memory, refresh, setError } = useOvael();
  const [clientName, setClientName] = useState("");
  const [issued, setIssued] = useState<MCPConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  // Remote MCP Server State
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
      ) {
        throw new Error("Arguments must be a valid JSON object.");
      }
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
              item.annotations?.readOnlyHint
          )?.name || ""
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
        true
      );
      await refresh();
      setCopied("notes");
    } catch (e) {
      setRemoteError(
        e instanceof Error ? e.message : "Could not save the result to Materials."
      );
    } finally {
      setRemoteBusy(false);
    }
  };

  const active = useMemo(
    () => connections.filter((connection) => !connection.revoked),
    [connections]
  );

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
        2
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
      const res = await ovaelApi.createMcpConnection(clientName.trim());
      setIssued(res);
      setClientName("");
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection could not be created."
      );
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (connection: MCPConnection) => {
    if (
      !window.confirm(
        `Revoke access for ${connection.client_name}? That client will immediately lose access.`
      )
    )
      return;
    setBusy(true);
    try {
      await ovaelApi.revokeMcpConnection(connection.connection_id);
      if (issued?.connection_id === connection.connection_id) setIssued(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="integrations-panel-workspace">
      {/* Section 1: Connect External MCP Tool Server */}
      <section className="mcp-card-box" aria-label="External MCP Server">
        <div className="mcp-card-header">
          <Server size={20} className="header-icon" />
          <div>
            <h3>External MCP Server Tools</h3>
            <p>Connect any Model Context Protocol tool server to query external knowledge or databases.</p>
          </div>
        </div>

        <form
          className="mcp-server-form"
          onSubmit={(e) => {
            e.preventDefault();
            void query();
          }}
        >
          <div className="mcp-inputs-row">
            <label className="mcp-field-label">
              Server HTTP Endpoint <span className="req">*</span>
              <input
                type="url"
                value={url}
                disabled={remoteBusy}
                placeholder="https://mcp-server.example.com/mcp/"
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTools([]);
                  setResult("");
                }}
                required
                className="mcp-input"
              />
            </label>

            <label className="mcp-field-label">
              Bearer Token (Optional)
              <input
                type="password"
                autoComplete="off"
                value={token}
                disabled={remoteBusy}
                placeholder="Optional API key"
                onChange={(e) => {
                  setToken(e.target.value);
                  setTools([]);
                }}
                className="mcp-input"
              />
            </label>
          </div>

          <div className="mcp-action-row">
            <button
              type="submit"
              className="primary-button"
              disabled={remoteBusy || !url.trim()}
            >
              {remoteBusy ? (
                <>
                  <RefreshCw size={15} className="spin-icon" />
                  <span>Querying Server…</span>
                </>
              ) : (
                <>
                  <Plug size={15} />
                  <span>Discover Tools</span>
                </>
              )}
            </button>
          </div>
        </form>

        {remoteError && (
          <aside className="chat-error-banner" role="alert">
            <AlertCircle size={15} />
            <span>{remoteError}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setRemoteError("")}
              aria-label="Dismiss error"
            >
              <X size={12} />
            </button>
          </aside>
        )}

        {/* Available Tools Execution Block */}
        {tools.length > 0 && (
          <div className="remote-tools-studio">
            <div className="tool-selector-group">
              <label className="mcp-field-label">
                Selected Tool
                <select
                  value={tool}
                  disabled={remoteBusy}
                  onChange={(e) => {
                    setTool(e.target.value);
                    setArgs("{}");
                    setResult("");
                  }}
                  className="mcp-select"
                >
                  <option value="">Select an available tool</option>
                  {tools.map((item) => (
                    <option
                      key={item.name}
                      value={item.name}
                      disabled={!item.annotations?.readOnlyHint}
                    >
                      {item.name} {!item.annotations?.readOnlyHint ? "(not read-only)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {tool && (
                <p className="tool-desc-text">
                  {tools.find((item) => item.name === tool)?.description || "No description provided."}
                </p>
              )}
            </div>

            {tool && (
              <div className="tool-runner-block">
                <details className="schema-details">
                  <summary>
                    <Code2 size={13} /> View Input Schema JSON
                  </summary>
                  <pre className="schema-view">
                    {JSON.stringify(
                      tools.find((item) => item.name === tool)?.inputSchema,
                      null,
                      2
                    )}
                  </pre>
                </details>

                <label className="mcp-field-label">
                  JSON Arguments
                  <textarea
                    value={args}
                    rows={3}
                    disabled={remoteBusy}
                    onChange={(e) => setArgs(e.target.value)}
                    className="mcp-textarea"
                    placeholder='{"query": "example"}'
                  />
                </label>

                <div className="tool-run-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={remoteBusy}
                    onClick={() => void query(true)}
                  >
                    <Play size={14} />
                    <span>Run Tool</span>
                  </button>

                  <button
                    type="button"
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
                </div>
              </div>
            )}

            {/* Execution Result */}
            {result && (
              <div className={`tool-result-box ${resultError ? "is-error" : ""}`}>
                <div className="result-header">
                  <strong>{resultError ? "Tool Execution Failed" : "Tool Execution Output"}</strong>
                  {!resultError && (
                    <button
                      type="button"
                      className="primary-button compact"
                      disabled={remoteBusy || copied === "notes"}
                      onClick={() => void importResult()}
                    >
                      <FileText size={14} />
                      <span>{copied === "notes" ? "Added to Materials" : "Save as Material"}</span>
                    </button>
                  )}
                </div>
                <div className="result-content-view">
                  <RichText markdown={result} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Host OVAEL-X as an MCP Server */}
      <section className="mcp-card-box" aria-label="Host OVAEL-X MCP Server">
        <div className="mcp-card-header">
          <ShieldCheck size={20} className="header-icon" />
          <div>
            <h3>Grant External App Access (MCP Host)</h3>
            <p>Connect Claude Desktop, Cursor, or another MCP client to query your OVAEL-X learning topics.</p>
          </div>
        </div>

        <div className="mcp-token-creator">
          <label className="mcp-field-label">
            Client / Application Name
            <input
              value={clientName}
              disabled={busy}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Claude Desktop, Cursor AI"
              className="mcp-input"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || !clientName.trim()}
            onClick={() => void create()}
          >
            {busy ? "Generating…" : "Generate Access Token"}
          </button>
        </div>

        {issued?.access_token && (
          <div className="mcp-issued-token-card">
            <div className="issued-header">
              <span className="eyebrow coral">Configuration Generated</span>
              <h4>Add to your MCP Client Configuration</h4>
              <p>Copy this JSON block into your application's <code>claude_desktop_config.json</code>.</p>
            </div>

            <pre className="mcp-config-snippet">{clientConfig}</pre>

            <button
              type="button"
              className="primary-button copy-config-btn"
              onClick={() =>
                void copy(clientConfig, "config").catch(() =>
                  setError("Could not copy. Select and copy manually.")
                )
              }
            >
              {copied === "config" ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied === "config" ? "Copied to Clipboard" : "Copy Configuration"}</span>
            </button>
          </div>
        )}

        {/* Active Connected Clients List */}
        <div className="mcp-active-clients">
          <h4 className="active-clients-title">Active Connected Clients ({active.length})</h4>
          <ul className="connected-clients-list">
            {active.map((connection) => (
              <li key={connection.connection_id} className="client-item-row">
                <div className="client-info">
                  <strong>{connection.client_name}</strong>
                  <small>Expires {new Date(connection.expires_at).toLocaleDateString()}</small>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="quiet-button revoke-client-btn"
                  onClick={() =>
                    void revoke(connection).catch((e) => setError(e.message))
                  }
                >
                  <Trash2 size={13} />
                  <span>Revoke Access</span>
                </button>
              </li>
            ))}

            {active.length === 0 && (
              <li className="empty-clients-notice">
                <span>No active client tokens issued yet.</span>
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
