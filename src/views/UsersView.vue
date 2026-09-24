<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import http from '@/lib/http'
import { roleLabel } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, ApiResource, User, UserRole } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const highlight = useHighlight()
const users = ref<User[]>([])
const loading = ref(true)
const errorMessage = ref('')
const formError = ref('')
const showForm = ref(false)
const saving = ref(false)
const busyId = ref<number | null>(null)
const searchInput = ref('')
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'staff' as UserRole,
})

const filteredUsers = computed(() => {
  const query = searchInput.value.trim().toLowerCase()

  if (!query) {
    return users.value
  }

  return users.value.filter((user) =>
    [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(query)),
  )
})

async function loadUsers(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await http.get<ApiPaginated<User>>('/api/v1/users')
    users.value = data.data
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load staff.')
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = 'staff'
}

async function createUser(): Promise<void> {
  formError.value = ''
  saving.value = true

  try {
    const { data } = await http.post<ApiResource<User>>('/api/v1/users', form)
    resetForm()
    showForm.value = false
    users.value = [data.data, ...users.value]
    highlight.flash(data.data.id)
    toast.push('Staff created')
  } catch (error) {
    formError.value = friendlyApiError(error, 'Unable to create staff.')
  } finally {
    saving.value = false
  }
}

async function toggleActive(user: User): Promise<void> {
  busyId.value = user.id

  try {
    const path = user.is_active ? 'deactivate' : 'activate'
    const { data } = await http.post<ApiResource<User>>(`/api/v1/users/${user.id}/${path}`)
    users.value = users.value.map((item) => (item.id === user.id ? data.data : item))
    highlight.flash(user.id)
    toast.push(user.is_active ? 'Staff deactivated' : 'Staff activated')
  } catch (error) {
    toast.push(friendlyApiError(error, 'Unable to update staff.'), 'error')
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <section class="lf-page">
    <PageHeader title="Staff" description="Manage your team and workspace access.">
      <template #actions>
        <AppButton @click="showForm = true">
          <Plus :size="16" :stroke-width="1.75" />
          Add staff
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-3">
      <SearchInput id="staff-search" v-model="searchInput" placeholder="Search staff..." label="Search staff" class="max-w-md" />
    </div>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load staff" :message="errorMessage" @retry="loadUsers" />
    <EmptyState v-else-if="filteredUsers.length === 0" title="No staff found" description="Create a staff or manager account to get started." />

    <div v-else class="lf-table-wrap">
      <table class="lf-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'lf-highlight': highlight.has(user.id) }">
            <td>
              <div class="flex items-center gap-3">
                <AppAvatar :name="user.name" size="sm" />
                <p class="font-medium text-lf-ink">{{ user.name }}</p>
              </div>
            </td>
            <td class="text-lf-muted">{{ user.email }}</td>
            <td><AppBadge>{{ roleLabel(user.role) }}</AppBadge></td>
            <td>
              <AppBadge :tone="user.is_active ? 'success' : 'neutral'">
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </AppBadge>
            </td>
            <td>
              <AppButton
                v-if="user.role !== 'administrator' && user.id !== auth.user?.id"
                :variant="user.is_active ? 'danger' : 'secondary'"
                :loading="busyId === user.id"
                @click="toggleActive(user)"
              >
                {{ user.is_active ? 'Deactivate' : 'Activate' }}
              </AppButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppDrawer
      :open="showForm"
      title="Add staff"
      description="Create a staff or manager account. Backend authorization remains authoritative."
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="createUser">
        <div class="lf-field">
          <label class="lf-label" for="staff-name">Name</label>
          <input id="staff-name" v-model="form.name" required class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="staff-email">Email</label>
          <input id="staff-email" v-model="form.email" type="email" required class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="staff-password">Password</label>
          <input id="staff-password" v-model="form.password" type="password" required minlength="8" class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="staff-role">Role</label>
          <select id="staff-role" v-model="form.role" class="lf-control">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <p v-if="formError" class="min-h-5 text-sm text-lf-danger">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="showForm = false">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ saving ? 'Creating...' : 'Create staff' }}</AppButton>
        </div>
      </form>
    </AppDrawer>
  </section>
</template>
