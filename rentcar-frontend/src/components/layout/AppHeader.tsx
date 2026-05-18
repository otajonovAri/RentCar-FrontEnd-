import { useEffect, useState, useCallback } from 'react'
import {
  Layout, Button, Avatar, Dropdown, Typography, Space,
  Tooltip, theme, Grid, Badge, Popover, Drawer, Tabs, Empty, Spin,
} from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, SettingOutlined, SunOutlined, MoonOutlined,
  BellOutlined, MessageOutlined, RightOutlined,
  CheckCircleFilled, ClockCircleFilled,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { authApi } from '@/api/authApi'
import { conversationsApi } from '@/api/conversationsApi'
import { notificationsApi } from '@/api/notificationsApi'
import type { ConversationDto } from '@/types/conversations'
import type { NotificationDto } from '@/types/notifications'
import type { MenuProps } from 'antd'
import { format, isToday } from 'date-fns'

const { Header } = Layout
const { Text } = Typography

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Administrator',
  Manager:    'Menejer',
  Owner:      'Egasi',
  Customer:   'Mijoz',
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  OwnerPayoutPaid:    <CheckCircleFilled style={{ color: '#52c41a' }} />,
  OwnerPayoutCreated: <CheckCircleFilled style={{ color: '#1677ff' }} />,
  CarListingApproved: <CheckCircleFilled style={{ color: '#52c41a' }} />,
  CarListingRejected: <ClockCircleFilled style={{ color: '#f5222d' }} />,
}

function notifIcon(type: string) {
  return NOTIF_ICONS[type] ?? <BellOutlined style={{ color: '#1677ff' }} />
}

interface AppHeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const navigate = useNavigate()
  const { fullName, role, logout, userId, avatarUrl } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  const isClient = role === 'Customer' || role === 'Owner'

  // ── Counts ─────────────────────────────────────────────────────────────────
  const [unreadMsgs,  setUnreadMsgs]  = useState(0)
  const [unreadNotif, setUnreadNotif] = useState(0)
  const totalUnread = unreadMsgs + unreadNotif

  // ── Panel state ─────────────────────────────────────────────────────────────
  const [popOpen,   setPopOpen]   = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [convs,     setConvs]     = useState<ConversationDto[]>([])
  const [notifs,    setNotifs]    = useState<NotificationDto[]>([])
  const [loadingC,  setLoadingC]  = useState(false)
  const [loadingN,  setLoadingN]  = useState(false)

  // ── Background polling ──────────────────────────────────────────────────────
  const loadCounts = useCallback(() => {
    if (!userId) return
    conversationsApi.getUnreadCount(userId)
      .then(r => setUnreadMsgs(r.data)).catch(() => {})
    notificationsApi.getAll({ userId, page: 1, pageSize: 5, unreadOnly: true })
      .then(r => setUnreadNotif(r.data.totalCount)).catch(() => {})
  }, [userId])

  useEffect(() => {
    loadCounts()
    const t = setInterval(loadCounts, 15_000)
    return () => clearInterval(t)
  }, [loadCounts])

  // ── Load panel data ─────────────────────────────────────────────────────────
  const loadPanelData = useCallback(async () => {
    if (!userId) return
    setLoadingC(true)
    setLoadingN(true)
    conversationsApi.getAll({ userId, pageSize: 6 })
      .then(r => setConvs(r.data.items)).catch(() => {})
      .finally(() => setLoadingC(false))
    notificationsApi.getAll({ userId, page: 1, pageSize: 6 })
      .then(r => setNotifs(r.data.items)).catch(() => {})
      .finally(() => setLoadingN(false))
  }, [userId])

  const handleOpen = () => {
    setPopOpen(true)
    loadPanelData()
  }
  const handleClose = () => setPopOpen(false)
  const handlePopoverChange = (open: boolean) => {
    setPopOpen(open)
    if (open) loadPanelData()
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    finally { logout(); navigate('/login', { replace: true }) }
  }

  const initials = (fullName ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

  const menuItems: MenuProps['items'] = [
    { key: 'profile', icon: <SettingOutlined />, label: 'Profil sozlamalari', onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Chiqish', danger: true, onClick: handleLogout },
  ]

  // ── Shared panel content ────────────────────────────────────────────────────
  const panelContent = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      size="small"
      style={{ width: '100%' }}
      items={[
        {
          key: 'chat',
          label: (
            <span>
              <MessageOutlined style={{ marginRight: 4 }} />
              Chat
              {unreadMsgs > 0 && (
                <Badge count={unreadMsgs} size="small" style={{ marginLeft: 6 }} />
              )}
            </span>
          ),
          children: (
            <div>
              {loadingC ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : convs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Suhbat yo'q" style={{ margin: '16px 0' }} />
              ) : (
                convs.map(c => {
                  const hasUnread = c.unreadCount > 0
                  const timeStr = isToday(new Date(c.lastMessageAt ?? c.createdAt))
                    ? format(new Date(c.lastMessageAt ?? c.createdAt), 'HH:mm')
                    : format(new Date(c.lastMessageAt ?? c.createdAt), 'dd.MM')

                  return (
                    <div
                      key={c.id}
                      onClick={() => { handleClose(); navigate('/conversations') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 4px', cursor: 'pointer', borderRadius: 8,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#1677ff,#6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                      }}>
                        {isClient ? 'SC' : (c.createdByName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase())}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: hasUnread ? 700 : 500,
                          color: token.colorText,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {isClient ? 'Support Chat' : c.subject}
                        </div>
                        <div style={{
                          fontSize: 11, color: token.colorTextTertiary,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {c.lastMessageBody ?? "Xabar yo'q"}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: token.colorTextTertiary }}>{timeStr}</span>
                        {hasUnread && <Badge count={c.unreadCount} size="small" />}
                      </div>
                    </div>
                  )
                })
              )}
              <div
                onClick={() => { handleClose(); navigate('/conversations') }}
                style={{
                  textAlign: 'center', padding: '10px 0 2px', cursor: 'pointer',
                  fontSize: 12, color: token.colorPrimary, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                Barchasini ko'rish <RightOutlined style={{ fontSize: 10 }} />
              </div>
            </div>
          ),
        },
        {
          key: 'notif',
          label: (
            <span>
              <BellOutlined style={{ marginRight: 4 }} />
              Bildirishnomalar
              {unreadNotif > 0 && (
                <Badge count={unreadNotif} size="small" style={{ marginLeft: 6 }} />
              )}
            </span>
          ),
          children: (
            <div>
              {loadingN ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : notifs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bildirishnoma yo'q" style={{ margin: '16px 0' }} />
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { handleClose(); navigate('/notifications') }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 4px', cursor: 'pointer', borderRadius: 8,
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      background: n.isRead ? 'transparent' : `${token.colorPrimary}08`,
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: token.colorFillSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {notifIcon(n.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: n.isRead ? 500 : 700,
                        color: token.colorText,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: 11, color: token.colorTextSecondary, marginTop: 1,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: 10, color: token.colorTextTertiary, marginTop: 2 }}>
                        {format(new Date(n.createdAt), 'dd.MM.yyyy HH:mm')}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: token.colorPrimary, flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                  </div>
                ))
              )}
              <div
                onClick={() => { handleClose(); navigate('/notifications') }}
                style={{
                  textAlign: 'center', padding: '10px 0 2px', cursor: 'pointer',
                  fontSize: 12, color: token.colorPrimary, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                Barchasini ko'rish <RightOutlined style={{ fontSize: 10 }} />
              </div>
            </div>
          ),
        },
      ]}
    />
  )

  // ── Bell trigger ────────────────────────────────────────────────────────────
  const bellButton = (
    <Badge count={totalUnread} size="small" offset={[-4, 4]}>
      <Button
        type="text" shape="circle"
        icon={<BellOutlined style={{ fontSize: 18 }} />}
        style={{ width: 40, height: 40 }}
        onClick={isMobile ? handleOpen : undefined}
      />
    </Badge>
  )

  return (
    <Header style={{
      padding: '0 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', background: token.colorBgContainer,
      boxShadow: `0 1px 0 ${token.colorBorderSecondary}`,
      position: 'sticky', top: 0, zIndex: 10, height: 56,
    }}>
      {/* Chap: sidebar toggle */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        style={{ fontSize: 18, width: 40, height: 40 }}
      />

      {/* O'ng: theme + bell + user */}
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

        {/* 🔔 Desktop → Popover | Mobile → Drawer */}
        {isMobile ? (
          <>
            {bellButton}
            <Drawer
              open={popOpen}
              onClose={handleClose}
              placement="bottom"
              height="auto"
              styles={{
                header: { padding: '12px 16px 10px', borderBottom: `1px solid ${token.colorBorderSecondary}` },
                body:   { padding: '0 16px 20px' },
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BellOutlined style={{ color: token.colorPrimary }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Xabarnomalar</span>
                  {totalUnread > 0 && (
                    <Badge count={totalUnread} size="small" />
                  )}
                </div>
              }
            >
              {panelContent}
            </Drawer>
          </>
        ) : (
          <Popover
            content={<div style={{ width: 320 }}>{panelContent}</div>}
            trigger="click"
            placement="bottomRight"
            open={popOpen}
            onOpenChange={handlePopoverChange}
            arrow={false}
            overlayStyle={{ paddingTop: 8 }}
            overlayInnerStyle={{ padding: '8px 12px', minWidth: 340, maxWidth: 360 }}
          >
            {bellButton}
          </Popover>
        )}

        {/* User dropdown */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
          <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: token.borderRadius }}>
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
        </Dropdown>
      </Space>
    </Header>
  )
}
