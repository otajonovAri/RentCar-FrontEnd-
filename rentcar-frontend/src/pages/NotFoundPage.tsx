import { useNavigate } from 'react-router-dom'
import { Button, theme } from 'antd'
import { ArrowLeftOutlined, HomeOutlined, SearchOutlined } from '@ant-design/icons'
import { useAuthStore }  from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthStore()
  const { isDark } = useThemeStore()
  const { token }  = theme.useToken()

  const homeRoute = !isAuthenticated
    ? '/catalog'
    : role === 'Customer' || role === 'Owner'
      ? '/my-rentals'
      : '/dashboard'

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     isDark
        ? 'linear-gradient(145deg, #0a0a0a 0%, #0d1b4b 60%, #1a1a2e 100%)'
        : 'linear-gradient(145deg, #f0f4ff 0%, #e8efff 60%, #f5f5ff 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background decoration ─────────────────────────────────────────── */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        {[
          { size:320, top:'-10%', left:'-8%',  opacity:.06 },
          { size:220, top:'60%',  right:'-5%', opacity:.05 },
          { size:160, top:'40%',  left:'50%',  opacity:.04 },
        ].map((c, i) => (
          <div key={i} style={{
            position:     'absolute',
            width:         c.size,
            height:        c.size,
            borderRadius:  '50%',
            background:    'linear-gradient(135deg,#1677ff,#6366f1)',
            opacity:       c.opacity,
            top:           c.top,
            left:          c.left,
            right:         c.right,
            filter:        'blur(40px)',
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

        {/* 404 number */}
        <div className="error-404-float" style={{
          fontSize:               'clamp(96px, 22vw, 160px)',
          fontWeight:             900,
          lineHeight:             1,
          background:             'linear-gradient(135deg, #1677ff 20%, #6366f1 80%)',
          WebkitBackgroundClip:   'text',
          WebkitTextFillColor:    'transparent',
          backgroundClip:         'text',
          marginBottom:           0,
          letterSpacing:          -6,
          userSelect:             'none',
        }}>
          404
        </div>

        {/* Emoji */}
        <div className="error-emoji-bounce" style={{ fontSize: 56, marginBottom: 20, lineHeight: 1 }}>
          🔍
        </div>

        {/* Title */}
        <h2 style={{
          fontSize:   'clamp(20px, 5vw, 26px)',
          fontWeight: 700,
          color:      token.colorText,
          margin:     '0 0 10px',
        }}>
          Sahifa topilmadi
        </h2>

        <p style={{
          fontSize:     14,
          color:        token.colorTextSecondary,
          marginBottom: 36,
          lineHeight:   1.7,
          maxWidth:     360,
          margin:       '0 auto 36px',
        }}>
          Siz qidirayotgan sahifa mavjud emas, ko'chirilgan yoki URL noto'g'ri kiritilgan bo'lishi mumkin.
        </p>

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

          <Button
            type="primary"
            size="large"
            icon={<HomeOutlined/>}
            onClick={() => navigate(homeRoute)}
            style={{
              borderRadius: 10,
              height:       44,
              paddingLeft:  24,
              paddingRight: 24,
              fontWeight:   600,
              background:   'linear-gradient(135deg,#1677ff,#6366f1)',
              border:       'none',
              boxShadow:    '0 4px 16px rgba(22,119,255,0.35)',
            }}
          >
            Bosh sahifa
          </Button>

          {isAuthenticated && (
            <Button
              size="large"
              icon={<SearchOutlined/>}
              onClick={() => navigate('/catalog')}
              style={{
                borderRadius: 10,
                height:       44,
                paddingLeft:  20,
                paddingRight: 20,
                fontWeight:   600,
              }}
            >
              Katalog
            </Button>
          )}
        </div>

        {/* Error code footnote */}
        <div style={{
          marginTop: 40,
          fontSize:  12,
          color:     token.colorTextQuaternary,
        }}>
          Xato kodi: 404 · Sahifa topilmadi
        </div>
      </div>
    </div>
  )
}
