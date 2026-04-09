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
    expect(result!.name).toBe('local');
    expect(result!.branch).toBe('main');
    expect(result!.path).toBe('/tmp/project');
    expect(result!.useWorktree).toBe(false);
    expect(result!.status).toBe('idle');
    expect(result!.agentId).toBe('terminal');
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
      name: 'local',
    });

    const result = ensureDefaultTask({
      projectId: 'project-1',
      projectPath: '/tmp/project',
      defaultBranch: 'main',
      existingTasks: [existing],
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe('default-project-1');
    expect(result!.name).toBe('local');
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
