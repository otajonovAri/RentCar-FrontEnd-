import api from './axiosInstance'
import type { LookupItem } from '@/types/lookups'

export const carFeaturesApi = {
  getAll: () =>
    api.get<LookupItem[]>('/api/carfeatures'),

  create: (name: string) =>
    api.post<{ id: number }>('/api/carfeatures', { name }),

  update: (id: number, name: string) =>
    api.put<void>(`/api/carfeatures/${id}`, { id, name }),

  delete: (id: number) =>
    api.delete<void>(`/api/carfeatures/${id}`),
}
