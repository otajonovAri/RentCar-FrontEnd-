/**
 * reportsApi — fayl yuklab olish endpointlari
 *
 * responseType: 'blob' muhim! Axios JSON emas, binary data qaytaradi.
 * Fayl nomi Content-Disposition headerdan olinadi, aks holda fallback ishlatiladi.
 */
import api from './axiosInstance'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RentalReportParams {
  fromDate?: string   // 'YYYY-MM-DD'
  toDate?:   string
  status?:   string   // 'Active' | 'Completed' | 'Pending' | 'Cancelled'
}

export interface PaymentReportParams {
  fromDate?: string
  toDate?:   string
  status?:   string   // 'Pending' | 'Paid' | 'Failed' | 'Refunded'
}

export interface OwnerIncomeParams {
  fromDate?: string
  toDate?:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Content-Disposition headerdan fayl nomini ajratib oladi.
 * Agar header bo'lmasa — fallback nomni qaytaradi.
 */
function getFilename(
  headers: Record<string, unknown>,
  fallback: string,
): string {
  const cd = headers['content-disposition'] as string | undefined
  if (!cd) return fallback

  // RFC 5987 (UTF-8 encoded filename*)
  const utf8Match = cd.match(/filename\*=UTF-8''([^;\s]+)/i)
  if (utf8Match) return decodeURIComponent(utf8Match[1])

  // Simple filename=""
  const simpleMatch = cd.match(/filename=["']?([^"';\r\n]+)["']?/i)
  if (simpleMatch) return simpleMatch[1].trim()

  return fallback
}

/** Blob'dan brauzerda fayl yuklab olishni ishga tushiradi */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ── API ───────────────────────────────────────────────────────────────────────

export const reportsApi = {

  /**
   * Ijaralar PDF hisoboti
   * GET /api/reports/rentals/pdf?fromDate=&toDate=&status=
   * Response: application/pdf (blob)
   */
  downloadRentalsPdf: async (params: RentalReportParams): Promise<void> => {
    const today    = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fallback = `ijaralar_${today}.pdf`

    const res = await api.get<Blob>('/api/reports/rentals/pdf', {
      params,
      responseType: 'blob',
    })

    triggerDownload(
      res.data,
      getFilename(res.headers as Record<string, unknown>, fallback),
    )
  },

  /**
   * To'lovlar Excel hisoboti
   * GET /api/reports/payments/excel?fromDate=&toDate=&status=
   * Response: .xlsx (blob)
   */
  downloadPaymentsExcel: async (params: PaymentReportParams): Promise<void> => {
    const today    = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fallback = `toylovlar_${today}.xlsx`

    const res = await api.get<Blob>('/api/reports/payments/excel', {
      params,
      responseType: 'blob',
    })

    triggerDownload(
      res.data,
      getFilename(res.headers as Record<string, unknown>, fallback),
    )
  },

  /**
   * Owner daromad Excel hisoboti
   * GET /api/reports/owners/{ownerId}/income/excel?fromDate=&toDate=
   * Response: .xlsx (blob) — "Umumiy" + har mashina uchun varaq
   */
  downloadOwnerIncomeExcel: async (
    ownerId: number,
    params:  OwnerIncomeParams,
  ): Promise<void> => {
    const today    = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fallback = `daromad_owner${ownerId}_${today}.xlsx`

    const res = await api.get<Blob>(
      `/api/reports/owners/${ownerId}/income/excel`,
      { params, responseType: 'blob' },
    )

    triggerDownload(
      res.data,
      getFilename(res.headers as Record<string, unknown>, fallback),
    )
  },
}
