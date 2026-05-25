export type CarListingStatus = 'Pending' | 'Approved' | 'Rejected'

export interface CarListingDto {
  id:                  number
  ownerName:           string
  brand:               string
  model:               string
  year:                number
  licensePlate:        string
  color:               string
  requestedDailyRate:  number
  ownerRevenuePercent: number | null
  approvedDailyRate:   number | null   // Admin tasdiqlagan narx
  status:              CarListingStatus
  rejectionReason:     string | null
  adminNotes:          string | null   // Admin izohi
  carId:               number | null   // Tasdiqlangan Car ID
  createdAt:           string
}

export interface CreateCarListingDto {
  brandId: number
  modelId: number
  year: number
  color: string
  licensePlate: string
  mileage: number
  description?: string | null
  imageUrls?: string[]
  expectedDailyRate: number
}

export interface ApproveListingDto {
  branchId: number
  ownerRevenuePercent: number
  approvedDailyRate?: number | null
  adminNotes?: string | null
}

export interface RejectListingDto {
  rejectionReason: string
}

export interface ListingsFilter {
  page: number
  pageSize: number
  ownerId?: number
  status?: CarListingStatus
}
