import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Input, Button, Typography, Alert, Divider } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useGoogleLogin } from '@react-oauth/google'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import type { ApiError, AuthResponseDto } from '@/types/auth'
import { AxiosError } from 'axios'

const { Title, Text } = Typography

const loginSchema = z.object({
  email:    z.string().email("To'g'ri email kiriting"),
  password: z.string().min(1, 'Parol kiritilishi shart'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const setAuth         = useAuthStore((s) => s.setAuth)
  const isDark          = useThemeStore((s) => s.isDark)
  const [error,         setError]        = useState<string | null>(null)
  const [deletedRedirect, setDeletedRedirect] = useState(false)
  const [countdown,     setCountdown]    = useState(5)
  const [loading,       setLoading]      = useState(false)
  const [gLoading,      setGLoading]     = useState(false)

  // /login?reason=deleted dan kelgan bo'lsa — avtoredirect
  useEffect(() => {
    if (searchParams.get('reason') === 'deleted') {
      setDeletedRedirect(true)
      setError("ACCOUNT_DELETED|Hisobingiz o'chirilgan.")
    }
  }, [searchParams])

  // Countdown va auto-navigate to /register
  useEffect(() => {
    if (!deletedRedirect) return
    if (countdown <= 0) { navigate('/register', { replace: true }); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [deletedRedirect, countdown, navigate])

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const redirect = (data: AuthResponseDto) => {
    setAuth({
      accessToken:  data.accessToken,
      refreshToken: data.refreshToken,
      userId:       data.userId,
      fullName:     data.fullName,
      email:        data.email,
      role:         data.role,
      avatarUrl:    data.avatarUrl ?? null,
    })
    navigate(
      data.role === 'Customer' || data.role === 'Owner' ? '/my-rentals' : '/dashboard',
      { replace: true },
    )
  }

  const onSubmit = async (v: LoginForm) => {
    setError(null); setDeletedRedirect(false); setLoading(true)
    try {
      const { data } = await authApi.login(v)
      redirect(data)
    } catch (err) {
      const e    = err as AxiosError<ApiError>
      const detail = e.response?.data?.detail ?? "Email yoki parol noto'g'ri."
      if (detail.startsWith('ACCOUNT_DELETED|')) {
        setDeletedRedirect(true)
        setCountdown(5)
        setError(detail)
      } else {
        setError(detail)
      }
    } finally { setLoading(false) }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError(null); setGLoading(true)
      try {
        const { data } = await authApi.googleLogin(tokenResponse.access_token)
        redirect(data)
      } catch (err) {
        const e = err as AxiosError<ApiError>
        setError(e.response?.data?.detail ?? 'Google orqali kirishda xatolik.')
      } finally { setGLoading(false) }
    },
    onError: () => setError('Google orqali kirishda xatolik yuz berdi.'),
  })

  /* ── Theme ─────────────────────────────────────────────── */
  const pageBg   = isDark
    ? '#0a0a0a'
    : 'linear-gradient(135deg, #f0f4ff 0%, #f5f5f5 100%)'
  const cardBg   = isDark ? '#141414' : '#ffffff'
  const cardShadow = isDark
    ? '0 4px 32px rgba(0,0,0,0.4)'
    : '0 4px 32px rgba(0,0,0,0.08)'
  const titleColor = isDark ? '#ffffff' : '#111111'
  const googleBtnStyle: React.CSSProperties = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    height:         44,
    borderRadius:   8,
    border:         isDark ? '1.5px solid #333' : '1.5px solid #e0e0e0',
    background:     isDark ? '#1f1f1f' : '#ffffff',
    fontWeight:     500,
    fontSize:       14,
    color:          isDark ? '#e0e0e0' : '#333333',
    boxShadow:      isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
    width:          '100%',
  }

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     pageBg,
      padding:        '24px',
    }}>
      <div style={{
        width:        '100%',
        maxWidth:     380,
        background:   cardBg,
        borderRadius: 16,
        padding:      '32px 28px',
        boxShadow:    cardShadow,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1677ff"/>
            <path d="M8 22 L16 10 L24 22" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="10" r="2" fill="white"/>
          </svg>
          <Title level={4} style={{ margin: 0, color: titleColor }}>RentCar</Title>
        </div>

        <Title level={3} style={{ margin: '0 0 4px', textAlign: 'center', fontSize: 20, color: titleColor }}>
          Xush kelibsiz
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
          Hisobingizga kiring
        </Text>

        {error && !deletedRedirect && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {deletedRedirect && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            message="Hisobingiz o'chirilgan"
            description={
              <div>
                <p style={{ margin: '4px 0 8px' }}>
                  Siz xuddi shu email bilan qayta ro'yxatdan o'tishingiz mumkin.
                </p>
                <p style={{ margin: 0, color: '#8c8c8c', fontSize: 12 }}>
                  {countdown} soniyadan so'ng avtomatik yo'naltirilasiz...
                </p>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => navigate('/register', { replace: true })}
                  style={{ marginTop: 8 }}
                >
                  Hozir ro'yxatdan o'tish
                </Button>
              </div>
            }
          />
        )}

        {/* Google tugmasi */}
        <Button
          size="large"
          block
          loading={gLoading}
          onClick={() => googleLogin()}
          style={googleBtnStyle}
          icon={
            !gLoading && (
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )
          }
        >
          Google bilan kirish
        </Button>

        <Divider style={{ margin: '16px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>yoki</Text>
        </Divider>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined style={{ color: '#bbb' }}/>}
                  placeholder="Email"
                  size="large"
                  status={errors.email ? 'error' : ''}
                  style={{ borderRadius: 8 }}
                />
              )}
            />
            {errors.email && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.email.message}
              </Text>
            )}
          </div>

          <div>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined style={{ color: '#bbb' }}/>}
                  placeholder="Parol"
                  size="large"
                  status={errors.password ? 'error' : ''}
                  style={{ borderRadius: 8 }}
                />
              )}
            />
            {errors.password && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {errors.password.message}
              </Text>
            )}
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{ borderRadius: 8, fontWeight: 600, marginTop: 4 }}
          >
            Kirish
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Hisob yo'qmi? </Text>
          <Link to="/register" style={{ fontSize: 13, fontWeight: 500 }}>
            Ro'yxatdan o'tish
          </Link>
        </div>
      </div>
    </div>
  )
}
