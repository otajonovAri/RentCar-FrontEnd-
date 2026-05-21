import { useState, useEffect, useCallback } from 'react'
import {
  Input, Avatar, Spin, Pagination, Badge, Grid, theme,
  Modal, Form, DatePicker, Popconfirm, message, Tooltip, Alert, Space, Tag,
} from 'antd'
import {
  SearchOutlined, CrownFilled, SafetyCertificateFilled,
  TeamOutlined, UserOutlined, ShopFilled, EditOutlined,
  CheckCircleFilled, ClockCircleFilled, AppstoreFilled,
  CalendarFilled, PhoneFilled, StopOutlined, UnlockOutlined,
  DeleteOutlined, LockOutlined, WarningFilled, ExclamationCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SendOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { usersApi } from '@/api/usersApi'
import type { UserDto, AccountDeletionRequestDto } from '@/types/users'
import type { UserRole } from '@/types/auth'
import type { PaginatedResponse } from '@/types/common'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/authStore'
import UserRoleModal from './components/UserRoleModal'
import { getApiError } from '@/utils/apiError'
import dayjs from 'dayjs'

// ── Role config ────────────────────────────────────────────────────────────
const ROLE_CFG: Record<UserRole, {
  label: string; color: string; bg: string; gradient: string
  icon: React.ReactNode
}> = {
  SuperAdmin: {
    label: 'Super Admin', color: '#f5222d', bg: 'rgba(245,34,45,0.1)',
    gradient: 'linear-gradient(135deg,#f5222d,#ff7875)',
    icon: <CrownFilled />,
  },
  Admin: {
    label: 'Admin', color: '#1677ff', bg: 'rgba(22,119,255,0.1)',
    gradient: 'linear-gradient(135deg,#1677ff,#69b1ff)',
    icon: <SafetyCertificateFilled />,
  },
  Manager: {
    label: 'Menejer', color: '#722ed1', bg: 'rgba(114,46,209,0.1)',
    gradient: 'linear-gradient(135deg,#722ed1,#b37feb)',
    icon: <TeamOutlined />,
  },
  Owner: {
    label: 'Egasi', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)',
    gradient: 'linear-gradient(135deg,#fa8c16,#ffd591)',
    icon: <ShopFilled />,
  },
  Customer: {
    label: 'Mijoz', color: '#13c2c2', bg: 'rgba(19,194,194,0.1)',
    gradient: 'linear-gradient(135deg,#13c2c2,#87e8de)',
    icon: <UserOutlined />,
  },
}

const ALL_ROLES: UserRole[] = ['Customer', 'Owner', 'Manager', 'Admin', 'SuperAdmin']
const FILTER_ROLES: (UserRole | 'all')[] = ['all', ...ALL_ROLES]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// Admin can only edit Customer/Owner users (cannot touch Admin/SuperAdmin)
function canEdit(editorRole: UserRole, targetRole: UserRole): boolean {
  if (editorRole === 'SuperAdmin') return true
  if (editorRole === 'Admin') return targetRole === 'Customer' || targetRole === 'Owner' || targetRole === 'Manager'
  return false
}

export default function UsersPage() {
  const { token }  = theme.useToken()
  const screens    = Grid.useBreakpoint()
  const isMobile   = !screens.md
  const { role: editorRole } = useAuthStore()
  const isSuperAdmin = editorRole === 'SuperAdmin'

  const [data,           setData]           = useState<PaginatedResponse<UserDto> | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')
  const [roleFilter,     setRoleFilter]     = useState<UserRole | undefined>()
  const [blockedFilter,  setBlockedFilter]  = useState<boolean | undefined>()
  const [roleModalUser,  setRoleModalUser]  = useState<UserDto | null>(null)
  const [blockModalUser, setBlockModalUser] = useState<UserDto | null>(null)
  const [blockLoading,   setBlockLoading]   = useState(false)
  const [actionLoading,  setActionLoading]  = useState<number | null>(null)
  const [hovered,        setHovered]        = useState<number | null>(null)
  const [blockForm] = Form.useForm()
  const { page, pageSize, onChange, reset } = usePagination()

  // ── O'chirish so'rovlari (Admin/SuperAdmin) ───────────────────────────────
  const [deletionRequests,      setDeletionRequests]      = useState<AccountDeletionRequestDto[]>([])
  const [deletionReqLoading,    setDeletionReqLoading]    = useState(false)
  const [deletionActionLoading, setDeletionActionLoading] = useState<number | null>(null)
  const [rejectModalUserId,     setRejectModalUserId]     = useState<number | null>(null)
  const [rejectForm]  = Form.useForm()
  const isAdmin = editorRole === 'Admin' || editorRole === 'SuperAdmin'
  const debouncedSearch = useDebounce(search)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersApi.getAll({
        page, pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter,
        isBlocked: blockedFilter,
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, roleFilter, blockedFilter])

  const handleBlock = async (values: { reason: string; blockedUntil?: dayjs.Dayjs | null }) => {
    if (!blockModalUser) return
    setBlockLoading(true)
    try {
      await usersApi.block(blockModalUser.id, {
        reason: values.reason,
        blockedUntil: values.blockedUntil ? values.blockedUntil.toISOString() : null,
      })
      message.success(`${blockModalUser.fullName} bloklandi`)
      setBlockModalUser(null)
      blockForm.resetFields()
      fetchData()
    } catch (e) {
      message.error(getApiError(e))
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblock = async (userId: number, fullName: string) => {
    setActionLoading(userId)
    try {
      await usersApi.unblock(userId)
      message.success(`${fullName} razblok qilindi`)
      fetchData()
    } catch (e) {
      message.error(getApiError(e))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: number, fullName: string) => {
    setActionLoading(userId)
    try {
      await usersApi.delete(userId)
      message.success(`${fullName} o'chirildi`)
      fetchData()
    } catch (e) {
      message.error(getApiError(e))
    } finally {
      setActionLoading(null)
    }
  }

  const fetchDeletionRequests = useCallback(async () => {
    if (!isAdmin) return
    setDeletionReqLoading(true)
    try {
      const res = await usersApi.getDeletionRequests()
      setDeletionRequests(res.data)
    } catch {
      // silently fail
    } finally {
      setDeletionReqLoading(false)
    }
  }, [isAdmin])

  const handleApproveDeletion = async (req: AccountDeletionRequestDto) => {
    setDeletionActionLoading(req.userId)
    try {
      await usersApi.approveDeletion(req.userId)
      message.success(`${req.userFullName} hisobi o'chirildi`)
      fetchDeletionRequests()
      fetchData()
    } catch (e) {
      message.error(getApiError(e))
    } finally {
      setDeletionActionLoading(null)
    }
  }

  const handleRejectDeletion = async (values: { reason: string }) => {
    if (!rejectModalUserId) return
    setDeletionActionLoading(rejectModalUserId)
    try {
      await usersApi.rejectDeletion(rejectModalUserId, values.reason)
      message.success("O'chirish so'rovi rad etildi")
      setRejectModalUserId(null)
      rejectForm.resetFields()
      fetchDeletionRequests()
    } catch (e) {
      message.error(getApiError(e))
    } finally {
      setDeletionActionLoading(null)
    }
  }

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchDeletionRequests() }, [fetchDeletionRequests])

  const items  = data?.items ?? []
  const total  = data?.totalCount ?? 0
  const cols   = isMobile ? 1 : !screens.lg ? 2 : screens.xl ? 3 : 2

  // Role counts for filter chips
  const roleCounts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = items.filter(u => u.role === r).length
    return acc
  }, {})

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   'linear-gradient(135deg,#1a0a3d 0%,#722ed1 55%,#1677ff 100%)',
        padding:      isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 28,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Decorative circles */}
        {[{s:220,t:-80,r:-60,o:.07},{s:140,t:40,r:100,o:.05},{s:100,b:-40,l:50,o:.07}].map((c,i)=>(
          <div key={i} style={{
            position:'absolute',borderRadius:'50%',background:'#fff',
            width:c.s,height:c.s,opacity:c.o,
            top:c.t,right:c.r,bottom:c.b,left:c.l,
          }}/>
        ))}

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Title row */}
          <div style={{
            display:'flex', alignItems: isMobile ? 'flex-start' : 'center',
            gap:16, marginBottom:20,
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
              <CrownFilled style={{ fontSize:28, color:'#fff' }}/>
            </div>

            <div style={{ flex:1 }}>
              <h1 style={{ margin:0, fontSize:isMobile?22:28, fontWeight:800, color:'#fff', lineHeight:1.2 }}>
                Foydalanuvchilar
              </h1>
              <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.75)' }}>
                Jami {total} ta foydalanuvchi ro'yxatda
              </p>
            </div>

            {/* Stats chips */}
            {!isMobile && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { label:'Mijoz',    val: items.filter(u=>u.role==='Customer').length, color:'#87e8de' },
                  { label:'Egasi',    val: items.filter(u=>u.role==='Owner').length,    color:'#ffd591' },
                  { label:'Menejer',  val: items.filter(u=>u.role==='Manager').length,  color:'#d3adf7' },
                  { label:'Admin',    val: items.filter(u=>u.role==='Admin').length,    color:'#91caff' },
                ].map((s,i) => (
                  <div key={i} style={{
                    padding:'8px 14px', borderRadius:12,
                    background:'rgba(255,255,255,0.12)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    textAlign:'center',
                  }}>
                    <div style={{ fontWeight:800, fontSize:18, color:s.color, lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search bar */}
          <div style={{ marginBottom:14 }}>
            <Input
              prefix={<SearchOutlined style={{ color:'rgba(255,255,255,0.6)' }}/>}
              placeholder="Ism, email yoki telefon bo'yicha qidirish..."
              value={search}
              onChange={e => { setSearch(e.target.value); reset() }}
              allowClear
              size="large"
              style={{
                borderRadius: 12,
                background:   'rgba(255,255,255,0.15)',
                backdropFilter:'blur(8px)',
                border:       '1px solid rgba(255,255,255,0.3)',
                color:        '#fff',
                fontSize:     14,
              }}
            />
          </div>

          {/* Role filter chips */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {FILTER_ROLES.map(r => {
              const cfg    = r === 'all' ? null : ROLE_CFG[r as UserRole]
              const active = r === 'all' ? (!roleFilter && blockedFilter === undefined) : (roleFilter === r && blockedFilter === undefined)
              const count  = r === 'all' ? total : roleCounts[r as UserRole] ?? 0
              return (
                <button
                  key={r}
                  onClick={() => { setRoleFilter(r === 'all' ? undefined : r as UserRole); setBlockedFilter(undefined); reset() }}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'5px 13px', borderRadius:50,
                    border:`1.5px solid ${active ? '#fff' : 'rgba(255,255,255,0.3)'}`,
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    backdropFilter:'blur(6px)',
                    color:'#fff', cursor:'pointer',
                    fontWeight: active ? 700 : 500, fontSize:12,
                    transition:'all 0.18s',
                    boxShadow: active ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {r === 'all'
                    ? <><AppstoreFilled style={{ fontSize:11 }}/> Barchasi</>
                    : <>{cfg?.icon} {cfg?.label}</>
                  }
                  {count > 0 && (
                    <Badge
                      count={count}
                      style={{
                        backgroundColor: r === 'all' ? '#fff' : (cfg?.color ?? '#fff'),
                        color: r === 'all' ? '#722ed1' : '#fff',
                        fontSize:10, minWidth:16, height:16,
                        lineHeight:'16px', padding:'0 4px',
                        boxShadow:'none',
                      }}
                    />
                  )}
                </button>
              )
            })}
            {/* Bloklangan filter */}
            <button
              onClick={() => { setBlockedFilter(blockedFilter === true ? undefined : true); setRoleFilter(undefined); reset() }}
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'5px 13px', borderRadius:50,
                border:`1.5px solid ${blockedFilter === true ? '#ff4d4f' : 'rgba(255,255,255,0.3)'}`,
                background: blockedFilter === true ? 'rgba(255,77,79,0.3)' : 'rgba(255,255,255,0.08)',
                backdropFilter:'blur(6px)',
                color:'#fff', cursor:'pointer',
                fontWeight: blockedFilter === true ? 700 : 500, fontSize:12,
                transition:'all 0.18s',
                boxShadow: blockedFilter === true ? '0 2px 10px rgba(255,77,79,0.4)' : 'none',
              }}
            >
              <StopOutlined style={{ fontSize:11 }}/> Bloklangan
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:80, gap:16 }}>
          <Spin size="large"/>
          <span style={{ color:token.colorTextTertiary, fontSize:13 }}>Foydalanuvchilar yuklanmoqda...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>👥</div>
          <div style={{ fontSize:18, fontWeight:700, color:token.colorText, marginBottom:6 }}>
            Foydalanuvchi topilmadi
          </div>
          <div style={{ fontSize:13, color:token.colorTextTertiary }}>
            {search ? `"${search}" bo'yicha natija yo'q` : 'Hali foydalanuvchi yo\'q'}
          </div>
          {(search || roleFilter) && (
            <button
              style={{
                marginTop:12, padding:'8px 20px', borderRadius:20,
                background:'linear-gradient(135deg,#722ed1,#1677ff)',
                border:'none', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:13,
              }}
              onClick={() => { setSearch(''); setRoleFilter(undefined); reset() }}
            >
              Filterni tozalash
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:token.colorTextSecondary }}>
              <strong style={{ color:token.colorText }}>{total}</strong> ta foydalanuvchi
            </span>
          </div>

          {/* Cards grid */}
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${cols},1fr)`,
            gap: isMobile ? 14 : 18,
            marginBottom:24,
          }}>
            {items.map(user => {
              const cfg   = ROLE_CFG[user.role as UserRole] ?? ROLE_CFG.Customer
              const isHov = hovered === user.id
              const isOnline = user.lastActive
                ? (new Date().getTime() - new Date(user.lastActive).getTime() < 1000 * 60 * 10)
                : false
              const canEditUser = editorRole ? canEdit(editorRole, user.role as UserRole) : false

              return (
                <div
                  key={user.id}
                  onMouseEnter={() => setHovered(user.id)}
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
                  }}
                >
                  {/* Role color bar */}
                  <div style={{ height:4, background: cfg.gradient }}/>

                  {/* Blocked banner */}
                  {user.isBlocked && (
                    <div style={{
                      background: 'linear-gradient(90deg, #ff4d4f, #f5222d)',
                      padding:'6px 14px',
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                      <LockOutlined style={{ color:'#fff', fontSize:11 }}/>
                      <span style={{ color:'#fff', fontWeight:700, fontSize:11 }}>BLOKLANGAN</span>
                      {user.blockedUntil && (
                        <span style={{ color:'rgba(255,255,255,0.8)', fontSize:10, marginLeft:'auto' }}>
                          {format(new Date(user.blockedUntil), 'dd.MM.yyyy')} gacha
                        </span>
                      )}
                      {!user.blockedUntil && (
                        <span style={{ color:'rgba(255,255,255,0.8)', fontSize:10, marginLeft:'auto' }}>Doimiy</span>
                      )}
                    </div>
                  )}

                  {/* Card header: avatar + name */}
                  <div style={{
                    padding:'16px 16px 12px',
                    background: user.isBlocked
                      ? 'linear-gradient(135deg, rgba(255,77,79,0.06), transparent)'
                      : `linear-gradient(135deg,${cfg.bg},transparent)`,
                    display:'flex', alignItems:'center', gap:12,
                    borderBottom:`1px solid ${token.colorBorderSecondary}`,
                  }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <Avatar
                        src={user.avatarUrl || undefined}
                        size={52}
                        style={{
                          background: user.isBlocked ? 'linear-gradient(135deg,#ff4d4f,#f5222d)' : cfg.gradient,
                          fontWeight: 700, fontSize: 18,
                          border: `2px solid ${token.colorBgContainer}`,
                          boxShadow: user.isBlocked ? '0 3px 10px rgba(255,77,79,0.4)' : `0 3px 10px ${cfg.color}40`,
                          filter: user.isBlocked ? 'grayscale(30%)' : 'none',
                        }}
                      >
                        {!user.avatarUrl && getInitials(user.fullName)}
                      </Avatar>
                      {/* Online dot */}
                      <div style={{
                        position:'absolute', bottom:2, right:2,
                        width:12, height:12, borderRadius:'50%',
                        background: user.isBlocked ? '#ff4d4f' : isOnline ? '#52c41a' : '#d9d9d9',
                        border:`2px solid ${token.colorBgContainer}`,
                      }}/>
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontWeight:700, fontSize:14,
                        color: user.isBlocked ? token.colorTextSecondary : token.colorText,
                        lineHeight:1.3,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        textDecoration: user.isBlocked ? 'line-through' : 'none',
                      }}>
                        {user.fullName}
                      </div>
                      <div style={{
                        fontSize:11, color:token.colorTextTertiary, marginTop:1,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {user.email}
                      </div>
                    </div>

                    {/* Role badge */}
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      padding:'3px 10px', borderRadius:20,
                      background: cfg.bg,
                      border:`1px solid ${cfg.color}40`,
                      color: cfg.color, fontWeight:700, fontSize:11,
                      flexShrink:0,
                    }}>
                      {cfg.icon} {cfg.label}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding:'12px 16px', flex:1, display:'flex', flexDirection:'column', gap:8 }}>

                    {/* Phone */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <PhoneFilled style={{ color: cfg.color, fontSize:12, flexShrink:0 }}/>
                      <span style={{ fontSize:13, fontFamily:'monospace', color:token.colorText }}>
                        {user.phoneNumber || '—'}
                      </span>
                    </div>

                    {/* Telegram */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <SendOutlined style={{ color: user.telegramId ? '#229ED9' : token.colorTextQuaternary, fontSize:12, flexShrink:0 }}/>
                      {user.telegramId ? (
                        <span style={{ fontSize:12, color:'#229ED9', fontWeight:600 }}>
                          {user.telegramUsername ? `@${user.telegramUsername}` : `ID: ${user.telegramId}`}
                        </span>
                      ) : (
                        <span style={{ fontSize:12, color:token.colorTextTertiary }}>Telegram ulanmagan</span>
                      )}
                    </div>

                    {/* Email confirmed */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {user.emailConfirmed
                        ? <><CheckCircleFilled style={{ color:'#52c41a', fontSize:12 }}/><span style={{ fontSize:12, color:'#52c41a' }}>Email tasdiqlangan</span></>
                        : <><ClockCircleFilled style={{ color:'#fa8c16', fontSize:12 }}/><span style={{ fontSize:12, color:'#fa8c16' }}>Email tasdiqlanmagan</span></>
                      }
                    </div>

                    {/* Block reason */}
                    {user.isBlocked && user.blockReason && (
                      <div style={{
                        display:'flex', alignItems:'flex-start', gap:6,
                        padding:'6px 10px', borderRadius:8,
                        background:'rgba(255,77,79,0.08)',
                        border:'1px solid rgba(255,77,79,0.2)',
                      }}>
                        <WarningFilled style={{ color:'#ff4d4f', fontSize:11, marginTop:1, flexShrink:0 }}/>
                        <span style={{ fontSize:11, color:'#ff4d4f', lineHeight:1.4 }}>
                          <strong>Sabab:</strong> {user.blockReason}
                        </span>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height:1, background:token.colorBorderSecondary, margin:'2px 0' }}/>

                    {/* Dates */}
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:10, color:token.colorTextTertiary }}>Ro'yxatdan</div>
                        <div style={{ fontSize:12, fontWeight:600, color:token.colorText, display:'flex', alignItems:'center', gap:4 }}>
                          <CalendarFilled style={{ fontSize:10, color:'#722ed1' }}/>
                          {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                        </div>
                      </div>
                      {user.lastActive && (
                        <div>
                          <div style={{ fontSize:10, color:token.colorTextTertiary }}>Oxirgi faollik</div>
                          <div style={{ fontSize:12, fontWeight:600, color: isOnline ? '#52c41a' : token.colorTextSecondary }}>
                            {format(new Date(user.lastActive), 'dd.MM.yyyy HH:mm')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: actions */}
                  {(canEditUser || isSuperAdmin) && (
                    <div style={{
                      padding:'10px 16px',
                      borderTop:`1px solid ${token.colorBorderSecondary}`,
                      background:token.colorFillAlter,
                      display:'flex', gap:6,
                    }}>
                      {/* Role change — Admin+SuperAdmin */}
                      {canEditUser && (
                        <button
                          onClick={() => setRoleModalUser(user)}
                          style={{
                            flex:1, padding:'7px 0', borderRadius:8,
                            background: isHov ? cfg.gradient : 'transparent',
                            border:`1.5px solid ${isHov ? 'transparent' : cfg.color}`,
                            color: isHov ? '#fff' : cfg.color,
                            fontWeight:700, fontSize:12, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                            transition:'all 0.18s',
                          }}
                        >
                          <EditOutlined/> Rol
                        </button>
                      )}

                      {/* Block/Unblock — SuperAdmin only */}
                      {isSuperAdmin && user.role !== 'SuperAdmin' && (
                        user.isBlocked ? (
                          <button
                            onClick={() => handleUnblock(user.id, user.fullName)}
                            disabled={actionLoading === user.id}
                            style={{
                              flex:1, padding:'7px 0', borderRadius:8,
                              background:'rgba(82,196,26,0.1)',
                              border:'1.5px solid #52c41a',
                              color:'#52c41a',
                              fontWeight:700, fontSize:12, cursor:'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                              transition:'all 0.18s', opacity: actionLoading === user.id ? 0.6 : 1,
                            }}
                          >
                            <UnlockOutlined/> Razblok
                          </button>
                        ) : (
                          <button
                            onClick={() => { setBlockModalUser(user); blockForm.resetFields() }}
                            style={{
                              flex:1, padding:'7px 0', borderRadius:8,
                              background:'rgba(255,77,79,0.08)',
                              border:'1.5px solid #ff4d4f',
                              color:'#ff4d4f',
                              fontWeight:700, fontSize:12, cursor:'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                              transition:'all 0.18s',
                            }}
                          >
                            <StopOutlined/> Bloklash
                          </button>
                        )
                      )}

                      {/* Delete — SuperAdmin only */}
                      {isSuperAdmin && user.role !== 'SuperAdmin' && (
                        <Tooltip title="O'chirish (soft delete)">
                          <Popconfirm
                            title={`${user.fullName}ni o'chirmoqchimisiz?`}
                            description="Bu amal foydalanuvchini tizimdan o'chirib yuboradi."
                            onConfirm={() => handleDelete(user.id, user.fullName)}
                            okText="Ha, o'chir"
                            cancelText="Bekor"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              disabled={actionLoading === user.id}
                              style={{
                                width:34, height:34, borderRadius:8,
                                background:'rgba(255,77,79,0.08)',
                                border:'1.5px solid rgba(255,77,79,0.4)',
                                color:'#ff4d4f',
                                cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                flexShrink:0, opacity: actionLoading === user.id ? 0.6 : 1,
                              }}
                            >
                              <DeleteOutlined style={{ fontSize:13 }}/>
                            </button>
                          </Popconfirm>
                        </Tooltip>
                      )}
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

      {/* ── O'chirish so'rovlari (Admin/SuperAdmin) ────────────────────────── */}
      {isAdmin && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,77,79,0.1)',
              border: '1px solid rgba(255,77,79,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: token.colorText }}>
                Hisob o'chirish so'rovlari
                {deletionRequests.length > 0 && (
                  <Badge count={deletionRequests.length} style={{ marginLeft: 8, background: '#ff4d4f' }} />
                )}
              </div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
                Foydalanuvchilarning o'chirish so'rovlari
              </div>
            </div>
            <button
              onClick={() => fetchDeletionRequests()}
              disabled={deletionReqLoading}
              style={{
                marginLeft: 'auto', padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: 'transparent', cursor: 'pointer', fontSize: 12,
                color: token.colorTextSecondary,
              }}
            >
              {deletionReqLoading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>

          {deletionReqLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : deletionRequests.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="Kutilayotgan so'rovlar yo'q"
              description="Hech qanday o'chirish so'rovi mavjud emas."
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {deletionRequests.map(req => (
                <div
                  key={req.id}
                  style={{
                    background: token.colorBgContainer,
                    borderRadius: 14,
                    border: `1.5px solid rgba(255,77,79,0.25)`,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: 14,
                    flexDirection: isMobile ? 'column' : 'row',
                  }}
                >
                  {/* Avatar */}
                  <Avatar
                    size={46}
                    style={{ background: 'linear-gradient(135deg,#ff4d4f,#f5222d)', flexShrink: 0, fontWeight: 700 }}
                  >
                    {req.userFullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </Avatar>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: token.colorText }}>
                      {req.userFullName}
                    </div>
                    <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{req.userEmail}</div>
                    <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 2 }}>
                      📅 So'rov: {dayjs(req.requestedAt).format('DD.MM.YYYY HH:mm')}
                    </div>
                  </div>

                  <Tag color="orange" style={{ flexShrink: 0 }}>
                    <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                    Kutilmoqda
                  </Tag>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Popconfirm
                      title={`${req.userFullName} hisobini o'chirmoqchimisiz?`}
                      description="Bu amal qaytarib bo'lmaydi."
                      okText="Ha, tasdiqlash"
                      cancelText="Bekor"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleApproveDeletion(req)}
                    >
                      <button
                        disabled={deletionActionLoading === req.userId}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          background: 'linear-gradient(135deg,#ff4d4f,#f5222d)',
                          border: 'none', color: '#fff',
                          fontWeight: 700, fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          opacity: deletionActionLoading === req.userId ? 0.6 : 1,
                        }}
                      >
                        <CheckCircleOutlined /> Tasdiqlash
                      </button>
                    </Popconfirm>

                    <button
                      onClick={() => { setRejectModalUserId(req.userId); rejectForm.resetFields() }}
                      style={{
                        padding: '7px 14px', borderRadius: 8,
                        background: 'transparent',
                        border: `1.5px solid ${token.colorBorderSecondary}`,
                        color: token.colorTextSecondary,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <CloseCircleOutlined /> Rad etish
                    </button>
                  </div>
                </div>
              ))}
            </Space>
          )}
        </div>
      )}

      <UserRoleModal
        user={roleModalUser}
        editorRole={editorRole!}
        onClose={() => setRoleModalUser(null)}
        onSuccess={() => { setRoleModalUser(null); fetchData() }}
      />

      {/* ── Reject Deletion Modal ────────────────────────────────────────── */}
      <Modal
        open={!!rejectModalUserId}
        onCancel={() => { setRejectModalUserId(null); rejectForm.resetFields() }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>O'chirish so'rovini rad etish</span>
          </div>
        }
        footer={null}
        width={420}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectDeletion} style={{ marginTop: 12 }}>
          <Form.Item
            name="reason"
            label={<span style={{ fontWeight: 600 }}>Rad etish sababi <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[
              { required: true, message: 'Sabab kiritish majburiy' },
              { min: 5, message: "Kamida 5 ta belgi kiriting" },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nima uchun rad etilmoqda? (to'lanmagan qarzlar, faol ijara...)"
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setRejectModalUserId(null); rejectForm.resetFields() }}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${token.colorBorderSecondary}`,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: token.colorTextSecondary,
              }}
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={!!deletionActionLoading}
              style={{
                padding: '8px 24px', borderRadius: 8,
                background: '#ff4d4f', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
              }}
            >
              Rad etish
            </button>
          </div>
        </Form>
      </Modal>

      {/* ── Block Modal ───────────────────────────────────────────────────── */}
      <Modal
        open={!!blockModalUser}
        onCancel={() => { setBlockModalUser(null); blockForm.resetFields() }}
        title={
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'rgba(255,77,79,0.1)',
              border:'1px solid rgba(255,77,79,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <StopOutlined style={{ color:'#ff4d4f', fontSize:16 }}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, lineHeight:1.2 }}>Foydalanuvchini bloklash</div>
              {blockModalUser && (
                <div style={{ fontSize:12, color:'#8c8c8c', fontWeight:400 }}>{blockModalUser.fullName}</div>
              )}
            </div>
          </div>
        }
        footer={null}
        width={440}
      >
        <Form form={blockForm} layout="vertical" onFinish={handleBlock} style={{ marginTop:16 }}>
          <Form.Item
            name="reason"
            label={<span style={{ fontWeight:600 }}>Blok sababi <span style={{ color:'#ff4d4f' }}>*</span></span>}
            rules={[
              { required: true, message: 'Sabab kiritish majburiy' },
              { min: 5, message: "Kamida 5 ta belgi kiriting" },
              { max: 500, message: "Ko'pi bilan 500 ta belgi" },
            ]}
          >
            <textarea
              rows={3}
              placeholder="Nima uchun bloklanyapti? (qoidabuzarlik, firibgarlik, spam...)"
              style={{
                width:'100%', borderRadius:8, padding:'8px 12px',
                border:`1px solid rgba(255,77,79,0.4)`,
                fontSize:13, resize:'vertical', minHeight:80,
                background:'rgba(255,77,79,0.04)',
                outline:'none', color:'inherit',
                fontFamily:'inherit',
              }}
            />
          </Form.Item>

          <Form.Item
            name="blockedUntil"
            label={<span style={{ fontWeight:600 }}>Blok muddati <span style={{ color:'#8c8c8c', fontWeight:400 }}>(bo'sh = doimiy)</span></span>}
          >
            <DatePicker
              showTime
              format="DD.MM.YYYY HH:mm"
              placeholder="Sana tanlang (ixtiyoriy)"
              disabledDate={d => d && d.isBefore(dayjs())}
              style={{ width:'100%' }}
            />
          </Form.Item>

          <div style={{
            marginBottom:16, padding:'10px 14px', borderRadius:8,
            background:'rgba(255,77,79,0.06)',
            border:'1px solid rgba(255,77,79,0.15)',
            fontSize:12, color:'#8c8c8c', lineHeight:1.6,
          }}>
            ⚠️ Bloklangan foydalanuvchi tizimga kira olmaydi va blok sababini ko'ra oladi.
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button
              type="button"
              onClick={() => { setBlockModalUser(null); blockForm.resetFields() }}
              style={{
                padding:'8px 20px', borderRadius:8,
                background:'transparent', border:`1px solid ${token.colorBorderSecondary}`,
                cursor:'pointer', fontSize:13, fontWeight:600,
                color:token.colorTextSecondary,
              }}
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={blockLoading}
              style={{
                padding:'8px 24px', borderRadius:8,
                background: blockLoading ? '#ff7875' : 'linear-gradient(135deg,#ff4d4f,#f5222d)',
                border:'none', cursor: blockLoading ? 'not-allowed' : 'pointer',
                fontSize:13, fontWeight:700, color:'#fff',
                display:'flex', alignItems:'center', gap:6,
                boxShadow:'0 2px 8px rgba(255,77,79,0.4)',
              }}
            >
              <StopOutlined/> {blockLoading ? 'Bloklanyapti...' : 'Bloklash'}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
