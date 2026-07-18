import React from 'react'
import { motion } from 'framer-motion'
import MAP_PATHS from '../data/korea-map-paths.json'

/**
 * 사전 렌더링된 정적 SVG Path 기반 실제 한국 행정구역 지도
 * 로딩 시간(Fetch + d3-geo 연산)이 0초로 즉시 렌더링됩니다.
 */

// 어스톤 트래블맵 팔레트 (세이지·올리브·머스터드·테라코타·클레이)
const PROVINCE_STYLES = {
  'Seoul':        { color: '#8fae91', short: '서울' },
  'Incheon':      { color: '#6f9073', short: '인천' },
  'Gyeonggi':     { color: '#4a6b52', short: '경기' },
  'Gangwon':      { color: '#7a9e8c', short: '강원' },
  'Chungcheongbuk': { color: '#cf9440', short: '충북' },
  'Chungcheongnam': { color: '#d9b46a', short: '충남' },
  'Daejeon':      { color: '#e0c88a', short: '대전' },
  'Sejong':       { color: '#e0c88a', short: '세종' },
  'Jeollabuk':    { color: '#9caa5e', short: '전북' },
  'Jeollanam':    { color: '#7d9150', short: '전남' },
  'Gwangju':      { color: '#6b7d42', short: '광주' },
  'Gyeongsangbuk': { color: '#c1723f', short: '경북' },
  'Daegu':        { color: '#a85f34', short: '대구' },
  'Gyeongsangnam': { color: '#cf8a5c', short: '경남' },
  'Ulsan':        { color: '#d68f63', short: '울산' },
  'Busan':        { color: '#c05a4e', short: '부산' },
  'Jeju':         { color: '#5a9e8f', short: '제주' },
}

// GADM의 영문 이름에서 스타일 찾기
function findStyle(name) {
  if (!name) return { color: '#8fae91', short: '' }
  // 한글 이름 처리
  const KR_MAP = {
    '서울특별시': 'Seoul', '인천광역시': 'Incheon', '경기도': 'Gyeonggi',
    '강원특별자치도': 'Gangwon', '강원도': 'Gangwon',
    '충청북도': 'Chungcheongbuk', '충청남도': 'Chungcheongnam',
    '대전광역시': 'Daejeon', '세종특별자치시': 'Sejong',
    '전라북도': 'Jeollabuk', '전북특별자치도': 'Jeollabuk',
    '전라남도': 'Jeollanam', '광주광역시': 'Gwangju',
    '경상북도': 'Gyeongsangbuk', '대구광역시': 'Daegu',
    '경상남도': 'Gyeongsangnam', '울산광역시': 'Ulsan',
    '부산광역시': 'Busan', '제주특별자치도': 'Jeju',
  }
  const key = KR_MAP[name] || Object.keys(PROVINCE_STYLES).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase())
  )
  return PROVINCE_STYLES[key] || { color: '#8fae91', short: name.slice(0, 2) }
}

function isActiveProvince(feature, result) {
  if (!result) return false
  const props = feature.properties
  const name = props.NAME_1 || props.name || props.CTP_KOR_NM || ''
  const style = findStyle(name)
  const rp = result.province
  if (!style.short) return false
  return style.short === rp ||
    (rp === '강원' && style.short === '강원') ||
    (rp === '전북' && style.short === '전북')
}

export default function KoreaMapSVG({ result, dartState }) {
  const isLanded = dartState === 'landed' && result
  const W = 340, H = 420

  // 사전 계산된 정적 경로 데이터를 스타일과 함께 매핑 (1회 연산, 즉시 로드)
  const pathData = MAP_PATHS.map(pd => {
    const style = findStyle(pd.name)
    // 활성 도 판별용 mock feature
    const mockFeat = { properties: { NAME_1: pd.name } }
    return { ...pd, style, mockFeat }
  })

  // 활성 도의 데이터 찾기
  const activeProv = isLanded ? pathData.find(d => isActiveProvince(d.mockFeat, result)) : null

  return (
    <div className="korea-map-wrapper">
      <svg
        viewBox={`0 0 ${W} ${H + 80}`}
        xmlns="http://www.w3.org/2000/svg"
        className={`korea-map-svg${dartState === 'flying' ? ' pulsing' : ''}`}
        aria-label="대한민국 행정구역 지도"
      >
        <defs>


          <linearGradient id="landFill3" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="var(--map-land-start)" />
            <stop offset="100%" stopColor="var(--map-land-end)" />
          </linearGradient>

          <filter id="gs3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="b1" />
            <feGaussianBlur stdDeviation="3" result="b2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="b2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="gm3" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="gsoft3" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="seaDots3" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--map-dots)" />
          </pattern>


        </defs>

        {/* 배경 (가득 채우기) */}
        <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#seaDots3)" />

        {/* 격자선 */}
        {[80, 160, 240, 320, 400].map((y, i) => (
          <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y}
            stroke="rgba(120,110,80,0.06)" strokeWidth="0.8" strokeDasharray="5,10" />
        ))}
        {[68, 136, 204, 272].map((x, i) => (
          <line key={`v${i}`} x1={x} y1="0" x2={x} y2={H}
            stroke="rgba(120,110,80,0.06)" strokeWidth="0.8" strokeDasharray="5,10" />
        ))}

        {/* 바다 이름 */}
        <text x="12" y={H / 2} fill="var(--map-text-sea)" fontSize="10"
          fontFamily="sans-serif" fontWeight="700"
          transform={`rotate(-90 12,${H / 2})`} textAnchor="middle" letterSpacing="3">서  해</text>
        <text x={W - 12} y={H / 2} fill="var(--map-text-sea)" fontSize="10"
          fontFamily="sans-serif" fontWeight="700"
          transform={`rotate(90 ${W - 12},${H / 2})`} textAnchor="middle" letterSpacing="3">동  해</text>
        <text x={W / 2} y={H - 8} fill="var(--map-text-sea)" fontSize="9"
          fontFamily="sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="4">남    해</text>

        {/* 로딩 표시 제거 (즉시 렌더링되므로 불필요) */}

        {/* 비활성 도들 (뒤에 렌더) */}
        {pathData
          .filter(pd => !isActiveProvince(pd.mockFeat, result))
          .map((pd, i) => (
            <g key={pd.name + i}>
              <path
                d={pd.path}
                fill="url(#landFill3)"
                stroke={`${pd.style.color}55`}
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
              {pd.style.short && (
                <text x={pd.cx} y={pd.cy + 3.5}
                  fill={`${pd.style.color}cc`}
                  fontSize="7.5" fontWeight="600" textAnchor="middle"
                  fontFamily="'Noto Sans KR', sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {pd.style.short}
                </text>
              )}
            </g>
          ))
        }

        {/* 활성 도 (앞에 렌더) */}
        {isLanded && activeProv && (
          <g key={`active-${activeProv.name}`}>
            {/* 고정된 강한 글로우 (애니메이션 안함) */}
            <path d={activeProv.path} fill={activeProv.style.color} opacity="0.15" filter="url(#gs3)" />
            {/* 중간 글로우 (애니메이션 안함) */}
            <path d={activeProv.path} fill="none" stroke={activeProv.style.color} strokeWidth="2.5" filter="url(#gm3)" />
            {/* 메인 도 (필터 없이 투명도만 애니메이션 - 성능 대폭 향상) */}
            <motion.path
              d={activeProv.path}
              fill={activeProv.style.color}
              stroke={activeProv.style.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              animate={{ fillOpacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <text x={activeProv.cx} y={activeProv.cy + 4}
              fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle"
              fontFamily="'Noto Sans KR', sans-serif" filter="url(#gsoft3)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {activeProv.style.short}
            </text>
          </g>
        )}



        {/* 다트 핀 */}
        {isLanded && activeProv && (
          <g>
            <motion.circle cx={activeProv.cx} cy={activeProv.cy - 18} r="5"
              fill="none" stroke="#d68f63" strokeWidth="2"
              initial={{ r: 5, opacity: 1 }}
              animate={{ r: 30, opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.circle cx={activeProv.cx} cy={activeProv.cy - 18} r="4"
              fill="none" stroke="#c1723f" strokeWidth="1.5"
              initial={{ r: 4, opacity: 0.9 }}
              animate={{ r: 20, opacity: 0 }}
              transition={{ duration: 1.4, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <circle cx={activeProv.cx} cy={activeProv.cy - 18} r="9" fill="#c1723f" filter="url(#gsoft3)" />
            <circle cx={activeProv.cx} cy={activeProv.cy - 18} r="4" fill="white" />
            <text x={activeProv.cx} y={activeProv.cy - 34} fontSize="18" textAnchor="middle">🎯</text>
          </g>
        )}

        {/* 독도 */}
        <g>
          <circle cx={W - 24} cy="148" r="5.5" fill="var(--map-compass-bg)" stroke="var(--map-compass-stroke)" strokeWidth="1.5" />
          <circle cx={W - 16} cy="142" r="3.5" fill="var(--map-compass-bg)" stroke="var(--map-compass-stroke)" strokeWidth="1" />
          <text x={W - 8} y="141" fill="var(--map-compass-text)" fontSize="7.5"
            fontFamily="sans-serif" fontWeight="700">독도</text>
        </g>

        {/* 나침반 */}
        <g transform={`translate(${W - 24}, ${H + 52})`}>
          <circle r="19" fill="var(--map-compass-bg)" stroke="var(--map-compass-stroke)" strokeWidth="1.5" />
          <text y="-7.5" fontSize="7.5" fill="var(--map-compass-text)" textAnchor="middle"
            fontFamily="sans-serif" fontWeight="800">N</text>
          <text y="14" fontSize="6.5" fill="var(--map-text-sea)" textAnchor="middle" fontFamily="sans-serif">S</text>
          <text x="-11" y="3.5" fontSize="6.5" fill="var(--map-text-sea)" textAnchor="middle" fontFamily="sans-serif">W</text>
          <text x="11" y="3.5" fontSize="6.5" fill="var(--map-text-sea)" textAnchor="middle" fontFamily="sans-serif">E</text>
          <polygon points="0,-12 2.5,0 0,4.5 -2.5,0" fill="var(--accent-secondary)" filter="url(#gsoft3)" />
          <polygon points="0,12 2.5,0 0,-4.5 -2.5,0" fill="var(--border-active)" />
          <circle r="2" fill="white" />
        </g>

        {/* 스케일 바 */}
        <g transform={`translate(18, ${H + 52})`}>
          <line x1="0" y1="0" x2="55" y2="0" stroke="var(--map-compass-stroke)" strokeWidth="1.5" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--map-compass-stroke)" strokeWidth="1.5" />
          <line x1="55" y1="-4" x2="55" y2="4" stroke="var(--map-compass-stroke)" strokeWidth="1.5" />
          <text x="27.5" y="-7.5" fontSize="7" fill="var(--map-compass-text)"
            textAnchor="middle" fontFamily="monospace">100 km</text>
        </g>
      </svg>
    </div>
  )
}
