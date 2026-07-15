import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getCountry } from '../data/countries.js'
import './TravelLogPage.css'

export default function TravelLogPage({ user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const fetchLogs = async () => {
    setLoading(true)
    // 내가 멤버로 참여한 방들 중 완료된 여행만
    const { data, error } = await supabase
      .from('trip_members')
      .select(`
        trip_id,
        trips (
          id, name, start_date, completed_at,
          is_completed, country_code, region_label, region_province,
          destination_label, review_note
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error(error)
      setLogs([])
      setLoading(false)
      return
    }

    const completed = (data || [])
      .map((row) => row.trips)
      .filter((t) => t && t.is_completed)
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))

    setLogs(completed)
    setLoading(false)
  }

  const describePlace = (trip) => {
    const country = getCountry(trip.country_code)
    if (trip.country_code === 'KR') {
      const region = trip.region_label || trip.region_province || '대한민국'
      return `🇰🇷 ${region}`
    }
    const emoji = country?.emoji || '🌍'
    const name = country?.name || '해외'
    return `${emoji} ${name}${trip.destination_label ? ` · ${trip.destination_label}` : ''}`
  }

  return (
    <div className="travellog-page">
      <header className="travellog-header">
        <button className="back-btn" onClick={() => navigate('/lobby')}>← 로비</button>
        <h2>📖 여행 로그</h2>
        <div style={{ width: 48 }} />
      </header>

      <main className="travellog-main">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
            <p>여행 기록을 불러오는 중...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <p>아직 완료된 여행이 없어요.</p>
            <p>여행을 마치면 여기에 기록돼요!</p>
          </div>
        ) : (
          <div className="travellog-list">
            {logs.map((trip) => (
              <motion.div
                key={trip.id}
                className="travellog-card"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/travel-log/${trip.id}`)}
              >
                <div className="travellog-card-place">{describePlace(trip)}</div>
                <h3 className="travellog-card-name">{trip.name}</h3>
                {trip.start_date && (
                  <div className="travellog-card-date">📅 {trip.start_date}</div>
                )}
                {trip.review_note && (
                  <p className="travellog-card-review">“{trip.review_note}”</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
