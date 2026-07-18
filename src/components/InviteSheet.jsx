import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { UserPlus, Check, Link2, Share2 } from 'lucide-react'

// 여행 초대: 공유 링크 + QR 코드
export default function InviteSheet({ open, onClose, tripId }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const link = `${window.location.origin}/join/${tripId}`

  useEffect(() => {
    if (!open) return
    setCopied(false)
    QRCode.toDataURL(link, {
      width: 240,
      margin: 1,
      color: { dark: '#262319', light: '#fbfaf4' },
    })
      .then(setQr)
      .catch((e) => console.error(e))
  }, [open, link])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // 클립보드 실패 시 코드라도 안내
      window.prompt('아래 링크를 복사하세요', link)
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: '여행플랜 초대', text: '같이 여행 계획해요! ✈️', url: link })
      } catch {
        /* 사용자가 취소 */
      }
    } else {
      copyLink()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-handle" />
            <div className="modal-title"><UserPlus size={20} /> 여행에 초대하기</div>

            <div className="invite-qr-wrap">
              {qr ? (
                <img src={qr} alt="초대 QR 코드" className="invite-qr" />
              ) : (
                <div className="invite-qr placeholder">QR 생성 중…</div>
              )}
              <p className="invite-hint">친구가 이 QR을 스캔하면 바로 입장해요</p>
            </div>

            <div className="invite-code-row">
              <span className="invite-code-label">초대 코드</span>
              <span className="invite-code">{tripId}</span>
            </div>

            <div className="invite-link-box">
              <span className="invite-link-text">{link}</span>
            </div>

            <div className="invite-actions">
              <button className="btn btn-secondary btn-full" onClick={copyLink}>
                {copied ? <><Check size={16} /> 복사됨</> : <><Link2 size={16} /> 링크 복사</>}
              </button>
              <button className="btn btn-primary btn-full" onClick={share}>
<Share2 size={16} /> 공유하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
