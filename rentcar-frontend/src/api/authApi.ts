import api from './axiosInstance'
import type {
  AuthResponseDto,
  UserDto,
  LoginDto,
  RegisterDto,
  ConfirmEmailDto,
  ResendConfirmationDto,
  RefreshTokenDto,
} from '@/types/auth'

export const authApi = {
  register: (data: RegisterDto) =>
    api.post<{ message: string; email: string }>('/api/auth/register', data),

  confirmEmail: (data: ConfirmEmailDto) =>
    api.post<AuthResponseDto>('/api/auth/confirm-email', data),

  resendConfirmation: (data: ResendConfirmationDto) =>
    api.post<void>('/api/auth/resend-confirmation', data),

  login: (data: LoginDto) =>
    api.post<AuthResponseDto>('/api/auth/login', data),

  /** Google One Tap / Sign-In — ID token backend ga yuboriladi */
  googleLogin: (idToken: string) =>
    api.post<AuthResponseDto>('/api/auth/google', { idToken }),

  refreshToken: (data: RefreshTokenDto) =>
    api.post<AuthResponseDto>('/api/auth/refresh-token', data),

  me: () =>
    api.get<UserDto>('/api/auth/me'),

  /** Foydalanuvchini tizimdan chiqarish — refresh tokenni bekor qiladi */
  logout: () =>
    api.post<void>('/api/auth/logout'),
}
