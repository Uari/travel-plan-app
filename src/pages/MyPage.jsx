import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { changePassword, deleteAccount } from '../lib/authApi.js'
import './MyPage.css'

export default function MyPage({ user, onLogout, theme, toggleTheme }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('password') // 'password' or 'delete'
  
  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  
  // Delete account state
  const [deletePw, setDeletePw] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const showMessage = (msg, error = false) => {
    setMessage(msg)
    setIsError(error)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPw || !newPw || !newPwConfirm) {
      showMessage('모든 필드를 입력해주세요.', true)
      return
    }
    if (newPw !== newPwConfirm) {
      showMessage('새 비밀번호가 일치하지 않습니다.', true)
      return
    }

    setLoading(true)
    const { error } = await changePassword(user.id, currentPw, newPw)

    if (error) {
      showMessage(error.message || '비밀번호 변경 중 오류가 발생했습니다.', true)
      setLoading(false)
      return
    }

    showMessage('비밀번호가 성공적으로 변경되었습니다.')
    setCurrentPw('')
    setNewPw('')
    setNewPwConfirm('')
    setLoading(false)
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    if (!deletePw) {
      showMessage('비밀번호를 입력해주세요.', true)
      return
    }

    if (!window.confirm('정말 탈퇴하시겠습니까? (이전 여행 데이터는 남지만 복구 불가능합니다)')) return

    setLoading(true)
    const { error } = await deleteAccount(user.id, deletePw)

    if (error) {
      showMessage(error.message || '회원 탈퇴 중 오류가 발생했습니다.', true)
      setLoading(false)
      return
    }

    alert('계정이 탈퇴되었습니다. 이용해 주셔서 감사합니다.')
    onLogout() // Logs out and redirects to /
  }

  return (
    <div className="mypage-container">
      <header className="mypage-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </button>
        <h2>마이페이지</h2>
        <div style={{width: 60}}></div> {/* Spacer */}
      </header>

      <main className="mypage-content">
        <div className="mypage-profile">
          <div className="profile-avatar">👤</div>
          <h3>{user.name}</h3>
          <p className="profile-id">ID: {user.id}</p>
        </div>

        <div className="mypage-settings" style={{ marginBottom: '1.5rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>화면 테마 설정</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>라이트 모드와 다크 모드를 전환합니다.</div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }}
            >
              {theme === 'light' ? '☀️ 밝게' : '🌙 어둡게'}
            </button>
          </div>
        </div>

        <div className="mypage-tabs">
          <button 
            className={`mypage-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            비밀번호 변경
          </button>
          <button 
            className={`mypage-tab ${activeTab === 'delete' ? 'active' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            회원 탈퇴
          </button>
        </div>

        <div className="mypage-forms">
          <AnimatePresence mode="wait">
            {message && (
              <motion.div 
                className={`mypage-alert ${isError ? 'error' : 'success'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'password' ? (
            <motion.form 
              key="password-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleChangePassword}
              className="mypage-form"
            >
              <div className="input-group">
                <label>현재 비밀번호</label>
                <input 
                  type="password" 
                  className="input" 
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="input-group">
                <label>새 비밀번호</label>
                <input 
                  type="password" 
                  className="input" 
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="input-group">
                <label>새 비밀번호 확인</label>
                <input 
                  type="password" 
                  className="input" 
                  value={newPwConfirm}
                  onChange={(e) => setNewPwConfirm(e.target.value)}
                  maxLength={30}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? '변경 중...' : '비밀번호 변경하기'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="delete-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleDeleteAccount}
              className="mypage-form"
            >
              <div className="warning-box">
                ⚠️ 탈퇴 시 로그인할 수 없게 되며, 삭제된 계정은 복구할 수 없습니다. 기존 여행 데이터(유령 상태)는 방에 남게 됩니다.
              </div>
              <div className="input-group">
                <label>본인 확인 (비밀번호)</label>
                <input 
                  type="password" 
                  className="input" 
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  maxLength={30}
                />
              </div>
              <button type="submit" className="btn btn-danger btn-full" disabled={loading}>
                {loading ? '처리 중...' : '탈퇴하기'}
              </button>
            </motion.form>
          )}
        </div>
      </main>
    </div>
  )
}
