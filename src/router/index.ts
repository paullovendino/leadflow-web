import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/public/LandingView.vue'),
      meta: { public: true, title: 'LeadFlow — Turn inquiries into appointments' },
    },
    {
      path: '/admin',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true, title: 'LeadFlow — Admin' },
    },
    {
      path: '/login',
      redirect: '/admin',
    },
    {
      path: '/dashboard',
      redirect: '/admin/dashboard',
    },
    {
      path: '/leads/:id?',
      redirect: (to) => `/admin/leads${to.params.id ? `/${to.params.id}` : ''}`,
    },
    {
      path: '/pipeline',
      redirect: '/admin/pipeline',
    },
    {
      path: '/customers/:id?',
      redirect: (to) => `/admin/customers${to.params.id ? `/${to.params.id}` : ''}`,
    },
    {
      path: '/appointments/:id?',
      redirect: (to) => `/admin/appointments${to.params.id ? `/${to.params.id}` : ''}`,
    },
    {
      path: '/services',
      redirect: '/admin/services',
    },
    {
      path: '/availability',
      redirect: '/admin/availability',
    },
    {
      path: '/users',
      redirect: '/admin/staff',
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/HomeView.vue'),
          meta: { title: 'LeadFlow — Dashboard' },
        },
        {
          path: 'staff',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { roles: ['administrator', 'manager'], title: 'LeadFlow — Staff' },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/ServicesView.vue'),
          meta: { title: 'LeadFlow — Services' },
        },
        {
          path: 'availability',
          name: 'availability',
          component: () => import('@/views/AvailabilityView.vue'),
          meta: { title: 'LeadFlow — Availability' },
        },
        {
          path: 'leads',
          name: 'leads',
          component: () => import('@/views/LeadsView.vue'),
          meta: { title: 'LeadFlow — Leads' },
        },
        {
          path: 'leads/:id',
          name: 'lead-detail',
          component: () => import('@/views/LeadDetailView.vue'),
          meta: { title: 'LeadFlow — Lead' },
        },
        {
          path: 'pipeline',
          name: 'pipeline',
          component: () => import('@/views/PipelineView.vue'),
          meta: { title: 'LeadFlow — Pipeline' },
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/CustomersView.vue'),
          meta: { title: 'LeadFlow — Customers' },
        },
        {
          path: 'customers/:id',
          name: 'customer-detail',
          component: () => import('@/views/CustomerDetailView.vue'),
          meta: { title: 'LeadFlow — Customer' },
        },
        {
          path: 'appointments',
          name: 'appointments',
          component: () => import('@/views/AppointmentsView.vue'),
          meta: { title: 'LeadFlow — Appointments' },
        },
        {
          path: 'appointments/:id',
          name: 'appointment-detail',
          component: () => import('@/views/AppointmentDetailView.vue'),
          meta: { title: 'LeadFlow — Appointment' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.matched.some((record) => record.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  const roles = to.meta.roles
  if (Array.isArray(roles) && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = [...to.matched]
    .reverse()
    .find((record) => typeof record.meta.title === 'string')?.meta.title

  document.title = typeof title === 'string' ? title : 'LeadFlow'
})

export default router
