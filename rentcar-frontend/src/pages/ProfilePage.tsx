import { useState, useEffect } from 'react'
import {
  Card, Form, Input, DatePicker, Button, Row, Col, Avatar,
  Typography, Tag, Spin, Divider, message, Space, Tabs, Upload,
  Badge, Tooltip, theme,
} from 'antd'
import {
  UserOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined, IdcardOutlined,
  CameraOutlined, CheckCircleFilled, ClockCircleOutlined,
  CalendarOutlined, LoadingOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'
// themeStore import — ProfilePage colorBgContainer tokenidan foydalanadi, shuning uchun re-render kerak emas

import { usersApi } from '@/api/usersApi'
import { authApi } from '@/api/authApi'
import { uploadImage } from '@/api/uploadApi'
import type { UserDto, UpdateProfileDto, UpdateLicenseDto } from '@/types/users'

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

export default function ProfilePage() {
  const { userId, fullName, email, role, setAuth, updateAvatar, accessToken, refreshToken } = useAuthStore()
  const { token: themeToken } = theme.useToken()
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
      message.success('Guvohnoma ma\'lumotlari yangilandi')
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

  return (
    <Spin spinning={loading}>
      <Row gutter={[24, 24]} style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* ── Chap: Profil kartochkasi ────────────────────────────────── */}
        <Col xs={24} md={9}>
          <Card style={{ background: cardBg, overflow: 'hidden', padding: 0 }} styles={{ body: { padding: 0 } }}>

            {/* Cover gradient */}
            <div style={{
              height: 100,
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
                fontSize: 12, fontWeight: 600, marginBottom: 16,
              }}>
                {rc.label}
              </div>

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

        {/* ── O'ng: Tablar ───────────────────────────────────────────── */}
        <Col xs={24} md={15}>
          <Card style={{ background: cardBg }}>
            <Tabs
              defaultActiveKey="personal"
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
              ]}
            />
          </Card>
        </Col>
      </Row>
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
