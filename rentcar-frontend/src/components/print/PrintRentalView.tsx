/**
 * PrintRentalView — chop etish modali
 *
 * Foydalanish:
 *   <PrintRentalView rentalId={id} open={open} onClose={() => setOpen(false)} />
 *
 * "Chop etish" tugmasi → window.print() chaqiradi.
 * @media print CSS index.css'da yozilgan — faqat `.print-invoice` ko'rsatiladi.
 */
import { useEffect, useState } from 'react'
import { Modal, Button, Spin, Tag } from 'antd'
import { PrinterOutlined, CloseOutlined } from '@ant-design/icons'
import { rentalsApi } from '@/api/rentalsApi'
import type { RentalDto, RentalStatus } from '@/types/rentals'
import { format } from 'date-fns'

const fmt = (n: number) => n.toLocaleString('ru-RU')

const STATUS_LABEL: Record<RentalStatus, string> = {
  Pending:   '⏳ Kutilmoqda',
  Active:    '✅ Faol',
  Completed: '✔️ Yakunlangan',
  Cancelled: '❌ Bekor qilingan',
}

const STATUS_COLOR: Record<RentalStatus, string> = {
  Pending:   'gold',
  Active:    'green',
  Completed: 'blue',
  Cancelled: 'red',
}

interface Props {
  rentalId: number | null
  open:     boolean
  onClose:  () => void
}

export default function PrintRentalView({ rentalId, open, onClose }: Props) {
  const [rental,  setRental]  = useState<RentalDto | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !rentalId) { setRental(null); return }
    setLoading(true)
    rentalsApi.getById(rentalId)
      .then(r => setRental(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, rentalId])

  const handlePrint = () => window.print()

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PrinterOutlined style={{ color: '#1677ff' }} />
          Chop etish — Ijara #{rentalId}
        </div>
      }
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button icon={<CloseOutlined />} onClick={onClose} className="no-print">
            Yopish
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            disabled={!rental || loading}
            className="no-print"
            style={{ background: '#1677ff' }}
          >
            🖨️ Chop etish
          </Button>
        </div>
      }
      styles={{ body: { padding: '24px 28px' } }}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && !rental && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
          Ma'lumot topilmadi
        </div>
      )}

      {!loading && rental && (
        <div className="print-invoice">

          {/* ── Invoice header ────────────────────────────────────────── */}
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'flex-start',
            marginBottom:   20,
            paddingBottom:  16,
            borderBottom:   '2px solid #1677ff',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {/* Logo */}
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#1677ff"/>
                  <path d="M8 22 L16 10 L24 22" stroke="white" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="16" cy="10" r="2" fill="white"/>
                </svg>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#1677ff' }}>RentCar</span>
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>Ijara xizmatlari</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                HISOB-FAKTURA
              </div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                #{rental.id}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {format(new Date(rental.createdAt), 'dd.MM.yyyy HH:mm')}
              </div>
              <div style={{ marginTop: 6 }}>
                <Tag color={STATUS_COLOR[rental.status]}>
                  {STATUS_LABEL[rental.status]}
                </Tag>
              </div>
            </div>
          </div>

          {/* ── Customer & car info ───────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 20,
          }}>
            <InfoBlock title="Mijoz">
              <Row label="Ism-Familiya" val={rental.customerName} />
            </InfoBlock>

            <InfoBlock title="Avtomobil">
              <Row label="Marka / Model" val={`${rental.carBrand} ${rental.carModel}`} />
              <Row label="Davlat raqami"  val={rental.licensePlate} />
              {rental.driverName && <Row label="Haydovchi" val={rental.driverName} />}
            </InfoBlock>
          </div>

          {/* ── Rental period ─────────────────────────────────────────── */}
          <InfoBlock title="Ijara davri" style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Row label="Boshlanish"  val={format(new Date(rental.startDate), 'dd.MM.yyyy')} />
              <Row label="Tugash"      val={format(new Date(rental.endDate),   'dd.MM.yyyy')} />
              <Row label="Kunlar soni" val={`${rental.totalDays} kun`} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <Row label="Olib ketish"  val={rental.pickupBranch} />
              <Row label="Qaytarish"    val={rental.returnBranch ?? rental.pickupBranch} />
            </div>
          </InfoBlock>

          {/* ── Payment breakdown ─────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <thead>
              <tr style={{ background: '#f5f7ff' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left',  border: '1px solid #e0e0e0', fontSize: 12 }}>Tavsif</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontSize: 12 }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12 }}>
                  Asosiy ijara ({rental.totalDays} kun)
                </td>
                <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12, textAlign: 'right' }}>
                  {fmt(rental.baseAmount)} so'm
                </td>
              </tr>
              {rental.addonAmount > 0 && (
                <tr>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12 }}>
                    Qo'shimcha xizmatlar
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12, textAlign: 'right' }}>
                    +{fmt(rental.addonAmount)} so'm
                  </td>
                </tr>
              )}
              {rental.discountAmount > 0 && (
                <tr style={{ color: '#52c41a' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12 }}>
                    Chegirma {rental.promotionCode ? `(${rental.promotionCode})` : ''}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #e0e0e0', fontSize: 12, textAlign: 'right' }}>
                    -{fmt(rental.discountAmount)} so'm
                  </td>
                </tr>
              )}
              {/* Total row */}
              <tr style={{ background: '#f0f6ff' }}>
                <td style={{
                  padding: '10px 12px', border: '1px solid #1677ff',
                  fontSize: 14, fontWeight: 700, color: '#1677ff',
                }}>
                  JAMI TO'LOV
                </td>
                <td style={{
                  padding: '10px 12px', border: '1px solid #1677ff',
                  fontSize: 16, fontWeight: 800, color: '#1677ff', textAlign: 'right',
                }}>
                  {fmt(rental.totalAmount)} so'm
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {rental.notes && (
            <div style={{
              marginTop:    16,
              padding:      '10px 14px',
              borderRadius: 8,
              background:   '#fffbf0',
              border:       '1px solid #ffe58f',
              fontSize:     12,
              color:        '#7a5600',
            }}>
              📝 <strong>Izoh:</strong> {rental.notes}
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div style={{
            marginTop:    24,
            paddingTop:   16,
            borderTop:    '1px dashed #ccc',
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'flex-end',
          }}>
            <div style={{ fontSize: 10, color: '#aaa' }}>
              Chop etilgan: {format(new Date(), 'dd.MM.yyyy HH:mm')}
            </div>
            <div style={{ fontSize: 10, color: '#aaa', textAlign: 'right' }}>
              RentCar — Ijara boshqaruv tizimi<br/>
              Ushbu hujjat avtomatik tarzda yaratilgan
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function InfoBlock({
  title, children, style,
}: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: '1px solid #e0e7ff', borderRadius: 8, overflow: 'hidden', ...style,
    }}>
      <div style={{
        background: '#e8f0ff', padding: '6px 12px',
        fontSize: 11, fontWeight: 700, color: '#1677ff', letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#111', textAlign: 'right' }}>{val}</span>
    </div>
  )
}
