<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getDashboard, getIncidents, transitionIncident, type Incident, type StatusChange } from '../api';

const emit = defineEmits<{ (e: 'select', id: number): void }>();

const columns = ['Open', 'In Progress', 'Resolved'] as const;
type Column = (typeof columns)[number];

const incidents = ref<Incident[]>([]);
const dashboard = ref<{ open: number; criticalUnresolved: number; resolved: number }>({ open: 0, criticalUnresolved: 0, resolved: 0 });
const statusFilter = ref('');
const severityFilter = ref('');
const error = ref('');
const feedback = ref<Record<number, string>>({});
const busy = ref<Record<number, boolean>>({});
const historyCache = ref<Record<number, StatusChange[]>>({});

const visible = computed(() => incidents.value.filter((incident) =>
  (!statusFilter.value || incident.status === statusFilter.value)
  && (!severityFilter.value || incident.severity === severityFilter.value),
));

const byColumn = computed(() => {
  const map: Record<Column, Incident[]> = { Open: [], 'In Progress': [], Resolved: [] };
  for (const item of visible.value) {
    map[item.status].push(item);
  }
  return map;
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function load() {
  error.value = '';
  try {
    const [data, counters] = await Promise.all([getIncidents(undefined, undefined), getDashboard()]);
    incidents.value = data;
    dashboard.value = counters;
    historyCache.value = {};
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar incidentes';
  }
}

async function move(incident: Incident, target: string) {
  if (!target || target === incident.status) return;
  busy.value[incident.id] = true;
  feedback.value[incident.id] = '';
  try {
    const updated = await transitionIncident(incident.id, target);
    const entry: StatusChange = {
      id: Date.now(),
      incidentId: incident.id,
      fromStatus: incident.status,
      toStatus: updated.status,
      changedAt: updated.updatedAt,
    };
    historyCache.value[incident.id] = [...(historyCache.value[incident.id] ?? []), entry];
    const idx = incidents.value.findIndex((i) => i.id === incident.id);
    if (idx !== -1) incidents.value[idx] = updated;
    const counters = await getDashboard();
    dashboard.value = counters;
  } catch (err) {
    feedback.value[incident.id] = err instanceof Error ? err.message : 'Erro ao atualizar status';
  } finally {
    busy.value[incident.id] = false;
  }
}

defineExpose({ reload: load });

onMounted(() => void load());
</script>

<template>
  <section>
    <div class="toolbar">
      <select v-model="statusFilter" aria-label="Filtrar por status">
        <option value="">Todos os status</option>
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>
      <select v-model="severityFilter">
        <option value="">Todas as severidades</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Critical">Critical</option>
      </select>
    </div>

    <div class="dashboard">
      <div><strong>{{ dashboard.open }}</strong><span>abertos</span></div>
      <div><strong>{{ dashboard.criticalUnresolved }}</strong><span>Critical não resolvidos</span></div>
      <div><strong>{{ dashboard.resolved }}</strong><span>resolvidos</span></div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="board">
      <div v-for="col in columns" :key="col" class="column">
        <h3>{{ col }} <span class="count">{{ byColumn[col].length }}</span></h3>
        <p v-if="byColumn[col].length === 0" class="empty">vazio</p>
        <article v-for="incident in byColumn[col]" :key="incident.id" class="card" :class="incident.severity.toLowerCase()">
          <header @click="emit('select', incident.id)">
            <strong>{{ incident.title }}</strong>
            <span class="badge">{{ incident.severity }}</span>
          </header>
          <p class="meta">{{ incident.owner }}</p>
          <p class="meta">Atualizado: {{ formatDateTime(incident.updatedAt) }}</p>
          <p v-if="historyCache[incident.id]?.length" class="history">
            <span v-for="h in historyCache[incident.id]" :key="h.id" class="history-entry">
              {{ new Date(h.changedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }} — {{ h.fromStatus }} → {{ h.toStatus }}
            </span>
          </p>
          <div class="actions">
            <button
              v-for="target in columns.filter((c) => c !== incident.status)"
              :key="target"
              :disabled="busy[incident.id]"
              @click="move(incident, target)"
            >
              → {{ target }}
            </button>
          </div>
          <p v-if="feedback[incident.id]" class="error">{{ feedback[incident.id] }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
select { padding: 0.5rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: inherit; }
.dashboard { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
.dashboard > div { background: #1e293b; padding: 0.75rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.25rem; }
.board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; align-items: start; }
.column { background: #0b1220; border-radius: 8px; padding: 0.75rem; min-height: 8rem; }
.column h3 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #cbd5e1; display: flex; justify-content: space-between; }
.count { color: #64748b; }
.card { background: #1e293b; border-radius: 8px; padding: 0.65rem 0.75rem; margin-bottom: 0.6rem; border-left: 4px solid #475569; }
.card.critical { border-left-color: #ef4444; }
.card.high { border-left-color: #f97316; }
.card.medium { border-left-color: #eab308; }
.card.low { border-left-color: #22c55e; }
.card header { display: flex; justify-content: space-between; gap: 0.5rem; cursor: pointer; }
.card header:hover strong { color: #93c5fd; }
.badge { font-size: 0.75rem; color: #94a3b8; align-self: center; }
.meta { color: #94a3b8; font-size: 0.85rem; margin: 0.25rem 0 0; }
.history { margin: 0.4rem 0 0; display: grid; gap: 0.15rem; }
.history-entry { color: #a5b4fc; font-size: 0.78rem; }
.actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.55rem; }
.actions button { background: #334155; color: #e2e8f0; border: none; border-radius: 6px; padding: 0.3rem 0.55rem; font-size: 0.8rem; cursor: pointer; }
.actions button:hover:not(:disabled) { background: #3b82f6; }
.actions button:disabled { opacity: 0.5; cursor: default; }
.error { color: #f87171; font-size: 0.85rem; margin: 0.4rem 0 0; }
.empty { color: #64748b; font-size: 0.85rem; }
</style>
