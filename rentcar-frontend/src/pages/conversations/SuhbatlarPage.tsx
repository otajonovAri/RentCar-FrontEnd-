import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Empty, Input, Spin, Tag, theme, Avatar, Grid } from 'antd'
import {
  SendOutlined, CheckCircleFilled, ClockCircleFilled,
  MessageFilled, CarFilled, ReloadOutlined, ArrowLeftOutlined,
  CheckOutlined, AppstoreFilled,
} from '@ant-design/icons'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { uz } from 'date-fns/locale'
import { conversationsApi } from '@/api/conversationsApi'
import type { ConversationDto, ConversationStatus, MessageDto } from '@/types/conversations'
import { useAuthStore } from '@/store/authStore'

const STATUS_CONFIG = {
  Open:       { label: 'Ochiq',               color: '#1677ff', icon: <ClockCircleFilled /> },
  InProgress: { label: "Ko'rib chiqilmoqda",  color: '#fa8c16', icon: <ClockCircleFilled /> },
  Resolved:   { label: 'Hal qilindi',         color: '#52c41a', icon: <CheckCircleFilled /> },
  Closed:     { label: 'Yopildi',             color: '#8c8c8c', icon: <CheckCircleFilled /> },
}

/** Formats a date for the day-separator chip */
function formatDay(date: Date): string {
  if (isToday(date))     return 'Bugun'
  if (isYesterday(date)) return 'Kecha'
  return format(date, 'd MMMM yyyy', { locale: uz })
}

/** Role → O'zbek tilida qisqa nom */
function roleLabel(role: string): string {
  switch (role) {
    case 'SuperAdmin': return 'Super Admin'
    case 'Admin':      return 'Admin'
    case 'Manager':    return 'Menejer'
    case 'Owner':      return 'Egasi'
    default:           return ''
  }
}

/** "To'lov so'rovi — Ijara #7" → { title: "To'lov so'rovi", rental: "Ijara #7" } */
function parseSubject(subject: string): { title: string; rental: string | null } {
  const idx = subject.indexOf(' — ')
  if (idx !== -1) return { title: subject.slice(0, idx), rental: subject.slice(idx + 3) }
  return { title: subject, rental: null }
}

/** Avatar background gradient based on first letter */
function nameToGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg,#1677ff,#6366f1)',
    'linear-gradient(135deg,#52c41a,#13c2c2)',
    'linear-gradient(135deg,#fa8c16,#fadb14)',
    'linear-gradient(135deg,#eb2f96,#f759ab)',
    'linear-gradient(135deg,#722ed1,#b37feb)',
    'linear-gradient(135deg,#13c2c2,#36cfc9)',
  ]
  return gradients[(name.charCodeAt(0) ?? 0) % gradients.length]
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function SuhbatlarPage() {
  const { token }            = theme.useToken()
  const screens              = Grid.useBreakpoint()
  const isMobile             = !screens.md
  const { userId, role } = useAuthStore()
  const isAdmin = role === 'Admin' || role === 'SuperAdmin' || role === 'Manager'
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [loading, setLoading]             = useState(false)
  const [statusFilter, setStatusFilter]   = useState<ConversationStatus | 'all'>('all')
  const [activeId, setActiveId]           = useState<number | null>(null)
  const [messages, setMessages]           = useState<MessageDto[]>([])
  const [msgLoading, setMsgLoading]       = useState(false)
  const [newMsg, setNewMsg]               = useState('')
  const [sending, setSending]             = useState(false)
  const [closing, setClosing]             = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const activeConv = conversations.find(c => c.id === activeId) ?? null

  // ── Conversations list ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Admin/Manager: userId filtrisiz → backend barcha suhbatlarni qaytaradi
      // Customer/Owner: faqat o'z suhbatlarini ko'radi
      const params = isAdmin
        ? { pageSize: 100 }
        : { userId, pageSize: 50 }
      const res = await conversationsApi.getAll(params)
      setConversations(res.data.items)
    } finally {
      setLoading(false)
    }
  }, [userId, isAdmin])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Messages ──────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: number) => {
    setMsgLoading(true)
    try {
      const res = await conversationsApi.getMessages(convId, 1, 100)
      setMessages(res.data.items)
      if (userId) await conversationsApi.markRead(convId, userId)
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
      )
    } finally {
      setMsgLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
    else setMessages([])
  }, [activeId, loadMessages])

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Focus input when conversation opens ──────────────────────────────────
  useEffect(() => {
    if (activeId && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeId, isMobile])

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeId) loadMessages(activeId)
      loadConversations()
    }, 10_000)
    return () => clearInterval(timer)
  }, [activeId, loadMessages, loadConversations])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMsg.trim() || !activeId || !userId) return
    setSending(true)
    try {
      const msg = await conversationsApi.sendMessage(activeId, userId, newMsg.trim())
      setMessages(prev => [...prev, msg.data])
      setNewMsg('')
      loadConversations()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Admin: suhbatni yopish ────────────────────────────────────────────────
  const handleClose = async () => {
    if (!activeId) return
    setClosing(true)
    try {
      await conversationsApi.close(activeId)
      setConversations(prev =>
        prev.map(c => c.id === activeId ? { ...c, status: 'Closed' as ConversationStatus } : c)
      )
    } finally {
      setClosing(false)
    }
  }

  const handleSelectConv = (id: number) => {
    setActiveId(id)
  }

  const handleBack = () => {
    setActiveId(null)
    setMessages([])
  }

  // ── Body scroll lock (sahifa scroll qilmasin) ────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflowY
    document.body.style.overflowY = 'hidden'
    return () => { document.body.style.overflowY = prev }
  }, [])

  // ── Height ────────────────────────────────────────────────────────────────
  // Scroll container = flex:1 div (100vh - 56px header)
  // Content padding: mobile 12px×2=24px, desktop 24px×2=48px
  // Mobile: 60px bottom nav + 24px content padding = 84px extra
  // Desktop: 48px content padding only
  const pageHeight = isMobile
    ? 'calc(100dvh - 56px - 84px)'
    : 'calc(100vh - 56px - 48px)'

  // Filtered conversations
  const filteredConvs = statusFilter === 'all'
    ? conversations
    : conversations.filter(c => c.status === statusFilter)

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0)

  // ── Conversation List Panel ───────────────────────────────────────────────
  const STATUS_FILTER_CFG: { val: ConversationStatus | 'all'; label: string; color: string }[] = [
    { val:'all',        label:'Barchasi',        color:'#1677ff' },
    { val:'Open',       label:'Ochiq',           color:'#1677ff' },
    { val:'InProgress', label:"Ko'rilmoqda",     color:'#fa8c16' },
    { val:'Resolved',   label:'Hal qilindi',     color:'#52c41a' },
    { val:'Closed',     label:'Yopildi',         color:'#8c8c8c' },
  ]

  const ListPanel = (
    <div style={{
      width:         isMobile ? '100%' : 320,
      flexShrink:    0,
      borderRight:   isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`,
      display:       (isMobile && activeId) ? 'none' : 'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      height:        '100%',
    }}>
      {/* ── Gradient Header ── */}
      <div style={{
        background:   'linear-gradient(135deg,#0a1628 0%,#1677ff 70%,#6366f1 100%)',
        padding:      '14px 14px 0',
        flexShrink:   0,
      }}>
        {/* Title row */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:'rgba(255,255,255,0.15)',
              backdropFilter:'blur(6px)',
              border:'1px solid rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <MessageFilled style={{ fontSize:16, color:'#fff' }}/>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'#fff', lineHeight:1.1 }}>Suhbatlar</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.65)' }}>
                {conversations.length} ta
                {totalUnread > 0 && ` · ${totalUnread} yangi`}
              </div>
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined style={{ color:'rgba(255,255,255,0.8)' }}/>}
            loading={loading}
            onClick={loadConversations}
            style={{ borderRadius:8, color:'rgba(255,255,255,0.8)' }}
          />
        </div>

        {/* Status filter chips */}
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:10, scrollbarWidth:'none' }}>
          {STATUS_FILTER_CFG.map(f => {
            const active = statusFilter === f.val
            const cnt = f.val === 'all'
              ? conversations.length
              : conversations.filter(c => c.status === f.val).length
            if (cnt === 0 && f.val !== 'all') return null
            return (
              <button
                key={f.val}
                onClick={() => setStatusFilter(f.val)}
                style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  padding:'4px 10px', borderRadius:20,
                  border:`1px solid ${active ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                  background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  color:'#fff', cursor:'pointer',
                  fontWeight: active ? 700 : 400, fontSize:11,
                  whiteSpace:'nowrap', flexShrink:0,
                  transition:'all 0.15s',
                }}
              >
                {f.val === 'all' ? <AppstoreFilled style={{ fontSize:10 }}/> : null}
                {f.label}
                {cnt > 0 && (
                  <span style={{
                    background: active ? '#fff' : 'rgba(255,255,255,0.25)',
                    color: active ? f.color : '#fff',
                    borderRadius:20, minWidth:14, height:14, lineHeight:'14px',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontSize:9, fontWeight:700, padding:'0 3px',
                  }}>
                    {cnt}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && conversations.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}><Spin size="large" /></div>
        ) : filteredConvs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Suhbatlar yo'q"
            style={{ marginTop: 60 }}
          />
        ) : (
          filteredConvs.map(conv => {
            const isActive = conv.id === activeId
            const hasUnread = conv.unreadCount > 0
            const lastTime  = conv.lastMessageAt ?? conv.createdAt
            const timeStr   = isToday(new Date(lastTime))
              ? format(new Date(lastTime), 'HH:mm')
              : format(new Date(lastTime), 'dd.MM.yy', { locale: uz })

            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                style={{
                  padding:      '12px 16px',
                  cursor:       'pointer',
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  background:   isActive ? token.colorPrimaryBg : 'transparent',
                  display:      'flex',
                  gap:          12,
                  alignItems:   'center',
                  transition:   'background 0.15s',
                  position:     'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = token.colorFillAlter
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {/* Active indicator stripe */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: 3, background: token.colorPrimary, borderRadius: '0 2px 2px 0',
                  }} />
                )}

                {/* Avatar — admin: client rasmi, client: gradient */}
                {isAdmin && conv.createdByAvatarUrl ? (
                  <Avatar
                    size={46}
                    src={conv.createdByAvatarUrl}
                    style={{ flexShrink: 0 }}
                  />
                ) : (
                  <Avatar
                    size={46}
                    style={{
                      background: nameToGradient(conv.createdByName),
                      fontWeight: 700,
                      fontSize:   16,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(conv.createdByName)}
                  </Avatar>
                )}

                {/* Content */}
                {(() => {
                  const { title, rental } = parseSubject(conv.subject)
                  const displayTitle = isAdmin ? title : 'Support Chat'
                  return (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: title + time */}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{
                          fontWeight:   hasUnread ? 700 : 600,
                          fontSize:     14,
                          color:        token.colorText,
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                          flex:         1,
                          marginRight:  8,
                        }}>
                          {displayTitle}
                        </span>
                        <span style={{
                          fontSize:  11,
                          color:     hasUnread ? token.colorPrimary : token.colorTextTertiary,
                          fontWeight: hasUnread ? 600 : 400,
                          flexShrink: 0,
                        }}>
                          {timeStr}
                        </span>
                      </div>

                      {/* Row 2: rental badge + last msg */}
                      {isAdmin && (rental || conv.rentalId) && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{
                            display:      'inline-flex',
                            alignItems:   'center',
                            gap:          4,
                            fontSize:     10,
                            fontWeight:   600,
                            color:        token.colorPrimary,
                            background:   `${token.colorPrimary}15`,
                            border:       `1px solid ${token.colorPrimary}30`,
                            borderRadius: 10,
                            padding:      '1px 7px',
                          }}>
                            <CarFilled style={{ fontSize: 9 }} />
                            {rental ?? `Ijara #${conv.rentalId}`}
                          </span>
                        </div>
                      )}

                      {/* Row 3: last message + unread badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize:     12,
                          color:        token.colorTextSecondary,
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                          flex:         1,
                        }}>
                          {conv.lastMessageBody ?? 'Xabar yo\'q'}
                        </span>
                        {hasUnread && (
                          <div style={{
                            background:   token.colorPrimary,
                            color:        '#fff',
                            borderRadius: 20,
                            minWidth:     18,
                            height:       18,
                            display:      'flex',
                            alignItems:   'center',
                            justifyContent: 'center',
                            fontSize:     11,
                            fontWeight:   700,
                            padding:      '0 5px',
                            marginLeft:   6,
                            flexShrink:   0,
                          }}>
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  // ── Chat Panel ────────────────────────────────────────────────────────────
  const isClosed = activeConv?.status === 'Closed' || activeConv?.status === 'Resolved'

  const ChatPanel = (
    <div style={{
      flex:          1,
      display:       (isMobile && !activeId) ? 'none' : 'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      height:        '100%',
      width:         isMobile ? '100%' : undefined,
    }}>
      {!activeId ? (
        /* ── Empty state (desktop) ── */
        <div style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            16,
        }}>
          <div style={{
            width:          80,
            height:         80,
            borderRadius:   '50%',
            background:     token.colorFillSecondary,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <MessageFilled style={{ fontSize: 36, color: token.colorTextTertiary, opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: token.colorText, marginBottom: 4 }}>
              Suhbatni tanlang
            </div>
            <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
              Xabarlarni ko'rish uchun chap paneldan suhbat tanlang
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Chat Header ── */}
          <div style={{
            padding:      '10px 16px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            background:   token.colorBgContainer,
            minHeight:    56,
            flexShrink:   0,
          }}>
            {isMobile && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                style={{ marginLeft: -8, borderRadius: 8 }}
              />
            )}

            {isAdmin && activeConv?.createdByAvatarUrl ? (
              <Avatar
                size={38}
                src={activeConv.createdByAvatarUrl}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <Avatar
                size={38}
                style={{
                  background: nameToGradient(activeConv?.createdByName ?? '?'),
                  fontWeight: 700,
                  fontSize:   14,
                  flexShrink: 0,
                }}
              >
                {getInitials(activeConv?.createdByName ?? '?')}
              </Avatar>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight:   700,
                fontSize:     14,
                color:        token.colorText,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {isAdmin ? activeConv?.subject : 'Support Chat'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isAdmin && activeConv?.rentalId && (
                  <span style={{ fontSize: 11, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CarFilled style={{ fontSize: 10 }} />
                    Ijara #{activeConv.rentalId}
                  </span>
                )}
                {activeConv?.status && (
                  <Tag
                    icon={STATUS_CONFIG[activeConv.status as keyof typeof STATUS_CONFIG]?.icon}
                    style={{
                      fontSize:   10,
                      padding:    '0 6px',
                      margin:     0,
                      lineHeight: '18px',
                      color:      STATUS_CONFIG[activeConv.status as keyof typeof STATUS_CONFIG]?.color,
                      background: `${STATUS_CONFIG[activeConv.status as keyof typeof STATUS_CONFIG]?.color}18`,
                      border:     `1px solid ${STATUS_CONFIG[activeConv.status as keyof typeof STATUS_CONFIG]?.color}30`,
                      borderRadius: 10,
                      display:    'inline-flex',
                      alignItems: 'center',
                      gap:        3,
                    }}
                  >
                    {STATUS_CONFIG[activeConv.status as keyof typeof STATUS_CONFIG]?.label}
                  </Tag>
                )}
              </div>
            </div>

            {/* Admin: suhbatni yopish tugmasi */}
            {isAdmin && !isClosed && (
              <Button
                size="small"
                danger
                loading={closing}
                onClick={handleClose}
                style={{ borderRadius: 8, fontSize: 12, flexShrink: 0 }}
              >
                Yopish
              </Button>
            )}
          </div>

          {/* ── Messages area ── */}
          <div style={{
            flex:       1,
            overflowY:  'auto',
            padding:    '12px 16px 8px',
            background: token.colorBgLayout,
            display:    'flex',
            flexDirection: 'column',
          }}>
            {msgLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hali xabar yo'q" />
              </div>
            ) : (
              (() => {
                const nodes: React.ReactNode[] = []
                let lastDate: Date | null = null

                messages.forEach((msg, idx) => {
                  const sentAt  = new Date(msg.sentAt)
                  const isMine  = msg.senderId === userId
                  const isNext  = idx > 0 && messages[idx - 1].senderId === msg.senderId
                  const isLast  = idx === messages.length - 1 ||
                                  messages[idx + 1].senderId !== msg.senderId

                  // Day separator
                  if (!lastDate || !isSameDay(lastDate, sentAt)) {
                    lastDate = sentAt
                    nodes.push(
                      <div key={`day-${idx}`} style={{
                        textAlign:  'center',
                        margin:     '12px 0 8px',
                        position:   'relative',
                      }}>
                        <span style={{
                          background:   token.colorBgContainer,
                          color:        token.colorTextTertiary,
                          fontSize:     11,
                          fontWeight:   500,
                          padding:      '3px 12px',
                          borderRadius: 20,
                          border:       `1px solid ${token.colorBorderSecondary}`,
                          display:      'inline-block',
                        }}>
                          {formatDay(sentAt)}
                        </span>
                      </div>
                    )
                  }

                  nodes.push(
                    <div
                      key={msg.id}
                      style={{
                        display:       'flex',
                        flexDirection: isMine ? 'row-reverse' : 'row',
                        alignItems:    'flex-end',
                        gap:           6,
                        marginBottom:  isLast ? 6 : 2,
                      }}
                    >
                      {/* Avatar — faqat guruh oxirgi xabari uchun */}
                      <div style={{ width: 28, flexShrink: 0 }}>
                        {!isMine && isLast && (
                          msg.senderAvatarUrl ? (
                            <Avatar size={28} src={msg.senderAvatarUrl} />
                          ) : (
                            <Avatar
                              size={28}
                              style={{
                                background: nameToGradient(msg.senderName),
                                fontWeight: 700,
                                fontSize:   11,
                              }}
                            >
                              {getInitials(msg.senderName)}
                            </Avatar>
                          )
                        )}
                      </div>

                      {/* Bubble */}
                      <div style={{ maxWidth: isMobile ? '82%' : '65%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        {/* Sender: "Super Admin | Ism" yoki faqat "Ism" */}
                        {!isMine && !isNext && (
                          <span style={{
                            fontSize:     11,
                            fontWeight:   600,
                            color:        token.colorPrimary,
                            marginBottom: 2,
                            marginLeft:   14,
                          }}>
                            {roleLabel(msg.senderRole)
                              ? `${roleLabel(msg.senderRole)} | ${msg.senderName}`
                              : msg.senderName}
                          </span>
                        )}

                        <div style={{
                          padding:      '8px 12px 6px',
                          borderRadius: isMine
                            ? (isLast ? '16px 4px 16px 16px' : '16px 16px 16px 16px')
                            : (isLast ? '4px 16px 16px 16px' : '16px 16px 16px 16px'),
                          background:   isMine ? token.colorPrimary : token.colorBgContainer,
                          color:        isMine ? '#fff' : token.colorText,
                          fontSize:     14,
                          lineHeight:   1.5,
                          whiteSpace:   'pre-wrap',
                          wordBreak:    'break-word',
                          boxShadow:    `0 1px 2px rgba(0,0,0,${isMine ? '0.15' : '0.08'})`,
                          position:     'relative',
                        }}>
                          {msg.body}

                          {/* Time + read indicator inside bubble */}
                          <div style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         2,
                            justifyContent: 'flex-end',
                            marginTop:   3,
                            marginBottom: -2,
                          }}>
                            <span style={{
                              fontSize: 10,
                              color:    isMine ? 'rgba(255,255,255,0.7)' : token.colorTextTertiary,
                              lineHeight: 1,
                            }}>
                              {format(sentAt, 'HH:mm')}
                            </span>
                            {isMine && (
                              <CheckOutlined style={{
                                fontSize: 10,
                                color:    'rgba(255,255,255,0.8)',
                                marginLeft: 1,
                              }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
                return nodes
              })()
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input area ── */}
          {isClosed ? (
            <div style={{
              padding:        '12px 16px',
              borderTop:      `1px solid ${token.colorBorderSecondary}`,
              textAlign:      'center',
              background:     token.colorBgContainer,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
            }}>
              {activeConv?.status === 'Resolved'
                ? <><CheckCircleFilled style={{ color: '#52c41a', fontSize: 15 }} />
                    <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
                      Suhbat hal qilindi — to'lov tasdiqlandi
                    </span></>
                : <><span style={{ fontSize: 15 }}>🔒</span>
                    <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
                      Suhbat yopilgan
                    </span></>
              }
            </div>
          ) : (
            <div style={{
              padding:    '8px 12px',
              borderTop:  `1px solid ${token.colorBorderSecondary}`,
              background: token.colorBgContainer,
              display:    'flex',
              gap:        8,
              alignItems: 'flex-end',
            }}>
              <Input.TextArea
                ref={inputRef as React.RefObject<any>}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Xabar yozing..."
                autoSize={{ minRows: 1, maxRows: 5 }}
                style={{
                  borderRadius: 22,
                  flex:         1,
                  resize:       'none',
                  padding:      '8px 14px',
                  fontSize:     14,
                  lineHeight:   '1.5',
                }}
                variant="filled"
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined style={{ marginLeft: 2 }} />}
                onClick={handleSend}
                loading={sending}
                disabled={!newMsg.trim()}
                size="large"
                style={{
                  width:      44,
                  height:     44,
                  flexShrink: 0,
                  background: newMsg.trim() ? token.colorPrimary : undefined,
                  boxShadow:  newMsg.trim() ? '0 2px 8px rgba(22,119,255,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display:      'flex',
      height:       pageHeight,
      overflow:     'hidden',
      border:       `1px solid ${token.colorBorderSecondary}`,
      borderRadius: 14,
      background:   token.colorBgContainer,
    }}>
      {ListPanel}
      {ChatPanel}
    </div>
  )
}
