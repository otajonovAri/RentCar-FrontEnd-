import api from './axiosInstance'
import type {
  UserDto, UpdateProfileDto, UpdateLicenseDto, UpdateRoleDto, BlockUserDto, UsersFilter,
  DeletionBlockingInfoDto, AccountDeletionRequestDto, UserFullHistoryDto
} from '@/types/users'
import type { PaginatedResponse } from '@/types/common'

export const usersApi = {
  getAll: (params: UsersFilter) =>
    api.get<PaginatedResponse<UserDto>>('/api/users', { params }),

  getById: (id: number) =>
    api.get<UserDto>(`/api/users/${id}`),

  updateProfile: (userId: number, data: UpdateProfileDto) =>
    api.put<void>(`/api/users/${userId}/profile`, data),

  updateLicense: (userId: number, data: UpdateLicenseDto) =>
    api.put<void>(`/api/users/${userId}/license`, data),

  updateRole: (userId: number, data: UpdateRoleDto) =>
    api.patch<void>(`/api/users/${userId}/role`, data),

  // ── SuperAdmin only ───────────────────────────────────────────────────────
  block: (userId: number, data: BlockUserDto) =>
    api.patch<void>(`/api/users/${userId}/block`, data),

  unblock: (userId: number) =>
    api.patch<void>(`/api/users/${userId}/unblock`),

  delete: (userId: number) =>
    api.delete<void>(`/api/users/${userId}`),

  getMyStatus: () =>
    api.get<{ userId: number; isBlocked: boolean; blockReason: string | null; blockedAt: string | null; blockedUntil: string | null }>('/api/users/my-status'),

  // ── Account Deletion ────────────────────────────────────────────────────────
  checkDeletionEligibility: () =>
    api.get<DeletionBlockingInfoDto>('/api/users/deletion-eligibility'),

  requestDeletion: () =>
    api.post<{ message: string }>('/api/users/request-deletion'),

  getFullHistory: (userId: number) =>
    api.get<UserFullHistoryDto>(`/api/users/${userId}/full-history`),

  getDeletionRequests: (status?: 'Pending' | 'Approved' | 'Rejected') =>
    api.get<AccountDeletionRequestDto[]>('/api/users/deletion-requests', { params: status ? { status } : undefined }),

  approveDeletion: (userId: number) =>
    api.patch<{ message: string }>(`/api/users/${userId}/approve-deletion`),

  rejectDeletion: (userId: number, reason: string) =>
    api.patch<{ message: string }>(`/api/users/${userId}/reject-deletion`, { reason }),
}
