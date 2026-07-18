import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getCountry } from '../data/countries.js'
import { getDisplayName } from '../lib/tripMembers.js'
import { compressImage } from '../lib/imageCompress.js'
import './TravelLogDetailPage.css'

const MAX_PHOTOS = 10
const BUCKET = 'travel_images'

export default function TravelLogDetailPage({ user }) {
  const { tripId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState(null)
  const [plans, setPlans] = useState([])
  const [expenses, setExpenses] = useState([])
  const [selectedAcc, setSelectedAcc] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [membersMap, setMembersMap] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null) // 라이트박스로 크게 볼 사진 index
  const touchStartX = useRef(null)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  // 라이트박스: 키보드 좌우/ESC
  useEffect(() => {
    if (viewerIndex === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setViewerIndex(null)
      else if (e.key === 'ArrowLeft') setViewerIndex((i) => (i - 1 + photos.length) % photos.length)
      else if (e.key === 'ArrowRight') setViewerIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex, photos.length])

  const showPrev = () => setViewerIndex((i) => (i - 1 + photos.length) % photos.length)
  const showNext = () => setViewerIndex((i) => (i + 1) % photos.length)

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 50) showPrev()
    else if (dx < -50) showNext()
    touchStartX.current = null
  }

  const loadAll = async () => {
    setLoading(true)
    const [tripRes, plansRes, expRes, accRes, checkRes, memberRes, photoRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('plans').select('*').eq('trip_id', tripId).order('day_label').order('time_label'),
      supabase.from('expenses').select('amount, category').eq('trip_id', tripId),
      supabase.from('accommodations').select('name, is_selected').eq('trip_id', tripId).eq('is_selected', true),
      supabase.from('checklist').select('is_done').eq('trip_id', tripId),
      supabase.from('trip_members').select('user_id, is_admin').eq('trip_id', tripId),
      supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('created_at'),
    ])

    if (tripRes.error) console.error(tripRes.error)
    setTrip(tripRes.data || null)
    setPlans(plansRes.data || [])
    setExpenses(expRes.data || [])
    setSelectedAcc((accRes.data && accRes.data[0]) || null)
    setChecklist(checkRes.data || [])
    setPhotos(photoRes.data || [])

    const members = memberRes.data || []
    const myMembership = members.find((m) => m.user_id === user.id)
    setIsAdmin(myMembership?.is_admin === true || tripRes.data?.admin_id === user.id)

    // 멤버 이름 매핑
    const userIds = members.map((m) => m.user_id).filter(Boolean)
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, is_deleted')
        .in('id', userIds)
      const map = {}
      ;(usersData || []).forEach((u) => {
        map[u.id] = { name: u.name, is_deleted: u.is_deleted }
      })
      setMembersMap(map)
    }

    setLoading(false)
  }

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const memberCount = Number(trip?.member_count) || 1
    const perPerson = Math.ceil(total / memberCount)
    const doneCount = checklist.filter((c) => c.is_done).length
    const grouped = plans.reduce((acc, p) => {
      const key = p.day_label || 'Day 1'
      if (!acc[key]) acc[key] = []
      acc[key].push(p)
      return acc
    }, {})
    return {
      total,
      perPerson,
      memberCount,
      checkDone: doneCount,
      checkTotal: checklist.length,
      days: Object.keys(grouped).sort(),
      grouped,
    }
  }, [expenses, checklist, plans, trip])

  const placeLabel = () => {
    if (!trip) return ''
    const country = getCountry(trip.country_code)
    if (trip.country_code === 'KR') return `🇰🇷 ${trip.region_label || trip.region_province || '대한민국'}`
    return `${country?.emoji || '🌍'} ${country?.name || '해외'}${trip.destination_label ? ` · ${trip.destination_label}` : ''}`
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // 같은 파일 재선택 허용
    if (files.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      alert(`사진은 여행당 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`)
      return
    }
    const toUpload = files.slice(0, remaining)
    if (files.length > remaining) {
      alert(`남은 자리가 ${remaining}장뿐이라 ${remaining}장만 업로드합니다.`)
    }

    setUploading(true)
    try {
      const newRows = []
      for (const file of toUpload) {
        const compressed = await compressImage(file)
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`
        const path = `travel-log/${tripId}/${fileName}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, compressed)
        if (upErr) {
          console.error(upErr)
          continue
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        const { data: inserted, error: insErr } = await supabase
          .from('trip_photos')
          .insert({ trip_id: tripId, url: pub.publicUrl, uploaded_by: user.id })
          .select()
          .single()
        if (insErr) {
          console.error(insErr)
          // 업로드는 됐지만 DB 기록 실패 시 스토리지 파일 정리
          await supabase.storage.from(BUCKET).remove([path])
          continue
        }
        newRows.push(inserted)
      }
      if (newRows.length > 0) setPhotos((prev) => [...prev, ...newRows])
      if (newRows.length < toUpload.length) alert('일부 사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photo) => {
    const canDelete = photo.uploaded_by === user.id || isAdmin
    if (!canDelete) {
      alert('본인이 올린 사진 또는 방장만 삭제할 수 있어요.')
      return
    }
    if (!window.confirm('이 사진을 삭제할까요?')) return

    // Storage 파일 경로를 public URL에서 추출해 함께 삭제 (고아 파일 방지)
    const marker = `/${BUCKET}/`
    const idx = photo.url.indexOf(marker)
    const path = idx >= 0 ? photo.url.slice(idx + marker.length) : null

    const { error } = await supabase.from('trip_photos').delete().eq('id', photo.id)
    if (error) {
      console.error(error)
      alert('사진 삭제에 실패했습니다.')
      return
    }
    if (path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path])
      if (rmErr) console.error('스토리지 파일 삭제 실패:', rmErr)
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  if (loading) {
    return (
      <div className="tld-page">
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
          <p>여행 로그를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="tld-page">
        <div className="empty-state">
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }} onClick={() => navigate('/travel-log')}>← 여행 로그</button>
          <div className="empty-icon">❓</div>
          <p>여행 정보를 찾을 수 없어요.</p>
        </div>
      </div>
    )
  }

  const coverPhoto = photos[0]

  const uploadLabel = (
    <label className={`tld-add-photo${uploading || photos.length >= MAX_PHOTOS ? ' disabled' : ''}`}>
      {uploading ? '업로드 중…' : '＋ 사진'}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        disabled={uploading || photos.length >= MAX_PHOTOS}
        style={{ display: 'none' }}
      />
    </label>
  )

  return (
    <div className="tld-page">
      {/* 커버 히어로 */}
      <div
        className={`tld-hero${coverPhoto ? ' has-cover' : ''}`}
        style={coverPhoto ? { backgroundImage: `url(${coverPhoto.url})` } : undefined}
      >
        <button className="tld-back" onClick={() => navigate('/travel-log')} aria-label="뒤로">←</button>
        <div className="tld-hero-overlay">
          <span className="tld-hero-place">{placeLabel()}</span>
          <h1 className="tld-hero-title">{trip.name}</h1>
          {trip.start_date && <span className="tld-hero-date">📅 {trip.start_date}</span>}
        </div>
      </div>

      <main className="tld-body">
        {trip.review_note && <blockquote className="tld-quote">{trip.review_note}</blockquote>}

        {/* 스탯 칩 */}
        <div className="tld-stats">
          <div className="tld-chip">
            <span className="tld-chip-v">{summary.total.toLocaleString()}</span>
            <span className="tld-chip-l">총 지출(원)</span>
          </div>
          <div className="tld-chip">
            <span className="tld-chip-v">{summary.perPerson.toLocaleString()}</span>
            <span className="tld-chip-l">1인당(원)</span>
          </div>
          <div className="tld-chip">
            <span className="tld-chip-v">{summary.checkDone}/{summary.checkTotal}</span>
            <span className="tld-chip-l">준비물</span>
          </div>
          <div className="tld-chip">
            <span className="tld-chip-v">{photos.length}</span>
            <span className="tld-chip-l">사진</span>
          </div>
        </div>

        {selectedAcc && (
          <div className="tld-accom">🏨 확정 숙소 · <strong>{selectedAcc.name}</strong></div>
        )}

        {/* 일정 타임라인 */}
        {summary.days.length > 0 && (
          <section className="tld-section">
            <h3 className="tld-h">🗺️ 여행 일정</h3>
            <div className="tld-timeline">
              {summary.days.map((day) => (
                <div key={day} className="tld-tl-day">
                  <span className="tld-tl-dot" />
                  <div className="tld-tl-content">
                    <div className="tld-tl-daylabel">{day}</div>
                    <ul className="tld-tl-list">
                      {summary.grouped[day].map((p) => (
                        <li key={p.id}>
                          {p.time_label && <span className="tld-time">{p.time_label}</span>}
                          <span className="tld-tl-title">{p.title}</span>
                          {p.location && <span className="tld-loc">📍{p.location}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 사진 갤러리 */}
        <section className="tld-section">
          <div className="tld-section-header">
            <h3 className="tld-h">📸 사진 <span className="tld-count">{photos.length}/{MAX_PHOTOS}</span></h3>
            {photos.length > 0 && uploadLabel}
          </div>

          {photos.length === 0 ? (
            <label className={`tld-photos-empty${uploading ? ' disabled' : ''}`}>
              <div className="tld-photos-empty-icon">🖼️</div>
              <p>{uploading ? '업로드 중…' : '여행 사진을 남겨보세요'}</p>
              <span>탭해서 추가 (최대 {MAX_PHOTOS}장)</span>
              <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          ) : (
            <div className="tld-photo-grid">
              {photos.map((photo, i) => (
                <div key={photo.id} className="tld-photo" onClick={() => setViewerIndex(i)}>
                  <img src={photo.url} alt="여행 사진" loading="lazy" />
                  <div className="tld-photo-by">{getDisplayName(membersMap, photo.uploaded_by, { fallback: '' })}</div>
                  {(photo.uploaded_by === user.id || isAdmin) && (
                    <button
                      className="tld-photo-del"
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo) }}
                      title="삭제"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 사진 크게 보기 (라이트박스) */}
      <AnimatePresence>
        {viewerIndex !== null && photos[viewerIndex] && (
          <motion.div
            className="tld-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewerIndex(null)}
          >
            <button className="tld-viewer-close" onClick={() => setViewerIndex(null)} aria-label="닫기">✕</button>
            <span className="tld-viewer-count">{viewerIndex + 1} / {photos.length}</span>

            {photos.length > 1 && (
              <button
                className="tld-viewer-nav prev"
                onClick={(e) => { e.stopPropagation(); showPrev() }}
                aria-label="이전"
              >‹</button>
            )}

            <motion.img
              key={photos[viewerIndex].id}
              className="tld-viewer-img"
              src={photos[viewerIndex].url}
              alt="여행 사진"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            />

            {photos.length > 1 && (
              <button
                className="tld-viewer-nav next"
                onClick={(e) => { e.stopPropagation(); showNext() }}
                aria-label="다음"
              >›</button>
            )}

            <div className="tld-viewer-by">
              {getDisplayName(membersMap, photos[viewerIndex].uploaded_by, { fallback: '' })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
