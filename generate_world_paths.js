// 세계지도 SVG path를 사전 생성한다 (한국 지도의 generate_paths.js 패턴).
// world-atlas TopoJSON을 GeoJSON으로 변환 → d3-geo로 투영 → 국가별 path 산출.
// 다트 좌표는 국가별 대표 경위도를 "같은 투영"으로 변환해 지도와 정확히 정렬시킨다.
import fs from 'fs'
import * as d3geo from 'd3-geo'
import { feature } from 'topojson-client'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const world = require('world-atlas/countries-110m.json')

const W = 960
const H = 500

const fc = feature(world, world.objects.countries)

// geoNaturalEarth1: 세계지도에 널리 쓰는 균형 잡힌 투영
const projection = d3geo.geoNaturalEarth1().fitSize([W, H], fc)
const pathGen = d3geo.geoPath().projection(projection)

const countries = fc.features
  .map((feat) => ({ path: pathGen(feat) }))
  .filter((c) => c.path) // 투영 결과가 없는 항목 제외

// 여행 로그에서 지원하는 국가들의 대표 좌표 [경도, 위도].
// 소국/특별행정구(HK, SG, GU 등)는 지형 매칭이 불안정하므로 좌표를 직접 지정한다.
const COUNTRY_LNGLAT = {
  KR: [127.8, 36.5], JP: [138.2, 37.5], CN: [104.2, 35.9], TW: [121.0, 23.7],
  HK: [114.1, 22.4], TH: [100.9, 15.9], VN: [106.3, 16.2], PH: [122.9, 12.9],
  SG: [103.8, 1.35], MY: [109.7, 3.8], ID: [117.0, -2.5], US: [-98.5, 39.8],
  GU: [144.8, 13.4], AU: [134.5, -25.7], FR: [2.5, 46.6], IT: [12.6, 42.8],
  ES: [-3.7, 40.2], GB: [-1.5, 52.6], DE: [10.4, 51.2], CH: [8.2, 46.8],
  TR: [35.2, 39.0], AE: [54.0, 24.0],
}

const centroids = {}
for (const [code, lnglat] of Object.entries(COUNTRY_LNGLAT)) {
  const p = projection(lnglat)
  if (p) centroids[code] = { cx: Math.round(p[0] * 100) / 100, cy: Math.round(p[1] * 100) / 100 }
}

const result = { width: W, height: H, countries, centroids }
fs.writeFileSync('./src/data/world-map-paths.json', JSON.stringify(result))
console.log(`Saved ${countries.length} country paths + ${Object.keys(centroids).length} centroids to src/data/world-map-paths.json`)
