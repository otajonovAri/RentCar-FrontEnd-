import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Card, Result, Spin, Button } from 'antd'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import type { ApiError } from '@/types/auth'
import { AxiosError } from 'axios'

type Status = 'loading' | 'success' | 'error'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [redirectRole, setRedirectRole] = useState<string | null>(null)

  useEffect(() => {
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !token) {
      setErrorMessage('URL da email yoki token mavjud emas.')
      setStatus('error')
      return
    }

    authApi
      .confirmEmail({ email, token })
      .then(({ data }) => {
        setAuth({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          userId:       data.userId,
          fullName:     data.fullName,
          email:        data.email,
          role:         data.role,
          avatarUrl:    data.avatarUrl ?? null,
        })
        setRedirectRole(data.role)
        setStatus('success')

        // 2 soniyadan so'ng avtomatik yo'naltirish
        const destination =
          data.role === 'Customer' || data.role === 'Owner'
            ? '/my-rentals'
            : '/dashboard'
        setTimeout(() => {
          navigate(destination, { replace: true })
        }, 2000)
      })
      .catch((err: AxiosError<ApiError>) => {
        const detail = err.response?.data?.detail
        setErrorMessage(detail ?? 'Tasdiqlashda xatolik yuz berdi.')
        setStatus('error')
      })
  }, [searchParams, setAuth, navigate])

  const handleGoHome = () => {
    const destination =
      redirectRole === 'Customer' || redirectRole === 'Owner'
        ? '/my-rentals'
        : '/dashboard'
    navigate(destination, { replace: true })
  }

  return (
    <div style={styles.wrapper}>
      <Card style={styles.card}>
        {status === 'loading' && (
          <div style={styles.center}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#8c8c8c' }}>Email tasdiqlanmoqda...</p>
          </div>
        )}

        {status === 'success' && (
          <Result
            status="success"
            title="Email tasdiqlandi! 🎉"
            subTitle="Hisobingiz faollashtirildi. 2 soniyadan so'ng avtomatik yo'naltirilasiz..."
            extra={[
              <Button key="go" type="primary" size="large" onClick={handleGoHome}>
                Hoziroq o'tish
              </Button>,
            ]}
          />
        )}

        {status === 'error' && (
          <Result
            status="error"
            title="Tasdiqlash muvaffaqiyatsiz"
            subTitle={errorMessage}
            extra={[
              <Link key="resend" to="/resend-confirmation">
                <Button>Qayta tasdiqlash xati olish</Button>
              </Link>,
              <Link key="login" to="/login">
                <Button type="primary">Kirish sahifasiga qaytish</Button>
              </Link>,
            ]}
          />
        )}
      </Card>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 0',
  },
}
