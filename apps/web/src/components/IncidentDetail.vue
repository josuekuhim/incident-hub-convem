<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { addComment, transitionIncident, getIncident, type IncidentDetail } from '../api';

const props = defineProps<{ id: number }>();
const emit = defineEmits<{ (e: 'changed'): void }>();
const incident = ref<IncidentDetail | null>(null);
const error = ref('');
const statusDraft = ref('');

const comment = ref({ author: '', content: '' });
const commentError = ref('');
const commentBusy = ref(false);

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

async function submitComment() {
  if (!incident.value) return;
  commentError.value = '';
  commentBusy.value = true;
  try {
    await addComment(incident.value.id, { author: comment.value.author, content: comment.value.content });
    comment.value.content = '';
    await load();
  } catch (err) {
    commentError.value = err instanceof Error ? err.message : 'Erro ao registrar comentário';
  } finally {
    commentBusy.value = false;
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
      <select v-model="statusDraft" aria-label="Novo status">
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>
      <button @click="submitTransition">Alterar status</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <h3>Timeline</h3>
    <p v-if="incident.timeline.length === 0" class="empty">sem atividade registrada</p>
    <ul v-else class="timeline">
      <li v-for="event in incident.timeline" :key="`${event.type}-${event.id}`" :class="event.type">
        <span class="at">{{ formatTime(event.at) }}</span>
        <template v-if="event.type === 'status'">
          <span class="label">Status alterado:</span>
          <span>{{ event.fromStatus }} → {{ event.toStatus }}</span>
        </template>
        <template v-else>
          <span class="label">{{ event.author }} comentou:</span>
          <span class="content">“{{ event.content }}”</span>
        </template>
      </li>
    </ul>

    <form class="comment-form" @submit.prevent="submitComment">
      <h3>Novo comentário</h3>
      <input v-model="comment.author" placeholder="Autor" aria-label="Autor do comentário" />
      <textarea v-model="comment.content" placeholder="Comentário" rows="3" aria-label="Conteúdo do comentário" />
      <button type="submit" :disabled="commentBusy">
        {{ commentBusy ? 'Registrando…' : 'Comentar' }}
      </button>
      <p v-if="commentError" class="error">{{ commentError }}</p>
    </form>
  </section>
  <p v-else-if="error" class="error">{{ error }}</p>
</template>

<style scoped>
.transition { display: flex; gap: 0.5rem; margin: 1rem 0; }
select, button, input, textarea {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #0f172a;
  color: inherit;
  font: inherit;
}
button { background: #3b82f6; color: white; border: none; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: default; }
.error { color: #f87171; }
.empty { color: #64748b; font-size: 0.9rem; }

.timeline { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.timeline li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.45rem 0.6rem;
  background: #1e293b;
  border-radius: 6px;
  border-left: 3px solid #475569;
}
.timeline li.comment { border-left-color: #a5b4fc; }
.timeline li.status { border-left-color: #38bdf8; }
.at { color: #94a3b8; font-variant-numeric: tabular-nums; }
.label { color: #cbd5e1; font-weight: 600; }
.content { color: #e2e8f0; }

.comment-form { display: grid; gap: 0.5rem; margin-top: 1.25rem; }
.comment-form h3 { margin: 0; }
.comment-form textarea { resize: vertical; }
</style>
