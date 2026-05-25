export type CarStatus = 'Available' | 'Rented' | 'Maintenance' | 'Reserved' | 'Inactive'

// GET response uchun string (backend JsonStringEnumConverter ishlatsa)
export type TransmissionType = 'Manual' | 'Automatic' | 'SemiAutomatic'

// POST/PUT uchun integer enum — backend qiymatlari: 1=Manual, 2=Automatic, 3=SemiAutomatic
export const TRANSMISSION_INT: Record<TransmissionType, number> = {
  Manual:        1,
  Automatic:     2,
  SemiAutomatic: 3,
}
export const TRANSMISSION_LABEL: Record<TransmissionType | string, string> = {
  Manual:        'Mexanik',
  Automatic:     'Avtomat',
  SemiAutomatic: 'Yarim avtomat',
  '1': 'Mexanik',
  '2': 'Avtomat',
  '3': 'Yarim avtomat',
}

export interface CarListItemDto {
  id: number
  brand: string
  model: string
  year: number
  licensePlate: string
  color: string
  dailyRate: number
  status: CarStatus
  categoryName: string
  branchName: string
  mainImageUrl: string | null
  brandLogoUrl: string | null
  seatCount: number
  transmissionType: TransmissionType
}

export interface CarImage {
  id: number
  carId: number
  url: string
  isMain: boolean
  displayOrder: number
  altText: string | null
}

// Backend GET /api/cars/{id} response — standalone (does NOT extend CarListItemDto)
export interface CarDetailDto {
  id: number
  brand: string
  model: string
  year: number
  licensePlate: string
  color: string
  category: string
  fuelType: string
  transmissionType: TransmissionType
  seatCount: number
  mileage: number
  dailyRate: number
  status: CarStatus
  description: string | null
  branchName: string
  branchCity: string
  isOwnerListed: boolean
  ownerRevenuePercent: number | null
  features: string[]
  imageUrls: string[]
  brandLogoUrl: string | null
}

export interface CreateCarDto {
  brandId: number
  modelId: number
  categoryId: number
  fuelTypeId: number
  branchId: number
  year: number
  licensePlate: string
  color: string
  seatCount: number
  mileage: number
  transmissionType: number   // integer enum: 0=Manual, 1=Automatic, 2=SemiAutomatic
  dailyRate: number
  description?: string | null
  featureIds: number[]
}

export interface UpdateCarDto {
  color?: string
  mileage?: number
  dailyRate?: number
  description?: string | null
  branchId?: number
}

export interface AddCarImageDto {
  imageUrl: string
  isMain: boolean
  displayOrder: number
  altText?: string | null
}

export interface CarsFilter {
  page: number
  pageSize: number
  search?: string
  brandId?: number
  modelId?: number
  categoryId?: number
  branchId?: number
  minPrice?: number
  maxPrice?: number
  status?: CarStatus
}
