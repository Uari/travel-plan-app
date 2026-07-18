import React, { useState } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useTripContext } from '../context/TripContext.jsx'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js'
import { getDisplayName, canEditItem } from '../lib/tripMembers.js'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import ScrollToTopButton from '../components/ScrollToTopButton.jsx'
import PlanDayMap from '../components/PlanDayMap.jsx'
import LocationPicker from '../components/LocationPicker.jsx'
import { geocode } from '../lib/geocode.js'
import { reverseGeocode } from '../lib/placeSearch.js'
import './PlanPage.css'

export default function PlanPage() {
  const { user, tripId, membersMap, isAdmin, tripData, isCompleted } = useTripContext()
  const { data: plans, loading, refetch: loadPlans, setData: setPlans } = useSupabaseQuery(
    () => supabase.from('plans').select('*').eq('trip_id', tripId).order('day_label').order('time_label'),
    [tripId]
  )
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [openMapDays, setOpenMapDays] = useState({}) // { [dayLabel]: true }
  const [showPicker, setShowPicker] = useState(false) // 지도 클릭 위치 지정 열림

  // 지도 위치 지정 → 좌표 확정.
  //  - 검색에서 고른 경우(label 있음): 위치 텍스트를 그 이름으로 채움
  //  - 지도 직접 클릭(label 없음): 위치 텍스트가 비어있으면 역지오코딩으로 이름 채움
  const handleMapPick = async ({ lat, lng, label }) => {
    setForm((prev) => ({ ...prev, lat, lng, ...(label ? { location: label } : {}) }))
    if (!label) {
      const rev = await reverseGeocode(lat, lng)
      if (rev) {
        setForm((prev) => (prev.location && prev.location.trim() ? prev : { ...prev, location: rev }))
      }
    }
  }

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
    setShowPicker(false)
    setForm({ day_label: 'Day 1', time_label: '', title: '', location: '', accommodation_name: '', accommodation_img_url: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditItem(plan)
    setShowPicker(false)
    setForm({ ...plan })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    // 좌표 결정(지도 핀용):
    // 1) 검색으로 장소를 고른 경우 그 좌표를 그대로 사용
    // 2) 장소를 직접 타이핑만 한 경우 저장 시 지오코딩으로 폴백
    let coords = null
    if (form.lat != null && form.lng != null) {
      coords = { lat: form.lat, lng: form.lng }
    } else if (form.location && form.location.trim()) {
      coords = await geocode(form.location.trim())
    }

    const payload = {
      ...form,
      created_by: user.name, // Legacy
      user_id: user.id,      // New ID
      trip_id: tripId
    }
    if (!form.location || !form.location.trim()) {
      payload.lat = null
      payload.lng = null
    } else if (coords) {
      payload.lat = coords.lat
      payload.lng = coords.lng
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
      // 새 일정은 해당 Day의 맨 뒤 순서로 붙인다
      const dayKey = form.day_label || 'Day 1'
      const nextOrder = plans
        .filter((p) => (p.day_label || 'Day 1') === dayKey)
        .reduce((m, p) => Math.max(m, p.sort_order || 0), 0) + 1
      const { error } = await supabase.from('plans').insert({ ...payload, sort_order: nextOrder })
      if (error) {
        console.error(error)
        alert('일정 추가에 실패했습니다. 다시 시도해주세요.')
        return
      }
      await loadPlans()
    }
    setShowModal(false)
  }

  // 드래그로 같은 Day 안 순서 변경 → 낙관적 반영 + DB 저장
  const handleReorder = (dayKey, newOrder) => {
    const updated = newOrder.map((p, i) => ({ ...p, sort_order: i + 1 }))
    const byId = new Map(updated.map((p) => [p.id, p]))
    // 1) 즉시 로컬 반영(부드러운 재배치)
    setPlans((prev) => prev.map((p) => byId.get(p.id) || p))
    // 2) DB 저장(백그라운드), 실패 시 서버 기준 복구
    Promise.all(
      updated.map((p) => supabase.from('plans').update({ sort_order: p.sort_order }).eq('id', p.id))
    ).then((results) => {
      if (results.some((r) => r.error)) {
        console.error('일정 순서 저장 실패', results.find((r) => r.error)?.error)
        loadPlans()
      }
    })
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

  // 지도 열기/닫기. 열 때, 장소는 있는데 좌표가 없는 일정들을 지오코딩해 채운다.
  const toggleMap = (day) => {
    const willOpen = !openMapDays[day]
    setOpenMapDays((prev) => ({ ...prev, [day]: willOpen }))
    if (willOpen) ensureDayCoords(day)
  }

  const ensureDayCoords = async (day) => {
    const targets = (grouped[day] || []).filter(
      (p) => p.location && p.location.trim() && (p.lat == null || p.lng == null)
    )
    // Nominatim 정책상 순차 호출(초당 1회 수준)
    for (const p of targets) {
      const c = await geocode(p.location.trim())
      if (c) {
        setPlans((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, lat: c.lat, lng: c.lng } : x))
        )
        supabase
          .from('plans')
          .update({ lat: c.lat, lng: c.lng })
          .eq('id', p.id)
          .then(({ error }) => { if (error) console.error(error) })
      }
    }
  }

  // Group by day
  const grouped = plans.reduce((acc, plan) => {
    const key = plan.day_label || 'Day 1'
    if (!acc[key]) acc[key] = []
    acc[key].push(plan)
    return acc
  }, {})

  // 각 Day 안에서 sort_order(수동 정렬) 우선, 없으면 시간→생성순으로 폴백
  Object.keys(grouped).forEach((k) => {
    grouped[k].sort((a, b) => {
      const sa = a.sort_order ?? Infinity
      const sb = b.sort_order ?? Infinity
      if (sa !== sb) return sa - sb
      return (
        (a.time_label || '').localeCompare(b.time_label || '') ||
        (a.created_at || '').localeCompare(b.created_at || '')
      )
    })
  })

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
      <ScrollToTopButton />
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
                <button
                  type="button"
                  className={`day-map-toggle${openMapDays[day] ? ' active' : ''}`}
                  onClick={() => toggleMap(day)}
                >
                  🗺️ {openMapDays[day] ? '지도 닫기' : '지도'}
                </button>
              </div>

              {openMapDays[day] && <PlanDayMap plans={grouped[day]} />}
              {isCompleted ? (
                // 완료된 여행은 읽기 전용 → 드래그 비활성
                grouped[day].map((plan) => (
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
                ))
              ) : (
                <Reorder.Group
                  axis="y"
                  as="div"
                  values={grouped[day]}
                  onReorder={(newOrder) => handleReorder(day, newOrder)}
                >
                  {grouped[day].map((plan) => (
                    <DraggablePlan
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
                </Reorder.Group>
              )}
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
                    onChange={(e) => setForm({ ...form, location: e.target.value, lat: null, lng: null })}
                    placeholder="장소명 (지도에서 지정하면 자동 입력)"
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowPicker((v) => !v)}
                    >
                      🗺️ {showPicker ? '지도 닫기' : '지도에서 위치 지정'}
                    </button>
                    {form.lat != null && form.lng != null && (
                      <span className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        ✓ 위치 지정됨
                      </span>
                    )}
                  </div>

                  {showPicker && (
                    <LocationPicker lat={form.lat} lng={form.lng} onPick={handleMapPick} />
                  )}
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

// 드래그 가능한 일정 항목 (핸들로만 드래그 → 탭 펼치기와 충돌 방지)
function DraggablePlan(props) {
  const dragControls = useDragControls()
  return (
    <Reorder.Item
      value={props.plan}
      as="div"
      dragListener={false}
      dragControls={dragControls}
      style={{ position: 'relative' }}
    >
      <PlanCard {...props} dragControls={dragControls} />
    </Reorder.Item>
  )
}

function PlanCard({ plan, expanded, onToggle, onEdit, onDelete, currentUser, membersMap, isAdmin, readOnly, dragControls }) {
  const memberInfo = membersMap ? membersMap[plan.user_id] : null
  const displayAuthor = getDisplayName(membersMap, plan.user_id, {
    fallback: plan.created_by || '알 수 없음',
    deletedSuffix: '(탈퇴)',
  })

  const canEdit = !readOnly && canEditItem(isAdmin, plan, currentUser)

  return (
    <motion.div
      className="plan-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="plan-card-header" onClick={onToggle}>
        <div className="plan-card-left">
          {dragControls && (
            <span
              className="plan-drag-handle"
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e) }}
              onClick={(e) => e.stopPropagation()}
              title="드래그해서 순서 변경"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="9" cy="5" r="1.7" /><circle cx="15" cy="5" r="1.7" />
                <circle cx="9" cy="12" r="1.7" /><circle cx="15" cy="12" r="1.7" />
                <circle cx="9" cy="19" r="1.7" /><circle cx="15" cy="19" r="1.7" />
              </svg>
            </span>
          )}
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
          <span className="plan-author" style={{ opacity: memberInfo?.is_deleted ? 0.6 : 1, color: memberInfo?.is_deleted ? 'var(--accent-rose)' : 'inherit' }}>
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
