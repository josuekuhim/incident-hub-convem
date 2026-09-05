<script setup lang="ts">
import { ref } from 'vue';
import IncidentForm from './components/IncidentForm.vue';
import IncidentList from './components/IncidentList.vue';
import IncidentDetail from './components/IncidentDetail.vue';

const selectedId = ref<number | null>(null);
function openDetail(id: number) {
  selectedId.value = id;
}
</script>

<template>
  <main class="container">
    <h1>Incident Hub</h1>
    <IncidentForm @created="selectedId = null" />
    <IncidentList @select="openDetail" />
    <IncidentDetail v-if="selectedId !== null" :id="selectedId" />
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
  max-width: 960px;
  margin: 3rem auto;
  padding: 0 1rem;
  display: grid;
  gap: 1rem;
}
</style>
