import { useEffect, useState } from 'react'
import {
  Drawer, Tag, Image, Space, Button, Popconfirm,
  message, Divider, Upload, Spin,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, StarOutlined,
  ShoppingCartOutlined, LoadingOutlined, CalendarOutlined,
  CarOutlined, DashboardOutlined, TeamOutlined,
  ThunderboltOutlined, ToolOutlined, EnvironmentOutlined,
  TagOutlined, CheckCircleFilled,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { carsApi } from '@/api/carsApi'
import { uploadImage } from '@/api/uploadApi'
import type { CarDetailDto, CarImage } from '@/types/cars'
import StatusBadge from '@/components/shared/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import RentalFormModal from '@/pages/rentals/components/RentalFormModal'
import ReservationFormModal from '@/pages/reservations/components/ReservationFormModal'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  carId: number | null
  onClose: () => void
  onSuccess: () => void
}

// ── small helper ─────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      justifyContent:'space-between',
      padding:       '10px 14px',
      borderRadius:  10,
      background:    highlight ? 'rgba(22,119,255,0.04)' : '#fafafa',
      border:        highlight ? '1px solid rgba(22,119,255,0.15)' : '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8c8c8c', fontSize: 13 }}>
        <span style={{ fontSize: 15, color: highlight ? '#1677ff' : '#595959' }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, color: highlight ? '#1677ff' : '#262626' }}>
        {value}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{
      flex:         1,
      minWidth:     0,
      padding:      '12px 14px',
      borderRadius: 12,
      background:   '#fff',
      border:       '1px solid #f0f0f0',
      boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
      textAlign:    'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1677ff', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 1 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 3 }}>{label}</div>
    </div>
  )
}

export default function CarDetailDrawer({ carId, onClose, onSuccess }: Props) {
  const isMobile = useIsMobile()
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

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess: done, onError }) => {
    if (!carId) return
    setUploading(true)
    try {
      const result = await uploadImage(file as File)
      await carsApi.addImage(carId, { url: result.url, isMain: carImages.length === 0, displayOrder: carImages.length + 1 })
      message.success('Rasm muvaffaqiyatli yuklandi!')
      await reloadCar(carId)
      onSuccess()
      done?.('ok')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rasm yuklashda xatolik'
      message.error(msg)
      onError?.(new Error(msg))
    } finally {
      setUploading(false)
    }
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
        title={null}
        open={!!carId}
        onClose={onClose}
        width={isMobile ? '100vw' : 560}
        loading={loading}
        styles={{ body: { padding: 0 }, header: { display: 'none' } }}
        closable={false}
      >
        {car && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ── Hero image + header ─────────────────────────────────────── */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {/* Hero image */}
              <div style={{
                width: '100%', height: 220, overflow: 'hidden',
                background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
              }}>
                {mainImage ? (
                  <img
                    src={mainImage.url}
                    alt={carLabel}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CarOutlined style={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                )}
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 100,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                }} />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)', border: 'none',
                  color: '#fff', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                ✕
              </button>

              {/* Status badge on image */}
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <StatusBadge status={car.status} />
              </div>

              {/* Title over image */}
              <div style={{
                position: 'absolute', bottom: 14, left: 16, right: 16,
              }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  {car.brand} {car.model}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
                  {car.year} · {car.licensePlate}
                </div>
              </div>
            </div>

            {/* ── Scrollable body ─────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px' }}>

              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <StatCard label="Kunlik narx"  value={`${car.dailyRate.toLocaleString()}`} sub="so'm" />
                <StatCard label="Probeg"        value={`${(car.mileage / 1000).toFixed(0)}k`} sub="km" />
                <StatCard label="O'rindiq"      value={car.seatCount} sub="ta" />
                <StatCard label="Yil"            value={car.year} />
              </div>

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <InfoRow icon={<TagOutlined />}         label="Davlat raqami"  value={car.licensePlate} />
                <InfoRow icon={<CarOutlined />}          label="Kategoriya"     value={car.category} />
                <InfoRow icon={<ThunderboltOutlined />}  label="Yoqilg'i"       value={car.fuelType} />
                <InfoRow icon={<ToolOutlined />}         label="Transmissiya"   value={car.transmissionType} />
                <InfoRow icon={<DashboardOutlined />}    label="Rang"           value={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: car.color.toLowerCase(),
                      border: '1px solid #d9d9d9', flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    {car.color}
                  </span>
                } />
                <InfoRow icon={<TeamOutlined />}         label="Sig'im"         value={`${car.seatCount} o'rindiq`} />
                <InfoRow icon={<EnvironmentOutlined />}  label="Filial"         value={car.branchName} highlight />
              </div>

              {/* Description */}
              {car.description && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: '#fafafa', border: '1px solid #f0f0f0',
                  fontSize: 13, color: '#595959', lineHeight: 1.7,
                  marginBottom: 18,
                }}>
                  <div style={{ fontWeight: 600, color: '#262626', marginBottom: 4 }}>Tavsif</div>
                  {car.description}
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#262626', marginBottom: 8 }}>
                    Xususiyatlar
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {features.map(f => (
                      <span key={f} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 20,
                        background: 'rgba(22,119,255,0.07)',
                        border: '1px solid rgba(22,119,255,0.2)',
                        fontSize: 12, color: '#1677ff', fontWeight: 500,
                      }}>
                        <CheckCircleFilled style={{ fontSize: 10 }} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Divider style={{ margin: '14px 0' }} />

              {/* Gallery */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#262626', marginBottom: 10 }}>
                  Rasmlar <span style={{ color: '#8c8c8c', fontWeight: 400 }}>({carImages.length})</span>
                </div>

                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {carImages.map(img => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <div style={{
                          width: 100, height: 75, borderRadius: 10, overflow: 'hidden',
                          border: img.isMain ? '2.5px solid #1677ff' : '1.5px solid #e8e8e8',
                          boxShadow: img.isMain ? '0 0 0 2px rgba(22,119,255,0.15)' : 'none',
                        }}>
                          <Image
                            src={img.url}
                            width={100}
                            height={75}
                            style={{ objectFit: 'cover', display: 'block' }}
                            preview={{ mask: <span style={{ fontSize: 11 }}>Ko'rish</span> }}
                          />
                        </div>
                        {img.isMain && (
                          <span style={{
                            position: 'absolute', top: -6, left: -6,
                            background: '#1677ff', color: '#fff',
                            fontSize: 9, fontWeight: 700,
                            padding: '2px 6px', borderRadius: 6,
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
                                  padding: '3px 7px', borderRadius: 6, fontSize: 11,
                                  border: '1px solid #d9d9d9', background: '#fff',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
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
                                padding: '3px 7px', borderRadius: 6, fontSize: 11,
                                border: '1px solid rgba(255,77,79,0.3)',
                                background: 'rgba(255,77,79,0.05)',
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

                    {/* Upload button */}
                    {canEdit && (
                      <Upload
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        showUploadList={false}
                        customRequest={handleUpload}
                        beforeUpload={beforeUpload}
                        disabled={uploading}
                      >
                        <div style={{
                          width: 100, height: 75, borderRadius: 10,
                          border: '1.5px dashed #d9d9d9',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          color: '#bfbfbf', fontSize: 11, gap: 4,
                          background: '#fafafa',
                          transition: 'border-color 0.2s, color 0.2s',
                        }}
                          onMouseEnter={e => {
                            if (!uploading) {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#1677ff'
                              ;(e.currentTarget as HTMLDivElement).style.color = '#1677ff'
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#d9d9d9'
                            ;(e.currentTarget as HTMLDivElement).style.color = '#bfbfbf'
                          }}
                        >
                          {uploading
                            ? <Spin indicator={<LoadingOutlined style={{ fontSize: 18 }} />} />
                            : <>
                                <PlusOutlined style={{ fontSize: 18 }} />
                                <span>Rasm qo'shish</span>
                              </>
                          }
                        </div>
                      </Upload>
                    )}
                  </div>
                </Image.PreviewGroup>
              </div>

              {/* Customer bottom actions */}
              {canRent && isAvailable && (
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button
                    size="large" block
                    icon={<CalendarOutlined />}
                    onClick={() => setReservationModalOpen(true)}
                  >
                    Bron qilish (Rezervatsiya)
                  </Button>
                  <Button
                    type="primary" size="large" block
                    icon={<ShoppingCartOutlined />}
                    onClick={() => setRentalModalOpen(true)}
                  >
                    Hozir ijaraga olish
                  </Button>
                </Space>
              )}
            </div>

            {/* Admin top-right actions */}
            {canRent && isAvailable && (
              <div style={{
                position: 'absolute', top: 12, right: 52,
                display: 'flex', gap: 6,
              }}>
                <Button size="small" icon={<CalendarOutlined />} onClick={() => setReservationModalOpen(true)}>Bron</Button>
                <Button size="small" type="primary" icon={<ShoppingCartOutlined />} onClick={() => setRentalModalOpen(true)}>Ijara</Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {car && (
        <RentalFormModal
          open={rentalModalOpen}
          onClose={() => setRentalModalOpen(false)}
          onSuccess={() => { setRentalModalOpen(false); onClose(); onSuccess() }}
          prefilledCarId={car.id}
          carLabel={carLabel}
        />
      )}

      {car && (
        <ReservationFormModal
          open={reservationModalOpen}
          onClose={() => setReservationModalOpen(false)}
          onSuccess={() => { setReservationModalOpen(false); onClose(); onSuccess() }}
          prefilledCarId={car.id}
          carLabel={carLabel}
        />
      )}
    </>
  )
}
