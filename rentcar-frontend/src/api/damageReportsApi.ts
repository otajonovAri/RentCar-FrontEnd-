import api from './axiosInstance'
import type { DamageReportDto, CreateDamageReportDto, UpdateDamageReportDto, DamageReportsFilter } from '@/types/damageReports'
import type { PaginatedResponse } from '@/types/common'

export const damageReportsApi = {
  getAll: (params: DamageReportsFilter) =>
    api.get<PaginatedResponse<DamageReportDto>>('/api/damagereports', { params }),

  create: (data: CreateDamageReportDto) =>
    api.post<{ id: number }>('/api/damagereports', data),

  update: (id: number, data: UpdateDamageReportDto) =>
    api.patch<void>(`/api/damagereports/${id}`, data),
}
