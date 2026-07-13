import fs from 'fs'
import * as d3geo from 'd3-geo'

const W = 340
const H = 420

const rawData = fs.readFileSync('./public/korea-provinces.json', 'utf8')
const geoJson = JSON.parse(rawData)

const projection = d3geo.geoMercator().fitSize([W, H], geoJson)
const pathGen = d3geo.geoPath().projection(projection)

const result = geoJson.features.map(feat => {
  const name = feat.properties.NAME_1 || feat.properties.name || feat.properties.CTP_KOR_NM || ''
  const d = pathGen(feat)
  const centroid = d3geo.geoCentroid(feat)
  const projected = projection(centroid)
  return {
    name,
    path: d,
    cx: projected ? projected[0] : 0,
    cy: projected ? projected[1] : 0
  }
})

fs.writeFileSync('./src/data/korea-map-paths.json', JSON.stringify(result, null, 2))
console.log('Saved to src/data/korea-map-paths.json')
