import type { UserRole } from './auth'

export interface UserDto {
  id: number
  fullName: string
  email: string
  phoneNumber: string
  role: UserRole
  dateOfBirth: string | null
  address: string | null
  licenseNumber: string | null
  avatarUrl: string | null
  emailConfirmed: boolean
  lastActive: string | null
  createdAt: string
  // Block info
  isBlocked: boolean
  blockReason: string | null
  blockedAt: string | null
  blockedUntil: string | null
  // Telegram
  telegramId: number | null
  telegramUsername: string | null
}

export interface UpdateProfileDto {
  firstName: string
  lastName: string
  middleName?: string | null
  phoneNumber: string
  address?: string | null
  dateOfBirth: string
  avatarUrl?: string | null
}

export interface UpdateLicenseDto {
  licenseNumber: string
  licenseExpirationDate: string
  driverLicenseImageUrl?: string | null
}

export interface UpdateRoleDto {
  role: UserRole
}

export interface BlockUserDto {
  reason: string
  blockedUntil?: string | null
}

export interface UsersFilter {
  page: number
  pageSize: number
  search?: string
  role?: UserRole
  isBlocked?: boolean
}

// ── Account Deletion ──────────────────────────────────────────────────────────
export interface DeletionBlockingInfoDto {
  canDelete: boolean
  activeRentalsCount: number
  pendingReservationsCount: number
  unpaidFinesCount: number
  unpaidFinesAmount: number
}

export interface AccountDeletionRequestDto {
  id: number
  userId: number
  userFullName: string
  userEmail: string
  status: string
  requestedAt: string
  processedAt: string | null
  processedByName: string | null
  rejectionReason: string | null
}

// ── Full History ──────────────────────────────────────────────────────────────
export interface RentalHistoryItemDto {
  id: number
  carBrand: string
  carModel: string
  licensePlate: string
  startDate: string
  endDate: string
  actualReturnDate: string | null
  totalDays: number
  totalAmount: number
  status: string
  pickupBranch: string
  returnBranch: string | null
  paymentStatus: string | null
  paidAmount: number | null
  fineCount: number
  totalFineAmount: number
  createdAt: string
}

export interface ReservationHistoryItemDto {
  id: number
  carBrand: string
  carModel: string
  licensePlate: string
  startDate: string
  endDate: string
  totalDays: number
  estimatedAmount: number | null
  status: string
  pickupBranch: string
  createdAt: string
}

export interface FineHistoryItemDto {
  id: number
  rentalId: number
  description: string
  amount: number
  status: string
  issuedDate: string
  paidDate: string | null
}

export interface PaymentHistoryItemDto {
  id: number
  rentalId: number
  amount: number
  paymentMethod: string
  status: string
  paidAt: string
}

export interface UserFullHistoryDto {
  userId: number
  fullName: string
  email: string
  phoneNumber: string
  role: string
  totalRentals: number
  activeRentals: number
  completedRentals: number
  totalSpent: number
  totalReservations: number
  pendingReservations: number
  totalFines: number
  unpaidFines: number
  totalFineAmount: number
  unpaidFineAmount: number
  rentals: RentalHistoryItemDto[]
  reservations: ReservationHistoryItemDto[]
  fines: FineHistoryItemDto[]
  payments: PaymentHistoryItemDto[]
  hasPendingDeletionRequest: boolean
  deletionRequestedAt: string | null
}
