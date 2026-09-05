export type Status = 'Open' | 'In Progress' | 'Resolved';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Incident {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  owner: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface StatusChange {
  id: number;
  incidentId: number;
  fromStatus: Status;
  toStatus: Status;
  changedAt: string;
}
