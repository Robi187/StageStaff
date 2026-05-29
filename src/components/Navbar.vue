<template>
  <nav class="navbar">
    <div class="navbar-inner">
      <!-- Logo -->
      <router-link to="/schichten" class="nav-logo" @click="mobileOpen = false">
        Stage Bar
        <span class="nav-logo-sub">Mitarbeiter-Portal</span>
      </router-link>

      <!-- Desktop nav links -->
      <div class="nav-links desktop-only">
        <router-link to="/schichten" class="nav-link" :class="{ 'nav-link--active': isSchichtenActive }">
          Schichten
        </router-link>
        <router-link v-if="auth.isAdmin" to="/admin" class="nav-link" :class="{ 'nav-link--active': isAdminActive }">
          Admin
        </router-link>
      </div>

      <!-- Desktop user menu -->
      <div class="nav-user desktop-only" ref="userMenuRef">
        <button class="nav-avatar-btn" @click="toggleMenu">
          <div class="avatar">{{ userInitial }}</div>
          <span class="nav-user-name">{{ auth.user?.name }}</span>
          <svg class="chevron" :class="{ 'chevron--open': menuOpen }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <transition name="dropdown">
          <div v-if="menuOpen" class="dropdown">
            <router-link to="/einstellungen" class="dropdown-item" @click="menuOpen = false">
              Einstellungen
            </router-link>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item dropdown-item--danger" @click="handleLogout">
              Abmelden
            </button>
          </div>
        </transition>
      </div>

      <!-- Mobile hamburger -->
      <button class="hamburger mobile-only" @click="mobileOpen = !mobileOpen" :class="{ 'hamburger--open': mobileOpen }">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mobile menu -->
    <transition name="slide">
      <div v-if="mobileOpen" class="mobile-menu">
        <router-link to="/schichten" class="mobile-link" :class="{ 'mobile-link--active': isSchichtenActive }" @click="mobileOpen = false">
          Schichten
        </router-link>
        <router-link v-if="auth.isAdmin" to="/admin" class="mobile-link" :class="{ 'mobile-link--active': isAdminActive }" @click="mobileOpen = false">
          Admin
        </router-link>
        <router-link to="/einstellungen" class="mobile-link" @click="mobileOpen = false">
          Einstellungen
        </router-link>
        <div class="mobile-divider"></div>
        <div class="mobile-user">
          <div class="avatar">{{ userInitial }}</div>
          <span class="mobile-user-name">{{ auth.user?.name }}</span>
        </div>
        <button class="mobile-logout" @click="handleLogout">Abmelden</button>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const isSchichtenActive = computed(() => route.path.startsWith('/schichten') && route.query.from !== 'admin');
const isAdminActive = computed(() => route.path.startsWith('/admin') || route.query.from === 'admin');

const menuOpen = ref(false);
const mobileOpen = ref(false);
const userMenuRef = ref(null);

const userInitial = computed(() => auth.user?.name?.[0]?.toUpperCase() || '?');

function toggleMenu() { menuOpen.value = !menuOpen.value; }

function handleLogout() {
  menuOpen.value = false;
  mobileOpen.value = false;
  auth.logout();
  router.push('/login');
}

function handleOutsideClick(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick));
onUnmounted(() => document.removeEventListener('click', handleOutsideClick));
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(29, 26, 38, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  height: 64px;
}

.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 28px;
}

/* Logo */
.nav-logo {
  font-family: 'Bodoni Moda', Georgia, serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--gold);
  text-decoration: none;
  letter-spacing: 0.04em;
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  flex-shrink: 0;
}

.nav-logo:hover { color: var(--gold); text-decoration: none; opacity: 0.85; }

.nav-logo-sub {
  font-family: 'Raleway', system-ui, sans-serif;
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #2E2840;
  margin-top: 1px;
}

/* Desktop nav links */
.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  justify-content: center;
}

.nav-link {
  font-family: 'Raleway', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5E5670;
  text-decoration: none;
  padding: 7px 16px;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover {
  color: var(--text);
  background: var(--gold-glow);
  text-decoration: none;
  opacity: 1;
}

.nav-link--active { color: var(--gold); }

/* User section */
.nav-user { position: relative; flex-shrink: 0; }

.nav-avatar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.15s;
  width: auto;
}

.nav-avatar-btn:hover { background: var(--gold-glow); opacity: 1; transform: none; }

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2A2438, #1E1B2C);
  border: 1px solid var(--gold-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--gold);
  flex-shrink: 0;
  font-family: 'Raleway', system-ui, sans-serif;
}

.nav-user-name {
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: var(--muted);
  transition: transform 0.2s;
}
.chevron--open { transform: rotate(180deg); }

/* Dropdown */
.dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 180px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 18px;
  font-family: 'Raleway', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  text-decoration: none;
  background: transparent;
  border: none;
  border-radius: 0;
  text-align: left;
  cursor: pointer;
  letter-spacing: 0;
  transition: background 0.15s, color 0.15s;
}

.dropdown-item:hover {
  background: var(--gold-glow);
  color: var(--gold);
  opacity: 1;
  transform: none;
}

.dropdown-item--danger { color: var(--error-dot); }
.dropdown-item--danger:hover { background: rgba(248, 113, 113, 0.08); color: var(--error-dot); }

.dropdown-divider { height: 1px; background: var(--border); margin: 2px 0; }

/* Hamburger */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
  margin-left: auto;
}

.hamburger:hover { background: var(--gold-glow); opacity: 1; transform: none; }

.hamburger span {
  display: block;
  width: 100%;
  height: 2.5px;
  background: #C8B99A;
  border-radius: 2px;
  transition: transform 0.2s, opacity 0.2s;
  transform-origin: center;
}

.hamburger--open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.hamburger--open span:nth-child(2) { opacity: 0; }
.hamburger--open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

/* Mobile menu */
.mobile-menu {
  background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 12px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 150;
}

.mobile-link {
  font-family: 'Raleway', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
  padding: 12px 14px;
  border-radius: 10px;
  transition: color 0.15s, background 0.15s;
}

.mobile-link:hover { color: var(--gold); background: var(--gold-glow); text-decoration: none; opacity: 1; }
.mobile-link--active { color: var(--gold); }

.mobile-divider { height: 1px; background: var(--border); margin: 10px 0; }

.mobile-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
}

.mobile-user-name {
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
}

.mobile-logout {
  background: transparent;
  border: none;
  color: var(--error-dot);
  font-family: 'Raleway', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  width: auto;
  border-radius: 10px;
  transition: background 0.15s;
}

.mobile-logout:hover { background: rgba(248, 113, 113, 0.08); opacity: 1; }

/* Transitions */
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Responsive */
.desktop-only { display: flex; }
.mobile-only  { display: none; }

@media (max-width: 640px) {
  .desktop-only { display: none !important; }
  .mobile-only  { display: flex !important; }
  .navbar-inner { padding: 0 16px; }
}
</style>
