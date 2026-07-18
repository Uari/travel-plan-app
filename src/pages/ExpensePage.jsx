import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useTripContext } from '../context/TripContext.jsx'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js'
import { getDisplayName, canEditItem } from '../lib/tripMembers.js'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import ScrollToTopButton from '../components/ScrollToTopButton.jsx'
import './ExpensePage.css'

const CATEGORIES = [
  { id: 'accommodation', label: '🏨 숙소', color: 'var(--accent-primary)' },
  { id: 'food', label: '🍽️ 식비', color: 'var(--accent-emerald)' },
  { id: 'transport', label: '🚗 교통', color: 'var(--accent-amber)' },
  { id: 'activity', label: '🎡 액티비티', color: 'var(--accent-secondary)' },
  { id: 'extra', label: '💸 추가금', color: 'var(--accent-rose)' },
  { id: 'etc', label: '📦 기타', color: 'var(--text-muted)' },
]

export default function ExpensePage() {
  const { user, tripId, membersMap, isAdmin, tripData, setTripData, isCompleted } = useTripContext()
  const { data: expenses, loading, refetch: loadExpenses } = useSupabaseQuery(
    () => supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at'),
    [tripId]
  )
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ label: '', amount: '', category: 'etc' })
  const [memberCount, setMemberCount] = useState(tripData?.member_count || 1)

  // Debounce ref
  const updateTimeoutRef = useRef(null)

  useEffect(() => {
    setMemberCount(tripData?.member_count || 1)
  }, [tripId])

  const handleMemberCountChange = (newCount) => {
    if (newCount < 1) return
    setMemberCount(newCount)
    // Context의 tripData도 함께 갱신해, 다른 탭에 갔다 와서 페이지가 다시
    // 마운트될 때 옛날 인원수로 되돌아가지 않도록 한다.
    setTripData((prev) => (prev ? { ...prev, member_count: newCount } : prev))

    // Debounce DB update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    updateTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase.from('trips').update({ member_count: newCount }).eq('id', tripId)
      if (error) console.error(error)
    }, 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.label.trim() || !form.amount) return
    const payload = {
      label: form.label.trim(),
      amount: Number(form.amount),
      category: form.category,
      created_by: user.name, // Keep for backward compatibility
      user_id: user.id,      // New ID-based foreign key
      trip_id: tripId
    }
    const { error } = await supabase.from('expenses').insert(payload)
    if (error) {
      console.error(error)
      alert('비용 추가에 실패했습니다. 다시 시도해주세요.')
      return
    }
    await loadExpenses()
    setForm({ label: '', amount: '', category: 'etc' })
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('비용 삭제에 실패했습니다. 다시 시도해주세요.')
      return
    }
    await loadExpenses()
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const count = Number(memberCount) || 1
  const perPerson = Math.ceil(total / count)

  // Category totals
  const categoryTotals = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses
      .filter((e) => e.category === cat.id)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  })).filter((c) => c.total > 0)

  return (
    <div className="expense-page">
      <ScrollToTopButton />
      <div className="expense-header">
        <h2 className="page-title" style={{ marginBottom: 0 }}>비용 정산 💸</h2>
        {!isCompleted && (
          <button id="expense-add-btn" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + 추가
          </button>
        )}
      </div>

      {/* Summary card */}
      <div className="summary-card">
        <div className="summary-total-row">
          <div className="summary-item">
            <span className="summary-label">총 지출</span>
            <span className="summary-value gradient-text">{total.toLocaleString()}원</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">총 인원</span>
            <div className="member-count-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleMemberCountChange(memberCount - 1)}
                disabled={isCompleted}
                style={isCompleted ? { opacity: 0.4, cursor: 'default' } : undefined}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="stepper-value-wrap">
                <span className="stepper-value">{memberCount}</span>
                <span className="stepper-unit">명</span>
              </div>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleMemberCountChange(memberCount + 1)}
                disabled={isCompleted}
                style={isCompleted ? { opacity: 0.4, cursor: 'default' } : undefined}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-label">1인당</span>
            <span className="summary-value amber-text">{perPerson.toLocaleString()}원</span>
          </div>
        </div>

        {categoryTotals.length > 0 && (
          <div className="category-breakdown">
            {categoryTotals.map((cat) => (
              <div key={cat.id} className="category-bar-item">
                <div className="category-bar-label">
                  <span>{cat.label}</span>
                  <span className="category-bar-amount">{cat.total.toLocaleString()}원</span>
                </div>
                <div className="category-bar-track">
                  <motion.div
                    className="category-bar-fill"
                    style={{ background: cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.total / total) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense list */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
          <p>여행 데이터를 불러오는 중...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <p>아직 비용 내역이 없어요.</p>
          <p>+ 추가로 비용을 기록해 보세요!</p>
        </div>
      ) : (
        <div className="expense-list">
          {expenses.map((expense) => {
            const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[5]
            const memberInfo = membersMap[expense.user_id]
            const displayAuthor = getDisplayName(membersMap, expense.user_id, { fallback: expense.created_by || '알 수 없음' })
            const canDelete = !isCompleted && canEditItem(isAdmin, expense, user)

            return (
              <motion.div
                key={expense.id}
                className="expense-item"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                layout
              >
                <div className="expense-item-left">
                  <span className="expense-cat-icon" style={{ color: cat.color }}>
                    {cat.label.split(' ')[0]}
                  </span>
                  <div>
                    <div className="expense-label" style={{ opacity: memberInfo?.is_deleted ? 0.6 : 1 }}>{expense.label}</div>
                    <div className="expense-meta">
                      <span style={{ color: memberInfo?.is_deleted ? 'var(--accent-rose)' : 'inherit' }}>{displayAuthor}</span>
                      <span>·</span>
                      <span style={{ color: cat.color }}>{cat.label.split(' ')[1]}</span>
                    </div>
                  </div>
                </div>
                <div className="expense-item-right">
                  <span className="expense-amount">{Number(expense.amount).toLocaleString()}원</span>
                  {canDelete && (
                    <button
                      id={`expense-del-${expense.id}`}
                      className="expense-del-btn"
                      onClick={() => handleDelete(expense.id)}
                    >✕</button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      <BottomSheetModal open={showModal} onClose={() => setShowModal(false)}>
              <div className="modal-title">➕ 비용 추가</div>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">항목명 *</label>
                  <input
                    className="input"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="예: 숙소 예약금, 기름값"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">💰 금액 (원) *</label>
                  <input
                    className="input"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    min={0}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">카테고리</label>
                  <div className="category-selector">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        id={`cat-btn-${cat.id}`}
                        className={`category-btn${form.category === cat.id ? ' active' : ''}`}
                        style={form.category === cat.id ? { borderColor: cat.color, color: cat.color, background: cat.color + '1a' } : {}}
                        onClick={() => setForm({ ...form, category: cat.id })}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>취소</button>
                  <button id="expense-submit-btn" type="submit" className="btn btn-primary" style={{ flex: 2 }}>비용 추가</button>
                </div>
              </form>
      </BottomSheetModal>
    </div>
  )
}
