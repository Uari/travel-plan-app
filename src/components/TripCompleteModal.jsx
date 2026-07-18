import { useState, useMemo } from 'react'
import { Check, PartyPopper } from 'lucide-react'
import BottomSheetModal from './BottomSheetModal.jsx'
import { SUPPORTED_COUNTRIES, KOREA_PROVINCES } from '../data/countries.js'
import { KOREA_DISTRICTS } from '../data/koreaDistricts.js'

// 여행 완료 처리 모달. 국가/지역/후기를 입력받아 onComplete로 payload를 넘긴다.
// 지도 다트는 도(道) 단위로만 배치되므로, 대한민국은 "도"를 필수로 받고 세부 지역(시/군/구)은 선택 입력이다.
export default function TripCompleteModal({ open, onClose, onComplete, submitting }) {
  const [countryCode, setCountryCode] = useState('KR')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')
  const [reviewNote, setReviewNote] = useState('')

  const isKorea = countryCode === 'KR'

  // 선택한 도에 속하는 전국 행정구역(시/군/구) 목록 (없으면 도 단위로만 기록)
  const districtsInProvince = useMemo(
    () => KOREA_DISTRICTS[province] || [],
    [province]
  )

  const canSubmit = isKorea ? Boolean(province) : Boolean(destinationLabel.trim())

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    if (isKorea) {
      onComplete({
        country_code: 'KR',
        region_province: province,
        region_id: district ? `${province}-${district}` : null,
        region_label: district ? `${province} ${district}` : province,
        destination_label: null,
        review_note: reviewNote.trim() || null,
      })
    } else {
      onComplete({
        country_code: countryCode,
        region_province: null,
        region_id: null,
        region_label: null,
        destination_label: destinationLabel.trim(),
        review_note: reviewNote.trim() || null,
      })
    }
  }

  return (
    <BottomSheetModal open={open} onClose={onClose}>
      <div className="modal-title"><Check size={20} /> 여행 완료하기</div>
      <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
        여행을 마무리하면 여행 로그에 기록됩니다. 다녀온 곳을 알려주세요.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">여행한 국가 *</label>
          <select
            className="input"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value)
              setProvince('')
              setDistrict('')
              setDestinationLabel('')
            }}
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isKorea ? (
          <>
            <div className="input-group">
              <label className="input-label">지역(도/광역시) *</label>
              <select
                className="input"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value)
                  setDistrict('')
                }}
                required
              >
                <option value="">선택하세요</option>
                {KOREA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {province && districtsInProvince.length > 0 && (
              <div className="input-group">
                <label className="input-label">세부 지역 (선택)</label>
                <select
                  className="input"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  {districtsInProvince.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="input-group">
            <label className="input-label">도시·지역 *</label>
            <input
              className="input"
              value={destinationLabel}
              onChange={(e) => setDestinationLabel(e.target.value)}
              placeholder="예: 오사카, 다낭, 파리"
              required
            />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">한 줄 후기 (선택)</label>
          <textarea
            className="input"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="이번 여행을 한 줄로 남겨보세요"
            maxLength={100}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={!canSubmit || submitting}>
            {submitting ? '처리 중...' : <><PartyPopper size={16} /> 여행 완료</>}
          </button>
        </div>
      </form>
    </BottomSheetModal>
  )
}
