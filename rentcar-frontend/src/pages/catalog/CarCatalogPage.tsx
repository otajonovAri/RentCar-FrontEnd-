import { useState, useEffect, useCallback } from 'react'
import { Spin, theme, Grid, Input } from 'antd'
import {
  CarFilled, SearchOutlined, FireFilled,
  ThunderboltFilled, AppstoreFilled, DownOutlined,
} from '@ant-design/icons'
import { carsApi } from '@/api/carsApi'
import { lookupsApi } from '@/api/lookupsApi'
import type { CarListItemDto } from '@/types/cars'
import type { LookupItem } from '@/types/lookups'
import CarCatalogCard from './components/CarCatalogCard'
import { useDebounce } from '@/hooks/useDebounce'

const { useBreakpoint } = Grid

// Category color palette (cycles)
const CAT_COLORS = [
  { color: '#1677ff', bg: 'rgba(22,119,255,0.1)'  },
  { color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   },
  { color: '#fa8c16', bg: 'rgba(250,140,22,0.1)'  },
  { color: '#722ed1', bg: 'rgba(114,46,209,0.1)'  },
  { color: '#13c2c2', bg: 'rgba(19,194,194,0.1)'  },
  { color: '#eb2f96', bg: 'rgba(235,47,150,0.1)'  },
]

export default function CarCatalogPage() {
  const screens   = useBreakpoint()
  const isMobile  = !screens.md
  const { token } = theme.useToken()

  const cols = !screens.md ? 1 : !screens.lg ? 2 : !screens.xl ? 3 : 4

  const [cars,             setCars]             = useState<CarListItemDto[]>([])
  const [loading,          setLoading]          = useState(false)
  const [categories,       setCategories]       = useState<LookupItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [search,           setSearch]           = useState('')
  const [catOpen,          setCatOpen]          = useState(false)
  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => {
    lookupsApi.getCategories()
      .then(r => setCategories(r.data))
      .catch(() => {})
  }, [])

  const fetchCars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await carsApi.getAll({
        page:       1,
        pageSize:   100,
        categoryId: selectedCategory,
        search:     debouncedSearch || undefined,
      })
      setCars(res.data.items)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, debouncedSearch])

  useEffect(() => { fetchCars() }, [fetchCars])

  // ── Stats for hero ───────────────────────────────────────────────────────────
  const availableCount = cars.filter(c => c.status === 'Available').length

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 48 }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius:    isMobile ? 16 : 20,
        background:      'linear-gradient(135deg, #0d1b4b 0%, #1677ff 50%, #6366f1 100%)',
        padding:         isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom:    28,
        position:        'relative',
        overflow:        'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { size: 180, top: -60, right: -40, opacity: 0.08 },
          { size: 120, top: 20,  right: 100, opacity: 0.06 },
          { size: 80,  bottom: -20, left: 40, opacity: 0.07 },
        ].map((c, i) => (
          <div key={i} style={{
            position:     'absolute',
            width:        c.size,
            height:       c.size,
            borderRadius: '50%',
            background:   '#fff',
            opacity:      c.opacity,
            top:          c.top,
            bottom:       c.bottom,
            left:         c.left,
            right:        c.right,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Title row */}
          <div style={{
            display:      'flex',
            alignItems:   isMobile ? 'flex-start' : 'center',
            gap:          16,
            marginBottom: 16,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <div style={{
              width:          isMobile ? 52 : 64,
              height:         isMobile ? 52 : 64,
              borderRadius:   16,
              background:     'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border:         '1px solid rgba(255,255,255,0.2)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}>
              <CarFilled style={{ fontSize: isMobile ? 26 : 32, color: '#fff' }} />
            </div>

            <div>
              <h1 style={{
                margin:      0,
                fontSize:    isMobile ? 22 : 30,
                fontWeight:  800,
                color:       '#fff',
                lineHeight:  1.2,
                letterSpacing: 0.3,
              }}>
                Bizning Avtomobillar
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                {cars.length > 0
                  ? `${cars.length} ta avtomobil · ${availableCount} ta mavjud`
                  : 'Eng yaxshi ijaradagi mashinalar'}
              </p>
            </div>

            {/* Stats chips — desktop only */}
            {!isMobile && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                {[
                  { icon: <FireFilled />,         label: 'Mashhur',  val: cars.filter(c => c.status === 'Available').length },
                  { icon: <ThunderboltFilled />,  label: 'Tezkor',   val: cars.filter(c => c.transmissionType === 'Automatic').length },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding:        '8px 16px',
                    borderRadius:   12,
                    background:     'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(6px)',
                    border:         '1px solid rgba(255,255,255,0.2)',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    color:          '#fff',
                    fontSize:       13,
                  }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search bar */}
          <Input
            size="large"
            placeholder="Mashina nomi, markasi yoki toifasi..."
            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{
              borderRadius:    12,
              background:      'rgba(255,255,255,0.15)',
              backdropFilter:  'blur(10px)',
              border:          '1px solid rgba(255,255,255,0.25)',
              color:           '#fff',
              fontSize:        14,
              height:          46,
            }}
            styles={{
              input: {
                background:  'transparent',
                color:       '#fff',
              },
            }}
          />
        </div>
      </div>

      {/* ── CATEGORY FILTER ─────────────────────────────────────────────────── */}
      {isMobile ? (
        /* ── MOBILE: collapsed → expanded ── */
        <div style={{ marginBottom: 20 }}>
          {/* Trigger button — always visible */}
          <button
            onClick={() => setCatOpen(o => !o)}
            style={{
              width:          '100%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '11px 16px',
              borderRadius:   catOpen ? '12px 12px 0 0' : 12,
              border:         `1.5px solid ${selectedCategory
                ? CAT_COLORS[(categories.findIndex(c => c.id === selectedCategory)) % CAT_COLORS.length]?.color ?? '#1677ff'
                : '#1677ff'}`,
              background:     token.colorBgContainer,
              cursor:         'pointer',
              transition:     'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppstoreFilled style={{
                fontSize: 14,
                color: selectedCategory
                  ? CAT_COLORS[(categories.findIndex(c => c.id === selectedCategory)) % CAT_COLORS.length]?.color ?? '#1677ff'
                  : '#1677ff',
              }} />
              <span style={{
                fontSize:   14,
                fontWeight: 700,
                color: selectedCategory
                  ? CAT_COLORS[(categories.findIndex(c => c.id === selectedCategory)) % CAT_COLORS.length]?.color ?? '#1677ff'
                  : '#1677ff',
              }}>
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name ?? 'Kategoriya'
                  : 'Barchasi'}
              </span>
              {selectedCategory && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '1px 7px', borderRadius: 20,
                  background: 'rgba(22,119,255,0.1)', color: '#1677ff',
                }}>
                  Tanlangan
                </span>
              )}
            </div>
            <DownOutlined style={{
              fontSize:   12,
              color:      token.colorTextTertiary,
              transition: 'transform 0.2s',
              transform:  catOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {/* Expanded list */}
          {catOpen && (
            <div style={{
              border:        `1.5px solid ${token.colorBorderSecondary}`,
              borderTop:     'none',
              borderRadius:  '0 0 12px 12px',
              overflow:      'hidden',
              background:    token.colorBgContainer,
            }}>
              {/* Barchasi row */}
              <CategoryRow
                label="Barchasi"
                icon={<AppstoreFilled style={{ fontSize: 14 }} />}
                active={!selectedCategory}
                color="#1677ff"
                bg="rgba(22,119,255,0.1)"
                onClick={() => { setSelectedCategory(undefined); setCatOpen(false) }}
                token={token}
              />
              {categories.map((cat, idx) => {
                const pal = CAT_COLORS[idx % CAT_COLORS.length]
                return (
                  <CategoryRow
                    key={cat.id}
                    label={cat.name}
                    active={selectedCategory === cat.id}
                    color={pal.color}
                    bg={pal.bg}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)
                      setCatOpen(false)
                    }}
                    token={token}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── DESKTOP: barcha categorylar alohida div ── */
        <div style={{
          display:      'flex',
          gap:          8,
          flexWrap:     'wrap',
          marginBottom: 24,
        }}>
          <CategoryChip
            label="Barchasi"
            icon={<AppstoreFilled style={{ fontSize: 13 }} />}
            active={!selectedCategory}
            color="#1677ff"
            bg="rgba(22,119,255,0.1)"
            onClick={() => setSelectedCategory(undefined)}
          />
          {categories.map((cat, idx) => {
            const palette = CAT_COLORS[idx % CAT_COLORS.length]
            return (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                color={palette.color}
                bg={palette.bg}
                onClick={() => setSelectedCategory(
                  selectedCategory === cat.id ? undefined : cat.id
                )}
              />
            )
          })}
        </div>
      )}

      {/* ── RESULTS HEADER ──────────────────────────────────────────────────── */}
      {!loading && cars.length > 0 && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   16,
        }}>
          <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
            <strong style={{ color: token.colorText }}>{cars.length}</strong> ta natija topildi
            {selectedCategory && (
              <span style={{ color: '#1677ff', marginLeft: 6, cursor: 'pointer' }}
                onClick={() => setSelectedCategory(undefined)}>
                · Filterni tozalash ✕
              </span>
            )}
          </span>
          <span style={{
            fontSize:     11,
            color:        token.colorTextTertiary,
            background:   token.colorFillAlter,
            padding:      '3px 10px',
            borderRadius: 20,
            border:       `1px solid ${token.colorBorderSecondary}`,
          }}>
            {availableCount} ta mavjud
          </span>
        </div>
      )}

      {/* ── CAR GRID ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        80,
          gap:            16,
        }}>
          <Spin size="large" />
          <span style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Avtomobillar yuklanmoqda...
          </span>
        </div>
      ) : cars.length === 0 ? (
        <div style={{
          textAlign:      'center',
          padding:        '60px 20px',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            12,
        }}>
          <div style={{
            width:          80,
            height:         80,
            borderRadius:   '50%',
            background:     'linear-gradient(135deg, rgba(22,119,255,0.1), rgba(99,102,241,0.1))',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       36,
            marginBottom:   4,
          }}>
            🚗
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText }}>
            Avtomobil topilmadi
          </div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {search ? `"${search}" bo'yicha natija yo'q` : 'Bu toifada hali avtomobil qo\'shilmagan'}
          </div>
          {(search || selectedCategory) && (
            <button
              style={{
                marginTop:    8,
                padding:      '8px 20px',
                borderRadius: 20,
                background:   'linear-gradient(135deg,#1677ff,#6366f1)',
                border:       'none',
                color:        '#fff',
                fontWeight:   600,
                cursor:       'pointer',
                fontSize:     13,
              }}
              onClick={() => { setSearch(''); setSelectedCategory(undefined) }}
            >
              Filterni tozalash
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display:             'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap:                 isMobile ? 12 : 20,
        }}>
          {cars.map(car => (
            <CarCatalogCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Desktop chip ───────────────────────────────────────────────────────────────
interface ChipProps {
  label:   string
  icon?:   React.ReactNode
  active:  boolean
  color:   string
  bg:      string
  onClick: () => void
}

function CategoryChip({ label, icon, active, color, bg, onClick }: ChipProps) {
  const { token } = theme.useToken()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          6,
        padding:      '8px 18px',
        borderRadius: 50,
        border:       `1.5px solid ${active ? color : (hovered ? color + '60' : token.colorBorderSecondary)}`,
        background:   active ? color : hovered ? bg : token.colorBgContainer,
        color:        active ? '#fff' : hovered ? color : token.colorText,
        cursor:       'pointer',
        fontWeight:   active ? 700 : 500,
        fontSize:     13,
        transition:   'all 0.18s',
        whiteSpace:   'nowrap',
        boxShadow:    active ? `0 4px 12px ${color}40` : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Mobile row (expanded list item) ───────────────────────────────────────────
interface RowProps {
  label:   string
  icon?:   React.ReactNode
  active:  boolean
  color:   string
  bg:      string
  onClick: () => void
  token:   ReturnType<typeof theme.useToken>['token']
}

function CategoryRow({ label, icon, active, color, bg, onClick, token }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            12,
        padding:        '12px 16px',
        cursor:         'pointer',
        borderTop:      `1px solid ${token.colorBorderSecondary}`,
        background:     active ? bg : 'transparent',
        transition:     'background 0.15s',
      }}
    >
      {/* Color dot */}
      <div style={{
        width:        36,
        height:       36,
        borderRadius: 10,
        background:   active ? color : bg,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        flexShrink:   0,
        transition:   'all 0.15s',
      }}>
        <span style={{ color: active ? '#fff' : color, fontSize: 15 }}>
          {icon ?? <AppstoreFilled />}
        </span>
      </div>

      {/* Label */}
      <span style={{
        flex:       1,
        fontSize:   14,
        fontWeight: active ? 700 : 500,
        color:      active ? color : token.colorText,
      }}>
        {label}
      </span>

      {/* Active check */}
      {active && (
        <div style={{
          width:        20,
          height:       20,
          borderRadius: '50%',
          background:   color,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexShrink:   0,
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
        </div>
      )}
    </div>
  )
}
