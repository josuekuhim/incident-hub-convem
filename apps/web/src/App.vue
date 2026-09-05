<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
}

const incidents = ref<Incident[]>([]);
const title = ref('');
const error = ref('');

async function load() {
  const res = await fetch('/api/incidents');
  if (res.ok) incidents.value = await res.json();
}

async function create() {
  error.value = '';
  const res = await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.value }),
  });
  if (!res.ok) {
    error.value = 'Não foi possível criar o incidente';
    return;
  }
  title.value = '';
  await load();
}

onMounted(load);
</script>

<template>
  <main class="container">
    <h1>Incident Hub</h1>
    <form @submit.prevent="create">
      <input v-model="title" placeholder="Título do incidente" required />
      <button type="submit">Criar</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <ul>
      <li v-for="incident in incidents" :key="incident.id">
        <strong>{{ incident.title }}</strong>
        <span class="badge">{{ incident.severity }}</span>
        <span class="badge">{{ incident.status }}</span>
      </li>
    </ul>
  </main>
</template>

<style>
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}
.container {
  max-width: 640px;
  margin: 3rem auto;
  padding: 0 1rem;
}
form {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: inherit;
}
button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}
.error {
  color: #f87171;
}
ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
li {
  background: #1e293b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.badge {
  font-size: 0.75rem;
  background: #334155;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}
</style>
