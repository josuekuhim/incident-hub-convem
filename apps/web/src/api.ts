export interface Incident {
  id: number;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  owner: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  updatedAt: string;
}

export interface StatusChange {
  id: number;
  incidentId: number;
  fromStatus: 'Open' | 'In Progress' | 'Resolved';
  toStatus: 'Open' | 'In Progress' | 'Resolved';
  changedAt: string;
}

export interface IncidentDetail extends Incident {
  history: StatusChange[];
}

export async function getIncidents(status?: string, severity?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  const url = `/api/incidents${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<Incident[]>;
}

export async function createIncident(payload: { title: string; description: string; severity: string; owner: string }) {
  const res = await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? 'Erro ao criar incidente');
  }
  return body as Incident;
}

export async function getIncident(id: number) {
  const res = await fetch(`/api/incidents/${id}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<IncidentDetail>;
}

export async function transitionIncident(id: number, status: string) {
  const res = await fetch(`/api/incidents/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? 'Erro ao atualizar status');
  }
  return body as IncidentDetail;
}

export async function getDashboard() {
  const res = await fetch('/api/dashboard');
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<{ open: number; criticalUnresolved: number; resolved: number }>;
}
