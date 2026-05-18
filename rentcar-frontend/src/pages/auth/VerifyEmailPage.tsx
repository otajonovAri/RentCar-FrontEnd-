import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button, Typography, Alert, Divider } from 'antd'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import type { ApiError, AuthResponseDto } from '@/types/auth'
import { AxiosError } from 'axios'

const { Title, Text } = Typography

export default function VerifyEmailPage() {
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const email        = params.get('email') ?? ''
  const botUsername  = params.get('bot') ?? ''          // Telegram bot username
  const isTelegram   = !!botUsername
  const setAuth      = useAuthStore((s) => s.setAuth)
  const isDark       = useThemeStore((s) => s.isDark)

  const [otp,       setOtp]       = useState(['', '', '', '', '', ''])
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown
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
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every(d => d !== '') && value) submitOtp(next.join(''))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus()
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
    setError(null); setLoading(true)
    try {
      const { data } = await authApi.verifyEmail({ email, token: code })
      redirect(data)
    } catch (err) {
      const e = err as AxiosError<ApiError>
      setError(e.response?.data?.detail ?? "Kod noto'g'ri yoki muddati tugagan.")
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
    setResending(true); setResendMsg(null); setError(null)
    try {
      await authApi.resendOtp({ email })
      setResendMsg(
        isTelegram
          ? `Yangi kod tayyor! Botga yozing: /verify ${email}`
          : 'Yangi kod emailga yuborildi!'
      )
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      const e = err as AxiosError<ApiError>
      setError(e.response?.data?.detail ?? 'Qayta yuborishda xatolik.')
    } finally {
      setResending(false)
    }
  }

  /* ── Theme ── */
  const pageBg     = isDark ? '#0a0a0a' : 'linear-gradient(135deg,#f0f4ff 0%,#f5f5f5 100%)'
  const cardBg     = isDark ? '#141414' : '#ffffff'
  const cardShadow = isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.08)'
  const titleColor = isDark ? '#ffffff' : '#111111'

  const boxStyle: React.CSSProperties = {
    width: 48, height: 56, fontSize: 24, fontWeight: 700,
    textAlign: 'center', borderRadius: 10,
    border:     isDark ? '2px solid #333' : '2px solid #e0e0e0',
    background: isDark ? '#1f1f1f' : '#fafafa',
    color:      isDark ? '#fff' : '#111',
    outline: 'none', caretColor: 'transparent',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Courier New', monospace",
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: pageBg, padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: cardBg,
        borderRadius: 16, padding: '36px 32px',
        boxShadow: cardShadow, textAlign: 'center',
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
          background: isTelegram
            ? (isDark ? '#0d2137' : '#e3f2fd')
            : (isDark ? '#1a2a3a' : '#eff6ff'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          {isTelegram ? (
            /* Telegram icon */
            <svg width="36" height="36" viewBox="0 0 24 24" fill="#2196f3">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.03 9.565c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.278 14.45l-2.948-.924c-.64-.203-.653-.64.136-.948l11.527-4.445c.534-.194 1.001.13.569 1.115z"/>
            </svg>
          ) : (
            <span style={{ fontSize: 32 }}>📧</span>
          )}
        </div>

        <Title level={3} style={{ margin: '0 0 8px', fontSize: 20, color: titleColor }}>
          {isTelegram ? 'Telegram orqali tasdiqlash' : 'Emailni tasdiqlang'}
        </Title>

        <Text type="secondary" style={{ fontSize: 13, lineHeight: '1.6', display: 'block', marginBottom: 4 }}>
          <strong style={{ color: isDark ? '#90caf9' : '#1677ff' }}>{email}</strong>
        </Text>

        {/* ── Telegram ko'rsatma ── */}
        {isTelegram && (
          <div style={{
            background: isDark ? '#0d2137' : '#e3f2fd',
            border: `1.5px solid ${isDark ? '#1565c0' : '#90caf9'}`,
            borderRadius: 12, padding: '16px 20px',
            marginTop: 20, marginBottom: 8, textAlign: 'left',
          }}>
            <Text style={{ fontSize: 13, color: isDark ? '#90caf9' : '#1565c0', fontWeight: 600, display: 'block', marginBottom: 10 }}>
              📱 Quyidagi qadamlarni bajaring:
            </Text>

            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{
                background: '#2196f3', color: '#fff', borderRadius: '50%',
                width: 22, height: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
              }}>1</span>
              <div>
                <Text style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#333', display: 'block' }}>
                  Telegram botga o'ting:
                </Text>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 6, padding: '7px 14px',
                    background: '#2196f3', color: '#fff',
                    borderRadius: 8, textDecoration: 'none',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <SendOutlined /> @{botUsername} ga o'tish
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{
                background: '#2196f3', color: '#fff', borderRadius: '50%',
                width: 22, height: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
              }}>2</span>
              <div>
                <Text style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#333', display: 'block' }}>
                  Botga quyidagi buyruqni yuboring:
                </Text>
                <code style={{
                  display: 'block', marginTop: 6, padding: '8px 12px',
                  background: isDark ? '#1a1a2e' : '#fff',
                  border: `1px solid ${isDark ? '#333' : '#c5cae9'}`,
                  borderRadius: 6, fontSize: 13,
                  color: isDark ? '#82b1ff' : '#1a237e',
                  userSelect: 'all', cursor: 'text',
                  wordBreak: 'break-all',
                }}>
                  /verify {email}
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                background: '#2196f3', color: '#fff', borderRadius: '50%',
                width: 22, height: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
              }}>3</span>
              <Text style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#333' }}>
                Botdan kelgan <strong>6 ta raqamni</strong> quyida kiriting
              </Text>
            </div>
          </div>
        )}

        {/* Email ko'rsatma */}
        {!isTelegram && (
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 8 }}>
            Emailingizga 6 ta raqamli kod yuborildi
          </Text>
        )}

        {/* Xato / muvaffaqiyat */}
        {error && (
          <Alert message={error} type="error" showIcon closable
            onClose={() => setError(null)}
            style={{ marginTop: 16, borderRadius: 8, textAlign: 'left' }} />
        )}
        {resendMsg && (
          <Alert message={resendMsg} type="success" showIcon closable
            onClose={() => setResendMsg(null)}
            style={{ marginTop: 16, borderRadius: 8, textAlign: 'left' }} />
        )}

        <Divider style={{ margin: '20px 0 16px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Kodni kiriting</Text>
        </Divider>

        {/* OTP inputs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              value={digit}
              inputMode="numeric"
              maxLength={1}
              style={boxStyle}
              onFocus={e => {
                e.target.style.borderColor = '#1677ff'
                e.target.style.boxShadow   = '0 0 0 3px rgba(22,119,255,0.15)'
                e.target.style.background  = isDark ? '#1a2a3a' : '#f0f7ff'
              }}
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
          type="primary" block size="large" loading={loading}
          disabled={otp.some(d => !d)}
          onClick={() => submitOtp(otp.join(''))}
          style={{ borderRadius: 8, fontWeight: 600, height: 44 }}
        >
          Tasdiqlash
        </Button>

        {/* Resend */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {countdown > 0 ? (
            <Text type="secondary" style={{ fontSize: 13 }}>
              Yangi kod &nbsp;
              <span style={{ color: '#1677ff', fontWeight: 600 }}>{countdown}s</span>
              &nbsp;dan so'ng
            </Text>
          ) : (
            <Button type="link" icon={<ReloadOutlined />}
              loading={resending} onClick={handleResend}
              style={{ padding: 0, fontSize: 13 }}
            >
              {isTelegram ? 'Yangi kod (botdan so\'rang)' : 'Yangi kod yuborish'}
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
