import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http, { ensureCsrfCookie } from '@/lib/http'
import type { ApiMessage, ApiResource, User } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function fetchUser(): Promise<User | null> {
    try {
      const { data } = await http.get<ApiResource<User>>('/api/v1/auth/user')
      user.value = data.data
      return user.value
    } catch {
      user.value = null
      return null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string): Promise<User> {
    loading.value = true

    try {
      await ensureCsrfCookie()
      const { data } = await http.post<ApiResource<User>>('/api/v1/auth/login', {
        email,
        password,
      })
      user.value = data.data
      initialized.value = true
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true

    try {
      await ensureCsrfCookie()
      await http.post<ApiMessage>('/api/v1/auth/logout')
    } finally {
      user.value = null
      loading.value = false
    }
  }

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    fetchUser,
    login,
    logout,
  }
})
