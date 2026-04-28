export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'in_classification'
  | 'pending_schedule'
  | 'pending_leader_approval'
  | 'approved'
  | 'rejected'
  | 'reschedule_requested'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const transitions: Record<RequestStatus, RequestStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['pending_review', 'cancelled'],
  pending_review: ['in_classification', 'rejected', 'cancelled'],
  in_classification: ['pending_schedule', 'rejected', 'cancelled'],
  pending_schedule: ['pending_leader_approval', 'reschedule_requested', 'cancelled'],
  pending_leader_approval: ['approved', 'rejected', 'reschedule_requested', 'cancelled'],
  approved: ['scheduled', 'cancelled'],
  rejected: [],
  reschedule_requested: ['pending_schedule', 'cancelled'],
  scheduled: ['completed', 'no_show', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: []
};

export function isValidTransition(from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return true;
  return transitions[from]?.includes(to) ?? false;
}
