import { useEffect, useState, useCallback } from 'react'
import {
  Layout, Button, Avatar, Typography, Space,
  Tooltip, theme, Grid, Badge,
} from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined,
  SunOutlined, MoonOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { conversationsApi } from '@/api/conversationsApi'
import { notificationsApi } from '@/api/notificationsApi'

const { Header } = Layout
const { Text } = Typography

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Administrator',
  Manager:    'Menejer',
  Owner:      'Egasi',
  Customer:   'Mijoz',
}

interface AppHeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const navigate = useNavigate()
  const { fullName, role, userId, avatarUrl } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const { token } = theme.useToken()
  const screens   = Grid.useBreakpoint()
  const isMobile  = !screens.lg

  const isClient = role === 'Customer' || role === 'Owner'

  // ── Unread counts (badge only) ──────────────────────────────────────────────
  const [unreadMsgs,  setUnreadMsgs]  = useState(0)
  const [unreadNotif, setUnreadNotif] = useState(0)
  const totalUnread = unreadMsgs + unreadNotif

  const loadCounts = useCallback(() => {
    if (!userId) return
    conversationsApi.getUnreadCount(userId)
      .then(r => setUnreadMsgs(r.data)).catch(() => {})
    notificationsApi.getAll({ userId, page: 1, pageSize: 1, unreadOnly: true })
      .then(r => setUnreadNotif(r.data.totalCount)).catch(() => {})
  }, [userId])

  useEffect(() => {
    loadCounts()
    const t = setInterval(loadCounts, 15_000)
    return () => clearInterval(t)
  }, [loadCounts])

  const initials = (fullName ?? 'U')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

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

        {/* 🔔 Bell — click → /notifications */}
        <Badge count={totalUnread} size="small" offset={[-4, 4]}>
          <Button
            type="text" shape="circle"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ width: 40, height: 40 }}
            onClick={() => navigate('/notifications')}
          />
        </Badge>

        {/* User avatar — Customer/Owner mobile'da ko'rinmaydi (bottom nav'da profil bor) */}
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
  )
}
