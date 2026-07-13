import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import './ChecklistPage.css'

const SAMPLE_ITEMS = [
  { id: 'c1', item: '여행자 보험 가입', is_done: false, created_by: '여행자 1' },
  { id: 'c2', item: '충전기 및 멀티어댑터', is_done: false, created_by: '여행자 2' },
  { id: 'c3', item: '상비약 챙기기', is_done: true, created_by: '여행자 3' },
]

const QUICK_ITEMS = ['👕 여벌 옷', '🔌 충전기', '💊 상비약', '🪥 세면도구', '📸 카메라', '☂️ 우산', '🏧 현금 환전', '🗺️ 지도 저장']

export default function ChecklistPage({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('checklist').select('*').order('created_at')
    if (error || !data) {
      setItems(SAMPLE_ITEMS)
    } else {
      setItems(data)
    }
    setLoading(false)
  }

  const addItem = async (text) => {
    const trimmed = (text || newItem).trim()
    if (!trimmed) return

    const payload = { item: trimmed.replace(/^[^\s]*\s/, ''), is_done: false, created_by: user }
    const { error } = await supabase.from('checklist').insert(payload)
    if (error) {
      setItems((prev) => [...prev, { id: Date.now().toString(), ...payload }])
    } else {
      await loadItems()
    }
    setNewItem('')
  }

  const toggleDone = async (id, current) => {
    const { error } = await supabase.from('checklist').update({ is_done: !current }).eq('id', id)
    if (error) {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_done: !current } : i))
    } else {
      await loadItems()
    }
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('checklist').delete().eq('id', id)
    if (error) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      await loadItems()
    }
  }

  const doneCount = items.filter((i) => i.is_done).length
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0

  const pending = items.filter((i) => !i.is_done)
  const done = items.filter((i) => i.is_done)

  return (
    <div className="checklist-page">
      <h2 className="page-title">준비물 체크리스트 ✅</h2>

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
            🎉 모든 준비 완료!
          </motion.div>
        )}
      </div>

      {/* Quick add items */}
      <div className="quick-items-label section-label">빠른 추가</div>
      <div className="quick-items">
        {QUICK_ITEMS.map((q) => {
          const exists = items.some((i) => i.item.includes(q.split(' ').slice(1).join(' ')))
          return (
            <button
              key={q}
              id={`quick-add-${q}`}
              className={`quick-item-btn${exists ? ' exists' : ''}`}
              onClick={() => !exists && addItem(q)}
              disabled={exists}
            >
              {q}
            </button>
          )
        })}
      </div>

      {/* Custom add */}
      <form
        className="add-form"
        onSubmit={(e) => { e.preventDefault(); addItem() }}
      >
        <input
          id="checklist-input"
          className="input"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="직접 입력..."
          style={{ flex: 1 }}
        />
        <button id="checklist-add-btn" type="submit" className="btn btn-primary btn-sm">추가</button>
      </form>

      {/* Pending items */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
          <p>여행 데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="checklist-container">
          {pending.length === 0 && done.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>아직 준비물이 없어요!</p>
              <p>위에서 빠르게 추가해 보세요.</p>
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
                    onToggle={() => toggleDone(item.id, item.is_done)}
                    onDelete={() => deleteItem(item.id)}
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
                    onToggle={() => toggleDone(item.id, item.is_done)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckItem({ item, onToggle, onDelete }) {
  return (
    <motion.div
      className={`check-item${item.is_done ? ' done' : ''}`}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        id={`check-toggle-${item.id}`}
        className={`check-box${item.is_done ? ' checked' : ''}`}
        onClick={onToggle}
      >
        {item.is_done && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            ✓
          </motion.span>
        )}
      </button>
      <div className="check-text">
        <span className="check-item-name">{item.item}</span>
        <span className="check-item-by">{item.created_by}</span>
      </div>
      <button
        id={`check-del-${item.id}`}
        className="check-del-btn"
        onClick={onDelete}
      >✕</button>
    </motion.div>
  )
}
