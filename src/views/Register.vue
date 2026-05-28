<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="logo-section">
        <h1 class="logo-text">Stage Bar</h1>
        <div class="logo-subtitle-row">
          <div class="deco-line"></div>
          <span class="logo-subtitle">Registrierung</span>
          <div class="deco-line"></div>
        </div>
      </div>

      <div v-if="tokenError" class="error-box" style="margin-bottom: 20px;">
        {{ tokenError }}
      </div>

      <form v-if="tokenValid" @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input
            type="text"
            v-model="name"
            placeholder="Max Mustermann"
            autocomplete="name"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">E-Mail</label>
          <input
            type="email"
            v-model="email"
            placeholder="name@stagebar.at"
            autocomplete="email"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">Passwort</label>
          <input
            type="password"
            v-model="password"
            placeholder="Mindestens 6 Zeichen"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">Passwort bestätigen</label>
          <input
            type="password"
            v-model="confirmPassword"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Registrieren…' : 'REGISTRIEREN' }}
        </button>
      </form>

      <p v-if="tokenValid" class="auth-footer">
        Bereits registriert?
        <router-link to="/login">Anmelden</router-link>
      </p>

      <div v-if="tokenError" class="back-link">
        <router-link to="/login">← Zurück zur Anmeldung</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api/axios';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);
const tokenValid = ref(false);
const tokenError = ref('');
const inviteToken = ref('');

onMounted(async () => {
  inviteToken.value = route.query.token || '';
  if (!inviteToken.value) {
    tokenError.value = 'Kein Einladungslink vorhanden. Bitte verwende einen gültigen Link.';
    return;
  }
  try {
    const { data } = await api.get(`/auth/validate-invite?token=${inviteToken.value}`);
    if (data.valid) {
      tokenValid.value = true;
    } else {
      tokenError.value = data.error || 'Einladungslink ungültig oder abgelaufen.';
    }
  } catch {
    tokenError.value = 'Fehler bei der Überprüfung des Links.';
  }
});

async function handleRegister() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwörter stimmen nicht überein.';
    return;
  }

  if (password.value.length < 6 ) {
    error.value = 'Passwort muss mindestens 6 Zeichen haben';
    return;
  }

  loading.value = true;
  try {
    await auth.register(inviteToken.value, name.value, email.value, password.value);
    router.push('/schichten');
  } catch (err) {
    error.value = err.response?.data?.error || 'Registrierung fehlgeschlagen.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  padding: 24px;
}

.auth-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 48px 44px;
  width: 100%;
  max-width: 400px;
}

.logo-section {
  text-align: center;
  margin-bottom: 36px;
}

.logo-text {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 48px;
  font-weight: 400;
  color: var(--gold);
  letter-spacing: 0.04em;
  line-height: 1.1;
  margin-bottom: 16px;
}

.logo-subtitle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.deco-line {
  flex: 1;
  height: 1px;
  background: var(--gold-border);
}

.logo-subtitle {
  font-size: 9px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
  font-weight: 500;
  font-family: 'Raleway', system-ui, sans-serif;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  font-weight: 400;
}

.auth-footer a {
  color: var(--gold);
  font-weight: 500;
}

.back-link {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 36px 24px;
  }
  .logo-text {
    font-size: 36px;
  }
}
</style>
