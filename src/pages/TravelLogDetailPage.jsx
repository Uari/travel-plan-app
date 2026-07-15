import { useState, useEffect, useMemo } from 'react'
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

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

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
      <div className="travellog-detail">
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
          <p>여행 로그를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="travellog-detail">
        <header className="travellog-header">
          <button className="back-btn" onClick={() => navigate('/travel-log')}>← 여행 로그</button>
          <h2>여행 로그</h2>
          <div style={{ width: 48 }} />
        </header>
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <p>여행 정보를 찾을 수 없어요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="travellog-detail">
      <header className="travellog-header">
        <button className="back-btn" onClick={() => navigate('/travel-log')}>← 여행 로그</button>
        <h2>{trip.name}</h2>
        <div style={{ width: 48 }} />
      </header>

      <main className="travellog-detail-main">
        <div className="tld-place">{placeLabel()}</div>
        {trip.review_note && <p className="tld-review">“{trip.review_note}”</p>}

        {/* 계획 요약 */}
        <section className="tld-section">
          <h3 className="tld-section-title">📋 여행 요약</h3>
          <div className="tld-summary-grid">
            <div className="tld-stat">
              <span className="tld-stat-label">여행 시작일</span>
              <span className="tld-stat-value">{trip.start_date || '미정'}</span>
            </div>
            <div className="tld-stat">
              <span className="tld-stat-label">총 지출</span>
              <span className="tld-stat-value">{summary.total.toLocaleString()}원</span>
            </div>
            <div className="tld-stat">
              <span className="tld-stat-label">1인당 ({summary.memberCount}명)</span>
              <span className="tld-stat-value">{summary.perPerson.toLocaleString()}원</span>
            </div>
            <div className="tld-stat">
              <span className="tld-stat-label">준비물</span>
              <span className="tld-stat-value">{summary.checkDone}/{summary.checkTotal} 완료</span>
            </div>
            {selectedAcc && (
              <div className="tld-stat tld-stat-wide">
                <span className="tld-stat-label">확정 숙소</span>
                <span className="tld-stat-value">🏨 {selectedAcc.name}</span>
              </div>
            )}
          </div>

          {summary.days.length > 0 && (
            <div className="tld-itinerary">
              {summary.days.map((day) => (
                <div key={day} className="tld-day">
                  <div className="tld-day-label">{day}</div>
                  <ul className="tld-day-list">
                    {summary.grouped[day].map((p) => (
                      <li key={p.id}>
                        {p.time_label && <span className="tld-time">{p.time_label}</span>}
                        <span>{p.title}</span>
                        {p.location && <span className="tld-loc">📍{p.location}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 여행 사진 */}
        <section className="tld-section">
          <div className="tld-section-header">
            <h3 className="tld-section-title">📸 여행 사진 ({photos.length}/{MAX_PHOTOS})</h3>
            <label className={`btn btn-primary btn-sm tld-upload-btn${uploading || photos.length >= MAX_PHOTOS ? ' disabled' : ''}`}>
              {uploading ? '업로드 중...' : '+ 사진 추가'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                disabled={uploading || photos.length >= MAX_PHOTOS}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <div className="tld-photos-empty">
              <p>아직 올린 사진이 없어요.</p>
              <p>다녀온 여행의 사진을 남겨보세요!</p>
            </div>
          ) : (
            <div className="tld-photo-grid">
              {photos.map((photo) => (
                <div key={photo.id} className="tld-photo">
                  <img src={photo.url} alt="여행 사진" loading="lazy" />
                  <div className="tld-photo-by">{getDisplayName(membersMap, photo.uploaded_by, { fallback: '' })}</div>
                  {(photo.uploaded_by === user.id || isAdmin) && (
                    <button className="tld-photo-del" onClick={() => handleDeletePhoto(photo)} title="삭제">✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
