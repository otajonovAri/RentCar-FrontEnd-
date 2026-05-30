import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Qo'llab-quvvatlanadigan tillar ────────────────────────────────────────────
export type AppLanguage = 'uz' | 'ru' | 'en' | 'ja'

export interface LanguageOption {
  code:  AppLanguage
  flag:  string   // emoji
  label: string   // native name
  short: string   // 2-harf ko'rsatish uchun
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'uz', flag: '🇺🇿', label: "O'zbek",   short: 'UZ' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский',  short: 'RU' },
  { code: 'en', flag: '🇬🇧', label: 'English',  short: 'EN' },
  { code: 'ja', flag: '🇯🇵', label: '日本語',    short: 'JA' },
]

// ── Store ─────────────────────────────────────────────────────────────────────
interface LanguageState {
  language:    AppLanguage
  setLanguage: (lang: AppLanguage) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'uz',

      setLanguage: (lang) => {
        // Axios interceptor localStorage'dan o'qiydi —
        // shu sababli localStorage'ga ham alohida yozamiz
        localStorage.setItem('app-language', lang)
        set({ language: lang })
      },
    }),
    {
      name: 'language-preference',
      // hydration paytida localStorage.setItem sinxronlash
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          localStorage.setItem('app-language', state.language)
        }
      },
    },
  ),
)

/** Axios interceptorida zustand importisiz ishlatish uchun yordamchi */
export function getStoredLanguage(): AppLanguage {
  const raw = localStorage.getItem('app-language')
  const valid: AppLanguage[] = ['uz', 'ru', 'en', 'ja']
  return valid.includes(raw as AppLanguage) ? (raw as AppLanguage) : 'uz'
}
