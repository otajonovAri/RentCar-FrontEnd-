import { useEffect, useState } from 'react'
import {
  Drawer, Image, Space, Button, Popconfirm,
  message, Divider, Upload, Spin, theme,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, StarOutlined,
  ShoppingCartOutlined, LoadingOutlined, CalendarOutlined,
  CarOutlined, DashboardOutlined, TeamOutlined,
  ThunderboltOutlined, ToolOutlined, EnvironmentOutlined,
  TagOutlined, CheckCircleFilled, CloseOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { carsApi } from '@/api/carsApi'
import { uploadImage } from '@/api/uploadApi'
import type { CarDetailDto, CarImage } from '@/types/cars'
import StatusBadge from '@/components/shared/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import RentalFormModal from '@/pages/rentals/components/RentalFormModal'
import ReservationFormModal from '@/pages/reservations/components/ReservationFormModal'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  carId: number | null
  onClose: () => void
  onSuccess: () => void
}

export default function CarDetailDrawer({ carId, onClose, onSuccess }: Props) {
  const isMobile   = useIsMobile()
  const { token }  = theme.useToken()
  const isDark     = useThemeStore(s => s.isDark)

  const [car,       setCar]       = useState<CarDetailDto | null>(null)
  const [carImages, setCarImages] = useState<CarImage[]>([])
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rentalModalOpen,      setRentalModalOpen]      = useState(false)
  const [reservationModalOpen, setReservationModalOpen] = useState(false)

  const { hasRole, role } = useAuthStore()
  const canEdit     = hasRole(['Admin', 'SuperAdmin', 'Manager', 'Owner'])
  const canRent     = role === 'Customer' || role === 'Owner'
  const isAvailable = car?.status === 'Available'

  const mainImage = carImages.find(i => i.isMain) ?? carImages[0]

  // ── theme-aware colours ─────────────────────────────────────────────────────
  const bg        = isDark ? token.colorBgContainer      : '#ffffff'
  const bgSub     = isDark ? token.colorBgElevated       : '#f7f8fa'
  const bgCard    = isDark ? token.colorFillSecondary    : '#f0f5ff'
  const border    = isDark ? token.colorBorderSecondary  : '#e8edf5'
  const textMain  = token.colorText
  const textSub   = token.colorTextSecondary
  const textMuted = token.colorTextTertiary
  const primary   = token.colorPrimary

  const reloadCar = async (id: number) => {
    const [carRes, imgsRes] = await Promise.all([
      carsApi.getById(id),
      carsApi.getImages(id).catch(() => ({ data: [] as CarImage[] })),
    ])
    setCar(carRes.data)
    setCarImages(imgsRes.data)
  }

  useEffect(() => {
    if (!carId) { setCar(null); setCarImages([]); return }
    setLoading(true)
    Promise.all([
      carsApi.getById(carId),
      carsApi.getImages(carId).catch(() => ({ data: [] as CarImage[] })),
    ])
      .then(([carRes, imgsRes]) => { setCar(carRes.data); setCarImages(imgsRes.data) })
      .catch(() => message.error("Mashina ma'lumotlarini olishda xatolik"))
      .finally(() => setLoading(false))
  }, [carId])

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess: done, onError }) => {
    if (!carId) return
    setUploading(true)
    try {
      const result = await uploadImage(file as File)
      await carsApi.addImage(carId, { url: result.url, isMain: carImages.length === 0, displayOrder: carImages.length + 1 })
      message.success('Rasm muvaffaqiyatli yuklandi!')
      await reloadCar(carId); onSuccess(); done?.('ok')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rasm yuklashda xatolik'
      message.error(msg); onError?.(new Error(msg))
    } finally { setUploading(false) }
  }

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      message.error('Faqat JPG, PNG, WebP yoki GIF yuklanadi!'); return Upload.LIST_IGNORE
    }
    if (file.size / 1024 / 1024 >= 5) {
      message.error("Rasm 5 MB dan kichik bo'lishi kerak!"); return Upload.LIST_IGNORE
    }
    return true
  }

  const handleSetMain = async (imageId: number) => {
    if (!carId) return
    try { await carsApi.setMainImage(carId, imageId); message.success("Asosiy rasm o'zgartirildi"); await reloadCar(carId); onSuccess() }
    catch { message.error("Rasmni o'zgartirishda xatolik") }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!carId) return
    try { await carsApi.deleteImage(carId, imageId); message.success("Rasm o'chirildi"); await reloadCar(carId); onSuccess() }
    catch { message.error("Rasmni o'chirishda xatolik") }
  }

  const carLabel = car ? `${car.brand} ${car.model} (${car.year})` : ''
  const features = car?.features ?? []

  return (
    <>
      <Drawer
        open={!!carId}
        onClose={onClose}
        width={isMobile ? '100vw' : 540}
        loading={loading}
        styles={{
          body:    { padding: 0, background: bg, display: 'flex', flexDirection: 'column' },
          wrapper: { boxShadow: isDark ? '0 0 40px rgba(0,0,0,0.6)' : '0 0 40px rgba(0,0,0,0.12)' },
        }}
        closable={false}
        title={null}
      >
        {car && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '100%', height: 210, overflow: 'hidden', background: isDark ? '#0a0a0f' : '#111827' }}>
                {mainImage ? (
                  <img src={mainImage.url} alt={carLabel}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CarOutlined style={{ fontSize: 72, color: 'rgba(255,255,255,0.12)' }} />
                  </div>
                )}
                {/* bottom gradient */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 110,
                  background: 'linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 100%)',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Close btn */}
              <button onClick={onClose} style={{
                position: 'absolute', top: 12, right: 12,
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none',
                color: '#fff', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)',
              }}>
                <CloseOutlined />
              </button>

              {/* Status */}
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <StatusBadge status={car.status} />
              </div>

              {/* Title */}
              <div style={{ position: 'absolute', bottom: 14, left: 18, right: 50 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.25, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                  {car.brand} {car.model}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{car.year}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', display: 'inline-block' }} />
                  <span>{car.licensePlate}</span>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ──────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 28px' }}>

              {/* ── Stat cards 2×2 ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Kunlik narx', value: car.dailyRate.toLocaleString(), unit: "so'm",  icon: '💰' },
                  { label: 'Probeg',       value: `${car.mileage.toLocaleString()}`, unit: 'km', icon: '🛣️' },
                  { label: "O'rindiqlar",  value: `${car.seatCount}`,               unit: 'ta', icon: '💺' },
                  { label: 'Ishlab chiqarilgan yili', value: `${car.year}`,          unit: '',   icon: '📅' },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: bgCard,
                    border: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: textMain, lineHeight: 1 }}>
                        {s.value}
                        {s.unit && <span style={{ fontSize: 11, fontWeight: 500, color: textSub, marginLeft: 3 }}>{s.unit}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Filial card ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                background: isDark
                  ? `rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.12)`
                  : '#e6f4ff',
                border: `1px solid ${isDark ? 'rgba(22,119,255,0.25)' : 'rgba(22,119,255,0.2)'}`,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EnvironmentOutlined style={{ color: '#fff', fontSize: 17 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: isDark ? 'rgba(22,119,255,0.8)' : '#1677ff', fontWeight: 600, marginBottom: 2 }}>
                    Filial joylashuvi
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: textMain }}>
                    {car.branchName}
                  </div>
                </div>
              </div>

              {/* ── Info rows ── */}
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${border}`,
                marginBottom: 16,
              }}>
                {[
                  { icon: <TagOutlined />,           label: 'Davlat raqami',  value: car.licensePlate },
                  { icon: <CarOutlined />,            label: 'Kategoriya',     value: car.category },
                  { icon: <ThunderboltOutlined />,    label: "Yoqilg'i",       value: car.fuelType },
                  { icon: <ToolOutlined />,           label: 'Transmissiya',   value: car.transmissionType },
                  { icon: <DashboardOutlined />,      label: 'Rang',           value: car.color },
                  { icon: <TeamOutlined />,           label: "Sig'im",         value: `${car.seatCount} o'rindiq` },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: i % 2 === 0 ? bg : bgSub,
                    borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: textMuted, fontSize: 13 }}>
                      <span style={{ fontSize: 14 }}>{row.icon}</span>
                      {row.label}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: textMain, maxWidth: '55%', textAlign: 'right' }}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Description ── */}
              {car.description && (
                <div style={{
                  padding: '12px 14px', borderRadius: 12, marginBottom: 16,
                  background: bgSub, border: `1px solid ${border}`,
                  fontSize: 13, color: textSub, lineHeight: 1.7,
                }}>
                  <div style={{ fontWeight: 700, color: textMain, marginBottom: 5, fontSize: 13 }}>📝 Tavsif</div>
                  {car.description}
                </div>
              )}

              {/* ── Features ── */}
              {features.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 8 }}>
                    ✨ Xususiyatlar
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {features.map(f => (
                      <span key={f} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 11px', borderRadius: 20,
                        background: isDark ? 'rgba(22,119,255,0.12)' : '#e6f4ff',
                        border: `1px solid ${isDark ? 'rgba(22,119,255,0.25)' : 'rgba(22,119,255,0.2)'}`,
                        fontSize: 12, color: primary, fontWeight: 500,
                      }}>
                        <CheckCircleFilled style={{ fontSize: 10 }} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Divider style={{ margin: '14px 0', borderColor: border }} />

              {/* ── Gallery ── */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 10 }}>
                  🖼️ Rasmlar
                  <span style={{ color: textMuted, fontWeight: 400, marginLeft: 5 }}>({carImages.length})</span>
                </div>

                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {carImages.map(img => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <div style={{
                          width: 96, height: 72, borderRadius: 10, overflow: 'hidden',
                          border: img.isMain
                            ? `2.5px solid ${primary}`
                            : `1.5px solid ${border}`,
                          boxShadow: img.isMain ? `0 0 0 3px ${isDark ? 'rgba(22,119,255,0.2)' : 'rgba(22,119,255,0.12)'}` : 'none',
                        }}>
                          <Image
                            src={img.url} width={96} height={72}
                            style={{ objectFit: 'cover', display: 'block' }}
                            preview={{ mask: <span style={{ fontSize: 11 }}>Ko'rish</span> }}
                          />
                        </div>
                        {img.isMain && (
                          <span style={{
                            position: 'absolute', top: -7, left: -2,
                            background: primary, color: '#fff',
                            fontSize: 9, fontWeight: 700,
                            padding: '2px 7px', borderRadius: 6,
                          }}>
                            ASOSIY
                          </span>
                        )}
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 5, justifyContent: 'center' }}>
                            {!img.isMain && (
                              <button
                                onClick={() => handleSetMain(img.id)}
                                title="Asosiy qilish"
                                style={{
                                  padding: '3px 8px', borderRadius: 6, fontSize: 11,
                                  border: `1px solid ${border}`,
                                  background: bg, color: textSub,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                                }}
                              >
                                <StarOutlined style={{ fontSize: 10 }} />
                              </button>
                            )}
                            <Popconfirm
                              title="Rasmni o'chirishni tasdiqlaysizmi?"
                              onConfirm={() => handleDeleteImage(img.id)}
                              okText="Ha" cancelText="Yo'q"
                            >
                              <button style={{
                                padding: '3px 8px', borderRadius: 6,
                                border: '1px solid rgba(255,77,79,0.35)',
                                background: isDark ? 'rgba(255,77,79,0.1)' : 'rgba(255,77,79,0.05)',
                                color: '#ff4d4f', cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                              }}>
                                <DeleteOutlined style={{ fontSize: 10 }} />
                              </button>
                            </Popconfirm>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Upload */}
                    {canEdit && (
                      <Upload
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        showUploadList={false}
                        customRequest={handleUpload}
                        beforeUpload={beforeUpload}
                        disabled={uploading}
                      >
                        <div style={{
                          width: 96, height: 72, borderRadius: 10,
                          border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.2)' : '#d0d7e3'}`,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          color: textMuted, fontSize: 11, gap: 4,
                          background: bgSub,
                          transition: 'border-color 0.2s, color 0.2s',
                        }}>
                          {uploading
                            ? <Spin indicator={<LoadingOutlined style={{ fontSize: 18 }} />} />
                            : <><PlusOutlined style={{ fontSize: 18 }} /><span>Qo'shish</span></>
                          }
                        </div>
                      </Upload>
                    )}
                  </div>
                </Image.PreviewGroup>
              </div>

              {/* ── Customer bottom actions ── */}
              {canRent && isAvailable && (
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button size="large" block icon={<CalendarOutlined />}
                    onClick={() => setReservationModalOpen(true)}>
                    Bron qilish (Rezervatsiya)
                  </Button>
                  <Button type="primary" size="large" block icon={<ShoppingCartOutlined />}
                    onClick={() => setRentalModalOpen(true)}>
                    Hozir ijaraga olish
                  </Button>
                </Space>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {car && (
        <RentalFormModal
          open={rentalModalOpen}
          onClose={() => setRentalModalOpen(false)}
          onSuccess={() => { setRentalModalOpen(false); onClose(); onSuccess() }}
          prefilledCarId={car.id} carLabel={carLabel}
        />
      )}
      {car && (
        <ReservationFormModal
          open={reservationModalOpen}
          onClose={() => setReservationModalOpen(false)}
          onSuccess={() => { setReservationModalOpen(false); onClose(); onSuccess() }}
          prefilledCarId={car.id} carLabel={carLabel}
        />
      )}
    </>
  )
}
