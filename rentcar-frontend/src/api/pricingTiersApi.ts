import api from './axiosInstance'
import type { PricingTierDto, CreatePricingTierDto } from '@/types/pricingTiers'

export const pricingTiersApi = {
  getAll: (params?: { carId?: number; categoryId?: number; activeOnly?: boolean }) =>
    api.get<PricingTierDto[]>('/api/pricingtiers', { params }),

  create: (data: CreatePricingTierDto) =>
    api.post<{ id: number }>('/api/pricingtiers', data),

  update: (id: number, data: Partial<CreatePricingTierDto>) =>
    api.put<void>(`/api/pricingtiers/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/pricingtiers/${id}`),
}
