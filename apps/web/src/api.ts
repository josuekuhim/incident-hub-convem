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

export interface Comment {
  id: number;
  incidentId: number;
  author: string;
  content: string;
  createdAt: string;
}

/** Evento da timeline unificada (Change Request #1): status ou comentário. */
export type TimelineEvent =
  | { type: 'status'; id: number; at: string; fromStatus: string; toStatus: string }
  | { type: 'comment'; id: number; at: string; author: string; content: string };

export interface IncidentDetail extends Incident {
  /** Mantido por compatibilidade com as fatias anteriores. */
  history: StatusChange[];
  comments: Comment[];
  timeline: TimelineEvent[];
}

async function readError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') {
      return new Error(body.error);
    }
  } catch {
    // resposta sem corpo JSON
  }
  return new Error(fallback);
}

export async function getIncidents(status?: string, severity?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  const url = `/api/incidents${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw await readError(res, 'Erro ao carregar incidentes');
  }
  return res.json() as Promise<Incident[]>;
}

export async function createIncident(payload: { title: string; description: string; severity: string; owner: string }) {
  const res = await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await readError(res, 'Erro ao criar incidente');
  }
  return (await res.json()) as Incident;
}

export async function getIncident(id: number) {
  const res = await fetch(`/api/incidents/${id}`);
  if (!res.ok) {
    throw await readError(res, 'Incidente não encontrado');
  }
  return res.json() as Promise<IncidentDetail>;
}

export async function transitionIncident(id: number, status: string) {
  const res = await fetch(`/api/incidents/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw await readError(res, 'Erro ao atualizar status');
  }
  return (await res.json()) as Incident;
}

export async function addComment(incidentId: number, payload: { author: string; content: string }) {
  const res = await fetch(`/api/incidents/${incidentId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await readError(res, 'Erro ao registrar comentário');
  }
  return (await res.json()) as Comment;
}

export async function getDashboard() {
  const res = await fetch('/api/dashboard');
  if (!res.ok) {
    throw await readError(res, 'Erro ao carregar dashboard');
  }
  return res.json() as Promise<{ open: number; criticalUnresolved: number; resolved: number }>;
}
