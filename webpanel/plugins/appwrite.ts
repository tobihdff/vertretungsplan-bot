import { Client, Account } from 'appwrite'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((_nuxtApp) => {
  const config = useRuntimeConfig()

  const client = new Client()
    .setEndpoint(config.public.appwriteEndpoint)
    .setProject(config.public.appwriteProjectId)

  const account = new Account(client)

  return {
    provide: {
      appwrite: client,
      account: account
    }
  }
}) 