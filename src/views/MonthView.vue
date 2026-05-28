<template>
  <Navbar />
  <div class="page-container">

    <button class="back-btn" @click="$router.push('/schichten')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Alle Monate
    </button>

    <div class="month-header">
      <h1 class="month-title">{{ monthName }}</h1>
      <span class="month-year-label">{{ year }}</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="loadError" class="error-box">{{ loadError }}</div>

    <div v-else-if="monthOccs.length === 0" class="empty-state">
      Keine Termine in diesem Monat.
    </div>

    <div v-else class="occ-list">
      <button v-if="pastCount > 0" class="past-toggle" @click="showPast = !showPast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          :style="{ transform: showPast ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        {{ showPast ? 'Vergangene ausblenden' : `${pastCount} vergangene Termin${pastCount !== 1 ? 'e' : ''} anzeigen` }}
      </button>

      <button
        v-for="occ in visibleOccs"
        :key="occ.id"
        class="occ-row"
        :class="{ 'occ-row--cancelled': occ.cancelled, 'occ-row--past': isPast(occ.date) }"
        @click="$router.push(`/schichten/${occ.id}`)"
      >
        <!-- Date column -->
        <div class="occ-date-col">
          <span class="occ-day-num">{{ getDay(occ.date) }}</span>
          <span class="occ-weekday">{{ getWeekday(occ.date) }}</span>
        </div>

        <!-- Divider -->
        <div class="occ-divider"></div>

        <!-- Info -->
        <div class="occ-info">
          <span class="occ-title">{{ occ.shift.title }}</span>
          <div class="occ-tags">
            <span v-if="occ.cancelled" class="tag tag--cancelled">Abgesagt</span>
            <span v-else-if="isDeadlinePassed(occ)" class="tag tag--deadline">Frist abgelaufen</span>
            <span v-else-if="occ.deadline" class="tag tag--upcoming">Frist läuft</span>
          </div>
        </div>

        <!-- Status (staff) or count (admin) -->
        <div v-if="!auth.isAdmin" class="occ-status-col">
          <span class="status-dot" :class="dotClass(occ.myResponse?.status)"></span>
          <span class="status-label">{{ statusLabel(occ.myResponse?.status) }}</span>
        </div>

        <div v-else class="occ-count-col">
          <span class="resp-count" :class="countClass(occ)">{{ occ._count.responses }}/{{ totalStaff }}</span>
        </div>

        <svg class="row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAppCache } from '../stores/appCache';
import Navbar from '../components/Navbar.vue';
import api from '../api/axios';

const route = useRoute();
const auth = useAuthStore();
const appCache = useAppCache();

const loading = ref(true);
const loadError = ref('');
const monthOccs = ref([]);
const totalStaff = ref(0);
const showPast = ref(false);
const today = new Date();
today.setHours(0, 0, 0, 0);

function isPast(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

const pastCount = computed(() => monthOccs.value.filter(occ => isPast(occ.date)).length);
const visibleOccs = computed(() =>
  showPast.value ? monthOccs.value : monthOccs.value.filter(occ => !isPast(occ.date))
);

const year = parseInt(route.params.year, 10);
const month = parseInt(route.params.month, 10); // 1-based

// Apply cache before first render
const _cached = appCache.peek(`occurrences:${year}-${month}`);
if (_cached) {
  monthOccs.value = _cached.occurrences;
  totalStaff.value = _cached.totalStaff;
  loading.value = false;
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                     'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const monthName = MONTHS_FULL[month - 1];

function getDay(dateStr) { return new Date(dateStr).getDate(); }
function getWeekday(dateStr) { return WEEKDAYS[new Date(dateStr).getDay()]; }

function isDeadlinePassed(occ) {
  return occ.deadline && new Date(occ.deadline) < new Date();
}

function dotClass(status) {
  if (status === 'JA') return 'dot-ja';
  if (status === 'NEIN') return 'dot-nein';
  if (status === 'VIELLEICHT') return 'dot-wenn';
  return 'dot-none';
}

function countClass(occ) {
  if (occ.cancelled) return 'count--cancelled';
  const ja = occ._count.responses;
  if (ja === 0) return '';
  if (ja >= totalStaff.value) return 'count--full';
  return 'count--partial';
}

function statusLabel(status) {
  if (status === 'JA') return 'Zugesagt';
  if (status === 'NEIN') return 'Abgesagt';
  if (status === 'VIELLEICHT') return 'Vielleicht';
  return 'Offen';
}

onMounted(async () => {
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    loadError.value = 'Ungültiger Monat.';
    loading.value = false;
    return;
  }
  if (!loading.value) return; // cache already applied
  try {
    const data = await appCache.getOrFetch(
      `occurrences:${year}-${month}`,
      async () => {
        const { data } = await api.get(`/occurrences?year=${year}&month=${month}`);
        return data;
      }
    );
    monthOccs.value = data.occurrences;
    totalStaff.value = data.totalStaff;
  } catch (err) {
    const serverError = err.response?.data?.error;
    loadError.value = typeof serverError === 'string' ? serverError : 'Termine konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.month-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 32px;
}

.month-title {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 36px;
  font-weight: 400;
  color: var(--text);
}

.month-year-label {
  font-size: 13px;
  color: var(--very-muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
  font-size: 14px;
}

/* Past toggle */
.past-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--muted);
  font-size: 12px;
  font-family: 'Raleway', system-ui, sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.past-toggle:hover {
  border-color: var(--border-hover);
  color: var(--text);
}

/* Occurrence list */
.occ-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.occ-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  font-family: 'Raleway', system-ui, sans-serif;
  letter-spacing: 0;
}

.occ-row:hover {
  border-color: var(--border-hover);
  background: var(--card-hover);
  transform: translateY(-1px);
  opacity: 1;
}

.occ-row--cancelled { opacity: 0.45; }
.occ-row--past { opacity: 0.35; filter: grayscale(0.4); }

/* Date column */
.occ-date-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
  flex-shrink: 0;
}

.occ-day-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.occ-weekday {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 3px;
}

.occ-divider {
  width: 1px;
  height: 36px;
  background: var(--border);
  margin: 0 20px;
  flex-shrink: 0;
}

/* Info */
.occ-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.occ-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.occ-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 1px 7px;
  border-radius: 999px;
}

.tag--cancelled { background: rgba(127, 29, 29, 0.4); color: #f87171; }
.tag--deadline { background: rgba(127, 29, 29, 0.25); color: #f87171; }
.tag--upcoming { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

/* Status (staff) */
.occ-status-col {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}

.status-label {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

/* Count (admin) */
.occ-count-col {
  flex-shrink: 0;
  margin-left: 16px;
}

.resp-count {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

.count--full      { color: #22c55e; }
.count--partial   { color: #f59e0b; }
.count--cancelled { color: #ef4444; }

.row-chevron {
  color: var(--very-muted);
  flex-shrink: 0;
  margin-left: 12px;
}

@media (max-width: 480px) {
  .occ-row { padding: 12px 14px; }
  .occ-divider { margin: 0 12px; }
  .status-label { display: none; }
  .occ-day-num { font-size: 18px; }
  .occ-title { font-size: 13px; }
  .past-toggle { font-size: 11px; padding: 9px 14px; }
}
</style>
