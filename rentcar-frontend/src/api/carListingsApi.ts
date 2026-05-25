import api from './axiosInstance'
import type { CarListingDto, CreateCarListingDto, ApproveListingDto, RejectListingDto, ListingsFilter } from '@/types/carListings'
import type { PaginatedResponse } from '@/types/common'

export const carListingsApi = {
  getAll: (params: ListingsFilter) =>
    api.get<PaginatedResponse<CarListingDto>>('/api/carlistings', { params }),

  create: (data: CreateCarListingDto) =>
    api.post<{ id: number }>('/api/carlistings', data),

  approve: (id: number, data: ApproveListingDto) =>
    api.patch<{ carId: number }>(`/api/carlistings/${id}/approve`, data),

  reject: (id: number, data: RejectListingDto) =>
    api.patch<void>(`/api/carlistings/${id}/reject`, data),
}
