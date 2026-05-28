// Backend PaymentMethod enum: Cash=1, CreditCard=2, DebitCard=3, BankTransfer=4, Online=5, Click=6, Payme=7
export type PaymentMethod = 'Cash' | 'CreditCard' | 'DebitCard' | 'BankTransfer' | 'Online' | 'Click' | 'Payme'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded'

export interface PaymentDto {
  id:              number
  rentalId:        number
  amount:          number
  method:          PaymentMethod
  status:          PaymentStatus
  transactionId:   string | null
  externalOrderId: string | null
  createdAt:       string
  paidAt:          string | null
  refundedAt:      string | null
  refundReason:    string | null
}

export interface PendingPaymentDto {
  paymentId:    number
  rentalId:     number
  customerName: string
  carInfo:      string
  amount:       number
  method:       string
  proofUrl:     string | null
  createdAt:    string
}

export interface CreatePaymentDto {
  rentalId:          number
  method:            PaymentMethod
  transactionId?:    string | null
  requiresApproval?: boolean
}

export interface InitiatePaymentDto {
  rentalId: number
  method:   'Payme' | 'Click'
}

export interface InitiatePaymentResponse {
  paymentId:   number
  redirectUrl: string
}

export interface RefundPaymentDto {
  reason: string
}
