<script setup lang="ts">
import { ref } from 'vue';
import { createIncident } from '../api';

const emit = defineEmits<{ (e: 'created'): void }>();

const form = ref({ title: '', description: '', severity: 'Critical', owner: '' });
const error = ref('');
const success = ref('');

async function submit() {
  error.value = '';
  success.value = '';
  try {
    await createIncident(form.value);
    success.value = 'Incidente criado com sucesso';
    form.value = { title: '', description: '', severity: 'Critical', owner: '' };
    emit('created');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao criar incidente';
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.title" placeholder="Título" required />
    <input v-model="form.description" placeholder="Descrição" required />
    <select v-model="form.severity">
      <option value="Low">Low</option>
      <option value="Medium">Medium</option>
      <option value="High">High</option>
      <option value="Critical">Critical</option>
    </select>
    <input v-model="form.owner" placeholder="Responsável" required />
    <button type="submit">Criar</button>
  </form>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="success" class="success">{{ success }}</p>
</template>

<style scoped>
form { display: grid; gap: 0.5rem; margin: 1rem 0; }
input, select, button { padding: 0.5rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: inherit; }
button { background: #3b82f6; color: white; border: none; cursor: pointer; }
.error { color: #f87171; }
.success { color: #4ade80; }
</style>
