import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const maxVUs = Math.max(1, Number(__ENV.MAX_VUS || 100))
const firstStage = Math.min(25, maxVUs)
const secondStage = Math.min(50, maxVUs)

export const options = {
  stages: [
    { duration: '2m', target: firstStage },
    { duration: '2m', target: secondStage },
    { duration: '5m', target: maxVUs },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
}

const homeRequests = [
  '/api/categories/',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&promoted=true&ordering=-created_at',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&ordering=distance',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&offer_type=flash_sale',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&offer_type=clearance',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&max_price=499',
  '/api/offers/?lat=23.2599&lng=77.4126&radius_km=15&min_discount=50&ordering=-discount',
  '/api/businesses/?lat=23.2599&lng=77.4126&radius_km=15&city=Bhopal',
]

export default function () {
  const responses = http.batch(
    homeRequests.map((path) => ({ method: 'GET', url: `${baseUrl}${path}` }))
  )
  check(responses, {
    'all home feed requests return 200': (results) => results.every((response) => response.status === 200),
  })
  sleep(1 + Math.random() * 2)
}
