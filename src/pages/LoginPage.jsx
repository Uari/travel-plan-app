import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import './LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [shaking, setShaking] = useState(false)
  const [presets, setPresets] = useState([])

  useEffect(() => {
    const fetchTravelers = async () => {
      const { data, error } = await supabase
        .from('travelers')
        .select('name')
        .order('created_at', { ascending: true })
      
      if (!error && data) {
        setPresets(data.map(t => t.name))
      }
    }
    fetchTravelers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      return
    }

    if (!presets.includes(trimmed)) {
      await supabase.from('travelers').insert({ name: trimmed })
    }

    localStorage.setItem('travelplan_user', trimmed)
    onLogin(trimmed)
  }

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">✈️</div>
          <div className="login-logo-text">
            <h1>여행플랜</h1>
            <p>우리 셋의 여행 계획</p>
          </div>
        </div>

        <div className="login-divider" />

        <p className="login-subtitle">
          이름(닉네임)만 입력하면<br />
          <strong>바로 시작할 수 있어요!</strong>
        </p>

        <motion.form
          onSubmit={handleSubmit}
          animate={shaking ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="input-group" style={{ marginBottom: '0.75rem' }}>
            <input
              id="login-name-input"
              className="input login-input"
              type="text"
              placeholder="이름 또는 닉네임 입력..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={10}
              autoFocus
            />
          </div>

          {/* Quick select presets */}
          <div className="login-presets">
            {presets.length > 0 && presets.map((n) => (
              <button
                key={n}
                type="button"
                className={`login-preset-btn${name === n ? ' active' : ''}`}
                onClick={() => setName(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <motion.button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full login-submit"
            whileTap={{ scale: 0.96 }}
          >
            <span>시작하기</span>
            <span>🚀</span>
          </motion.button>
        </motion.form>

        <p className="login-notice">
          로그인 없이 이름만으로 사용합니다.<br />
          이 기기에 자동 저장됩니다.
        </p>
      </motion.div>
    </div>
  )
}
