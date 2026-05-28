import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types/auth'
import { signalRService } from '@/services/signalRService'

interface AuthState {
  accessToken:  string | null
  refreshToken: string | null
  userId:       number | null
  fullName:     string | null
  email:        string | null
  role:         UserRole | null
  avatarUrl:    string | null
  isAuthenticated: boolean

  setAuth: (payload: {
    accessToken:  string
    refreshToken: string
    userId:       number
    fullName:     string
    email:        string
    role:         UserRole
    avatarUrl?:   string | null
  }) => void

  /** Only update tokens (used by silent refresh in axiosInstance) */
  updateTokens: (accessToken: string, refreshToken: string) => void

  /** Update avatar after profile upload */
  updateAvatar: (avatarUrl: string | null) => void

  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:     null,
      refreshToken:    null,
      userId:          null,
      fullName:        null,
      email:           null,
      role:            null,
      avatarUrl:       null,
      isAuthenticated: false,

      setAuth: (payload) => {
        localStorage.setItem('accessToken',  payload.accessToken)
        localStorage.setItem('refreshToken', payload.refreshToken)
        set({
          accessToken:     payload.accessToken,
          refreshToken:    payload.refreshToken,
          userId:          payload.userId,
          fullName:        payload.fullName,
          email:           payload.email,
          role:            payload.role,
          avatarUrl:       payload.avatarUrl ?? null,
          isAuthenticated: true,
        })
        // SignalR'ga ulanish (token factory localStorage'dan oladi)
        signalRService.connect().catch(() => {})
      },

      updateTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken',  accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken, refreshToken })
      },

      updateAvatar: (avatarUrl) => {
        set({ avatarUrl })
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        // SignalR ulanishini uzish
        signalRService.disconnect().catch(() => {})

        try {
          import('@/api/axiosInstance').then(({ default: api }) => {
            delete api.defaults.headers.common['Authorization']
          }).catch(() => {})
        } catch {/* non-critical */}

        set({
          accessToken:     null,
          refreshToken:    null,
          userId:          null,
          fullName:        null,
          email:           null,
          role:            null,
          avatarUrl:       null,
          isAuthenticated: false,
        })
      },

      hasRole: (roles) => {
        const role = get().role
        return role !== null && roles.includes(role)
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        userId:          state.userId,
        fullName:        state.fullName,
        email:           state.email,
        role:            state.role,
        avatarUrl:       state.avatarUrl,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
