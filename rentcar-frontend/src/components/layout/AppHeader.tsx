import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Layout, Button, Avatar, Typography, Space,
  Tooltip, theme, Grid, Badge,
} from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined,
  SunOutlined, MoonOutlined,
  BellOutlined, SearchOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore }          from '@/store/authStore'
import { useThemeStore }         from '@/store/themeStore'
import { notificationsApi }      from '@/api/notificationsApi'
import { signalRService }        from '@/services/signalRService'
import type { SignalRNotification } from '@/services/signalRService'
import { useKeyboardShortcut }   from '@/hooks/useKeyboardShortcut'
import GlobalSearch              from '@/components/GlobalSearch'

const { Header } = Layout
const { Text }   = Typography

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Administrator',
  Manager:    'Menejer',
  Owner:      'Egasi',
  Customer:   'Mijoz',
}

interface AppHeaderProps {
  collapsed: boolean
  onToggle:  () => void
}

export default function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const navigate = useNavigate()
  const { fullName, role, userId, avatarUrl } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.lg

  const isClient = role === 'Customer' || role === 'Owner'

  // ── Global Search state ──────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl+K / Cmd+K → open search
  useKeyboardShortcut('k', () => setSearchOpen(true), {
    modifiers: ['ctrl'],
    ignoreInputFocus: false,
  })

  // ── Unread notification count + bell shake animation ─────────────────────
  const [unreadNotif,  setUnreadNotif]  = useState(0)
  const [bellShakeKey, setBellShakeKey] = useState(0)
  const prevNotifRef = useRef(0)

  const loadCounts = useCallback(() => {
    if (!userId) return
    notificationsApi.getAll({ userId, page: 1, pageSize: 1, unreadOnly: true })
      .then(r => {
        const count = r.data.totalCount
        setUnreadNotif(count)
        prevNotifRef.current = count
      })
      .catch(() => {})
  }, [userId])

  useEffect(() => { loadCounts() }, [loadCounts])

  // ── SignalR real-time notifications ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const onReceiveNotification = (_notif: SignalRNotification) => {
      setUnreadNotif(prev => {
        const next = prev + 1
        prevNotifRef.current = next
        setBellShakeKey(k => k + 1)
        return next
      })
    }

    const onUnreadCountUpdated = (count: number) => {
      if (count === -1) {
        loadCounts()
      } else {
        if (count > prevNotifRef.current) setBellShakeKey(k => k + 1)
        prevNotifRef.current = count
        setUnreadNotif(count)
      }
    }

    signalRService.on('ReceiveNotification', onReceiveNotification)
    signalRService.on('UnreadCountUpdated',  onUnreadCountUpdated)

    return () => {
      signalRService.off('ReceiveNotification', onReceiveNotification)
      signalRService.off('UnreadCountUpdated',  onUnreadCountUpdated)
    }
  }, [userId, loadCounts])

  const initials = (fullName ?? 'U')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <>
      <Header style={{
        padding:        '0 16px',
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        justifyContent: 'space-between',
        background:     token.colorBgContainer,
        boxShadow:      `0 1px 0 ${token.colorBorderSecondary}`,
        zIndex:         10,
        height:         56,
        flexShrink:     0,
      }}>
        {/* ── Left: sidebar toggle ──────────────────────────────────────── */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{ fontSize: 18, width: 40, height: 40, flexShrink: 0 }}
        />

        {/* ── Center: Search bar ────────────────────────────────────────── */}
        <div
          onClick={() => setSearchOpen(true)}
          style={{
            flex:        1,
            maxWidth:    400,
            display:     'flex',
            alignItems:  'center',
            gap:         8,
            padding:     '0 12px',
            height:      34,
            borderRadius: 8,
            border:      `1px solid ${token.colorBorderSecondary}`,
            cursor:      'pointer',
            background:  token.colorFillAlter,
            transition:  'border-color 0.2s, box-shadow 0.2s',
            userSelect:  'none',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = '#1677ff'
            ;(e.currentTarget as HTMLDivElement).style.boxShadow   = '0 0 0 2px rgba(22,119,255,0.1)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLDivElement).style.borderColor = token.colorBorderSecondary
            ;(e.currentTarget as HTMLDivElement).style.boxShadow   = 'none'
          }}
        >
          <SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 14, flexShrink: 0 }} />

          {!isMobile && (
            <span style={{ flex: 1, fontSize: 13, color: token.colorTextTertiary }}>
              Qidirish...
            </span>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', gap: 2 }}>
              {['Ctrl', 'K'].map(k => (
                <kbd key={k} style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 4,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  color: token.colorTextTertiary, lineHeight: 1.6,
                }}>
                  {k}
                </kbd>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: theme + bell + user ────────────────────────────────── */}
        <Space size={4}>
          <Tooltip title={isDark ? 'Kunduzgi rejim' : 'Tungi rejim'}>
            <Button
              type="text" shape="circle"
              icon={isDark
                ? <SunOutlined  style={{ fontSize: 17, color: '#faad14' }} />
                : <MoonOutlined style={{ fontSize: 17 }} />}
              onClick={toggle}
              style={{ width: 40, height: 40 }}
            />
          </Tooltip>

          {/* 🔔 Bell — animated badge */}
          <div className={unreadNotif > 0 ? 'notif-badge-pulse' : ''}>
            <Badge count={unreadNotif} size="small" offset={[-4, 4]}>
              <Button
                type="text" shape="circle"
                icon={
                  <span key={bellShakeKey} className={bellShakeKey > 0 ? 'notif-bell-shake' : ''}>
                    <BellOutlined style={{ fontSize: 18 }} />
                  </span>
                }
                style={{ width: 40, height: 40 }}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
          </div>

          {/* User avatar — hidden on mobile for Customer/Owner */}
          {!(isMobile && isClient) && (
            <Space
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: token.borderRadius }}
            >
              <Avatar
                size={34}
                src={avatarUrl ?? undefined}
                style={{
                  background: 'linear-gradient(135deg, #1677ff 0%, #6366f1 100%)',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}
              >
                {!avatarUrl && initials}
              </Avatar>
              <div style={{ display: screens?.sm ? 'flex' : 'none', flexDirection: 'column', lineHeight: 1.3 }}>
                <Text strong style={{ fontSize: 13 }}>{fullName}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {ROLE_LABELS[role ?? ''] ?? role}
                </Text>
              </div>
            </Space>
          )}
        </Space>
      </Header>

      {/* ── Global search command palette ─────────────────────────────── */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
