<template>
  <div>
    <Navbar />
    <div class="page-container--wide">

      <div class="tabs">
        <button
          v-for="tab in tabs" :key="tab.id"
          class="tab-btn" :class="{ 'tab-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <!-- Tab 1: SCHICHTEN -->
      <div v-if="activeTab === 'schichten'" class="tab-content">
        <div v-if="!loadingShifts" class="low-ja-widget" :class="lowJaOccs.length === 0 ? 'low-ja-widget--ok' : ''">
          <div class="low-ja-header">
            <span class="low-ja-dot"></span>
            <span class="low-ja-title">DIESE WOCHE</span>
            <span v-if="lowJaOccs.length > 0" class="low-ja-badge">{{ lowJaOccs.length }} zu wenig</span>
            <span v-else class="low-ja-badge low-ja-badge--ok">Alle besetzt</span>
          </div>
          <div v-if="lowJaOccs.length > 0" class="low-ja-list">
            <button
              v-for="occ in lowJaOccs"
              :key="occ.id"
              class="low-ja-item"
              @click="openOcc(occ.id)"
            >
              <span class="low-ja-date">{{ formatDate(occ.date) }}</span>
              <span class="low-ja-shift">{{ occ.shift.title }}</span>
              <span class="low-ja-count" :class="jaCount(occ) === 0 ? 'count-zero' : 'count-low'">
                {{ jaCount(occ) }}/{{ totalStaff }}
              </span>
            </button>
          </div>
        </div>

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

        <div class="section-header">
          <span class="section-title">ALLE SCHICHTEN</span>
          <button class="btn-outline btn-add" @click="showCreateModal = true">+ SCHICHT</button>
        </div>

        <div v-if="loadingShifts" class="loading-state"><div class="spinner"></div></div>
        <div v-else-if="allShifts.length === 0" class="empty-state">Keine Schichten vorhanden.</div>
        <div v-else-if="sortedWeekOccs.length === 0" class="empty-state">Keine Termine in dieser Woche.</div>
        <div v-else class="shift-list">
          <button
            v-for="occ in sortedWeekOccs"
            :key="occ.id"
            type="button"
            class="occ-flat-row"
            @click="openOcc(occ.id)"
          >
            <div class="occ-flat-main">
              <span class="occ-flat-title">{{ occ.shift.title }}</span>
              <span class="occ-flat-date">{{ formatDate(occ.date) }}</span>
              <span v-if="occ.cancelled" class="tag tag--cancelled">Abgesagt</span>
            </div>
            <div class="occ-flat-actions">
              <button class="btn-delete" @click.stop="deleteShift(occ.shift.id)" title="Schicht löschen">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/>
                  <path d="M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          </button>
        </div>
      </div>

      <!-- Tab 2: ANTWORTEN -->
      <div v-if="activeTab === 'antworten'" class="tab-content">
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
        <div v-if="loadingMatrix" class="loading-state"><div class="spinner"></div></div>
        <div v-else-if="matrixOccs.length === 0" class="empty-state">Keine Termine in dieser Woche.</div>
        <div v-else class="matrix-wrapper">
          <!-- Desktop: users as rows, dates as columns -->
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
                  <span class="matrix-pill" :class="getMatrixClass(user.id, occ)">
                    {{ getMatrixLabel(user.id, occ) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <!-- Mobile: dates as rows, user avatars as columns -->
          <table class="matrix-table mobile-matrix">
            <thead>
              <tr>
                <th class="date-col-header"></th>
                <th v-for="user in matrixUsers" :key="user.id" class="avatar-col-header">
                  <div class="mini-avatar">{{ user.name[0] }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="occ in matrixOccs" :key="occ.id">
                <td class="date-cell">
                  <div class="col-wd">{{ getWdShort(occ.date) }}</div>
                  <div class="col-date">{{ getDayNum(occ.date) }}.{{ getMonthNum(occ.date) }}</div>
                </td>
                <td v-for="user in matrixUsers" :key="user.id" class="status-cell">
                  <span class="matrix-pill" :class="getMatrixClass(user.id, occ)">
                    {{ getMatrixLabel(user.id, occ) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: BENUTZER -->
      <div v-if="activeTab === 'benutzer'" class="tab-content">
        <div class="invite-card card">
          <div class="invite-header">
            <h3 class="invite-title">EINLADUNGSLINK ERSTELLEN</h3>
            <p class="invite-desc">Gültig 7 Tage, einmalig verwendbar:</p>
          </div>
          <div class="invite-url-row">
            <input type="text" :value="inviteUrl" readonly class="invite-input" placeholder="Noch kein Link generiert" />
            <button class="btn-copy btn-outline" @click="copyInviteUrl" :disabled="!inviteUrl">
              {{ copied ? '✓ Kopiert' : 'KOPIEREN' }}
            </button>
          </div>
          <button class="btn-generate btn-outline" @click="generateInvite" :disabled="generatingLink">
            {{ generatingLink ? 'Generiere…' : 'NEUEN LINK GENERIEREN' }}
          </button>
        </div>

        <div class="users-section">
          <div class="users-header">
            <span class="section-title">{{ users.length }} ACCOUNT{{ users.length !== 1 ? 'S' : '' }}</span>
          </div>
          <div v-if="loadingUsers" class="loading-state"><div class="spinner"></div></div>
          <div v-else class="user-list">
            <div v-for="user in users" :key="user.id" class="user-item">
              <div class="user-avatar-lg">{{ user.name[0] }}</div>
              <div class="user-meta">
                <div class="user-name-row">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="role-badge" :class="user.role === 'ADMIN' ? 'role-badge--admin' : 'role-badge--staff'">
                    {{ user.role }}
                  </span>
                </div>
                <div class="user-email">{{ user.email }}</div>
              </div>
              <div v-if="user.role !== 'ADMIN'" class="user-actions">
                <button class="btn-delete-user" @click="deleteUser(user.id)">LÖSCHEN</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Shift Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3 class="modal-title">SCHICHT ERSTELLEN</h3>
          <button class="modal-close" @click="showCreateModal = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form @submit.prevent="createShift" class="modal-form">
          <div class="form-group">
            <label class="form-label">Titel *</label>
            <input type="text" v-model="newShift.title" placeholder="z.B. Abendschicht" required />
          </div>
          <div class="form-group">
            <label class="form-label">Datum (erster Termin) *</label>
            <input type="date" v-model="newShift.validFrom" required />
          </div>
          <div v-if="createError" class="error-box">{{ createError }}</div>
          <button type="submit" class="btn-primary" :disabled="creatingShift">
            {{ creatingShift ? 'Erstelle…' : 'SCHICHT ERSTELLEN' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Add Occurrence Modal -->
    <div v-if="showOccModal" class="modal-overlay" @click.self="showOccModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3 class="modal-title">TERMIN HINZUFÜGEN</h3>
          <button class="modal-close" @click="showOccModal = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p class="occ-shift-name">Schicht: <strong>{{ selectedShift?.title }}</strong></p>
        <form @submit.prevent="addOccurrence" class="modal-form">
          <div class="form-group">
            <label class="form-label">Datum *</label>
            <input type="date" v-model="newOcc.date" required />
          </div>
          <div class="form-group">
            <label class="form-label">Antwortfrist (optional)</label>
            <input type="datetime-local" v-model="newOcc.deadline" />
          </div>
          <div v-if="occError" class="error-box">{{ occError }}</div>
          <button type="submit" class="btn-primary" :disabled="addingOcc">
            {{ addingOcc ? 'Erstelle…' : 'TERMIN ERSTELLEN' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppCache } from '../stores/appCache';
import Navbar from '../components/Navbar.vue';
import api from '../api/axios';

const appCache = useAppCache();

const router = useRouter();

const tabs = [
  { id: 'schichten', label: 'SCHICHTEN' },
  { id: 'antworten', label: 'ANTWORTEN' },
  { id: 'benutzer', label: 'BENUTZER' }
];
const activeTab = ref('schichten');

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function getDayNum(d) { return new Date(d).getDate(); }
function getMonthNum(d) { return new Date(d).getMonth() + 1; }
function getWdShort(d) { return WEEKDAYS_SHORT[new Date(d).getDay()]; }

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDeadline(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ── Schichten tab ────────────────────────────────
const allShifts = ref([]);
const loadingShifts = ref(true);
const totalStaff = ref(0);
const dashOccs = ref([]);

function jaCount(occ) {
  return (occ.responses || []).filter(r => r.status === 'JA').length;
}

const lowJaOccs = computed(() => {
  if (!totalStaff.value) return [];
  const { monday, sunday } = getWeekBounds(0);
  return dashOccs.value.filter(occ => {
    if (occ.cancelled) return false;
    const d = new Date(occ.date);
    return d >= monday && d <= sunday && jaCount(occ) < totalStaff.value;
  });
});

const showCreateModal = ref(false);
const creatingShift = ref(false);
const createError = ref('');
const newShift = ref({ title: '', validFrom: '', startTime: '20:00', endTime: '04:00' });

const showOccModal = ref(false);
const selectedShift = ref(null);
const addingOcc = ref(false);
const occError = ref('');
const newOcc = ref({ date: '', deadline: '' });

// ── Antworten tab ────────────────────────────────
const weekOffset = ref(0);
const matrixCache = ref({}); // keyed "year-month" → occurrences[]
const matrixUsers = ref([]);
const loadingMatrix = ref(false);

function getWeekBounds(offset) {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
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
function openOcc(id) { router.push(`/schichten/${id}?from=admin`); }

function weekOccs(shift) {
  const { monday, sunday } = weekBounds.value;
  return shift.occurrences.filter(occ => {
    const d = new Date(occ.date);
    return d >= monday && d <= sunday;
  });
}

const sortedWeekOccs = computed(() => {
  const { monday, sunday } = weekBounds.value;
  return allShifts.value
    .flatMap(shift => shift.occurrences
      .filter(occ => { const d = new Date(occ.date); return d >= monday && d <= sunday; })
      .map(occ => ({ ...occ, shift }))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

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
  return 'VM';
}

// ── Benutzer tab ─────────────────────────────────
const users = ref([]);
const loadingUsers = ref(true);
const inviteUrl = ref('');
const generatingLink = ref(false);
const copied = ref(false);

// ── Lifecycle ─────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchShifts(), fetchUsers()]);
});

watch(activeTab, async (tab) => {
  if (tab === 'antworten') await fetchMatrix();
});

watch(weekOffset, async () => {
  if (activeTab.value === 'antworten') await fetchMatrix();
});

// ── Data fetching ──────────────────────────────────
async function fetchShifts() {
  loadingShifts.value = true;
  try {
    const [shifts, dash] = await Promise.all([
      appCache.getOrFetch('shifts', async () => {
        const { data } = await api.get('/shifts');
        return data;
      }),
      appCache.getOrFetch('dashboard', async () => {
        const { data } = await api.get('/dashboard');
        return data;
      })
    ]);
    allShifts.value = shifts;
    totalStaff.value = dash.totalStaff;
    dashOccs.value = dash.occurrences || [];
  } finally {
    loadingShifts.value = false;
  }
}

async function fetchMatrix() {
  const { monday, sunday } = weekBounds.value;
  const needed = new Set([
    `${monday.getFullYear()}-${monday.getMonth() + 1}`
  ]);
  if (sunday.getMonth() !== monday.getMonth() || sunday.getFullYear() !== monday.getFullYear()) {
    needed.add(`${sunday.getFullYear()}-${sunday.getMonth() + 1}`);
  }
  const missing = [...needed].filter(k =>
    !(k in matrixCache.value) || appCache.peek(`occurrences:${k}`) === null
  );
  if (missing.length === 0 && matrixUsers.value.length > 0) return;

  loadingMatrix.value = true;
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
      needUsers ? api.get('/users') : Promise.resolve(null),
      ...fetches
    ]);
    if (needUsers && usersRes) {
      matrixUsers.value = usersRes.data.filter(u => u.role === 'MITARBEITER');
    }
    results.forEach(({ k, occs }) => {
      matrixCache.value = { ...matrixCache.value, [k]: occs };
    });
  } finally {
    loadingMatrix.value = false;
  }
}

async function fetchUsers() {
  loadingUsers.value = true;
  try {
    const all = await appCache.getOrFetch('users', async () => {
      const { data } = await api.get('/users');
      return data;
    });
    users.value = all.filter(u => u.role !== 'ADMIN');
  } finally {
    loadingUsers.value = false;
  }
}

// ── Shift actions ──────────────────────────────────
async function createShift() {
  createError.value = '';
  creatingShift.value = true;
  try {
    await api.post('/shifts', {
      title: newShift.value.title,
      startTime: newShift.value.startTime,
      endTime: newShift.value.endTime,
      validFrom: newShift.value.validFrom
    });
    showCreateModal.value = false;
    newShift.value = { title: '', validFrom: '', startTime: '20:00', endTime: '04:00' };
    appCache.invalidate('shifts', 'dashboard');
    appCache.invalidatePattern('occurrences:');
    await fetchShifts();
  } catch (err) {
    createError.value = err.response?.data?.error || 'Fehler beim Erstellen.';
  } finally {
    creatingShift.value = false;
  }
}

async function deleteShift(id) {
  if (!confirm('Schicht und alle Termine wirklich löschen?')) return;
  try {
    await api.delete(`/shifts/${id}`);
    appCache.invalidate('shifts', 'dashboard');
    appCache.invalidatePattern('occurrences:');
    await fetchShifts();
  } catch (err) {
    alert(err.response?.data?.error || 'Fehler beim Löschen.');
  }
}

function openAddOccurrence(shift) {
  selectedShift.value = shift;
  newOcc.value = { date: '', deadline: '' };
  occError.value = '';
  showOccModal.value = true;
}

async function addOccurrence() {
  occError.value = '';
  addingOcc.value = true;
  try {
    await api.post('/occurrences', {
      shiftId: selectedShift.value.id,
      date: newOcc.value.date,
      deadline: newOcc.value.deadline || undefined
    });
    showOccModal.value = false;
    const occDate = new Date(newOcc.value.date);
    appCache.invalidate(
      'shifts', 'dashboard',
      `occurrences:${occDate.getFullYear()}-${occDate.getMonth() + 1}`
    );
    await fetchShifts();
  } catch (err) {
    occError.value = err.response?.data?.error || 'Fehler beim Erstellen.';
  } finally {
    addingOcc.value = false;
  }
}

// ── Invite & user actions ─────────────────────────
async function generateInvite() {
  generatingLink.value = true;
  try {
    const { data } = await api.get('/auth/invite');
    inviteUrl.value = data.url;
  } catch (err) {
    alert(err.response?.data?.error || 'Fehler.');
  } finally {
    generatingLink.value = false;
  }
}

async function copyInviteUrl() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    alert('Bitte manuell kopieren.');
  }
}


async function deleteUser(id) {
  if (!confirm('Benutzer wirklich löschen?')) return;
  try {
    await api.delete(`/users/${id}`);
    appCache.invalidate('users');
    await fetchUsers();
  } catch (err) {
    alert(err.response?.data?.error || 'Fehler.');
  }
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  padding: 10px 20px;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  width: auto;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover { color: var(--text); opacity: 1; }
.tab-btn--active { color: var(--beige); border-bottom-color: var(--beige); }

/* Low JA widget */
.low-ja-widget {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.low-ja-widget--ok {
  background: rgba(34, 197, 94, 0.05);
  border-color: rgba(34, 197, 94, 0.2);
}

.low-ja-widget--ok .low-ja-header {
  border-bottom: none;
}

.low-ja-widget--ok .low-ja-dot { background: #22c55e; }
.low-ja-widget--ok .low-ja-title { color: #4ade80; }

.low-ja-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
}

.low-ja-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.low-ja-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #f87171;
  font-family: 'Raleway', system-ui, sans-serif;
  flex: 1;
}

.low-ja-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 1px 7px;
  border-radius: 999px;
}

.low-ja-badge--ok {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.low-ja-list {
  display: flex;
  flex-direction: column;
}

.low-ja-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 18px;
  border-bottom: 1px solid rgba(239, 68, 68, 0.08);
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
}

.low-ja-item:last-child { border-bottom: none; }
.low-ja-item:hover { background: rgba(239, 68, 68, 0.06); opacity: 1; }

.low-ja-date {
  font-size: 12px;
  color: var(--text);
  font-family: 'Raleway', system-ui, sans-serif;
  min-width: 160px;
}

.low-ja-shift {
  font-size: 12px;
  color: var(--muted);
  flex: 1;
}

.low-ja-count {
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.count-zero { color: #ef4444; }
.count-low  { color: #f59e0b; }

/* Section header */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.btn-add { padding: 8px 16px; font-size: 11px; }
.btn-small { padding: 6px 12px; font-size: 11px; }

.empty-state { text-align: center; color: var(--muted); padding: 40px 0; font-size: 14px; }

/* Shift list */
.shift-list { display: flex; flex-direction: column; gap: 8px; }

.occ-flat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: 'Raleway', system-ui, sans-serif;
}

.occ-flat-row:hover { border-color: var(--border-hover); background: var(--card-hover); opacity: 1; }

.occ-flat-main { display: flex; align-items: center; gap: 16px; flex: 1; flex-wrap: wrap; }
.occ-flat-title { font-size: 14px; font-weight: 500; color: var(--text); }
.occ-flat-date { font-size: 13px; color: var(--muted); }

.occ-flat-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.btn-delete {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  padding: 6px 8px;
  border-radius: 8px;
  width: auto;
  transition: color 0.15s, background 0.15s;
}

.btn-delete:hover { color: var(--error-dot); background: rgba(248, 113, 113, 0.08); opacity: 1; }


.tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 999px;
}
.tag--cancelled { background: rgba(127, 29, 29, 0.4); color: #f87171; }
.tag--deadline-open { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

/* Week navigation */
.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.week-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  font-family: 'Raleway', system-ui, sans-serif;
  text-align: center;
  flex: 1;
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

/* Matrix */
.matrix-wrapper { overflow-x: auto; }

.mobile-matrix { display: none; }
.desktop-matrix { display: table; }

.date-col-header { width: 52px; min-width: 52px; }
.avatar-col-header { text-align: center; padding: 8px 4px; }
.date-cell { text-align: left; padding: 8px 6px; white-space: nowrap; }

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

.col-wd { font-size: 9px; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; }
.col-date { font-size: 13px; font-weight: 600; color: var(--text); }

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
}

.pill-ja { background: var(--badge-green-bg); color: var(--badge-green-text); }
.pill-nein { background: var(--badge-red-bg); color: var(--badge-red-text); }
.pill-wm { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.pill-none { color: var(--very-muted); }

/* Users */
.invite-card { margin-bottom: 32px; }
.invite-header { margin-bottom: 16px; }
.invite-title { font-size: 11px; font-weight: 600; letter-spacing: 0.18em; color: var(--muted); font-family: 'Raleway', system-ui, sans-serif; }
.invite-desc { font-size: 12px; color: var(--muted); margin-top: 6px; }

.invite-url-row { display: flex; gap: 8px; margin-bottom: 12px; }
.invite-input { font-size: 12px; }
.btn-copy { white-space: nowrap; flex-shrink: 0; }
.btn-generate { width: auto; }

.users-section { margin-top: 8px; }
.users-header { margin-bottom: 16px; }

.user-list { display: flex; flex-direction: column; gap: 8px; }

.user-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 18px;
}

.user-avatar-lg {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2A2438, #1E1B2C);
  border: 1px solid var(--beige-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; color: var(--beige);
  flex-shrink: 0;
  font-family: 'Raleway', system-ui, sans-serif;
}

.user-meta { flex: 1; }
.user-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.user-name { font-size: 14px; font-weight: 500; color: var(--text); }
.user-email { font-size: 12px; color: var(--muted); }

.role-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  padding: 2px 8px; border-radius: 999px;
}
.role-badge--admin { background: rgba(200, 185, 154, 0.12); color: var(--beige); }
.role-badge--staff { background: rgba(107, 104, 128, 0.2); color: var(--muted); }

.user-actions { display: flex; gap: 8px; }


.btn-delete-user {
  background: transparent;
  border: 1px solid rgba(127, 29, 29, 0.4);
  color: #f87171;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 5px 10px;
  border-radius: 8px;
  width: auto;
  transition: background 0.15s;
}
.btn-delete-user:hover { background: rgba(248, 113, 113, 0.08); opacity: 1; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(12, 11, 18, 0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  padding: 20px;
}

.modal {
  width: 100%; max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}

.modal-title { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: var(--beige); font-family: 'Raleway', system-ui, sans-serif; }

.modal-close {
  background: transparent; border: none; color: var(--muted);
  padding: 4px; width: auto; cursor: pointer;
}
.modal-close:hover { color: var(--text); opacity: 1; }

.modal-form { display: flex; flex-direction: column; gap: 16px; }

.occ-shift-name { font-size: 13px; color: var(--muted); margin-bottom: 16px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

@media (max-width: 640px) {
  .shift-block-info { flex-direction: column; align-items: flex-start; gap: 4px; }
  .user-actions { flex-direction: column; gap: 4px; }
  .tab-btn { padding: 10px 12px; letter-spacing: 0.1em; }
  .desktop-matrix { display: none; }
  .mobile-matrix { display: table; min-width: unset; width: 100%; font-size: 12px; }

  .invite-url-row { flex-direction: column; }
  .btn-copy { width: 100%; justify-content: center; }

  .low-ja-date { min-width: 0; font-size: 11px; }
  .low-ja-item { flex-wrap: wrap; gap: 4px; }
  .low-ja-shift { min-width: 0; }

  .occ-flat-row { padding: 12px 14px; gap: 10px; }
  .occ-flat-date { font-size: 11px; }

  .user-item { flex-wrap: wrap; row-gap: 10px; }
  .user-meta { min-width: 0; }
  .user-email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>
