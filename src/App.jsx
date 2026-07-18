import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Crown, UserPlus, User, Check, AlertTriangle } from 'lucide-react'
import { supabase } from './lib/supabase.js'
import { TripContext } from './context/TripContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LobbyPage from './pages/LobbyPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import ExpensePage from './pages/ExpensePage.jsx'
import ChecklistPage from './pages/ChecklistPage.jsx'
import AccommodationPage from './pages/AccommodationPage.jsx'
import MyPage from './pages/MyPage.jsx'
import TravelLogPage from './pages/TravelLogPage.jsx'
import TravelLogDetailPage from './pages/TravelLogDetailPage.jsx'
import InviteSheet from './components/InviteSheet.jsx'
import './App.css'

const TABS = [
  { id: 'dashboard', label: '홈', icon: DashboardIcon },
  { id: 'accommodation', label: '숙소', icon: AccommodationIcon },
  { id: 'plan', label: '일정', icon: PlanIcon },
  { id: 'expense', label: '비용', icon: ExpenseIcon },
  { id: 'checklist', label: '준비물', icon: CheckIcon },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('travelplan_theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('travelplan_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }
  
  const [user, setUser] = useState(() => {
    // Read new JSON session
    const sessionStr = localStorage.getItem('travelplan_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.id && session.name) return session
      } catch (e) {
        return null
      }
    }
    return null
  })

  const handleLogin = (sessionObj) => {
    setUser(sessionObj)
    // 초대 링크(/join/:code)로 들어와 로그인한 경우, 로그인 후 해당 여행으로 바로 입장
    const pending = localStorage.getItem('travelplan_pending_join')
    if (pending) {
      localStorage.removeItem('travelplan_pending_join')
      navigate(`/join/${pending}`, { replace: true })
      return
    }
    navigate('/lobby', { replace: true })
  }

  const handleLogout = () => {
    localStorage.removeItem('travelplan_session')
    setUser(null)
    navigate('/lobby', { replace: true })
  }

  // 사용자가 직접 로그아웃 버튼을 누를 때만 확인. (탈퇴 후 자동 로그아웃 등은 handleLogout 직접 호출)
  const confirmLogout = () => {
    if (window.confirm('로그아웃 하시겠어요?')) handleLogout()
  }

  if (!user) {
    // 초대 링크로 미로그인 진입 시 코드를 저장해두고 로그인 후 자동 입장
    const m = location.pathname.match(/^\/join\/([^/]+)/)
    if (m) localStorage.setItem('travelplan_pending_join', m[1])
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/lobby" element={<LobbyPage user={user} onLogout={confirmLogout} />} />
      <Route path="/join/:code" element={<JoinTrip user={user} />} />
      <Route path="/mypage" element={<MyPage user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/travel-log" element={<TravelLogPage user={user} />} />
      <Route path="/travel-log/:tripId" element={<TravelLogDetailPage user={user} />} />
      <Route path="/trip/:tripId/*" element={<TripLayout user={user} onLogout={confirmLogout} />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  )
}

// 초대 링크(/join/:code) 진입 → 자동 입장 후 여행으로 이동
function JoinTrip({ user }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('joining') // joining | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const c = (code || '').trim()
      if (!c) { navigate('/lobby', { replace: true }); return }

      const { data: trip, error } = await supabase.from('trips').select('*').eq('id', c).single()
      if (error || !trip) {
        if (alive) { setStatus('error'); setMsg('존재하지 않는 초대 코드예요.') }
        return
      }

      const { error: joinErr } = await supabase
        .from('trip_members')
        .insert({ trip_id: c, user_id: user.id, traveler_name: user.name })
      if (joinErr && joinErr.code !== '23505') { // 23505 = 이미 멤버
        if (alive) { setStatus('error'); setMsg('입장에 실패했어요. 다시 시도해주세요.') }
        return
      }

      const { count } = await supabase
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', c)
      const actual = count ?? 1
      if (actual > trip.member_count) {
        await supabase.from('trips').update({ member_count: actual }).eq('id', c)
      }

      if (alive) navigate(`/trip/${c}/dashboard`, { replace: true })
    })()
    return () => { alive = false }
  }, [code, user.id, user.name, navigate])

  return (
    <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center', gap: '1rem', textAlign: 'center', padding: '1.5rem' }}>
      {status === 'joining' ? (
        <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>여행에 입장 중… <Plane size={16} /></p>
      ) : (
        <>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={16} /> {msg}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/lobby', { replace: true })}>로비로 돌아가기</button>
        </>
      )}
    </div>
  )
}

function TripLayout({ user, onLogout }) {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = location.pathname.split('/').pop() || 'dashboard'

  // Context for child pages
  const [membersMap, setMembersMap] = useState({}) // { [id]: { name, is_deleted } }
  const [isAdmin, setIsAdmin] = useState(false)
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    const fetchTripContext = async () => {
      setLoading(true)
      setLoadError(null)

      // 1. Fetch trip and admin
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripError) {
        console.error(tripError)
        setLoadError('여행 정보를 불러오지 못했습니다. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      if (trip) {
        setTripData(trip)
      }

      // 2. Fetch all members joined with users
      // FK 제약 조건이 설정되지 않았을 수 있으므로 조인 대신 두 번의 쿼리로 나누어 안전하게 가져옵니다.
      const { data: members, error } = await supabase
        .from('trip_members')
        .select('user_id, is_admin')
        .eq('trip_id', tripId)

      if (error) {
        console.error(error)
      }

      // 방장 판정: trip_members.is_admin(다중 방장)을 우선하되,
      // 아직 백필이 안 된 기존 데이터를 위해 방 생성자(admin_id)도 방장으로 인정한다.
      const myMembership = members?.find(m => m.user_id === user.id)
      setIsAdmin(myMembership?.is_admin === true || trip?.admin_id === user.id)

      if (!error && members && members.length > 0) {
        const userIds = members.map(m => m.user_id).filter(Boolean)
        
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, is_deleted')
          .in('id', userIds)

        if (usersData) {
          const map = {}
          usersData.forEach(u => {
            map[u.id] = {
              name: u.name,
              is_deleted: u.is_deleted
            }
          })
          setMembersMap(map)
        }
      }
      setLoading(false)
    }
    
    fetchTripContext()
  }, [tripId, user.id])

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  }

  if (loading) {
    return <div className="app-shell" style={{justifyContent:'center', alignItems:'center'}}>로딩 중...</div>
  }

  if (loadError) {
    return (
      <div className="app-shell" style={{justifyContent:'center', alignItems:'center', gap: '1rem', textAlign: 'center', padding: '1.5rem'}}>
        <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={16} /> {loadError}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/lobby')}>로비로 돌아가기</button>
      </div>
    )
  }

  const isCompleted = tripData?.is_completed === true
  const tripContextValue = { user, tripId, membersMap, isAdmin, tripData, setTripData, isCompleted }

  return (
    <TripContext.Provider value={tripContextValue}>
    <div className="app-shell">
      {/* Top bar */}
      <header className="top-bar">
        <div className="top-bar-logo" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plane size={18} /> <span>여행플랜</span>
        </div>
        <div className="top-bar-right" style={{ gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
            <span className="top-bar-user" style={{ fontSize: '0.75rem', opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {tripId.slice(0,6)}..{isAdmin && <Crown size={13} />}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', background: 'rgba(193,114,63,0.14)', border: 'none', color: 'var(--accent-secondary)' }}
              onClick={() => setShowInvite(true)}
            >
              <UserPlus size={13} /> 초대
            </button>
          </div>
          <button className="top-bar-user mypage-btn" onClick={() => navigate('/mypage')} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <User size={13} />{user.name.slice(0,3)}
          </button>
          <button id="logout-btn" className="logout-btn" onClick={onLogout} title="로그아웃" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
            로그아웃
          </button>
        </div>
      </header>

      {isCompleted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center',
          fontSize: '0.75rem', color: 'var(--accent-emerald, #5a7d5f)',
          background: 'rgba(90,125,95,0.12)', borderBottom: '1px solid rgba(90,125,95,0.25)',
          padding: '0.4rem 0.75rem', textAlign: 'center'
        }}>
          <Check size={14} /> 완료된 여행이에요 · 읽기 전용 (수정하려면 홈에서 완료를 취소하세요)
        </div>
      )}

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="dashboard" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <DashboardPage />
              </motion.div>
            } />
            <Route path="plan" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <PlanPage />
              </motion.div>
            } />
            <Route path="accommodation" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <AccommodationPage />
              </motion.div>
            } />
            <Route path="expense" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ExpensePage />
              </motion.div>
            } />
            <Route path="checklist" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ChecklistPage />
              </motion.div>
            } />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(`/trip/${tripId}/${tab.id}`)}
            >
              <Icon active={isActive} />
              <span className="nav-label">{tab.label}</span>
              {isActive && (
                <motion.div
                  className="nav-active-dot"
                  layoutId="nav-dot"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <InviteSheet open={showInvite} onClose={() => setShowInvite(false)} tripId={tripId} />
    </div>
    </TripContext.Provider>
  )
}

// SVG Icon Components
function DashboardIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  )
}

function PlanIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  )
}

function ExpenseIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function CheckIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function AccommodationIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
