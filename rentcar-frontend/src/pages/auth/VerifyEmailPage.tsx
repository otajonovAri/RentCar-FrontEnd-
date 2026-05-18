import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button, Typography, Alert } from 'antd'
import { MailOutlined, ReloadOutlined } from '@ant-design/icons'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import type { ApiError, AuthResponseDto } from '@/types/auth'
import { AxiosError } from 'axios'

const { Title, Text } = Typography

export default function VerifyEmailPage() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const email           = params.get('email') ?? ''
  const setAuth         = useAuthStore((s) => s.setAuth)
  const isDark          = useThemeStore((s) => s.isDark)

  const [otp,        setOtp]        = useState(['', '', '', '', '', ''])
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [resending,  setResending]  = useState(false)
  const [resendMsg,  setResendMsg]  = useState<string | null>(null)
  const [countdown,  setCountdown]  = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    setError(null)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all 6 filled
    if (next.every(d => d !== '') && value) {
      submitOtp(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = ['', '', '', '', '', '']
    text.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) submitOtp(text)
  }

  const submitOtp = async (code: string) => {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const { data } = await authApi.verifyEmail({ email, token: code })
      redirect(data)
    } catch (err) {
      const e = err as AxiosError<ApiError>
      setError(e.response?.data?.detail ?? 'Kod noto\'g\'ri yoki muddati tugagan.')
      // Clear OTP boxes on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const redirect = (data: AuthResponseDto) => {
    setAuth({
      accessToken:  data.accessToken,
      refreshToken: data.refreshToken,
      userId:       data.userId,
      fullName:     data.fullName,
      email:        data.email,
      role:         data.role,
    })
    navigate(
      data.role === 'Customer' || data.role === 'Owner' ? '/my-rentals' : '/dashboard',
      { replace: true },
    )
  }

  const handleResend = async () => {
    if (resending || countdown > 0) return
    setResending(true)
    setResendMsg(null)
    setError(null)
    try {
      await authApi.resendOtp({ email })
      setResendMsg('Yangi kod yuborildi! Emailingizni tekshiring.')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      const e = err as AxiosError<ApiError>
      setError(e.response?.data?.detail ?? 'Kod qayta yuborishda xatolik.')
    } finally {
      setResending(false)
    }
  }

  /* ── Theme ── */
  const pageBg     = isDark
    ? '#0a0a0a'
    : 'linear-gradient(135deg, #f0f4ff 0%, #f5f5f5 100%)'
  const cardBg     = isDark ? '#141414' : '#ffffff'
  const cardShadow = isDark
    ? '0 4px 32px rgba(0,0,0,0.4)'
    : '0 4px 32px rgba(0,0,0,0.08)'
  const titleColor = isDark ? '#ffffff' : '#111111'

  const boxStyle: React.CSSProperties = {
    width:          48,
    height:         56,
    fontSize:       24,
    fontWeight:     700,
    textAlign:      'center',
    borderRadius:   10,
    border:         isDark ? '2px solid #333' : '2px solid #e0e0e0',
    background:     isDark ? '#1f1f1f' : '#fafafa',
    color:          isDark ? '#fff' : '#111',
    outline:        'none',
    transition:     'border-color 0.2s, box-shadow 0.2s',
    caretColor:     'transparent',
    fontFamily:     "'Courier New', monospace",
  }

  const boxFocusStyle: React.CSSProperties = {
    borderColor: '#1677ff',
    boxShadow:   '0 0 0 3px rgba(22,119,255,0.15)',
    background:  isDark ? '#1a2a3a' : '#f0f7ff',
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
        maxWidth:     400,
        background:   cardBg,
        borderRadius: 16,
        padding:      '36px 32px',
        boxShadow:    cardShadow,
        textAlign:    'center',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1677ff"/>
            <path d="M8 22 L16 10 L24 22" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="10" r="2" fill="white"/>
          </svg>
          <Title level={4} style={{ margin: 0, color: titleColor }}>RentCar</Title>
        </div>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: isDark ? '#1a2a3a' : '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <MailOutlined style={{ fontSize: 32, color: '#1677ff' }} />
        </div>

        <Title level={3} style={{ margin: '0 0 8px', fontSize: 20, color: titleColor }}>
          Emailni tasdiqlang
        </Title>
        <Text type="secondary" style={{ fontSize: 13, lineHeight: '1.6' }}>
          <strong style={{ color: isDark ? '#90caf9' : '#1677ff' }}>{email}</strong> manziliga
          6 ta raqamli kod yuborildi
        </Text>

        {/* Errors / success */}
        {error && (
          <Alert
            message={error} type="error" showIcon closable
            onClose={() => setError(null)}
            style={{ marginTop: 16, marginBottom: 0, borderRadius: 8, textAlign: 'left' }}
          />
        )}
        {resendMsg && (
          <Alert
            message={resendMsg} type="success" showIcon closable
            onClose={() => setResendMsg(null)}
            style={{ marginTop: 16, marginBottom: 0, borderRadius: 8, textAlign: 'left' }}
          />
        )}

        {/* OTP inputs */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28, marginBottom: 24,
        }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              value={digit}
              inputMode="numeric"
              maxLength={1}
              style={boxStyle}
              onFocus={e => Object.assign(e.target.style, boxFocusStyle)}
              onBlur={e => {
                e.target.style.borderColor = isDark ? '#333' : '#e0e0e0'
                e.target.style.boxShadow   = 'none'
                e.target.style.background  = isDark ? '#1f1f1f' : '#fafafa'
              }}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          disabled={otp.some(d => !d)}
          onClick={() => submitOtp(otp.join(''))}
          style={{ borderRadius: 8, fontWeight: 600, height: 44 }}
        >
          Tasdiqlash
        </Button>

        {/* Resend */}
        <div style={{ marginTop: 20 }}>
          {countdown > 0 ? (
            <Text type="secondary" style={{ fontSize: 13 }}>
              Kodni qayta yuborish &nbsp;
              <span style={{ color: '#1677ff', fontWeight: 600 }}>
                {countdown}s
              </span>
              &nbsp;dan so'ng
            </Text>
          ) : (
            <Button
              type="link"
              icon={<ReloadOutlined />}
              loading={resending}
              onClick={handleResend}
              style={{ padding: 0, fontSize: 13 }}
            >
              Yangi kod yuborish
            </Button>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Link to="/register" style={{ fontSize: 13, color: isDark ? '#90caf9' : '#1677ff' }}>
            ← Ortga qaytish
          </Link>
        </div>
      </div>
    </div>
  )
}
