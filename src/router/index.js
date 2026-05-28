import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', redirect: '/schichten' },
  { path: '/login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('../views/Register.vue'), meta: { guest: true } },
  { path: '/schichten', component: () => import('../views/Schichten.vue'), meta: { requiresAuth: true } },
  { path: '/schichten/:year/:month', component: () => import('../views/MonthView.vue'), meta: { requiresAuth: true } },
  { path: '/schichten/:occurrenceId', component: () => import('../views/OccurrenceDetail.vue'), meta: { requiresAuth: true } },
  { path: '/admin', component: () => import('../views/Admin.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/einstellungen', component: () => import('../views/Einstellungen.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/schichten' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login');
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/schichten');
  } else if (to.meta.requiresAdmin && !auth.isAdmin) {
    next('/schichten');
  } else {
    next();
  }
});

export default router;
