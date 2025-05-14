import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
    const auth = useAuthStore()
    const publicRoutes = ['/login', '/register']

    // Check authentication status
    const isAuthenticated = await auth.checkAuth()

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && publicRoutes.includes(to.path)) {
        return navigateTo('/')
    }

    // Allow access to public routes
    if (publicRoutes.includes(to.path)) {
        return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return navigateTo('/login')
    }
}); 