import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { searchPlaces } from '../lib/placeSearch.js'
import './LocationPicker.css'

// 지도 위치 지정 (카카오 키 불필요, Leaflet+OSM)
//  - 상단 검색창: 장소 검색 → 결과 선택 시 지도 이동 + 핀 + 좌표/이름 확정
//  - 지도 직접 클릭: 그 지점에 핀 + 좌표 확정(이름은 부모가 역지오코딩)
export default function LocationPicker({ lat, lng, onPick }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const pinIcon = L.divIcon({
    className: 'loc-pick-pin',
    html: '<div class="loc-pick-pin-inner"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  })

  const placeMarker = (la, ln) => {
    const map = mapRef.current
    if (!map) return
    if (markerRef.current) markerRef.current.setLatLng([la, ln])
    else markerRef.current = L.marker([la, ln], { icon: pinIcon }).addTo(map)
  }

  useEffect(() => {
    if (!elRef.current || mapRef.current) return

    const hasCoord = typeof lat === 'number' && typeof lng === 'number'
    const start = hasCoord ? [lat, lng] : [36.5, 127.8]
    const zoom = hasCoord ? 15 : 6

    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(start, zoom)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    if (hasCoord) markerRef.current = L.marker(start, { icon: pinIcon }).addTo(map)

    map.on('click', (e) => {
      const { lat: la, lng: ln } = e.latlng
      placeMarker(la, ln)
      onPickRef.current({ lat: la, lng: ln })
    })

    setTimeout(() => map.invalidateSize(), 60)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleQuery = (text) => {
    setQuery(text)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!text || text.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setOpen(true)
      try {
        setResults(await searchPlaces(text.trim()))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const pickResult = (r) => {
    if (mapRef.current) mapRef.current.setView([r.lat, r.lng], 16)
    placeMarker(r.lat, r.lng)
    onPickRef.current({ lat: r.lat, lng: r.lng, label: r.name })
    setQuery(r.name)
    setOpen(false)
    setResults([])
  }

  return (
    <div className="loc-picker">
      <div className="loc-picker-guide">
        <div className="loc-picker-guide-title">📍 위치 지정하는 법</div>
        <div className="loc-picker-guide-step">
          <span className="loc-picker-guide-num">1</span>
          검색란에 <b>동·지역명</b>을 입력해 지도를 그 근처로 이동
        </div>
        <div className="loc-picker-guide-step">
          <span className="loc-picker-guide-num">2</span>
          지도에서 <b>정확한 위치를 클릭</b>해 핀을 찍어 지정
        </div>
      </div>

      <div className="loc-picker-search">
        <input
          className="input"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true) }}
          placeholder="🔍 동·지역명 검색 (예: 하안동, 해운대)"
          autoComplete="off"
        />
        {open && (loading || results.length > 0) && (
          <ul className="loc-search-list">
            {loading && <li className="loc-search-loading">검색 중…</li>}
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`} className="loc-search-item" onClick={() => pickResult(r)}>
                <span className="loc-search-name">📍 {r.name}</span>
                {r.address && <span className="loc-search-addr">{r.address}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="loc-picker-map" ref={elRef} />
    </div>
  )
}
