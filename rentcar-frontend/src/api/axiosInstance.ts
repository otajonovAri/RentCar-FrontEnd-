import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { AuthResponseDto, RefreshTokenDto } from '@/types/auth'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: inject Bearer token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Token refresh queue ───────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

// ── Response interceptor: handle 401 → refresh token ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const accessToken  = localStorage.getItem('accessToken')  ?? ''
      const refreshToken = localStorage.getItem('refreshToken') ?? ''

      const { data } = await axios.post<AuthResponseDto>(
        `${BASE_URL}/api/auth/refresh-token`,
        { accessToken, refreshToken } satisfies RefreshTokenDto,
      )

      // ── Persist new tokens ──────────────────────────────────────────────────
      localStorage.setItem('accessToken',  data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // ── Sync Zustand auth store (lazy import to avoid circular deps) ────────
      try {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().setAuth({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          userId:       data.userId,
          fullName:     data.fullName,
          email:        data.email,
          role:         data.role,
          avatarUrl:    data.avatarUrl ?? null,
        })
      } catch {
        // non-critical: tokens already persisted to localStorage above
      }

      api.defaults.headers.Authorization = `Bearer ${data.accessToken}`
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`

      processQueue(null, data.accessToken)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)

      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')

      // ── Clear Zustand store on refresh failure ──────────────────────────────
      try {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().logout()
      } catch {
        // best effort
      }

      // Hisob o'chirilgan bo'lsa — /register ga, aks holda /login ga
      const errDetail = (refreshError as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? ''
      if (errDetail.startsWith('ACCOUNT_DELETED|')) {
        window.location.href = '/register?reason=deleted'
      } else {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
