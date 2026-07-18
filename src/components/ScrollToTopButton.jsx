import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 자기 자신의 위쪽 조상 중 실제 스크롤되는 컨테이너를 찾는다.
// (이 앱은 App.jsx의 <main overflow:auto>가 스크롤 컨테이너이고, window가 아니다)
function getScrollParent(node) {
  let el = node?.parentElement
  while (el) {
    const oy = getComputedStyle(el).overflowY
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return el
    el = el.parentElement
  }
  return window
}

export default function ScrollToTopButton({ threshold = 240 }) {
  const anchorRef = useRef(null)
  const scrollerRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scroller = getScrollParent(anchorRef.current)
    scrollerRef.current = scroller

    const getTop = () =>
      scroller === window ? window.scrollY : scroller.scrollTop
    const onScroll = () => setVisible(getTop() > threshold)

    scroller.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [threshold])

  const scrollToTop = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const target = scroller === window ? window : scroller
    target.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* 스크롤 컨테이너 탐색용 앵커 (보이지 않음) */}
      <span ref={anchorRef} aria-hidden style={{ display: 'none' }} />
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            className="scroll-top-btn"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            aria-label="맨 위로 이동"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>TOP</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
