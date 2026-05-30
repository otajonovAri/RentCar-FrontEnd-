import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Modal, message, Spin, Space, Badge } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  HomeFilled, CarFilled, CalendarFilled,
  WarningFilled, SafetyCertificateFilled, ToolFilled,
  DollarCircleFilled, FileTextFilled, AppstoreFilled, ShopFilled,
  CrownFilled, ThunderboltFilled, TagsFilled, TeamOutlined,
  BranchesOutlined, GlobalOutlined, EnvironmentOutlined,
  UnorderedListOutlined, AuditOutlined, PercentageOutlined,
  SolutionOutlined, MessageFilled, BellFilled,
  LogoutOutlined, DeleteOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, HistoryOutlined, BarChartOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { authApi } from '@/api/authApi'
import { usersApi } from '@/api/usersApi'
import type { UserRole } from '@/types/auth'
import type { DeletionBlockingInfoDto } from '@/types/users'

const { Sider } = Layout

// ── Role rang konfiguratsiyasi ────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  SuperAdmin: { bg: '#cf1322', color: '#fff' },
  Admin:      { bg: '#fa8c16', color: '#fff' },
  Manager:    { bg: '#1677ff', color: '#fff' },
  Owner:      { bg: '#52c41a', color: '#fff' },
  Customer:   { bg: '#1677ff', color: '#fff' },
}

// ── Menu items — t() yordamida dinamik ───────────────────────────────────────
interface MenuItem { key: string; icon: React.ReactNode; labelKey: string; roles?: UserRole[] }

const MENU_ITEMS: MenuItem[] = [
  // Customer / Owner
  { key: '/my-rentals',    icon: <HomeFilled />,              labelKey: 'nav.home',              roles: ['Customer', 'Owner'] },
  { key: '/catalog',       icon: <CarFilled />,               labelKey: 'nav.catalog',           roles: ['Customer', 'Owner'] },
  { key: '/reservations',  icon: <CalendarFilled />,          labelKey: 'nav.reservations',      roles: ['Customer', 'Owner'] },
  { key: '/rentals',       icon: <FileTextFilled />,          labelKey: 'nav.my-rentals',        roles: ['Customer', 'Owner'] },
  { key: '/fines',         icon: <WarningFilled />,           labelKey: 'nav.fines',             roles: ['Customer', 'Owner'] },
  { key: '/my-activity',   icon: <HistoryOutlined />,         labelKey: 'nav.activity',          roles: ['Customer', 'Owner'] },
  { key: '/conversations', icon: <MessageFilled />,           labelKey: 'nav.conversations',     roles: ['Customer', 'Owner'] },
  { key: '/notifications', icon: <BellFilled />,              labelKey: 'nav.notifications',     roles: ['Customer', 'Owner'] },
  // Admin / Manager
  { key: '/dashboard',     icon: <HomeFilled />,              labelKey: 'nav.dashboard',         roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/cars',          icon: <CarFilled />,               labelKey: 'nav.cars',              roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/regions',       icon: <GlobalOutlined />,          labelKey: 'nav.regions',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/cities',        icon: <EnvironmentOutlined />,     labelKey: 'nav.cities',            roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/branches',      icon: <BranchesOutlined />,        labelKey: 'nav.branches',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/drivers',       icon: <TeamOutlined />,            labelKey: 'nav.drivers',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/reservations',  icon: <CalendarFilled />,          labelKey: 'nav.reservations',      roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/rentals',       icon: <FileTextFilled />,          labelKey: 'nav.rentals',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/payments',      icon: <DollarCircleFilled />,      labelKey: 'nav.payments',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/reports',       icon: <BarChartOutlined />,        labelKey: 'nav.reports',           roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/inspections',   icon: <ThunderboltFilled />,       labelKey: 'nav.inspections',       roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/fines',         icon: <WarningFilled />,           labelKey: 'nav.fines',             roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/damage-reports',icon: <AuditOutlined />,           labelKey: 'nav.damage-reports',    roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/maintenance',   icon: <ToolFilled />,              labelKey: 'nav.maintenance',       roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/invoices',      icon: <FileTextFilled />,          labelKey: 'nav.invoices',          roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/owners',              icon: <CrownFilled />,             labelKey: 'nav.owners',            roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-contracts',     icon: <SolutionOutlined />,        labelKey: 'nav.owner-contracts',   roles: ['Admin', 'SuperAdmin'] },
  { key: '/owner-payouts',       icon: <DollarCircleFilled />,      labelKey: 'nav.owner-payouts',     roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/pricing-tiers',       icon: <AppstoreFilled />,          labelKey: 'nav.pricing-tiers',     roles: ['Admin', 'SuperAdmin'] },
  { key: '/insurance',           icon: <SafetyCertificateFilled />, labelKey: 'nav.insurance',         roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/promotions',          icon: <PercentageOutlined />,      labelKey: 'nav.promotions',        roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-listings',        icon: <TagsFilled />,              labelKey: 'nav.car-listings',      roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-features',        icon: <UnorderedListOutlined />,   labelKey: 'nav.car-features',      roles: ['Admin', 'SuperAdmin'] },
  { key: '/brands',              icon: <ShopFilled />,              labelKey: 'nav.brands',            roles: ['Admin', 'SuperAdmin'] },
  { key: '/car-models',          icon: <AppstoreFilled />,          labelKey: 'nav.car-models',        roles: ['Admin', 'SuperAdmin'] },
  { key: '/users',               icon: <CrownFilled />,             labelKey: 'nav.users',             roles: ['Admin', 'SuperAdmin'] },
  { key: '/deletion-requests',   icon: <DeleteOutlined />,          labelKey: 'nav.deletion-requests', roles: ['Admin', 'SuperAdmin'] },
  { key: '/conversations',       icon: <MessageFilled />,           labelKey: 'nav.conversations',     roles: ['Manager', 'Admin', 'SuperAdmin'] },
  { key: '/notifications',       icon: <BellFilled />,              labelKey: 'nav.notifications',     roles: ['Manager', 'Admin', 'SuperAdmin'] },
]

interface AppSiderProps {
  collapsed:    boolean
  onMenuClick?: () => void
}

// ── Customer sidebar ──────────────────────────────────────────────────────────
function CustomerSider({ collapsed }: { collapsed: boolean }) {
  const { t }     = useTranslation()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDark    = useThemeStore((s) => s.isDark)
  const { fullName, role, avatarUrl, logout } = useAuthStore()
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [eligibility,   setEligibility]   = useState<DeletionBlockingInfoDto | null>(null)
  const [eligLoading,   setEligLoading]   = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteSent,    setDeleteSent]    = useState(false)

  const rc       = ROLE_COLORS[role ?? 'Customer'] ?? ROLE_COLORS.Customer
  const initials = (fullName ?? 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const visibleItems = MENU_ITEMS.filter(
    item => !item.roles || (role && item.roles.includes(role as UserRole))
  )

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    finally { logout(); navigate('/login', { replace: true }) }
  }

  const handleOpenDelete = async () => {
    setDeleteSent(false); setEligibility(null)
    setDeleteOpen(true);  setEligLoading(true)
    try {
      const res = await usersApi.checkDeletionEligibility()
      setEligibility(res.data)
    } catch {
      message.error(t('common.error'))
      setDeleteOpen(false)
    } finally { setEligLoading(false) }
  }

  const handleConfirmDelete = async () => {
    setDeleteLoading(true)
    try {
      await usersApi.requestDeletion()
      setDeleteSent(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } }
      message.error(e?.response?.data?.message ?? e?.response?.data?.detail ?? t('common.error'))
    } finally { setDeleteLoading(false) }
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
        padding: '0 20px', height: 56,
        borderBottom: `1px solid ${border}`, flexShrink: 0,
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
              {fullName ?? t('nav.home')}
            </div>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700,
              background: rc.bg, color: rc.color,
              padding: '1px 7px', borderRadius: 20, marginTop: 2,
            }}>
              {t(`roles.${role ?? 'Customer'}`)}
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
              key={item.key + item.labelKey}
              onClick={() => navigate(item.key)}
              title={collapsed ? t(item.labelKey) : undefined}
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
                  {t(item.labelKey)}
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
          title={collapsed ? t('nav.logout') : undefined}
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
          {!collapsed && t('nav.logout')}
        </button>

        <button
          onClick={handleOpenDelete}
          title={collapsed ? t('nav.delete-account') : undefined}
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
          {!collapsed && t('nav.delete-account')}
        </button>
      </div>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        onCancel={() => { setDeleteOpen(false); setDeleteSent(false) }}
        footer={null}
        title={<span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 8 }} />{t('delete-modal.title')}</span>}
        centered
        width={420}
      >
        <Spin spinning={eligLoading}>
          {deleteSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
              <p style={{ fontWeight: 700, fontSize: 15 }}>{t('delete-modal.sent-title')}</p>
              <p style={{ color: '#8c8c8c', fontSize: 13 }}>{t('delete-modal.sent-desc')}</p>
              <button
                onClick={() => { setDeleteOpen(false); setDeleteSent(false) }}
                style={{ marginTop: 12, padding: '8px 24px', borderRadius: 8, background: '#52c41a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {t('delete-modal.close-btn')}
              </button>
            </div>
          ) : eligibility && !eligibility.canDelete ? (
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <p style={{ color: '#ff4d4f', fontWeight: 600 }}>{t('delete-modal.cannot-delete')}</p>
              {eligibility.activeRentalsCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', fontSize: 13 }}>
                  🚗 <strong>{eligibility.activeRentalsCount}</strong> {t('delete-modal.active-rentals', { count: eligibility.activeRentalsCount })}
                </div>
              )}
              {eligibility.pendingReservationsCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)', fontSize: 13 }}>
                  📅 <strong>{eligibility.pendingReservationsCount}</strong> {t('delete-modal.pending-reservations', { count: eligibility.pendingReservationsCount })}
                </div>
              )}
              {eligibility.unpaidFinesCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)', fontSize: 13 }}>
                  ⚠️ <strong>{eligibility.unpaidFinesCount}</strong> {t('delete-modal.unpaid-fines', { count: eligibility.unpaidFinesCount, amount: eligibility.unpaidFinesAmount.toLocaleString() })}
                </div>
              )}
              <button
                onClick={() => setDeleteOpen(false)}
                style={{ width: '100%', marginTop: 4, padding: '9px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('delete-modal.close-btn')}
              </button>
            </Space>
          ) : eligibility?.canDelete ? (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', fontSize: 13, lineHeight: 1.6 }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
                {t('delete-modal.warning')}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteOpen(false)}
                  style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
                >
                  {t('delete-modal.cancel-btn')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  style={{ padding: '8px 18px', borderRadius: 8, background: '#ff4d4f', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: deleteLoading ? 0.7 : 1 }}
                >
                  {deleteLoading ? t('delete-modal.submitting-btn') : t('delete-modal.submit-btn')}
                </button>
              </div>
            </Space>
          ) : null}
        </Spin>
      </Modal>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AppSider({ collapsed, onMenuClick }: AppSiderProps) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout } = useAuthStore()

  const isCustomer = role === 'Customer' || role === 'Owner'

  // Pending deletion requests count (Admin/SuperAdmin only)
  const [pendingCount, setPendingCount] = useState(0)
  const isAdmin = role === 'Admin' || role === 'SuperAdmin'
  useEffect(() => {
    if (!isAdmin) return
    usersApi.getDeletionRequests('Pending')
      .then(res => setPendingCount(res.data.length))
      .catch(() => {/* silently ignore */})
  }, [isAdmin])

  if (isCustomer) return <CustomerSider collapsed={collapsed} />

  const visibleItems = MENU_ITEMS.filter(
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
              key:   item.key,
              icon:  item.key === '/deletion-requests' && pendingCount > 0
                ? <Badge count={pendingCount} size="small" offset={[6, 0]}>{item.icon}</Badge>
                : item.icon,
              label: item.key === '/deletion-requests' && pendingCount > 0 && !collapsed
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t(item.labelKey)}
                    <span style={{
                      background: '#ff4d4f', color: '#fff',
                      borderRadius: 10, fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', marginLeft: 4,
                    }}>{pendingCount}</span>
                  </span>
                : t(item.labelKey),
              onClick: () => { navigate(item.key); onMenuClick?.() },
            }))}
          />
        </div>

        {/* Logout */}
        <div style={{
          borderTop:  '1px solid rgba(255,255,255,0.08)',
          padding:    collapsed ? '10px 6px' : '10px 12px',
          flexShrink: 0,
        }}>
          <button
            onClick={handleLogout}
            title={collapsed ? t('nav.logout') : undefined}
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
            {!collapsed && t('nav.logout')}
          </button>
        </div>

      </div>
    </Sider>
  )
}
