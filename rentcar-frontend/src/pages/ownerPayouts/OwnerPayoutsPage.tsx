import { useState, useEffect, useCallback } from 'react'
import {
  Button, Modal, Form, Input, InputNumber, Select, message,
  Spin, Grid, theme,
} from 'antd'
import {
  PlusOutlined, CheckOutlined, WalletFilled,
  CarFilled, FileTextOutlined,
  DollarCircleFilled, PercentageOutlined, CalendarOutlined,
  ClockCircleFilled, CheckCircleFilled,
  CloseCircleFilled, BankOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { ownerPayoutsApi } from '@/api/ownerPayoutsApi'
import { rentalsApi } from '@/api/rentalsApi'
import type { OwnerPayoutDto, OwnerPayoutStatus } from '@/types/ownerPayouts'
import type { RentalDto } from '@/types/rentals'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import { getApiError } from '@/utils/apiError'
import { format } from 'date-fns'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ru-RU')

const STATUS_CFG: Record<OwnerPayoutStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  Pending:   { label: 'Kutilmoqda', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)',  border: 'rgba(250,140,22,0.25)',  icon: <ClockCircleFilled style={{ fontSize: 11 }}/> },
  Paid:      { label: "To'landi",   color: '#52c41a', bg: 'rgba(82,196,26,0.1)',   border: 'rgba(82,196,26,0.25)',   icon: <CheckCircleFilled style={{ fontSize: 11 }}/> },
  Cancelled: { label: 'Bekor',      color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)', border: 'rgba(140,140,140,0.25)', icon: <CloseCircleFilled style={{ fontSize: 11 }}/> },
}

const OWNER_PALETTE = [
  { color: '#722ed1', bg: 'linear-gradient(135deg,#722ed1,#9254de)' },
  { color: '#1677ff', bg: 'linear-gradient(135deg,#1677ff,#4096ff)' },
  { color: '#13c2c2', bg: 'linear-gradient(135deg,#13c2c2,#36cfc9)' },
  { color: '#fa8c16', bg: 'linear-gradient(135deg,#fa8c16,#ffc53d)' },
  { color: '#52c41a', bg: 'linear-gradient(135deg,#52c41a,#73d13d)' },
  { color: '#eb2f96', bg: 'linear-gradient(135deg,#eb2f96,#f759ab)' },
]
function ownerPalette(id: number) { return OWNER_PALETTE[id % OWNER_PALETTE.length] }
function ownerInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'O'
}

function StatusChip({ status }: { status: OwnerPayoutStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export default function OwnerPayoutsPage() {
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.md

  const [data,          setData]          = useState<PaginatedResponse<OwnerPayoutDto> | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [statusFilter,  setStatusFilter]  = useState<OwnerPayoutStatus | 'All'>('All')
  const [createOpen,    setCreateOpen]    = useState(false)
  const [markingPayout, setMarkingPayout] = useState<OwnerPayoutDto | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rentals,       setRentals]       = useState<RentalDto[]>([])
  const [rentalsLoading, setRentalsLoading] = useState(false)
  const [createForm] = Form.useForm()
  const [markForm]   = Form.useForm()
  const { page, pageSize, onChange, reset } = usePagination(12)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ownerPayoutsApi.getAll({
        page, pageSize,
        status: statusFilter === 'All' ? undefined : statusFilter,
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Ijaralar ro'yxatini yuklash (modal ochilganda)
  const fetchRentals = useCallback(async () => {
    setRentalsLoading(true)
    try {
      const res = await rentalsApi.getAll({ page: 1, pageSize: 200, status: 'Completed' })
      setRentals(res.data.items)
    } catch {
      setRentals([])
    } finally {
      setRentalsLoading(false)
    }
  }, [])

  const openCreate = () => {
    setCreateOpen(true)
    fetchRentals()
  }

  const handleCreate = async () => {
    const values = await createForm.validateFields()
    setActionLoading(true)
    try {
      await ownerPayoutsApi.create({ rentalId: values.rentalId })
      message.success("✅ To'lov yaratildi")
      setCreateOpen(false)
      fetchData()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally { setActionLoading(false) }
  }

  const handleMarkPaid = async () => {
    const values = await markForm.validateFields()
    setActionLoading(true)
    try {
      await ownerPayoutsApi.markPaid(markingPayout!.id, { transactionId: values.transactionId })
      message.success("✅ To'lov amalga oshirilgan deb belgilandi")
      setMarkingPayout(null)
      fetchData()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally { setActionLoading(false) }
  }

  const items      = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const FILTER_TABS: { key: OwnerPayoutStatus | 'All'; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'All',       label: 'Barchasi',  icon: <WalletFilled/>,       color: '#722ed1' },
    { key: 'Pending',   label: 'Kutilmoqda', icon: <ClockCircleFilled/>, color: '#fa8c16' },
    { key: 'Paid',      label: "To'landi",   icon: <CheckCircleFilled/>, color: '#52c41a' },
    { key: 'Cancelled', label: 'Bekor',      icon: <CloseCircleFilled/>, color: '#8c8c8c' },
  ]

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background: 'linear-gradient(135deg,#120338 0%,#531dab 55%,#722ed1 100%)',
        padding: isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        {[
          { s: 220, t: -80, r: -60, o: .07 },
          { s: 140, t: 20,  r: 140, o: .05 },
          { s: 100, b: -40, l: 80,  o: .07 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: '#fff',
            width: c.s, height: c.s, opacity: c.o,
            top: c.t, right: c.r, bottom: c.b, left: c.l,
          }}/>
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16, marginBottom: 20,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <WalletFilled style={{ fontSize: 28, color: '#fff' }}/>
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                Owner To'lovlari
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                Mashina egalariga to'lovlarni boshqarish
              </p>
            </div>

            {/* Stats */}
            {!isMobile && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { val: totalCount, label: statusFilter === 'All' ? 'Jami' : STATUS_CFG[statusFilter as OwnerPayoutStatus]?.label, color: '#d3adf7' },
                  { val: data?.items.filter(i => i.status === 'Pending').length ?? 0, label: 'Kutilmoqda', color: '#ffd591' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: '8px 18px', borderRadius: 12, textAlign: 'center',
                    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <Button
              icon={<PlusOutlined/>}
              size="large"
              onClick={openCreate}
              style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.35)', color: '#fff',
                borderRadius: 10, fontWeight: 600, flexShrink: 0,
              }}
            >
              {isMobile ? '' : "To'lov yaratish"}
            </Button>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => {
              const isAct = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); reset() }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                    border: isAct ? 'none' : '1px solid rgba(255,255,255,0.3)',
                    background: isAct ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
                    color: isAct ? tab.color : 'rgba(255,255,255,0.85)',
                    fontSize: 12, fontWeight: isAct ? 700 : 500,
                    backdropFilter: 'blur(6px)', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16 }}>
          <Spin size="large"/>
          <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>To'lovlar yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginBottom: 6 }}>
            To'lovlar topilmadi
          </div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {statusFilter !== 'All'
              ? `"${STATUS_CFG[statusFilter as OwnerPayoutStatus]?.label}" holatida to'lov yo'q`
              : "Hali to'lov yaratilmagan"}
          </div>
          <button
            onClick={openCreate}
            style={{
              marginTop: 16, padding: '9px 24px', borderRadius: 20, cursor: 'pointer',
              background: 'linear-gradient(135deg,#531dab,#722ed1)',
              border: 'none', color: '#fff', fontWeight: 600, fontSize: 13,
            }}
          >
            <PlusOutlined style={{ marginRight: 6 }}/>
            To'lov yaratish
          </button>
        </div>
      ) : (
        <>
          {/* Count row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
              <strong style={{ color: token.colorText }}>{totalCount}</strong> ta to'lov
            </span>
            {totalCount > pageSize && (
              <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
                {page} / {Math.ceil(totalCount / pageSize)} sahifa
              </span>
            )}
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : !screens.lg ? 'repeat(2,1fr)'
              : screens.xl ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
            gap: isMobile ? 12 : 16,
          }}>
            {items.map(payout => (
              <PayoutCard
                key={payout.id}
                payout={payout}
                token={token}
                onMarkPaid={() => setMarkingPayout(payout)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28, gap: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => onChange(p, pageSize)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    border: page === p ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                    background: page === p
                      ? 'linear-gradient(135deg,#531dab,#722ed1)'
                      : token.colorBgContainer,
                    color: page === p ? '#fff' : token.colorText,
                    fontWeight: page === p ? 700 : 400, fontSize: 13,
                    transition: 'all 0.2s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CREATE MODAL ─────────────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#531dab,#722ed1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <WalletFilled style={{ color: '#fff', fontSize: 14 }}/>
            </div>
            <span style={{ fontWeight: 700 }}>Owner to'lovini hisoblash</span>
          </div>
        }
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={actionLoading}
        okText="Hisoblash"
        cancelText="Bekor"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 700, background: '#722ed1', border: 'none' } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={isMobile ? '95vw' : 440}
        forceRender
        afterClose={() => createForm.resetFields()}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="rentalId"
            label={<span style={{ fontWeight: 600 }}>📋 Ijara</span>}
            rules={[{ required: true, message: 'Majburiy' }]}
          >
            <Select
              size="large"
              style={{ borderRadius: 8 }}
              placeholder="Ijarani tanlang..."
              loading={rentalsLoading}
              showSearch
              optionFilterProp="label"
              suffixIcon={<SearchOutlined/>}
              notFoundContent={
                rentalsLoading
                  ? <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small"/></div>
                  : <div style={{ textAlign: 'center', padding: 12, color: '#8c8c8c', fontSize: 13 }}>
                      Yakunlangan ijara topilmadi
                    </div>
              }
              options={rentals.map(r => ({
                value: r.id,
                label: `#${r.id} · ${r.licensePlate} · ${r.customerName}`,
                rental: r,
              }))}
              optionRender={option => {
                const r = (option.data as { rental: RentalDto }).rental
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
                        padding: '1px 7px', borderRadius: 5,
                        background: 'rgba(22,119,255,0.1)', color: '#1677ff',
                      }}>
                        #{r.id}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.carBrand} {r.carModel}
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontFamily: 'monospace',
                        fontSize: 11, fontWeight: 700, color: '#595959',
                      }}>
                        {r.licensePlate}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', paddingLeft: 4 }}>
                      👤 {r.customerName} · 💰 {r.totalAmount.toLocaleString('ru-RU')} so'm · {format(new Date(r.startDate), 'dd.MM.yy')} — {format(new Date(r.endDate), 'dd.MM.yy')}
                    </div>
                  </div>
                )
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── MARK PAID MODAL ──────────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#389e0d,#52c41a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckOutlined style={{ color: '#fff', fontSize: 14 }}/>
            </div>
            <span style={{ fontWeight: 700 }}>To'lovni tasdiqlash</span>
          </div>
        }
        open={!!markingPayout}
        onOk={handleMarkPaid}
        onCancel={() => setMarkingPayout(null)}
        confirmLoading={actionLoading}
        okText="✅ Tasdiqlash"
        cancelText="Bekor"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 700, background: '#52c41a', border: 'none' } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={isMobile ? '95vw' : 420}
        forceRender
        afterClose={() => markForm.resetFields()}
      >
        {/* Payout preview */}
        {markingPayout && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginTop: 8, marginBottom: 16,
            background: 'rgba(82,196,26,0.06)', border: '1px solid rgba(82,196,26,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: ownerPalette(markingPayout.ownerId).bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#fff',
              }}>
                {ownerInitials(markingPayout.ownerName)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{markingPayout.ownerName}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {markingPayout.carPlate} · Ijara #{markingPayout.rentalId}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#52c41a' }}>
                  {fmt(markingPayout.payoutAmount)} so'm
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>To'lov summasi</div>
              </div>
            </div>
          </div>
        )}

        <Form form={markForm} layout="vertical">
          <Form.Item
            name="transactionId"
            label={<span style={{ fontWeight: 600 }}>🏦 Bank tranzaksiya ID</span>}
            rules={[{ required: true, message: 'Majburiy' }]}
          >
            <Input
              placeholder="BANK-TXN-2026-001"
              size="large" style={{ borderRadius: 8 }}
              prefix={<BankOutlined style={{ color: '#8c8c8c' }}/>}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Payout Card ────────────────────────────────────────────────────────────────
function PayoutCard({
  payout, token, onMarkPaid,
}: {
  payout: OwnerPayoutDto
  token: ReturnType<typeof theme.useToken>['token']
  onMarkPaid: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const pal = ownerPalette(payout.ownerId)
  const canMark = payout.status === 'Pending'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: token.colorBgContainer,
        borderRadius: 16,
        border: `1.5px solid ${hovered ? pal.color : token.colorBorderSecondary}`,
        overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 30px ${pal.color}22, 0 3px 8px rgba(0,0,0,0.07)`
          : '0 2px 6px rgba(0,0,0,0.04)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ height: 3, background: pal.bg }}/>

      <div style={{ padding: '16px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Header: avatar + owner + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: hovered ? pal.bg : `linear-gradient(135deg,${pal.color}33,${pal.color}22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: pal.color, letterSpacing: -1,
            transition: 'background 0.2s',
          }}>
            {ownerInitials(payout.ownerName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 14,
              color: hovered ? pal.color : token.colorText,
              transition: 'color 0.18s',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {payout.ownerName}
            </div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CarFilled style={{ fontSize: 10 }}/>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{payout.carPlate}</span>
              <span style={{ color: token.colorTextTertiary }}>·</span>
              <FileTextOutlined style={{ fontSize: 10 }}/>
              <span>Ijara #{payout.rentalId}</span>
            </div>
          </div>
          <StatusChip status={payout.status}/>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: token.colorBorderSecondary }}/>

        {/* Payout amount — big highlight */}
        <div style={{
          padding: '12px 14px', borderRadius: 12, textAlign: 'center',
          background: hovered
            ? `linear-gradient(135deg,${pal.color}18,${pal.color}10)`
            : token.colorFillAlter,
          border: `1px solid ${hovered ? pal.color + '40' : token.colorBorderSecondary}`,
          transition: 'all 0.2s',
        }}>
          <div style={{ fontSize: 11, color: token.colorTextTertiary, marginBottom: 3 }}>
            To'lov summasi
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: hovered ? pal.color : '#52c41a', letterSpacing: -0.5 }}>
            {fmt(payout.payoutAmount)} so'm
          </div>
          <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 2 }}>
            {fmt(payout.rentalTotalAmount)} so'm × {payout.ownerRevenuePercent}%
          </div>
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarCircleFilled style={{ fontSize: 11 }}/> Ijara summasi
            </span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(payout.rentalTotalAmount)} so'm</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <PercentageOutlined style={{ fontSize: 11 }}/> Owner ulushi
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pal.color }}>{payout.ownerRevenuePercent}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarOutlined style={{ fontSize: 11 }}/> Yaratilgan
            </span>
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {format(new Date(payout.createdAt), 'dd.MM.yyyy')}
            </span>
          </div>

          {payout.paidAt && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircleFilled style={{ fontSize: 11, color: '#52c41a' }}/> To'langan
              </span>
              <span style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                {format(new Date(payout.paidAt), 'dd.MM.yyyy')}
              </span>
            </div>
          )}

          {payout.transactionId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BankOutlined style={{ fontSize: 11 }}/> Tranzaksiya
              </span>
              <span style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                padding: '1px 8px', borderRadius: 6,
                background: token.colorFillAlter, color: token.colorText,
              }}>
                {payout.transactionId}
              </span>
            </div>
          )}

          {payout.notes && (
            <div style={{
              padding: '7px 10px', borderRadius: 8, fontSize: 11,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              color: token.colorTextSecondary,
            }}>
              📝 {payout.notes}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {canMark && (
        <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <button
            onClick={onMarkPaid}
            style={{
              width: '100%', padding: '10px 0',
              background: hovered
                ? 'linear-gradient(135deg,rgba(82,196,26,0.15),rgba(82,196,26,0.08))'
                : 'transparent',
              border: 'none',
              color: '#52c41a', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <CheckOutlined/> To'landi deb belgilash
          </button>
        </div>
      )}
    </div>
  )
}
