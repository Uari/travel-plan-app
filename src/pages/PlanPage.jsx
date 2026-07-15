import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useTripContext } from '../context/TripContext.jsx'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js'
import { getDisplayName, canEditItem } from '../lib/tripMembers.js'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import './PlanPage.css'

export default function PlanPage() {
  const { user, tripId, membersMap, isAdmin, tripData, isCompleted } = useTripContext()
  const { data: plans, loading, refetch: loadPlans } = useSupabaseQuery(
    () => supabase.from('plans').select('*').eq('trip_id', tripId).order('day_label').order('time_label'),
    [tripId]
  )
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [form, setForm] = useState({
    day_label: 'Day 1',
    time_label: '',
    title: '',
    location: '',
    accommodation_name: '',
    accommodation_img_url: '',
    notes: '',
  })

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
        alert('일정 수정에 실패했습니다. 다시 시도해주세요.')
        return
      }
      await loadPlans()
    } else {
      const { error } = await supabase.from('plans').insert(payload)
      if (error) {
        console.error(error)
        alert('일정 추가에 실패했습니다. 다시 시도해주세요.')
        return
      }
      await loadPlans()
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('일정 삭제에 실패했습니다. 다시 시도해주세요.')
      return
    }
    await loadPlans()
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
    if (!tripData?.start_date) return ''
    const match = dayLabel.match(/Day\s*(\d+)/i)
    if (match) {
      const dayNum = parseInt(match[1], 10)
      const d = new Date(tripData.start_date)
      d.setDate(d.getDate() + (dayNum - 1))
      return ` (${d.getMonth() + 1}월 ${d.getDate()}일)`
    }
    return ''
  }

  return (
    <div className="plan-page">
      <div className="plan-header">
        <h2 className="page-title" style={{ marginBottom: 0 }}>여행 일정 🗓️</h2>
        {!isCompleted && (
          <button id="plan-add-btn" className="btn btn-primary btn-sm" onClick={openAdd}>
            + 추가
          </button>
        )}
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
                  readOnly={isCompleted}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <BottomSheetModal open={showModal} onClose={() => setShowModal(false)}>
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
      </BottomSheetModal>
    </div>
  )
}

function PlanCard({ plan, expanded, onToggle, onEdit, onDelete, currentUser, membersMap, isAdmin, readOnly }) {
  const memberInfo = membersMap ? membersMap[plan.user_id] : null
  const displayAuthor = getDisplayName(membersMap, plan.user_id, {
    fallback: plan.created_by || '알 수 없음',
    deletedSuffix: '(탈퇴)',
  })

  const canEdit = !readOnly && canEditItem(isAdmin, plan, currentUser)

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
