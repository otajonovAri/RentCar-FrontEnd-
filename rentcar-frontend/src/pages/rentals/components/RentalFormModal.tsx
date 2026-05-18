import { useState, useEffect } from 'react'
import { Modal, Form, Select, DatePicker, Input, Checkbox, message, Row, Col, Typography, Tag, Alert, Button, Spin } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, TagOutlined, CalendarFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import { rentalsApi } from '@/api/rentalsApi'
import { branchesApi } from '@/api/branchesApi'
import { driversApi } from '@/api/driversApi'
import { carsApi } from '@/api/carsApi'
import { promotionsApi } from '@/api/promotionsApi'
import { useRentalAddons } from '@/hooks/useLookups'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useThemeStore } from '@/store/themeStore'
import type { BranchDto } from '@/types/branches'
import type { DriverListItemDto } from '@/types/drivers'
import type { CarListItemDto } from '@/types/cars'
import type { PromotionDto } from '@/types/promotions'
import { format } from 'date-fns'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Oldindan tanlangan mashina ID (Customer flow uchun) */
  prefilledCarId?: number
  /** Mashina nomi — modal sarlavhasida ko'rsatish uchun */
  carLabel?: string
}

export default function RentalFormModal({ open, onClose, onSuccess, prefilledCarId, carLabel }: Props) {
  const isMobile = useIsMobile()
  const isDark   = useThemeStore((s) => s.isDark)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<BranchDto[]>([])
  const [drivers, setDrivers] = useState<DriverListItemDto[]>([])
  const [cars, setCars] = useState<CarListItemDto[]>([])
  const { addons } = useRentalAddons()

  // Promo validation
  const [promoInput,   setPromoInput]   = useState('')
  const [promoResult,  setPromoResult]  = useState<PromotionDto | null>(null)
  const [promoError,   setPromoError]   = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  useEffect(() => {
    branchesApi.getAll().then((r) => setBranches(r.data))
    driversApi.getAll().then((r) => setDrivers(r.data))
    carsApi.getAll({ page: 1, pageSize: 200 }).then((r) => setCars(r.data.items))
  }, [])

  useEffect(() => {
    if (open) {
      form.resetFields()
      setPromoInput('')
      setPromoResult(null)
      setPromoError('')
      if (prefilledCarId) {
        form.setFieldValue('carId', prefilledCarId)
      }
    }
  }, [open, form, prefilledCarId])

  const handleValidatePromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoLoading(true)
    setPromoResult(null)
    setPromoError('')
    try {
      const res = await promotionsApi.validate(code)
      setPromoResult(res.data)
      form.setFieldValue('promotionCode', code)
    } catch {
      setPromoError('Promokod yaroqsiz yoki muddati o\'tgan.')
      form.setFieldValue('promotionCode', null)
    } finally {
      setPromoLoading(false)
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      // Mobil: alohida startDate/endDate; Desktop: dateRange massivi
      let startDate: string
      let endDate: string
      if (isMobile) {
        startDate = format(values.startDate.toDate(), 'yyyy-MM-dd')
        endDate   = format(values.endDate.toDate(),   'yyyy-MM-dd')
      } else {
        startDate = format(values.dateRange[0].toDate(), 'yyyy-MM-dd')
        endDate   = format(values.dateRange[1].toDate(), 'yyyy-MM-dd')
      }

      await rentalsApi.create({
        carId: values.carId,
        startDate,
        endDate,
        pickupBranchId: values.pickupBranchId,
        returnBranchId: values.returnBranchId ?? null,
        driverId: values.driverId ?? null,
        promotionCode: values.promotionCode ?? null,
        addonIds: values.addonIds ?? [],
        notes: values.notes ?? null,
      })
      message.success('Ijara muvaffaqiyatli yaratildi!')
      onSuccess()
    } catch {
      message.error('Ijara yaratishda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = carLabel
    ? `Ijara qilish — ${carLabel}`
    : 'Yangi ijara yaratish'

  return (
    <Modal
      title={modalTitle}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Ijara qilish"
      cancelText="Bekor qilish"
      width={isMobile ? '100vw' : 620}
      style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? {
        body:    { maxHeight: 'calc(100dvh - 110px)', overflowY: 'auto', padding: '12px 16px' },
        content: { borderRadius: 0 },
      } : undefined}
      zIndex={1000}
      forceRender
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">
        {/* Mashina tanlash */}
        <Form.Item
          name="carId"
          label="Mashina"
          rules={[{ required: true, message: 'Mashinani tanlang' }]}
        >
          <Select
            showSearch
            placeholder="Mashina tanlang"
            disabled={!!prefilledCarId}
            optionFilterProp="label"
            style={{ width: '100%' }}
            options={cars.map((c) => ({
              value: c.id,
              label: `${c.brand} ${c.model} (${c.licensePlate})`,
              car: c,
            }))}
            optionRender={(opt) => {
              const c = (opt.data as { car: CarListItemDto }).car
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{c.brand} {c.model}</span>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{c.licensePlate}</Tag>
                    <Tag
                      color={c.status === 'Available' ? 'green' : c.status === 'Reserved' ? 'processing' : 'default'}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {c.dailyRate.toLocaleString()} so'm/kun
                    </Tag>
                  </span>
                </div>
              )
            }}
          />
        </Form.Item>

        {prefilledCarId && (
          <div style={{
            marginBottom: 16, padding: '8px 12px', borderRadius: 6,
            background: isDark ? '#162312' : '#f6ffed',
            border: `1px solid ${isDark ? '#274916' : '#b7eb8f'}`,
          }}>
            <Text style={{ color: '#52c41a', fontWeight: 500 }}>
              ✅ Tanlangan mashina: <strong>{carLabel ?? `ID: ${prefilledCarId}`}</strong>
            </Text>
          </div>
        )}

        {/* ── Sana tanlash: mobil → 2 alohida picker, desktop → RangePicker ── */}
        {isMobile ? (
          <div style={{
            background:   isDark ? '#111a2c' : '#f6f8ff',
            border:       `1px solid ${isDark ? '#1d3461' : '#d0e4ff'}`,
            borderRadius: 12,
            padding:      '12px 14px',
            marginBottom: 16,
          }}>
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              marginBottom: 10,
              fontWeight:   600,
              fontSize:     13,
              color:        '#1677ff',
            }}>
              <CalendarFilled />
              Ijara muddati
            </div>

            <Form.Item
              name="startDate"
              label="Boshlanish sanasi"
              rules={[{ required: true, message: 'Boshlanish sanasini tanlang' }]}
              style={{ marginBottom: 10 }}
            >
              <DatePicker
                style={{ width: '100%', borderRadius: 10 }}
                size="large"
                disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
                format="DD.MM.YYYY"
                placeholder="Kun tanlang"
                inputReadOnly
                getPopupContainer={() => document.body}
                popupStyle={{ zIndex: 2000 }}
                onChange={() => {
                  const end   = form.getFieldValue('endDate')
                  const start = form.getFieldValue('startDate')
                  if (end && start && end.isBefore(start, 'day')) {
                    form.setFieldValue('endDate', null)
                  }
                }}
              />
            </Form.Item>

            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              margin:         '4px 0',
              color:          '#1677ff',
              fontSize:       18,
            }}>↓</div>

            <Form.Item
              name="endDate"
              label="Tugash sanasi"
              rules={[
                { required: true, message: 'Tugash sanasini tanlang' },
                {
                  validator: (_, value) => {
                    const start = form.getFieldValue('startDate')
                    if (value && start && value.isBefore(start, 'day')) {
                      return Promise.reject('Tugash sanasi boshlanishdan keyin bo\'lishi kerak')
                    }
                    return Promise.resolve()
                  },
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                style={{ width: '100%', borderRadius: 10 }}
                size="large"
                disabledDate={(d) => {
                  if (d && d.isBefore(dayjs(), 'day')) return true
                  const start = form.getFieldValue('startDate')
                  if (d && start && d.isBefore(start, 'day')) return true
                  return false
                }}
                format="DD.MM.YYYY"
                placeholder="Kun tanlang"
                inputReadOnly
                getPopupContainer={() => document.body}
                popupStyle={{ zIndex: 2000 }}
              />
            </Form.Item>
          </div>
        ) : (
          <Form.Item
            name="dateRange"
            label="Ijara muddati (boshlanish — tugash)"
            rules={[{ required: true, message: 'Ijara muddatini tanlang' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
              format="DD.MM.YYYY"
              placeholder={['Boshlanish sanasi', 'Tugash sanasi']}
              needConfirm={false}
              getPopupContainer={() => document.body}
              popupStyle={{ zIndex: 2000 }}
            />
          </Form.Item>
        )}

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="pickupBranchId" label="Qabul filiali" rules={[{ required: true, message: 'Filialni tanlang' }]}>
              <Select placeholder="Filialni tanlang" showSearch optionFilterProp="children">
                {branches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="returnBranchId" label="Qaytarish filiali (ixtiyoriy)">
              <Select placeholder="Qabul bilan bir xil bo'lsa bo'sh qoldiring" allowClear showSearch optionFilterProp="children">
                {branches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="driverId" label="Haydovchi (ixtiyoriy)">
              <Select placeholder="Haydovchi tanlang" allowClear showSearch optionFilterProp="children">
                {drivers.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.fullName} — {d.dailyRate.toLocaleString()} so'm/kun
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            {/* Hidden field — validated code saqlanadi */}
            <Form.Item name="promotionCode" hidden><Input /></Form.Item>
            <Form.Item label="Promokod (ixtiyoriy)">
              <Input.Search
                placeholder="SUMMER10"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase())
                  if (promoResult || promoError) {
                    setPromoResult(null)
                    setPromoError('')
                    form.setFieldValue('promotionCode', null)
                  }
                }}
                onSearch={handleValidatePromo}
                onPressEnter={handleValidatePromo}
                enterButton={
                  promoLoading
                    ? <Spin size="small" />
                    : <Button type="primary">Tekshir</Button>
                }
                style={{ fontFamily: 'monospace' }}
                allowClear
                onClear={() => {
                  setPromoInput('')
                  setPromoResult(null)
                  setPromoError('')
                  form.setFieldValue('promotionCode', null)
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Promo natija */}
        {promoResult && (
          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <span>
                <Tag color="green" icon={<TagOutlined />} style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {promoResult.code}
                </Tag>
                {' '}—{' '}
                <strong>
                  {promoResult.discountType === 'Percentage'
                    ? `${promoResult.discountValue}% chegirma`
                    : `${promoResult.discountValue.toLocaleString()} so'm chegirma`}
                </strong>
              </span>
            }
            description={
              <span style={{ fontSize: 12 }}>
                {promoResult.description && <span>{promoResult.description} · </span>}
                {promoResult.minRentalAmount
                  ? `Min. summa: ${promoResult.minRentalAmount.toLocaleString()} so'm · `
                  : ''}
                Muddati: {new Date(promoResult.validTo).toLocaleDateString('uz-UZ')} gacha
                {promoResult.maxUses
                  ? ` · ${promoResult.usedCount}/${promoResult.maxUses} marta ishlatilgan`
                  : ''}
              </span>
            }
          />
        )}
        {promoError && (
          <Alert
            type="error"
            icon={<CloseCircleOutlined />}
            showIcon
            message={promoError}
            style={{ marginBottom: 16 }}
          />
        )}

        {addons.length > 0 && (
          <Form.Item name="addonIds" label="Qo'shimcha xizmatlar">
            <Checkbox.Group>
              <Row gutter={[8, 8]}>
                {addons.map((a) => (
                  <Col xs={24} sm={12} key={a.id}>
                    <Checkbox value={a.id}>
                      {a.name} ({a.dailyPrice.toLocaleString()} so'm/kun)
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        )}

        <Form.Item name="notes" label="Izoh (ixtiyoriy)">
          <Input.TextArea rows={2} placeholder="Qo'shimcha ma'lumot..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
