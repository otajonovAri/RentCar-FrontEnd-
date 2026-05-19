import { useState, useEffect, useCallback } from 'react'
import { Avatar, Badge, Button, Empty, Spin, Tag, Grid } from 'antd'
import {
  CarFilled, CalendarFilled, FileTextFilled, CheckCircleFilled,
  ClockCircleFilled, BellFilled, MessageFilled, RightOutlined,
  ThunderboltFilled, CrownFilled, WarningFilled,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { rentalsApi } from '@/api/rentalsApi'
import { reservationsApi } from '@/api/reservationsApi'
import { notificationsApi } from '@/api/notificationsApi'
import { usersApi } from '@/api/usersApi'
import type { RentalDto } from '@/types/rentals'
import type { ReservationDto } from '@/types/reservations'
import RentalDetailDrawer from '@/pages/rentals/components/RentalDetailDrawer'
import { format, differenceInDays } from 'date-fns'

const { useBreakpoint } = Grid

// ── Rang palitasi ─────────────────────────────────────────────────────────────
const COLORS = {
  blue:    { main: '#2563eb', light: '#dbeafe', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
  green:   { main: '#16a34a', light: '#dcfce7', bg: 'linear-gradient(135deg,#16a34a,#15803d)' },
  orange:  { main: '#ea580c', light: '#ffedd5', bg: 'linear-gradient(135deg,#ea580c,#c2410c)' },
  purple:  { main: '#7c3aed', light: '#ede9fe', bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
  rose:    { main: '#e11d48', light: '#ffe4e6', bg: 'linear-gradient(135deg,#e11d48,#be123c)' },
  cyan:    { main: '#0891b2', light: '#cffafe', bg: 'linear-gradient(135deg,#0891b2,#0e7490)' },
  amber:   { main: '#d97706', light: '#fef3c7', bg: 'linear-gradient(135deg,#d97706,#b45309)' },
  indigo:  { main: '#4f46e5', light: '#e0e7ff', bg: 'linear-gradient(135deg,#4f46e5,#4338ca)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ru-RU')

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: '#16a34a', Pending: '#ea580c', Completed: '#6366f1', Cancelled: '#e11d48',
  }
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: map[status] ?? '#94a3b8', marginRight: 6, flexShrink: 0,
    }} />
  )
}

// ── Ijara karta (horizontal, colorful) ────────────────────────────────────────
function RentalCard({ rental, onClick, isDark }: { rental: RentalDto; onClick: () => void; isDark: boolean }) {
  const colorKey = rental.status === 'Active' ? 'green' : rental.status === 'Pending' ? 'orange' : 'indigo'
  const c = COLORS[colorKey as keyof typeof COLORS]
  const daysLeft = rental.status === 'Active'
    ? differenceInDays(new Date(rental.endDate), new Date())
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background:   isDark ? '#1e293b' : '#fff',
        borderRadius: 16,
        border:       `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        padding:      '14px 16px',
        cursor:       'pointer',
        display:      'flex',
        gap:          14,
        alignItems:   'center',
        transition:   'all 0.18s',
        boxShadow:    isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${c.main}22` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 14, background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 20, color: '#fff',
      }}>
        <CarFilled />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#f1f5f9' : '#1e293b', marginBottom: 3 }}>
          {rental.carBrand} {rental.carModel}
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>📅 {format(new Date(rental.startDate), 'dd.MM')} → {format(new Date(rental.endDate), 'dd.MM.yy')}</span>
          <span>·</span>
          <span>{rental.totalDays} kun</span>
        </div>
      </div>

      {/* Right */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: c.main }}>{fmt(rental.totalAmount)} <span style={{ fontWeight: 400, fontSize: 11 }}>so'm</span></div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <StatusDot status={rental.status} />
          {daysLeft !== null && daysLeft >= 0 ? (
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>{daysLeft} kun qoldi</span>
          ) : (
            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
              {rental.status === 'Active' ? 'Aktiv' : rental.status === 'Pending' ? 'Kutilmoqda' : 'Tugagan'}
            </span>
          )}
        </div>
      </div>

      <RightOutlined style={{ color: isDark ? '#475569' : '#cbd5e1', fontSize: 11, flexShrink: 0 }} />
    </div>
  )
}

// ── Rezervatsiya karta ────────────────────────────────────────────────────────
function ResCard({ res, isDark }: { res: ReservationDto; isDark: boolean }) {
  return (
    <div style={{
      background:   isDark ? '#1e293b' : '#fff',
      borderRadius: 16,
      border:       `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      padding:      '14px 16px',
      display:      'flex',
      gap:          14,
      alignItems:   'center',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14,
        background: COLORS.purple.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 20, color: '#fff',
      }}>
        <CalendarFilled />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#f1f5f9' : '#1e293b', marginBottom: 3 }}>
          {res.carBrand} {res.carModel}
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
          📅 {format(new Date(res.startDate), 'dd.MM')} → {format(new Date(res.endDate), 'dd.MM.yy')}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.purple.main }}>{fmt(res.estimatedAmount)} <span style={{ fontWeight: 400, fontSize: 11 }}>so'm</span></div>
        <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <StatusDot status={res.status} />
          {res.status}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOSH KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CustomerHomePage() {
  const navigate  = useNavigate()
  const screens   = useBreakpoint()
  const isDark    = useThemeStore((s) => s.isDark)
  const { fullName, userId } = useAuthStore()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const isMobile = !screens.md
  const isLarge  = !!screens.xl

  const [rentals,        setRentals]        = useState<RentalDto[]>([])
  const [reservations,   setReservations]   = useState<ReservationDto[]>([])
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [drawerRentalId, setDrawerRentalId] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [rRes, resRes, notifRes] = await Promise.allSettled([
        rentalsApi.getAll({ page: 1, pageSize: 50, userId }),
        reservationsApi.getAll({ page: 1, pageSize: 50, userId }),
        notificationsApi.getAll({ userId, page: 1, pageSize: 1, unreadOnly: true }),
      ])
      if (rRes.status === 'fulfilled')     setRentals(rRes.value.data.items)
      if (resRes.status === 'fulfilled')   setReservations(resRes.value.data.items)
      if (notifRes.status === 'fulfilled') setUnreadCount(notifRes.value.data.totalCount)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!userId) return
    usersApi.getById(userId)
      .then(res => setAvatarUrl(res.data.avatarUrl))
      .catch(() => {})
  }, [userId])

  const activeRental     = rentals.find((r) => r.status === 'Active')
  const pendingRentals   = rentals.filter((r) => r.status === 'Pending')
  const completedRentals = rentals.filter((r) => r.status === 'Completed')
  const activeRes        = reservations.filter((r) => r.status === 'Pending' || r.status === 'Confirmed')

  const firstName = fullName?.split(' ')[0] ?? 'Mijoz'
  const initials  = (fullName ?? 'M').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Jami ijaralar',  value: rentals.length,        icon: <FileTextFilled />,   ...COLORS.blue },
    { label: 'Kutilayotgan',   value: pendingRentals.length,  icon: <ClockCircleFilled />, ...COLORS.orange },
    { label: 'Yakunlangan',    value: completedRentals.length,icon: <CheckCircleFilled />, ...COLORS.green },
    { label: 'Bronlarim',      value: activeRes.length,       icon: <CalendarFilled />,   ...COLORS.purple },
  ]

  // ── Quick links ─────────────────────────────────────────────────────────────
  const quickLinks = [
    { label: 'Katalog',      icon: <CarFilled />,      path: '/catalog',       ...COLORS.blue,   desc: 'Ijara qilish' },
    { label: 'Jarimalarim',  icon: <WarningFilled />,  path: '/fines',         ...COLORS.rose,   desc: 'Jarimalar'   },
    { label: 'Suhbatlar',    icon: <MessageFilled />,  path: '/conversations', ...COLORS.cyan,   desc: 'Xabarlar'    },
    { label: 'Bronlar',      icon: <CalendarFilled />, path: '/reservations',  ...COLORS.purple, desc: 'Rezerv'      },
    { label: 'Bildirishnoma',icon: <BellFilled />,     path: '/notifications', ...COLORS.amber,  desc: 'Yangiliklar' },
  ]

  // ── Layout helpers ──────────────────────────────────────────────────────────
  const gap   = isMobile ? 12 : 16
  const px    = isMobile ? 0  : 0
  const colsQ = isMobile ? 3  : isLarge ? 6 : 3   // quick links columns

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 32, maxWidth: 1200, margin: '0 auto' }}>

      {/* ════════════════════════════════════════════════════════════════════
          HERO BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   'linear-gradient(135deg, #1e40af 0%, #4f46e5 50%, #7c3aed 100%)',
        borderRadius: isMobile ? 20 : 24,
        padding:      isMobile ? '20px 18px' : '28px 32px',
        marginBottom: gap,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Dekorativ doiralar */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 20, right: 120, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar
              size={isMobile ? 48 : 56}
              src={avatarUrl ?? undefined}
              style={{
                background:   'linear-gradient(135deg,#f59e0b,#ef4444)',
                fontWeight:   800,
                fontSize:     isMobile ? 18 : 22,
                border:       '3px solid rgba(255,255,255,0.3)',
                flexShrink:   0,
              }}
            >
              {!avatarUrl && initials}
            </Avatar>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 12 : 13, marginBottom: 2 }}>
                Xush kelibsiz 👋
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 20 : 26, lineHeight: 1.2 }}>
                {firstName}!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                {format(new Date(), "dd.MM.yyyy, EEEE")} {/* short date */}
                {format(new Date(), 'dd.MM.yyyy')}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Badge count={unreadCount} size="small">
              <button
                onClick={() => navigate('/notifications')}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: 16,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <BellFilled />
              </button>
            </Badge>
            <button
              onClick={() => navigate('/conversations')}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: 16,
                backdropFilter: 'blur(8px)',
              }}
            >
              <MessageFilled />
            </button>
          </div>
        </div>

        {/* CTA tugmasi */}
        <button
          onClick={() => navigate('/catalog')}
          style={{
            width:        '100%',
            height:       isMobile ? 46 : 52,
            borderRadius: 14,
            background:   '#fff',
            border:       'none',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          10,
            fontWeight:   700,
            fontSize:     isMobile ? 14 : 15,
            color:        '#1e40af',
            position:     'relative',
            boxShadow:    '0 4px 16px rgba(0,0,0,0.15)',
            transition:   'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <CarFilled style={{ fontSize: 18 }} />
          Mashina ijaralamoqchiman
          <RightOutlined style={{ fontSize: 12, marginLeft: 2 }} />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STAT CARDS — 2×2 (mobile) | 4×1 (desktop)
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
        gap,
        marginBottom:        gap,
        paddingLeft:         px,
        paddingRight:        px,
      }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background:   isDark ? '#1e293b' : '#fff',
              borderRadius: 18,
              padding:      isMobile ? '14px 12px' : '18px 20px',
              boxShadow:    isDark ? 'none' : `0 2px 12px ${s.main}18`,
              border:       `1.5px solid ${isDark ? '#334155' : s.light}`,
              display:      'flex',
              flexDirection:'column',
              gap:          8,
            }}
          >
            <div style={{
              width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
              borderRadius: 12, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 16 : 20, color: '#fff',
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 900, color: isDark ? '#f1f5f9' : '#1e293b', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          FAOL IJARA BANNER
      ════════════════════════════════════════════════════════════════════ */}
      {activeRental && (
        <div
          onClick={() => setDrawerRentalId(activeRental.id)}
          style={{
            background:   'linear-gradient(135deg,#16a34a,#15803d)',
            borderRadius: 20,
            padding:      isMobile ? '16px 18px' : '20px 24px',
            marginBottom: gap,
            cursor:       'pointer',
            position:     'relative',
            overflow:     'hidden',
            boxShadow:    '0 8px 24px #16a34a40',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.005)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* Dekorativ */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <div style={{
              width: isMobile ? 48 : 56, height: isMobile ? 48 : 56,
              borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 22 : 26, color: '#fff', flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.3)',
            }}>
              <CarFilled />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  FAOL IJARA
                </div>
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 16 : 20, marginBottom: 2 }}>
                {activeRental.carBrand} {activeRental.carModel}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                {activeRental.licensePlate} · {format(new Date(activeRental.endDate), 'dd.MM.yyyy')} gacha
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: isMobile ? 16 : 20 }}>
                {fmt(activeRental.totalAmount)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4 }}>so'm</div>
              <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 11 }}>
                {differenceInDays(new Date(activeRental.endDate), new Date())} kun qoldi
              </Tag>
            </div>

            <RightOutlined style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT — PC da 2 ustun
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: isLarge ? '1fr 360px' : '1fr',
        gap,
        alignItems:          'start',
      }}>

        {/* ── Chap ustun ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>

          {/* Kutilayotgan ijaralar */}
          {pendingRentals.length > 0 && (
            <Section
              title="Kutilayotgan ijaralar"
              icon={<ClockCircleFilled style={{ color: '#ea580c' }} />}
              count={pendingRentals.length}
              countColor="#ea580c"
              isDark={isDark}
              onMore={() => navigate('/rentals')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingRentals.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setDrawerRentalId(r.id)}
                    style={{
                      background:   'linear-gradient(135deg,#fff7ed,#ffedd5)',
                      borderRadius: 14,
                      border:       '1.5px solid #fed7aa',
                      padding:      '12px 14px',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          12,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: COLORS.orange.bg, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: '#fff',
                    }}>
                      <CarFilled />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {r.carBrand} {r.carModel}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {format(new Date(r.startDate), 'dd.MM')} → {format(new Date(r.endDate), 'dd.MM.yyyy')} · {r.totalDays} kun
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#ea580c' }}>{fmt(r.totalAmount)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>so'm</div>
                    </div>
                    <RightOutlined style={{ color: '#fdba74', fontSize: 11 }} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Barcha ijaralar */}
          <Section
            title="Ijaralar tarixi"
            icon={<FileTextFilled style={{ color: '#2563eb' }} />}
            count={rentals.length}
            countColor="#2563eb"
            isDark={isDark}
            onMore={() => navigate('/rentals')}
          >
            {rentals.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    Hali ijara qilmagansiz
                  </span>
                }
              >
                <Button type="primary" shape="round" icon={<CarFilled />} onClick={() => navigate('/catalog')}>
                  Mashina ijaralamoqchiman
                </Button>
              </Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rentals.slice(0, 6).map((r) => (
                  <RentalCard
                    key={r.id}
                    rental={r}
                    isDark={isDark}
                    onClick={() => setDrawerRentalId(r.id)}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── O'ng ustun ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>

          {/* Tezkor havolalar */}
          <Section title="Tezkor menyu" icon={<ThunderboltFilled style={{ color: '#d97706' }} />} isDark={isDark}>
            <div style={{
              display:             'grid',
              gridTemplateColumns: `repeat(${colsQ === 6 ? 3 : 3}, 1fr)`,
              gap:                 10,
            }}>
              {quickLinks.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    background:   isDark ? '#1e293b' : item.light,
                    border:       `1.5px solid ${isDark ? '#334155' : item.light}`,
                    borderRadius: 16,
                    padding:      '14px 8px',
                    cursor:       'pointer',
                    display:      'flex',
                    flexDirection:'column',
                    alignItems:   'center',
                    gap:          8,
                    transition:   'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${item.main}30` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: item.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#f1f5f9' : item.main }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', lineHeight: 1.2 }}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Bronlar */}
          {reservations.length > 0 && (
            <Section
              title="Bronlarim"
              icon={<CalendarFilled style={{ color: '#7c3aed' }} />}
              count={activeRes.length > 0 ? activeRes.length : undefined}
              countColor="#7c3aed"
              isDark={isDark}
              onMore={() => navigate('/reservations')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reservations.slice(0, 3).map((r) => (
                  <ResCard key={r.id} res={r} isDark={isDark} />
                ))}
              </div>
            </Section>
          )}

          {/* Sovg'a / promo blok */}
          <div style={{
            background:   'linear-gradient(135deg,#7c3aed,#4f46e5)',
            borderRadius: 20,
            padding:      '20px',
            position:     'relative',
            overflow:     'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                Promokod bormi?
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 14 }}>
                Chegirmalardan foydalaning va tejang!
              </div>
              <button
                onClick={() => navigate('/catalog')}
                style={{
                  background: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px 20px', cursor: 'pointer',
                  color: '#7c3aed', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <CrownFilled /> Katalogga o'tish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drawer ─────────────────────────────────────────────────────── */}
      <RentalDetailDrawer
        rentalId={drawerRentalId}
        onClose={() => setDrawerRentalId(null)}
        onSuccess={() => { fetchAll(); setDrawerRentalId(null) }}
      />
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  title, icon, count, countColor, isDark, onMore, children,
}: {
  title: string
  icon: React.ReactNode
  count?: number
  countColor?: string
  isDark: boolean
  onMore?: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      background:   isDark ? '#1e293b' : '#fff',
      borderRadius: 20,
      padding:      '18px 18px',
      boxShadow:    isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
      border:       `1.5px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: isDark ? '#f1f5f9' : '#1e293b' }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span style={{
              background: countColor ?? '#2563eb',
              color:      '#fff',
              fontSize:   11,
              fontWeight: 700,
              borderRadius: 20,
              padding:    '1px 8px',
              minWidth:   20,
              textAlign:  'center',
            }}>
              {count}
            </span>
          )}
        </div>
        {onMore && (
          <button
            onClick={onMore}
            style={{
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      '#2563eb',
              fontSize:   12,
              fontWeight: 600,
              display:    'flex',
              alignItems: 'center',
              gap:        4,
              padding:    '4px 8px',
              borderRadius: 8,
            }}
          >
            Hammasi <RightOutlined style={{ fontSize: 10 }} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
