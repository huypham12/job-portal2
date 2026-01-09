/**
 * Application Workflow Enums
 * Defines workflow states and stage management
 */

export enum ApplicationWorkflowState {
  APPLIED = 'applied',
  REVIEWED = 'reviewed',
  INTERVIEWING = 'interviewing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export enum StageResult {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum StageStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
