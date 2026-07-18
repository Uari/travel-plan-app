import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './PlanDayMap.css'

// 하루 일정의 위치들을 Leaflet 지도에 번호 핀 + 동선(점선)으로 표시.
// react-leaflet 없이 vanilla Leaflet 사용(의존성 최소화).
// 기본 마커 아이콘 번들 이슈를 피하려고 divIcon(번호 핀)을 쓴다.
export default function PlanDayMap({ plans }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)

  const pts = (plans || []).filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
  )
  // 좌표가 바뀔 때만 다시 그리기 위한 키
  const ptsKey = pts.map((p) => `${p.id}:${p.lat},${p.lng}`).join('|')

  useEffect(() => {
    if (!elRef.current) return

    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }
    const map = mapRef.current

    // 타일을 제외한 기존 마커/라인 제거
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer)
    })

    if (pts.length === 0) {
      map.setView([36.5, 127.8], 6) // 대한민국 기본 뷰
      return
    }

    const latlngs = pts.map((p) => [p.lat, p.lng])

    pts.forEach((p, i) => {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'plan-pin',
          html: `<div class="plan-pin-inner"><span>${i + 1}</span></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .addTo(map)
        .bindPopup(
          `<b>${i + 1}. ${p.title || ''}</b>${p.location ? '<br>' + p.location : ''}`
        )
    })

    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        color: '#c1723f',
        weight: 3,
        opacity: 0.85,
        dashArray: '6 7',
      }).addTo(map)
    }

    map.fitBounds(latlngs, { padding: [30, 30], maxZoom: 14 })
    // 지도가 접혔다 펼쳐질 때 타일 깨짐 방지
    setTimeout(() => map.invalidateSize(), 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptsKey])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="plan-day-map-wrap">
      <div className="plan-day-map" ref={elRef} />
      {pts.length === 0 && (
        <div className="plan-day-map-empty">
          위치 정보가 있는 일정이 아직 없어요.<br />
          일정에 <b>장소</b>를 입력하고 저장하면 지도에 표시됩니다.
        </div>
      )}
    </div>
  )
}
