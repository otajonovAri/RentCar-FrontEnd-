import { useNavigate } from 'react-router-dom'
import { Button, theme } from 'antd'
import { ArrowLeftOutlined, DashboardOutlined } from '@ant-design/icons'
import { useAuthStore }  from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthStore()
  const { isDark } = useThemeStore()
  const { token }  = theme.useToken()

  const dashRoute = role === 'Customer' || role === 'Owner'
    ? '/my-rentals'
    : '/dashboard'

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     isDark
        ? 'linear-gradient(145deg, #0a0a0a 0%, #1a0505 60%, #0d0d0d 100%)'
        : 'linear-gradient(145deg, #fff8f0 0%, #fff0f0 60%, #fff5f5 100%)',
      padding:  '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background decoration ─────────────────────────────────────────── */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        {[
          { size:300, top:'-8%',  left:'-6%', opacity:.07 },
          { size:200, top:'65%',  right:'-4%',opacity:.05 },
          { size:140, top:'35%',  left:'55%', opacity:.04 },
        ].map((c, i) => (
          <div key={i} style={{
            position:    'absolute',
            width:        c.size,
            height:       c.size,
            borderRadius: '50%',
            background:  'linear-gradient(135deg,#ff4d4f,#fa8c16)',
            opacity:      c.opacity,
            top:          c.top,
            left:         c.left,
            right:        c.right,
            filter:      'blur(40px)',
          }}/>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{
        position:  'relative',
        zIndex:    1,
        textAlign: 'center',
        maxWidth:  480,
      }}>

        {/* 403 number */}
        <div className="error-404-float" style={{
          fontSize:               'clamp(96px, 22vw, 160px)',
          fontWeight:             900,
          lineHeight:             1,
          background:             'linear-gradient(135deg, #ff4d4f 20%, #fa8c16 80%)',
          WebkitBackgroundClip:   'text',
          WebkitTextFillColor:    'transparent',
          backgroundClip:         'text',
          marginBottom:           0,
          letterSpacing:          -6,
          userSelect:             'none',
        }}>
          403
        </div>

        {/* Emoji */}
        <div className="error-emoji-bounce" style={{ fontSize: 56, marginBottom: 20, lineHeight: 1 }}>
          🔒
        </div>

        {/* Title */}
        <h2 style={{
          fontSize:   'clamp(20px, 5vw, 26px)',
          fontWeight: 700,
          color:      token.colorText,
          margin:     '0 0 10px',
        }}>
          Kirish taqiqlangan
        </h2>

        <p style={{
          fontSize:     14,
          color:        token.colorTextSecondary,
          marginBottom: 12,
          lineHeight:   1.7,
          maxWidth:     360,
          margin:       '0 auto 12px',
        }}>
          Bu sahifaga kirish uchun kerakli huquqlarga ega emassiz.
        </p>

        {/* Role info */}
        {isAuthenticated && (
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          6,
            padding:      '6px 16px',
            borderRadius: 20,
            background:   'rgba(255,77,79,0.1)',
            border:       '1px solid rgba(255,77,79,0.2)',
            fontSize:     12,
            color:        '#ff4d4f',
            fontWeight:   600,
            marginBottom: 32,
          }}>
            🔑 Sizning rolingiz: {role ?? 'Noma\'lum'}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Button
            icon={<ArrowLeftOutlined/>}
            size="large"
            onClick={() => navigate(-1)}
            style={{
              borderRadius: 10,
              height:       44,
              paddingLeft:  20,
              paddingRight: 20,
              fontWeight:   600,
            }}
          >
            Orqaga
          </Button>

          {isAuthenticated && (
            <Button
              type="primary"
              size="large"
              icon={<DashboardOutlined/>}
              onClick={() => navigate(dashRoute)}
              style={{
                borderRadius: 10,
                height:       44,
                paddingLeft:  24,
                paddingRight: 24,
                fontWeight:   600,
                background:   'linear-gradient(135deg,#ff4d4f,#fa8c16)',
                border:       'none',
                boxShadow:    '0 4px 16px rgba(255,77,79,0.35)',
              }}
            >
              Bosh sahifaga
            </Button>
          )}
        </div>

        {/* Error code */}
        <div style={{
          marginTop: 40,
          fontSize:  12,
          color:     token.colorTextQuaternary,
        }}>
          Xato kodi: 403 · Kirish taqiqlangan
        </div>
      </div>
    </div>
  )
}
