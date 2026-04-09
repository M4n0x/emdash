# Local Default Task on Main

Auto-create a permanent, pinned task on the project's default branch so users always have a ready-to-use task for working on main.

## Behavior

- On project load, if no task with `metadata.isDefault === true` exists for the project, create one.
- The task uses direct mode (`useWorktree: false`), pointing at the project root.
- Named after the project's detected default branch (e.g., "main", "master").
- Pinned at the top of the sidebar, visually separated from user-created tasks.
- Cannot be archived, deleted, or renamed — it's permanent.
- If the project's default branch changes, the task's branch and name update on next load.

## Task Shape

```
id: generated (same as any task)
projectId: current project
name: <default branch name>
branch: <default branch ref>
path: <project root>
useWorktree: false
status: "idle"
metadata: { isDefault: true }
```

No database schema changes needed — `metadata` is an existing JSON column.

## Components & Changes

### 1. `src/renderer/lib/taskCreationService.ts`

Add `ensureDefaultTask(projectId, defaultBranch, projectPath)`:
- Query tasks for the project where `metadata.isDefault === true`.
- If none exists, create one with the shape above.
- If one exists but the branch differs from the current default branch, update `branch` and `name`.

### 2. `src/renderer/hooks/useProjectManagement.tsx`

Call `ensureDefaultTask` after project tasks are loaded during project initialization.

### 3. Sidebar / task list component

- Render the default task first, visually separated from user-created tasks.
- Hide archive/delete controls when `metadata.isDefault === true`.
- Prevent rename and branch change on the default task.

### 4. TaskModal

Block editing branch or name for the default task.

## Edge Cases

- **No detected default branch:** Use `pickDefaultBranch()` fallback order (`origin/main` > `main` > `origin/master` > `master` > first available). If nothing is found, skip creating the default task.
- **User manually creates a task on main:** Coexists with the default task — they're independent.
- **Default branch rename:** `ensureDefaultTask` detects the mismatch and updates on next project load.
- **Multiple projects:** Each project gets its own default task, scoped by `projectId`.
- **Conversations:** No special handling — default task conversations work like any other task.

## Testing

- **Unit:** `ensureDefaultTask` creates when missing, no-ops when present, updates when branch changes.
- **Integration:** Project load creates the default task on first load and preserves it on subsequent loads.
- **Sidebar:** Default task renders first; archive/delete hidden for it.
