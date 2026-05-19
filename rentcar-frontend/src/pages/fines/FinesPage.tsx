import { useState, useEffect, useCallback } from 'react'
import { Button, Popconfirm, message, theme, Spin, Grid, Pagination, Badge } from 'antd'
import {
  PlusOutlined, CheckOutlined,
  WarningFilled, CheckCircleFilled, StopOutlined,
  DollarCircleFilled, AppstoreFilled, CalendarFilled,
} from '@ant-design/icons'
import { finesApi } from '@/api/finesApi'
import type { FineDto, FineStatus } from '@/types/fines'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import FineFormModal from './components/FineFormModal'
import FinePaymentModal from './components/FinePaymentModal'
import { useAuthStore } from '@/store/authStore'
import { getApiError } from '@/utils/apiError'
import { format } from 'date-fns'

const fmt = (n: number) => n.toLocaleString('ru-RU')

const STATUS_CFG: Record<FineStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Pending:   { label: "To'lanmagan", color: '#ff4d4f', bg: 'rgba(255,77,79,0.12)',  icon: <WarningFilled      style={{ fontSize: 11 }}/> },
  Paid:      { label: "To'langan",   color: '#52c41a', bg: 'rgba(82,196,26,0.12)',  icon: <CheckCircleFilled  style={{ fontSize: 11 }}/> },
  Cancelled: { label: 'Bekor',       color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)', icon: <StopOutlined       style={{ fontSize: 11 }}/> },
}

const STATUSES: (FineStatus | 'all')[] = ['all', 'Pending', 'Paid', 'Cancelled']

export default function FinesPage() {
  const { token }    = theme.useToken()
  const screens      = Grid.useBreakpoint()
  const isMobile     = !screens.md
  const { hasRole, role, userId } = useAuthStore()
  const isManager  = hasRole(['Manager', 'Admin', 'SuperAdmin'])
  const isCustomer = role === 'Customer' || role === 'Owner'

  const [data,         setData]         = useState<PaginatedResponse<FineDto> | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [statusFilter, setStatusFilter] = useState<FineStatus | undefined>()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [payingFine,   setPayingFine]   = useState<FineDto | null>(null)
  const [payLoading,   setPayLoading]   = useState<number | null>(null)
  const [hovered,      setHovered]      = useState<number | null>(null)
  const { page, pageSize, onChange, reset } = usePagination()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await finesApi.getAll({
        page, pageSize,
        status: statusFilter,
        ...(isCustomer && userId ? { userId } : {}),
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, isCustomer, userId])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePay = async (id: number) => {
    setPayLoading(id)
    try {
      await finesApi.pay(id)
      message.success("✅ Jarima to'langan deb belgilandi")
      fetchData()
    } catch (err: unknown) {
      message.error(getApiError(err, 'Xatolik yuz berdi'))
    } finally {
      setPayLoading(null)
    }
  }

  const items      = data?.items ?? []
  const total      = data?.totalCount ?? 0
  const pendingCnt = items.filter(f => f.status === 'Pending').length
  const paidCnt    = items.filter(f => f.status === 'Paid').length
  const pendingSum = items.filter(f => f.status === 'Pending').reduce((s, f) => s + f.amount, 0)
  const cols       = isMobile ? 1 : !screens.lg ? 2 : 3

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 48 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   'linear-gradient(135deg,#3d0000 0%,#cf1322 55%,#fa8c16 100%)',
        padding:      isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {[{s:200,t:-70,r:-50,o:.07},{s:130,t:30,r:120,o:.05},{s:90,b:-30,l:60,o:.08}].map((c,i)=>(
          <div key={i} style={{
            position:'absolute', borderRadius:'50%', background:'#fff',
            width:c.s, height:c.s, opacity:c.o,
            top:c.t, right:c.r, bottom:c.b, left:c.l,
          }}/>
        ))}

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{
            display:       'flex',
            alignItems:    isMobile ? 'flex-start' : 'center',
            gap:           16,
            marginBottom:  20,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            {/* Icon */}
            <div style={{
              width:56, height:56, borderRadius:14,
              background:'rgba(255,255,255,0.15)',
              backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <WarningFilled style={{ fontSize:28, color:'#fff' }}/>
            </div>

            <div style={{ flex:1 }}>
              <h1 style={{ margin:0, fontSize:isMobile?22:28, fontWeight:800, color:'#fff', lineHeight:1.2 }}>
                {isCustomer ? 'Mening Jarimalarim' : 'Jarimalar'}
              </h1>
              <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.75)' }}>
                {total} ta jarima
                {pendingCnt > 0 && ` · ${pendingCnt} ta to'lanmagan`}
                {pendingSum > 0 && ` · ${fmt(pendingSum)} so'm kutilmoqda`}
              </p>
            </div>

            {/* Stats chips (desktop) */}
            {!isMobile && (
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { label:"To'lanmagan", val:pendingCnt,            color:'#ffb3b3' },
                  { label:"To'langan",   val:paidCnt,               color:'#95f985' },
                  { label:'Kutilgan',    val:`${fmt(pendingSum)} so'm`, color:'#fadb14', small:true },
                ].map((s,i) => (
                  <div key={i} style={{
                    padding:'8px 16px', borderRadius:12,
                    background:'rgba(255,255,255,0.12)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', gap:8, fontSize:13,
                  }}>
                    <div>
                      <div style={{
                        fontWeight:700,
                        fontSize: s.small ? 13 : 18,
                        lineHeight:1,
                        color: s.color,
                      }}>
                        {s.val}
                      </div>
                      <div style={{ fontSize:10, opacity:.7, color:'#fff' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add button (admin only) */}
            {isManager && (
              <Button
                icon={<PlusOutlined/>}
                size="large"
                onClick={() => setModalOpen(true)}
                style={{
                  background:'rgba(255,255,255,0.2)',
                  backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,0.35)',
                  color:'#fff',
                  borderRadius:10,
                  fontWeight:600,
                  flexShrink:0,
                }}
              >
                {isMobile ? '' : "Jarima qo'shish"}
              </Button>
            )}
          </div>

          {/* Status filter chips */}
          <div style={{
            display:'flex', gap:8,
            ...(isMobile
              ? { overflowX:'auto', flexWrap:'nowrap', paddingBottom:4, scrollbarWidth:'none' }
              : { flexWrap:'wrap' }),
          }}>
            {STATUSES.map(s => {
              const cfg   = s === 'all' ? null : STATUS_CFG[s as FineStatus]
              const active = s === 'all' ? !statusFilter : statusFilter === s
              const color  = cfg?.color ?? '#fff'
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s === 'all' ? undefined : s as FineStatus); reset() }}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    padding:'6px 14px', borderRadius:50,
                    border:`1.5px solid ${active ? '#fff' : 'rgba(255,255,255,0.3)'}`,
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    backdropFilter:'blur(6px)',
                    color:'#fff',
                    cursor:'pointer', fontWeight: active ? 700 : 500, fontSize:12,
                    transition:'all 0.18s',
                    boxShadow: active ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {s === 'all'
                    ? <><AppstoreFilled style={{ fontSize:11 }}/> Barchasi</>
                    : <>{cfg?.icon} {cfg?.label}</>
                  }
                  {s !== 'all' && items.filter(i => i.status === s).length > 0 && (
                    <Badge
                      count={items.filter(i => i.status === s).length}
                      style={{ backgroundColor:color, fontSize:10, minWidth:16, height:16, lineHeight:'16px', padding:'0 4px' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:80, gap:16 }}>
          <Spin size="large"/>
          <span style={{ color:token.colorTextTertiary, fontSize:13 }}>Jarimalar yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>
            {isCustomer ? '🎉' : '📋'}
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:token.colorText, marginBottom:6 }}>
            {isCustomer ? 'Jarimangiz yo\'q!' : 'Jarima topilmadi'}
          </div>
          <div style={{ fontSize:13, color:token.colorTextTertiary }}>
            {statusFilter
              ? 'Bu holat bo\'yicha natija yo\'q'
              : isCustomer
                ? 'Tabriklaymiz, siz yaxshi haydovchisiz 👍'
                : 'Hali jarima qo\'shilmagan'}
          </div>
          {statusFilter && (
            <button
              style={{
                marginTop:8, padding:'8px 20px', borderRadius:20,
                background:'linear-gradient(135deg,#ff4d4f,#fa8c16)',
                border:'none', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:13,
              }}
              onClick={() => { setStatusFilter(undefined); reset() }}
            >
              Filterni tozalash
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:token.colorTextSecondary }}>
              <strong style={{ color:token.colorText }}>{total}</strong> ta natija
            </span>
            {pendingSum > 0 && (
              <span style={{
                fontSize:12, fontWeight:700,
                color:'#ff4d4f',
                background:'rgba(255,77,79,0.08)',
                border:'1px solid rgba(255,77,79,0.2)',
                padding:'3px 12px', borderRadius:20,
              }}>
                💸 {fmt(pendingSum)} so'm to'lanmagan
              </span>
            )}
          </div>

          {/* Cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:isMobile?12:20, marginBottom:24 }}>
            {items.map(fine => {
              const cfg   = STATUS_CFG[fine.status]
              const isHov = hovered === fine.id

              /* ── MOBILE: compact fine card ──────────────────────────── */
              if (isMobile) {
                return (
                  <div
                    key={fine.id}
                    style={{
                      background:    token.colorBgContainer,
                      borderRadius:  14,
                      border:        `1.5px solid ${fine.status === 'Pending' ? 'rgba(255,77,79,0.3)' : token.colorBorderSecondary}`,
                      overflow:      'hidden',
                      boxShadow:     fine.status === 'Pending'
                        ? '0 2px 10px rgba(255,77,79,0.1)'
                        : '0 1px 6px rgba(0,0,0,0.06)',
                      display:       'flex',
                      flexDirection: 'column',
                      opacity:       fine.status === 'Cancelled' ? 0.65 : 1,
                    }}
                  >
                    <div style={{ height:3, background:cfg.color }}/>

                    <div style={{ padding:'11px 13px 12px', display:'flex', flexDirection:'column', gap:9 }}>

                      {/* Row 1: badges row */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                          background:'rgba(255,77,79,0.1)', color:'#ff4d4f',
                          border:'1px solid rgba(255,77,79,0.2)',
                        }}>
                          Jarima #{fine.id}
                        </span>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                          background:'rgba(22,119,255,0.1)', color:'#1677ff',
                          border:'1px solid rgba(22,119,255,0.2)',
                        }}>
                          Ijara #{fine.rentalId}
                        </span>
                        <span style={{
                          marginLeft:'auto',
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                          background:cfg.bg, color:cfg.color,
                          border:`1px solid ${cfg.color}40`,
                          display:'inline-flex', alignItems:'center', gap:3, flexShrink:0,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      {/* Row 2: Amount (prominent) + date */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:9, color:token.colorTextTertiary }}>Jarima miqdori</div>
                          <div style={{
                            fontWeight:800, fontSize:22, lineHeight:1,
                            color: fine.status === 'Paid' ? '#52c41a' : '#ff4d4f',
                          }}>
                            {fmt(fine.amount)}
                            <span style={{ fontSize:11, fontWeight:500, color:token.colorTextTertiary, marginLeft:3 }}>so'm</span>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:9, color:token.colorTextTertiary }}>Sana</div>
                          <div style={{ fontSize:12, fontWeight:600, color:token.colorText }}>
                            {format(new Date(fine.issuedDate), 'dd.MM.yyyy')}
                          </div>
                          {fine.paidDate && (
                            <div style={{ fontSize:10, color:'#52c41a' }}>
                              ✓ {format(new Date(fine.paidDate), 'dd.MM.yy')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin: customer */}
                      {isManager && (
                        <div style={{
                          padding:'5px 9px', borderRadius:7,
                          background:token.colorFillAlter,
                          border:`1px solid ${token.colorBorderSecondary}`,
                          fontSize:11, color:token.colorTextSecondary,
                        }}>
                          👤 <strong style={{ color:token.colorText }}>{fine.customerName}</strong>
                        </div>
                      )}

                      {/* Description */}
                      <div style={{ display:'flex', gap:7, alignItems:'flex-start' }}>
                        <WarningFilled style={{ color:'#ff4d4f', fontSize:12, marginTop:2, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:token.colorText, lineHeight:1.5, fontWeight:500 }}>
                          {fine.description}
                        </span>
                      </div>

                      {/* Notes */}
                      {fine.notes && (
                        <div style={{
                          fontSize:11, color:token.colorTextSecondary,
                          padding:'5px 9px', borderRadius:7,
                          background:token.colorFillAlter,
                          border:`1px solid ${token.colorBorderSecondary}`,
                        }}>
                          📝 {fine.notes}
                        </div>
                      )}
                    </div>

                    {/* Admin: mark-as-paid */}
                    {isManager && fine.status === 'Pending' && (
                      <div style={{
                        padding:'8px 13px',
                        borderTop:`1px solid ${token.colorBorderSecondary}`,
                        background:token.colorFillAlter,
                      }}>
                        <Popconfirm
                          title="To'langan deb belgilash?"
                          description="Bu amalni qaytarib bo'lmaydi."
                          onConfirm={() => handlePay(fine.id)}
                          okText="Ha, to'landi"
                          cancelText="Bekor"
                          okButtonProps={{ style:{ background:'#52c41a', borderColor:'#52c41a' } }}
                        >
                          <Button
                            type="text" icon={<CheckOutlined/>} block
                            loading={payLoading === fine.id}
                            style={{ color:'#52c41a', fontWeight:600, borderRadius:8, fontSize:12, height:32 }}
                          >
                            To'landi deb belgilash
                          </Button>
                        </Popconfirm>
                      </div>
                    )}

                    {/* Customer: pay button */}
                    {isCustomer && fine.status === 'Pending' && (
                      <div style={{
                        padding:'10px 13px',
                        borderTop:`1px solid rgba(255,77,79,0.15)`,
                        background:'linear-gradient(135deg,rgba(255,77,79,0.04),rgba(250,140,22,0.04))',
                      }}>
                        <Button
                          type="primary" danger block icon={<DollarCircleFilled/>}
                          onClick={() => setPayingFine(fine)}
                          style={{
                            borderRadius:9, fontWeight:700,
                            background:'linear-gradient(135deg,#ff4d4f,#fa8c16)',
                            border:'none', boxShadow:'0 3px 12px rgba(255,77,79,0.3)',
                            height:40,
                          }}
                        >
                          {fmt(fine.amount)} so'm to'lash
                        </Button>
                      </div>
                    )}
                  </div>
                )
              }

              /* ── DESKTOP: original card ──────────────────────────────── */
              return (
                <div
                  key={fine.id}
                  onMouseEnter={() => setHovered(fine.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background:    token.colorBgContainer,
                    borderRadius:  16,
                    border:        `1.5px solid ${isHov ? cfg.color : token.colorBorderSecondary}`,
                    overflow:      'hidden',
                    transform:     isHov ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow:     isHov
                      ? `0 16px 40px ${cfg.color}22, 0 4px 12px rgba(0,0,0,0.08)`
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    transition:    'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                    display:       'flex',
                    flexDirection: 'column',
                    opacity:       fine.status === 'Cancelled' ? 0.65 : 1,
                  }}
                >
                  {/* Status color bar */}
                  <div style={{ height:4, background:cfg.color }}/>

                  <div style={{ padding:'16px 16px 14px', flex:1, display:'flex', flexDirection:'column', gap:11 }}>

                    {/* Header: IDs + status */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:20,
                            background:'rgba(255,77,79,0.1)', color:'#ff4d4f',
                            border:'1px solid rgba(255,77,79,0.2)',
                          }}>
                            Jarima #{fine.id}
                          </span>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:20,
                            background:'rgba(22,119,255,0.1)', color:'#1677ff',
                            border:'1px solid rgba(22,119,255,0.2)',
                          }}>
                            Ijara #{fine.rentalId}
                          </span>
                        </div>
                        {/* Status badge */}
                        <span style={{
                          fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
                          background: cfg.bg, color: cfg.color,
                          border:`1px solid ${cfg.color}40`,
                          display:'inline-flex', alignItems:'center', gap:4,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:10, color:token.colorTextTertiary, marginBottom:1 }}>Miqdor</div>
                        <div style={{
                          fontWeight:800, fontSize:18, lineHeight:1,
                          color: fine.status === 'Paid' ? '#52c41a' : '#ff4d4f',
                        }}>
                          {fmt(fine.amount)}
                        </div>
                        <div style={{ fontSize:10, color:token.colorTextTertiary }}>so'm</div>
                      </div>
                    </div>

                    {/* Admin: customer name */}
                    {isManager && (
                      <div style={{
                        padding:'6px 10px', borderRadius:8,
                        background:token.colorFillAlter,
                        border:`1px solid ${token.colorBorderSecondary}`,
                        fontSize:12, color:token.colorTextSecondary,
                      }}>
                        👤 <strong style={{ color:token.colorText }}>{fine.customerName}</strong>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height:1, background:token.colorBorderSecondary }}/>

                    {/* Description */}
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <WarningFilled style={{ color:'#ff4d4f', fontSize:14, marginTop:1, flexShrink:0 }}/>
                      <span style={{ fontSize:13, color:token.colorText, lineHeight:1.5, fontWeight:500 }}>
                        {fine.description}
                      </span>
                    </div>

                    {/* Notes */}
                    {fine.notes && (
                      <div style={{
                        fontSize:12, color:token.colorTextSecondary,
                        padding:'6px 10px', borderRadius:8,
                        background:token.colorFillAlter,
                        border:`1px solid ${token.colorBorderSecondary}`,
                        lineHeight:1.5,
                      }}>
                        📝 {fine.notes}
                      </div>
                    )}

                    {/* Dates row */}
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:'auto' }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <CalendarFilled style={{ color:'#fa8c16', fontSize:12 }}/>
                        <div>
                          <div style={{ fontSize:10, color:token.colorTextTertiary }}>Berilgan</div>
                          <div style={{ fontSize:12, fontWeight:600, color:token.colorText }}>
                            {format(new Date(fine.issuedDate), 'dd.MM.yyyy')}
                          </div>
                        </div>
                      </div>
                      {fine.paidDate && (
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <CheckCircleFilled style={{ color:'#52c41a', fontSize:12 }}/>
                          <div>
                            <div style={{ fontSize:10, color:token.colorTextTertiary }}>To'langan</div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#52c41a' }}>
                              {format(new Date(fine.paidDate), 'dd.MM.yyyy')}
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <DollarCircleFilled style={{ color:'#8c8c8c', fontSize:12 }}/>
                        <div>
                          <div style={{ fontSize:10, color:token.colorTextTertiary }}>Kim tomonidan</div>
                          <div style={{ fontSize:12, fontWeight:600, color:token.colorTextSecondary }}>
                            {fine.issuedBy}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin: mark-as-paid footer */}
                  {isManager && fine.status === 'Pending' && (
                    <div style={{
                      padding:'10px 16px',
                      borderTop:`1px solid ${token.colorBorderSecondary}`,
                      background:token.colorFillAlter,
                    }}>
                      <Popconfirm
                        title="To'langan deb belgilash?"
                        description="Bu amalni qaytarib bo'lmaydi."
                        onConfirm={() => handlePay(fine.id)}
                        okText="Ha, to'landi"
                        cancelText="Bekor"
                        okButtonProps={{ style:{ background:'#52c41a', borderColor:'#52c41a' } }}
                      >
                        <Button
                          type="text"
                          icon={<CheckOutlined/>}
                          block
                          loading={payLoading === fine.id}
                          style={{ color:'#52c41a', fontWeight:600, borderRadius:8 }}
                        >
                          To'landi deb belgilash
                        </Button>
                      </Popconfirm>
                    </div>
                  )}

                  {/* Client: pay fine footer */}
                  {isCustomer && fine.status === 'Pending' && (
                    <div style={{
                      padding:'10px 16px',
                      borderTop:`1px solid ${token.colorBorderSecondary}`,
                      background:'linear-gradient(135deg,rgba(255,77,79,0.04),rgba(250,140,22,0.04))',
                    }}>
                      <Button
                        type="primary"
                        danger
                        block
                        icon={<DollarCircleFilled/>}
                        onClick={() => setPayingFine(fine)}
                        style={{
                          borderRadius:8,
                          fontWeight:700,
                          background:'linear-gradient(135deg,#ff4d4f,#fa8c16)',
                          border:'none',
                          boxShadow:'0 3px 12px rgba(255,77,79,0.3)',
                        }}
                      >
                        {fmt(fine.amount)} so'm to'lash
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div style={{ display:'flex', justifyContent:'center' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={onChange}
                showSizeChanger
                showTotal={t => `Jami ${t} ta`}
                responsive
              />
            </div>
          )}
        </>
      )}

      <FineFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); fetchData() }}
      />

      <FinePaymentModal
        fine={payingFine}
        open={!!payingFine}
        onClose={() => setPayingFine(null)}
        onSuccess={() => { setPayingFine(null); fetchData() }}
      />
    </div>
  )
}
