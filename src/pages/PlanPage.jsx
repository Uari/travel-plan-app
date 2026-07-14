import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import './PlanPage.css'

export default function PlanPage({ user, tripId, membersMap, isAdmin }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [startDate, setStartDate] = useState(null)

  const [form, setForm] = useState({
    day_label: 'Day 1',
    time_label: '',
    title: '',
    location: '',
    accommodation_name: '',
    accommodation_img_url: '',
    notes: '',
  })

  useEffect(() => {
    if (tripId) {
      loadTripInfo()
      loadPlans()
    }
  }, [tripId])

  const loadTripInfo = async () => {
    const { data } = await supabase.from('trips').select('start_date').eq('id', tripId).single()
    if (data) {
      setStartDate(data.start_date)
    }
  }

  const loadPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_label')
      .order('time_label')
      
    if (!error && data) {
      setPlans(data)
    } else {
      console.error("Plan fetch error:", error)
      setPlans([])
    }
    setLoading(false)
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ day_label: 'Day 1', time_label: '', title: '', location: '', accommodation_name: '', accommodation_img_url: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditItem(plan)
    setForm({ ...plan })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const payload = { 
      ...form, 
      created_by: user.name, // Legacy
      user_id: user.id,      // New ID
      trip_id: tripId 
    }

    if (editItem) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editItem.id)
      if (error) {
        console.error(error)
        setPlans((prev) => prev.map((p) => p.id === editItem.id ? { ...p, ...payload } : p))
      } else {
        await loadPlans()
      }
    } else {
      const { error } = await supabase.from('plans').insert(payload)
      if (error) {
        console.error(error)
        setPlans((prev) => [...prev, { id: Date.now().toString(), ...payload }])
      } else {
        await loadPlans()
      }
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) {
      console.error(error)
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } else {
      await loadPlans()
    }
  }

  // Group by day
  const grouped = plans.reduce((acc, plan) => {
    const key = plan.day_label || 'Day 1'
    if (!acc[key]) acc[key] = []
    acc[key].push(plan)
    return acc
  }, {})

  const days = Object.keys(grouped).sort()

  const calculateDateString = (dayLabel) => {
    if (!startDate) return ''
    const match = dayLabel.match(/Day\s*(\d+)/i)
    if (match) {
      const dayNum = parseInt(match[1], 10)
      const d = new Date(startDate)
      d.setDate(d.getDate() + (dayNum - 1))
      return ` (${d.getMonth() + 1}월 ${d.getDate()}일)`
    }
    return ''
  }

  return (
    <div className="plan-page">
      <div className="plan-header">
        <h2 className="page-title" style={{ marginBottom: 0 }}>여행 일정 🗓️</h2>
        <button id="plan-add-btn" className="btn btn-primary btn-sm" onClick={openAdd}>
          + 추가
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
          <p>여행 데이터를 불러오는 중...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗓️</div>
          <p>아직 일정이 없어요.</p>
          <p>+ 추가 버튼으로 첫 일정을 만들어 보세요!</p>
        </div>
      ) : (
        <div className="plan-list">
          {days.map((day) => (
            <div key={day} className="day-group">
              <div className="day-label-row">
                <span className="day-label-badge">{day}{calculateDateString(day)}</span>
                <div className="day-label-line" />
              </div>
              {grouped[day].map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  expanded={expandedId === plan.id}
                  membersMap={membersMap}
                  isAdmin={isAdmin}
                  onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                  onEdit={() => openEdit(plan)}
                  onDelete={() => handleDelete(plan.id)}
                  currentUser={user}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <div className="modal-title">{editItem ? '✏️ 일정 수정' : '➕ 새 일정 추가'}</div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">날짜</label>
                    <input
                      className="input"
                      value={form.day_label}
                      onChange={(e) => setForm({ ...form, day_label: e.target.value })}
                      placeholder="Day 1"
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">시간</label>
                    <input
                      className="input"
                      type="time"
                      value={form.time_label}
                      onChange={(e) => setForm({ ...form, time_label: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">일정 제목 *</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 숙소 체크인, 점심 식사"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">📍 위치 / 장소</label>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="예: 강릉 안목해변"
                  />
                </div>

                <div className="divider" />
                <p className="section-label">숙소 정보 (선택)</p>

                <div className="input-group">
                  <label className="input-label">🏨 숙소 이름</label>
                  <input
                    className="input"
                    value={form.accommodation_name}
                    onChange={(e) => setForm({ ...form, accommodation_name: e.target.value })}
                    placeholder="예: 오션뷰 펜션"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">🖼️ 숙소 이미지 링크 (URL)</label>
                  <input
                    className="input"
                    type="url"
                    value={form.accommodation_img_url}
                    onChange={(e) => setForm({ ...form, accommodation_img_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                {form.accommodation_img_url && (
                  <div className="img-preview-wrap">
                    <img
                      src={form.accommodation_img_url}
                      alt="숙소 미리보기"
                      className="img-preview"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}

                <div className="divider" />

                <div className="input-group">
                  <label className="input-label">📝 메모</label>
                  <textarea
                    className="input"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="기타 메모, 주의사항 등..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowModal(false)}
                  >
                    취소
                  </button>
                  <button
                    id="plan-submit-btn"
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  >
                    {editItem ? '수정 완료' : '일정 추가'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlanCard({ plan, expanded, onToggle, onEdit, onDelete, currentUser, membersMap, isAdmin }) {
  const memberInfo = membersMap ? membersMap[plan.user_id] : null
  const displayAuthor = memberInfo 
    ? `${memberInfo.name}${memberInfo.is_deleted ? '(탈퇴)' : ''}`
    : (plan.created_by || '알 수 없음')
    
  const canEdit = isAdmin || plan.user_id === currentUser.id || plan.created_by === currentUser.name

  return (
    <motion.div
      className="plan-card"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="plan-card-header" onClick={onToggle}>
        <div className="plan-card-left">
          {plan.time_label && (
            <span className="plan-time">{plan.time_label}</span>
          )}
          <div>
            <div className="plan-title">{plan.title}</div>
            {plan.location && (
              <div className="plan-location">
                <span className="plan-location-dot">📍</span>
                {plan.location}
              </div>
            )}
          </div>
        </div>
        <div className="plan-card-right">
          <span className="plan-author" style={{ opacity: memberInfo?.is_deleted ? 0.6 : 1, color: memberInfo?.is_deleted ? '#ef4444' : 'inherit' }}>
            {displayAuthor}
          </span>
          <span className="plan-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="plan-card-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="plan-card-body-inner">
              {plan.accommodation_name && (
                <div className="plan-accom">
                  <span className="plan-accom-label">🏨 숙소</span>
                  <span className="plan-accom-name">{plan.accommodation_name}</span>
                </div>
              )}

              {plan.accommodation_img_url && (
                <img
                  src={plan.accommodation_img_url}
                  alt={plan.accommodation_name || '숙소'}
                  className="plan-accom-img"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}

              {plan.notes && (
                <div className="plan-notes">
                  <span>📝</span>
                  <p>{plan.notes}</p>
                </div>
              )}

              {canEdit && (
                <div className="plan-actions">
                  <button id={`plan-edit-${plan.id}`} className="btn btn-secondary btn-sm" onClick={onEdit}>✏️ 수정</button>
                  <button id={`plan-del-${plan.id}`} className="btn btn-danger btn-sm" onClick={onDelete}>🗑️ 삭제</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
