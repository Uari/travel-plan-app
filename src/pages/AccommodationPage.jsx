import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import './AccommodationPage.css'

export default function AccommodationPage({ user, tripId, membersMap, isAdmin }) {
  const [accommodations, setAccommodations] = useState([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    if (tripId) {
      loadAccommodations()
    }
  }, [tripId])

  const loadAccommodations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // 투표 수 기준으로 정렬 (내림차순), 확정된 숙소가 있다면 맨 위로
      const sorted = [...data].sort((a, b) => {
        if (a.is_selected) return -1
        if (b.is_selected) return 1
        return (b.votes?.length || 0) - (a.votes?.length || 0)
      })
      setAccommodations(sorted)
    } else {
      console.error("Accommodation fetch error:", error)
      setAccommodations([])
    }
    setLoading(false)
  }

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
    setIsUploading(false)
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

    const { error } = await supabase
      .from('accommodations')
      .update({ votes: newVotes })
      .eq('id', acc.id)

    if (!error) loadAccommodations()
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
      <div className="page-header">
        <h2 className="page-title">숙소 결정하기 🏨</h2>
        <p className="page-subtitle">후보를 올리고 팀원들과 투표해서 최종 숙소를 결정하세요!</p>
      </div>

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
            const displayAuthor = memberInfo 
              ? `${memberInfo.name}${memberInfo.is_deleted ? ' (탈퇴함)' : ''}`
              : (acc.created_by || '알 수 없음')
              
            const canEditDelete = isAdmin || acc.user_id === user.id || acc.created_by === user.name
            const hasMyVote = acc.votes?.includes(user.id) || acc.votes?.includes(user.name)

            return (
              <motion.div
                key={acc.id}
                className={`acc-card ${acc.is_selected ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
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
                        등록: <span style={{ color: memberInfo?.is_deleted ? '#ef4444' : 'inherit' }}>{displayAuthor}</span>
                      </span>
                        <div className="acc-actions">
                          <button
                            className={`vote-btn ${hasMyVote ? 'voted' : ''}`}
                            onClick={() => toggleVote(acc)}
                          >
                            👍 {acc.votes?.length || 0}
                          </button>
                          {(!acc.is_selected && isAdmin) && (
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

      <button className="fab-button" onClick={openAddModal} title="숙소 후보 추가">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
