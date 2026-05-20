import { useState, useEffect } from 'react'
import {
  Card, Form, Input, DatePicker, Button, Row, Col, Avatar,
  Typography, Tag, Spin, Divider, message, Space, Tabs, Upload,
  Badge, Tooltip, theme, Grid, Modal, Alert, Table, Statistic,
  Popconfirm,
} from 'antd'
import {
  UserOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined, IdcardOutlined,
  CameraOutlined, CheckCircleFilled, ClockCircleOutlined,
  CalendarOutlined, LoadingOutlined, StopOutlined, WarningFilled,
  DeleteOutlined, HistoryOutlined, ExclamationCircleOutlined,
  CarOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleFilled,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/api/usersApi'
import { authApi } from '@/api/authApi'
import { uploadImage } from '@/api/uploadApi'
import type {
  UserDto, UpdateProfileDto, UpdateLicenseDto,
  DeletionBlockingInfoDto, UserFullHistoryDto,
} from '@/types/users'

const { Title, Text } = Typography

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SuperAdmin: { label: 'Super Admin',    color: '#fff',    bg: '#cf1322' },
  Admin:      { label: 'Administrator',  color: '#fff',    bg: '#fa8c16' },
  Manager:    { label: 'Menejer',        color: '#fff',    bg: '#1677ff' },
  Owner:      { label: 'Egasi',          color: '#fff',    bg: '#52c41a' },
  Customer:   { label: 'Mijoz',          color: '#1677ff', bg: '#e6f4ff' },
}

const GRADIENT_BY_ROLE: Record<string, string> = {
  SuperAdmin: 'linear-gradient(135deg, #cf1322, #a8071a)',
  Admin:      'linear-gradient(135deg, #fa8c16, #d46b08)',
  Manager:    'linear-gradient(135deg, #1677ff, #6366f1)',
  Owner:      'linear-gradient(135deg, #52c41a, #389e0d)',
  Customer:   'linear-gradient(135deg, #1677ff, #36cfc9)',
}

const STATUS_COLOR: Record<string, string> = {
  Pending:   'orange',
  Active:    'blue',
  Completed: 'green',
  Cancelled: 'red',
  Paid:      'green',
  Failed:    'red',
  Disputed:  'purple',
}

export default function ProfilePage() {
  const { userId, fullName, email, role, setAuth, updateAvatar, accessToken, refreshToken } = useAuthStore()
  const { token: themeToken } = theme.useToken()
  const screens   = Grid.useBreakpoint()
  const isMobile  = !screens.md
  const [form] = Form.useForm()
  const [licenseForm] = Form.useForm()

  const [profile, setProfile]               = useState<UserDto | null>(null)
  const [loading, setLoading]               = useState(true)
  const [editing, setEditing]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [licenseEditing, setLicenseEditing] = useState(false)
  const [licenseSaving, setLicenseSaving]   = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [licenseImgUploading, setLicenseImgUploading] = useState(false)

  // ── Hisob o'chirish holati ────────────────────────────────────────────────
  const [deletionModalOpen, setDeletionModalOpen]   = useState(false)
  const [eligibility, setEligibility]               = useState<DeletionBlockingInfoDto | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [deletionLoading, setDeletionLoading]       = useState(false)
  const [deletionSent, setDeletionSent]             = useState(false)

  // ── To'liq tarix ─────────────────────────────────────────────────────────
  const [fullHistory, setFullHistory]         = useState<UserFullHistoryDto | null>(null)
  const [historyLoading, setHistoryLoading]   = useState(false)

  const loadProfile = async () => {
    if (!userId) return
    try {
      const res = await usersApi.getById(userId)
      setProfile(res.data)
      const parts = res.data.fullName.trim().split(' ')
      form.setFieldsValue({
        firstName:   parts[0] ?? '',
        lastName:    parts[1] ?? '',
        middleName:  parts.length > 2 ? parts.slice(2).join(' ') : '',
        phoneNumber: res.data.phoneNumber,
        address:     res.data.address ?? '',
        dateOfBirth: res.data.dateOfBirth ? dayjs(res.data.dateOfBirth) : null,
      })
      licenseForm.setFieldsValue({
        licenseNumber:         res.data.licenseNumber ?? '',
        licenseExpirationDate: null,
      })
    } catch {
      message.error("Profil ma'lumotlarini olishda xatolik")
    }
  }

  const loadHistory = async () => {
    if (!userId) return
    setHistoryLoading(true)
    try {
      const res = await usersApi.getFullHistory(userId)
      setFullHistory(res.data)
    } catch {
      message.error('Tarixni yuklashda xatolik')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadProfile().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Avatar yuklash ─────────────────────────────────────────────────────────
  const handleAvatarUpload: UploadProps['customRequest'] = async ({ file, onSuccess: done, onError }) => {
    if (!userId) return
    setAvatarUploading(true)
    try {
      const result = await uploadImage(file as File)
      await usersApi.updateProfile(userId, {
        firstName:   (profile?.fullName.split(' ')[0]) ?? '',
        lastName:    (profile?.fullName.split(' ')[1]) ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
        dateOfBirth: profile?.dateOfBirth ?? dayjs().subtract(18, 'year').format('YYYY-MM-DD'),
        avatarUrl:   result.url,
      })
      updateAvatar(result.url)
      await loadProfile()
      message.success('Profil rasmi yangilandi!')
      done?.('ok')
    } catch {
      message.error('Rasmni yuklashda xatolik')
      onError?.(new Error('upload failed'))
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Shaxsiy ma'lumotlarni saqlash ─────────────────────────────────────────
  const handleSave = async () => {
    const values = await form.validateFields()
    if (!userId) return
    setSaving(true)
    try {
      const payload: UpdateProfileDto = {
        firstName:   values.firstName,
        lastName:    values.lastName,
        middleName:  values.middleName || null,
        phoneNumber: values.phoneNumber,
        address:     values.address || null,
        dateOfBirth: values.dateOfBirth
          ? dayjs(values.dateOfBirth).format('YYYY-MM-DD')
          : dayjs().subtract(18, 'year').format('YYYY-MM-DD'),
        avatarUrl: profile?.avatarUrl,
      }
      await usersApi.updateProfile(userId, payload)
      await loadProfile()
      try {
        const meRes = await authApi.me()
        if (accessToken && refreshToken) {
          setAuth({ accessToken, refreshToken, userId: meRes.data.id, fullName: meRes.data.fullName, email: meRes.data.email, role: meRes.data.role, avatarUrl: meRes.data.avatarUrl ?? null })
        }
      } catch { /* non-critical */ }
      message.success('Profil muvaffaqiyatli yangilandi')
      setEditing(false)
    } catch {
      message.error("O'zgarishlarni saqlashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  // ── Guvohnomani saqlash ───────────────────────────────────────────────────
  const handleSaveLicense = async () => {
    const values = await licenseForm.validateFields()
    if (!userId) return
    setLicenseSaving(true)
    try {
      const payload: UpdateLicenseDto = {
        licenseNumber:         values.licenseNumber,
        licenseExpirationDate: values.licenseExpirationDate
          ? dayjs(values.licenseExpirationDate).format('YYYY-MM-DD') : '',
        driverLicenseImageUrl: values.driverLicenseImageUrl || null,
      }
      await usersApi.updateLicense(userId, payload)
      await loadProfile()
      message.success("Guvohnoma ma'lumotlari yangilandi")
      setLicenseEditing(false)
    } catch {
      message.error('Guvohnomani yangilashda xatolik')
    } finally {
      setLicenseSaving(false)
    }
  }

  // ── Guvohnoma rasmi yuklash ────────────────────────────────────────────────
  const handleLicenseImgUpload: UploadProps['customRequest'] = async ({ file, onSuccess: done, onError }) => {
    setLicenseImgUploading(true)
    try {
      const result = await uploadImage(file as File)
      licenseForm.setFieldValue('driverLicenseImageUrl', result.url)
      message.success('Rasm yuklandi')
      done?.('ok')
    } catch {
      message.error('Rasmni yuklashda xatolik')
      onError?.(new Error('upload failed'))
    } finally {
      setLicenseImgUploading(false)
    }
  }

  const beforeUploadImage: UploadProps['beforeUpload'] = (file) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!ok) { message.error('Faqat JPG, PNG yoki WebP yuklanadi!'); return Upload.LIST_IGNORE }
    if (file.size / 1024 / 1024 >= 5) { message.error("5 MB dan kichik bo'lishi kerak!"); return Upload.LIST_IGNORE }
    return true
  }

  // ── Hisob o'chirish ────────────────────────────────────────────────────────
  const handleOpenDeletion = async () => {
    setDeletionSent(false)
    setEligibility(null)
    setDeletionModalOpen(true)
    setEligibilityLoading(true)
    try {
      const res = await usersApi.checkDeletionEligibility()
      setEligibility(res.data)
    } catch {
      message.error("Tekshirishda xatolik yuz berdi")
      setDeletionModalOpen(false)
    } finally {
      setEligibilityLoading(false)
    }
  }

  const handleRequestDeletion = async () => {
    setDeletionLoading(true)
    try {
      await usersApi.requestDeletion()
      setDeletionSent(true)
      message.success("O'chirish so'rovingiz yuborildi!")
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } }
      message.error(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Xatolik yuz berdi")
    } finally {
      setDeletionLoading(false)
    }
  }

  const displayName  = profile?.fullName  ?? fullName  ?? 'Foydalanuvchi'
  const displayEmail = profile?.email     ?? email     ?? ''
  const displayRole  = profile?.role      ?? role      ?? 'Customer'
  const rc           = ROLE_CONFIG[displayRole] ?? ROLE_CONFIG.Customer
  const gradient     = GRADIENT_BY_ROLE[displayRole] ?? GRADIENT_BY_ROLE.Customer

  const initials = displayName
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  const cardBg = themeToken.colorBgContainer

  // ── TABS content ──────────────────────────────────────────────────────────
  const personalTab = (
    <Form form={form} layout="vertical" disabled={!editing}>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item name="firstName" label="Ism" rules={[{ required: true, message: 'Ism kiritish majburiy' }]}>
            <Input placeholder="Ism" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="lastName" label="Familiya" rules={[{ required: true, message: 'Familiya kiritish majburiy' }]}>
            <Input placeholder="Familiya" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="middleName" label="Otasining ismi">
            <Input placeholder="Ixtiyoriy" size="large" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="phoneNumber" label="Telefon raqam" rules={[{ required: true }]}>
            <Input prefix={<PhoneOutlined />} placeholder="+998901234567" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="dateOfBirth" label="Tug'ilgan sana">
            <DatePicker
              style={{ width: '100%' }} format="DD.MM.YYYY"
              placeholder="Sana tanlang" size="large"
              disabledDate={(d) => d && d.isAfter(dayjs().subtract(16, 'year'))}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="address" label="Manzil">
        <Input prefix={<EnvironmentOutlined />} placeholder="Shahar, tuman..." size="large" />
      </Form.Item>
      <Form.Item label="Email manzil">
        <Input
          prefix={<MailOutlined />} value={displayEmail}
          disabled size="large"
          suffix={
            profile?.emailConfirmed
              ? <Tag color="success" style={{ margin: 0 }}>Tasdiqlangan</Tag>
              : <Tag color="warning" style={{ margin: 0 }}>Tasdiqlanmagan</Tag>
          }
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Email o'zgartirish uchun administrator bilan bog'laning
        </Text>
      </Form.Item>

      {editing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button icon={<CloseOutlined />} onClick={() => { setEditing(false); loadProfile() }}>
            Bekor qilish
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="large">
            Saqlash
          </Button>
        </div>
      )}

      {/* O'chirish tugmasi — pastda */}
      {!editing && displayRole === 'Customer' && (
        <div style={{ marginTop: 32, borderTop: `1px dashed ${themeToken.colorBorderSecondary}`, paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', color: themeToken.colorText }}>Hisobni o'chirish</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hisobingizni o'chirishni so'rashingiz mumkin. Admin ko'rib chiqgach bajariladi.
              </Text>
            </div>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleOpenDeletion}
              style={{ flexShrink: 0 }}
            >
              O'chirish
            </Button>
          </div>
        </div>
      )}
    </Form>
  )

  const licenseTab = (
    <Form form={licenseForm} layout="vertical" disabled={!licenseEditing}>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="licenseNumber" label="Guvohnoma raqami"
            rules={[{ required: licenseEditing, message: 'Raqam kiritish majburiy' }]}>
            <Input placeholder="AA1234567" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="licenseExpirationDate" label="Amal qilish muddati"
            rules={[{ required: licenseEditing, message: 'Muddat kiritish majburiy' }]}>
            <DatePicker
              style={{ width: '100%' }} format="DD.MM.YYYY"
              placeholder="dd.mm.yyyy" size="large"
              disabledDate={(d) => d && d.isBefore(dayjs())}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Guvohnoma rasmi */}
      <Form.Item label="Guvohnoma rasmi">
        <Space direction="vertical" style={{ width: '100%' }}>
          {profile?.licenseNumber && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <IdcardOutlined style={{ marginRight: 4 }} />
              Joriy guvohnoma: <Text code>{profile.licenseNumber}</Text>
            </Text>
          )}
          <Form.Item name="driverLicenseImageUrl" noStyle>
            <Input placeholder="Rasm URL avtomatik to'ldiriladi" size="large" disabled />
          </Form.Item>
          {licenseEditing && (
            <Upload
              accept="image/jpeg,image/png,image/webp"
              showUploadList={false}
              customRequest={handleLicenseImgUpload}
              beforeUpload={beforeUploadImage}
              disabled={licenseImgUploading}
            >
              <Button
                icon={licenseImgUploading ? <LoadingOutlined /> : <CameraOutlined />}
                loading={licenseImgUploading}
              >
                Guvohnoma rasmini yuklash
              </Button>
            </Upload>
          )}
        </Space>
      </Form.Item>

      {licenseEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button icon={<CloseOutlined />} onClick={() => setLicenseEditing(false)}>
            Bekor qilish
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={licenseSaving} onClick={handleSaveLicense} size="large">
            Saqlash
          </Button>
        </div>
      )}
    </Form>
  )

  // ── To'liq tarix tab ─────────────────────────────────────────────────────
  const historyTab = (
    <Spin spinning={historyLoading}>
      {!fullHistory ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Text type="secondary">Tarix yuklanmagan</Text>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          {/* Statistika */}
          <Row gutter={12}>
            {[
              { label: 'Ijaralar', value: fullHistory.totalRentals, icon: <CarOutlined />, color: '#1677ff' },
              { label: "Jami to'lov", value: `${fullHistory.totalSpent.toLocaleString()} UZS`, icon: <DollarOutlined />, color: '#52c41a' },
              { label: 'Jarimalar', value: fullHistory.totalFines, icon: <ExclamationCircleOutlined />, color: '#fa8c16' },
              { label: 'Faol ijara', value: fullHistory.activeRentals, icon: <ClockCircleFilled />, color: '#722ed1' },
            ].map((s) => (
              <Col xs={12} sm={6} key={s.label}>
                <Card size="small" styles={{ body: { padding: '10px 14px' } }}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>{s.label}</span>}
                    value={s.value}
                    valueStyle={{ fontSize: 16, color: s.color }}
                    prefix={s.icon}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Jarimalar ogohlantirishi */}
          {fullHistory.unpaidFines > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningFilled />}
              message={`${fullHistory.unpaidFines} ta to'lanmagan jarima`}
              description={`Umumiy miqdor: ${fullHistory.unpaidFineAmount.toLocaleString()} UZS`}
            />
          )}

          {/* Ijaralar jadvali */}
          <div>
            <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
              <CarOutlined style={{ marginRight: 6 }} />Ijaralar ({fullHistory.totalRentals})
            </Text>
            <Table
              size="small"
              dataSource={fullHistory.rentals}
              rowKey="id"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 600 }}
              columns={[
                { title: 'Mashina', dataIndex: 'carBrand', render: (_, r) => `${r.carBrand} ${r.carModel}`, width: 140 },
                { title: 'Davr', dataIndex: 'startDate', width: 120, render: (_, r) =>
                    `${dayjs(r.startDate).format('DD.MM')} – ${dayjs(r.endDate).format('DD.MM.YY')}` },
                { title: 'Summa', dataIndex: 'totalAmount', render: (v: number) => `${v.toLocaleString()} UZS`, width: 120 },
                { title: 'Holat', dataIndex: 'status', width: 90, render: (v: string) =>
                    <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> },
                { title: 'Jarima', dataIndex: 'fineCount', width: 70, render: (v: number) =>
                    v > 0 ? <Tag color="red">{v} ta</Tag> : <CheckCircleOutlined style={{ color: '#52c41a' }} /> },
              ]}
            />
          </div>

          {/* Bronlar */}
          {fullHistory.reservations.length > 0 && (
            <div>
              <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                <ClockCircleOutlined style={{ marginRight: 6 }} />Bronlar ({fullHistory.totalReservations})
              </Text>
              <Table
                size="small"
                dataSource={fullHistory.reservations}
                rowKey="id"
                pagination={{ pageSize: 5, size: 'small' }}
                scroll={{ x: 500 }}
                columns={[
                  { title: 'Mashina', dataIndex: 'carBrand', render: (_, r) => `${r.carBrand} ${r.carModel}`, width: 140 },
                  { title: 'Davr', dataIndex: 'startDate', width: 140, render: (_, r) =>
                      `${dayjs(r.startDate).format('DD.MM')} – ${dayjs(r.endDate).format('DD.MM.YY')}` },
                  { title: 'Hisob', dataIndex: 'estimatedAmount', width: 120,
                    render: (v: number | null) => v ? `${v.toLocaleString()} UZS` : '—' },
                  { title: 'Holat', dataIndex: 'status', width: 90,
                    render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> },
                ]}
              />
            </div>
          )}

          {/* Jarimalar */}
          {fullHistory.fines.length > 0 && (
            <div>
              <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                <ExclamationCircleOutlined style={{ marginRight: 6 }} />Jarimalar ({fullHistory.totalFines})
              </Text>
              <Table
                size="small"
                dataSource={fullHistory.fines}
                rowKey="id"
                pagination={{ pageSize: 5, size: 'small' }}
                scroll={{ x: 500 }}
                columns={[
                  { title: 'Tavsif', dataIndex: 'description', ellipsis: true },
                  { title: 'Miqdor', dataIndex: 'amount', width: 110, render: (v: number) => `${v.toLocaleString()} UZS` },
                  { title: 'Holat', dataIndex: 'status', width: 90,
                    render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> },
                  { title: 'Sana', dataIndex: 'issuedDate', width: 100,
                    render: (v: string) => dayjs(v).format('DD.MM.YYYY') },
                ]}
              />
            </div>
          )}
        </Space>
      )}
    </Spin>
  )

  return (
    <Spin spinning={loading}>
      <Row gutter={[24, 24]} style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: isMobile ? 80 : 48 }}>

        {/* ── Chap: Profil kartochkasi ────────────────────────────────── */}
        <Col xs={24} md={9}>
          <Card style={{ background: cardBg, overflow: 'hidden', padding: 0 }} styles={{ body: { padding: 0 } }}>

            {/* Cover gradient */}
            <div style={{
              height: isMobile ? 80 : 100,
              background: gradient,
              position: 'relative',
            }} />

            {/* Avatar — cover ustida */}
            <div style={{ textAlign: 'center', marginTop: -48, paddingBottom: 24, paddingInline: 24 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Badge
                  count={
                    <Upload
                      accept="image/jpeg,image/png,image/webp"
                      showUploadList={false}
                      customRequest={handleAvatarUpload}
                      beforeUpload={beforeUploadImage}
                      disabled={avatarUploading}
                    >
                      <Tooltip title="Rasm yuklash">
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: themeToken.colorBgContainer,
                          border: `2px solid ${themeToken.colorBgContainer}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}>
                          {avatarUploading
                            ? <LoadingOutlined style={{ fontSize: 12 }} />
                            : <CameraOutlined style={{ fontSize: 12 }} />}
                        </div>
                      </Tooltip>
                    </Upload>
                  }
                  offset={[-6, 88]}
                >
                  <Avatar
                    size={96}
                    src={profile?.avatarUrl}
                    style={{
                      border: `4px solid ${themeToken.colorBgContainer}`,
                      background: gradient,
                      fontSize: 32, fontWeight: 700,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    }}
                    icon={!profile?.avatarUrl && !initials ? <UserOutlined /> : undefined}
                  >
                    {!profile?.avatarUrl ? initials : undefined}
                  </Avatar>
                </Badge>
              </div>

              <Title level={4} style={{ margin: '12px 0 4px' }}>{displayName}</Title>

              <div style={{
                display: 'inline-block',
                background: rc.bg, color: rc.color,
                padding: '2px 12px', borderRadius: 20,
                fontSize: 12, fontWeight: 600, marginBottom: 12,
              }}>
                {rc.label}
              </div>

              {/* Blok holati banneri */}
              {profile?.isBlocked && (
                <div style={{
                  marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(255,77,79,0.1), rgba(245,34,45,0.08))',
                  border: '1.5px solid rgba(255,77,79,0.35)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <StopOutlined style={{ color: '#ff4d4f', fontSize: 13 }}/>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#ff4d4f', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Hisobingiz bloklangan
                    </span>
                  </div>
                  {profile.blockReason && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 4 }}>
                      <WarningFilled style={{ color: '#fa8c16', fontSize: 10, marginTop: 2, flexShrink: 0 }}/>
                      <span style={{ fontSize: 11, color: '#595959', lineHeight: 1.5 }}>
                        <strong>Sabab:</strong> {profile.blockReason}
                      </span>
                    </div>
                  )}
                  {profile.blockedUntil && (
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                      📅 {dayjs(profile.blockedUntil).format('DD.MM.YYYY HH:mm')} gacha
                    </div>
                  )}
                  {!profile.blockedUntil && (
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>⚠️ Doimiy blok</div>
                  )}
                </div>
              )}

              <Divider style={{ margin: '12px 0' }} />

              {/* Qisqa ma'lumotlar */}
              <Space direction="vertical" size={10} style={{ width: '100%', textAlign: 'left' }}>
                <InfoRow icon={<MailOutlined />} label={displayEmail} verified={profile?.emailConfirmed} />
                {profile?.phoneNumber && (
                  <InfoRow icon={<PhoneOutlined />} label={profile.phoneNumber} />
                )}
                {profile?.address && (
                  <InfoRow icon={<EnvironmentOutlined />} label={profile.address} />
                )}
                {profile?.createdAt && (
                  <InfoRow
                    icon={<CalendarOutlined />}
                    label={`Ro'yxatdan: ${dayjs(profile.createdAt).format('DD.MM.YYYY')}`}
                  />
                )}
                {profile?.lastActive && (
                  <InfoRow
                    icon={<ClockCircleOutlined />}
                    label={`Oxirgi kirish: ${dayjs(profile.lastActive).format('DD.MM.YYYY HH:mm')}`}
                    muted
                  />
                )}
              </Space>
            </div>
          </Card>
        </Col>

        {/* ── O'ng: Mobile → 2 ta alohida karta | Desktop → Tabs ─── */}
        {isMobile ? (
          <>
            {/* ── Shaxsiy ma'lumotlar kartasi ── */}
            <Col xs={24}>
              <Card
                style={{ background: cardBg }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(22,119,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <UserOutlined style={{ fontSize: 15, color: '#1677ff' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: themeToken.colorText }}>
                      Shaxsiy ma'lumotlar
                    </span>
                  </div>
                  {!editing && (
                    <Button
                      type="primary" ghost size="small"
                      icon={<EditOutlined />}
                      onClick={() => setEditing(true)}
                      style={{ borderRadius: 8 }}
                    >
                      Tahrirlash
                    </Button>
                  )}
                </div>
                {personalTab}
              </Card>
            </Col>

            {/* ── Haydovchilik guvohnomasi kartasi ── */}
            <Col xs={24}>
              <Card
                style={{ background: cardBg }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(82,196,26,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IdcardOutlined style={{ fontSize: 15, color: '#52c41a' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: themeToken.colorText }}>
                      Haydovchilik guvohnomasi
                    </span>
                  </div>
                  {!licenseEditing && (
                    <Button
                      type="primary" ghost size="small"
                      icon={<EditOutlined />}
                      onClick={() => setLicenseEditing(true)}
                      style={{ borderRadius: 8 }}
                    >
                      Tahrirlash
                    </Button>
                  )}
                </div>
                {licenseTab}
              </Card>
            </Col>

            {/* ── Tarix kartasi (mobile) ── */}
            <Col xs={24}>
              <Card
                style={{ background: cardBg }}
                styles={{ body: { padding: '16px' } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HistoryOutlined style={{ color: '#722ed1' }} />
                    <span>Faoliyat tarixi</span>
                  </div>
                }
                extra={
                  <Button size="small" onClick={loadHistory} loading={historyLoading}>
                    Yuklash
                  </Button>
                }
              >
                {historyTab}
              </Card>
            </Col>
          </>
        ) : (
          <Col xs={24} md={15}>
            <Card style={{ background: cardBg }}>
              <Tabs
                defaultActiveKey="personal"
                onChange={(key) => {
                  if (key === 'history' && !fullHistory && !historyLoading) {
                    loadHistory()
                  }
                }}
                items={[
                  {
                    key: 'personal',
                    label: (
                      <span><UserOutlined style={{ marginRight: 6 }} />Shaxsiy ma'lumotlar</span>
                    ),
                    children: (
                      <>
                        {!editing && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Button
                              type="primary" ghost
                              icon={<EditOutlined />}
                              onClick={() => setEditing(true)}
                            >
                              Tahrirlash
                            </Button>
                          </div>
                        )}
                        {personalTab}
                      </>
                    ),
                  },
                  {
                    key: 'license',
                    label: (
                      <span><IdcardOutlined style={{ marginRight: 6 }} />Haydovchilik guvohnomasi</span>
                    ),
                    children: (
                      <>
                        {!licenseEditing && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Button
                              type="primary" ghost
                              icon={<EditOutlined />}
                              onClick={() => setLicenseEditing(true)}
                            >
                              Tahrirlash
                            </Button>
                          </div>
                        )}
                        {licenseTab}
                      </>
                    ),
                  },
                  {
                    key: 'history',
                    label: (
                      <span><HistoryOutlined style={{ marginRight: 6 }} />Faoliyat tarixi</span>
                    ),
                    children: historyTab,
                  },
                ]}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* ── Hisob o'chirish modali ────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
            <span>Hisobni o'chirish so'rovi</span>
          </div>
        }
        open={deletionModalOpen}
        onCancel={() => { setDeletionModalOpen(false); setDeletionSent(false) }}
        footer={null}
        width={480}
      >
        <Spin spinning={eligibilityLoading}>
          {deletionSent ? (
            // Muvaffaqiyatli yuborildi
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 52, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4} style={{ marginBottom: 8 }}>So'rovingiz yuborildi!</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Admin yoki SuperAdmin ko'rib chiqadi va natija haqida xabar beriladi.
                So'rov ko'rib chiqilguncha hisobingiz faol bo'lib qoladi.
              </Text>
              <Button type="primary" onClick={() => { setDeletionModalOpen(false); setDeletionSent(false) }}>
                Yopish
              </Button>
            </div>
          ) : eligibility && !eligibility.canDelete ? (
            // Bloklash shartlari bor
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Alert
                type="error"
                showIcon
                message="Hisobni o'chirib bo'lmaydi"
                description="Quyidagi muammolarni bartaraf etib, qaytadan urinib ko'ring:"
              />

              {eligibility.activeRentalsCount > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <CarOutlined style={{ color: '#ff4d4f', fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <Text strong style={{ color: '#ff4d4f' }}>Faol/kutilayotgan ijaralar</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {eligibility.activeRentalsCount} ta faol ijara mavjud
                    </Text>
                  </div>
                </div>
              )}

              {eligibility.pendingReservationsCount > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <Text strong style={{ color: '#fa8c16' }}>Kutilayotgan bronlar</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {eligibility.pendingReservationsCount} ta bron kutilmoqda
                    </Text>
                  </div>
                </div>
              )}

              {eligibility.unpaidFinesCount > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <Text strong style={{ color: '#fa8c16' }}>To'lanmagan jarimalar</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {eligibility.unpaidFinesCount} ta jarima · {eligibility.unpaidFinesAmount.toLocaleString()} UZS
                    </Text>
                  </div>
                </div>
              )}

              <Button block onClick={() => setDeletionModalOpen(false)}>Yopish</Button>
            </Space>
          ) : eligibility?.canDelete ? (
            // Tayyorlik — tasdiqlash
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Alert
                type="warning"
                showIcon
                message="Diqqat!"
                description="Hisobingizni o'chirish so'rovi yuboriladi. Admin tasdiqlagan so'ng hisobingiz butunlay o'chiriladi va bu amal qaytarib bo'lmaydi."
              />
              <Text type="secondary" style={{ fontSize: 13 }}>
                So'rovingizni administrator ko'rib chiqadi. Bu 1-3 ish kunini olishi mumkin.
                O'chirish tasdiqlangunga qadar hisobingiz to'liq faol bo'ladi.
              </Text>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button onClick={() => setDeletionModalOpen(false)}>Bekor qilish</Button>
                <Popconfirm
                  title="So'rovni yubormoqchimisiz?"
                  description="Admin ko'rib chiqgandan so'ng hisobingiz o'chiriladi."
                  okText="Ha, yuborish"
                  cancelText="Yo'q"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleRequestDeletion}
                >
                  <Button danger type="primary" loading={deletionLoading} icon={<DeleteOutlined />}>
                    So'rov yuborish
                  </Button>
                </Popconfirm>
              </div>
            </Space>
          ) : null}
        </Spin>
      </Modal>
    </Spin>
  )
}

// ── Yordamchi komponent ───────────────────────────────────────────────────────
function InfoRow({
  icon, label, verified, muted,
}: { icon: React.ReactNode; label: string; verified?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#1677ff', flexShrink: 0 }}>{icon}</span>
      <Text style={{ fontSize: 13 }} type={muted ? 'secondary' : undefined}>{label}</Text>
      {verified === true  && <CheckCircleFilled style={{ color: '#52c41a', fontSize: 13 }} />}
      {verified === false && <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Tasdiqlanmagan</Tag>}
    </div>
  )
}
