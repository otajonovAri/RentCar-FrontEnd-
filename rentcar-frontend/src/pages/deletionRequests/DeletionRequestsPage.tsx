import { useState, useEffect, useCallback } from 'react'
import {
  Spin, message, Modal, Input, Badge, Avatar, Tooltip, Grid, Empty,
} from 'antd'
import {
  DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, UserOutlined, SearchOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { usersApi } from '@/api/usersApi'
import type { AccountDeletionRequestDto } from '@/types/users'

// ── Status config ─────────────────────────────────────────────────────────────
type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected'

const STATUS_CFG: Record<string, {
  label: string; color: string; bg: string; border: string
  icon: React.ReactNode
}> = {
  Pending:  { label: 'Kutilmoqda', color: '#fa8c16', bg: 'rgba(250,140,22,0.08)',  border: 'rgba(250,140,22,0.3)',  icon: <ClockCircleOutlined /> },
  Approved: { label: 'Tasdiqlandi', color: '#52c41a', bg: 'rgba(82,196,26,0.08)',   border: 'rgba(82,196,26,0.3)',   icon: <CheckCircleOutlined /> },
  Rejected: { label: 'Rad etildi',  color: '#ff4d4f', bg: 'rgba(255,77,79,0.08)',   border: 'rgba(255,77,79,0.3)',   icon: <CloseCircleOutlined /> },
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'All',      label: 'Barchasi'   },
  { key: 'Pending',  label: 'Kutilmoqda' },
  { key: 'Approved', label: 'Tasdiqlandi' },
  { key: 'Rejected', label: 'Rad etildi'  },
]

export default function DeletionRequestsPage() {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const [activeTab,      setActiveTab]      = useState<StatusFilter>('Pending')
  const [data,           setData]           = useState<AccountDeletionRequestDto[]>([])
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')

  // Approve
  const [approveTarget,  setApproveTarget]  = useState<AccountDeletionRequestDto | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  // Reject
  const [rejectTarget,   setRejectTarget]   = useState<AccountDeletionRequestDto | null>(null)
  const [rejectReason,   setRejectReason]   = useState('')
  const [rejectLoading,  setRejectLoading]  = useState(false)

  // Counts for badges
  const [counts, setCounts] = useState<Record<string, number>>({
    All: 0, Pending: 0, Approved: 0, Rejected: 0,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        usersApi.getDeletionRequests(),
        usersApi.getDeletionRequests('Pending'),
        usersApi.getDeletionRequests('Approved'),
        usersApi.getDeletionRequests('Rejected'),
      ])
      setCounts({
        All:      all.data.length,
        Pending:  pending.data.length,
        Approved: approved.data.length,
        Rejected: rejected.data.length,
      })
      setData(all.data)
    } catch {
      message.error('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTab = useCallback(async (tab: StatusFilter) => {
    setLoading(true)
    try {
      const res = await usersApi.getDeletionRequests(
        tab === 'All' ? undefined : tab
      )
      setData(res.data)
    } catch {
      message.error('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleTabChange = (tab: StatusFilter) => {
    setActiveTab(tab)
    setSearch('')
    fetchTab(tab)
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return
    setApproveLoading(true)
    try {
      await usersApi.approveDeletion(approveTarget.userId)
      message.success('Hisob o\'chirish tasdiqlandi')
      setApproveTarget(null)
      await fetchAll()
      // refresh current tab
      await fetchTab(activeTab)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    } finally {
      setApproveLoading(false)
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      message.warning('Sabab kiritish majburiy')
      return
    }
    setRejectLoading(true)
    try {
      await usersApi.rejectDeletion(rejectTarget.userId, rejectReason.trim())
      message.success('So\'rov rad etildi')
      setRejectTarget(null)
      setRejectReason('')
      await fetchAll()
      await fetchTab(activeTab)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    } finally {
      setRejectLoading(false)
    }
  }

  // ── Filter by search ───────────────────────────────────────────────────────
  const filtered = data.filter(r =>
    !search ||
    r.userFullName.toLowerCase().includes(search.toLowerCase()) ||
    r.userEmail.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg,#ff4d4f,#ff7875)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DeleteOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800 }}>
              Hisob o'chirish so'rovlari
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#8c8c8c' }}>
              Foydalanuvchilarning hisob o'chirish so'rovlarini ko'rib chiqing
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const count    = counts[tab.key] ?? 0
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                padding:      '7px 16px',
                borderRadius: 20,
                border:       isActive ? '1.5px solid #1677ff' : '1.5px solid #d9d9d9',
                background:   isActive ? '#e6f4ff' : '#fff',
                color:        isActive ? '#1677ff' : '#595959',
                fontWeight:   isActive ? 700 : 400,
                fontSize:     13,
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  background:  isActive
                    ? (tab.key === 'Pending' ? '#fa8c16' : tab.key === 'Approved' ? '#52c41a' : tab.key === 'Rejected' ? '#ff4d4f' : '#1677ff')
                    : '#d9d9d9',
                  color:       '#fff',
                  borderRadius: 10,
                  fontSize:    11,
                  fontWeight:  700,
                  padding:     '1px 7px',
                  lineHeight:  1.6,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Ism yoki email qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* ── Cards ── */}
      <Spin spinning={loading}>
        {filtered.length === 0 && !loading ? (
          <Empty
            description={search ? 'Qidiruv natijasi topilmadi' : 'So\'rovlar mavjud emas'}
            style={{ marginTop: 60 }}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 14,
          }}>
            {filtered.map(req => {
              const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.Pending
              const isPending = req.status === 'Pending'
              return (
                <div
                  key={req.id}
                  style={{
                    background:   '#fff',
                    border:       `1px solid ${isPending ? 'rgba(250,140,22,0.3)' : '#f0f0f0'}`,
                    borderRadius: 12,
                    padding:      '16px 18px',
                    boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
                    display:      'flex',
                    flexDirection:'column',
                    gap:          12,
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar
                      size={44}
                      style={{ background: 'linear-gradient(135deg,#1677ff,#6366f1)', fontWeight: 700, flexShrink: 0 }}
                    >
                      {getInitials(req.userFullName)}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.userFullName}
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.userEmail}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          5,
                      padding:      '4px 10px',
                      borderRadius: 20,
                      background:   cfg.bg,
                      border:       `1px solid ${cfg.border}`,
                      color:        cfg.color,
                      fontSize:     12,
                      fontWeight:   600,
                      whiteSpace:   'nowrap',
                      flexShrink:   0,
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div style={{
                    display:       'flex',
                    flexWrap:      'wrap',
                    gap:           '6px 20px',
                    padding:       '10px 12px',
                    borderRadius:  8,
                    background:    '#fafafa',
                    border:        '1px solid #f0f0f0',
                    fontSize:      12,
                    color:         '#595959',
                  }}>
                    <span>
                      🕐 So'rov: <strong>{format(new Date(req.requestedAt), 'dd.MM.yyyy HH:mm')}</strong>
                    </span>
                    {req.processedAt && (
                      <span>
                        ✅ Ko'rib chiqildi: <strong>{format(new Date(req.processedAt), 'dd.MM.yyyy HH:mm')}</strong>
                      </span>
                    )}
                    {req.processedByName && (
                      <span>
                        <UserOutlined style={{ marginRight: 3 }} />
                        {req.processedByName}
                      </span>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {req.rejectionReason && (
                    <div style={{
                      padding:      '8px 12px',
                      borderRadius: 8,
                      background:   'rgba(255,77,79,0.04)',
                      border:       '1px solid rgba(255,77,79,0.2)',
                      fontSize:     12,
                      color:        '#ff4d4f',
                    }}>
                      <CloseCircleOutlined style={{ marginRight: 6 }} />
                      <strong>Sabab:</strong> {req.rejectionReason}
                    </div>
                  )}

                  {/* Actions — only for Pending */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setRejectTarget(req)}
                        style={{
                          flex: 1, padding: '9px', borderRadius: 8,
                          border: '1px solid rgba(255,77,79,0.3)',
                          background: 'rgba(255,77,79,0.05)',
                          color: '#ff4d4f', fontWeight: 600, fontSize: 13,
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.12)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.05)' }}
                      >
                        <CloseCircleOutlined style={{ marginRight: 5 }} />
                        Rad etish
                      </button>
                      <button
                        onClick={() => setApproveTarget(req)}
                        style={{
                          flex: 1, padding: '9px', borderRadius: 8,
                          border: '1px solid rgba(82,196,26,0.35)',
                          background: 'rgba(82,196,26,0.07)',
                          color: '#52c41a', fontWeight: 600, fontSize: 13,
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(82,196,26,0.15)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(82,196,26,0.07)' }}
                      >
                        <CheckCircleOutlined style={{ marginRight: 5 }} />
                        Tasdiqlash
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Spin>

      {/* ── Approve Modal ── */}
      <Modal
        open={!!approveTarget}
        onCancel={() => setApproveTarget(null)}
        footer={null}
        title={
          <span style={{ color: '#52c41a' }}>
            <CheckCircleOutlined style={{ marginRight: 8 }} />
            Hisobni o'chirishni tasdiqlash
          </span>
        }
        centered
        width={420}
      >
        {approveTarget && (
          <div>
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(255,77,79,0.05)', border: '1px solid rgba(255,77,79,0.2)',
              marginBottom: 18,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{approveTarget.userFullName}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{approveTarget.userEmail}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#595959' }}>
              Bu foydalanuvchining hisobi <strong>o'chiriladi</strong> (soft delete).
              Foydalanuvchi tizimga kira olmaydi. Bu amalni qaytarish uchun adminlarga murojaat qilish kerak.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setApproveTarget(null)}
                style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
              >
                Bekor
              </button>
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#52c41a', border: 'none',
                  color: '#fff', fontWeight: 700, cursor: 'pointer',
                  opacity: approveLoading ? 0.7 : 1,
                }}
              >
                {approveLoading ? 'Tasdiqlanmoqda...' : 'Ha, tasdiqlash'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        open={!!rejectTarget}
        onCancel={() => { setRejectTarget(null); setRejectReason('') }}
        footer={null}
        title={
          <span style={{ color: '#ff4d4f' }}>
            <CloseCircleOutlined style={{ marginRight: 8 }} />
            So'rovni rad etish
          </span>
        }
        centered
        width={420}
      >
        {rejectTarget && (
          <div>
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: '#fafafa', border: '1px solid #f0f0f0',
              marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{rejectTarget.userFullName}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{rejectTarget.userEmail}</div>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Rad etish sababi <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Masalan: Faol ijaralar mavjud, yoki boshqa sabab..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid #d9d9d9', cursor: 'pointer', fontWeight: 600 }}
              >
                Bekor
              </button>
              <button
                onClick={handleReject}
                disabled={rejectLoading || !rejectReason.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#ff4d4f', border: 'none',
                  color: '#fff', fontWeight: 700, cursor: 'pointer',
                  opacity: (rejectLoading || !rejectReason.trim()) ? 0.5 : 1,
                }}
              >
                {rejectLoading ? 'Yuborilmoqda...' : 'Rad etish'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
