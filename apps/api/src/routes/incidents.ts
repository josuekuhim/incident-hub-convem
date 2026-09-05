import { db } from '../db/sqlite.js';
import { avaliarTransicao } from '../domain/status-rules.js';
import { errorResponse, HttpError } from '../http/errors.js';
import { validateCommentBody, validateCreateBody, validateFilterValue, validateStatusValue } from '../http/validation.js';
import type { Severity, Status } from '../domain/constants.js';

interface IncidentRecord {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  owner: string;
  status: Status;
  created_at: number;
  updated_at: number;
  seed_key: string | null;
}

function toIncident(item: IncidentRecord) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    severity: item.severity,
    owner: item.owner,
    status: item.status,
    createdAt: new Date(item.created_at).toISOString(),
    updatedAt: new Date(item.updated_at).toISOString(),
  };
}

function toStatusChange(item: any) {
  return {
    id: item.id,
    incidentId: item.incident_id,
    fromStatus: item.from_status,
    toStatus: item.to_status,
    changedAt: new Date(item.changed_at).toISOString(),
  };
}

function toComment(item: any) {
  return {
    id: item.id,
    incidentId: item.incident_id,
    author: item.author,
    content: item.content,
    createdAt: new Date(item.created_at).toISOString(),
  };
}

/**
 * Timeline unificada (Change Request #1): funde alterações de status e
 * comentários em uma única sequência cronológica. É derivada em tempo de
 * leitura — não existe tabela de eventos, para não duplicar dados nem criar
 * risco de divergência entre as fontes.
 *
 * O desempate para eventos de mesmo instante é (instante, tipo, id), de modo
 * que a ordem é determinística: a mesma entrada produz sempre a mesma saída.
 */
function buildTimeline(statusChanges: any[], comments: any[]) {
  const events = [
    ...statusChanges.map((item) => ({
      type: 'status' as const,
      id: item.id,
      at: item.changed_at,
      fromStatus: item.from_status,
      toStatus: item.to_status,
    })),
    ...comments.map((item) => ({
      type: 'comment' as const,
      id: item.id,
      at: item.created_at,
      author: item.author,
      content: item.content,
    })),
  ];

  events.sort((a, b) => a.at - b.at || a.type.localeCompare(b.type) || a.id - b.id);

  return events.map((event) => ({ ...event, at: new Date(event.at).toISOString() }));
}

export function registerIncidentRoutes(app: any) {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/incidents', async (request: any, reply: any) => {
    const status = request.query?.status;
    const severity = request.query?.severity;

    const filters: string[] = [];
    const params: Record<string, string> = {};

    try {
      if (status !== undefined && status !== '') {
        const normalized = validateFilterValue(status, 'status');
        if (normalized !== null) {
          filters.push('status = @status');
          params.status = normalized;
        }
      }

      if (severity !== undefined && severity !== '') {
        const normalized = validateFilterValue(severity, 'severity');
        if (normalized !== null) {
          filters.push('severity = @severity');
          params.severity = normalized;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send(errorResponse(error.message));
      }
      return reply.code(500).send(errorResponse('Erro inesperado'));
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM incidents ${where} ORDER BY created_at DESC, id DESC`).all(params) as unknown as IncidentRecord[];
    return rows.map(toIncident);
  });

  app.post('/incidents', async (request: any, reply: any) => {
    try {
      const data = validateCreateBody(request.body);
      const now = Date.now();
      const result = db.prepare(`
        INSERT INTO incidents (title, description, severity, owner, status, created_at, updated_at)
        VALUES (@title, @description, @severity, @owner, 'Open', @createdAt, @updatedAt)
      `).run({
        title: data.title,
        description: data.description,
        severity: data.severity,
        owner: data.owner,
        createdAt: now,
        updatedAt: now,
      });
      const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(result.lastInsertRowid) as unknown as IncidentRecord;
      return reply.code(201).send(toIncident(incident));
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send(errorResponse(error.message));
      }
      return reply.code(500).send(errorResponse('Erro inesperado'));
    }
  });

  app.post('/incidents/:id/status', async (request: any, reply: any) => {
    const id = Number(request.params?.id);
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as IncidentRecord | undefined;
    if (!incident) {
      return reply.code(404).send(errorResponse('Incidente não encontrado'));
    }

    let status: Status;
    try {
      status = validateStatusValue(request.body?.status);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send(errorResponse(error.message));
      }
      return reply.code(500).send(errorResponse('Erro inesperado'));
    }

    const transition = avaliarTransicao(incident.severity, incident.status, status);
    if (!transition.permitido) {
      return reply.code(422).send(errorResponse(transition.motivo ?? 'Transição inválida'));
    }

    const now = Date.now();
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
      db.prepare('INSERT INTO status_changes (incident_id, from_status, to_status, changed_at) VALUES (?, ?, ?, ?)').run(id, incident.status, status, now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as unknown as IncidentRecord;
    return reply.send(toIncident(updated));
  });

  app.post('/incidents/:id/comments', async (request: any, reply: any) => {
    const id = Number(request.params?.id);
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as IncidentRecord | undefined;
    if (!incident) {
      return reply.code(404).send(errorResponse('Incidente não encontrado'));
    }

    let data: { author: string; content: string };
    try {
      data = validateCommentBody(request.body);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send(errorResponse(error.message));
      }
      return reply.code(500).send(errorResponse('Erro inesperado'));
    }

    // Comentar é atividade *sobre* o incidente, não alteração *do* incidente:
    // não move updated_at nem gera registro em status_changes.
    const result = db.prepare(`
      INSERT INTO comments (incident_id, author, content, created_at)
      VALUES (@incidentId, @author, @content, @createdAt)
    `).run({ incidentId: id, author: data.author, content: data.content, createdAt: Date.now() });

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    return reply.code(201).send(toComment(comment));
  });

  app.get('/incidents/:id', async (request: any, reply: any) => {
    const id = Number(request.params?.id);
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as IncidentRecord | undefined;
    if (!incident) {
      return reply.code(404).send(errorResponse('Incidente não encontrado'));
    }

    const history = db.prepare('SELECT * FROM status_changes WHERE incident_id = ? ORDER BY changed_at ASC, id ASC').all(id) as any[];
    const comments = db.prepare('SELECT * FROM comments WHERE incident_id = ? ORDER BY created_at ASC, id ASC').all(id) as any[];

    // `history` é mantido para não quebrar o contrato das fatias anteriores;
    // `comments` e `timeline` são aditivos (Change Request #1).
    return reply.send({
      ...toIncident(incident),
      history: history.map(toStatusChange),
      comments: comments.map(toComment),
      timeline: buildTimeline(history, comments),
    });
  });

  app.get('/dashboard', async () => {
    const rows = db.prepare('SELECT * FROM incidents').all() as unknown as IncidentRecord[];
    return {
      open: rows.filter((item) => item.status === 'Open').length,
      criticalUnresolved: rows.filter((item) => item.severity === 'Critical' && ['Open', 'In Progress'].includes(item.status)).length,
      resolved: rows.filter((item) => item.status === 'Resolved').length,
    };
  });
}
