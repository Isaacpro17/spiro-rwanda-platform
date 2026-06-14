import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { en, type Translations } from '../i18n/en'
import { rw } from '../i18n/rw'

export type Lang = 'en' | 'rw'

const STORAGE_KEY = 'spiro_lang'
const DICT: Record<Lang, Translations> = { en, rw }

interface LanguageContextValue {
  lang: Lang
  t: Translations
  toggle: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'rw' ? 'rw' : 'en'
    } catch {
      return 'en'
    }
  })

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'rw' : 'en'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t: DICT[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
