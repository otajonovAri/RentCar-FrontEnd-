import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Avatar, Modal, message, Spin, Space } from 'antd'
import {
  HomeFilled, CarFilled, CalendarFilled, FileTextFilled,
  WarningFilled, BranchesOutlined, TeamOutlined,
  LogoutOutlined, DeleteOutlined, DashboardOutlined,
  DollarCircleFilled, ThunderboltFilled, AuditOutlined,
  ToolFilled, CrownFilled, TagsFilled, AppstoreFilled,
  ShopFilled, UnorderedListOutlined, PercentageOutlined,
  SolutionOutlined, GlobalOutlined, EnvironmentOutlined,
  SafetyCertificateFilled, ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { authApi } from '@/api/authApi'
import { usersApi } from '@/api/usersApi'
import type { UserRole } from '@/types/auth'
import type { DeletionBlockingInfoDto } from '@/types/users'

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
  { key: '/users',              icon: <CrownFilled />,             label: 'Foydalanuvchilar',        roles: ['Admin', 'SuperAdmin'] },
  { key: '/deletion-requests',  icon: <DeleteOutlined />,          label: "O'chirish so'rovlari",     roles: ['Admin', 'SuperAdmin'] },
]

interface Props { onClose: () => void }

export default function MobileDrawerMenu({ onClose }: Props) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDark    = useThemeStore((s) => s.isDark)
  const { fullName, role, avatarUrl, logout } = useAuthStore()

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Pending deletion requests badge (Admin/SuperAdmin only)
  const [pendingCount, setPendingCount] = useState(0)
  const isAdmin = role === 'Admin' || role === 'SuperAdmin'
  useEffect(() => {
    if (!isAdmin) return
    usersApi.getDeletionRequests('Pending')
      .then(res => setPendingCount(res.data.length))
      .catch(() => {/* silently ignore */})
  }, [isAdmin])

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

  const [eligibility,   setEligibility]   = useState<DeletionBlockingInfoDto | null>(null)
  const [eligLoading,   setEligLoading]   = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteSent,    setDeleteSent]    = useState(false)

  const handleDeleteAccount = async () => {
    setDeleteSent(false)
    setEligibility(null)
    setDeleteConfirmOpen(true)
    setEligLoading(true)
    try {
      const res = await usersApi.checkDeletionEligibility()
      setEligibility(res.data)
    } catch {
      message.error('Tekshirishda xatolik')
      setDeleteConfirmOpen(false)
    } finally {
      setEligLoading(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteLoading(true)
    try {
      await usersApi.requestDeletion()
      setDeleteSent(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } }
      message.error(e?.response?.data?.message ?? e?.response?.data?.detail ?? 'Xatolik yuz berdi')
    } finally {
      setDeleteLoading(false)
    }
  }

  const bg     = isDark ? '#141414' : '#001529'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'

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
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleItems.map(item => {
          const isActive = location.pathname === item.key ||
            (item.key !== '/' && location.pathname.startsWith(item.key))
          return (
            <div
              key={item.key}
              onClick={() => handleNav(item.key)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          12,
                padding:      '12px 14px',
                borderRadius: 10,
                cursor:       'pointer',
                background:   isActive
                  ? 'linear-gradient(135deg,rgba(22,119,255,0.45),rgba(99,102,241,0.35))'
                  : 'rgba(255,255,255,0.05)',
                border:       isActive
                  ? '1px solid rgba(22,119,255,0.5)'
                  : '1px solid rgba(255,255,255,0.07)',
                transition:   'all 0.15s',
                userSelect:   'none',
              }}
            >
              <span style={{
                fontSize:   16,
                color:      isActive ? '#60a5fa' : 'rgba(255,255,255,0.55)',
                flexShrink: 0,
                display:    'flex',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize:   13,
                fontWeight: isActive ? 700 : 400,
                color:      isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                lineHeight: 1.2,
                flex:       1,
              }}>
                {item.label}
              </span>
              {item.key === '/deletion-requests' && pendingCount > 0 && (
                <span style={{
                  background: '#ff4d4f', color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  padding: '1px 7px', flexShrink: 0,
                }}>
                  {pendingCount}
                </span>
              )}
              {isActive && item.key !== '/deletion-requests' && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#60a5fa', flexShrink: 0,
                }} />
              )}
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
        {/* Logout — barcha rollar uchun */}
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

        {/* Delete account — faqat Customer / Owner uchun */}
        {(role === 'Customer' || role === 'Owner') && (
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
        )}
      </div>

      {/* Delete account confirmation modal */}
      <Modal
        open={deleteConfirmOpen}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteSent(false) }}
        footer={null}
        title={<span style={{ color: '#ff4d4f' }}><DeleteOutlined style={{ marginRight: 8 }} />Hisobni o'chirish</span>}
        centered
        width={400}
      >
        <Spin spinning={eligLoading}>
          {deleteSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
              <p style={{ fontWeight: 700, fontSize: 15 }}>So'rovingiz yuborildi!</p>
              <p style={{ color: '#8c8c8c', fontSize: 13 }}>Admin ko'rib chiqadi va xabar beriladi.</p>
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteSent(false) }}
                style={{ marginTop: 12, padding: '8px 24px', borderRadius: 8, background: '#52c41a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Yopish
              </button>
            </div>
          ) : eligibility && !eligibility.canDelete ? (
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <p style={{ color: '#ff4d4f', fontWeight: 600 }}>Hisobni o'chirib bo'lmaydi:</p>
              {eligibility.activeRentalsCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', fontSize: 13 }}>
                  🚗 <strong>{eligibility.activeRentalsCount} ta</strong> faol/kutilayotgan ijara mavjud
                </div>
              )}
              {eligibility.pendingReservationsCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)', fontSize: 13 }}>
                  📅 <strong>{eligibility.pendingReservationsCount} ta</strong> kutilayotgan bron mavjud
                </div>
              )}
              {eligibility.unpaidFinesCount > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(250,140,22,0.06)', border: '1px solid rgba(250,140,22,0.2)', fontSize: 13 }}>
                  ⚠️ <strong>{eligibility.unpaidFinesCount} ta</strong> to'lanmagan jarima ({eligibility.unpaidFinesAmount.toLocaleString()} UZS)
                </div>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                style={{ width: '100%', marginTop: 4, padding: '9px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
              >
                Yopish
              </button>
            </Space>
          ) : eligibility?.canDelete ? (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', fontSize: 13, lineHeight: 1.6 }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
                So'rov yuborilgach admin ko'rib chiqadi. Tasdiqlangandan keyingina hisob o'chiriladi.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
                >
                  Bekor
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  style={{ padding: '8px 18px', borderRadius: 8, background: '#ff4d4f', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: deleteLoading ? 0.7 : 1 }}
                >
                  {deleteLoading ? 'Yuborilmoqda...' : "So'rov yuborish"}
                </button>
              </div>
            </Space>
          ) : null}
        </Spin>
      </Modal>
    </div>
  )
}
