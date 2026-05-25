import { useState, useEffect } from 'react'
import { Spin, Avatar, Grid, theme } from 'antd'
import {
  CarFilled, FileTextFilled, CalendarFilled, WarningFilled,
  UserOutlined, ToolFilled, CheckCircleFilled, ClockCircleFilled,
  DollarCircleFilled, CrownFilled, SafetyCertificateFilled,
  TeamOutlined, RightOutlined, ArrowUpOutlined,
  ThunderboltFilled, BellFilled, BranchesOutlined, TagsFilled,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { carsApi } from '@/api/carsApi'
import { rentalsApi } from '@/api/rentalsApi'
import { reservationsApi } from '@/api/reservationsApi'
import { finesApi } from '@/api/finesApi'
import { maintenanceApi } from '@/api/maintenanceApi'
import { usersApi } from '@/api/usersApi'
import { carListingsApi } from '@/api/carListingsApi'
import type { RentalDto } from '@/types/rentals'
import { format } from 'date-fns'

const fmt = (n: number) => n.toLocaleString('ru-RU')

// ── Role theme ──────────────────────────────────────────────────────────────
function getRoleTheme(role: string | null) {
  switch (role) {
    case 'SuperAdmin': return {
      gradient: 'linear-gradient(135deg,#1a0005 0%,#820014 50%,#faad14 100%)',
      icon: <CrownFilled style={{ fontSize:28, color:'#fff' }}/>,
      label: 'Super Admin',
      accent: '#f5222d',
    }
    case 'Admin': return {
      gradient: 'linear-gradient(135deg,#0d0a3d 0%,#1677ff 55%,#722ed1 100%)',
      icon: <SafetyCertificateFilled style={{ fontSize:28, color:'#fff' }}/>,
      label: 'Admin',
      accent: '#1677ff',
    }
    default: return {
      gradient: 'linear-gradient(135deg,#002333 0%,#006d75 50%,#1677ff 100%)',
      icon: <TeamOutlined style={{ fontSize:28, color:'#fff' }}/>,
      label: 'Menejer',
      accent: '#13c2c2',
    }
  }
}

// ── Weekday names ────────────────────────────────────────────────────────────
const UZ_DAYS   = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba']
const UZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
function uzDate() {
  const d = new Date()
  return `${UZ_DAYS[d.getDay()]}, ${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title:    string
  value:    number | null
  icon:     React.ReactNode
  gradient: string
  color:    string
  path:     string
  badge?:   string
  trend?:   'up' | 'warn'
  navigate: (p: string) => void
  isHov:    boolean
  onHover:  (id: string | null) => void
  id:       string
  token:    ReturnType<typeof theme.useToken>['token']
}

function StatCard({ title, value, icon, gradient, color, path, badge, trend, navigate: nav, isHov, onHover, id, token }: StatCardProps) {
  return (
    <div
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => nav(path)}
      style={{
        background:    token.colorBgContainer,
        borderRadius:  16,
        border:        `1.5px solid ${isHov ? color : token.colorBorderSecondary}`,
        padding:       '18px 20px',
        cursor:        'pointer',
        transform:     isHov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow:     isHov
          ? `0 16px 40px ${color}22, 0 4px 12px rgba(0,0,0,0.08)`
          : '0 2px 8px rgba(0,0,0,0.05)',
        transition:    'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Gradient stripe */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:gradient }}/>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:token.colorTextTertiary, fontWeight:500, marginBottom:8 }}>
            {title}
          </div>
          <div style={{ fontSize:30, fontWeight:900, color:token.colorText, lineHeight:1 }}>
            {value === null
              ? <Spin size="small"/>
              : <span style={{ color }}>{value}</span>
            }
          </div>
          {badge && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap:4, marginTop:8,
              fontSize:10, fontWeight:700,
              color: trend === 'warn' ? '#fa8c16' : '#52c41a',
              background: trend === 'warn' ? 'rgba(250,140,22,0.1)' : 'rgba(82,196,26,0.1)',
              padding:'2px 7px', borderRadius:20,
              border:`1px solid ${trend === 'warn' ? 'rgba(250,140,22,0.3)' : 'rgba(82,196,26,0.3)'}`,
            }}>
              <ArrowUpOutlined style={{ fontSize:9 }}/> {badge}
            </div>
          )}
        </div>
        <div style={{
          width:48, height:48, borderRadius:12, flexShrink:0,
          background: gradient,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, color:'#fff',
          boxShadow: isHov ? `0 6px 18px ${color}50` : `0 3px 8px ${color}30`,
          transition:'box-shadow 0.2s',
        }}>
          {icon}
        </div>
      </div>

      {/* Navigate arrow */}
      <div style={{
        position:'absolute', bottom:14, right:16,
        opacity: isHov ? 1 : 0,
        transform: isHov ? 'translateX(0)' : 'translateX(-6px)',
        transition:'all 0.2s',
        fontSize:12, color, fontWeight:700,
        display:'flex', alignItems:'center', gap:3,
      }}>
        Ko'rish <RightOutlined style={{ fontSize:10 }}/>
      </div>
    </div>
  )
}

// ── Quick link ────────────────────────────────────────────────────────────────
interface QuickLinkProps {
  label:    string
  desc:     string
  icon:     React.ReactNode
  gradient: string
  color:    string
  path:     string
  navigate: (p: string) => void
  isHov:    boolean
  onHover:  (id: string | null) => void
  id:       string
  token:    ReturnType<typeof theme.useToken>['token']
}

function QuickLink({ label, desc, icon, gradient, color, path, navigate: nav, isHov, onHover, id, token }: QuickLinkProps) {
  return (
    <div
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => nav(path)}
      style={{
        background:    token.colorBgContainer,
        borderRadius:  14,
        border:        `1.5px solid ${isHov ? color : token.colorBorderSecondary}`,
        padding:       '14px 16px',
        cursor:        'pointer',
        transform:     isHov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow:     isHov ? `0 10px 28px ${color}20` : '0 2px 6px rgba(0,0,0,0.04)',
        transition:    'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        display:       'flex', alignItems:'center', gap:12,
        overflow:      'hidden', position:'relative',
      }}
    >
      <div style={{ height:'100%', width:3, position:'absolute', left:0, top:0, bottom:0, background:gradient }}/>
      <div style={{
        width:40, height:40, borderRadius:10, flexShrink:0,
        background: isHov ? gradient : `${color}12`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, color: isHov ? '#fff' : color,
        transition:'all 0.18s',
        boxShadow: isHov ? `0 4px 12px ${color}40` : 'none',
      }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:13, color:token.colorText }}>{label}</div>
        <div style={{ fontSize:11, color:token.colorTextTertiary, marginTop:1 }}>{desc}</div>
      </div>
      <RightOutlined style={{
        fontSize:11, color: isHov ? color : token.colorTextTertiary,
        transition:'color 0.18s', flexShrink:0,
      }}/>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate             = useNavigate()
  const { token }            = theme.useToken()
  const screens              = Grid.useBreakpoint()
  const isMobile             = !screens.md
  const { fullName, role, hasRole, userId } = useAuthStore()

  const isManager = hasRole(['Manager', 'Admin', 'SuperAdmin'])
  const isAdmin   = hasRole(['Admin', 'SuperAdmin'])
  const roleTheme = getRoleTheme(role)

  const [hoverId,   setHoverId]   = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Profil rasmini fetch qilish
  useEffect(() => {
    if (!userId) return
    usersApi.getById(userId)
      .then(res => setAvatarUrl(res.data.avatarUrl))
      .catch(() => {})
  }, [userId])

  const [stats, setStats] = useState({
    totalCars:           null as number | null,
    availableCars:       null as number | null,
    rentedCars:          null as number | null,
    activeRentals:       null as number | null,
    pendingRentals:      null as number | null,
    totalRentals:        null as number | null,
    pendingReservations: null as number | null,
    totalReservations:   null as number | null,
    pendingFines:        null as number | null,
    scheduledMaint:      null as number | null,
    totalUsers:          null as number | null,
    pendingListings:     null as number | null,
  })
  const [recentRentals,  setRecentRentals]  = useState<RentalDto[]>([])
  const [rentalsLoading, setRentalsLoading] = useState(true)

  useEffect(() => {
    const reqs: Promise<unknown>[] = []

    reqs.push(
      Promise.allSettled([
        carsApi.getAll({ page:1, pageSize:1 }),
        carsApi.getAll({ page:1, pageSize:1, status:'Available' }),
        carsApi.getAll({ page:1, pageSize:1, status:'Rented' }),
      ]).then(([total, avail, rented]) => setStats(p => ({
        ...p,
        totalCars:     total.status  === 'fulfilled' ? total.value.data.totalCount  : null,
        availableCars: avail.status  === 'fulfilled' ? avail.value.data.totalCount  : null,
        rentedCars:    rented.status === 'fulfilled' ? rented.value.data.totalCount : null,
      })))
    )
    reqs.push(
      Promise.allSettled([
        rentalsApi.getAll({ page:1, pageSize:1, status:'Active'  }),
        rentalsApi.getAll({ page:1, pageSize:1, status:'Pending' }),
        rentalsApi.getAll({ page:1, pageSize:1 }),
      ]).then(([active, pending, total]) => setStats(p => ({
        ...p,
        activeRentals:  active.status  === 'fulfilled' ? active.value.data.totalCount  : null,
        pendingRentals: pending.status === 'fulfilled' ? pending.value.data.totalCount : null,
        totalRentals:   total.status   === 'fulfilled' ? total.value.data.totalCount   : null,
      })))
    )
    reqs.push(
      Promise.allSettled([
        reservationsApi.getAll({ page:1, pageSize:1, status:'Pending' }),
        reservationsApi.getAll({ page:1, pageSize:1 }),
      ]).then(([pending, total]) => setStats(p => ({
        ...p,
        pendingReservations: pending.status === 'fulfilled' ? pending.value.data.totalCount : null,
        totalReservations:   total.status   === 'fulfilled' ? total.value.data.totalCount   : null,
      })))
    )
    reqs.push(
      finesApi.getAll({ page:1, pageSize:1, status:'Unpaid' })
        .then(r => setStats(p => ({ ...p, pendingFines: r.data.totalCount })))
        .catch(() => {})
    )
    if (isManager) reqs.push(
      maintenanceApi.getAll({ page:1, pageSize:1, status:'Scheduled' })
        .then(r => setStats(p => ({ ...p, scheduledMaint: r.data.totalCount })))
        .catch(() => {})
    )
    if (isAdmin) reqs.push(
      usersApi.getAll({ page:1, pageSize:1 })
        .then(r => setStats(p => ({ ...p, totalUsers: r.data.totalCount })))
        .catch(() => {})
    )
    if (isAdmin) reqs.push(
      carListingsApi.getAll({ page:1, pageSize:1, status:'Pending' })
        .then(r => setStats(p => ({ ...p, pendingListings: r.data.totalCount })))
        .catch(() => {})
    )

    Promise.allSettled(reqs)
  }, [isManager, isAdmin])

  useEffect(() => {
    rentalsApi.getAll({ page:1, pageSize:6 })
      .then(r => setRecentRentals(r.data.items))
      .catch(() => {})
      .finally(() => setRentalsLoading(false))
  }, [])

  const statCards = [
    { id:'cars',     title:'Jami mashinalar',    value:stats.totalCars,           icon:<CarFilled/>,          gradient:'linear-gradient(135deg,#1677ff,#69b1ff)', color:'#1677ff', path:'/cars' },
    { id:'avail',    title:'Mavjud mashinalar',   value:stats.availableCars,       icon:<CheckCircleFilled/>,  gradient:'linear-gradient(135deg,#52c41a,#95f985)', color:'#52c41a', path:'/cars' },
    { id:'rented',   title:'Ijaradagi mashinalar',value:stats.rentedCars,          icon:<CarFilled/>,          gradient:'linear-gradient(135deg,#fa8c16,#ffd591)', color:'#fa8c16', path:'/rentals' },
    { id:'active',   title:'Faol ijaralar',       value:stats.activeRentals,       icon:<FileTextFilled/>,     gradient:'linear-gradient(135deg,#13c2c2,#87e8de)', color:'#13c2c2', path:'/rentals' },
    { id:'pend_r',   title:'Kutilayotgan ijaralar',value:stats.pendingRentals,     icon:<ClockCircleFilled/>,  gradient:'linear-gradient(135deg,#722ed1,#b37feb)', color:'#722ed1', path:'/rentals',   trend:'warn' as const },
    { id:'reserv',   title:'Kutilayotgan rezerv',  value:stats.pendingReservations, icon:<CalendarFilled/>,    gradient:'linear-gradient(135deg,#eb2f96,#ff85c2)', color:'#eb2f96', path:'/reservations', trend:'warn' as const },
    { id:'fines',    title:"To'lanmagan jarimalar",value:stats.pendingFines,        icon:<WarningFilled/>,     gradient:'linear-gradient(135deg,#ff4d4f,#ff7875)', color:'#ff4d4f', path:'/fines',      trend:'warn' as const },
    { id:'total_r',  title:'Jami ijaralar',        value:stats.totalRentals,        icon:<DollarCircleFilled/>,gradient:'linear-gradient(135deg,#1677ff,#6366f1)', color:'#1677ff', path:'/rentals' },
    ...(isManager ? [{ id:'maint', title:"Rejalashtirilgan ta'mirlash", value:stats.scheduledMaint, icon:<ToolFilled/>,      gradient:'linear-gradient(135deg,#f5222d,#fa8c16)', color:'#f5222d', path:'/maintenance', trend:'warn' as const }] : []),
    ...(isAdmin   ? [
      { id:'users',    title:'Jami foydalanuvchilar',      value:stats.totalUsers,      icon:<UserOutlined/>,  gradient:'linear-gradient(135deg,#faad14,#ffd666)', color:'#faad14', path:'/users' },
      { id:'listings', title:"Kutilayotgan mashina so'rovlar", value:stats.pendingListings, icon:<TagsFilled/>, gradient:'linear-gradient(135deg,#fa541c,#fa8c16)', color:'#fa541c', path:'/car-listings', trend:'warn' as const },
    ] : []),
  ]

  const quickLinks = [
    { id:'ql_cars',  label:'Mashinalar',       desc:'Avtomobil parki',           icon:<CarFilled/>,          gradient:'linear-gradient(135deg,#1677ff,#69b1ff)', color:'#1677ff', path:'/cars' },
    { id:'ql_rent',  label:'Ijaralar',          desc:'Barcha ijaralar',           icon:<FileTextFilled/>,     gradient:'linear-gradient(135deg,#13c2c2,#87e8de)', color:'#13c2c2', path:'/rentals' },
    { id:'ql_res',   label:'Rezervatsiyalar',   desc:'Bronlar ro\'yxati',         icon:<CalendarFilled/>,     gradient:'linear-gradient(135deg,#722ed1,#b37feb)', color:'#722ed1', path:'/reservations' },
    { id:'ql_fine',  label:'Jarimalar',         desc:'Jarima nazorati',           icon:<WarningFilled/>,      gradient:'linear-gradient(135deg,#ff4d4f,#ff7875)', color:'#ff4d4f', path:'/fines' },
    { id:'ql_notif', label:'Bildirishnomalar',  desc:'Yangi xabarlar',           icon:<BellFilled/>,         gradient:'linear-gradient(135deg,#fa8c16,#ffd591)', color:'#fa8c16', path:'/notifications' },
    { id:'ql_pay',   label:"To'lovlar",         desc:'Moliyaviy hisobot',         icon:<DollarCircleFilled/>, gradient:'linear-gradient(135deg,#52c41a,#95f985)', color:'#52c41a', path:'/payments' },
    ...(isManager ? [
      { id:'ql_maint', label:"Texnik xizmat",   desc:"Ta'mirlash jadvali",        icon:<ToolFilled/>,         gradient:'linear-gradient(135deg,#f5222d,#fa8c16)', color:'#f5222d', path:'/maintenance' },
      { id:'ql_ins',   label:"Sug'urta",         desc:"Sug'urta nazorati",        icon:<ThunderboltFilled/>,  gradient:'linear-gradient(135deg,#006d75,#13c2c2)', color:'#13c2c2', path:'/insurance' },
      { id:'ql_br',    label:'Filiallar',        desc:'Filial boshqaruvi',        icon:<BranchesOutlined/>,   gradient:'linear-gradient(135deg,#531dab,#1677ff)', color:'#531dab', path:'/branches' },
    ] : []),
    ...(isAdmin ? [
      { id:'ql_users',    label:'Foydalanuvchilar',   desc:"Foydalanuvchilar ro'yxati",    icon:<UserOutlined/>, gradient:'linear-gradient(135deg,#faad14,#ffd666)', color:'#faad14', path:'/users' },
      { id:'ql_listings', label:"Mashina so'rovlari", desc:'Owner so\'rovlari ko\'rib chiqish', icon:<TagsFilled/>,  gradient:'linear-gradient(135deg,#fa541c,#fa8c16)', color:'#fa541c', path:'/car-listings' },
    ] : []),
  ]

  const statCols  = isMobile ? 2 : !screens.lg ? 3 : 5
  const quickCols = isMobile ? 1 : !screens.lg ? 2 : 3

  const RENTAL_STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
    Active:    { color:'#52c41a', bg:'rgba(82,196,26,0.1)',    label:'Faol'       },
    Pending:   { color:'#fa8c16', bg:'rgba(250,140,22,0.1)',   label:'Kutilmoqda' },
    Completed: { color:'#1677ff', bg:'rgba(22,119,255,0.1)',   label:'Yakunlangan'},
    Cancelled: { color:'#8c8c8c', bg:'rgba(140,140,140,0.08)', label:'Bekor'      },
  }

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background:   roleTheme.gradient,
        padding:      isMobile ? '28px 20px 24px' : '40px 40px 36px',
        marginBottom: 24,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {[{s:260,t:-100,r:-80,o:.07},{s:160,t:50,r:140,o:.05},{s:110,b:-40,l:60,o:.07}].map((c,i)=>(
          <div key={i} style={{
            position:'absolute', borderRadius:'50%', background:'#fff',
            width:c.s, height:c.s, opacity:c.o,
            top:c.t, right:c.r, bottom:c.b, left:c.l,
          }}/>
        ))}

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{
            display:'flex', alignItems: isMobile ? 'flex-start' : 'center',
            gap:18, flexDirection: isMobile ? 'column' : 'row',
          }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <Avatar
                size={isMobile ? 64 : 80}
                src={avatarUrl || undefined}
                icon={!avatarUrl ? <UserOutlined/> : undefined}
                style={{
                  background: avatarUrl
                    ? 'transparent'
                    : 'rgba(255,255,255,0.25)',
                  border:'3px solid rgba(255,255,255,0.55)',
                  boxShadow:'0 6px 24px rgba(0,0,0,0.25)',
                  fontSize: isMobile ? 26 : 34,
                  objectFit:'cover',
                }}
              />
              {/* Role icon badge */}
              <div style={{
                position:'absolute', bottom:-2, right:-2,
                width:28, height:28, borderRadius:'50%',
                background:roleTheme.gradient,
                border:'2.5px solid rgba(255,255,255,0.85)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14,
                boxShadow:'0 3px 10px rgba(0,0,0,0.25)',
              }}>
                {roleTheme.icon}
              </div>
            </div>

            {/* Greet text */}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:500, marginBottom:4 }}>
                {uzDate()}
              </div>
              <h1 style={{ margin:0, fontSize: isMobile ? 22 : 30, fontWeight:900, color:'#fff', lineHeight:1.2 }}>
                Xush kelibsiz, {fullName?.split(' ')[0] ?? 'Foydalanuvchi'}! 👋
              </h1>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6, marginTop:8,
                padding:'4px 12px', borderRadius:20,
                background:'rgba(255,255,255,0.18)',
                border:'1px solid rgba(255,255,255,0.3)',
                fontSize:12, color:'#fff', fontWeight:700,
              }}>
                {roleTheme.icon} {roleTheme.label}
              </div>
            </div>

            {/* Key stats — desktop */}
            {!isMobile && (
              <div style={{ display:'flex', gap:12 }}>
                {[
                  { label:'Faol ijaralar',  val: stats.activeRentals,       color:'#87e8de' },
                  { label:'Mavjud mashina', val: stats.availableCars,       color:'#95f985' },
                  { label:'Kutilgan bron',  val: stats.pendingReservations, color:'#ffe58f' },
                ].map((s,i)=>(
                  <div key={i} style={{
                    padding:'10px 18px', borderRadius:14,
                    background:'rgba(255,255,255,0.14)',
                    backdropFilter:'blur(6px)',
                    border:'1px solid rgba(255,255,255,0.22)',
                    textAlign:'center', minWidth:80,
                  }}>
                    <div style={{ fontWeight:900, fontSize:22, color:s.color, lineHeight:1 }}>
                      {s.val === null ? '—' : s.val}
                    </div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS GRID ──────────────────────────────────────────────────── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(${statCols},1fr)`,
        gap: isMobile ? 12 : 16,
        marginBottom:24,
      }}>
        {statCards.map(card => (
          <StatCard
            key={card.id}
            {...card}
            navigate={navigate}
            isHov={hoverId === card.id}
            onHover={setHoverId}
            token={token}
            badge={undefined}
          />
        ))}
      </div>

      {/* ── RECENT RENTALS ──────────────────────────────────────────────── */}
      <div style={{
        background:    token.colorBgContainer,
        borderRadius:  18,
        border:        `1.5px solid ${token.colorBorderSecondary}`,
        overflow:      'hidden',
        marginBottom:  24,
        boxShadow:     '0 2px 10px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{
          padding:      '16px 22px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display:      'flex', alignItems:'center', justifyContent:'space-between',
          background:   'linear-gradient(135deg,rgba(22,119,255,0.04),rgba(99,102,241,0.04))',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:9,
              background:'linear-gradient(135deg,#1677ff,#6366f1)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <FileTextFilled style={{ color:'#fff', fontSize:16 }}/>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:token.colorText }}>
                So'nggi ijaralar
              </div>
              <div style={{ fontSize:11, color:token.colorTextTertiary }}>
                Oxirgi 6 ta ijara
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/rentals')}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 14px', borderRadius:8, cursor:'pointer',
              background:'rgba(22,119,255,0.08)',
              border:'1px solid rgba(22,119,255,0.2)',
              color:'#1677ff', fontWeight:600, fontSize:12,
              transition:'all 0.15s',
            }}
          >
            Barchasini ko'rish <RightOutlined style={{ fontSize:10 }}/>
          </button>
        </div>

        {/* Table */}
        {rentalsLoading ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <Spin/><div style={{ marginTop:8, fontSize:12, color:token.colorTextTertiary }}>Yuklanmoqda...</div>
          </div>
        ) : recentRentals.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', fontSize:13, color:token.colorTextTertiary }}>
            📋 Ijaralar topilmadi
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:token.colorFillAlter }}>
                  {['#', 'Mijoz', 'Mashina', 'Davr', 'Summa', 'Holat'].map(h => (
                    <th key={h} style={{
                      padding:'10px 16px', textAlign:'left',
                      fontSize:11, fontWeight:700,
                      color:token.colorTextTertiary,
                      borderBottom:`1px solid ${token.colorBorderSecondary}`,
                      whiteSpace:'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRentals.map((r, idx) => {
                  const scfg = RENTAL_STATUS_CFG[r.status] ?? { color:'#8c8c8c', bg:'rgba(140,140,140,0.1)', label:r.status }
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: idx < recentRentals.length - 1
                          ? `1px solid ${token.colorBorderSecondary}` : 'none',
                        transition:'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = token.colorFillAlter)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding:'12px 16px', fontSize:12, color:token.colorTextTertiary, whiteSpace:'nowrap' }}>
                        <span style={{
                          padding:'1px 7px', borderRadius:6,
                          background:'rgba(22,119,255,0.08)',
                          color:'#1677ff', fontWeight:700, fontSize:11,
                        }}>#{r.id}</span>
                      </td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar
                            size={28}
                            icon={<UserOutlined/>}
                            style={{ background:'linear-gradient(135deg,#1677ff,#6366f1)', flexShrink:0 }}
                          />
                          <span style={{ fontWeight:600, fontSize:13, color:token.colorText }}>
                            {r.customerName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ fontWeight:600, fontSize:13, color:token.colorText }}>
                          {r.carBrand} {r.carModel}
                        </div>
                        <div style={{ fontSize:11, color:token.colorTextTertiary, fontFamily:'monospace' }}>
                          {r.licensePlate}
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ fontSize:12, color:token.colorText }}>
                          {format(new Date(r.startDate),'dd.MM.yyyy')}
                        </div>
                        <div style={{ fontSize:11, color:token.colorTextTertiary }}>
                          → {format(new Date(r.endDate),'dd.MM.yyyy')}
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <span style={{ fontWeight:800, fontSize:14, color:'#52c41a' }}>
                          {fmt(r.totalAmount)}
                        </span>
                        <span style={{ fontSize:11, color:token.colorTextTertiary }}> so'm</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:4,
                          padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background: scfg.bg, color: scfg.color,
                          border:`1px solid ${scfg.color}30`,
                          whiteSpace:'nowrap',
                        }}>
                          {scfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── QUICK LINKS ─────────────────────────────────────────────────── */}
      <div style={{
        background:    token.colorBgContainer,
        borderRadius:  18,
        border:        `1.5px solid ${token.colorBorderSecondary}`,
        overflow:      'hidden',
        boxShadow:     '0 2px 10px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{
          padding:      '16px 22px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display:      'flex', alignItems:'center', gap:10,
          background:   'linear-gradient(135deg,rgba(83,29,171,0.04),rgba(235,47,150,0.04))',
        }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:'linear-gradient(135deg,#531dab,#eb2f96)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <ThunderboltFilled style={{ color:'#fff', fontSize:16 }}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:token.colorText }}>Tezkor havolalar</div>
            <div style={{ fontSize:11, color:token.colorTextTertiary }}>Sahifalarga tez o'tish</div>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          padding: isMobile ? 14 : 20,
          display:'grid',
          gridTemplateColumns:`repeat(${quickCols},1fr)`,
          gap: isMobile ? 10 : 12,
        }}>
          {quickLinks.map(ql => (
            <QuickLink
              key={ql.id}
              {...ql}
              navigate={navigate}
              isHov={hoverId === ql.id}
              onHover={setHoverId}
              token={token}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
