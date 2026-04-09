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
    };
  }

  // Create new default task
  return {
    id: `default-${projectId}`,
    projectId,
    name: 'local',
    branch: defaultBranch,
    path: projectPath,
    status: 'idle',
    useWorktree: false,
    metadata: { isDefault: true },
  };
}
