import api from './axiosInstance'
import type { OwnerPayoutDto, CreatePayoutDto, MarkPaidDto, PayoutsFilter } from '@/types/ownerPayouts'
import type { PaginatedResponse } from '@/types/common'

export const ownerPayoutsApi = {
  getAll: (params: PayoutsFilter) =>
    api.get<PaginatedResponse<OwnerPayoutDto>>('/api/ownerpayouts', { params }),

  create: (data: CreatePayoutDto) =>
    api.post<{ id: number }>('/api/ownerpayouts', data),

  markPaid: (id: number, data: MarkPaidDto) =>
    api.patch<void>(`/api/ownerpayouts/${id}/mark-paid`, data),
}
