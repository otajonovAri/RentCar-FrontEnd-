import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Avatar, Modal, message } from 'antd'
import {
  HomeFilled, CarFilled, CalendarFilled, FileTextFilled,
  WarningFilled, BranchesOutlined, TeamOutlined,
  LogoutOutlined, DeleteOutlined, DashboardOutlined,
  DollarCircleFilled, ThunderboltFilled, AuditOutlined,
  ToolFilled, CrownFilled, TagsFilled, AppstoreFilled,
  ShopFilled, UnorderedListOutlined, PercentageOutlined,
  SolutionOutlined, GlobalOutlined, EnvironmentOutlined,
  SafetyCertificateFilled,
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { authApi } from '@/api/authApi'
import type { UserRole } from '@/types/auth'

// ── Role labels ───────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Administrator',
  Manager:    'Menejer',
  Owner:      'Egasi',
  Customer:   'Mijoz',
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  SuperAdmin: { bg: '#cf1322', color: '#fff' },
  Admin:      { bg: '#fa8c16', color: '#fff' },
  Manager:    { bg: '#1677ff', color: '#fff' },
  Owner:      { bg: '#52c41a', color: '#fff' },
  Customer:   { bg: '#1677ff', color: '#fff' },
}

// ── Menu items (same data as AppSider, role-filtered) ─────────────────────────
interface MenuItem { key: string; icon: React.ReactNode; label: string; roles?: UserRole[] }

const ALL_MENU_ITEMS: MenuItem[] = [
  { key: '/dashboard',      icon: <DashboardOutlined />,       label: 'Dashboard',             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/my-rentals',     icon: <HomeFilled />,              label: 'Bosh sahifa',           roles: ['Customer', 'Owner'] },
  { key: '/catalog',        icon: <CarFilled />,               label: 'Avtomobillar',          roles: ['Customer', 'Owner'] },
  { key: '/reservations',   icon: <CalendarFilled />,          label: 'Rezervatsiyalar',       roles: ['Customer', 'Owner'] },
  { key: '/rentals',        icon: <FileTextFilled />,          label: 'Ijaralar',              roles: ['Customer', 'Owner'] },
  { key: '/fines',          icon: <WarningFilled />,           label: 'Jarimalar',             roles: ['Customer', 'Owner'] },
  { key: '/notifications',  icon: <AppstoreFilled />,          label: 'Bildirishnomalar',      roles: ['Customer', 'Owner'] },
  // Admin / Manager items
  { key: '/cars',           icon: <CarFilled />,               label: 'Mashinalar',            roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/regions',        icon: <GlobalOutlined />,          label: 'Viloyatlar',            roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/cities',         icon: <EnvironmentOutlined />,     label: 'Shaharlar',             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/branches',       icon: <BranchesOutlined />,        label: 'Filiallar',             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/drivers',        icon: <TeamOutlined />,            label: 'Haydovchilar',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/reservations',   icon: <CalendarFilled />,          label: 'Rezervatsiyalar',       roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/rentals',        icon: <FileTextFilled />,          label: 'Ijaralar',              roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/payments',       icon: <DollarCircleFilled />,      label: "To'lovlar",             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/inspections',    icon: <ThunderboltFilled />,       label: "Texnik ko'riklar",      roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/fines',          icon: <WarningFilled />,           label: 'Jarimalar',             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/damage-reports', icon: <AuditOutlined />,           label: 'Zarar hisobotlari',     roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/maintenance',    icon: <ToolFilled />,              label: 'Texnik xizmat',         roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/invoices',       icon: <FileTextFilled />,          label: 'Hisob-fakturalar',      roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/owners',         icon: <CrownFilled />,             label: 'Ownerlar',              roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-contracts',icon: <SolutionOutlined />,        label: 'Shartnomalar',          roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-payouts',  icon: <DollarCircleFilled />,      label: "Owner to'lovlari",      roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/pricing-tiers',  icon: <AppstoreFilled />,          label: 'Narxlar jadvali',       roles: ['Admin', 'SuperAdmin'] },
  { key: '/insurance',      icon: <SafetyCertificateFilled />, label: "Sug'urta",              roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/promotions',     icon: <PercentageOutlined />,      label: 'Promokodlar',           roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-listings',   icon: <TagsFilled />,              label: "Mashina so'rovlari",    roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-features',   icon: <UnorderedListOutlined />,   label: 'Xususiyatlar',          roles: ['Admin', 'SuperAdmin'] },
  { key: '/brands',         icon: <ShopFilled />,              label: 'Brendlar',              roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-models',     icon: <AppstoreFilled />,          label: 'Modellar',              roles: ['Admin', 'SuperAdmin'] },
  { key: '/users',          icon: <CrownFilled />,             label: 'Foydalanuvchilar',      roles: ['Admin', 'SuperAdmin'] },
]

interface Props { onClose: () => void }

export default function MobileDrawerMenu({ onClose }: Props) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDark    = useThemeStore((s) => s.isDark)
  const { fullName, role, avatarUrl, logout } = useAuthStore()

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const rc = ROLE_COLORS[role ?? 'Customer'] ?? ROLE_COLORS.Customer

  const initials = (fullName ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  // Role-filtered menu items (dedupe by key)
  const seenKeys = new Set<string>()
  const visibleItems = ALL_MENU_ITEMS.filter(item => {
    if (seenKeys.has(item.key)) return false
    const allowed = !item.roles || (role && item.roles.includes(role as UserRole))
    if (allowed) seenKeys.add(item.key)
    return allowed
  })

  const handleNav = (path: string) => {
    navigate(path)
    onClose()
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    finally { logout(); navigate('/login', { replace: true }) }
  }

  const handleDeleteAccount = () => {
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    // TODO: backend delete account API
    message.info("Bu funksiya tez orada qo'shiladi")
    setDeleteConfirmOpen(false)
  }

  const bg     = isDark ? '#141414' : '#001529'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'
  const active = isDark ? 'rgba(22,119,255,0.35)' : 'rgba(22,119,255,0.4)'

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      background:    bg,
      overflow:      'hidden',
    }}>
      {/* ── User info ── */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '20px 20px 16px',
        borderBottom: `1px solid ${border}`,
        flexShrink:   0,
      }}>
        <Avatar
          size={44}
          src={avatarUrl ?? undefined}
          style={{
            background: 'linear-gradient(135deg,#1677ff,#6366f1)',
            fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}
        >
          {!avatarUrl && initials}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: '#fff', fontWeight: 700, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {fullName ?? 'Foydalanuvchi'}
          </div>
          <span style={{
            display: 'inline-block',
            background: rc.bg, color: rc.color,
            fontSize: 10, fontWeight: 700,
            padding: '1px 8px', borderRadius: 20, marginTop: 3,
          }}>
            {ROLE_LABELS[role ?? 'Customer'] ?? role}
          </span>
        </div>
      </div>

      {/* ── Menu items ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {visibleItems.map(item => {
          const isActive = location.pathname === item.key ||
            (item.key !== '/' && location.pathname.startsWith(item.key))
          return (
            <div
              key={item.key}
              onClick={() => handleNav(item.key)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         14,
                padding:     '12px 20px',
                cursor:      'pointer',
                background:  isActive ? active : 'transparent',
                borderLeft:  isActive ? '3px solid #1677ff' : '3px solid transparent',
                transition:  'background 0.15s',
                userSelect:  'none',
              }}
            >
              <span style={{
                fontSize:   17,
                color:      isActive ? '#1677ff' : 'rgba(255,255,255,0.65)',
                flexShrink: 0,
                display:    'flex',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize:   14,
                fontWeight: isActive ? 700 : 400,
                color:      isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Bottom actions ── */}
      <div style={{
        borderTop:   `1px solid ${border}`,
        padding:     '12px 16px',
        display:     'flex',
        flexDirection:'column',
        gap:         6,
        flexShrink:  0,
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      }}>
        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         12,
            width:       '100%',
            padding:     '11px 14px',
            borderRadius: 10,
            border:      '1px solid rgba(255,255,255,0.12)',
            background:  'rgba(255,255,255,0.06)',
            cursor:      'pointer',
            color:       'rgba(255,255,255,0.85)',
            fontSize:    14,
            fontWeight:  600,
            textAlign:   'left',
            transition:  'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
        >
          <LogoutOutlined style={{ fontSize: 16 }} />
          Chiqish
        </button>

        {/* Delete account */}
        <button
          onClick={handleDeleteAccount}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            width:        '100%',
            padding:      '11px 14px',
            borderRadius: 10,
            border:       '1px solid rgba(255,77,79,0.3)',
            background:   'rgba(255,77,79,0.06)',
            cursor:       'pointer',
            color:        '#ff4d4f',
            fontSize:     14,
            fontWeight:   600,
            textAlign:    'left',
            transition:   'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.14)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.06)' }}
        >
          <DeleteOutlined style={{ fontSize: 16 }} />
          Hisobni o'chirish
        </button>
      </div>

      {/* Delete account confirmation modal */}
      <Modal
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onOk={confirmDelete}
        okText="Ha, o'chirish"
        cancelText="Bekor"
        okButtonProps={{ danger: true }}
        title={
          <span style={{ color: '#ff4d4f' }}>
            <DeleteOutlined style={{ marginRight: 8 }} />
            Hisobni o'chirishni tasdiqlaysizmi?
          </span>
        }
        centered
      >
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          Bu amalni <strong>qaytarib bo'lmaydi</strong>. Barcha ma'lumotlaringiz
          (ijaralar, rezervatsiyalar, to'lovlar) o'chiriladi.
        </p>
        <p style={{ fontSize: 13, color: '#8c8c8c' }}>
          Davom etishdan oldin bu qarorni yaxshi o'ylab ko'ring.
        </p>
      </Modal>
    </div>
  )
}
