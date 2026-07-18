// 장소 검색 (OSM Nominatim · 무료 · API 키 불필요)
// 반환 형식: [{ name, address, lat, lng }]
// 참고: 한국의 세부 지명/아파트/지번은 OSM 데이터가 빈약해 못 찾을 수 있음.
//       그런 경우 지도에서 직접 클릭해 정확한 위치를 지정한다(LocationPicker).

async function nominatimSearch(query) {
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&accept-language=ko&q=' +
      encodeURIComponent(query)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = res.ok ? await res.json() : []
    return (Array.isArray(data) ? data : []).map((r) => ({
      name: r.name || r.display_name.split(',')[0],
      address: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))
  } catch {
    return []
  }
}

export async function searchPlaces(query) {
  const q = (query || '').trim()
  if (!q) return []
  return nominatimSearch(q)
}

// 좌표 → 주소명 (지도에서 직접 찍었을 때 위치 텍스트 채우기용, 베스트에포트)
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=ko&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const d = await res.json()
    return d?.display_name || null
  } catch {
    return null
  }
}
