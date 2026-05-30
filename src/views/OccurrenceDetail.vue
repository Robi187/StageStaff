<template>
  <Navbar />
  <div class="page-container">
    <button class="back-btn" @click="goBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Zurück
    </button>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="loadError" class="error-box load-error">
      {{ loadError }}
    </div>

    <template v-else-if="occ">
      <!-- Shift header -->
      <div class="shift-header">
        <div class="shift-date-block">
          <span class="shift-day">{{ day }}</span>
          <div class="shift-meta">
            <span class="shift-weekday-month">{{ weekdayMonth }}</span>
            <span class="shift-time">{{ effectiveStartTime }} – {{ effectiveEndTime }}</span>
          </div>
        </div>
        <h1 class="shift-title">{{ occ.shift.title }}</h1>
      </div>

      <!-- Cancelled banner (staff view) -->
      <div v-if="occ.cancelled && !auth.isAdmin" class="status-banner banner--cancelled">
        Diese Schicht wurde abgesagt.
      </div>

      <!-- Response form (staff only, not cancelled) -->
      <div class="section" v-if="!occ.cancelled && !auth.isAdmin">
        <div class="section-title">Deine Antwort</div>

        <div class="response-options">
          <button
            v-for="opt in responseOptions"
            :key="opt.value"
            class="response-btn"
            :class="[opt.cls, { 'response-btn--active': selectedStatus === opt.value }]"
            @click="selectedStatus = opt.value"
          >
            <span class="response-indicator" :class="{ 'indicator--active': selectedStatus === opt.value }"></span>
            <span class="response-label">{{ opt.label }}</span>
          </button>
        </div>

        <div class="comment-group" v-if="selectedStatus">
          <label class="form-label">Kommentar (optional)</label>
          <textarea
            v-model="comment"
            rows="3"
            maxlength="500"
            placeholder="Anmerkung hinzufügen…"
          ></textarea>
        </div>

        <div v-if="responseError" class="error-box">{{ responseError }}</div>
        <div v-if="responseSaved" class="success-box">Antwort gespeichert.</div>

        <button
          v-if="selectedStatus"
          class="btn-primary save-btn"
          :disabled="saving"
          @click="saveResponse"
        >
          {{ saving ? 'Speichern…' : hasExistingResponse ? 'Ändern' : 'Speichern' }}
        </button>
      </div>

      <!-- Admin view -->
      <div v-if="auth.isAdmin" class="admin-section">

        <!-- Cancel control -->
        <div class="cancel-card" :class="{ 'cancel-card--active': occ.cancelled }">
          <div class="cancel-card-info">
            <div class="cancel-card-label">
              {{ occ.cancelled ? 'Dieser Termin ist abgesagt' : 'Termin absagen' }}
            </div>
            <div class="cancel-card-sub">
              {{ occ.cancelled ? 'Mitarbeiter sehen diesen Termin als abgesagt.' : 'Mitarbeiter können dann nicht mehr antworten.' }}
            </div>
          </div>
          <button
            class="cancel-toggle-btn"
            :class="occ.cancelled ? 'cancel-toggle-btn--restore' : 'cancel-toggle-btn--cancel'"
            :disabled="toggling"
            @click="toggleCancelled"
          >
            {{ toggling ? '…' : occ.cancelled ? 'Wiederherstellen' : 'Absagen' }}
          </button>
        </div>

        <!-- Responses -->
        <div class="responses-header">
          <span class="section-title">ANTWORTEN</span>
          <span class="resp-count-badge">{{ occ.responses.length }}</span>
        </div>

        <div v-if="occ.responses.length === 0" class="no-responses">
          Noch keine Antworten.
        </div>

        <div v-else class="response-list">
          <div v-for="r in occ.responses" :key="r.id" class="response-item">
            <div class="resp-avatar">{{ r.user.name[0].toUpperCase() }}</div>
            <div class="resp-info">
              <span class="resp-name">{{ r.user.name }}</span>
              <span v-if="r.comment" class="resp-comment">{{ r.comment }}</span>
            </div>
            <div class="resp-right">
              <span class="resp-time">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ formatResponseTime(r.updatedAt) }}
              </span>
              <span class="resp-badge" :class="`resp-badge--${r.status.toLowerCase()}`">
                {{ statusLabel(r.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
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

const occ = ref(null);
const loading = ref(true);
const loadError = ref('');
const selectedStatus = ref('');
const comment = ref('');
const saving = ref(false);
const toggling = ref(false);
const responseError = ref('');
const responseSaved = ref(false);

function goBack() {
  if (route.query.from === 'admin') {
    router.push('/admin');
  } else if (occ.value) {
    const d = new Date(occ.value.date);
    router.push(`/schichten/${d.getFullYear()}/${d.getMonth() + 1}`);
  } else {
    router.push('/schichten');
  }
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const responseOptions = [
  { value: 'JA',        label: 'Ich kann kommen',   cls: 'response-btn--ja' },
  { value: 'NEIN',      label: 'Ich kann nicht',     cls: 'response-btn--nein' },
  { value: 'VIELLEICHT',label: 'Wenn möglich frei',  cls: 'response-btn--wm' }
];

const day = computed(() => occ.value ? new Date(occ.value.date).getDate() : '');

const weekdayMonth = computed(() => {
  if (!occ.value) return '';
  const d = new Date(occ.value.date);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
});

const effectiveStartTime = computed(() => occ.value?.startTime || occ.value?.shift.startTime || '');
const effectiveEndTime   = computed(() => occ.value?.endTime   || occ.value?.shift.endTime   || '');

const hasExistingResponse = computed(() => {
  if (!occ.value) return false;
  return occ.value.responses.some(r => r.userId === auth.user?.id);
});

function formatResponseTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusLabel(status) {
  if (status === 'JA') return 'Ja';
  if (status === 'NEIN') return 'Nein';
  if (status === 'VIELLEICHT') return 'Vielleicht';
  return status;
}

async function saveResponse() {
  responseError.value = '';
  responseSaved.value = false;
  saving.value = true;
  try {
    await api.post('/responses', {
      occurrenceId: occ.value.id,
      status: selectedStatus.value,
      comment: comment.value || null
    });
    responseSaved.value = true;
    const d = new Date(occ.value.date);
    appCache.invalidate('dashboard', `occurrences:${d.getFullYear()}-${d.getMonth() + 1}`);
    await loadOccurrence();
  } catch (err) {
    responseError.value = err.response?.data?.error || 'Fehler beim Speichern.';
  } finally {
    saving.value = false;
  }
}

async function toggleCancelled() {
  toggling.value = true;
  try {
    const { data } = await api.patch(`/occurrences/${occ.value.id}`, {
      cancelled: !occ.value.cancelled
    });
    occ.value = { ...occ.value, cancelled: data.cancelled };
    const d = new Date(occ.value.date);
    appCache.invalidate('dashboard', `occurrences:${d.getFullYear()}-${d.getMonth() + 1}`);
  } catch (err) {
    alert(err.response?.data?.error || 'Fehler.');
  } finally {
    toggling.value = false;
  }
}

async function loadOccurrence() {
  const { data } = await api.get(`/occurrences/${route.params.occurrenceId}`).catch(err => {
    throw new Error(err.response?.data?.error || 'Termin konnte nicht geladen werden.');
  });
  occ.value = data;
  const myResponse = data.responses[0];
  if (myResponse) {
    selectedStatus.value = myResponse.status;
    comment.value = myResponse.comment || '';
  }
}

onMounted(async () => {
  try {
    await loadOccurrence();
  } catch (err) {
    loadError.value = err.message || 'Fehler beim Laden des Termins.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.shift-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.shift-date-block {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.shift-day {
  font-size: 48px;
  font-weight: 300;
  color: var(--beige);
  line-height: 1;
  font-family: 'Bodoni Moda', Georgia, serif;
}

.shift-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shift-weekday-month {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  font-family: 'Raleway', system-ui, sans-serif;
}

.shift-time {
  font-size: 13px;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.shift-title {
  font-size: 22px;
  color: var(--text);
  font-family: 'Bodoni Moda', Georgia, serif;
  font-weight: 400;
}

.status-banner {
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 28px;
}

.banner--cancelled {
  background: rgba(127, 29, 29, 0.25);
  color: #f87171;
  border: 1px solid rgba(127, 29, 29, 0.4);
}

.section { margin-bottom: 32px; }

.response-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
  margin-bottom: 16px;
}

.response-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 20px;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  width: 100%;
  transition: border-color 0.15s, background 0.15s;
  letter-spacing: 0;
  font-family: 'Raleway', system-ui, sans-serif;
}

.response-btn:hover:not(:disabled) { border-color: var(--border-hover); opacity: 1; }

.response-btn--ja.response-btn--active   { background: var(--success-bg); border-color: #4a7e5e; color: #b8e6c5; }
.response-btn--nein.response-btn--active  { background: var(--error-bg);   border-color: #a03535; color: #f0a0a0; }
.response-btn--wm.response-btn--active   { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: #f59e0b; }

.response-label { flex: 1; }

.response-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  flex-shrink: 0;
  transition: background 0.15s;
}

.indicator--active { background: currentColor; }

.comment-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.save-btn { margin-top: 4px; }
.load-error { margin-top: 8px; }

/* ── Admin section ─────────────────────────── */
.admin-section { display: flex; flex-direction: column; gap: 20px; }

/* Cancel card */
.cancel-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  transition: border-color 0.2s, background 0.2s;
}

.cancel-card--active {
  border-color: rgba(127, 29, 29, 0.5);
  background: rgba(127, 29, 29, 0.08);
}

.cancel-card-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  font-family: 'Raleway', system-ui, sans-serif;
}

.cancel-card--active .cancel-card-label { color: #f87171; }

.cancel-card-sub {
  font-size: 12px;
  color: var(--muted);
  font-family: 'Raleway', system-ui, sans-serif;
}

.cancel-toggle-btn {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  width: auto;
  transition: background 0.15s, border-color 0.15s;
  font-family: 'Raleway', system-ui, sans-serif;
}

.cancel-toggle-btn--cancel {
  background: transparent;
  border: 1px solid rgba(127, 29, 29, 0.5);
  color: #f87171;
}
.cancel-toggle-btn--cancel:hover { background: rgba(248,113,113,0.08); opacity: 1; }

.cancel-toggle-btn--restore {
  background: transparent;
  border: 1px solid var(--border-hover);
  color: var(--muted);
}
.cancel-toggle-btn--restore:hover { border-color: var(--text); color: var(--text); opacity: 1; }

/* Responses */
.responses-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resp-count-badge {
  background: var(--border);
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  font-family: 'Raleway', system-ui, sans-serif;
}

.no-responses {
  text-align: center;
  padding: 32px;
  color: var(--muted);
  font-size: 13px;
}

.response-list { display: flex; flex-direction: column; gap: 8px; }

.response-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
}

.resp-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2A2438, #1E1B2C);
  border: 1px solid var(--beige-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--beige);
  flex-shrink: 0;
  font-family: 'Raleway', system-ui, sans-serif;
}

.resp-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resp-name    { font-size: 14px; font-weight: 500; color: var(--text); }
.resp-comment { font-size: 12px; color: var(--muted); font-style: italic; }

.resp-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.resp-time {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  color: var(--beige); opacity: 0.7;
  font-family: 'Raleway', system-ui, sans-serif;
  white-space: nowrap;
}
.resp-time svg { flex-shrink: 0; }

.resp-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.resp-badge--ja         { background: var(--badge-green-bg); color: var(--badge-green-text); }
.resp-badge--nein       { background: var(--badge-red-bg);   color: var(--badge-red-text); }
.resp-badge--vielleicht { background: rgba(245,158,11,0.15); color: #f59e0b; }

@media (max-width: 480px) {
  .shift-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .shift-day { font-size: 36px; }

  .cancel-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .cancel-toggle-btn { width: 100%; text-align: center; justify-content: center; }

  .response-item { padding: 10px 12px; gap: 10px; }
  .resp-name { font-size: 13px; }
}
</style>
