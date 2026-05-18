export interface AuthResponseDto {
  userId: number
  fullName: string
  email: string
  role: UserRole
  accessToken: string
  refreshToken: string
  accessTokenExpiry: string
}

/** Returned by GET /api/auth/me — same shape as users/UserDto */
export interface UserDto {
  id:             number
  fullName:       string
  email:          string
  phoneNumber:    string
  role:           UserRole
  dateOfBirth:    string | null
  address:        string | null
  licenseNumber:  string | null
  emailConfirmed: boolean
  lastActive:     string | null
  createdAt:      string
}

export type UserRole = 'Customer' | 'Owner' | 'Manager' | 'Admin' | 'SuperAdmin'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  firstName: string
  lastName: string
  middleName?: string | null
  email: string
  password: string
  phoneNumber: string
  dateOfBirth: string
}

export interface ConfirmEmailDto {
  email: string
  token: string
}

export interface ResendConfirmationDto {
  email: string
}

export interface RefreshTokenDto {
  accessToken: string
  refreshToken: string
}

export interface RegisterPendingDto {
  email: string
  message: string
  emailVerificationRequired: boolean
  botUsername?:  string   // Telegram bot username (@ belgisisiz)
  // Email service ishlamagan holda avtomatik login:
  userId?:       number
  fullName?:     string
  role?:         UserRole
  accessToken?:  string
  refreshToken?: string
}

export interface ApiError {
  status: number
  title: string
  detail?: string
  errors?: Record<string, string[]>
}
