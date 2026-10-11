# Plugin-assisted architecture audit

This release was cross-checked against current public engineering patterns before implementation.

## Exa / web research

The architecture review reinforced a workflow-first rule: known execution graphs should be encoded in code, while LLMs are inserted only at bounded judgment/generation points. Production guidance also consistently flags autonomous control loops as a latency/cost/reliability tradeoff rather than a default.

Reference used during audit:
- Anthropic, *Building Effective AI Agents*: https://www.anthropic.com/engineering/building-effective-agents

## GitHub code-pattern review

### PydanticAI

PydanticAI exposes explicit per-run usage ceilings such as request/tool-call limits. OVAEL 3.0 adopts the underlying idea directly through its own `SemanticBudget`, avoiding a new runtime framework dependency.

Repository: https://github.com/pydantic/pydantic-ai

### LangGraph

LangGraph's state-graph design reinforces the value of typed shared state and explicit state transitions. OVAEL already has a narrower known graph, so the release keeps its own Pydantic `DecisionFrame` + deterministic transition code instead of adding a graph framework.

Repository: https://github.com/langchain-ai/langgraph

### LiteLLM

LiteLLM was reviewed as a provider gateway pattern. OVAEL keeps its small existing `ModelGateway` because adding a large provider abstraction would increase dependency surface without improving the core learning decision problem.

Repository: https://github.com/BerriAI/litellm

## Mermaid

The v3 runtime graph in `ARCHITECTURE_DECISION_AI.md` was rendered/validated using the Mermaid plugin.

## Decision

Useful patterns were adopted; framework dependencies were not. The release objective is fewer control layers and fewer model calls, so adding a framework is justified only if it removes more complexity than it introduces.
