import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import ExpensePage from './pages/ExpensePage.jsx'
import ChecklistPage from './pages/ChecklistPage.jsx'
import AccommodationPage from './pages/AccommodationPage.jsx'
import './App.css'

const TABS = [
  { id: 'dashboard', label: '홈', icon: DashboardIcon },
  { id: 'accommodation', label: '숙소', icon: AccommodationIcon },
  { id: 'plan', label: '일정', icon: PlanIcon },
  { id: 'expense', label: '비용', icon: ExpenseIcon },
  { id: 'checklist', label: '준비물', icon: CheckIcon },
]

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('travelplan_user') || '')
  const [activeTab, setActiveTab] = useState('dashboard')

  const handleLogin = (name) => {
    setUser(name)
  }

  const handleLogout = () => {
    localStorage.removeItem('travelplan_user')
    setUser('')
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  }

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="top-bar">
        <div className="top-bar-logo">✈️ <span>여행플랜</span></div>
        <div className="top-bar-right">
          <span className="top-bar-user">👤 {user}</span>
          <button
            id="logout-btn"
            className="logout-btn"
            onClick={handleLogout}
            title="로그아웃"
          >
            나가기
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {activeTab === 'dashboard' && <DashboardPage user={user} />}
            {activeTab === 'plan' && <PlanPage user={user} />}
            {activeTab === 'accommodation' && <AccommodationPage user={user} />}
            {activeTab === 'expense' && <ExpensePage user={user} />}
            {activeTab === 'checklist' && <ChecklistPage user={user} />}
          </motion.div>
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
              onClick={() => setActiveTab(tab.id)}
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
