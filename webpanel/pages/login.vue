<template>
  <div class="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8">
    <div class="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
      <div>
        <h2 class="text-center text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
          Anmelden
        </h2>
      </div>
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">E-Mail</label>
            <input
              id="email"
              v-model="form.email"
              name="email"
              type="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="E-Mail"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Passwort</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="Passwort"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span v-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { login } = useAuth()
const isLoading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: ''
})

const handleSubmit = async () => {
  if (isLoading.value) return

  error.value = ''
  isLoading.value = true

  try {
    if (!form.email || !form.password) {
      error.value = 'Bitte füllen Sie alle Felder aus.'
      return
    }

    // Validiere Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      error.value = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
      return
    }

    const success = await login(form.email, form.password)
    if (!success) {
      error.value = 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.'
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  } finally {
    isLoading.value = false
  }
}
</script> 