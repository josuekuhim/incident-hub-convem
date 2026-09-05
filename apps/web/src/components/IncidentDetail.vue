<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { transitionIncident, getIncident, type IncidentDetail } from '../api';

const props = defineProps<{ id: number }>();
const emit = defineEmits<{ (e: 'changed'): void }>();
const incident = ref<IncidentDetail | null>(null);
const error = ref('');
const statusDraft = ref('');

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function load() {
  error.value = '';
  try {
    incident.value = await getIncident(props.id);
    statusDraft.value = incident.value?.status ?? '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar detalhe';
  }
}

async function submitTransition() {
  if (!incident.value) return;
  error.value = '';
  try {
    await transitionIncident(incident.value.id, statusDraft.value);
    await load();
    emit('changed');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao atualizar status';
  }
}

onMounted(() => void load());
</script>

<template>
  <section v-if="incident">
    <h2>{{ incident.title }}</h2>
    <p>{{ incident.description }}</p>
    <ul>
      <li><strong>Severidade:</strong> {{ incident.severity }}</li>
      <li><strong>Responsável:</strong> {{ incident.owner }}</li>
      <li><strong>Status:</strong> {{ incident.status }}</li>
      <li><strong>Criado em:</strong> {{ formatDateTime(incident.createdAt) }}</li>
      <li><strong>Atualizado em:</strong> {{ formatDateTime(incident.updatedAt) }}</li>
    </ul>
    <div class="transition">
      <select v-model="statusDraft">
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>
      <button @click="submitTransition">Alterar status</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <h3>Histórico</h3>
    <p v-if="incident.history.length === 0">sem mudanças de status registradas</p>
    <ul v-else>
      <li v-for="entry in incident.history" :key="entry.id">{{ formatTime(entry.changedAt) }} — {{ entry.fromStatus }} → {{ entry.toStatus }}</li>
    </ul>
  </section>
  <p v-else-if="error" class="error">{{ error }}</p>
</template>

<style scoped>
.transition { display: flex; gap: 0.5rem; margin: 1rem 0; }
select, button { padding: 0.5rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: inherit; }
button { background: #3b82f6; color: white; border: none; cursor: pointer; }
.error { color: #f87171; }
</style>
