import type { Severity, Status } from '../domain/constants.js';

const severities = ['Low', 'Medium', 'High', 'Critical'] as const;
const statuses = ['Open', 'In Progress', 'Resolved'] as const;

export function validateCreateBody(body: unknown): { title: string; description: string; severity: Severity; owner: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Informe o título do incidente');
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  const title = getRequiredString(data.title);
  if (title === null) {
    errors.push('Informe o título do incidente');
  }

  const description = getRequiredString(data.description);
  if (description === null) {
    errors.push('Informe a descrição do incidente');
  }

  const owner = getRequiredString(data.owner);
  if (owner === null) {
    errors.push('Informe o responsável do incidente');
  }

  const severity = data.severity;
  if (typeof severity !== 'string' || !severities.includes(severity as Severity)) {
    errors.push('A severidade deve ser Low, Medium, High ou Critical');
  }

  if (errors.length) {
    throw new Error(errors[0]);
  }

  return {
    title: title as string,
    description: description as string,
    severity: severity as Severity,
    owner: owner as string,
  };
}

export function validateStatusValue(value: unknown): Status {
  if (typeof value !== 'string' || !statuses.includes(value as Status)) {
    throw new Error('O status deve ser Open, In Progress ou Resolved');
  }
  return value as Status;
}

export function validateFilterValue(value: unknown, kind: 'status' | 'severity') {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  if (kind === 'status') {
    if (!statuses.includes(value as Status)) {
      throw new Error('O filtro status deve ser Open, In Progress ou Resolved');
    }
    return value as Status;
  }

  if (!severities.includes(value as Severity)) {
    throw new Error('O filtro severity deve ser Low, Medium, High ou Critical');
  }
  return value as Severity;
}

function getRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
