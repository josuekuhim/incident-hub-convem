import type { Severity, Status } from './constants.js';

interface TransitionResult {
  permitido: boolean;
  motivo?: string;
}

export function avaliarTransicao(severity: Severity, statusAtual: Status, statusDestino: Status): TransitionResult {
  if (statusAtual === statusDestino) {
    return { permitido: false, motivo: `o incidente já está em ${statusDestino}` };
  }

  if (severity === 'Critical' && statusAtual === 'Open' && statusDestino === 'Resolved') {
    return {
      permitido: false,
      motivo: 'incidentes Critical precisam passar por In Progress antes de serem resolvidos',
    };
  }

  return { permitido: true };
}
