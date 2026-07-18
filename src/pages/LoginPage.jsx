import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, AlertTriangle, LogIn } from 'lucide-react'
import { login, signup } from '../lib/authApi.js'
import './LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  
  // Form states
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleModeSwitch = (newMode) => {
    setMode(newMode)
    setErrorMessage('')
    setUserId('')
    setPassword('')
    setName('')
  }

  const triggerError = (msg) => {
    setErrorMessage(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const trimmedId = userId.trim()
    const trimmedPw = password.trim()
    const trimmedName = name.trim()

    if (!trimmedId || !trimmedPw) {
      triggerError('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }

    if (mode === 'signup' && !trimmedName) {
      triggerError('닉네임을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await signup(trimmedId, trimmedPw, trimmedName)
        if (error) {
          triggerError(error.message || '회원가입에 실패했습니다.')
          return
        }

        localStorage.setItem('travelplan_session', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        const { data, error } = await login(trimmedId, trimmedPw)
        if (error) {
          triggerError(error.message || '로그인에 실패했습니다.')
          return
        }

        localStorage.setItem('travelplan_session', JSON.stringify(data.user))
        onLogin(data.user)
      }
    } catch (err) {
      console.error(err)
      triggerError('서버 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="login-logo">
          <div className="login-logo-icon"><Plane size={28} /></div>
          <div className="login-logo-text">
            <h1>여행플랜</h1>
            <p>완벽한 여행의 시작</p>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          animate={shaking ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="login-form-content"
        >
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                className="login-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
<AlertTriangle size={16} /> {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-group" style={{ marginBottom: '0.75rem' }}>
            <input
              className="input login-input"
              type="text"
              placeholder="아이디"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '0.75rem' }}>
            <input
              className="input login-input"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={30}
            />
          </div>

          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="input-group" 
                style={{ marginBottom: '0.75rem', overflow: 'hidden' }}
              >
                <input
                  className="input login-input"
                  type="text"
                  placeholder="이름 (닉네임)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={10}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="btn btn-primary btn-full login-submit"
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            <span>{loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}</span>
            {!loading && <span><LogIn size={18} /></span>}
          </motion.button>
        </motion.form>

        <div className="login-toggle-container">
          <button 
            type="button" 
            className="login-toggle-btn"
            onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? '계정이 없으신가요? 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
          </button>
        </div>

        <p className="login-notice">
          {mode === 'login' ? '등록된 아이디로 로그인해주세요.' : '친구들에게 보여질 이름을 입력해주세요.'}
        </p>
      </motion.div>
    </div>
  )
}
