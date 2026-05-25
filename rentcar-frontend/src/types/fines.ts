export type FineStatus = 'Unpaid' | 'Paid'

export interface FineDto {
  id: number
  rentalId: number
  customerName: string
  description: string
  amount: number
  status: FineStatus
  issuedDate: string
  paidDate: string | null
  issuedBy: string
  notes: string | null
}

export interface CreateFineDto {
  rentalId: number
  issuedByUserId: number
  description: string
  amount: number
  notes?: string | null
}

export interface FinesFilter {
  rentalId?: number
  userId?: number
  status?: FineStatus
  page: number
  pageSize: number
}
