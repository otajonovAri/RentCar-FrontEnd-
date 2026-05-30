import { useState, useEffect, useRef, useCallback } from 'react'
import { Spin, theme } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  SearchOutlined, EnterOutlined,
  DashboardOutlined, UserOutlined, BellFilled, MessageFilled,
  DollarCircleFilled, WarningFilled, CalendarFilled, AppstoreFilled,
  CarFilled, FileTextFilled, SafetyCertificateFilled, TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore }  from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { carsApi }       from '@/api/carsApi'
import type { CarListItemDto } from '@/types/cars'
import { useDebounce }   from '@/hooks/useDebounce'

// ── Nav items definition ──────────────────────────────────────────────────────

interface NavItem {
  key:   string
  label: string
  sub?:  string
  path:  string
  icon:  React.ReactNode
  emoji: string
  roles: string[]
}

const ALL_ROLES  = ['Customer', 'Owner', 'Manager', 'Admin', 'SuperAdmin']
const STAFF      = ['Manager', 'Admin', 'SuperAdmin']
const ADMIN_PLUS = ['Admin', 'SuperAdmin']

const ALL_NAV: NavItem[] = [
  // ── Customer / Owner ──────────────────────────────────────────────────────
  { key:'catalog',      label:'Katalog',            sub:"Barcha mashinalar",        path:'/catalog',      icon:<CarFilled/>,              emoji:'🚗', roles:[...ALL_ROLES] },
  { key:'my-rentals',   label:'Mening Ijaralarim',  sub:"Ijaralar tarixi",          path:'/my-rentals',   icon:<CalendarFilled/>,         emoji:'📋', roles:['Customer','Owner'] },
  { key:'my-activity',  label:'Faolligim',          sub:"Statistika va tarix",      path:'/my-activity',  icon:<AppstoreFilled/>,         emoji:'📊', roles:['Customer','Owner'] },
  { key:'my-cars',      label:'Mashinalarim',       sub:"Egalar portali",           path:'/my-cars',      icon:<CarFilled/>,              emoji:'🔑', roles:['Owner'] },

  // ── Staff ─────────────────────────────────────────────────────────────────
  { key:'dashboard',    label:'Dashboard',          sub:"Umumiy statistika",        path:'/dashboard',    icon:<DashboardOutlined/>,      emoji:'📈', roles:STAFF },
  { key:'cars',         label:'Mashinalar',         sub:"Barcha mashinalar",        path:'/cars',         icon:<CarFilled/>,              emoji:'🚙', roles:STAFF },
  { key:'rentals',      label:'Ijaralar',           sub:"Barcha ijaralar",          path:'/rentals',      icon:<CalendarFilled/>,         emoji:'📋', roles:STAFF },
  { key:'payments',     label:"To'lovlar",          sub:"To'lovlar tarixi",         path:'/payments',     icon:<DollarCircleFilled/>,     emoji:'💰', roles:STAFF },
  { key:'fines',        label:'Jarimalar',          sub:"Barcha jarimalar",         path:'/fines',        icon:<WarningFilled/>,          emoji:'⚠️', roles:STAFF },
  { key:'invoices',     label:'Hisob-fakturalar',   sub:"Barcha fakturalar",        path:'/invoices',     icon:<FileTextFilled/>,         emoji:'🧾', roles:STAFF },
  { key:'reservations', label:'Bronlar',            sub:"Barcha bronlar",           path:'/reservations', icon:<CalendarFilled/>,         emoji:'📅', roles:STAFF },
  { key:'branches',     label:'Filiallar',          sub:"Barcha filiallar",         path:'/branches',     icon:<AppstoreFilled/>,         emoji:'🏢', roles:STAFF },
  { key:'inspections',  label:'Tekshiruvlar',       sub:"Mashina tekshiruvlari",    path:'/inspections',  icon:<SafetyCertificateFilled/>,emoji:'🔍', roles:STAFF },
  { key:'maintenance',  label:"Ta'mirlash",         sub:"Ta'mirlash jadvali",       path:'/maintenance',  icon:<SafetyCertificateFilled/>,emoji:'🔧', roles:STAFF },
  { key:'conversations',label:'Suhbatlar',          sub:"Mijozlar bilan chat",      path:'/conversations',icon:<MessageFilled/>,          emoji:'💬', roles:STAFF },
  { key:'owner-payouts',label:"Egalar to'lovi",     sub:"Payout jadvali",           path:'/owner-payouts',icon:<DollarCircleFilled/>,     emoji:'💸', roles:STAFF },
  { key:'insurance',    label:"Sug'urta",           sub:"Sug'urta shartnomalar",    path:'/insurance',    icon:<SafetyCertificateFilled/>,emoji:'🛡️', roles:STAFF },

  // ── Admin+ ────────────────────────────────────────────────────────────────
  { key:'users',        label:'Foydalanuvchilar',   sub:"Barcha foydalanuvchilar",  path:'/users',        icon:<TeamOutlined/>,           emoji:'👥', roles:ADMIN_PLUS },
  { key:'owners',       label:'Mashina Egalari',    sub:"Egalar ro'yxati",          path:'/owners',       icon:<UserOutlined/>,           emoji:'🔑', roles:ADMIN_PLUS },
  { key:'brands',       label:'Brendlar',           sub:"Mashina brendlari",        path:'/brands',       icon:<CarFilled/>,              emoji:'🏷️', roles:ADMIN_PLUS },
  { key:'car-models',   label:'Modellar',           sub:"Mashina modellari",        path:'/car-models',   icon:<CarFilled/>,              emoji:'🚘', roles:ADMIN_PLUS },
  { key:'promotions',   label:'Aksiyalar',          sub:"Chegirma va aksiyalar",    path:'/promotions',   icon:<DollarCircleFilled/>,     emoji:'🎁', roles:ADMIN_PLUS },
  { key:'pricing-tiers',label:'Narx Toifalari',     sub:"Narx tizimi",             path:'/pricing-tiers',icon:<DollarCircleFilled/>,     emoji:'💵', roles:ADMIN_PLUS },
  { key:'deletion-req', label:"O'chirish So'rovlar",sub:"Akaunt o'chirish",         path:'/deletion-requests',icon:<UserOutlined/>,       emoji:'🗑️', roles:ADMIN_PLUS },

  // ── All auth ──────────────────────────────────────────────────────────────
  { key:'profile',      label:'Profil',             sub:"Shaxsiy ma'lumotlar",      path:'/profile',      icon:<UserOutlined/>,           emoji:'👤', roles:[...ALL_ROLES] },
  { key:'notifications',label:'Bildirishnomalar',   sub:"Barcha bildirishnomalar",  path:'/notifications',icon:<BellFilled/>,             emoji:'🔔', roles:[...ALL_ROLES] },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Result =
  | { type: 'nav'; item: NavItem }
  | { type: 'car'; car:  CarListItemDto }

const fmt = (n: number) => n.toLocaleString('ru-RU')

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate    = useNavigate()
  const { role }    = useAuthStore()
  const { isDark }  = useThemeStore()
  const { token }   = theme.useToken()
  const inputRef    = useRef<HTMLInputElement>(null)
  const listRef     = useRef<HTMLDivElement>(null)

  const [query,       setQuery]       = useState('')
  const [cars,        setCars]        = useState<CarListItemDto[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(0)

  const dQ = useDebounce(query, 280)

  // ── Reset + focus on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCars([])
    setActiveIdx(0)
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open])

  // ── Car search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dQ || dQ.length < 2) { setCars([]); return }
    setCarsLoading(true)
    carsApi.getAll({ page: 1, pageSize: 5, search: dQ })
      .then(r => setCars(r.data.items))
      .catch(() => setCars([]))
      .finally(() => setCarsLoading(false))
  }, [dQ])

  // ── Filtered nav ──────────────────────────────────────────────────────────
  const navItems = ALL_NAV.filter(item => {
    if (role && !item.roles.includes(role)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      (item.sub?.toLowerCase().includes(q) ?? false)
    )
  })

  const results: Result[] = [
    ...navItems.map(item => ({ type: 'nav' as const, item })),
    ...cars.map(car  => ({ type: 'car' as const, car  })),
  ]

  // Reset active on results change
  useEffect(() => setActiveIdx(0), [results.length])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ── Select handler ────────────────────────────────────────────────────────
  const handleSelect = useCallback((r: Result) => {
    navigate(r.type === 'nav' ? r.item.path : `/catalog/${r.car.id}`)
    onClose()
  }, [navigate, onClose])

  // ── Keyboard navigation (inside modal) ────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[activeIdx]) handleSelect(results[activeIdx])
        break
      case 'Escape':
        onClose()
        break
    }
  }

  if (!open) return null

  const hasNav  = navItems.length > 0
  const hasCars = cars.length > 0
  const isEmpty = results.length === 0 && !carsLoading && query.length > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1050,
        background:     'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'center',
        paddingTop:     '12vh',
        paddingLeft:    16,
        paddingRight:   16,
      }}
    >
      {/* Palette panel */}
      <div
        onClick={e => e.stopPropagation()}
        className="global-search-panel"
        style={{
          width:        '100%',
          maxWidth:     560,
          borderRadius: 16,
          overflow:     'hidden',
          background:   token.colorBgContainer,
          boxShadow:    isDark
            ? '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)'
            : '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >

        {/* ── Search input ──────────────────────────────────────────────── */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          padding:      '13px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <SearchOutlined style={{ fontSize: 18, color: token.colorTextTertiary, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sahifa, mashina yoki xizmat qidiring..."
            style={{
              flex:       1,
              border:     'none',
              outline:    'none',
              fontSize:   15,
              background: 'transparent',
              color:      token.colorText,
              fontFamily: 'inherit',
            }}
          />
          {carsLoading && <Spin size="small" />}
          {query && !carsLoading && (
            <button
              onClick={() => setQuery('')}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: token.colorTextTertiary, fontSize: 13,
                padding: '2px 7px', borderRadius: 6,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
          <kbd style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 5,
            background: token.colorFillAlter,
            border: `1px solid ${token.colorBorderSecondary}`,
            color: token.colorTextTertiary, flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* ── Results list ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{
            maxHeight: '52vh',
            overflowY: 'auto',
            padding:   '6px 0',
          }}
        >

          {/* Empty */}
          {isEmpty && (
            <div style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: token.colorText, marginBottom: 4 }}>
                Hech narsa topilmadi
              </div>
              <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
                "{query}" bo'yicha natija yo'q
              </div>
            </div>
          )}

          {/* No query placeholder */}
          {!query && (
            <div style={{
              textAlign: 'center', padding: '28px 20px',
              color: token.colorTextTertiary, fontSize: 13,
            }}>
              <SearchOutlined style={{
                fontSize: 30, display: 'block', marginBottom: 10, opacity: 0.25,
              }} />
              Qidirish uchun tering <br />
              <span style={{ fontSize: 11, marginTop: 4, display: 'block', opacity: 0.6 }}>
                Mashina qidirish uchun 2+ harf kiriting
              </span>
            </div>
          )}

          {/* ── Nav results ─────────────────────────────────────────────── */}
          {hasNav && (
            <section>
              <SectionLabel token={token}>Navigatsiya</SectionLabel>
              {navItems.map((item, idx) => {
                const active = activeIdx === idx
                return (
                  <Row
                    key={item.key}
                    active={active}
                    token={token}
                    onClick={() => handleSelect({ type: 'nav', item })}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: active ? 'rgba(22,119,255,0.12)' : token.colorFillAlter,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, transition: 'background 0.15s',
                    }}>
                      {item.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: active ? '#1677ff' : token.colorText,
                        transition: 'color 0.1s',
                      }}>
                        {item.label}
                      </div>
                      {item.sub && (
                        <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 1 }}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                    {active && (
                      <EnterOutlined style={{ color: '#1677ff', fontSize: 13, flexShrink: 0 }} />
                    )}
                  </Row>
                )
              })}
            </section>
          )}

          {/* ── Car results ─────────────────────────────────────────────── */}
          {hasCars && (
            <section style={{ marginTop: hasNav ? 2 : 0 }}>
              <SectionLabel token={token}>Mashinalar</SectionLabel>
              {cars.map((car, idx) => {
                const gIdx   = navItems.length + idx
                const active = activeIdx === gIdx
                return (
                  <Row
                    key={car.id}
                    active={active}
                    token={token}
                    onClick={() => handleSelect({ type: 'car', car })}
                    onMouseEnter={() => setActiveIdx(gIdx)}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 44, height: 34, borderRadius: 8, flexShrink: 0,
                      overflow: 'hidden', background: token.colorFillAlter,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(car.mainImageUrl || car.brandLogoUrl) ? (
                        <img
                          src={car.mainImageUrl ?? car.brandLogoUrl!}
                          alt={car.brand}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 20 }}>🚗</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: active ? '#1677ff' : token.colorText,
                        transition: 'color 0.1s',
                      }}>
                        {car.brand} {car.model} {car.year}
                      </div>
                      <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 1 }}>
                        {fmt(car.dailyRate)} so'm/kun
                        {' · '}
                        <span style={{ color: car.status === 'Available' ? '#52c41a' : '#ff4d4f' }}>
                          {car.status === 'Available' ? '✅ Mavjud' : '❌ Band'}
                        </span>
                      </div>
                    </div>
                    {active && (
                      <EnterOutlined style={{ color: '#1677ff', fontSize: 13, flexShrink: 0 }} />
                    )}
                  </Row>
                )
              })}
            </section>
          )}

          {/* Hint */}
          {query.length === 1 && (
            <div style={{
              textAlign: 'center', padding: '10px 20px',
              color: token.colorTextTertiary, fontSize: 12,
            }}>
              Mashina qidirish uchun 2 ta harf kiriting...
            </div>
          )}
        </div>

        {/* ── Footer hints ──────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          padding:   '7px 16px',
          display:   'flex',
          gap:       16,
          flexWrap:  'wrap',
        }}>
          {[
            { keys: ['↑', '↓'], label: 'harakat'  },
            { keys: ['↵'],       label: 'ochish'   },
            { keys: ['ESC'],     label: 'yopish'   },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {h.keys.map(k => (
                <kbd key={k} style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 4,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  color: token.colorTextSecondary, fontFamily: 'inherit',
                }}>
                  {k}
                </kbd>
              ))}
              <span style={{ fontSize: 11, color: token.colorTextTertiary }}>{h.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: token.colorTextTertiary }}>
            Ctrl+K bilan oching
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({
  token, children,
}: { token: ReturnType<typeof theme.useToken>['token']; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      10,
      fontWeight:    700,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color:         token.colorTextTertiary,
      padding:       '4px 16px 5px',
    }}>
      {children}
    </div>
  )
}

interface RowProps {
  active:       boolean
  token:        ReturnType<typeof theme.useToken>['token']
  onClick:      () => void
  onMouseEnter: () => void
  children:     React.ReactNode
}

function Row({ active, token, onClick, onMouseEnter, children }: RowProps) {
  return (
    <div
      data-active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        padding:     '7px 16px',
        cursor:      'pointer',
        background:  active ? 'rgba(22,119,255,0.07)' : 'transparent',
        borderLeft:  `2.5px solid ${active ? '#1677ff' : 'transparent'}`,
        transition:  'background 0.1s, border-color 0.1s',
      }}
    >
      {children}
    </div>
  )
}
