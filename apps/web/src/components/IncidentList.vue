<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getDashboard, getIncidents, type Incident } from '../api';

const incidents = ref<Incident[]>([]);
const dashboard = ref<{ open: number; criticalUnresolved: number; resolved: number }>({ open: 0, criticalUnresolved: 0, resolved: 0 });
const statusFilter = ref('');
const severityFilter = ref('');
const error = ref('');

async function load() {
  error.value = '';
  try {
    const [data, counters] = await Promise.all([getIncidents(statusFilter.value || undefined, severityFilter.value || undefined), getDashboard()]);
    incidents.value = data;
    dashboard.value = counters;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar incidentes';
  }
}

const emptyState = computed(() => incidents.value.length === 0);

watch([statusFilter, severityFilter], () => {
  void load();
});

onMounted(() => void load());
</script>

<template>
  <section>
    <div class="toolbar">
      <select v-model="statusFilter">
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
    <p v-else-if="emptyState" class="empty">Nenhum incidente registrado</p>
    <ul v-else>
      <li v-for="incident in incidents" :key="incident.id">
        <div>
          <strong>{{ incident.title }}</strong>
          <div class="meta">{{ incident.owner }} · {{ incident.severity }} · {{ incident.status }}</div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
select { padding: 0.5rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: inherit; }
.dashboard { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
.dashboard > div { background: #1e293b; padding: 0.75rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.25rem; }
.error { color: #f87171; }
.empty { color: #94a3b8; }
ul { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
li { background: #1e293b; padding: 0.75rem 1rem; border-radius: 8px; }
.meta { color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem; }
</style>
