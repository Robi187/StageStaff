import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/axios';
import { useAppCache } from './appCache';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  function setAuth(newToken, newUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    useAppCache().invalidatePattern('');
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.token, data.user);
    return data;
  }

  async function register(inviteToken, name, email, password) {
    const { data } = await api.post('/auth/register', { token: inviteToken, name, email, password });
    setAuth(data.token, data.user);
    return data;
  }

  return { token, user, isAuthenticated, isAdmin, login, logout, register };
});
