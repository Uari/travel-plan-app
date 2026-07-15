import { motion, AnimatePresence } from 'framer-motion'

// 페이지 전반에서 반복되던 overlay + bottom sheet + handle 모달 구조를 공통화한 컴포넌트.
export default function BottomSheetModal({ open, onClose, children }) {
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
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
