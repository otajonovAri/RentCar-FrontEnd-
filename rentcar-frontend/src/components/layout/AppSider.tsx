import { useState } from 'react'
import { Layout, Menu, Avatar, Modal, message } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeFilled, CarFilled, CalendarFilled,
  WarningFilled, SafetyCertificateFilled, ToolFilled,
  DollarCircleFilled, FileTextFilled, AppstoreFilled, ShopFilled,
  CrownFilled, ThunderboltFilled, TagsFilled, TeamOutlined,
  BranchesOutlined, GlobalOutlined, EnvironmentOutlined,
  UnorderedListOutlined, AuditOutlined, PercentageOutlined,
  SolutionOutlined, MessageFilled, BellFilled,
  LogoutOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { authApi } from '@/api/authApi'
import type { UserRole } from '@/types/auth'

const { Sider } = Layout

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin', Admin: 'Administrator',
  Manager: 'Menejer', Owner: 'Egasi', Customer: 'Mijoz',
}
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  SuperAdmin: { bg: '#cf1322', color: '#fff' },
  Admin:      { bg: '#fa8c16', color: '#fff' },
  Manager:    { bg: '#1677ff', color: '#fff' },
  Owner:      { bg: '#52c41a', color: '#fff' },
  Customer:   { bg: '#1677ff', color: '#fff' },
}

// ── Menu items ────────────────────────────────────────────────────────────────
interface MenuItem { key: string; icon: React.ReactNode; label: string; roles?: UserRole[] }

const menuItems: MenuItem[] = [
  // Customer / Owner
  { key: '/my-rentals',     icon: <HomeFilled />,              label: 'Bosh sahifa',         roles: ['Customer', 'Owner'] },
  { key: '/catalog',        icon: <CarFilled />,               label: 'Avtomobillar',        roles: ['Customer', 'Owner'] },
  { key: '/reservations',   icon: <CalendarFilled />,          label: 'Rezervatsiyalar',     roles: ['Customer', 'Owner'] },
  { key: '/rentals',        icon: <FileTextFilled />,          label: 'Ijaralarim',          roles: ['Customer', 'Owner'] },
  { key: '/fines',          icon: <WarningFilled />,           label: 'Jarimalar',           roles: ['Customer', 'Owner'] },
  { key: '/conversations',  icon: <MessageFilled />,           label: 'Chat',                roles: ['Customer', 'Owner'] },
  { key: '/notifications',  icon: <BellFilled />,              label: 'Bildirishnomalar',    roles: ['Customer', 'Owner'] },
  // Admin / Manager
  { key: '/dashboard',      icon: <HomeFilled />,              label: 'Dashboard',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/cars',           icon: <CarFilled />,               label: 'Mashinalar',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/regions',        icon: <GlobalOutlined />,          label: 'Viloyatlar',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/cities',         icon: <EnvironmentOutlined />,     label: 'Shaharlar',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/branches',       icon: <BranchesOutlined />,        label: 'Filiallar',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/drivers',        icon: <TeamOutlined />,            label: 'Haydovchilar',        roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/reservations',   icon: <CalendarFilled />,          label: 'Rezervatsiyalar',     roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/rentals',        icon: <FileTextFilled />,          label: 'Ijaralar',            roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/payments',       icon: <DollarCircleFilled />,      label: "To'lovlar",           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/inspections',    icon: <ThunderboltFilled />,       label: "Texnik ko'riklar",    roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/fines',          icon: <WarningFilled />,           label: 'Jarimalar',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/damage-reports', icon: <AuditOutlined />,           label: 'Zarar hisobotlari',   roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/maintenance',    icon: <ToolFilled />,              label: 'Texnik xizmat',       roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/invoices',       icon: <FileTextFilled />,          label: 'Hisob-fakturalar',    roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/owners',         icon: <CrownFilled />,             label: 'Ownerlar',            roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-contracts',icon: <SolutionOutlined />,        label: 'Shartnomalar',        roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-payouts',  icon: <DollarCircleFilled />,      label: "Owner to'lovlari",    roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/pricing-tiers',  icon: <AppstoreFilled />,          label: 'Narxlar jadvali',     roles: ['Admin', 'SuperAdmin'] },
  { key: '/insurance',      icon: <SafetyCertificateFilled />, label: "Sug'urta",            roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/promotions',     icon: <PercentageOutlined />,      label: 'Promokodlar',         roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-listings',   icon: <TagsFilled />,              label: "Mashina so'rovlari",  roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-features',   icon: <UnorderedListOutlined />,   label: 'Xususiyatlar',        roles: ['Admin', 'SuperAdmin'] },
  { key: '/brands',         icon: <ShopFilled />,              label: 'Brendlar',            roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-models',     icon: <AppstoreFilled />,          label: 'Modellar',            roles: ['Admin', 'SuperAdmin'] },
  { key: '/users',          icon: <CrownFilled />,             label: 'Foydalanuvchilar',    roles: ['Admin', 'SuperAdmin'] },
]

interface AppSiderProps {
  collapsed: boolean
  onMenuClick?: () => void
}

// ── Customer sidebar ──────────────────────────────────────────────────────────
function CustomerSider({ collapsed }: { collapsed: boolean }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDark    = useThemeStore((s) => s.isDark)
  const { fullName, role, avatarUrl, logout } = useAuthStore()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const rc = ROLE_COLORS[role ?? 'Customer'] ?? ROLE_COLORS.Customer
  const initials = (fullName ?? 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const visibleItems = menuItems.filter(
    item => !item.roles || (role && item.roles.includes(role as UserRole))
  )

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    finally { logout(); navigate('/login', { replace: true }) }
  }

  const bg     = isDark ? '#141414' : '#001529'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: bg,
      width: collapsed ? 64 : 220,
      transition: 'width 0.2s',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '0 20px' : '0 20px',
        height: 56, borderBottom: `1px solid ${border}`, flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <CarFilled style={{ fontSize: 20, color: '#1677ff', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
            RentCar
          </span>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderBottom: `1px solid ${border}`,
            flexShrink: 0, cursor: 'pointer',
          }}
        >
          <Avatar
            size={38}
            src={avatarUrl ?? undefined}
            style={{ background: 'linear-gradient(135deg,#1677ff,#6366f1)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}
          >
            {!avatarUrl && initials}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName ?? 'Foydalanuvchi'}
            </div>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700,
              background: rc.bg, color: rc.color,
              padding: '1px 7px', borderRadius: 20, marginTop: 2,
            }}>
              {ROLE_LABELS[role ?? 'Customer'] ?? role}
            </span>
          </div>
        </div>
      )}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', borderBottom: `1px solid ${border}` }}>
          <Avatar
            size={34} src={avatarUrl ?? undefined}
            onClick={() => navigate('/profile')}
            style={{ background: 'linear-gradient(135deg,#1677ff,#6366f1)', fontWeight: 700, cursor: 'pointer' }}
          >
            {!avatarUrl && initials}
          </Avatar>
        </div>
      )}

      {/* Menu items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 6px' : '10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleItems.map(item => {
          const isActive = location.pathname === item.key ||
            (item.key !== '/' && location.pathname.startsWith(item.key))
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 11,
                padding: collapsed ? '11px 0' : '11px 13px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10, cursor: 'pointer',
                background: isActive
                  ? 'linear-gradient(135deg,rgba(22,119,255,0.4),rgba(99,102,241,0.3))'
                  : 'rgba(255,255,255,0.04)',
                border: isActive
                  ? '1px solid rgba(22,119,255,0.45)'
                  : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 15, color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.55)', display: 'flex', flexShrink: 0 }}>
                {item.icon}
              </span>
              {!collapsed && (
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.2 }}>
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom: Chiqish + Delete */}
      <div style={{
        borderTop: `1px solid ${border}`,
        padding: collapsed ? '10px 6px' : '10px 10px',
        display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0,
      }}>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Chiqish' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', padding: '10px 13px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.11)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
        >
          <LogoutOutlined style={{ fontSize: 15 }} />
          {!collapsed && 'Chiqish'}
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          title={collapsed ? "Hisobni o'chirish" : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', padding: '10px 13px', borderRadius: 10,
            border: '1px solid rgba(255,77,79,0.25)',
            background: 'rgba(255,77,79,0.05)', cursor: 'pointer',
            color: '#ff4d4f', fontSize: 13, fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.13)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.05)' }}
        >
          <DeleteOutlined style={{ fontSize: 15 }} />
          {!collapsed && "Hisobni o'chirish"}
        </button>
      </div>

      {/* Delete confirm modal */}
      <Modal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onOk={() => { message.info("Bu funksiya tez orada qo'shiladi"); setDeleteOpen(false) }}
        okText="Ha, o'chirish"
        cancelText="Bekor"
        okButtonProps={{ danger: true }}
        title={<span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 8 }} />Hisobni o'chirishni tasdiqlaysizmi?</span>}
        centered
      >
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          Bu amalni <strong>qaytarib bo'lmaydi</strong>. Barcha ma'lumotlaringiz o'chiriladi.
        </p>
      </Modal>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AppSider({ collapsed, onMenuClick }: AppSiderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout } = useAuthStore()

  const isCustomer = role === 'Customer' || role === 'Owner'

  if (isCustomer) return <CustomerSider collapsed={collapsed} />

  const visibleItems = menuItems.filter(
    item => !item.roles || (role && item.roles.includes(role as UserRole))
  )

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    finally { logout(); navigate('/login', { replace: true }) }
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      style={{ height: '100vh', flexShrink: 0, overflow: 'hidden' }}
      width={220}
    >
      {/* Inner flex wrapper — Sider CSS'ini bypass qiladi */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px', height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        }}>
          <CarFilled style={{ fontSize: 20, color: '#1677ff', flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
              RentCar
            </span>
          )}
        </div>

        {/* Scrollable menu */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ border: 'none', marginTop: 4 }}
            items={visibleItems.map(item => ({
              key:     item.key,
              icon:    item.icon,
              label:   item.label,
              onClick: () => { navigate(item.key); onMenuClick?.() },
            }))}
          />
        </div>

        {/* Logout — har doim pastda */}
        <div style={{
          borderTop:  '1px solid rgba(255,255,255,0.08)',
          padding:    collapsed ? '10px 6px' : '10px 12px',
          flexShrink: 0,
        }}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Chiqish' : undefined}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap:            collapsed ? 0 : 10,
              width:          '100%',
              padding:        '10px 12px',
              borderRadius:   8,
              border:         '1px solid rgba(255,255,255,0.1)',
              background:     'rgba(255,255,255,0.05)',
              cursor:         'pointer',
              color:          'rgba(255,255,255,0.8)',
              fontSize:       13,
              fontWeight:     600,
              transition:     'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
          >
            <LogoutOutlined style={{ fontSize: 15 }} />
            {!collapsed && 'Chiqish'}
          </button>
        </div>

      </div>
    </Sider>
  )
}
