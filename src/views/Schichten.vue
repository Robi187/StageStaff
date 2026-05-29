<template>
  <Navbar />
  <div class="page-container">

    <div class="page-greeting">
      <p class="greeting-date">{{ todayLabel }}</p>
      <h1 class="greeting-name">Hallo, {{ auth.user?.name?.split(' ')[0] }}</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="month-grid">
      <button
        v-for="month in months"
        :key="month.key"
        class="month-card"
        :class="{ 'month-card--current': month.isCurrent }"
        @click="$router.push(`/schichten/${month.year}/${month.monthNum}`)"
      >
        <div v-if="month.isCurrent" class="current-dot"></div>

        <div class="month-card-body">
          <div class="month-name">{{ month.name }}</div>
          <div class="month-year">{{ month.year }}</div>
          <div class="month-count">{{ month.occurrences.length }} Termin{{ month.occurrences.length !== 1 ? 'e' : '' }}</div>
        </div>

        <div class="dots-row">
          <span
            v-for="occ in month.occurrences"
            :key="occ.id"
            class="dot"
            :class="auth.isAdmin ? adminDotClass(occ) : dotClass(occ.myResponse?.status)"
            :title="auth.isAdmin ? adminDotTitle(occ) : undefined"
          ></span>
        </div>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useAppCache } from '../stores/appCache';
import Navbar from '../components/Navbar.vue';
import api from '../api/axios';

const auth = useAuthStore();
const appCache = useAppCache();
const loading = ref(true);
const occurrences = ref([]);
const totalStaff = ref(0);

// Apply cache before first render — no spinner if data is fresh
const _cached = appCache.peek('dashboard');
if (_cached) {
  occurrences.value = _cached.occurrences;
  totalStaff.value = _cached.totalStaff;
  loading.value = false;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                     'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const now = new Date();

const todayLabel = computed(() => {
  return `${WEEKDAYS[now.getDay()].toUpperCase()}, ${now.getDate()}. ${MONTHS_SHORT[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
});

function dotClass(status) {
  if (status === 'JA') return 'dot--ja';
  if (status === 'NEIN') return 'dot--nein';
  if (status === 'VIELLEICHT') return 'dot--wenn';
  return 'dot--none';
}

function adminDotClass(occ) {
  if (occ.cancelled) return 'dot--nein';
  const responses = occ.responses || [];
  const jaCount = responses.filter(r => r.status === 'JA').length;
  if (responses.length === 0) return 'dot--none';
  if (jaCount >= 3) return 'dot--ja';
  return 'dot--partial';
}

function adminDotTitle(occ) {
  const jaCount = (occ.responses || []).filter(r => r.status === 'JA').length;
  return `${jaCount}/${totalStaff.value} zugesagt`;
}

const months = computed(() => {
  const groups = {};

  // Pre-populate all months from current month through December of this year
  for (let m = now.getMonth(); m <= 11; m++) {
    const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
    groups[key] = {
      key,
      year: now.getFullYear(),
      monthNum: m + 1,
      name: MONTHS_FULL[m],
      isCurrent: m === now.getMonth(),
      occurrences: []
    };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  occurrences.value.forEach(occ => {
    const d = new Date(occ.date);
    if (d < today) return;
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const key = `${year}-${String(monthNum).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        year,
        monthNum,
        name: MONTHS_FULL[d.getMonth()],
        isCurrent: year === now.getFullYear() && monthNum === now.getMonth() + 1,
        occurrences: []
      };
    }
    groups[key].occurrences.push(occ);
  });

  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
});

onMounted(async () => {
  if (!loading.value) return; // cache already applied
  try {
    const data = await appCache.getOrFetch('dashboard', async () => {
      const { data } = await api.get('/dashboard');
      return data;
    });
    occurrences.value = data.occurrences;
    totalStaff.value = data.totalStaff;
  } catch {
    // handled by axios interceptor
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-greeting {
  margin-bottom: 48px;
}

.greeting-date {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--muted);
  margin-bottom: 10px;
  font-family: 'Raleway', system-ui, sans-serif;
}

.greeting-name {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 42px;
  font-weight: 400;
  color: var(--text);
  letter-spacing: 0.01em;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--muted);
  font-size: 14px;
}

/* Month grid */
.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.month-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 24px 20px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  font-family: 'Raleway', system-ui, sans-serif;
  letter-spacing: 0;
  min-height: 180px;
}

.month-card:hover {
  border-color: var(--border-hover);
  background: var(--card-hover);
  transform: translateY(-2px);
  opacity: 1;
}

.month-card--current {
  border-color: #3a3860;
  background: #1c1b2a;
}

.current-dot {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.65);
}

.month-card-body {
  flex: 1;
}

.month-name {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  color: var(--text);
  letter-spacing: 0.01em;
  line-height: 1.1;
  margin-bottom: 4px;
}

.month-year {
  font-size: 11px;
  color: var(--very-muted);
  font-weight: 400;
  margin-bottom: 12px;
}

.month-count {
  font-size: 12px;
  color: var(--muted);
  font-weight: 400;
}

/* Dots row */
.dots-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot--ja      { background: #22c55e; }
.dot--partial { background: #f59e0b; }
.dot--nein    { background: #ef4444; }
.dot--wenn    { background: #f59e0b; }
.dot--none    { background: #2E2840; }

/* Responsive */
@media (max-width: 768px) {
  .month-grid { grid-template-columns: repeat(2, 1fr); }
  .greeting-name { font-size: 32px; }
}

@media (max-width: 480px) {
  .month-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .greeting-name { font-size: 26px; }
  .month-card { padding: 18px 16px 14px; min-height: 150px; gap: 12px; }
  .month-name { font-size: 24px; }
  .month-count { font-size: 11px; }
}

@media (max-width: 360px) {
  .month-grid { grid-template-columns: 1fr; }
}
</style>
