# Terminal Agent

Add a "terminal" agent that opens a plain shell with no AI CLI. Available in the agent picker for all tasks. The "local" default task uses it by default.

## Behavior

- A new `terminal` ProviderId registered in the provider registry.
- `terminalOnly: true` — uses the same terminal pane UI as all other agents.
- No AI binary launched — the PTY opens a plain shell session.
- Appears in the agent picker alongside AI agents.
- The "local" default task sets `agentId: 'terminal'`.

## Changes

### 1. `src/shared/providers/registry.ts`

Add `'terminal'` to `PROVIDER_IDS` array. Add a `ProviderDefinition` entry to `PROVIDERS` with:
- `id: 'terminal'`
- `terminalOnly: true`
- `command: ''` (empty — no AI binary)
- Display name: "Terminal"

### 2. `src/renderer/providers/meta.ts`

Add `'terminal'` entry to the agent meta map with a terminal icon.

### 3. `src/renderer/constants/agents.ts`

Add `'terminal'` to `TERMINAL_PROVIDER_IDS`.

### 4. `src/renderer/lib/defaultTask.ts`

Set `agentId: 'terminal'` on the default task returned by `ensureDefaultTask`.

### 5. PTY launch (if needed)

Verify the PTY manager handles an empty/missing command by just opening a shell. If it doesn't, add a guard to skip command injection for the `terminal` provider.

## Edge Cases

- **Initial prompt injection:** Skip for `terminal` provider — no AI to receive it.
- **Agent picker:** Terminal appears like any other agent, no special ordering.
- **Multi-agent tasks:** Terminal can be one of the agents in a multi-agent setup (no special handling needed).

## Testing

- Update `ensureDefaultTask` tests to verify `agentId: 'terminal'`.
- Verify `terminal` is in all three registration lists (`PROVIDER_IDS`, `PROVIDERS`, `TERMINAL_PROVIDER_IDS`).
