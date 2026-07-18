import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { useTripContext } from '../context/TripContext.jsx'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js'
import { getDisplayName, canEditItem } from '../lib/tripMembers.js'
import BottomSheetModal from '../components/BottomSheetModal.jsx'
import ScrollToTopButton from '../components/ScrollToTopButton.jsx'
import './AccommodationPage.css'

export default function AccommodationPage() {
  const { user, tripId, membersMap, isAdmin, isCompleted } = useTripContext()
  const { data: fetchedAccommodations, loading, refetch: loadAccommodations, setData: setAccommodations } = useSupabaseQuery(
    () => supabase.from('accommodations').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
    [tripId]
  )
  // 정렬 기준: 추천순(좋아요) / 가격 낮은순 / 최신순
  const [sortBy, setSortBy] = useState('votes') // 'votes' | 'price' | 'recent'

  // 확정된 숙소는 어떤 정렬에서도 항상 최상단 유지
  const accommodations = useMemo(() => {
    const list = [...fetchedAccommodations]
    const compare = (a, b) => {
      if (sortBy === 'price') {
        // 미입력(0)은 뒤로 보냄
        const pa = a.price > 0 ? a.price : Infinity
        const pb = b.price > 0 ? b.price : Infinity
        return pa - pb
      }
      if (sortBy === 'recent') {
        return (b.created_at || '').localeCompare(a.created_at || '')
      }
      // votes (기본)
      return (b.votes?.length || 0) - (a.votes?.length || 0)
    }
    return list.sort((a, b) => {
      if (a.is_selected && !b.is_selected) return -1
      if (b.is_selected && !a.is_selected) return 1
      return compare(a, b)
    })
  }, [fetchedAccommodations, sortBy])

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    link_url: '',
    img_urls: [], // Existing URLs
    price: '',
    pros_cons: ''
  })
  const [selectedFiles, setSelectedFiles] = useState([]) // New files to upload
  const [isUploading, setIsUploading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const openAddModal = () => {
    setEditId(null)
    setForm({
      name: '',
      link_url: '',
      img_urls: [],
      price: '',
      pros_cons: ''
    })
    setSelectedFiles([])
    setShowModal(true)
  }

  const handleEdit = (acc) => {
    setEditId(acc.id)
    setForm({
      name: acc.name || '',
      link_url: acc.link_url || '',
      img_urls: acc.img_urls || (acc.img_url ? [acc.img_url] : []),
      price: acc.price || '',
      pros_cons: acc.pros_cons || ''
    })
    setSelectedFiles([])
    setShowModal(true)
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      if (form.img_urls.length + selectedFiles.length + filesArray.length > 5) {
        alert("숙소 사진은 최대 5장까지만 업로드할 수 있습니다.")
        return
      }
      setSelectedFiles(prev => [...prev, ...filesArray])
    }
  }

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index) => {
    setForm(prev => ({ ...prev, img_urls: prev.img_urls.filter((_, i) => i !== index) }))
  }

  const handleAddOrEdit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setIsUploading(true)
    try {
      let finalImgUrls = [...form.img_urls]

      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
          const filePath = `images/${fileName}`

          const { error } = await supabase.storage.from('travel_images').upload(filePath, file)
          if (error) throw error

          const { data } = supabase.storage.from('travel_images').getPublicUrl(filePath)
          return data.publicUrl
        })

        const results = await Promise.allSettled(uploadPromises)

        const successfulUrls = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)

        if (successfulUrls.length < selectedFiles.length) {
          alert('일부 이미지 업로드에 실패했습니다. 성공한 이미지만 저장됩니다.')
        }

        finalImgUrls = [...finalImgUrls, ...successfulUrls]
      }

      const payload = {
        name: form.name.trim(),
        link_url: form.link_url.trim() || null,
        img_urls: finalImgUrls,
        price: Number(form.price) || 0,
        pros_cons: form.pros_cons.trim() || null,
        trip_id: tripId,
        created_by: user.name, // For backward compatibility
        user_id: user.id
      }

      // For backwards compatibility, update img_url to the first image if any
      if (finalImgUrls.length > 0) {
        payload.img_url = finalImgUrls[0]
      } else {
        payload.img_url = null
      }

      if (editId) {
        const { error } = await supabase.from('accommodations').update(payload).eq('id', editId)
        if (!error) {
          setShowModal(false)
          setEditId(null)
          loadAccommodations()
        }
      } else {
        const { error } = await supabase.from('accommodations').insert(payload)
        if (!error) {
          setShowModal(false)
          loadAccommodations()
        }
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('이 숙소 후보를 삭제하시겠습니까?')) {
      const { error } = await supabase.from('accommodations').delete().eq('id', id)
      if (!error) loadAccommodations()
    }
  }

  const toggleVote = async (acc) => {
    const currentVotes = acc.votes || []
    const hasVotedID = currentVotes.includes(user.id)
    const hasVotedName = currentVotes.includes(user.name)
    const hasVoted = hasVotedID || hasVotedName

    let newVotes
    if (hasVoted) {
      newVotes = currentVotes.filter((v) => v !== user.id && v !== user.name)
    } else {
      newVotes = [...currentVotes, user.id]
    }

    // 1) 낙관적 업데이트: 서버 왕복을 기다리지 않고 로컬 목록만 즉시 갱신한다.
    //    → useMemo 정렬이 곧바로 재계산되고 motion.div의 layout 애니메이션이
    //      카드 위치만 부드럽게 이동시킨다(스크롤/화면은 그대로 유지).
    setAccommodations((prev) =>
      prev.map((a) => (a.id === acc.id ? { ...a, votes: newVotes } : a))
    )

    // 2) DB 동기화는 백그라운드로. 실패했을 때만 서버 상태로 되돌린다.
    const { error } = await supabase
      .from('accommodations')
      .update({ votes: newVotes })
      .eq('id', acc.id)

    if (error) {
      console.error(error)
      loadAccommodations() // 실패 시 서버 기준으로 복구
    }
  }

  const selectAccommodation = async (id) => {
    if (!isAdmin) {
      alert("숙소 확정은 방장만 가능합니다.")
      return
    }
    if (confirm('이 숙소를 최종 숙소로 확정할까요?\n다른 숙소들의 확정 상태는 취소됩니다.')) {
      // 1. 모든 숙소 확정 취소
      await supabase.from('accommodations').update({ is_selected: false }).eq('trip_id', tripId)
      // 2. 선택된 숙소 확정
      const { error } = await supabase.from('accommodations').update({ is_selected: true }).eq('id', id)
      if (!error) loadAccommodations()
    }
  }

  return (
    <div className="accommodation-page">
      <ScrollToTopButton />
      <div className="page-header">
        <h2 className="page-title">숙소 결정하기 🏨</h2>
        <p className="page-subtitle">후보를 올리고 팀원들과 투표해서 최종 숙소를 결정하세요!</p>
      </div>

      {accommodations.length > 1 && (
        <div className="acc-sort">
          {[
            { key: 'votes', label: '추천순' },
            { key: 'price', label: '가격 낮은순' },
            { key: 'recent', label: '최신순' },
          ].map((opt) => (
            <button
              key={opt.key}
              className={`acc-sort-btn${sortBy === opt.key ? ' active' : ''}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="accommodation-list">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'floatLoading 1.5s ease-in-out infinite' }}>✈️</div>
            <p>여행 데이터를 불러오는 중...</p>
          </div>
        ) : accommodations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛏️</div>
            <p>등록된 숙소 후보가 없습니다.<br/>새로운 숙소를 등록해보세요!</p>
          </div>
        ) : (
          accommodations.map((acc) => {
            const images = acc.img_urls && acc.img_urls.length > 0 ? acc.img_urls : (acc.img_url ? [acc.img_url] : [])
            const memberInfo = membersMap[acc.user_id]
            const displayAuthor = getDisplayName(membersMap, acc.user_id, { fallback: acc.created_by || '알 수 없음' })

            const canEditDelete = !isCompleted && canEditItem(isAdmin, acc, user)
            const hasMyVote = acc.votes?.includes(user.id) || acc.votes?.includes(user.name)

            return (
              <motion.div
                key={acc.id}
                className={`acc-card ${acc.is_selected ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
              >
                {acc.is_selected && (
                  <div className="acc-badge-selected">✨ 최종 확정 숙소 ✨</div>
                )}
                
                <div className="acc-card-inner">
                  {images.length > 0 ? (
                    <div className="acc-carousel">
                      {images.map((img, i) => (
                        <img key={i} src={img} alt="숙소 이미지" className="acc-carousel-img" />
                      ))}
                    </div>
                  ) : (
                    <div className="acc-image-placeholder">🏨</div>
                  )}
                  
                  <div className="acc-info">
                    <div className="acc-header">
                      <h3 className="acc-name" style={{ opacity: memberInfo?.is_deleted ? 0.6 : 1 }}>{acc.name}</h3>
                      {acc.link_url && (
                        <a href={acc.link_url} target="_blank" rel="noreferrer" className="acc-link-btn">
                          🔗 링크 보기
                        </a>
                      )}
                    </div>
                    
                    <div className="acc-price">
                      💰 예상 {acc.price.toLocaleString()}원 / 1박
                    </div>
                    
                    {acc.pros_cons && (
                      <div className="acc-pros-cons">
                        <strong>📝 장단점 및 특징:</strong>
                        <p>{acc.pros_cons}</p>
                      </div>
                    )}

                    <div className="acc-footer">
                      <span className="acc-author" style={{ opacity: memberInfo?.is_deleted ? 0.6 : 1 }}>
                        등록: <span style={{ color: memberInfo?.is_deleted ? 'var(--accent-rose)' : 'inherit' }}>{displayAuthor}</span>
                      </span>
                        <div className="acc-actions">
                          <button
                            className={`vote-btn ${hasMyVote ? 'voted' : ''}`}
                            onClick={() => !isCompleted && toggleVote(acc)}
                            disabled={isCompleted}
                            style={isCompleted ? { cursor: 'default' } : undefined}
                          >
                            👍 {acc.votes?.length || 0}
                          </button>
                          {(!acc.is_selected && isAdmin && !isCompleted) && (
                            <button className="select-btn" onClick={() => selectAccommodation(acc.id)}>
                              ✅ 확정하기
                            </button>
                          )}
                          {canEditDelete && (
                            <>
                              <button className="delete-btn" onClick={() => handleEdit(acc)} title="수정">
                                ✏️
                              </button>
                              <button className="delete-btn" onClick={() => handleDelete(acc.id)} title="삭제">
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {!isCompleted && (
        <button className="fab-button" onClick={openAddModal} title="숙소 후보 추가">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}

      {/* Add Modal */}
      <BottomSheetModal open={showModal} onClose={() => setShowModal(false)}>
              <h3 className="modal-title">✨ 숙소 후보 {editId ? '수정' : '등록'}</h3>
              <form onSubmit={handleAddOrEdit} className="acc-form">
                <div className="input-group">
                  <label className="input-label">숙소 이름 *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="예: 강릉 오션뷰 펜션"
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">1박 예상 가격</label>
                  <input
                    type="number"
                    name="price"
                    className="input"
                    value={form.price}
                    onChange={handleInputChange}
                    placeholder="예: 150000"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">예약 링크 (URL)</label>
                  <input
                    type="url"
                    name="link_url"
                    className="input"
                    value={form.link_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">사진 업로드 (최대 5장)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="file-input"
                    disabled={form.img_urls.length + selectedFiles.length >= 5}
                  />
                  <div className="image-preview-list" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {form.img_urls.map((url, idx) => (
                      <div key={'old-'+idx} style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                        <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        <button type="button" onClick={() => removeExistingImage(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                    {selectedFiles.map((file, idx) => (
                      <div key={'new-'+idx} style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                        <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', overflow: 'hidden' }}>
                          새 파일
                        </div>
                        <button type="button" onClick={() => removeSelectedFile(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">장단점 및 특징</label>
                  <textarea
                    name="pros_cons"
                    className="input"
                    value={form.pros_cons}
                    onChange={handleInputChange}
                    placeholder="수영장이 넓음, 조식 맛있음 등"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isUploading}>
                    취소
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isUploading}>
                    {isUploading ? '업로드 중...' : '저장하기'}
                  </button>
                </div>
              </form>
      </BottomSheetModal>
    </div>
  )
}
