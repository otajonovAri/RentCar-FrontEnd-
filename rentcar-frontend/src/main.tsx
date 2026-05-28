import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp, ConfigProvider, theme as antTheme } from 'antd'
import uzUZ from 'antd/locale/uz_UZ'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'
import { useThemeStore } from './store/themeStore'
import { signalRService } from './services/signalRService'

// Sahifa qayta yuklanganda — agar token bor bo'lsa SignalR'ga ulanish
if (localStorage.getItem('accessToken')) {
  signalRService.connect().catch(() => {})
}

function Root() {
  const isDark = useThemeStore((s) => s.isDark)

  // body background ni theme bilan sinxronlash
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#f0f2f5'
    document.body.style.transition = 'background-color 0.2s ease'
  }, [isDark])

  return (
    <ConfigProvider
      locale={uzUZ}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary:  '#1677ff',
          borderRadius:  8,
          fontFamily:    "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        },
        components: {
          Layout: {
            // Sider dark theme uchun
            siderBg: isDark ? '#141414' : '#001529',
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  )
}

// Yangi deploy dan keyin eski chunk topilmasa — sahifani avtomatik yangilaydi
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Root />
    </GoogleOAuthProvider>
  </StrictMode>
)
