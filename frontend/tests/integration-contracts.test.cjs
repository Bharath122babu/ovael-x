const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(name) {
  const filename = path.resolve(__dirname, "../src/" + name + ".ts");
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return mod.exports;
}
test("visual lesson formats reject oversized or nonnumeric chart data", () => {
  const { parseLearningVisual } = load("learningVisuals");
  assert.equal(parseLearningVisual("steps", '[{"title":"Compare","text":"Check the midpoint"}]')[0].title,"Compare");
  assert.equal(parseLearningVisual("chart", '[{"label":"Example A","value":4}]')[0].value,4);
  assert.throws(()=>parseLearningVisual("chart", '[{"label":"A","value":"4"}]'));
  assert.throws(()=>parseLearningVisual("steps", JSON.stringify(Array.from({length:13},()=>({title:"step",text:"x"})))));
  assert.throws(()=>parseLearningVisual("chart", " ".repeat(12001)));
});
test("study maps never treat imported IDs as Mermaid syntax", () => {
  const { topicMermaid } = load("learningVisuals");
  const source=topicMermaid([{id:'click a call evil()',label:'"<script>'},{id:'b',label:'Next'}],[{source:'click a call evil()',target:'b',relation:'requires'}]);
  assert.ok(source.includes('topic0 -->'));
  assert.ok(!source.includes('call evil'));
  assert.ok(!source.includes('<script>'));
});
test("failed-turn recovery retains the original payload and key", () => {
  const { TurnBuffer } = load("turnBuffer");
  const buffer = new TurnBuffer(),
    payload = {
      response: "original",
      submission: { parts: [{ text: "original" }] },
    };
  const pending = buffer.begin(payload);
  payload.submission.parts[0].text = "edited";
  const retry = buffer.begin({ response: "replacement" });
  assert.equal(retry.key, pending.key);
  assert.equal(retry.payload.response, "original");
  assert.equal(retry.payload.submission.parts[0].text, "original");
  buffer.acknowledge("different-key");
  assert.ok(buffer.pending);
  buffer.acknowledge(pending.key);
  assert.equal(buffer.pending, null);
});
test("rewards exclude empty, active, duplicate, and malformed sessions", () => {
  const { engagement } = load("rewards");
  const session = {
    teaching_session_id: "one",
    status: "completed",
    turn_count: 2,
    ended_at: "2026-10-12T12:00:00Z",
  };
  const r = engagement([
    session,
    session,
    { ...session, teaching_session_id: "active", status: "active" },
    { ...session, teaching_session_id: "empty", turn_count: 0 },
    { ...session, teaching_session_id: "bad", turn_count: NaN },
  ]);
  assert.equal(r.points, 20);
  assert.equal(r.completed, 1);
  assert.equal(r.days, 1);
  assert.equal(r.badges[0].earned, true);
});
test("causal labels and backend identifiers cannot inject Mermaid syntax", () => {
  const { gapMermaid } = load("diagrams");
  const source = gapMermaid({
    micrograph: {
      nodes: [
        {
          id: "bad; click A callback",
          label: 'a"; click A callback <script>',
          state: "active_blocker",
        },
        { id: "target", label: "Target", state: "unknown" },
      ],
      edges: [
        {
          source: "bad; click A callback",
          target: "target",
          relation: 'blocks"; A --> Z',
        },
        { source: "missing", target: "target", relation: "hidden" },
      ],
    },
  });
  assert.ok(source.includes('n0["a#34;'));
  assert.ok(source.includes("n0 -->"));
  assert.ok(!source.includes("bad; click"));
  assert.ok(!source.includes("missing"));
  assert.ok(!source.includes("<script>"));
});
test("diagram configuration overrides and oversized sources are rejected", () => {
  const { checkedMermaid } = load("diagrams");
  assert.throws(() =>
    checkedMermaid('%%{init: {"securityLevel":"loose"}}%%\ngraph LR; A-->B'),
  );
  assert.throws(() => checkedMermaid("---\nconfig: {}\n---\ngraph LR"));
  assert.throws(() => checkedMermaid("a".repeat(12001)));
  assert.equal(
    checkedMermaid("flowchart LR\nA --> B"),
    "flowchart LR\nA --> B",
  );
});
test("local handoffs use newest matching subject, omit raw events, and fit the capsule budget", () => {
  const { latestProjection } = load("localProjection");
  const out = latestProjection(
    [
      { subject_id: "DSA", concept_states: [{ concept_id: "old" }] },
      { subject_id: "BIO", concept_states: [{ concept_id: "foreign" }] },
      {
        subject_id: "DSA",
        events: [{ raw: "private answer" }],
        proof_states: [{ concept_id: "new" }],
        concept_states: Array.from({ length: 100 }, () => ({
          label: "汉".repeat(1000),
        })),
      },
    ],
    "DSA",
  );
  assert.equal(out[0].proof_states?.[0].concept_id, "new");
  assert.equal(out[0].events, undefined);
  assert.ok(new TextEncoder().encode(JSON.stringify(out)).length < 32000);
  assert.deepEqual(latestProjection([], "DSA"), []);
});
test("cookie refresh retries a mutation with the same body/key and rotated CSRF", async () => {
  const { api } = load("api");
  global.document = { cookie: "ovael_csrf=old" };
  const previousFetch = global.fetch,
    calls = [];
  let mutations = 0;
  global.fetch = async (url, init) => {
    calls.push({ url, body: init.body, headers: { ...init.headers } });
    if (url === "/v1/auth/refresh") {
      document.cookie = "ovael_csrf=new";
      return new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: ++mutations === 1 ? 401 : 200 });
  };
  try {
    await api(
      "/v1/learning/sessions/id/turns",
      "POST",
      { response: "saved" },
      "stable-key",
    );
    assert.equal(calls.length, 3);
    assert.equal(calls[0].body, calls[2].body);
    assert.equal(
      calls[0].headers["Idempotency-Key"],
      calls[2].headers["Idempotency-Key"],
    );
    assert.equal(calls[2].headers["X-CSRF-Token"], "new");
  } finally {
    global.fetch = previousFetch;
  }
});
test("late concurrent 401 does not rotate the refresh cookie twice", async () => {
  const { api } = load("api");
  global.document = { cookie: "ovael_csrf=old" };
  const previousFetch = global.fetch;
  let release,
    refreshes = 0,
    fast = 0,
    slow = 0;
  const late = new Promise((resolve) => (release = resolve));
  global.fetch = async (url) => {
    if (url === "/v1/auth/refresh") {
      refreshes++;
      return new Response("{}", { status: 200 });
    }
    if (url === "/slow" && ++slow === 1) return late;
    if (url === "/fast" && ++fast === 1)
      return new Response("{}", { status: 401 });
    return new Response("{}", { status: 200 });
  };
  try {
    const fastRequest = api("/fast"),
      slowRequest = api("/slow");
    await fastRequest;
    release(new Response("{}", { status: 401 }));
    await slowRequest;
    assert.equal(refreshes, 1);
  } finally {
    global.fetch = previousFetch;
  }
});
test("failed sign-in never invokes a refresh", async () => {
  const { api } = load("api");
  global.document = { cookie: "" };
  const previousFetch = global.fetch,
    calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return new Response('{"detail":"invalid login"}', { status: 401 });
  };
  try {
    await assert.rejects(
      api("/v1/auth/login", "POST", { username: "test" }),
      /invalid login/,
    );
    assert.deepEqual(calls, ["/v1/auth/login"]);
  } finally {
    global.fetch = previousFetch;
  }
});
