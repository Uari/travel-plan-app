import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, User, BookOpen, ArrowRight, Sparkles, UserPlus, Check, Calendar, Users, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import TripCompleteModal from '../components/TripCompleteModal.jsx'
import './LobbyPage.css' // We will create this or use inline styles, let's create a minimal CSS

export default function LobbyPage({ user, onLogout }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  
  // Create Form
  const [newTripName, setNewTripName] = useState('')
  const [newTripDate, setNewTripDate] = useState('')
  
  // Join Form
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  // 진행 중 / 완료 탭
  const [activeTab, setActiveTab] = useState('ongoing') // 'ongoing' | 'completed'

  // 여행 완료 모달
  const [completeTargetId, setCompleteTargetId] = useState(null)
  const [completing, setCompleting] = useState(false)

  const navigate = useNavigate()

  const ongoingTrips = trips.filter((t) => !t.is_completed)
  const completedTrips = trips.filter((t) => t.is_completed)
  const shownTrips = activeTab === 'completed' ? completedTrips : ongoingTrips

  useEffect(() => {
    fetchMyTrips()
  }, [user.id])

  const fetchMyTrips = async () => {
    setLoading(true)
    // Fetch trips where user is a member
    const { data, error } = await supabase
      .from('trip_members')
      .select(`
        trip_id,
        joined_at,
        is_admin,
        trips (
          id,
          name,
          start_date,
          member_count,
          is_completed,
          admin_id
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (!error && data) {
      // data format: [{ trip_id, is_admin, trips: { id, name, ... } }, ...]
      const formattedTrips = data
        .filter(item => item.trips) // filter out nulls if trip was deleted
        .map(item => ({
          ...item.trips,
          joined_at: item.joined_at,
          // 방장 여부: 내 membership의 is_admin 우선, 백필 전 데이터는 admin_id로 폴백
          am_admin: item.is_admin === true || item.trips.admin_id === user.id,
        }))
      setTrips(formattedTrips)
    }
    setLoading(false)
  }

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    if (!newTripName.trim()) return

    const newCode = generateCode()
    const payload = {
      id: newCode,
      name: newTripName.trim(),
      member_count: 1,
      start_date: newTripDate || null,
      admin_id: user.id
    }

    // Insert into trips
    const { error: tripError } = await supabase.from('trips').insert(payload)
    if (tripError) {
      console.error(tripError)
      alert("방 생성에 실패했습니다.")
      return
    }

    // Insert into trip_members
    await supabase.from('trip_members').insert({ trip_id: newCode, user_id: user.id, traveler_name: user.name })

    // Go to trip
    setShowCreateModal(false)
    navigate(`/trip/${newCode}/dashboard`)
  }

  const handleJoinTrip = async (e) => {
    e.preventDefault()
    const code = joinCode.trim()
    if (!code) return
    setJoinError('')

    // 1. Check if trip exists
    const { data: trip, error: findError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', code)
      .single()

    if (findError || !trip) {
      setJoinError('존재하지 않는 방 코드입니다.')
      return
    }

    // 2. Join the trip
    const { error: joinError } = await supabase
      .from('trip_members')
      .insert({ trip_id: code, user_id: user.id, traveler_name: user.name })

    if (joinError && joinError.code !== '23505') { // 23505 is unique violation (already joined)
      console.error(joinError)
      setJoinError('방 입장에 실패했습니다.')
      return
    }

    // 3. Increment member_count intelligently
    const { count } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', code)
    
    const actualCount = count ?? 1
    const newCount = Math.max(trip.member_count, actualCount)
    
    if (newCount > trip.member_count) {
      await supabase.from('trips').update({ member_count: newCount }).eq('id', code)
    }

    setShowJoinModal(false)
    navigate(`/trip/${code}/dashboard`)
  }

  const handleLeaveTrip = async (e, tripId, currentCount) => {
    e.stopPropagation() // Prevent card click
    const confirmed = window.confirm("정말 이 방에서 나가시겠습니까?\n방을 나가면 목록에서 사라집니다.")
    if (!confirmed) return

    // Remove from trip_members
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .match({ trip_id: tripId, user_id: user.id })

    if (error) {
      console.error(error)
      alert('방 나가기에 실패했습니다.')
      return
    }

    // Decrement count
    const newCount = Math.max(1, currentCount - 1)
    await supabase.from('trips').update({ member_count: newCount }).eq('id', tripId)

    // 방장 공백 방지: 나간 뒤 방장(is_admin)이 아무도 없으면 남은 멤버 전원을 방장으로 승격
    const { data: remaining } = await supabase
      .from('trip_members')
      .select('user_id, is_admin')
      .eq('trip_id', tripId)

    if (remaining && remaining.length > 0 && !remaining.some((m) => m.is_admin)) {
      await supabase
        .from('trip_members')
        .update({ is_admin: true })
        .eq('trip_id', tripId)
    }

    // Refresh list
    fetchMyTrips()
  }

  const handleCompleteTrip = async (payload) => {
    if (!completeTargetId) return
    setCompleting(true)
    const { error } = await supabase
      .from('trips')
      .update({ ...payload, is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', completeTargetId)
    setCompleting(false)
    if (error) {
      console.error(error)
      alert('여행 완료 처리에 실패했습니다. 다시 시도해주세요.')
      return
    }
    setCompleteTargetId(null)
    setActiveTab('completed')
    fetchMyTrips()
  }

  const handleUncompleteTrip = async (e, tripId) => {
    e.stopPropagation()
    if (!window.confirm('여행 완료를 취소할까요? 여행 로그에서 제외되지만, 올린 사진과 후기는 그대로 유지됩니다.')) return
    const { error } = await supabase
      .from('trips')
      .update({ is_completed: false, completed_at: null })
      .eq('id', tripId)
    if (error) {
      console.error(error)
      alert('완료 취소에 실패했습니다. 다시 시도해주세요.')
      return
    }
    fetchMyTrips()
  }

  return (
    <div className="lobby-page">
      {/* Animated background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      
      <header className="lobby-header">
        <div className="lobby-logo"><Plane size={18} /> <span>여행플랜 로비</span></div>
        <div className="lobby-user-area">
          <button className="mypage-btn" onClick={() => navigate('/mypage')} style={{color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}>
            <User size={14} /> {user.name}
          </button>
          <button className="logout-btn" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <main className="lobby-main">
        {/* 여행 로그 (로비 메인) */}
        <motion.button
          className="travellog-hero"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/travel-log')}
        >
          <div className="travellog-hero-icon"><BookOpen size={20} /></div>
          <div className="travellog-hero-text">
            <strong>여행 로그</strong>
            <span>다녀온 여행을 지도에서 다시 만나보세요</span>
          </div>
          <div className="travellog-hero-arrow"><ArrowRight size={16} /></div>
        </motion.button>

        <div className="lobby-actions">
          <motion.button
            className="btn btn-primary lobby-action-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
          >
            <Sparkles size={16} /> 새 여행 만들기
          </motion.button>
          <motion.button
            className="btn btn-secondary lobby-action-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowJoinModal(true)}
          >
            <UserPlus size={16} /> 코드로 입장
          </motion.button>
        </div>

        <div className="lobby-trip-list">
          <h2>내 여행</h2>

          <div className="lobby-tabs">
            <button
              className={`lobby-tab${activeTab === 'ongoing' ? ' active' : ''}`}
              onClick={() => setActiveTab('ongoing')}
            >
              진행 중 ({ongoingTrips.length})
            </button>
            <button
              className={`lobby-tab${activeTab === 'completed' ? ' active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              완료 ({completedTrips.length})
            </button>
          </div>

          {loading ? (
            <p className="loading-text">여행 목록을 불러오는 중...</p>
          ) : shownTrips.length === 0 ? (
            <div className="empty-state">
              {activeTab === 'completed' ? (
                '아직 완료된 여행이 없습니다.'
              ) : (
                <>아직 진행 중인 여행이 없습니다.<br/>새 여행을 만들거나 코드로 입장해보세요!</>
              )}
            </div>
          ) : (
            <div className="trip-cards">
              {shownTrips.map(trip => (
                <motion.div 
                  key={trip.id} 
                  className="trip-card"
                  style={{ position: 'relative' }}
                  whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/trip/${trip.id}/dashboard`)}
                >
                  {!trip.is_completed && (
                    <button
                      className="leave-trip-btn"
                      onClick={(e) => handleLeaveTrip(e, trip.id, trip.member_count)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(192, 90, 78, 0.1)',
                        color: 'var(--accent-rose)',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      title="방 나가기"
                    >
                      나가기
                    </button>
                  )}
                  <h3>
                    {trip.name}
                    {trip.is_completed && (
                      <span
                        style={{
                          marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 700,
                          color: 'var(--accent-emerald)', background: 'rgba(90,125,95,0.14)',
                          border: '1px solid rgba(90,125,95,0.4)', borderRadius: '999px',
                          padding: '0.1rem 0.45rem', verticalAlign: 'middle', whiteSpace: 'nowrap'
                        }}
                      >
                        <Check size={14} /> 완료
                      </span>
                    )}
                  </h3>
                  <div className="trip-card-meta">
                    <span className="trip-code">코드: {trip.id}</span>
                    {trip.start_date && <span className="trip-date"><Calendar size={14} /> {trip.start_date}</span>}
                    <span className="trip-members"><Users size={14} /> {trip.member_count}명</span>
                  </div>

                  {trip.am_admin && (
                    <div className="trip-card-actions">
                      {trip.is_completed ? (
                        <button
                          className="trip-complete-btn uncomplete"
                          onClick={(e) => handleUncompleteTrip(e, trip.id)}
                        >
                          완료 취소
                        </button>
                      ) : (
                        <button
                          className="trip-complete-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCompleteTargetId(trip.id)
                          }}
                        >
                          <Check size={16} /> 여행 완료
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 여행 완료 모달 */}
      <TripCompleteModal
        open={!!completeTargetId}
        onClose={() => setCompleteTargetId(null)}
        onComplete={handleCompleteTrip}
        submitting={completing}
      />

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)}>
            <motion.div 
              className="modal-sheet" 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <div className="modal-title"><Sparkles size={20} /> 새 여행 만들기</div>
              <form onSubmit={handleCreateTrip}>
                <div className="input-group">
                  <label className="input-label">여행 이름</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="예: 제주도 여름 휴가" 
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label">여행 시작일 (선택)</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={newTripDate}
                    onChange={(e) => setNewTripDate(e.target.value)}
                  />
                  <p className="text-xs text-muted mt-1">나중에 설정하셔도 됩니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!newTripName.trim()}>만들기 <Plus size={16} /></button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowJoinModal(false)}>
            <motion.div 
              className="modal-sheet" 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <div className="modal-title"><UserPlus size={20} /> 코드로 입장</div>
              <form onSubmit={handleJoinTrip}>
                <div className="input-group">
                  <label className="input-label">초대 코드 (6자리)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="예: A7X9BQ 또는 기존 초대 코드" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                    autoFocus
                  />
                  {joinError && <p className="text-xs mt-2" style={{ color: 'var(--accent-rose)' }}>{joinError}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowJoinModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!joinCode.trim()}>입장하기</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
