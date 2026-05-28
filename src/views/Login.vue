<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="logo-section">
        <h1 class="logo-text">Stage Bar</h1>
        <div class="logo-subtitle-row">
          <div class="deco-line"></div>
          <span class="logo-subtitle">Mitarbeiter-Portal</span>
          <div class="deco-line"></div>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
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
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Anmelden…' : 'ANMELDEN' }}
        </button>
      </form>

    
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/schichten');
  } catch (err) {
    error.value = err.response?.data?.error || 'Anmeldung fehlgeschlagen.';
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
  padding: 52px 44px;
  width: 100%;
  max-width: 400px;
}

.logo-section {
  text-align: center;
  margin-bottom: 44px;
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

@media (max-width: 480px) {
  .auth-card { padding: 36px 24px; }
  .logo-text { font-size: 40px; }
}
</style>
