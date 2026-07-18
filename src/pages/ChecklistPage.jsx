import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useTripContext } from '../context/TripContext.jsx'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js'
import { getDisplayName } from '../lib/tripMembers.js'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import ScrollToTopButton from '../components/ScrollToTopButton.jsx'
import { Check, PartyPopper, Pencil, Plus, Plane, FileText, X } from 'lucide-react'
import './ChecklistPage.css'

const QUICK_ITEMS = ['여벌 옷', '충전기', '상비약', '세면도구', '카메라', '우산', '현금 환전', '지도 저장']

export default function ChecklistPage() {
  const { user, tripId, membersMap, isAdmin, isCompleted } = useTripContext()
  const { data: items, loading, refetch: loadItems } = useSupabaseQuery(
    () => supabase.from('checklist').select('*').eq('trip_id', tripId).order('created_at'),
    [tripId]
  )

  // Trip members for assignment (Array of IDs)
  const [members, setMembers] = useState([])

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ item: '', assigned_to: [user.id] })
  const [editId, setEditId] = useState(null)

  // 담당자 필터: 전체 / 내 담당만
  const [mineOnly, setMineOnly] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [tripId])

  const loadMembers = async () => {
    const { data, error } = await supabase.from('trip_members').select('user_id').eq('trip_id', tripId)
    if (error) {
      console.error(error)
      setMembers([user.id])
      return
    }
    if (data) {
      setMembers(data.map(d => d.user_id))
    } else {
      setMembers([user.id])
    }
  }

  const openAddModal = (text = '') => {
    setEditId(null)
    setForm({ item: text, assigned_to: [user.id] })
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditId(item.id)
    setForm({ item: item.item, assigned_to: item.assigned_to || [] })
    setShowModal(true)
  }

  const handleToggleAssignee = (id) => {
    setForm(prev => {
      if (prev.assigned_to.includes(id)) {
        return { ...prev, assigned_to: prev.assigned_to.filter(n => n !== id) }
      } else {
        return { ...prev, assigned_to: [...prev.assigned_to, id] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item.trim() || form.assigned_to.length === 0) return

    if (editId) {
      // Edit existing
      const existingItem = items.find(i => i.id === editId)
      // Remove completed_by for people who are no longer assigned
      const newCompleted = (existingItem.completed_by || []).filter(id => form.assigned_to.includes(id))
      const fullyDone = form.assigned_to.every(a => newCompleted.includes(a))

      const payload = {
        item: form.item.trim(),
        assigned_to: form.assigned_to,
        completed_by: newCompleted,
        is_done: fullyDone
      }
      
      const { error } = await supabase.from('checklist').update(payload).eq('id', editId)
      if (!error) await loadItems()
    } else {
      // Add new
      const payload = { 
        item: form.item.trim(), 
        assigned_to: form.assigned_to,
        completed_by: [],
        is_done: false,
        created_by: user.name, // Legacy
        trip_id: tripId
      }
      const { error } = await supabase.from('checklist').insert(payload)
      if (!error) await loadItems()
    }
    
    setShowModal(false)
  }

  const toggleDone = async (id, currentAssigned, currentCompleted) => {
    // 완료된 여행은 읽기 전용
    if (isCompleted) return

    // 1. 보안 체크: 본인이 할당되어 있지 않고 방장도 아니면 거부
    if (!currentAssigned.includes(user.id) && !currentAssigned.includes(user.name) && !isAdmin) {
      alert("담당자(혹은 방장)만 체크할 수 있습니다.")
      return
    }

    // 2. 본인의 체크 상태 토글
    // Legacy support: check both ID and Name
    let newCompleted = [...currentCompleted]
    const hasCheckedID = newCompleted.includes(user.id)
    const hasCheckedName = newCompleted.includes(user.name)

    if (hasCheckedID || hasCheckedName) {
      newCompleted = newCompleted.filter(n => n !== user.id && n !== user.name)
    } else {
      newCompleted.push(user.id)
    }

    // 3. 교차 검증: 할당된 사람 전원이 완료했는지 확인
    const fullyDone = currentAssigned.every(a => newCompleted.includes(a))

    const { error } = await supabase.from('checklist').update({ 
      completed_by: newCompleted,
      is_done: fullyDone
    }).eq('id', id)

    if (error) {
      console.error(error)
    } else {
      await loadItems()
    }
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('checklist').delete().eq('id', id)
    if (!error) await loadItems()
  }

  // 진행률은 필터와 무관하게 항상 전체 기준으로 표시
  const doneCount = items.filter((i) => i.is_done).length
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0

  // 내 담당 여부 (레거시 name / 신규 id 모두 인정)
  const isMine = (i) => {
    const a = i.assigned_to || []
    return a.includes(user.id) || a.includes(user.name)
  }
  const visibleItems = mineOnly ? items.filter(isMine) : items
  const pending = visibleItems.filter((i) => !i.is_done)
  const done = visibleItems.filter((i) => i.is_done)

  return (
    <div className="checklist-page">
      <ScrollToTopButton />
      <h2 className="page-title">준비물 체크리스트 <Check size={24} /></h2>

      {/* Progress */}
      <div className="progress-card card">
        <div className="progress-info">
          <span className="progress-text">
            {doneCount} / {items.length} 완료
          </span>
          <span className="progress-pct">{Math.round(progress)}%</span>
        </div>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {progress === 100 && items.length > 0 && (
          <motion.div
            className="progress-complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <PartyPopper size={20} /> 모든 준비 완료!
          </motion.div>
        )}
      </div>

      {/* 담당자 필터 */}
      {items.length > 0 && (
        <div className="checklist-filter">
          <button
            className={`cl-filter-btn${!mineOnly ? ' active' : ''}`}
            onClick={() => setMineOnly(false)}
          >
            전체
          </button>
          <button
            className={`cl-filter-btn${mineOnly ? ' active' : ''}`}
            onClick={() => setMineOnly(true)}
          >
            내 담당만
          </button>
        </div>
      )}

      {/* Quick add items */}
      {!isCompleted && (
        <>
          <div className="quick-items-label section-label">빠른 추가</div>
          <div className="quick-items">
            {QUICK_ITEMS.map((q) => {
              const exists = items.some((i) => i.item.includes(q))
              return (
                <button
                  key={q}
                  id={`quick-add-${q}`}
                  className={`quick-item-btn${exists ? ' exists' : ''}`}
                  onClick={() => !exists && openAddModal(q)}
                  disabled={exists}
                >
                  {q}
                </button>
              )
            })}
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal()}>+ 직접 추가</button>
          </div>
        </>
      )}

      {/* Pending items */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}><Plane size={48} strokeWidth={1.5} /></div>
          <p>여행 데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="checklist-container">
          {pending.length === 0 && done.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><FileText size={48} strokeWidth={1.5} /></div>
              {mineOnly ? (
                <p>내가 담당인 준비물이 없어요.</p>
              ) : (
                <>
                  <p>아직 준비물이 없어요!</p>
                  <p>위에서 빠르게 추가해 보세요.</p>
                </>
              )}
            </div>
          )}

          {pending.length > 0 && (
            <div className="checklist-section">
              <div className="section-label">남은 항목 ({pending.length})</div>
              <AnimatePresence>
                {pending.map((item) => (
                  <CheckItem
                    key={item.id}
                    item={item}
                    currentUser={user}
                    membersMap={membersMap}
                    isAdmin={isAdmin}
                    onToggle={() => toggleDone(item.id, item.assigned_to || [], item.completed_by || [])}
                    onEdit={() => openEditModal(item)}
                    onDelete={() => deleteItem(item.id)}
                    readOnly={isCompleted}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {done.length > 0 && (
            <div className="checklist-section">
              <div className="section-label">완료된 항목 ({done.length})</div>
              <AnimatePresence>
                {done.map((item) => (
                  <CheckItem
                    key={item.id}
                    item={item}
                    currentUser={user}
                    membersMap={membersMap}
                    isAdmin={isAdmin}
                    onToggle={() => toggleDone(item.id, item.assigned_to || [], item.completed_by || [])}
                    onEdit={() => openEditModal(item)}
                    onDelete={() => deleteItem(item.id)}
                    readOnly={isCompleted}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <BottomSheetModal open={showModal} onClose={() => setShowModal(false)}>
              <div className="modal-title">{editId ? <><Pencil size={20} /> 준비물 수정</> : <><Plus size={20} /> 준비물 추가</>}</div>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">준비물 이름 *</label>
                  <input
                    className="input"
                    value={form.item}
                    onChange={(e) => setForm({ ...form, item: e.target.value })}
                    placeholder="예: 여권, 보조배터리"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">담당자 선택 (다중 선택 가능) *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {members.map(memberId => {
                      const isAssigned = form.assigned_to.includes(memberId)
                      const memberInfo = membersMap[memberId]
                      const displayName = getDisplayName(membersMap, memberId, { fallback: memberId })

                      return (
                        <button
                          key={memberId}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: isAssigned ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            color: isAssigned ? '#fbfaf4' : (memberInfo?.is_deleted ? 'var(--accent-rose)' : 'var(--text-primary)'),
                            border: isAssigned ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            borderRadius: '20px'
                          }}
                          onClick={() => handleToggleAssignee(memberId)}
                        >
                          {isAssigned ? <><Check size={16} /> </> : ''}{displayName}
                        </button>
                      )
                    })}
                  </div>
                  {form.assigned_to.length === 0 && (
                    <p className="error-text" style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.5rem' }}>최소 1명의 담당자를 선택해주세요.</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={form.assigned_to.length === 0}>
                    {editId ? '수정 완료' : '추가하기'}
                  </button>
                </div>
              </form>
      </BottomSheetModal>
    </div>
  )
}

function CheckItem({ item, currentUser, membersMap, isAdmin, onToggle, onEdit, onDelete, readOnly }) {
  const assigned = item.assigned_to || []
  const completed = item.completed_by || []
  
  // Am I assigned to this item? (check legacy name or new id)
  const amIAssigned = assigned.includes(currentUser.id) || assigned.includes(currentUser.name)
  // Have I checked it?
  const didICheck = completed.includes(currentUser.id) || completed.includes(currentUser.name)

  const canEdit = !readOnly && (isAdmin || amIAssigned || item.created_by === currentUser.name || item.created_by === currentUser.id)
  const canToggle = !readOnly && (amIAssigned || isAdmin)

  return (
    <motion.div
      className={`check-item${item.is_done ? ' done' : ''}`}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: canToggle ? 'pointer' : 'default' }} onClick={canToggle ? onToggle : undefined}>
        <button
          className={`check-box${didICheck || item.is_done ? ' checked' : ''}`}
          style={{ opacity: canToggle ? 1 : (didICheck || item.is_done ? 0.7 : 0.4) }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (canToggle) onToggle(); }}
        >
          {(didICheck || item.is_done) && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Check size={16} />
            </motion.span>
          )}
        </button>
        
        <div className="check-text">
          <div className="check-item-name" style={{ textDecoration: item.is_done ? 'line-through' : 'none' }}>{item.item}</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            {assigned.map(a => {
              const hasChecked = completed.includes(a)
              const memberInfo = membersMap ? membersMap[a] : null
              const displayName = getDisplayName(membersMap, a, { fallback: a, deletedSuffix: '(탈퇴)' })

              return (
                <span key={a} style={{ 
                  fontSize: '0.75rem', 
                  background: hasChecked ? 'rgba(90, 125, 95, 0.18)' : 'var(--bg-elevated)',
                  color: hasChecked ? 'var(--accent-emerald)' : (memberInfo?.is_deleted ? 'var(--accent-rose)' : 'var(--text-muted)'),
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: hasChecked ? '1px solid rgba(90, 125, 95, 0.45)' : '1px solid transparent',
                  textDecoration: memberInfo?.is_deleted ? 'line-through' : 'none'
                }}>
                  {hasChecked ? <><Check size={16} /> </> : ''}{displayName}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {canEdit && <button className="check-del-btn" style={{ fontSize: '1rem' }} onClick={onEdit}><Pencil size={16} /></button>}
        {canEdit && <button className="check-del-btn" style={{ fontSize: '1.2rem' }} onClick={onDelete}><X size={16} /></button>}
      </div>
    </motion.div>
  )
}
