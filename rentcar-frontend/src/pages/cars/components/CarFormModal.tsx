import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, InputNumber, Row, Col, message, Divider } from 'antd'
import { carsApi } from '@/api/carsApi'
import type { CarDetailDto } from '@/types/cars'
import { TRANSMISSION_INT } from '@/types/cars'
import { useBrands, useModels, useCategories, useFuelTypes, useCarFeatures } from '@/hooks/useLookups'
import { useIsMobile } from '@/hooks/useIsMobile'
import { branchesApi } from '@/api/branchesApi'
import type { BranchDto } from '@/types/branches'
import { getApiError } from '@/utils/apiError'

interface Props {
  open: boolean
  car: CarDetailDto | null   // null = yangi qo'shish, not null = tahrirlash
  onClose: () => void
  onSuccess: () => void
}

// Transmissiya tanlash uchun — value = integer (backend kutadi)
const TRANSMISSIONS = [
  { value: TRANSMISSION_INT.Manual,        label: 'Mexanik (Manual)' },
  { value: TRANSMISSION_INT.Automatic,     label: 'Avtomat (Automatic)' },
  { value: TRANSMISSION_INT.SemiAutomatic, label: 'Yarim avtomat (SemiAutomatic)' },
]

export default function CarFormModal({ open, car, onClose, onSuccess }: Props) {
  const isMobile = useIsMobile()
  const [form]          = Form.useForm()
  const [loading, setLoading]             = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null)
  const [branches, setBranches]           = useState<BranchDto[]>([])

  const { brands }     = useBrands()
  const { models }     = useModels(selectedBrand)
  const { categories } = useCategories()
  const { fuelTypes }  = useFuelTypes()
  const { carFeatures: features } = useCarFeatures()

  // Filiallar bir marta yuklanadi
  useEffect(() => {
    branchesApi.getAll().then((r) => setBranches(r.data))
  }, [])

  // Modal ochilganda / car o'zgarganda formni to'ldirish
  useEffect(() => {
    if (!open) return

    if (car) {
      // ─── Tahrirlash: mavjud qiymatlarni set qilish ───────────────────
      setSelectedBrand(null) // Edit da brand/model o'zgarmaydi
      form.setFieldsValue({
        color:       car.color,
        mileage:     car.mileage,
        dailyRate:   car.dailyRate,
        description: car.description ?? '',
        // branchId ni CarDetailDto da yo'q, branchName bor — shuning uchun undefined
      })
    } else {
      // ─── Yangi qo'shish: formni tozalash ─────────────────────────────
      form.resetFields()
      setSelectedBrand(null)
    }
  }, [open, car, form])

  // ─── Saqlash ──────────────────────────────────────────────────────────
  const handleOk = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      if (car) {
        // Tahrirlash — faqat o'zgartirilishi mumkin bo'lgan maydonlar
        await carsApi.update(car.id, {
          color:       values.color,
          mileage:     values.mileage,
          dailyRate:   values.dailyRate,
          description: values.description ?? null,
          branchId:    values.branchId,
        })
        message.success('Mashina muvaffaqiyatli yangilandi')
      } else {
        // Yangi qo'shish — transmissionType ni integer ga aylantirish
        await carsApi.create({
          brandId:          values.brandId,
          modelId:          values.modelId,
          categoryId:       values.categoryId,
          fuelTypeId:       values.fuelTypeId,
          branchId:         values.branchId,
          year:             values.year,
          licensePlate:     values.licensePlate,
          color:            values.color,
          seatCount:        values.seatCount,
          mileage:          values.mileage,
          dailyRate:        values.dailyRate,
          transmissionType: values.transmissionType,   // ← allaqachon integer (Select value)
          description:      values.description ?? null,
          featureIds:       values.featureIds ?? [],
        })
        message.success("Mashina muvaffaqiyatli qo'shildi")
      }
      onSuccess()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally {
      setLoading(false)
    }
  }

  const numFormatter = (v: number | undefined) =>
    v !== undefined ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''

  return (
    <Modal
      title={car ? `Mashina tahrirlash — ${car.brand} ${car.model}` : "Yangi mashina qo'shish"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Saqlash"
      cancelText="Bekor"
      width={isMobile ? '95vw' : 700}
      forceRender
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">

        {/* ── Yangi qo'shishda ko'rinadigan maydonlar ─────────────────── */}
        {!car && (
          <>
            <Divider orientation="left" plain style={{ fontSize: 13 }}>Asosiy ma'lumotlar</Divider>

            {/* Brend & Model */}
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="brandId"
                  label="Brend"
                  rules={[{ required: true, message: 'Brendni tanlang' }]}
                >
                  <Select
                    placeholder="BMW, Toyota..."
                    showSearch
                    optionFilterProp="children"
                    onChange={(v: number) => {
                      setSelectedBrand(v)
                      form.setFieldValue('modelId', undefined)
                    }}
                  >
                    {brands.map((b) => (
                      <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="modelId"
                  label="Model"
                  rules={[{ required: true, message: 'Modelni tanlang' }]}
                >
                  <Select
                    placeholder={selectedBrand ? 'Modelni tanlang' : 'Avval brendni tanlang'}
                    disabled={!selectedBrand}
                    showSearch
                    optionFilterProp="children"
                  >
                    {models.map((m) => (
                      <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Kategoriya, Yoqilg'i, Transmissiya */}
            <Row gutter={12}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="categoryId"
                  label="Kategoriya"
                  rules={[{ required: true, message: 'Kategoriyani tanlang' }]}
                >
                  <Select placeholder="Sedan, SUV...">
                    {categories.map((c) => (
                      <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="fuelTypeId"
                  label="Yoqilg'i turi"
                  rules={[{ required: true, message: 'Yoqilg\'i turini tanlang' }]}
                >
                  <Select placeholder="Benzin, Dizel...">
                    {fuelTypes.map((f) => (
                      <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="transmissionType"
                  label="Transmissiya"
                  rules={[{ required: true, message: 'Transmissiyani tanlang' }]}
                >
                  <Select placeholder="Tanlang">
                    {TRANSMISSIONS.map((t) => (
                      <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Raqam, Yil, O'rindiq */}
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item
                  name="licensePlate"
                  label="Davlat raqami"
                  rules={[
                    { required: true, message: 'Davlat raqamini kiriting' },
                    { pattern: /^[0-9]{2}[A-Z]{1}[0-9]{3}[A-Z]{2}$/, message: "Format: 01A123BC" },
                  ]}
                >
                  <Input
                    placeholder="01A123BC"
                    style={{ textTransform: 'uppercase' }}
                    onChange={(e) =>
                      form.setFieldValue('licensePlate', e.target.value.toUpperCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={7}>
                <Form.Item
                  name="year"
                  label="Ishlab chiqarilgan yil"
                  rules={[{ required: true, message: 'Yilni kiriting' }]}
                >
                  <InputNumber
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    style={{ width: '100%' }}
                    placeholder="2022"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={7}>
                <Form.Item
                  name="seatCount"
                  label="O'rindiqlar soni"
                  rules={[{ required: true, message: "O'rindiqlar sonini kiriting" }]}
                >
                  <InputNumber min={2} max={50} style={{ width: '100%' }} placeholder="5" />
                </Form.Item>
              </Col>
            </Row>

            {/* Xususiyatlar */}
            <Form.Item name="featureIds" label="Xususiyatlar (ixtiyoriy)">
              <Select
                mode="multiple"
                placeholder="Konditsioner, GPS, Bluetooth..."
                optionFilterProp="children"
              >
                {features.map((f) => (
                  <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* ── Har ikki holatda ko'rinadigan maydonlar ──────────────────── */}
        <Divider orientation="left" plain style={{ fontSize: 13 }}>
          {car ? 'O\'zgartirilishi mumkin bo\'lgan maydonlar' : "Qo'shimcha ma'lumotlar"}
        </Divider>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="color"
              label="Rang"
              rules={[{ required: true, message: 'Rangni kiriting' }]}
            >
              <Input placeholder="Oq, Qora, Kumush..." />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="mileage"
              label="Probeg (km)"
              rules={[{ required: true, message: 'Probegni kiriting' }]}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                formatter={numFormatter}
                placeholder="50,000"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="dailyRate"
              label="Kunlik ijara narxi (so'm)"
              rules={[{ required: true, message: 'Kunlik narxni kiriting' }]}
            >
              <InputNumber
                min={0}
                step={10000}
                style={{ width: '100%' }}
                formatter={numFormatter}
                placeholder="150,000"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="branchId"
              label="Filial"
              rules={[{ required: true, message: 'Filialni tanlang' }]}
            >
              <Select placeholder="Toshkent — Chilonzor...">
                {branches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Tavsif (ixtiyoriy)">
          <Input.TextArea
            rows={3}
            placeholder="Mashina holati, xususiyatlari haqida qo'shimcha ma'lumot..."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
