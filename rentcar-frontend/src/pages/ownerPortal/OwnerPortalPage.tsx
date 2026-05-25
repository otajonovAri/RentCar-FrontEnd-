import { useState, useEffect, useCallback } from 'react'
import {
  Button, Input, Form, Select, InputNumber, Modal,
  message, Spin, Grid, theme, Tabs, Tag, Pagination,
} from 'antd'
import {
  CarFilled, PlusOutlined, ClockCircleFilled, CheckCircleFilled,
  CloseCircleFilled, FileTextOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import api from '@/api/axiosInstance'
import { carListingsApi } from '@/api/carListingsApi'
import type { CarListingDto, CarListingStatus } from '@/types/carListings'
import type { PaginatedResponse } from '@/types/common'
import { useAuthStore } from '@/store/authStore'
import { useBrands, useModels, useCategories, useFuelTypes } from '@/hooks/useLookups'
import { usePagination } from '@/hooks/usePagination'
import { getApiError } from '@/utils/apiError'
import dayjs from 'dayjs'

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<CarListingStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  Pending:  { label: "Ko'rib chiqilmoqda", color: '#fa8c16', bg: 'rgba(250,140,22,0.1)',  border: 'rgba(250,140,22,0.25)',  icon: <ClockCircleFilled /> },
  Approved: { label: 'Tasdiqlandi',         color: '#52c41a', bg: 'rgba(82,196,26,0.1)',   border: 'rgba(82,196,26,0.25)',   icon: <CheckCircleFilled /> },
  Rejected: { label: 'Rad etildi',          color: '#f5222d', bg: 'rgba(245,34,45,0.1)',   border: 'rgba(245,34,45,0.25)',   icon: <CloseCircleFilled /> },
}

// ── Prop interfaces ──────────────────────────────────────────────────────────
interface MyCarsTabProps {
  cars: any[]
  loading: boolean
  token: any
  isMobile: boolean
}

interface MyRequestsTabProps {
  requests: PaginatedResponse<CarListingDto> | null
  loading: boolean
  page: number
  pageSize: number
  onChange: (p: number, ps: number) => void
  token: any
  isMobile: boolean
  onNew: () => void
}

// ── MyCarsTab ────────────────────────────────────────────────────────────────
function MyCarsTab({ cars, loading, token, isMobile }: MyCarsTabProps) {
  const gridCols = isMobile ? 1 : cars.length === 0 ? 1 : 3

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spin size="large" />
    </div>
  )

  if (!cars.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🚗</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginBottom: 6 }}>
        Hali mashinalariηgiz yo'q
      </div>
      <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
        "Mashina qo'shish" tugmasini bosib so'rov yuboring
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols},1fr)`, gap: 16 }}>
      {cars.map((car: any) => (
        <div key={car.id} style={{
          borderRadius: 12,
          overflow: 'hidden',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {/* Car image */}
          {car.mainImageUrl ? (
            <img
              src={car.mainImageUrl}
              alt={car.licensePlate}
              style={{ width: '100%', height: 160, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              height: 100,
              background: 'linear-gradient(135deg,#1a0a00,#fa8c16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CarFilled style={{ fontSize: 40, color: 'rgba(255,255,255,0.4)' }} />
            </div>
          )}
          <div style={{ padding: '14px 16px' }}>
            {/* Plate */}
            <div style={{
              fontFamily: 'monospace', fontWeight: 800, fontSize: 15,
              color: '#fa8c16', marginBottom: 6,
            }}>
              🚗 {car.licensePlate}
            </div>
            {/* Brand Model Year */}
            <div style={{ fontWeight: 700, fontSize: 14, color: token.colorText, marginBottom: 4 }}>
              {car.brandName} {car.carModelName} {car.year}
            </div>
            {/* Daily rate */}
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 8 }}>
              💰 {(car.dailyRate ?? 0).toLocaleString()} so'm/kun
            </div>
            {/* Status tag */}
            <Tag color={
              car.status === 'Available' ? 'green' :
              car.status === 'Rented'    ? 'blue'  : 'orange'
            }>
              {car.status === 'Available' ? "✅ Bo'sh" :
               car.status === 'Rented'    ? '🔑 Ijarada' : car.status}
            </Tag>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── MyRequestsTab ────────────────────────────────────────────────────────────
function MyRequestsTab({
  requests, loading, page, pageSize, onChange,
  token, isMobile, onNew,
}: MyRequestsTabProps) {
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spin size="large" />
    </div>
  )

  const items = requests?.items ?? []

  if (!items.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginBottom: 6 }}>
        Hali so'rov yo'q
      </div>
      <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 20 }}>
        Yangi mashina qo'shish uchun so'rov yuboring
      </div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onNew}
        style={{
          background: '#fa8c16', borderColor: '#fa8c16',
          borderRadius: 8, fontWeight: 600,
        }}
      >
        Mashina qo'shish
      </Button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((req) => {
          const cfg = STATUS_CFG[req.status]
          return (
            <div key={req.id} style={{
              borderRadius: 12,
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>
              {/* Status bar accent */}
              <div style={{ height: 3, background: cfg.color }} />

              <div style={{ padding: '14px 16px' }}>
                {/* Top row: plate + brand model, status badge */}
                <div style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 8,
                  marginBottom: 10,
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'monospace', fontWeight: 800, fontSize: 16,
                      color: '#fa8c16', marginBottom: 2,
                    }}>
                      🚗 {req.licensePlate}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: token.colorText }}>
                      {req.brand} {req.model} {req.year}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    color: cfg.color, fontSize: 12, fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {cfg.icon}
                    {cfg.label}
                  </div>
                </div>

                {/* Details row */}
                <div style={{
                  display: 'flex', gap: 20, flexWrap: 'wrap',
                  fontSize: 13, color: token.colorTextSecondary, marginBottom: 8,
                }}>
                  <span>
                    💰{' '}
                    <span style={{ fontWeight: 600, color: token.colorText }}>
                      {req.requestedDailyRate.toLocaleString()} so'm/kun
                    </span>
                  </span>
                  <span>
                    📅{' '}
                    {dayjs(req.createdAt).format('DD.MM.YYYY HH:mm')}
                  </span>
                  {req.color && (
                    <span>🎨 {req.color}</span>
                  )}
                </div>

                {/* Rejection reason */}
                {req.status === 'Rejected' && req.rejectionReason && (
                  <div style={{
                    marginTop: 8,
                    background: 'rgba(245,34,45,0.06)',
                    border: '1px solid rgba(245,34,45,0.2)',
                    borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, color: '#f5222d',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <CloseCircleFilled style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      <strong>Rad etish sababi: </strong>
                      {req.rejectionReason}
                    </span>
                  </div>
                )}

                {/* Approved note */}
                {req.status === 'Approved' && (
                  <div style={{
                    marginTop: 8,
                    background: 'rgba(82,196,26,0.06)',
                    border: '1px solid rgba(82,196,26,0.2)',
                    borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, color: '#52c41a',
                    display: 'flex', gap: 8, alignItems: 'center',
                  }}>
                    <CheckCircleFilled style={{ flexShrink: 0 }} />
                    <span>✅ Tasdiqlandi — mashina tizimga qo'shildi</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {(requests?.totalCount ?? 0) > pageSize && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={requests?.totalCount ?? 0}
            onChange={onChange}
            showSizeChanger
            showTotal={(total) => `Jami ${total} ta so'rov`}
          />
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function OwnerPortalPage() {
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.md

  const userId   = useAuthStore(s => s.userId)
  const fullName = useAuthStore(s => s.fullName)

  // My cars (approved, active)
  const [myCars, setMyCars]           = useState<any[]>([])
  const [carsLoading, setCarsLoading] = useState(false)

  // My listing requests
  const [requests, setRequests]               = useState<PaginatedResponse<CarListingDto> | null>(null)
  const [requestsLoading, setRequestsLoading] = useState(false)
  const { page, pageSize, onChange }          = usePagination()

  // Branches for form
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([])

  // New listing modal
  const [modalOpen, setModalOpen]               = useState(false)
  const [saving, setSaving]                     = useState(false)
  const [form]                                  = Form.useForm()
  const [selectedBrandId, setSelectedBrandId]   = useState<number | null>(null)

  // Lookups
  const { brands }    = useBrands()
  const { models }    = useModels(selectedBrandId)
  const { categories} = useCategories()
  const { fuelTypes } = useFuelTypes()

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchMyCars = useCallback(async () => {
    if (!userId) return
    setCarsLoading(true)
    try {
      const res = await api.get('/api/cars', { params: { ownerId: userId, pageSize: 100 } })
      setMyCars(res.data.items ?? [])
    } catch {
      setMyCars([])
    } finally {
      setCarsLoading(false)
    }
  }, [userId])

  const fetchRequests = useCallback(async () => {
    if (!userId) return
    setRequestsLoading(true)
    try {
      const res = await carListingsApi.getAll({ ownerId: userId, page, pageSize })
      setRequests(res.data)
    } finally {
      setRequestsLoading(false)
    }
  }, [userId, page, pageSize])

  // Fetch branches once
  useEffect(() => {
    api.get('/api/branches')
      .then(r => setBranches((Array.isArray(r.data) ? r.data : []).map((b: any) => ({ id: b.id, name: b.name }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchMyCars()
    fetchRequests()
  }, [fetchMyCars, fetchRequests])

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const openModal = () => {
    form.resetFields()
    setSelectedBrandId(null)
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!userId) return
    setSaving(true)
    try {
      await carListingsApi.create({
        brandId:          values.brandId,
        modelId:          values.modelId,
        year:             values.year,
        color:            values.color,
        licensePlate:     values.licensePlate,
        mileage:          values.mileage,
        expectedDailyRate: values.expectedDailyRate,
        description:      values.description || null,
      })
      message.success("✅ So'rovingiz yuborildi! Admin ko'rib chiqadi.")
      closeModal()
      fetchRequests()
    } catch (err) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background: 'linear-gradient(135deg,#1a0a00 0%,#7c3d00 55%,#fa8c16 100%)',
        padding: isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { s: 220, t: -80, r: -60, o: 0.07 } as any,
          { s: 140, t:  20, r: 140, o: 0.05 } as any,
          { s: 100, b: -40, l:  80, o: 0.07 } as any,
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: '#fff',
            width: c.s, height: c.s, opacity: c.o,
            top: c.t, right: c.r, bottom: c.b, left: c.l,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Title row */}
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            marginBottom: 20,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            {/* Glass icon box */}
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CarFilled style={{ fontSize: 28, color: '#fff' }} />
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0, fontSize: isMobile ? 22 : 28,
                fontWeight: 800, color: '#fff', lineHeight: 1.2,
              }}>
                Mening Mashinalarim
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                {fullName} · Owner portali
              </p>
            </div>

            {/* Stats chips — desktop only */}
            {!isMobile && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  padding: '8px 16px', borderRadius: 12, textAlign: 'center',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#ffd591', lineHeight: 1 }}>
                    {myCars.length}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    Faol mashina
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px', borderRadius: 12, textAlign: 'center',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#ffd591', lineHeight: 1 }}>
                    {requests?.totalCount ?? 0}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    So'rovlar
                  </div>
                </div>
              </div>
            )}

            {/* Add button */}
            <Button
              icon={<PlusOutlined />}
              size="large"
              onClick={openModal}
              style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.35)', color: '#fff',
                borderRadius: 10, fontWeight: 600, flexShrink: 0,
              }}
            >
              {isMobile ? '' : "Mashina qo'shish"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <Tabs
        defaultActiveKey="cars"
        size="large"
        items={[
          {
            key: 'cars',
            label: (
              <span>
                <CarFilled style={{ marginRight: 6 }} />
                Mashinalarim ({myCars.length})
              </span>
            ),
            children: (
              <MyCarsTab
                cars={myCars}
                loading={carsLoading}
                token={token}
                isMobile={isMobile}
              />
            ),
          },
          {
            key: 'requests',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6 }} />
                So'rovlarim ({requests?.totalCount ?? 0})
              </span>
            ),
            children: (
              <MyRequestsTab
                requests={requests}
                loading={requestsLoading}
                page={page}
                pageSize={pageSize}
                onChange={onChange}
                token={token}
                isMobile={isMobile}
                onNew={openModal}
              />
            ),
          },
        ]}
      />

      {/* ── NEW LISTING MODAL ── */}
      <Modal
        title={<span><PlusOutlined style={{ marginRight: 8 }} />Yangi mashina qo'shish so'rovi</span>}
        open={modalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        confirmLoading={saving}
        okText="So'rov yuborish"
        cancelText="Bekor"
        width={isMobile ? '95vw' : 600}
        forceRender
        styles={{ body: { paddingTop: 8 } }}
      >
        {/* Info alert */}
        <div style={{
          background: 'rgba(22,119,255,0.08)',
          border: '1px solid rgba(22,119,255,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: token.colorTextSecondary,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <InfoCircleOutlined style={{ marginTop: 2, color: '#1677ff', flexShrink: 0 }} />
          <span>
            So'rovingiz admin tomonidan ko'rib chiqiladi. Tasdiqlangandan so'ng mashina tizimga qo'shiladi.
          </span>
        </div>

        <Form form={form} layout="vertical" style={{ marginTop: 4 }}>
          {/* Brand → Model cascade */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}>
            <Form.Item name="brandId" label="Brend" rules={[{ required: true, message: 'Majburiy' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="BMW, Toyota..."
                size="large"
                options={brands.map(b => ({ value: b.id, label: b.name }))}
                onChange={(v: number) => {
                  setSelectedBrandId(v)
                  form.setFieldValue('modelId', undefined)
                }}
              />
            </Form.Item>
            <Form.Item name="modelId" label="Model" rules={[{ required: true, message: 'Majburiy' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Model tanlang"
                size="large"
                disabled={!selectedBrandId}
                options={models.map(m => ({ value: m.id, label: m.name }))}
              />
            </Form.Item>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}>
            <Form.Item name="categoryId" label="Kategoriya" rules={[{ required: true, message: 'Majburiy' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Sedan, SUV..."
                size="large"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item name="fuelTypeId" label="Yoqilg'i turi" rules={[{ required: true, message: 'Majburiy' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Benzin, Dizel..."
                size="large"
                options={fuelTypes.map(f => ({ value: f.id, label: f.name }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="branchId"
            label="Filial (ixtiyoriy — admin belgilaydi)"
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Filial tanlang"
              size="large"
              options={branches.map(b => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
            gap: 16,
          }}>
            <Form.Item name="year" label="Yil" rules={[{ required: true, message: 'Majburiy' }]}>
              <InputNumber
                min={1990}
                max={dayjs().year()}
                size="large"
                style={{ width: '100%' }}
                placeholder="2022"
              />
            </Form.Item>
            <Form.Item name="seatCount" label="O'rindiqlar" rules={[{ required: true, message: 'Majburiy' }]}>
              <InputNumber min={1} max={20} size="large" style={{ width: '100%' }} placeholder="5" />
            </Form.Item>
            <Form.Item name="mileage" label="Yurish (km)" rules={[{ required: true, message: 'Majburiy' }]}>
              <InputNumber min={0} size="large" style={{ width: '100%' }} placeholder="50000" />
            </Form.Item>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}>
            <Form.Item
              name="licensePlate"
              label="Davlat raqami"
              rules={[{ required: true, message: 'Majburiy' }]}
            >
              <Input
                placeholder="01A123BC"
                size="large"
                style={{ fontFamily: 'monospace', fontWeight: 700 }}
              />
            </Form.Item>
            <Form.Item name="color" label="Rang" rules={[{ required: true, message: 'Majburiy' }]}>
              <Input placeholder="Oq, Qora, Kulrang..." size="large" />
            </Form.Item>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}>
            <Form.Item
              name="transmissionType"
              label="Uzatmalar qutisi"
              rules={[{ required: true, message: 'Majburiy' }]}
            >
              <Select size="large" options={[
                { value: 'Manual',    label: '⚙️ Mexanik' },
                { value: 'Automatic', label: '🤖 Avtomat' },
              ]} />
            </Form.Item>
            <Form.Item
              name="expectedDailyRate"
              label="Talab qilinadigan kunlik narx (so'm)"
              rules={[{ required: true, message: 'Majburiy' }]}
            >
              <InputNumber
                min={0}
                size="large"
                style={{ width: '100%' }}
                placeholder="300000"
                addonAfter="so'm"
              />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Qo'shimcha ma'lumot (ixtiyoriy)">
            <Input.TextArea
              rows={3}
              placeholder="Mashina haqida qo'shimcha ma'lumot..."
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
