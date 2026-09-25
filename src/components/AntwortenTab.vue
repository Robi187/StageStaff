<template>
  <div>
    <div class="week-nav">
      <button class="week-arrow" @click="prevWeek">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="week-arrow" @click="nextWeek">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
    <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
    <div v-else-if="matrixOccs.length === 0" class="empty-state">Keine Termine in dieser Woche.</div>
    <div v-else class="matrix-wrapper">
      <table class="matrix-table desktop-matrix">
        <thead>
          <tr>
            <th class="name-col">Mitarbeiter</th>
            <th v-for="occ in matrixOccs" :key="occ.id" class="shift-col">
              <div class="col-wd">{{ getWdShort(occ.date) }}</div>
              <div class="col-date">{{ getDayNum(occ.date) }}.{{ getMonthNum(occ.date) }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in matrixUsers" :key="user.id">
            <td class="name-cell">
              <div class="user-row-inner">
                <div class="mini-avatar">{{ user.name[0] }}</div>
                <span>{{ user.name }}</span>
              </div>
            </td>
            <td v-for="occ in matrixOccs" :key="occ.id" class="status-cell">
              <span class="matrix-pill" :class="getMatrixClass(user.id, occ)" :data-tooltip="getMatrixTooltip(user.id, occ)">
                {{ getMatrixLabel(user.id, occ) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="mobile-matrix">
        <div class="mobile-row mobile-header-row">
          <div class="mobile-date-col"></div>
          <div class="mobile-user-col" v-for="user in matrixUsers" :key="user.id">
            <div class="mini-avatar">{{ user.name[0] }}</div>
          </div>
        </div>
        <div class="mobile-row" v-for="occ in matrixOccs" :key="occ.id">
          <div class="mobile-date-col">
            <div class="col-wd">{{ getWdShort(occ.date) }}</div>
            <div class="col-date">{{ getDayNum(occ.date) }}.{{ getMonthNum(occ.date) }}</div>
          </div>
          <div class="mobile-user-col" v-for="user in matrixUsers" :key="user.id">
            <span class="matrix-pill" :class="getMatrixClass(user.id, occ)" :data-tooltip="getMatrixTooltip(user.id, occ)">
              {{ getMatrixLabel(user.id, occ) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppCache } from '../stores/appCache';
import api from '../api/axios';

const appCache = useAppCache();

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function getDayNum(d) { return new Date(d).getDate(); }
function getMonthNum(d) { return new Date(d).getMonth() + 1; }
function getWdShort(d) { return WEEKDAYS_SHORT[new Date(d).getDay()]; }

const weekOffset = ref(0);
const matrixCache = ref({});
const matrixUsers = ref([]);
const loading = ref(false);

function getWeekBounds(offset) {
  const today = new Date();
  const dow = today.getDay();
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

const weekBounds = computed(() => getWeekBounds(weekOffset.value));

const weekLabel = computed(() => {
  const { monday, sunday } = weekBounds.value;
  const fmt = d => `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  const yearSuffix = monday.getFullYear() !== sunday.getFullYear()
    ? ` ${monday.getFullYear()}` : '';
  return `${fmt(monday)}${yearSuffix} – ${fmt(sunday)} ${sunday.getFullYear()}`;
});

const matrixOccs = computed(() => {
  const { monday, sunday } = weekBounds.value;
  const all = Object.values(matrixCache.value).flat();
  return all
    .filter(occ => { const d = new Date(occ.date); return d >= monday && d <= sunday; })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

function prevWeek() { weekOffset.value--; }
function nextWeek() { weekOffset.value++; }

function getMatrixClass(userId, occ) {
  const r = (occ.responses || []).find(r => r.userId === userId);
  if (!r) return 'pill-none';
  if (r.status === 'JA') return 'pill-ja';
  if (r.status === 'NEIN') return 'pill-nein';
  return 'pill-wm';
}

function getMatrixLabel(userId, occ) {
  const r = (occ.responses || []).find(r => r.userId === userId);
  if (!r) return '—';
  if (r.status === 'JA') return 'Ja';
  if (r.status === 'NEIN') return 'Nein';
  return 'WF';
}

function getMatrixTooltip(userId, occ) {
  const r = (occ.responses || []).find(r => r.userId === userId);
  if (!r) return null;
  const parts = [];
  if (r.updatedAt) {
    const d = new Date(r.updatedAt);
    const pad = n => String(n).padStart(2, '0');
    parts.push(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`);
  }
  if (r.comment) parts.push(`„${r.comment}“`);
  return parts.join('\n') || null;
}

async function fetchMatrix() {
  const { monday, sunday } = weekBounds.value;
  const needed = new Set([`${monday.getFullYear()}-${monday.getMonth() + 1}`]);
  if (sunday.getMonth() !== monday.getMonth() || sunday.getFullYear() !== monday.getFullYear()) {
    needed.add(`${sunday.getFullYear()}-${sunday.getMonth() + 1}`);
  }
  const missing = [...needed].filter(k =>
    !(k in matrixCache.value) || appCache.peek(`occurrences:${k}`) === null
  );
  if (missing.length === 0 && matrixUsers.value.length > 0) return;

  loading.value = true;
  try {
    const fetches = missing.map(k => {
      const [y, m] = k.split('-');
      return appCache.getOrFetch(`occurrences:${k}`, async () => {
        const { data } = await api.get(`/occurrences?year=${y}&month=${m}`);
        return data;
      }).then(data => ({ k, occs: data.occurrences }));
    });
    const needUsers = matrixUsers.value.length === 0;
    const [usersRes, ...results] = await Promise.all([
      needUsers ? appCache.getOrFetch('users', async () => {
        const { data } = await api.get('/users');
        return data;
      }) : Promise.resolve(null),
      ...fetches
    ]);
    if (needUsers && usersRes) {
      matrixUsers.value = usersRes.filter(u => u.role === 'MITARBEITER');
    }
    results.forEach(({ k, occs }) => {
      matrixCache.value = { ...matrixCache.value, [k]: occs };
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchMatrix());
watch(weekOffset, () => fetchMatrix());
</script>

<style scoped>
.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.week-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  text-align: center;
  flex: 1;
  letter-spacing: 0.02em;
}

.week-arrow {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 8px;
  padding: 7px 10px;
  width: auto;
  display: flex;
  align-items: center;
  transition: border-color 0.15s, color 0.15s;
}
.week-arrow:hover { border-color: var(--border-hover); color: var(--text); opacity: 1; }

.empty-state { text-align: center; color: var(--muted); padding: 40px 0; font-size: 14px; }

.matrix-wrapper { overflow-x: auto; }

.mobile-matrix { display: none; }
.desktop-matrix { display: table; }

.mobile-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 8px 0;
}
.mobile-header-row { padding: 6px 0; }
.mobile-date-col {
  width: 54px;
  flex-shrink: 0;
  text-align: left;
  padding: 0 4px;
}
.mobile-user-col {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 500px;
}

.matrix-table th, .matrix-table td {
  padding: 10px 8px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}

.name-col { text-align: left; min-width: 130px; }
.shift-col { min-width: 60px; }

.col-wd { font-size: 9px; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; font-family: 'DM Mono', monospace; }
.col-date { font-size: 13px; font-weight: 500; color: var(--text); font-family: 'DM Mono', monospace; }

.name-cell { text-align: left; }
.user-row-inner { display: flex; align-items: center; gap: 8px; }

.mini-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--beige);
  flex-shrink: 0;
}

.matrix-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  position: relative;
}

.matrix-pill[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a1727;
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
  font-weight: 500;
  white-space: pre;
  padding: 5px 10px;
  border-radius: 6px;
  z-index: 50;
  pointer-events: none;
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.pill-ja { background: var(--badge-green-bg); color: var(--badge-green-text); }
.pill-nein { background: var(--badge-red-bg); color: var(--badge-red-text); }
.pill-wm { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.pill-none { color: var(--very-muted); }

@media (max-width: 640px) {
  .desktop-matrix { display: none; }
  .mobile-matrix { display: block; }
}
</style>
