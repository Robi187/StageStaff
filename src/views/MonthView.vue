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
      <button
        v-if="!auth.isAdmin && selectableOccs.length > 0"
        class="select-toggle"
        :class="{ 'select-toggle--active': selectMode }"
        @click="toggleSelectMode"
      >{{ selectMode ? 'Fertig' : 'Auswählen' }}</button>
    </div>

    <div v-if="selectMode" class="select-tools">
      <button class="chip" @click="selectOpen">Alle offenen</button>
      <button class="chip" @click="selectAll">Alle</button>
      <button v-if="selected.size > 0" class="chip chip--ghost" @click="selected = new Set()">Keine</button>
    </div>

    <div v-if="bulkMessage" class="success-box bulk-msg">{{ bulkMessage }}</div>
    <div v-if="bulkError" class="error-box bulk-msg">{{ bulkError }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="loadError" class="error-box">{{ loadError }}</div>

    <div v-else-if="monthOccs.length === 0" class="empty-state">
      Keine Termine in diesem Monat.
    </div>

    <div v-else class="occ-list" :class="{ 'occ-list--bulk': selectMode }">
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
        :class="{
          'occ-row--cancelled': occ.cancelled,
          'occ-row--past': isPast(occ.date),
          'occ-row--selected': selectMode && selected.has(occ.id),
          'occ-row--disabled': selectMode && !isSelectable(occ)
        }"
        @click="onRowClick(occ)"
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

        <span v-if="selectMode" class="row-check" :class="{ 'row-check--on': selected.has(occ.id), 'row-check--hidden': !isSelectable(occ) }">
          <svg v-if="selected.has(occ.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <svg v-else class="row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <div v-if="selectMode" class="bulk-bar">
      <div class="bulk-bar-inner">
        <span class="bulk-count">{{ selected.size }} ausgewählt</span>
        <div class="bulk-actions">
          <button class="bulk-btn bulk-btn--ja" :disabled="!selected.size || bulkSaving" @click="bulkRespond('JA')">Zusagen</button>
          <button class="bulk-btn bulk-btn--nein" :disabled="!selected.size || bulkSaving" @click="bulkRespond('NEIN')">Absagen</button>
          <button class="bulk-btn bulk-btn--wm" :disabled="!selected.size || bulkSaving" @click="bulkRespond('VIELLEICHT')">Wenn möglich frei</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAppCache } from '../stores/appCache';
import Navbar from '../components/Navbar.vue';
import api from '../api/axios';

const route = useRoute();
const router = useRouter();
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

// ── Mehrfachauswahl (staff) ──
const selectMode = ref(false);
const selected = ref(new Set());
const bulkSaving = ref(false);
const bulkMessage = ref('');
const bulkError = ref('');

function isSelectable(occ) {
  return !occ.cancelled && !isPast(occ.date) && !isDeadlinePassed(occ);
}

const selectableOccs = computed(() => monthOccs.value.filter(isSelectable));

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  selected.value = new Set();
  bulkError.value = '';
}

function onRowClick(occ) {
  if (!selectMode.value) {
    router.push(`/schichten/${occ.id}`);
    return;
  }
  if (!isSelectable(occ)) return;
  const next = new Set(selected.value);
  next.has(occ.id) ? next.delete(occ.id) : next.add(occ.id);
  selected.value = next;
}

function selectOpen() {
  selected.value = new Set(selectableOccs.value.filter(o => !o.myResponse).map(o => o.id));
}

function selectAll() {
  selected.value = new Set(selectableOccs.value.map(o => o.id));
}

async function bulkRespond(status) {
  bulkSaving.value = true;
  bulkError.value = '';
  bulkMessage.value = '';
  try {
    const { data } = await api.post('/responses/bulk', {
      occurrenceIds: [...selected.value],
      status
    });
    const updated = new Set(data.updated);
    monthOccs.value = monthOccs.value.map(o => updated.has(o.id)
      ? { ...o, myResponse: { ...(o.myResponse || {}), status } }
      : o);
    appCache.invalidate('dashboard', `occurrences:${year}-${month}`);

    const n = data.updated.length;
    bulkMessage.value = `${n} Termin${n !== 1 ? 'e' : ''} als „${statusLabel(status)}“ gespeichert.`
      + (data.skipped ? ` ${data.skipped} übersprungen (abgesagt oder Frist abgelaufen).` : '');
    setTimeout(() => { bulkMessage.value = ''; }, 4000);
    selectMode.value = false;
    selected.value = new Set();
  } catch (err) {
    bulkError.value = err.response?.data?.error || 'Fehler beim Speichern.';
  } finally {
    bulkSaving.value = false;
  }
}

function statusLabel(status) {
  if (status === 'JA') return 'Zugesagt';
  if (status === 'NEIN') return 'Abgesagt';
  if (status === 'VIELLEICHT') return 'Wenn möglich frei';
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
  font-family: 'DM Mono', monospace;
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
  font-weight: 300;
  color: var(--text);
  line-height: 1;
  font-family: 'DM Mono', monospace;
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
  font-weight: 400;
  font-family: 'DM Mono', monospace;
}

.count--full      { color: #22c55e; }
.count--partial   { color: #f59e0b; }
.count--cancelled { color: #ef4444; }

.row-chevron {
  color: var(--very-muted);
  flex-shrink: 0;
  margin-left: 12px;
}

/* Mehrfachauswahl */
.select-toggle {
  margin-left: auto;
  align-self: center;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--gold-border);
  border-radius: 999px;
  color: var(--gold);
  font-size: 12px;
  font-weight: 600;
  font-family: 'Raleway', system-ui, sans-serif;
  cursor: pointer;
}

.select-toggle--active { background: var(--gold); color: var(--bg); border-color: var(--gold); }

.select-tools {
  display: flex;
  gap: 8px;
  margin: -16px 0 16px;
  flex-wrap: wrap;
}

.chip {
  padding: 5px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font-size: 12px;
  font-family: 'Raleway', system-ui, sans-serif;
  cursor: pointer;
}

.chip:hover { border-color: var(--border-hover); }
.chip--ghost { background: transparent; color: var(--muted); }

.bulk-msg { margin-bottom: 16px; }

.occ-row--selected { border-color: var(--gold); background: var(--gold-glow); }
.occ-row--disabled { cursor: default; }
.occ-row--disabled:hover { transform: none; border-color: var(--border); background: var(--card); }

.row-check {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-left: 12px;
  border: 1.5px solid var(--border-hover);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
}

.row-check--on { background: var(--gold); border-color: var(--gold); }
.row-check--hidden { visibility: hidden; }

/* Platz für die fixe Leiste unten */
.occ-list--bulk { padding-bottom: 120px; }

.bulk-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background: var(--card);
  border-top: 1px solid var(--border);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.3);
}

.bulk-bar-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-count {
  font-size: 12px;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  white-space: nowrap;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
}

.bulk-btn {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  font-family: 'Raleway', system-ui, sans-serif;
  cursor: pointer;
  white-space: nowrap;
}

.bulk-btn:disabled { opacity: 0.4; cursor: default; }
.bulk-btn--ja   { background: var(--success-bg); border-color: #4a7e5e; color: #b8e6c5; }
.bulk-btn--nein { background: var(--error-bg);   border-color: #a03535; color: #f0a0a0; }
.bulk-btn--wm   { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: #f59e0b; }

@media (max-width: 480px) {
  .bulk-bar-inner { gap: 8px; }
  .bulk-actions { flex-basis: 100%; }
  .bulk-btn { flex: 1; padding: 10px 6px; font-size: 12px; white-space: normal; line-height: 1.25; }
  .occ-row { padding: 12px 14px; }
  .occ-divider { margin: 0 12px; }
  .status-label { display: none; }
  .occ-day-num { font-size: 18px; }
  .occ-title { font-size: 13px; }
  .past-toggle { font-size: 11px; padding: 9px 14px; }
}
</style>
