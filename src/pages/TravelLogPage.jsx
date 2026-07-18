import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Map, Calendar, Plane } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getCountry } from '../data/countries.js'
import WorldMapSVG from '../components/WorldMapSVG.jsx'
import KoreaLogMap from '../components/KoreaLogMap.jsx'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import './TravelLogPage.css'

export default function TravelLogPage({ user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pickList, setPickList] = useState(null) // 같은 국가/도에 여행 여러 개일 때 선택 목록
  const [view, setView] = useState('world') // 'world' | 'korea'
  const [viewMode, setViewMode] = useState('map') // 'map' | 'timeline'
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

  // 국가별 완료 여행 수 (세계지도 다트용)
  const visited = useMemo(() => {
    const counts = {}
    logs.forEach((t) => {
      const code = t.country_code || 'ETC'
      counts[code] = (counts[code] || 0) + 1
    })
    return counts
  }, [logs])

  // 대한민국 도(道)별 완료 여행 수 (상세지도 다트용)
  const krVisited = useMemo(() => {
    const counts = {}
    logs.forEach((t) => {
      if (t.country_code === 'KR' && t.region_province) {
        counts[t.region_province] = (counts[t.region_province] || 0) + 1
      }
    })
    return counts
  }, [logs])

  // 연도별 그룹 (타임라인용)
  const byYear = useMemo(() => {
    const groups = {}
    logs.forEach((t) => {
      const dateStr = t.completed_at || t.start_date || ''
      const year = dateStr ? new Date(dateStr).getFullYear() : '기타'
      if (!groups[year]) groups[year] = []
      groups[year].push(t)
    })
    return groups
  }, [logs])
  const years = Object.keys(byYear).sort((a, b) => String(b).localeCompare(String(a)))

  const openCountry = (code) => {
    // 대한민국은 상세지도(레벨 2)로 줌인
    if (code === 'KR') {
      setView('korea')
      return
    }
    const inCountry = logs.filter((t) => (t.country_code || 'ETC') === code)
    if (inCountry.length === 0) return
    if (inCountry.length === 1) {
      navigate(`/travel-log/${inCountry[0].id}`)
    } else {
      setPickList({ label: `${getCountry(code)?.name || '해외'} 여행`, trips: inCountry })
    }
  }

  const openProvince = (prov) => {
    const inProv = logs.filter((t) => t.country_code === 'KR' && t.region_province === prov)
    if (inProv.length === 0) return
    if (inProv.length === 1) {
      navigate(`/travel-log/${inProv[0].id}`)
    } else {
      setPickList({ label: `${prov} 여행`, trips: inProv })
    }
  }

  return (
    <div className="travellog-page">
      <header className="travellog-header">
        <button className="back-btn" onClick={() => navigate('/lobby')}><ArrowLeft size={18} /> 로비</button>
        <h2><BookOpen size={24} /> 여행 로그</h2>
        <div style={{ width: 48 }} />
      </header>

      <main className="travellog-main">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}><Plane size={48} strokeWidth={1.5} /></div>
            <p>여행 기록을 불러오는 중...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Map size={48} strokeWidth={1.5} /></div>
            <p>아직 완료된 여행이 없어요.</p>
            <p>여행을 마치면 여기에 기록돼요!</p>
          </div>
        ) : (
          <>
            <div className="travellog-viewmode">
              <button className={`tlvm-btn${viewMode === 'map' ? ' active' : ''}`} onClick={() => setViewMode('map')}><Map size={16} /> 지도</button>
              <button className={`tlvm-btn${viewMode === 'timeline' ? ' active' : ''}`} onClick={() => setViewMode('timeline')}><Calendar size={16} /> 타임라인</button>
            </div>
            {viewMode === 'map' ? (
          <div className="travellog-map-wrap">
            <AnimatePresence mode="wait">
              {view === 'world' ? (
                <motion.div
                  key="world"
                  initial={{ opacity: 0, scale: 1.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <WorldMapSVG visited={visited} onSelectCountry={openCountry} />
                  <p className="travellog-map-hint">지도의 다트를 눌러 여행 기록을 확인하세요 🎯</p>
                </motion.div>
              ) : (
                <motion.div
                  key="korea"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <button className="travellog-map-back" onClick={() => setView('world')}><ArrowLeft size={16} /> 세계지도로</button>
                  <KoreaLogMap visited={krVisited} onSelectProvince={openProvince} />
                  <p className="travellog-map-hint">도(道)의 다트를 눌러 여행 기록을 확인하세요 🎯</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
            ) : (
              <div className="travellog-timeline">
                {years.map((y) => (
                  <div key={y} className="tl-year">
                    <div className="tl-year-label">{y}{y !== '기타' ? '년' : ''}</div>
                    <div className="tl-year-list">
                      {byYear[y].map((t) => (
                        <button key={t.id} className="tl-card" onClick={() => navigate(`/travel-log/${t.id}`)}>
                          <span className="tl-card-name">{t.name}</span>
                          <span className="tl-card-meta">
                            {(t.region_label || t.destination_label) && <span>{t.region_label || t.destination_label}</span>}
                            {t.completed_at && <span> · {String(t.completed_at).slice(0, 10)}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 같은 국가/도에 여행이 여러 개일 때 방 선택 */}
      <BottomSheetModal open={!!pickList} onClose={() => setPickList(null)}>
        <div className="modal-title">{pickList?.label || ''}</div>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>어떤 여행을 볼까요?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pickList?.trips.map((t) => (
            <button
              key={t.id}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => {
                setPickList(null)
                navigate(`/travel-log/${t.id}`)
              }}
            >
              {t.name}
              {(t.region_label || t.destination_label) && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                  · {t.region_label || t.destination_label}
                </span>
              )}
            </button>
          ))}
        </div>
      </BottomSheetModal>
    </div>
  )
}
