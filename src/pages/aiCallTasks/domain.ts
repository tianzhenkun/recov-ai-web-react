export type TaskStatus =
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TargetStatus =
  | 'PENDING'
  | 'DIALING'
  | 'IN_CALL'
  | 'RETRY_WAIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type ValidationStatus =
  | 'VALIDATING'
  | 'PASSED'
  | 'FAILED'
  | 'SYSTEM_ERROR';

export type ValidationRetryAction = 'REUPLOAD' | 'RETRY_VALIDATION';

export type TaskMode = 'single' | 'batch';
export type ExecutionMode = 'immediate' | 'scheduled';

export type TaskActionKey =
  | 'editSchedule'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'cancel'
  | 'view';

export type AiCallTask = {
  taskId: string;
  taskName: string;
  taskMode: TaskMode;
  status: TaskStatus;
  totalTargets: number;
  completedTargets: number;
  connectedTargets: number;
  failedTargets: number;
  executionMode: ExecutionMode;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  promptProfileId?: string | null;
  promptName: string;
  sceneCode: string;
  voice: string;
  voiceName?: string | null;
  ruleId: string;
  ruleName: string;
  ruleSummary: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
};

export type AiCallTaskTarget = {
  targetId: string;
  taskId: string;
  customerName?: string | null;
  phoneNumber: string;
  status: TargetStatus;
  attemptCount: number;
  latestResult?: string | null;
  updatedAt: string;
};

export type ValidationIssue = {
  issueId: string;
  rowNumber: number;
  phoneNumber?: string | null;
  customerName?: string | null;
  reasons: string[];
  duplicateRowNumbers?: number[];
};

const TASK_ACTIONS: Record<TaskStatus, TaskActionKey[]> = {
  SCHEDULED: ['editSchedule', 'cancel', 'view'],
  RUNNING: ['pause', 'stop', 'view'],
  PAUSING: ['view'],
  PAUSED: ['resume', 'stop', 'view'],
  STOPPING: ['view'],
  STOPPED: ['view'],
  COMPLETED: ['view'],
  FAILED: ['view'],
  CANCELLED: ['view'],
};

export const getAllowedTaskActions = (status: TaskStatus): TaskActionKey[] =>
  TASK_ACTIONS[status];

export const isTaskPollingStatus = (status: TaskStatus): boolean =>
  status === 'RUNNING' || status === 'PAUSING' || status === 'STOPPING';

export const getTaskProgress = (task: AiCallTask): number =>
  task.totalTargets === 0
    ? 0
    : Math.round((task.completedTargets / task.totalTargets) * 100);
