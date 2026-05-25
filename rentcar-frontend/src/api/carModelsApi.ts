import api from './axiosInstance'
import type { CarModelDto, CreateCarModelDto } from '@/types/brands'
import type { PaginatedResponse } from '@/types/common'

export const carModelsApi = {
  getAll: (params?: { brandId?: number; search?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<CarModelDto>>('/api/carmodels', { params }),

  create: (data: CreateCarModelDto) =>
    api.post<{ id: number }>('/api/carmodels', data),

  update: (id: number, name: string) =>
    api.put<void>(`/api/carmodels/${id}`, { name }),

  delete: (id: number) =>
    api.delete<void>(`/api/carmodels/${id}`),
}
