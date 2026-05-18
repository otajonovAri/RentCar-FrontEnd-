import { useState, useEffect, useCallback } from 'react'
import {
  Button, Modal, Form, InputNumber, Input, Select, message,
  Spin, Grid, theme, Drawer, Divider,
} from 'antd'
import {
  CheckOutlined, CloseOutlined, EyeOutlined,
  CarFilled, ClockCircleFilled, CheckCircleFilled,
  CloseCircleFilled, DollarCircleFilled, UserOutlined,
  CalendarOutlined, TagOutlined, PercentageOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import api from '@/api/axiosInstance'
import { carListingsApi } from '@/api/carListingsApi'
import type { CarListingDto, CarListingStatus } from '@/types/carListings'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import { getApiError } from '@/utils/apiError'
import { format } from 'date-fns'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ru-RU')

const STATUS_CFG: Record<CarListingStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Pending:  { label: 'Kutilmoqda', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)',  border: 'rgba(250,140,22,0.25)',  icon: <ClockCircleFilled  style={{ fontSize: 11 }}/> },
  Approved: { label: 'Tasdiqlandi', color: '#52c41a', bg: 'rgba(82,196,26,0.1)',   border: 'rgba(82,196,26,0.25)',   icon: <CheckCircleFilled  style={{ fontSize: 11 }}/> },
  Rejected: { label: 'Rad etildi',  color: '#f5222d', bg: 'rgba(245,34,45,0.1)',   border: 'rgba(245,34,45,0.25)',   icon: <CloseCircleFilled  style={{ fontSize: 11 }}/> },
}

const BRAND_PALETTE = [
  { color: '#fa8c16', bg: 'linear-gradient(135deg,#fa8c16,#faad14)' },
  { color: '#1677ff', bg: 'linear-gradient(135deg,#1677ff,#4096ff)' },
  { color: '#722ed1', bg: 'linear-gradient(135deg,#722ed1,#9254de)' },
  { color: '#13c2c2', bg: 'linear-gradient(135deg,#13c2c2,#36cfc9)' },
  { color: '#52c41a', bg: 'linear-gradient(135deg,#52c41a,#73d13d)' },
  { color: '#eb2f96', bg: 'linear-gradient(135deg,#eb2f96,#f759ab)' },
]
function brandPalette(id: number) { return BRAND_PALETTE[id % BRAND_PALETTE.length] }
function brandInitials(brand: string, model: string) {
  return (brand[0] ?? '') + (model[0] ?? '')
}

function StatusChip({ status }: { status: CarListingStatus }) {
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

// ── Info row helper ─────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#8c8c8c', fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#8c8c8c', minWidth: 90 }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default function CarListingsPage() {
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.md

  const [data,         setData]         = useState<PaginatedResponse<CarListingDto> | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [statusFilter, setStatusFilter] = useState<CarListingStatus | 'All'>('Pending')
  const [approveTarget, setApproveTarget] = useState<CarListingDto | null>(null)
  const [rejectTarget,  setRejectTarget]  = useState<CarListingDto | null>(null)
  const [detailTarget,  setDetailTarget]  = useState<CarListingDto | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveForm] = Form.useForm()
  const [rejectForm]  = Form.useForm()
  const { page, pageSize, onChange, reset } = usePagination(12)

  const [branches, setBranches] = useState<Array<{ id: number; name: string; cityName: string }>>([])
  useEffect(() => {
    api.get('/api/branches')
      .then(r => setBranches((Array.isArray(r.data) ? r.data : []).map((b: any) => ({ id: b.id, name: b.name, cityName: b.cityName }))))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await carListingsApi.getAll({
        page, pageSize,
        status: statusFilter === 'All' ? undefined : statusFilter,
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async () => {
    const values = await approveForm.validateFields()
    setActionLoading(true)
    try {
      const res = await carListingsApi.approve(approveTarget!.id, values)
      message.success(`✅ Tasdiqlandi! Mashina ID: ${res.data.carId}`)
      setApproveTarget(null)
      fetchData()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    const values = await rejectForm.validateFields()
    setActionLoading(true)
    try {
      await carListingsApi.reject(rejectTarget!.id, values)
      message.success("❌ So'rov rad etildi")
      setRejectTarget(null)
      fetchData()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally {
      setActionLoading(false)
    }
  }

  // Counts from current data + all-status totals
  const items      = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const FILTER_TABS: { key: CarListingStatus | 'All'; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'All',      label: 'Barchasi',    icon: <CarFilled/>,           color: '#1677ff' },
    { key: 'Pending',  label: 'Kutilmoqda',  icon: <ClockCircleFilled/>,   color: '#fa8c16' },
    { key: 'Approved', label: 'Tasdiqlandi', icon: <CheckCircleFilled/>,   color: '#52c41a' },
    { key: 'Rejected', label: 'Rad etildi',  icon: <CloseCircleFilled/>,   color: '#f5222d' },
  ]

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background: 'linear-gradient(135deg,#1a0a00 0%,#873800 50%,#fa8c16 100%)',
        padding: isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { s: 220, t: -80, r: -60, o: .07 },
          { s: 140, t: 20, r: 140, o: .05 },
          { s: 100, b: -40, l: 80, o: .07 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: '#fff',
            width: c.s, height: c.s, opacity: c.o,
            top: c.t, right: c.r, bottom: c.b, left: c.l,
          }}/>
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Title row */}
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
              <CarFilled style={{ fontSize: 28, color: '#fff' }}/>
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                Mashina So'rovlari
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                Owner'larning mashina qo'shish so'rovlari
              </p>
            </div>

            {/* Stats chip */}
            {!isMobile && (
              <div style={{
                padding: '8px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center',
              }}>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#ffd591', lineHeight: 1 }}>
                  {totalCount}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {statusFilter === 'All' ? "Jami so'rovlar" : STATUS_CFG[statusFilter as CarListingStatus]?.label}
                </div>
              </div>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => {
              const isActive = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); reset() }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.3)',
                    background: isActive
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.12)',
                    color: isActive ? tab.color : 'rgba(255,255,255,0.85)',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    backdropFilter: 'blur(6px)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 12 }}>{tab.icon}</span>
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
          <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>So'rovlar yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🚗</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginBottom: 6 }}>
            So'rovlar topilmadi
          </div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {statusFilter !== 'All'
              ? `"${STATUS_CFG[statusFilter as CarListingStatus]?.label}" holatida so'rov yo'q`
              : "Hali hech qanday so'rov mavjud emas"}
          </div>
        </div>
      ) : (
        <>
          {/* Count row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
              <strong style={{ color: token.colorText }}>{totalCount}</strong> ta so'rov
              {statusFilter !== 'All' && (
                <span style={{
                  marginLeft: 8, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  color: STATUS_CFG[statusFilter as CarListingStatus]?.color,
                  background: STATUS_CFG[statusFilter as CarListingStatus]?.bg,
                  border: `1px solid ${STATUS_CFG[statusFilter as CarListingStatus]?.border}`,
                }}>
                  {STATUS_CFG[statusFilter as CarListingStatus]?.label}
                </span>
              )}
            </span>
            <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
              {page} / {Math.ceil(totalCount / pageSize)} sahifa
            </span>
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : !screens.lg ? 'repeat(2,1fr)' : screens.xl ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
            gap: isMobile ? 12 : 16,
          }}>
            {items.map(item => <ListingCard
              key={item.id}
              item={item}
              onView={() => setDetailTarget(item)}
              onApprove={() => {
                setApproveTarget(item)
                approveForm.setFieldsValue({
                  ownerRevenuePercent: 70,
                  approvedDailyRate: item.requestedDailyRate,
                })
              }}
              onReject={() => setRejectTarget(item)}
              token={token}
            />)}
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
                      ? 'linear-gradient(135deg,#873800,#fa8c16)'
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

      {/* ── DETAIL DRAWER ────────────────────────────────────────────────────── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#873800,#fa8c16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CarFilled style={{ color: '#fff', fontSize: 14 }}/>
            </div>
            <span style={{ fontWeight: 700 }}>So'rov tafsilotlari</span>
          </div>
        }
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        width={isMobile ? '100vw' : 420}
        footer={
          detailTarget?.status === 'Pending' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                icon={<CheckOutlined/>}
                style={{ flex: 1, borderRadius: 8, fontWeight: 700, background: '#52c41a', border: 'none' }}
                onClick={() => {
                  setDetailTarget(null)
                  setApproveTarget(detailTarget)
                  approveForm.setFieldsValue({ ownerRevenuePercent: 70, approvedDailyRate: detailTarget!.requestedDailyRate })
                }}
              >
                Tasdiqlash
              </Button>
              <Button
                danger icon={<CloseOutlined/>}
                style={{ flex: 1, borderRadius: 8, fontWeight: 700 }}
                onClick={() => { setDetailTarget(null); setRejectTarget(detailTarget) }}
              >
                Rad etish
              </Button>
            </div>
          ) : null
        }
      >
        {detailTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Car avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                background: brandPalette(detailTarget.id).bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -1,
              }}>
                {brandInitials(detailTarget.brand, detailTarget.model)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  {detailTarget.brand} {detailTarget.model}
                </div>
                <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>
                  {detailTarget.year} yil · {detailTarget.color}
                </div>
                <div style={{ marginTop: 6 }}>
                  <StatusChip status={detailTarget.status}/>
                </div>
              </div>
            </div>

            <Divider style={{ margin: '4px 0' }}/>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InfoRow icon={<UserOutlined/>}         label="Owner"          value={detailTarget.ownerName}/>
              <InfoRow icon={<TagOutlined/>}           label="Davlat raqami"  value={
                <span style={{
                  padding: '2px 10px', borderRadius: 6, fontSize: 12,
                  background: token.colorFillAlter, fontFamily: 'monospace', fontWeight: 700,
                }}>
                  {detailTarget.licensePlate}
                </span>
              }/>
              <InfoRow icon={<DollarCircleFilled/>}   label="So'ralgan narx" value={
                <span style={{ color: '#fa8c16', fontWeight: 800 }}>
                  {fmt(detailTarget.requestedDailyRate)} so'm/kun
                </span>
              }/>
              {detailTarget.status === 'Approved' && detailTarget.approvedDailyRate && (
                <InfoRow icon={<DollarCircleFilled style={{ color: '#52c41a' }}/>} label="Admin narxi" value={
                  <span style={{ color: '#52c41a', fontWeight: 800 }}>
                    {fmt(detailTarget.approvedDailyRate)} so'm/kun
                  </span>
                }/>
              )}
              {detailTarget.ownerRevenuePercent !== null && (
                <InfoRow icon={<PercentageOutlined/>} label="Sizning ulushingiz" value={
                  <span style={{ color: '#722ed1', fontWeight: 700 }}>
                    {detailTarget.ownerRevenuePercent}%
                  </span>
                }/>
              )}
              {detailTarget.adminNotes && (
                <InfoRow icon={<FileTextOutlined/>} label="Admin izohi" value={
                  <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                    {detailTarget.adminNotes}
                  </span>
                }/>
              )}
              <InfoRow icon={<CalendarOutlined/>}     label="Yuborilgan"     value={format(new Date(detailTarget.createdAt), 'dd.MM.yyyy HH:mm')}/>
            </div>

            {/* Rejection reason */}
            {detailTarget.rejectionReason && (
              <>
                <Divider style={{ margin: '4px 0' }}/>
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(245,34,45,0.06)',
                  border: '1px solid rgba(245,34,45,0.2)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f5222d', marginBottom: 6 }}>
                    ❌ Rad etish sababi
                  </div>
                  <div style={{ fontSize: 13, color: token.colorText }}>
                    {detailTarget.rejectionReason}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* ── APPROVE MODAL ────────────────────────────────────────────────────── */}
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
            <span style={{ fontWeight: 700 }}>
              Tasdiqlash — {approveTarget?.brand} {approveTarget?.model}
            </span>
          </div>
        }
        open={!!approveTarget}
        onOk={handleApprove}
        onCancel={() => setApproveTarget(null)}
        confirmLoading={actionLoading}
        okText="✅ Tasdiqlash"
        cancelText="Bekor"
        okButtonProps={{ style: { background: '#52c41a', border: 'none', borderRadius: 8, fontWeight: 700 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={isMobile ? '95vw' : 480}
        forceRender
        afterClose={() => approveForm.resetFields()}
      >
        {/* Car info preview */}
        {approveTarget && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginTop: 8, marginBottom: 16,
            background: 'rgba(82,196,26,0.06)', border: '1px solid rgba(82,196,26,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: brandPalette(approveTarget.id).bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>
              {brandInitials(approveTarget.brand, approveTarget.model)}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{approveTarget.brand} {approveTarget.model} {approveTarget.year}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {approveTarget.licensePlate} · So'ralgan: {fmt(approveTarget.requestedDailyRate)} so'm/kun
              </div>
            </div>
          </div>
        )}

        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="branchId"
            label={<span style={{ fontWeight: 600 }}>🏢 Filial (mashina qayerda bo'ladi)</span>}
            rules={[{ required: true, message: 'Filial tanlang' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Filial tanlang"
              size="large"
              options={branches.map(b => ({ value: b.id, label: `${b.name} — ${b.cityName}` }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item
            name="ownerRevenuePercent"
            label={<span style={{ fontWeight: 600 }}>📊 Owner ulushi (%)</span>}
            rules={[{ required: true, message: 'Majburiy' }]}
            initialValue={70}
          >
            <InputNumber
              min={1} max={100} step={5} style={{ width: '100%', borderRadius: 8 }}
              addonAfter="%" size="large"
            />
          </Form.Item>
          <Form.Item
            name="approvedDailyRate"
            label={<span style={{ fontWeight: 600 }}>💰 Tasdiqlangan kunlik narx</span>}
            rules={[{ required: true, message: 'Majburiy' }]}
          >
            <InputNumber
              min={0} step={10000} style={{ width: '100%', borderRadius: 8 }}
              size="large" addonAfter="so'm/kun"
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v!.replace(/,/g, '') as unknown as 0}
            />
          </Form.Item>
          <Form.Item
            name="adminNotes"
            label={<span style={{ fontWeight: 600 }}>📝 Admin izohi (ixtiyoriy)</span>}
          >
            <Input.TextArea rows={2} placeholder="Qo'shimcha izoh..." style={{ borderRadius: 8 }}/>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── REJECT MODAL ─────────────────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#cf1322,#f5222d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CloseOutlined style={{ color: '#fff', fontSize: 14 }}/>
            </div>
            <span style={{ fontWeight: 700 }}>
              Rad etish — {rejectTarget?.brand} {rejectTarget?.model}
            </span>
          </div>
        }
        open={!!rejectTarget}
        onOk={handleReject}
        onCancel={() => setRejectTarget(null)}
        confirmLoading={actionLoading}
        okText="❌ Rad etish"
        cancelText="Bekor"
        okButtonProps={{ danger: true, style: { borderRadius: 8, fontWeight: 700 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={isMobile ? '95vw' : 440}
        forceRender
        afterClose={() => rejectForm.resetFields()}
      >
        {rejectTarget && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginTop: 8, marginBottom: 16,
            background: 'rgba(245,34,45,0.06)', border: '1px solid rgba(245,34,45,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: brandPalette(rejectTarget.id).bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>
              {brandInitials(rejectTarget.brand, rejectTarget.model)}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{rejectTarget.brand} {rejectTarget.model} {rejectTarget.year}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Owner: {rejectTarget.ownerName}</div>
            </div>
          </div>
        )}

        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="rejectionReason"
            label={<span style={{ fontWeight: 600 }}>📋 Rad etish sababi</span>}
            rules={[{ required: true, message: 'Majburiy' }, { min: 10, message: "Kamida 10 ta belgi kiriting" }]}
          >
            <Input.TextArea
              rows={4} style={{ borderRadius: 8 }}
              placeholder="Masalan: Mashina yoshi eski (2010 yildan oldin), shikastlanishi bor..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Listing Card ───────────────────────────────────────────────────────────────
function ListingCard({
  item, onView, onApprove, onReject, token,
}: {
  item: CarListingDto
  onView: () => void
  onApprove: () => void
  onReject: () => void
  token: ReturnType<typeof theme.useToken>['token']
}) {
  const [hovered, setHovered] = useState(false)
  const pal = brandPalette(item.id)
  const cfg = STATUS_CFG[item.status]

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
      {/* Color top bar */}
      <div style={{ height: 3, background: pal.bg }}/>

      {/* Card body */}
      <div style={{ padding: '16px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header: avatar + name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: hovered ? pal.bg : `linear-gradient(135deg,${pal.color}33,${pal.color}22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: pal.color, letterSpacing: -1,
            transition: 'all 0.2s',
          }}>
            {brandInitials(item.brand, item.model)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 15,
              color: hovered ? pal.color : token.colorText,
              transition: 'color 0.18s',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {item.brand} {item.model}
            </div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 1 }}>
              {item.year} yil · {item.color}
            </div>
          </div>
          <StatusChip status={item.status}/>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: token.colorBorderSecondary }}/>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserOutlined/> Owner
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>{item.ownerName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TagOutlined/> Raqam
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
              padding: '1px 8px', borderRadius: 6,
              background: token.colorFillAlter, color: token.colorText,
            }}>
              {item.licensePlate}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarCircleFilled/> {item.status === 'Approved' ? "So'ralgan" : 'Narx'}
            </span>
            <span style={{
              fontWeight: 800,
              color: item.status === 'Approved' ? token.colorTextSecondary : '#fa8c16',
              textDecoration: item.status === 'Approved' && item.approvedDailyRate ? 'line-through' : 'none',
              fontSize: item.status === 'Approved' && item.approvedDailyRate ? 11 : 13,
            }}>
              {fmt(item.requestedDailyRate)} so'm/kun
            </span>
          </div>

          {/* Admin tasdiqlagan narx */}
          {item.status === 'Approved' && item.approvedDailyRate && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                <DollarCircleFilled style={{ color: '#52c41a' }}/> Admin narxi
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#52c41a' }}>
                {fmt(item.approvedDailyRate)} so'm/kun
              </span>
            </div>
          )}

          {/* Owner ulushi */}
          {item.status === 'Approved' && item.ownerRevenuePercent && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                <PercentageOutlined/> Sizning ulushingiz
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: '#722ed1',
                background: 'rgba(114,46,209,0.1)',
                padding: '1px 8px', borderRadius: 20,
              }}>
                {item.ownerRevenuePercent}%
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarOutlined/> Sana
            </span>
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {format(new Date(item.createdAt), 'dd.MM.yyyy')}
            </span>
          </div>
        </div>

        {/* Rejection reason */}
        {item.rejectionReason && (
          <div style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 11,
            background: 'rgba(245,34,45,0.06)', border: '1px solid rgba(245,34,45,0.18)',
            color: '#f5222d', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            ❌ {item.rejectionReason}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div style={{
        display: 'flex', borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}>
        {/* View */}
        <button
          onClick={onView}
          style={{
            flex: 1, padding: '9px 0',
            background: hovered ? `${pal.color}10` : 'transparent',
            border: 'none', borderRight: `1px solid ${token.colorBorderSecondary}`,
            color: hovered ? pal.color : token.colorTextTertiary,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.15s',
          }}
        >
          <EyeOutlined/> Ko'rish
        </button>

        {item.status === 'Pending' ? (
          <>
            {/* Approve */}
            <button
              onClick={onApprove}
              style={{
                flex: 1, padding: '9px 0',
                background: 'transparent', border: 'none',
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                color: '#52c41a', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
            >
              <CheckOutlined/> Tasdiqlash
            </button>
            {/* Reject */}
            <button
              onClick={onReject}
              style={{
                flex: 1, padding: '9px 0',
                background: 'transparent', border: 'none',
                color: '#f5222d', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
            >
              <CloseOutlined/> Rad etish
            </button>
          </>
        ) : (
          <div style={{
            flex: 2, padding: '9px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 12, color: cfg.color, fontWeight: 600,
          }}>
            {cfg.icon} {cfg.label}
          </div>
        )}
      </div>
    </div>
  )
}
