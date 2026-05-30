import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp, ConfigProvider, theme as antTheme } from 'antd'
import type { Locale } from 'antd/lib/locale'
import uzUZ from 'antd/locale/uz_UZ'
import ruRU from 'antd/locale/ru_RU'
import enUS from 'antd/locale/en_US'
import jaJP from 'antd/locale/ja_JP'
import { useTranslation } from 'react-i18next'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'
import './i18n'                              // i18n boshlash
import { useThemeStore }    from './store/themeStore'
import { useLanguageStore } from './store/languageStore'
import { signalRService }   from './services/signalRService'

// Sahifa qayta yuklanganda — agar token bor bo'lsa SignalR'ga ulanish
if (localStorage.getItem('accessToken')) {
  signalRService.connect().catch(() => {})
}

// Ant Design locale xaritasi
const ANT_LOCALES: Record<string, Locale> = {
  uz: uzUZ,
  ru: ruRU,
  en: enUS,
  ja: jaJP,
}

function Root() {
  const isDark   = useThemeStore((s) => s.isDark)
  const language = useLanguageStore((s) => s.language)
  const { i18n } = useTranslation()

  // body background ni theme bilan sinxronlash
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#f0f2f5'
    document.body.style.transition = 'background-color 0.2s ease'
  }, [isDark])

  // Til o'zgarganda i18next ni yangilash
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  const antLocale = ANT_LOCALES[language] ?? uzUZ

  return (
    <ConfigProvider
      locale={antLocale}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary:  '#1677ff',
          borderRadius:  8,
          fontFamily:    "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        },
        components: {
          Layout: {
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
