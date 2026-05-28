<template>
  <div>
    <Navbar />
    <div class="page-container">
      <div class="page-header">
        <p class="page-eyebrow">KONTO</p>
        <h1 class="page-title">Einstellungen</h1>
      </div>

      <div class="card settings-card">
        <h2 class="card-title">PASSWORT ÄNDERN</h2>

        <form @submit.prevent="changePassword" class="settings-form">
          <div class="form-group">
            <label class="form-label">Aktuelles Passwort</label>
            <input
              type="password"
              v-model="currentPassword"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Neues Passwort</label>
            <input
              type="password"
              v-model="newPassword"
              placeholder="Mindestens 6 Zeichen"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Neues Passwort bestätigen</label>
            <input
              type="password"
              v-model="confirmPassword"
              placeholder="••••••••"
              autocomplete="new-password"
              required
            />
          </div>

          <div v-if="error" class="error-box">{{ error }}</div>
          <div v-if="success" class="success-box">Passwort erfolgreich geändert.</div>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Speichern…' : 'PASSWORT ÄNDERN' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Navbar from '../components/Navbar.vue';
import api from '../api/axios';

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref(false);
const loading = ref(false);

async function changePassword() {
  error.value = '';
  success.value = false;

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Neue Passwörter stimmen nicht überein.';
    return;
  }

  if (newPassword.value.length < 6) {
    error.value = 'Neues Passwort muss mindestens 6 Zeichen haben.';
    return;
  }

  loading.value = true;
  try {
    await api.patch('/users/me/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });
    success.value = true;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    setTimeout(() => { success.value = false; }, 4000);
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Ändern des Passworts.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 32px;
}

.page-eyebrow {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.page-title {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.settings-card {
  max-width: 480px;
}

.card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--text-secondary);
  font-family: 'Inter', system-ui, sans-serif;
  margin-bottom: 24px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>
