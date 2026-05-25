export type OwnerPayoutStatus = 'Pending' | 'Paid' | 'Cancelled'

export interface OwnerPayoutDto {
  id: number
  ownerId: number
  ownerName: string
  carId: number
  carPlate: string
  rentalId: number
  rentalTotalAmount: number
  ownerRevenuePercent: number
  payoutAmount: number
  status: OwnerPayoutStatus
  paidAt: string | null
  transactionId: string | null
  notes: string | null
  createdAt: string
}

export interface CreatePayoutDto {
  rentalId: number
}

export interface MarkPaidDto {
  transactionId: string
}

export interface PayoutsFilter {
  ownerId?: number
  status?: OwnerPayoutStatus
  page: number
  pageSize: number
}
