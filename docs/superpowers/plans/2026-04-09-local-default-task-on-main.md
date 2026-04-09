# Local Default Task on Main — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create a permanent, undeletable task on the project's default branch when a project loads, pinned at the top of the sidebar.

**Architecture:** A new `isDefault` flag in `TaskMetadata` marks the default task. A pure function `ensureDefaultTask` checks whether one exists for a project and returns a task to save if not. The renderer calls this after task queries resolve. Sidebar sorting partitions default tasks above pinned tasks. TaskItem hides destructive actions for default tasks.

**Tech Stack:** TypeScript, React, Vitest, Drizzle (existing schema — no migration needed)

---

### Task 1: Add `isDefault` to TaskMetadata

**Files:**
- Modify: `src/renderer/types/chat.ts:21-66` (TaskMetadata interface)

- [ ] **Step 1: Add `isDefault` field to TaskMetadata**

In `src/renderer/types/chat.ts`, add a new field to the `TaskMetadata` interface after the `isPinned` field (line 40):

```typescript
/** Whether this is the auto-created default task for the project's main branch */
isDefault?: boolean | null;
```

- [ ] **Step 2: Run type-check to verify no breakage**

Run: `pnpm run type-check`
Expected: PASS — the new optional field is backward-compatible.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/types/chat.ts
git commit -m "feat: add isDefault flag to TaskMetadata"
```

---

### Task 2: Create `ensureDefaultTask` function with tests

**Files:**
- Create: `src/renderer/lib/defaultTask.ts`
- Create: `src/test/renderer/defaultTask.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/test/renderer/defaultTask.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ensureDefaultTask } from '../../renderer/lib/defaultTask';
import type { Task } from '../../renderer/types/app';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    projectId: overrides.projectId ?? 'project-1',
    name: overrides.name ?? 'Task',
    branch: overrides.branch ?? 'main',
    path: overrides.path ?? '/tmp/project',
    status: overrides.status ?? 'idle',
    useWorktree: overrides.useWorktree ?? true,
    metadata: overrides.metadata ?? null,
    agentId: overrides.agentId,
    archivedAt: overrides.archivedAt,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  };
}

describe('ensureDefaultTask', () => {
  it('returns a new default task when none exists', () => {
    const result = ensureDefaultTask({
      projectId: 'project-1',
      projectPath: '/tmp/project',
      defaultBranch: 'main',
      existingTasks: [],
    });

    expect(result).not.toBeNull();
    expect(result!.id).toMatch(/^default-project-1$/);
    expect(result!.name).toBe('main');
    expect(result!.branch).toBe('main');
    expect(result!.path).toBe('/tmp/project');
    expect(result!.useWorktree).toBe(false);
    expect(result!.status).toBe('idle');
    expect(result!.metadata?.isDefault).toBe(true);
    expect(result!.projectId).toBe('project-1');
  });

  it('returns null when a default task already exists with matching branch', () => {
    const existing = makeTask({
      id: 'default-project-1',
      metadata: { isDefault: true },
      branch: 'main',
      name: 'main',
    });

    const result = ensureDefaultTask({
      projectId: 'project-1',
      projectPath: '/tmp/project',
      defaultBranch: 'main',
      existingTasks: [existing],
    });

    expect(result).toBeNull();
  });

  it('returns an updated task when default branch has changed', () => {
    const existing = makeTask({
      id: 'default-project-1',
      metadata: { isDefault: true },
      branch: 'master',
      name: 'master',
    });

    const result = ensureDefaultTask({
      projectId: 'project-1',
      projectPath: '/tmp/project',
      defaultBranch: 'main',
      existingTasks: [existing],
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe('default-project-1');
    expect(result!.name).toBe('main');
    expect(result!.branch).toBe('main');
    expect(result!.metadata?.isDefault).toBe(true);
  });

  it('returns null when defaultBranch is undefined', () => {
    const result = ensureDefaultTask({
      projectId: 'project-1',
      projectPath: '/tmp/project',
      defaultBranch: undefined,
      existingTasks: [],
    });

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/test/renderer/defaultTask.test.ts`
Expected: FAIL — module `../../renderer/lib/defaultTask` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/renderer/lib/defaultTask.ts`:

```typescript
import type { Task } from '../types/app';

interface EnsureDefaultTaskParams {
  projectId: string;
  projectPath: string;
  defaultBranch: string | undefined;
  existingTasks: Task[];
}

/**
 * Check whether a default task exists for the project. Returns:
 * - A new Task to save if none exists
 * - An updated Task to save if the default branch changed
 * - null if everything is up-to-date (or no default branch could be determined)
 */
export function ensureDefaultTask(params: EnsureDefaultTaskParams): Task | null {
  const { projectId, projectPath, defaultBranch, existingTasks } = params;

  if (!defaultBranch) return null;

  const existing = existingTasks.find((t) => t.metadata?.isDefault === true);

  if (existing) {
    // Already exists — check if branch changed
    if (existing.branch === defaultBranch) return null;

    // Branch changed — return updated task
    return {
      ...existing,
      branch: defaultBranch,
      name: defaultBranch,
    };
  }

  // Create new default task
  return {
    id: `default-${projectId}`,
    projectId,
    name: defaultBranch,
    branch: defaultBranch,
    path: projectPath,
    status: 'idle',
    useWorktree: false,
    metadata: { isDefault: true },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/test/renderer/defaultTask.test.ts`
Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Run full type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/lib/defaultTask.ts src/test/renderer/defaultTask.test.ts
git commit -m "feat: add ensureDefaultTask function with tests"
```

---

### Task 3: Integrate `ensureDefaultTask` into task loading

**Files:**
- Modify: `src/renderer/hooks/useTaskManagement.ts:210-225`

- [ ] **Step 1: Add the integration after task queries resolve**

In `src/renderer/hooks/useTaskManagement.ts`, add an import at the top (after existing imports around line 22):

```typescript
import { ensureDefaultTask } from '../lib/defaultTask';
```

Then, after the `tasksByProjectId` memo (line 225), add an effect that ensures the default task exists for each project. Find the section right after:

```typescript
  const tasksByProjectId = useMemo(() => {
    const map: Record<string, Task[]> = {};
    projects.forEach((p, i) => {
      map[p.id] = taskResults[i]?.data ?? [];
    });
    return map;
  }, [projects, taskResults]);
```

Add this effect after that block:

```typescript
  // Ensure each project has a default task on its default branch
  const ensuredDefaultTaskProjectIds = useRef(new Set<string>());
  useEffect(() => {
    for (const project of projects) {
      const tasks = tasksByProjectId[project.id] ?? [];
      // Only run once per project per mount to avoid loops
      if (ensuredDefaultTaskProjectIds.current.has(project.id)) continue;

      const defaultBranch = project.gitInfo.baseRef || project.gitInfo.branch || 'main';
      const taskToSave = ensureDefaultTask({
        projectId: project.id,
        projectPath: project.path,
        defaultBranch,
        existingTasks: tasks,
      });

      if (taskToSave) {
        ensuredDefaultTaskProjectIds.current.add(project.id);
        rpc.db.saveTask(taskToSave).then(() => {
          queryClient.setQueryData<Task[]>(['tasks', project.id], (old = []) =>
            upsertTaskInList(old, taskToSave)
          );
        });
      } else {
        ensuredDefaultTaskProjectIds.current.add(project.id);
      }
    }
  }, [projects, tasksByProjectId, queryClient]);
```

You'll also need to add `useRef` to the React import at the top of the file (line 1):

```typescript
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
```

Note: `useRef` and `useEffect` are already imported on line 1. Verify before adding.

- [ ] **Step 2: Run type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `pnpm exec vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useTaskManagement.ts
git commit -m "feat: auto-create default task on project load"
```

---

### Task 4: Pin default task at top of sidebar, above pinned tasks

**Files:**
- Modify: `src/renderer/components/sidebar/LeftSidebar.tsx:162-206`

- [ ] **Step 1: Update `applySortCriterion` to partition default tasks first**

In `src/renderer/components/sidebar/LeftSidebar.tsx`, replace the `applySortCriterion` function (lines 163-190):

```typescript
/** Apply a named sort criterion to unpinned tasks. Default task first, then pinned, then rest. */
function applySortCriterion(tasks: Task[], mode: TaskSortMode): Task[] {
  const defaultTasks = tasks.filter((t) => t.metadata?.isDefault);
  const pinned = tasks.filter((t) => t.metadata?.isPinned && !t.metadata?.isDefault);
  const unpinned = tasks.filter((t) => !t.metadata?.isPinned && !t.metadata?.isDefault);

  let sortedUnpinned: Task[];
  switch (mode) {
    case 'lastActive':
      sortedUnpinned = [...unpinned].sort((a, b) => {
        const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bt - at;
      });
      break;
    case 'alpha':
      sortedUnpinned = [...unpinned].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'createdAt':
    default:
      sortedUnpinned = [...unpinned].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      break;
  }

  return [...defaultTasks, ...pinned, ...sortedUnpinned];
}
```

- [ ] **Step 2: Update `applyManualOrder` similarly**

Replace the `applyManualOrder` function (lines 193-206):

```typescript
/** Restore a saved manual order, floating default task to top, then new tasks. */
function applyManualOrder(tasks: Task[], manualOrder: string[]): Task[] {
  const defaultTasks = tasks.filter((t) => t.metadata?.isDefault);
  const pinned = tasks.filter((t) => t.metadata?.isPinned && !t.metadata?.isDefault);
  const unpinned = tasks.filter((t) => !t.metadata?.isPinned && !t.metadata?.isDefault);
  const indexMap = new Map(manualOrder.map((id, i) => [id, i]));
  const sortedUnpinned = [...unpinned].sort((a, b) => {
    const ai = indexMap.get(a.id) ?? -1;
    const bi = indexMap.get(b.id) ?? -1;
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return -1; // new task floats to top
    if (bi === -1) return 1;
    return ai - bi;
  });
  return [...defaultTasks, ...pinned, ...sortedUnpinned];
}
```

- [ ] **Step 3: Run type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/sidebar/LeftSidebar.tsx
git commit -m "feat: pin default task at top of sidebar sort order"
```

---

### Task 5: Hide archive/delete/rename for default tasks

**Files:**
- Modify: `src/renderer/components/sidebar/LeftSidebar.tsx:551-580` (TaskItem render)
- Modify: `src/renderer/components/TaskItem.tsx:311-330` (context menu)

- [ ] **Step 1: Conditionally disable actions in LeftSidebar**

In `src/renderer/components/sidebar/LeftSidebar.tsx`, find the TaskItem render block (around line 564). Replace the TaskItem usage:

```typescript
                                        <TaskItem
                                          task={typedTask}
                                          showDelete={!typedTask.metadata?.isDefault}
                                          showDirectBadge={false}
                                          isPinned={!!typedTask.metadata?.isPinned}
                                          onPin={
                                            typedTask.metadata?.isDefault
                                              ? undefined
                                              : () => handlePinTask(typedTask)
                                          }
                                          onRename={
                                            typedTask.metadata?.isDefault
                                              ? undefined
                                              : (n) =>
                                                  onRenameTask?.(typedProject, typedTask, n)
                                          }
                                          onDelete={
                                            typedTask.metadata?.isDefault
                                              ? undefined
                                              : () => handleDeleteTask(typedProject, typedTask)
                                          }
                                          onArchive={
                                            typedTask.metadata?.isDefault
                                              ? undefined
                                              : () => onArchiveTask?.(typedProject, typedTask)
                                          }
                                          primaryAction={taskHoverAction}
                                          gitPlatform={typedProject.gitPlatform}
                                        />
```

This passes `undefined` for all destructive callbacks when `isDefault` is true, which means TaskItem's context menu won't render those options (the existing guard at line 312 checks `if (onRename || onDelete || onArchive || onPin)`), and `showDelete` is false so the delete/archive hover button is hidden.

- [ ] **Step 2: Run type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `pnpm exec vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/sidebar/LeftSidebar.tsx
git commit -m "feat: hide archive/delete/rename for default task"
```

---

### Task 6: Block archive/delete of default task in useTaskManagement

**Files:**
- Modify: `src/renderer/hooks/useTaskManagement.ts`

Even though the UI hides the controls, add a guard in the task management hook so the default task can't be archived or deleted programmatically (e.g., via keyboard shortcuts or future code paths).

- [ ] **Step 1: Find the archive and delete handlers**

Read `src/renderer/hooks/useTaskManagement.ts` and locate `handleArchiveTask` and `handleDeleteTask`. Add an early return if the task has `metadata.isDefault === true`.

In the archive handler, add at the top:

```typescript
if (task.metadata?.isDefault) return;
```

In the delete handler, add at the top:

```typescript
if (task.metadata?.isDefault) return;
```

- [ ] **Step 2: Run type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/useTaskManagement.ts
git commit -m "feat: guard against programmatic archive/delete of default task"
```

---

### Task 7: Run full validation suite

**Files:** None — verification only.

- [ ] **Step 1: Format**

Run: `pnpm run format`

- [ ] **Step 2: Lint**

Run: `pnpm run lint`
Expected: PASS (fix any issues if not)

- [ ] **Step 3: Type-check**

Run: `pnpm run type-check`
Expected: PASS

- [ ] **Step 4: Tests**

Run: `pnpm exec vitest run`
Expected: PASS

- [ ] **Step 5: Commit any format/lint fixes**

If format or lint produced changes:

```bash
git add -A
git commit -m "chore: format and lint fixes"
```
