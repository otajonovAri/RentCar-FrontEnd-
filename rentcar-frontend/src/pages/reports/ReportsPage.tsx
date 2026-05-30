import { useState } from 'react'
import { Button, Select, InputNumber, DatePicker, message, theme, Grid } from 'antd'
import {
  DownloadOutlined, FilePdfFilled, FileExcelFilled, BarChartOutlined,
  CrownFilled,
} from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import {
  reportsApi,
  type RentalReportParams, type PaymentReportParams, type OwnerIncomeParams,
} from '@/api/reportsApi'
import { getApiError } from '@/utils/apiError'

const { RangePicker } = DatePicker

type Range = [Dayjs | null, Dayjs | null] | null

// ── Status options ─────────────────────────────────────────────────────────────
const RENTAL_STATUSES = [
  { value: 'Active',    label: '✅ Faol'           },
  { value: 'Completed', label: '✔️ Yakunlangan'    },
  { value: 'Pending',   label: '⏳ Kutilmoqda'     },
  { value: 'Cancelled', label: '❌ Bekor qilingan' },
]
const PAYMENT_STATUSES = [
  { value: 'Paid',     label: "✅ To'langan"   },
  { value: 'Pending',  label: '⏳ Kutilmoqda'  },
  { value: 'Failed',   label: '❌ Xato'         },
  { value: 'Refunded', label: '🔄 Qaytarildi'  },
]

// ── Helper: dayjs range → { fromDate, toDate } ────────────────────────────────
const rangeToParams = (r: Range) => ({
  fromDate: r?.[0]?.format('YYYY-MM-DD') ?? undefined,
  toDate:   r?.[1]?.format('YYYY-MM-DD') ?? undefined,
})

// ── Component ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { token } = theme.useToken()
  const screens   = Grid.useBreakpoint()
  const isMobile  = !screens.md

  // ── Report 1: Ijaralar PDF ───────────────────────────────────────────────────
  const [r1Range,   setR1Range]   = useState<Range>(null)
  const [r1Status,  setR1Status]  = useState<string | undefined>()
  const [r1Loading, setR1Loading] = useState(false)

  // ── Report 2: To'lovlar Excel ────────────────────────────────────────────────
  const [r2Range,   setR2Range]   = useState<Range>(null)
  const [r2Status,  setR2Status]  = useState<string | undefined>()
  const [r2Loading, setR2Loading] = useState(false)

  // ── Report 3: Owner daromad Excel ────────────────────────────────────────────
  const [r3OwnerId, setR3OwnerId] = useState<number | null>(null)
  const [r3Range,   setR3Range]   = useState<Range>(null)
  const [r3Loading, setR3Loading] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRentalPdf = async () => {
    setR1Loading(true)
    try {
      const params: RentalReportParams = { ...rangeToParams(r1Range), status: r1Status }
      await reportsApi.downloadRentalsPdf(params)
      message.success('📄 PDF muvaffaqiyatli yuklab olindi!')
    } catch (err) {
      message.error(getApiError(err, 'PDF yaratishda xatolik yuz berdi'))
    } finally { setR1Loading(false) }
  }

  const handlePaymentExcel = async () => {
    setR2Loading(true)
    try {
      const params: PaymentReportParams = { ...rangeToParams(r2Range), status: r2Status }
      await reportsApi.downloadPaymentsExcel(params)
      message.success("📊 To'lovlar Excel yuklab olindi!")
    } catch (err) {
      message.error(getApiError(err, 'Excel yaratishda xatolik yuz berdi'))
    } finally { setR2Loading(false) }
  }

  const handleOwnerIncome = async () => {
    if (!r3OwnerId) { message.warning("Iltimos, Owner ID kiriting!"); return }
    setR3Loading(true)
    try {
      const params: OwnerIncomeParams = rangeToParams(r3Range)
      await reportsApi.downloadOwnerIncomeExcel(r3OwnerId, params)
      message.success('📊 Owner daromad Excel yuklab olindi!')
    } catch (err) {
      message.error(getApiError(err, 'Excel yaratishda xatolik yuz berdi'))
    } finally { setR3Loading(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const cols = isMobile ? 1 : !screens.xl ? 2 : 3

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 48 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   'linear-gradient(135deg, #0a1628 0%, #0d2d57 50%, #1677ff 100%)',
        padding:      isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {[{s:200,t:-70,r:-50,o:.07},{s:130,t:30,r:120,o:.05},{s:90,b:-25,l:60,o:.08}].map((c,i) => (
          <div key={i} style={{
            position:'absolute', borderRadius:'50%', background:'#fff',
            width:c.s, height:c.s, opacity:c.o,
            top:(c as {t?:number}).t, right:(c as {r?:number}).r,
            bottom:(c as {b?:number}).b, left:(c as {l?:number}).l,
          }}/>
        ))}

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{
            display:'flex', alignItems: isMobile ? 'flex-start' : 'center',
            gap:16, flexDirection: isMobile ? 'column' : 'row',
          }}>
            <div style={{
              width:56, height:56, borderRadius:14, flexShrink:0,
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <BarChartOutlined style={{ fontSize:28, color:'#fff' }}/>
            </div>

            <div style={{ flex:1 }}>
              <h1 style={{ margin:0, fontSize: isMobile ? 22 : 28, fontWeight:800, color:'#fff', lineHeight:1.2 }}>
                Hisobotlar va Eksport
              </h1>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'rgba(255,255,255,0.75)' }}>
                Ijaralar, to'lovlar va owner daromadlarini yuklab oling
              </p>
            </div>

            {/* Desktop chips */}
            {!isMobile && (
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { icon:'📄', label:'PDF hisobot'  },
                  { icon:'📊', label:'Excel eksport' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding:'8px 16px', borderRadius:12,
                    background:'rgba(255,255,255,0.12)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    color:'#fff', fontSize:13,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span style={{ fontSize:18 }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── INFO BANNER ───────────────────────────────────────────────────── */}
      <div style={{
        padding:      '12px 18px',
        borderRadius: 12,
        background:   'rgba(22,119,255,0.06)',
        border:       `1px solid rgba(22,119,255,0.2)`,
        fontSize:     13,
        color:        token.colorTextSecondary,
        marginBottom: 24,
        display:      'flex',
        alignItems:   'center',
        gap:          10,
      }}>
        <span style={{ fontSize:18 }}>💡</span>
        <div>
          <strong style={{ color: token.colorText }}>Sana filtri ixtiyoriy.</strong>
          {' '}Sana ko'rsatilmasa — barcha yozuvlar hisobotga kiritiladi.
          Status filtri ham ixtiyoriy — bo'sh qoldirilsa barcha statuslar qo'shiladi.
        </div>
      </div>

      {/* ── REPORT CARDS GRID ─────────────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap:                 isMobile ? 16 : 20,
      }}>

        {/* ── CARD 1: Ijaralar PDF ─────────────────────────────────────── */}
        <ReportCard
          icon={<FilePdfFilled style={{ fontSize:26, color:'#ff4d4f' }}/>}
          iconBg="linear-gradient(135deg, rgba(255,77,79,0.12), rgba(255,77,79,0.06))"
          iconBorder="rgba(255,77,79,0.2)"
          title="Ijaralar PDF"
          description="Ijaralar ro'yxatini PDF formatda yuklab oling. Sanalar va status bo'yicha filtrlash mumkin."
          badge="PDF"
          badgeColor="#ff4d4f"
          token={token}
        >
          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5 }}>
            Sana oralig'i
          </label>
          <RangePicker
            style={{ width:'100%' }}
            value={r1Range}
            onChange={v => setR1Range(v as Range)}
            format="DD.MM.YYYY"
            placeholder={['Boshlanish', 'Tugash']}
            allowClear
          />

          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5, marginTop:4 }}>
            Status (ixtiyoriy)
          </label>
          <Select
            style={{ width:'100%' }}
            placeholder="Barcha statuslar"
            value={r1Status}
            onChange={setR1Status}
            allowClear
            options={RENTAL_STATUSES}
          />

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined/>}
            loading={r1Loading}
            onClick={handleRentalPdf}
            block
            style={{
              marginTop:    8,
              borderRadius: 10,
              fontWeight:   700,
              height:       46,
              background:   'linear-gradient(135deg, #ff4d4f, #fa541c)',
              border:       'none',
              boxShadow:    '0 4px 14px rgba(255,77,79,0.35)',
            }}
          >
            {r1Loading ? 'PDF yaratilmoqda...' : '📄 PDF yuklab olish'}
          </Button>
        </ReportCard>

        {/* ── CARD 2: To'lovlar Excel ───────────────────────────────────── */}
        <ReportCard
          icon={<FileExcelFilled style={{ fontSize:26, color:'#52c41a' }}/>}
          iconBg="linear-gradient(135deg, rgba(82,196,26,0.12), rgba(82,196,26,0.06))"
          iconBorder="rgba(82,196,26,0.2)"
          title="To'lovlar Excel"
          description="To'lovlar tarixini Excel formatda eksport qiling. 2 ta varaq: barcha to'lovlar + statistika."
          badge="XLSX"
          badgeColor="#52c41a"
          token={token}
        >
          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5 }}>
            Sana oralig'i
          </label>
          <RangePicker
            style={{ width:'100%' }}
            value={r2Range}
            onChange={v => setR2Range(v as Range)}
            format="DD.MM.YYYY"
            placeholder={['Boshlanish', 'Tugash']}
            allowClear
          />

          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5, marginTop:4 }}>
            Status (ixtiyoriy)
          </label>
          <Select
            style={{ width:'100%' }}
            placeholder="Barcha statuslar"
            value={r2Status}
            onChange={setR2Status}
            allowClear
            options={PAYMENT_STATUSES}
          />

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined/>}
            loading={r2Loading}
            onClick={handlePaymentExcel}
            block
            style={{
              marginTop:    8,
              borderRadius: 10,
              fontWeight:   700,
              height:       46,
              background:   'linear-gradient(135deg, #52c41a, #389e0d)',
              border:       'none',
              boxShadow:    '0 4px 14px rgba(82,196,26,0.35)',
            }}
          >
            {r2Loading ? 'Excel yaratilmoqda...' : "📊 Excel yuklab olish"}
          </Button>
        </ReportCard>

        {/* ── CARD 3: Owner daromad Excel ───────────────────────────────── */}
        <ReportCard
          icon={<CrownFilled style={{ fontSize:26, color:'#722ed1' }}/>}
          iconBg="linear-gradient(135deg, rgba(114,46,209,0.12), rgba(114,46,209,0.06))"
          iconBorder="rgba(114,46,209,0.2)"
          title="Owner Daromad"
          description="Owner uchun mashina bo'yicha daromad hisoboti. Har mashina alohida varaqda, umumiy ko'rsatkichlar bilan."
          badge="XLSX"
          badgeColor="#722ed1"
          token={token}
        >
          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5 }}>
            Owner ID <span style={{ color:'#ff4d4f' }}>*</span>
          </label>
          <InputNumber
            style={{ width:'100%' }}
            min={1}
            placeholder="Owner ID kiriting (masalan: 5)"
            value={r3OwnerId}
            onChange={v => setR3OwnerId(v)}
            size="middle"
          />

          <label style={{ fontSize:11, fontWeight:600, color:token.colorTextTertiary, textTransform:'uppercase', letterSpacing:0.5, marginTop:4 }}>
            Sana oralig'i (ixtiyoriy)
          </label>
          <RangePicker
            style={{ width:'100%' }}
            value={r3Range}
            onChange={v => setR3Range(v as Range)}
            format="DD.MM.YYYY"
            placeholder={['Boshlanish', 'Tugash']}
            allowClear
          />

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined/>}
            loading={r3Loading}
            disabled={!r3OwnerId}
            onClick={handleOwnerIncome}
            block
            style={{
              marginTop:    8,
              borderRadius: 10,
              fontWeight:   700,
              height:       46,
              background:   !r3OwnerId ? undefined : 'linear-gradient(135deg, #722ed1, #531dab)',
              border:       'none',
              boxShadow:    !r3OwnerId ? 'none' : '0 4px 14px rgba(114,46,209,0.35)',
            }}
          >
            {r3Loading ? 'Excel yaratilmoqda...' : '📊 Daromad Excel'}
          </Button>
        </ReportCard>

      </div>

      {/* ── FORMAT INFO ───────────────────────────────────────────────────── */}
      <div style={{
        marginTop:    28,
        padding:      '16px 20px',
        borderRadius: 12,
        background:   token.colorFillAlter,
        border:       `1px solid ${token.colorBorderSecondary}`,
      }}>
        <div style={{ fontSize:13, fontWeight:700, color:token.colorText, marginBottom:12 }}>
          📋 Fayl formatlari haqida
        </div>
        <div style={{
          display:             'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap:                 12,
        }}>
          {[
            {
              icon: '📄',
              title: 'Ijaralar PDF',
              items: ['Ijara ID, mijoz, mashina', 'Boshlanish/tugash sanalari', 'Jami summa va status', "To'lov ma'lumotlari"],
            },
            {
              icon: '📊',
              title: "To'lovlar Excel (2 varaq)",
              items: ["1-varaq: Barcha to'lovlar", '2-varaq: Status/usul statistikasi', 'Grafik uchun tayyor format', 'Umumiy jami avtomatik'],
            },
            {
              icon: '👑',
              title: 'Owner Daromad Excel',
              items: ['1-varaq: Umumiy ko\'rsatkichlar', 'Har mashina uchun alohida varaq', 'Ijara daromadinig ulushi', 'Payout summalar'],
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding:      '10px 14px',
              borderRadius: 10,
              background:   token.colorBgContainer,
              border:       `1px solid ${token.colorBorderSecondary}`,
            }}>
              <div style={{ fontSize:15, marginBottom:6 }}>
                {item.icon} <strong style={{ fontSize:12, color:token.colorText }}>{item.title}</strong>
              </div>
              {item.items.map((t, j) => (
                <div key={j} style={{ fontSize:11, color:token.colorTextTertiary, marginBottom:2 }}>
                  · {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Report Card komponent ──────────────────────────────────────────────────────

interface CardProps {
  icon:        React.ReactNode
  iconBg:      string
  iconBorder:  string
  title:       string
  description: string
  badge:       string
  badgeColor:  string
  token:       ReturnType<typeof theme.useToken>['token']
  children:    React.ReactNode
}

function ReportCard({
  icon, iconBg, iconBorder, title, description, badge, badgeColor, token, children,
}: CardProps) {
  return (
    <div style={{
      background:   token.colorBgContainer,
      borderRadius: 16,
      border:       `1.5px solid ${token.colorBorderSecondary}`,
      overflow:     'hidden',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.04)',
      display:      'flex',
      flexDirection:'column',
    }}>
      {/* Card header */}
      <div style={{
        padding:    '20px 20px 16px',
        background: iconBg,
        borderBottom: `1px solid ${iconBorder}`,
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:10 }}>
          <div style={{
            width:48, height:48, borderRadius:12, flexShrink:0,
            background: token.colorBgContainer,
            border:`1px solid ${iconBorder}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 2px 8px ${iconBorder}`,
          }}>
            {icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:16, fontWeight:700, color:token.colorText }}>
                {title}
              </span>
              <span style={{
                fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:4,
                background:badgeColor, color:'#fff', letterSpacing:0.5,
              }}>
                {badge}
              </span>
            </div>
            <p style={{ margin:0, fontSize:12, color:token.colorTextTertiary, lineHeight:1.5 }}>
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Card body: filters + button */}
      <div style={{
        padding:       '16px 20px 20px',
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        flex:          1,
      }}>
        {children}
      </div>
    </div>
  )
}
