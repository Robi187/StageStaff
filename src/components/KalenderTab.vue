<template>
  <div>
    <div class="cal-controls">
      <div class="user-select-wrap">
        <label class="cal-label">MITARBEITER</label>
        <select v-model="calUserId" class="user-select">
          <option value="__all__">Alle Mitarbeiter</option>
          <option v-for="user in matrixUsers" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
          <option v-if="matrixUsers.length === 0" :value="''" disabled>Keine Mitarbeiter</option>
        </select>
      </div>
    </div>

    <div class="cal-month-nav">
      <button class="week-arrow" @click="prevCalMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="cal-month-label">{{ calMonthLabel }}</span>
      <button class="week-arrow" @click="nextCalMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
    <div v-else-if="!calUserId" class="empty-state">Bitte einen Mitarbeiter auswählen.</div>
    <div v-else class="calendar">
      <div class="cal-weekdays">
        <div v-for="wd in CAL_WEEKDAYS" :key="wd" class="cal-weekday">{{ wd }}</div>
      </div>
      <div class="cal-grid">
        <div
          v-for="cell in calCells"
          :key="cell.key"
          class="cal-cell"
          :class="{
            'cal-cell--empty': !cell.inMonth,
            'cal-cell--today': cell.isToday
          }"
        >
          <template v-if="cell.inMonth">
            <div class="cal-day-num">{{ cell.day }}</div>
            <div v-if="cell.occs.length > 0" class="cal-occs">
              <template v-if="isAllUsersMode">
                <div
                  v-for="occ in cell.occs"
                  :key="occ.id"
                  class="cal-occ cal-occ--all"
                >
                  <div class="cal-occ-title-all">{{ occ.shift.title }}</div>
                  <div class="cal-occ-users">
                    <span
                      v-for="user in matrixUsers"
                      :key="user.id"
                      class="cal-user-chip"
                      :class="allUserChipClass(user.id, occ)"
                      :title="allUserChipTitle(user, occ)"
                    >{{ user.name[0] }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="occ in cell.occs"
                  :key="occ.id"
                  class="cal-occ"
                  :class="calOccClass(occ)"
                  :title="calOccTitle(occ)"
                >
                  <div class="cal-occ-row">
                    <span class="cal-occ-status">{{ calOccLabel(occ) }}</span>
                    <span class="cal-occ-title">{{ occ.shift.title }}</span>
                  </div>
                  <div v-if="calOccComment(occ)" class="cal-occ-comment">„{{ calOccComment(occ) }}“</div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>

      <div class="cal-legend">
        <div class="cal-legend-item"><span class="legend-dot legend-ja"></span>Ja</div>
        <div class="cal-legend-item"><span class="legend-dot legend-nein"></span>Nein</div>
        <div class="cal-legend-item"><span class="legend-dot legend-wm"></span>Vielleicht</div>
        <div class="cal-legend-item"><span class="legend-dot legend-none"></span>Offen</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAppCache } from '../stores/appCache';
import api from '../api/axios';

const appCache = useAppCache();

const CAL_WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const calMonthOffset = ref(0);
const calUserId = ref('');
const matrixCache = ref({});
const matrixUsers = ref([]);
const loading = ref(false);

const calRefDate = computed(() => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + calMonthOffset.value);
  return d;
});

const calMonthLabel = computed(() => {
  const d = calRefDate.value;
  const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                       'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
});

function prevCalMonth() { calMonthOffset.value--; }
function nextCalMonth() { calMonthOffset.value++; }

const calMonthOccs = computed(() => {
  const d = calRefDate.value;
  const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
  return matrixCache.value[key] || [];
});

const calCells = computed(() => {
  const d = calRefDate.value;
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ key: `blank-${i}`, inMonth: false, day: null, occs: [], isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const isToday = cellDate.getTime() === today.getTime();
    const occs = calMonthOccs.value.filter(occ => {
      const od = new Date(occ.date);
      return od.getFullYear() === year && od.getMonth() === month && od.getDate() === day;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    cells.push({ key: `d-${day}`, inMonth: true, day, occs, isToday });
  }
  const total = cells.length;
  const remainder = total % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ key: `blank-end-${i}`, inMonth: false, day: null, occs: [], isToday: false });
    }
  }
  return cells;
});

const isAllUsersMode = computed(() => calUserId.value === '__all__');

function allUserChipClass(userId, occ) {
  const r = (occ.responses || []).find(r => r.userId === userId);
  if (!r) return 'chip--none';
  const base = r.status === 'JA' ? 'chip--ja' : r.status === 'NEIN' ? 'chip--nein' : 'chip--wm';
  return r.comment ? `${base} chip--has-comment` : base;
}

function allUserChipTitle(user, occ) {
  const r = (occ.responses || []).find(r => r.userId === user.id);
  const status = r ? (r.status === 'JA' ? 'Ja' : r.status === 'NEIN' ? 'Nein' : 'Vielleicht') : 'Offen';
  const base = `${user.name} — ${status}`;
  return r?.comment ? `${base}\n„${r.comment}“` : base;
}

function calOccClass(occ) {
  const r = (occ.responses || []).find(r => r.userId === calUserId.value);
  if (!r) return 'cal-occ--none';
  if (r.status === 'JA') return 'cal-occ--ja';
  if (r.status === 'NEIN') return 'cal-occ--nein';
  return 'cal-occ--wm';
}

function calOccLabel(occ) {
  const r = (occ.responses || []).find(r => r.userId === calUserId.value);
  if (!r) return '—';
  if (r.status === 'JA') return 'Ja';
  if (r.status === 'NEIN') return 'Nein';
  return 'WF';
}

function calOccTitle(occ) {
  const r = (occ.responses || []).find(r => r.userId === calUserId.value);
  const status = r ? (r.status === 'JA' ? 'Ja' : r.status === 'NEIN' ? 'Nein' : 'Vielleicht') : 'Offen';
  const base = `${occ.shift.title} — ${status}`;
  return r?.comment ? `${base}\n„${r.comment}“` : base;
}

function calOccComment(occ) {
  const r = (occ.responses || []).find(r => r.userId === calUserId.value);
  return r?.comment || '';
}

async function fetchCalMonth() {
  const d = calRefDate.value;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const key = `${y}-${m}`;
  const needUsers = matrixUsers.value.length === 0;
  const needOccs = !(key in matrixCache.value);

  if (!needUsers && !needOccs) return;

  loading.value = true;
  try {
    const promises = [];
    if (needUsers) {
      promises.push(appCache.getOrFetch('users', async () => {
        const { data } = await api.get('/users');
        return data;
      }).then(data => ({ type: 'users', data })));
    }
    if (needOccs) {
      promises.push(
        appCache.getOrFetch(`occurrences:${key}`, async () => {
          const { data } = await api.get(`/occurrences?year=${y}&month=${m}`);
          return data;
        }).then(data => ({ type: 'occs', key, data }))
      );
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r.type === 'users') {
        matrixUsers.value = r.data.filter(u => u.role === 'MITARBEITER');
      } else if (r.type === 'occs') {
        matrixCache.value = { ...matrixCache.value, [r.key]: r.data.occurrences };
      }
    }
    if (!calUserId.value) {
      calUserId.value = '__all__';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchCalMonth());
watch(calMonthOffset, () => fetchCalMonth());
</script>

<style scoped>
.cal-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 20px;
}

.user-select-wrap { display: flex; flex-direction: column; gap: 6px; flex: 1; }

.cal-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.user-select {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: 'Raleway', system-ui, sans-serif;
  width: 100%;
  cursor: pointer;
  transition: border-color 0.15s;
}
.user-select:hover, .user-select:focus { border-color: var(--border-hover); outline: none; }

.cal-month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
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

.cal-month-label {
  font-size: 14px;
  font-weight: 400;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  text-align: center;
  flex: 1;
  letter-spacing: 0.02em;
}

.empty-state { text-align: center; color: var(--muted); padding: 40px 0; font-size: 14px; }

.calendar {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--card);
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid var(--border);
}

.cal-weekday {
  padding: 8px 6px;
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.cal-cell {
  min-height: 88px;
  padding: 6px 6px 8px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.cal-cell:nth-child(7n) { border-right: none; }
.cal-grid > .cal-cell:nth-last-child(-n+7) { border-bottom: none; }

.cal-cell--empty { background: rgba(0,0,0,0.15); }

.cal-cell--today .cal-day-num {
  color: var(--beige);
  font-weight: 600;
}

.cal-day-num {
  font-size: 12px;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  padding: 2px 4px;
}

.cal-occs {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cal-occ {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-family: 'Raleway', system-ui, sans-serif;
  border-left: 3px solid transparent;
  background: rgba(255,255,255,0.03);
  min-width: 0;
}

.cal-occ-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cal-occ-status {
  font-weight: 700;
  letter-spacing: 0.06em;
  flex-shrink: 0;
  font-size: 9px;
}

.cal-occ-title {
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
}

.cal-occ-comment {
  font-size: 9px;
  color: var(--muted);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Raleway', system-ui, sans-serif;
}

.cal-occ--all {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 5px 6px 6px;
  border-left-color: var(--border);
}

.cal-occ-title-all {
  font-size: 10px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.cal-occ-users {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.cal-user-chip {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  font-family: 'Raleway', system-ui, sans-serif;
  line-height: 1;
  flex-shrink: 0;
  cursor: default;
  position: relative;
}

.chip--ja { background: #22c55e; color: #0c1a10; }
.chip--nein { background: #ef4444; color: #1a0808; }
.chip--wm { background: #f59e0b; color: #1c1206; }
.chip--none {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--very-muted);
}

.chip--has-comment::after {
  content: '';
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  border: 1px solid var(--card);
}

.cal-occ--ja { border-left-color: #22c55e; }
.cal-occ--ja .cal-occ-status { color: #22c55e; }
.cal-occ--nein { border-left-color: #ef4444; }
.cal-occ--nein .cal-occ-status { color: #ef4444; }
.cal-occ--wm { border-left-color: #f59e0b; }
.cal-occ--wm .cal-occ-status { color: #f59e0b; }
.cal-occ--none { border-left-color: var(--border); }
.cal-occ--none .cal-occ-status { color: var(--very-muted); }
.cal-occ--none .cal-occ-title { color: var(--muted); }

.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.legend-ja { background: #22c55e; }
.legend-nein { background: #ef4444; }
.legend-wm { background: #f59e0b; }
.legend-none { background: var(--border); }

@media (max-width: 640px) {
  .cal-cell { min-height: 62px; padding: 3px 3px 5px; }
  .cal-day-num { font-size: 10px; padding: 1px 2px; }
  .cal-occ { padding: 2px 3px; gap: 3px; }
  .cal-occ-title { display: none; }
  .cal-occ-status { font-size: 9px; }
  .cal-weekday { font-size: 9px; padding: 6px 2px; letter-spacing: 0.06em; }
  .cal-occ-title-all { display: none; }
  .cal-occ--all { padding: 3px; }
  .cal-user-chip { width: 12px; height: 12px; font-size: 7px; }
  .cal-occ-users { gap: 2px; }
}
</style>
