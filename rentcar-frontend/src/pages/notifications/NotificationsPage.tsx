import { useState, useEffect, useCallback } from 'react'
import { Button, message, theme, Spin, Grid } from 'antd'
import {
  BellFilled, CheckOutlined, CheckCircleFilled,
  InfoCircleFilled, WarningFilled, CloseCircleFilled,
  DollarCircleFilled, CarFilled, FileTextFilled,
} from '@ant-design/icons'
import { notificationsApi } from '@/api/notificationsApi'
import type { NotificationDto } from '@/types/notifications'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import { useAuthStore } from '@/store/authStore'
import { format, isToday, isYesterday } from 'date-fns'
import { uz } from 'date-fns/locale'

// ── Type config ────────────────────────────────────────────────────────────────
const TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  OwnerPayoutPaid:        { label: "To'lov amalga oshdi",     icon: <DollarCircleFilled style={{ fontSize: 20 }}/>, color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   },
  OwnerPayoutCreated:     { label: "Yangi to'lov yaratildi",  icon: <DollarCircleFilled style={{ fontSize: 20 }}/>, color: '#1677ff', bg: 'rgba(22,119,255,0.1)'  },
  CarListingApproved:     { label: 'Mashina tasdiqlandi',     icon: <CarFilled          style={{ fontSize: 20 }}/>, color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   },
  CarListingRejected:     { label: 'Mashina rad etildi',      icon: <CarFilled          style={{ fontSize: 20 }}/>, color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)'   },
  CarListingSubmitted:    { label: "Yangi mashina so'rovi",   icon: <CarFilled          style={{ fontSize: 20 }}/>, color: '#fa8c16', bg: 'rgba(250,140,22,0.1)'  },
  RentalStarted:          { label: 'Ijara boshlandi',         icon: <FileTextFilled     style={{ fontSize: 20 }}/>, color: '#1677ff', bg: 'rgba(22,119,255,0.1)'  },
  RentalEnded:            { label: 'Ijara yakunlandi',        icon: <FileTextFilled     style={{ fontSize: 20 }}/>, color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   },
  PaymentReceived:        { label: "To'lov qabul qilindi",   icon: <DollarCircleFilled style={{ fontSize: 20 }}/>, color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   },
  ReservationCancelled:   { label: 'Rezervatsiya bekor',     icon: <CloseCircleFilled  style={{ fontSize: 20 }}/>, color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)'   },
}

function getTypeCfg(type: string) {
  if (TYPE_MAP[type]) return TYPE_MAP[type]
  const t = (type ?? '').toLowerCase()
  if (t.includes('error') || t.includes('cancel') || t.includes('fail') || t.includes('reject'))
    return { label: 'Xabar',        icon: <CloseCircleFilled style={{ fontSize: 20 }}/>, color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)'   }
  if (t.includes('warn') || t.includes('pending'))
    return { label: 'Ogohlantirish', icon: <WarningFilled    style={{ fontSize: 20 }}/>, color: '#fa8c16', bg: 'rgba(250,140,22,0.1)'  }
  if (t.includes('success') || t.includes('paid') || t.includes('approved') || t.includes('active'))
    return { label: 'Muvaffaqiyat', icon: <CheckCircleFilled style={{ fontSize: 20 }}/>, color: '#52c41a', bg: 'rgba(82,196,26,0.1)'   }
  return   { label: 'Bildirishnoma', icon: <InfoCircleFilled style={{ fontSize: 20 }}/>, color: '#1677ff', bg: 'rgba(22,119,255,0.1)'  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d))     return `Bugun, ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Kecha, ${format(d, 'HH:mm')}`
  return format(d, 'd MMM yyyy', { locale: uz })
}

function formatTimeFull(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: uz })
}

export default function NotificationsPage() {
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.md
  const { userId } = useAuthStore()

  const [data,       setData]       = useState<PaginatedResponse<NotificationDto> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId,  setMarkingId]  = useState<number | null>(null)
  const { page, pageSize, onChange, reset } = usePagination(15)

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await notificationsApi.getAll({ userId, page, pageSize, unreadOnly })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [userId, page, pageSize, unreadOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMarkRead = async (id: number) => {
    setMarkingId(id)
    try {
      await notificationsApi.markRead(id)
      fetchData()
    } finally {
      setMarkingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await notificationsApi.markAllRead()
      message.success("Barchasi o'qilgan deb belgilandi ✓")
      fetchData()
    } finally {
      setMarkingAll(false)
    }
  }

  const items     = data?.items ?? []
  const total     = data?.totalCount ?? 0
  const unreadCnt = items.filter(n => !n.isRead).length
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   'linear-gradient(135deg,#1a0a3d 0%,#722ed1 55%,#eb2f96 100%)',
        padding:      isMobile ? '24px 16px 20px' : '40px 40px 36px',
        marginBottom: 20,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { s: 200, t: -70, r: -50, o: .07 },
          { s: 130, t: 30,  r: 120, o: .05 },
          { s: 90,  b: -30, l: 60,  o: .08 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: '#fff',
            width: c.s, height: c.s, opacity: c.o,
            top: c.t, right: c.r, bottom: c.b, left: c.l,
          }}/>
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Top row: icon + title + action */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            marginBottom: 16,
          }}>
            {/* Bell icon */}
            <div style={{
              width: isMobile ? 44 : 56, height: isMobile ? 44 : 56,
              borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <BellFilled style={{ fontSize: isMobile ? 22 : 28, color: '#fff' }}/>
              {unreadCnt > 0 && (
                <div style={{
                  position: 'absolute', top: -5, right: -5,
                  background: '#ff4d4f', color: '#fff',
                  borderRadius: 20, minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, padding: '0 3px',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}>
                  {unreadCnt > 99 ? '99+' : unreadCnt}
                </div>
              )}
            </div>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? 20 : 28,
                fontWeight: 800, color: '#fff', lineHeight: 1.2,
              }}>
                Bildirishnomalar
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
                {total} ta
                {unreadCnt > 0 && (
                  <span style={{ color: '#ffb3f0' }}> · {unreadCnt} yangi</span>
                )}
              </p>
            </div>

            {/* Mark all read button */}
            {unreadCnt > 0 && (
              <Button
                icon={<CheckOutlined/>}
                size={isMobile ? 'middle' : 'large'}
                loading={markingAll}
                onClick={handleMarkAllRead}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                  fontSize: isMobile ? 12 : 13,
                  padding: isMobile ? '0 10px' : undefined,
                }}
              >
                {isMobile ? "Hammasini o'qi" : "Barchasini o'qildi"}
              </Button>
            )}
          </div>

          {/* Stats chips — mobile'da ham ko'rinadi */}
          {unreadCnt > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{
                padding: '6px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
              }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#ffb3f0' }}>{unreadCnt}</span>
                <span style={{ fontSize: 11, opacity: .75, marginLeft: 5 }}>O'qilmagan</span>
              </div>
              <div style={{
                padding: '6px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
              }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#d3f985' }}>{total - unreadCnt}</span>
                <span style={{ fontSize: 11, opacity: .75, marginLeft: 5 }}>O'qilgan</span>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Barchasi',        val: false },
              { label: "O'qilmaganlar", val: true  },
            ].map(f => {
              const active = unreadOnly === f.val
              return (
                <button
                  key={String(f.val)}
                  onClick={() => { setUnreadOnly(f.val); reset() }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 16px', borderRadius: 50,
                    border: `1.5px solid ${active ? '#fff' : 'rgba(255,255,255,0.3)'}`,
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(6px)',
                    color: '#fff', cursor: 'pointer',
                    fontWeight: active ? 700 : 500,
                    fontSize: isMobile ? 12 : 13,
                    transition: 'all 0.18s',
                    boxShadow: active ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {f.label}
                  {f.val && unreadCnt > 0 && (
                    <span style={{
                      background: '#ff4d4f', color: '#fff',
                      borderRadius: 20, minWidth: 16, height: 16,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, padding: '0 3px',
                    }}>
                      {unreadCnt}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16 }}>
          <Spin size="large"/>
          <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>Yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg,rgba(114,46,209,0.1),rgba(235,47,150,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BellFilled style={{ fontSize: 36, color: '#722ed1', opacity: 0.4 }}/>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: token.colorText, marginBottom: 6 }}>
            {unreadOnly ? "O'qilmagan bildirishnoma yo'q" : "Bildirishnoma yo'q"}
          </div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {unreadOnly ? "Barcha bildirishnomalar o'qilgan" : 'Hali bildirishnoma kelmagan'}
          </div>
          {unreadOnly && (
            <button
              onClick={() => { setUnreadOnly(false); reset() }}
              style={{
                marginTop: 14, padding: '8px 22px', borderRadius: 20,
                background: 'linear-gradient(135deg,#722ed1,#eb2f96)',
                border: 'none', color: '#fff', fontWeight: 600,
                cursor: 'pointer', fontSize: 13,
              }}
            >
              Barchasini ko'rish
            </button>
          )}
        </div>
      ) : (
        <>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(notif => {
              const cfg = getTypeCfg(notif.type)
              const isMarking = markingId === notif.id

              return (
                <div
                  key={notif.id}
                  style={{
                    background:   token.colorBgContainer,
                    borderRadius: 14,
                    border:       `1.5px solid ${!notif.isRead ? '#722ed1' : token.colorBorderSecondary}`,
                    overflow:     'hidden',
                    display:      'flex',
                    boxShadow:    !notif.isRead
                      ? '0 4px 16px rgba(114,46,209,0.12)'
                      : '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: notif.isRead ? 0.78 : 1,
                    transition:   'box-shadow 0.2s, opacity 0.2s',
                  }}
                >
                  {/* Left accent bar */}
                  <div style={{
                    width: 4, flexShrink: 0,
                    background: !notif.isRead
                      ? 'linear-gradient(180deg,#722ed1,#eb2f96)'
                      : token.colorBorderSecondary,
                  }}/>

                  {/* Icon */}
                  <div style={{
                    width: isMobile ? 46 : 56, flexShrink: 0,
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: isMobile ? 14 : 16,
                  }}>
                    <div style={{
                      width: isMobile ? 34 : 38,
                      height: isMobile ? 34 : 38,
                      borderRadius: 10,
                      background: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: cfg.color,
                      flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    padding: isMobile ? '12px 12px 12px 6px' : '14px 14px 14px 8px',
                    minWidth: 0,
                  }}>

                    {/* Type label chip */}
                    <div style={{ marginBottom: 5 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 20,
                        background: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                        letterSpacing: 0.2,
                      }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{
                      fontWeight:  notif.isRead ? 500 : 700,
                      fontSize:    isMobile ? 13 : 14,
                      color:       token.colorText,
                      lineHeight:  1.35,
                      marginBottom: 4,
                    }}>
                      {!notif.isRead && (
                        <span style={{
                          display: 'inline-block',
                          width: 7, height: 7, borderRadius: '50%',
                          background: '#722ed1',
                          marginRight: 6,
                          marginBottom: 1,
                          verticalAlign: 'middle',
                          flexShrink: 0,
                        }}/>
                      )}
                      {notif.title}
                    </div>

                    {/* Body */}
                    <p style={{
                      margin:      0,
                      fontSize:    isMobile ? 12 : 13,
                      color:       token.colorTextSecondary,
                      lineHeight:  1.55,
                      marginBottom: 8,
                    }}>
                      {notif.body}
                    </p>

                    {/* Footer: time + mark-read */}
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            8,
                    }}>
                      <span style={{
                        fontSize: isMobile ? 10 : 11,
                        color:    token.colorTextTertiary,
                        lineHeight: 1,
                      }}
                        title={formatTimeFull(notif.createdAt)}
                      >
                        🕐 {formatTime(notif.createdAt)}
                      </span>

                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          disabled={isMarking}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: isMobile ? '4px 10px' : '4px 12px',
                            borderRadius: 20,
                            background: 'rgba(114,46,209,0.08)',
                            border: '1px solid rgba(114,46,209,0.22)',
                            color: '#722ed1', cursor: 'pointer',
                            fontSize: isMobile ? 10 : 11,
                            fontWeight: 600,
                            transition: 'all 0.15s',
                            opacity: isMarking ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckOutlined style={{ fontSize: 9 }}/>
                          O'qildi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center',
              alignItems: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap',
            }}>
              {/* Prev */}
              <button
                onClick={() => onChange(page - 1, pageSize)}
                disabled={page === 1}
                style={{
                  padding: '7px 14px', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                  color: page === 1 ? token.colorTextDisabled : token.colorText,
                  fontSize: 13, fontWeight: 600,
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ‹ Oldingi
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= (isMobile ? 1 : 2))
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`d${i}`} style={{ color: token.colorTextTertiary, padding: '0 2px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onChange(p as number, pageSize)}
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        cursor: 'pointer',
                        border: page === p ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                        background: page === p
                          ? 'linear-gradient(135deg,#722ed1,#eb2f96)'
                          : token.colorBgContainer,
                        color:      page === p ? '#fff' : token.colorText,
                        fontWeight: page === p ? 700 : 400,
                        fontSize: 13, transition: 'all 0.18s',
                      }}
                    >
                      {p}
                    </button>
                  )
                )
              }

              {/* Next */}
              <button
                onClick={() => onChange(page + 1, pageSize)}
                disabled={page === totalPages}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                  color: page === totalPages ? token.colorTextDisabled : token.colorText,
                  fontSize: 13, fontWeight: 600,
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                Keyingi ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
