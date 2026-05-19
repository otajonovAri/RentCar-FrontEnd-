import { useState, useEffect, useCallback } from 'react'
import { Button, Popconfirm, Input, message, theme, Spin, Grid, Pagination, Badge } from 'antd'
import {
  CalendarFilled, CarFilled, CloseOutlined,
  EnvironmentFilled, ClockCircleFilled, CheckCircleFilled,
  StopOutlined, AppstoreFilled,
} from '@ant-design/icons'
import { reservationsApi } from '@/api/reservationsApi'
import type { ReservationDto, ReservationStatus } from '@/types/reservations'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'

const fmt = (n: number) => n.toLocaleString('ru-RU')

const STATUS_CFG: Record<ReservationStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Kutilmoqda',     color: '#fa8c16', bg: 'rgba(250,140,22,0.12)',  icon: <ClockCircleFilled  style={{ fontSize: 11 }}/> },
  Confirmed: { label: 'Tasdiqlangan',   color: '#52c41a', bg: 'rgba(82,196,26,0.12)',   icon: <CheckCircleFilled  style={{ fontSize: 11 }}/> },
  Cancelled: { label: 'Bekor qilingan', color: '#ff4d4f', bg: 'rgba(255,77,79,0.12)',   icon: <StopOutlined       style={{ fontSize: 11 }}/> },
  Completed: { label: 'Yakunlangan',    color: '#1677ff', bg: 'rgba(22,119,255,0.12)',  icon: <CheckCircleFilled  style={{ fontSize: 11 }}/> },
}

const STATUSES: (ReservationStatus | 'all')[] = ['all', 'Pending', 'Confirmed', 'Cancelled', 'Completed']

export default function ReservationsPage() {
  const { token }    = theme.useToken()
  const screens      = Grid.useBreakpoint()
  const isMobile     = !screens.md
  const { hasRole, role, userId } = useAuthStore()
  const isAdmin      = hasRole(['Admin', 'SuperAdmin', 'Manager'])
  const isCustomer   = role === 'Customer' || role === 'Owner'

  const [data,          setData]          = useState<PaginatedResponse<ReservationDto> | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [statusFilter,  setStatusFilter]  = useState<ReservationStatus | undefined>()
  const [cancelReason,  setCancelReason]  = useState('')
  const [hovered,       setHovered]       = useState<number | null>(null)
  const { page, pageSize, onChange, reset } = usePagination()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reservationsApi.getAll({
        page,
        pageSize,
        status: statusFilter,
        ...(isCustomer && userId ? { userId } : {}),
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, isCustomer, userId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancel = async (id: number) => {
    try {
      await reservationsApi.cancel(id, cancelReason || 'Bekor qilindi')
      message.success('Rezervatsiya bekor qilindi')
      setCancelReason('')
      fetchData()
    } catch {
      message.error('Xatolik yuz berdi')
    }
  }

  const items      = data?.items ?? []
  const total      = data?.totalCount ?? 0
  const pendingCnt = items.filter(i => i.status === 'Pending').length
  const confirmedCnt = items.filter(i => i.status === 'Confirmed').length
  const totalEst   = items.reduce((s, i) => s + i.estimatedAmount, 0)
  const cols       = isMobile ? 1 : !screens.lg ? 2 : 3

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 48 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   'linear-gradient(135deg,#0a1628 0%,#1677ff 55%,#6366f1 100%)',
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
            <div style={{
              width:56, height:56, borderRadius:14,
              background:'rgba(255,255,255,0.15)',
              backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <CalendarFilled style={{ fontSize:28, color:'#fff' }}/>
            </div>

            <div style={{ flex:1 }}>
              <h1 style={{ margin:0, fontSize:isMobile?22:28, fontWeight:800, color:'#fff', lineHeight:1.2 }}>
                {isCustomer ? 'Mening Rezervatsiyalarim' : 'Rezervatsiyalar'}
              </h1>
              <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.75)' }}>
                {total} ta rezervatsiya
                {pendingCnt > 0 && ` · ${pendingCnt} ta kutilmoqda`}
              </p>
            </div>

            {!isMobile && (
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { label:'Jami',         val: total,        color:'#fff'     },
                  { label:'Kutilmoqda',   val: pendingCnt,   color:'#fadb14'  },
                  { label:'Tasdiqlangan', val: confirmedCnt, color:'#95f985'  },
                ].map((s,i) => (
                  <div key={i} style={{
                    padding:'8px 16px', borderRadius:12,
                    background:'rgba(255,255,255,0.12)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', gap:8, fontSize:13,
                  }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:18, lineHeight:1, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:10, opacity:.7, color:'#fff' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
                {totalEst > 0 && (
                  <div style={{
                    padding:'8px 16px', borderRadius:12,
                    background:'rgba(255,255,255,0.12)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    color:'#fff', fontSize:13,
                  }}>
                    <div style={{ fontWeight:700, fontSize:14, lineHeight:1 }}>{fmt(totalEst)}</div>
                    <div style={{ fontSize:10, opacity:.7 }}>so'm (sahifa)</div>
                  </div>
                )}
              </div>
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
              const cfg   = s === 'all' ? null : STATUS_CFG[s as ReservationStatus]
              const active = s === 'all' ? !statusFilter : statusFilter === s
              const color  = cfg?.color ?? '#fff'
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s === 'all' ? undefined : s as ReservationStatus); reset() }}
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
                      style={{ backgroundColor: color, fontSize:10, minWidth:16, height:16, lineHeight:'16px', padding:'0 4px' }}
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
          <span style={{ color:token.colorTextTertiary, fontSize:13 }}>Rezervatsiyalar yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📅</div>
          <div style={{ fontSize:18, fontWeight:700, color:token.colorText, marginBottom:6 }}>
            Rezervatsiya topilmadi
          </div>
          <div style={{ fontSize:13, color:token.colorTextTertiary }}>
            {statusFilter ? 'Bu holat bo\'yicha natija yo\'q' : 'Hali rezervatsiya qilinmagan'}
          </div>
          {statusFilter && (
            <button
              style={{
                marginTop:8, padding:'8px 20px', borderRadius:20,
                background:'linear-gradient(135deg,#1677ff,#6366f1)',
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
          {/* Results label */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:token.colorTextSecondary }}>
              <strong style={{ color:token.colorText }}>{total}</strong> ta natija
            </span>
          </div>

          {/* Cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:isMobile?12:20, marginBottom:24 }}>
            {items.map(res => {
              const cfg   = STATUS_CFG[res.status]
              const isHov = hovered === res.id
              const canCancel = res.status !== 'Cancelled' && res.status !== 'Completed'

              /* ── MOBILE: compact card ───────────────────────────────── */
              if (isMobile) {
                return (
                  <div
                    key={res.id}
                    style={{
                      background:    token.colorBgContainer,
                      borderRadius:  14,
                      border:        `1.5px solid ${token.colorBorderSecondary}`,
                      overflow:      'hidden',
                      boxShadow:     '0 1px 6px rgba(0,0,0,0.06)',
                      display:       'flex',
                      flexDirection: 'column',
                      opacity:       res.status === 'Cancelled' ? 0.72 : 1,
                    }}
                  >
                    <div style={{ height:3, background:cfg.color }}/>

                    <div style={{ padding:'11px 13px 12px', display:'flex', flexDirection:'column', gap:9 }}>

                      {/* Row 1: ID + status */}
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                          background:'rgba(22,119,255,0.1)', color:'#1677ff',
                          border:'1px solid rgba(22,119,255,0.2)', flexShrink:0,
                        }}>
                          #{res.id}
                        </span>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                          background:cfg.bg, color:cfg.color,
                          border:`1px solid ${cfg.color}40`,
                          display:'inline-flex', alignItems:'center', gap:3, flexShrink:0,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      {/* Row 2: Car info */}
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{
                          width:34, height:34, borderRadius:9, flexShrink:0,
                          background:`linear-gradient(135deg,${cfg.color}22,${cfg.color}10)`,
                          border:`1px solid ${cfg.color}30`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <CarFilled style={{ color:cfg.color, fontSize:15 }}/>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{
                            fontWeight:800, fontSize:14, color:token.colorText,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>
                            {res.carBrand} {res.carModel}
                          </div>
                          <div style={{ fontSize:10, color:token.colorTextTertiary }}>{res.licensePlate}</div>
                        </div>
                      </div>

                      {/* Admin: customer */}
                      {isAdmin && (
                        <div style={{
                          padding:'5px 9px', borderRadius:7,
                          background:token.colorFillAlter,
                          border:`1px solid ${token.colorBorderSecondary}`,
                          fontSize:11, color:token.colorTextSecondary,
                        }}>
                          👤 <strong style={{ color:token.colorText }}>{res.customerName}</strong>
                        </div>
                      )}

                      {/* Row 3: Dates */}
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <CalendarFilled style={{ color:'#1677ff', fontSize:12, flexShrink:0 }}/>
                        <span style={{ fontSize:12, fontWeight:600, color:token.colorText }}>
                          {format(new Date(res.startDate), 'dd.MM.yy')}
                          <span style={{ color:token.colorTextTertiary, margin:'0 4px' }}>→</span>
                          {format(new Date(res.endDate), 'dd.MM.yy')}
                        </span>
                        <span style={{
                          marginLeft:'auto', fontSize:10, fontWeight:700,
                          padding:'1px 7px', borderRadius:20,
                          background:token.colorFillAlter, color:token.colorTextSecondary,
                          border:`1px solid ${token.colorBorderSecondary}`, flexShrink:0,
                        }}>
                          {res.totalDays} kun
                        </span>
                      </div>

                      {/* Row 4: Branch */}
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <EnvironmentFilled style={{ color:'#fa8c16', fontSize:12, flexShrink:0 }}/>
                        <span style={{
                          fontSize:11, color:token.colorTextSecondary,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>
                          {res.pickupBranch}
                          {res.returnBranch && res.returnBranch !== res.pickupBranch && ` → ${res.returnBranch}`}
                        </span>
                      </div>

                      {/* Row 5: Amount */}
                      <div style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 10px', borderRadius:9,
                        background:'linear-gradient(135deg,rgba(22,119,255,0.07),rgba(99,102,241,0.07))',
                        border:'1px solid rgba(22,119,255,0.12)', marginTop:2,
                      }}>
                        <div>
                          <div style={{ fontSize:9, color:token.colorTextTertiary }}>Taxminiy narx</div>
                          <div>
                            <span style={{ fontWeight:800, fontSize:16, color:'#1677ff' }}>{fmt(res.estimatedAmount)}</span>
                            <span style={{ fontSize:10, color:token.colorTextTertiary, marginLeft:2 }}>so'm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cancel footer */}
                    {canCancel && (
                      <div style={{
                        padding:'8px 13px',
                        borderTop:`1px solid ${token.colorBorderSecondary}`,
                        background:token.colorFillAlter,
                      }}>
                        <Popconfirm
                          title="Bekor qilishni tasdiqlaysizmi?"
                          description={
                            <Input
                              placeholder="Sabab (ixtiyoriy)..."
                              value={cancelReason}
                              onChange={e => setCancelReason(e.target.value)}
                              style={{ marginTop:4 }}
                            />
                          }
                          onConfirm={() => handleCancel(res.id)}
                          onCancel={() => setCancelReason('')}
                          okText="Ha, bekor qil"
                          cancelText="Yo'q"
                          okButtonProps={{ danger:true }}
                        >
                          <Button
                            type="text" danger icon={<CloseOutlined/>} block
                            style={{ fontWeight:600, borderRadius:8, fontSize:12, height:32 }}
                          >
                            Bekor qilish
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                )
              }

              /* ── DESKTOP: original card ──────────────────────────────── */
              return (
                <div
                  key={res.id}
                  onMouseEnter={() => setHovered(res.id)}
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
                    opacity:       res.status === 'Cancelled' ? 0.7 : 1,
                  }}
                >
                  {/* Status color bar */}
                  <div style={{ height:4, background:cfg.color }}/>

                  <div style={{ padding:'16px 16px 14px', flex:1, display:'flex', flexDirection:'column', gap:11 }}>

                    {/* Header: ID + status + car */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:20,
                            background:'rgba(22,119,255,0.1)', color:'#1677ff',
                            border:'1px solid rgba(22,119,255,0.2)',
                          }}>
                            #{res.id}
                          </span>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:20,
                            background: cfg.bg, color: cfg.color,
                            border:`1px solid ${cfg.color}40`,
                            display:'inline-flex', alignItems:'center', gap:4,
                          }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <CarFilled style={{ color:'#1677ff', fontSize:14 }}/>
                          <span style={{ fontWeight:700, fontSize:14, color:token.colorText }}>
                            {res.carBrand} {res.carModel}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:token.colorTextTertiary, marginTop:2 }}>
                          {res.licensePlate}
                        </div>
                      </div>
                    </div>

                    {/* Admin: customer name */}
                    {isAdmin && (
                      <div style={{
                        padding:'6px 10px', borderRadius:8,
                        background:token.colorFillAlter,
                        border:`1px solid ${token.colorBorderSecondary}`,
                        fontSize:12, color:token.colorTextSecondary,
                      }}>
                        👤 <strong style={{ color:token.colorText }}>{res.customerName}</strong>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height:1, background:token.colorBorderSecondary }}/>

                    {/* Dates */}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <CalendarFilled style={{ color:'#1677ff', fontSize:14, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:token.colorText }}>
                          {format(new Date(res.startDate), 'dd.MM.yyyy')}
                          <span style={{ color:token.colorTextTertiary, margin:'0 6px' }}>→</span>
                          {format(new Date(res.endDate), 'dd.MM.yyyy')}
                        </div>
                        <div style={{ fontSize:11, color:token.colorTextTertiary }}>
                          {res.totalDays} kun
                        </div>
                      </div>
                    </div>

                    {/* Branch */}
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <EnvironmentFilled style={{ color:'#fa8c16', fontSize:14, marginTop:1, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:token.colorTextSecondary, lineHeight:1.5 }}>
                        {res.pickupBranch}
                        {res.returnBranch && res.returnBranch !== res.pickupBranch && (
                          <> → {res.returnBranch}</>
                        )}
                      </span>
                    </div>

                    {/* Amount */}
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 12px', borderRadius:10,
                      background:'linear-gradient(135deg,rgba(22,119,255,0.07),rgba(99,102,241,0.07))',
                      border:'1px solid rgba(22,119,255,0.12)',
                      marginTop:'auto',
                    }}>
                      <span style={{ fontSize:12, color:token.colorTextSecondary }}>Taxminiy narx</span>
                      <div>
                        <span style={{ fontWeight:800, fontSize:17, color:'#1677ff' }}>
                          {fmt(res.estimatedAmount)}
                        </span>
                        <span style={{ fontSize:11, color:token.colorTextTertiary, marginLeft:3 }}>so'm</span>
                      </div>
                    </div>
                  </div>

                  {/* Cancel footer */}
                  {canCancel && (
                    <div style={{
                      padding:'10px 16px',
                      borderTop:`1px solid ${token.colorBorderSecondary}`,
                      background:token.colorFillAlter,
                    }}>
                      <Popconfirm
                        title="Bekor qilishni tasdiqlaysizmi?"
                        description={
                          <Input
                            placeholder="Sabab (ixtiyoriy)..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            style={{ marginTop:4 }}
                          />
                        }
                        onConfirm={() => handleCancel(res.id)}
                        onCancel={() => setCancelReason('')}
                        okText="Ha, bekor qil"
                        cancelText="Yo'q"
                        okButtonProps={{ danger:true }}
                      >
                        <Button
                          type="text"
                          danger
                          icon={<CloseOutlined/>}
                          block
                          style={{ fontWeight:600, borderRadius:8 }}
                        >
                          Bekor qilish
                        </Button>
                      </Popconfirm>
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
    </div>
  )
}
