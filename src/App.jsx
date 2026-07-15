import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('travelplan_theme') || 'dark'
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
    navigate('/lobby', { replace: true })
  }

  const handleLogout = () => {
    localStorage.removeItem('travelplan_session')
    setUser(null)
    navigate('/lobby', { replace: true })
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/lobby" element={<LobbyPage user={user} onLogout={handleLogout} />} />
      <Route path="/mypage" element={<MyPage user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/trip/:tripId/*" element={<TripLayout user={user} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
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
        setIsAdmin(trip.admin_id === user.id)
      }

      // 2. Fetch all members joined with users
      // FK 제약 조건이 설정되지 않았을 수 있으므로 조인 대신 두 번의 쿼리로 나누어 안전하게 가져옵니다.
      const { data: members, error } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId)

      if (error) {
        console.error(error)
      }

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
        <p>⚠️ {loadError}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/lobby')}>로비로 돌아가기</button>
      </div>
    )
  }

  const tripContextValue = { user, tripId, membersMap, isAdmin, tripData, setTripData }

  return (
    <TripContext.Provider value={tripContextValue}>
    <div className="app-shell">
      {/* Top bar */}
      <header className="top-bar">
        <div className="top-bar-logo" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer' }}>
          ✈️ <span>여행플랜</span>
        </div>
        <div className="top-bar-right" style={{ gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
            <span className="top-bar-user" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {tripId.slice(0,6)}..{isAdmin ? '👑' : ''}
            </span>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '0.15rem 0.3rem', fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', border: 'none', color: 'var(--accent-primary)' }}
              onClick={() => {
                navigator.clipboard.writeText(tripId);
                alert('초대 코드(' + tripId + ')가 복사되었습니다!\n카카오톡 친구에게 붙여넣기해서 초대하세요.');
              }}
            >
              복사
            </button>
          </div>
          <button className="top-bar-user mypage-btn" onClick={() => navigate('/mypage')} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
            👤{user.name.slice(0,3)}
          </button>
          <button id="logout-btn" className="logout-btn" onClick={onLogout} title="로그아웃" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
            나가기
          </button>
        </div>
      </header>

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
