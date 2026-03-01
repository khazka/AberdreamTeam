const express = require('express')
const cors    = require('cors')
const path    = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', 'client', '.env.local') })

const app = express()
app.use(cors())
app.use(express.json())

// ══ IN-MEMORY STORE (replace with Supabase/SQLite for persistence) ══
const users  = {}
const groups = {}

groups['GR7X'] = {
  code: 'GR7X', goal: 50, progress: 34,
  members: [
    { name: 'Jamie R.',  pts: 1240, trips: 24, av: '🧑' },
    { name: 'Priya M.',  pts: 980,  trips: 19, av: '👩' },
    { name: 'Alex T.',   pts: 720,  trips: 14, av: '🧔' },
    { name: 'Chris W.',  pts: 560,  trips: 11, av: '👨' },
    { name: 'Sofia L.',  pts: 430,  trips: 9,  av: '👩' },
  ]
}

// ══ HELPERS ══
function calcCalories(mode, distanceKm) {
  const MET   = { walking:3.5, bicycling:7.5, transit:1.3, driving:1.2 }
  const speed = { walking:5,   bicycling:15,  transit:25,  driving:30  }
  return Math.round((MET[mode]||1.2) * 75 * (distanceKm / (speed[mode]||30)))
}
function calcCost(mode, distanceKm) {
  const perKm = { walking:0, bicycling:0, transit:0.18, driving:1.5 }
  const base  = { walking:0, bicycling:0, transit:1.20, driving:2.5 }
  return (base[mode]||0) + (perKm[mode]||0) * distanceKm
}
function calcXP(appMode, co2Saved) {
  const base = { walk:30, cycle:35, bus:20, taxi:0 }
  return (base[appMode]||0) + Math.round(parseFloat(co2Saved||0) * 10)
}
function getMockWeather() {
  return { isRaining:true, isSnowing:false, isBadWind:false, isSurgeTime:false,
    description:'light rain', temp:12, feelsLike:10, windSpeed:'4.2',
    rainyDayScore:78, surgeWarning:false,
    nudgeMessage:'Rain expected. Bus route stays dry. Still a green win today.' }
}
function getMockRoutes() {
  return [
    { mode:'walking',   appMode:'walk',  durationMin:28, distanceKm:'2.10', co2Kg:'0.000', calories:142, cost:'0.00',  isSurge:false, surgeMultiplier:1, co2Saved:'0.359', moneySaved:'5.91', plasticBottles:'0.2', treesEquiv:'0.017', xpEarned:34 },
    { mode:'bicycling', appMode:'cycle', durationMin:14, distanceKm:'2.10', co2Kg:'0.000', calories:198, cost:'0.00',  isSurge:false, surgeMultiplier:1, co2Saved:'0.359', moneySaved:'5.91', plasticBottles:'0.2', treesEquiv:'0.017', xpEarned:39 },
    { mode:'transit',   appMode:'bus',   durationMin:18, distanceKm:'2.10', co2Kg:'0.187', calories:12,  cost:'1.58',  isSurge:false, surgeMultiplier:1, co2Saved:'0.172', moneySaved:'4.33', plasticBottles:'0.1', treesEquiv:'0.008', xpEarned:22 },
    { mode:'driving',   appMode:'taxi',  durationMin:9,  distanceKm:'2.10', co2Kg:'0.359', calories:2,   cost:'11.20', isSurge:true,  surgeMultiplier:1.4, co2Saved:'0.000', moneySaved:'0.00', plasticBottles:'0.0', treesEquiv:'0.000', xpEarned:0 },
    { mode: 'train', appMode: 'train', durationMin:12, distanceKm: '2.1', co2Kg: '0.006', calories: 8, cost:'3.5', isSurge:false, surgeMultiplier:1, co2Saved:'0.353', moneySaved:'2.41', plasticBottles:'0.2', treesEquiv:'0.017', xpEarned:28 },
    { mode:'ev', appMode:'ev', durationMin:10, distanceKm:'2.10', co2Kg:'0.053', calories:2, cost:'1.20', isSurge:false, surgeMultiplier:1, co2Saved:'0.306', moneySaved:'1.91', plasticBottles:'0.1', treesEquiv:'0.014', xpEarned:22 },

  ]
}

// ══ CLIMATIQ — CO2 per transport mode ══
async function getCO2(googleMode, distanceKm) {
  const key = process.env.CLIMATIQ_KEY
  const DEFRA = { walking:0, bicycling:0, transit:0.089, driving:0.171 }
  if (!key || distanceKm === 0) return (DEFRA[googleMode]||0) * distanceKm

  const ACTIVITY_IDS = {
    transit: 'passenger_vehicle-vehicle_type_local_bus-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
    driving: 'passenger_vehicle-vehicle_type_taxi-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
    train: 'passenger_train-route_type_national_rail-fuel_source_na',
    ev: 'passenger_vehicle-vehicle_type_car-fuel_source_bev-engine_size_na-vehicle_age_na-vehicle_weight_na',
  }
  const activityId = ACTIVITY_IDS[googleMode]
  if (!activityId) return 0

  try {
    const r = await fetch('https://api.climatiq.io/estimate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emission_factor: { activity_id: activityId, data_version: '^21' },
        parameters: { distance: distanceKm, distance_unit: 'km' },
      }),
    })
    const data = await r.json()
    return data.co2e || (DEFRA[googleMode]||0) * distanceKm
  } catch {
    return (DEFRA[googleMode]||0) * distanceKm
  }
}

// ══ ROUTES — Google Maps Directions + Climatiq CO2 ══
app.get('/api/routes', async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'from and to required' })

  const key = process.env.GOOGLE_MAPS_KEY
  if (!key) return res.json(getMockRoutes())

  try {
    const modeMap = { walking:'walk', bicycling:'cycle', transit:'bus', driving:'taxi' }
    const modes = ['walking', 'bicycling', 'transit', 'driving']

    const results = await Promise.all(modes.map(async (mode) => {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&mode=${mode}&key=${key}&region=gb&units=metric`
      const r    = await fetch(url)
      const data = await r.json()
      if (data.status !== 'OK') return null

      const leg        = data.routes[0]?.legs[0]
      const distanceKm = (leg?.distance?.value || 0) / 1000
      const durationMin = Math.round((leg?.duration?.value || 0) / 60)
      const co2Kg      = await getCO2(mode, distanceKm)
      const calories   = calcCalories(mode, distanceKm)
      const rawCost    = calcCost(mode, distanceKm)
      const hour       = new Date().getHours()
      const isSurge    = mode === 'driving' && hour >= 17 && hour <= 19
      const surge      = isSurge ? 1.4 : 1.0
      const finalCost  = (rawCost * surge).toFixed(2)
      const polyline   = data.routes[0]?.overview_polyline?.points || ''

      return { mode, appMode: modeMap[mode], durationMin,
        distanceKm: distanceKm.toFixed(2), co2Kg: co2Kg.toFixed(3),
        calories, cost: finalCost, isSurge, surgeMultiplier: surge, polyline }
    }))

    const drivingRoute = results.find(r => r && r.mode === 'driving')
if (drivingRoute) {
  const dist = parseFloat(drivingRoute.distanceKm)
  const trainCO2 = await getCO2('train', dist)
  const evCO2 = await getCO2('ev', dist)
  results.push({
    mode:'train', appMode:'train',
    durationMin: Math.round(drivingRoute.durationMin * 1.3),
    distanceKm: drivingRoute.distanceKm,
    co2Kg: trainCO2.toFixed(3),
    calories: calcCalories('transit', dist),
    cost: (1.50 + dist * 0.22).toFixed(2),
    isSurge: false, surgeMultiplier: 1,
    polyline: drivingRoute.polyline
  })
  results.push({
    mode:'ev', appMode:'ev',
    durationMin: drivingRoute.durationMin,
    distanceKm: drivingRoute.distanceKm,
    co2Kg: evCO2.toFixed(3),
    calories: 2,
    cost: (0.50 + dist * 0.08).toFixed(2),
    isSurge: false, surgeMultiplier: 1,
    polyline: drivingRoute.polyline
  })
}


    const routes   = results.filter(Boolean)
    const taxiData = routes.find(r => r.mode === 'driving')

    routes.forEach(r => {
      const saved = taxiData ? Math.max(0, parseFloat(taxiData.co2Kg) - parseFloat(r.co2Kg)) : parseFloat(r.co2Kg)
      r.co2Saved       = saved.toFixed(3)
      r.moneySaved     = taxiData ? Math.max(0, parseFloat(taxiData.cost) - parseFloat(r.cost)).toFixed(2) : '0'
      r.plasticBottles = (saved * 0.47).toFixed(1)
      r.treesEquiv     = (saved / 21).toFixed(3)
      r.xpEarned       = calcXP(r.appMode, r.co2Saved)
    })

    res.json(routes)
  } catch (err) {
    console.error('Routes error:', err.message)
    res.json(getMockRoutes())
  }
})

// ══ WEATHER — OpenWeatherMap + Rainy Day Score ══
app.get('/api/weather', async (req, res) => {
  const city = req.query.city || 'Aberdeen'
  const key  = process.env.WEATHER_API_KEY
  if (!key) return res.json(getMockWeather())

  try {
    const r    = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`)
    const data = await r.json()
    if (data.cod !== 200) return res.json(getMockWeather())

    const main       = data.weather?.[0]?.main
    const isRaining  = ['Rain','Drizzle','Thunderstorm'].includes(main)
    const isSnowing  = main === 'Snow'
    const windSpeed  = data.wind?.speed || 0
    const isBadWind  = windSpeed > 10
    const hour       = new Date().getHours()
    const isSurgeTime = hour >= 17 && hour <= 19

    let score = 100
    if (isRaining) score -= 20
    if (isSnowing) score -= 35
    if (isBadWind) score -= 10
    if (isSurgeTime) score -= 5
    score = Math.max(10, Math.min(100, score))

    const msgs = []
    if (isSnowing) msgs.push('Snow forecast ❄️ — Bus is safest. Taxi surge likely.')
    else if (isRaining && isSurgeTime) msgs.push('Rain + peak hours = City Taxi surge (+40%). Bus is fully covered.')
    else if (isRaining) msgs.push('Rain expected. Bus route stays dry. Still a green win today.')
    else if (isBadWind) msgs.push('Strong winds — cycling is tough. Bus or walk are your best options.')
    else if (isSurgeTime) msgs.push('Peak hours — taxi surge likely. Bus or walk saves you money and CO₂.')
    else msgs.push('Great conditions for walking or cycling today 🌞')

    res.json({ isRaining, isSnowing, isBadWind, isSurgeTime,
      description: data.weather?.[0]?.description,
      temp: Math.round(data.main?.temp), feelsLike: Math.round(data.main?.feels_like),
      windSpeed: windSpeed.toFixed(1), icon: data.weather?.[0]?.icon,
      rainyDayScore: score, surgeWarning: isRaining && isSurgeTime,
      nudgeMessage: msgs[0] })
  } catch (err) {
    console.error('Weather error:', err.message)
    res.json(getMockWeather())
  }
})

// ══ USERS ══
app.post('/api/users', (req, res) => {
  const { name, email, avatar, persona } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })
  const id = `user_${Date.now()}`
  users[id] = { id, name, email, avatar, persona, xp:0, trips:[], createdAt: new Date().toISOString() }
  res.json(users[id])
})
app.get('/api/users/:id', (req, res) => {
  const u = users[req.params.id]
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u)
})

// ══ TRIPS ══
app.post('/api/trips', (req, res) => {
  const { userId, mode, from, to, distanceKm, co2Saved, moneySaved, calories } = req.body
  const BASE_XP = { walk:30, cycle:35, bus:20, taxi:0 }
  const xpEarned = (BASE_XP[mode]||0) + Math.round(parseFloat(co2Saved||0) * 10)
  const trip = { id:`trip_${Date.now()}`, userId, mode, from, to,
    distanceKm: parseFloat(distanceKm), co2Saved: parseFloat(co2Saved),
    moneySaved: parseFloat(moneySaved), calories: parseInt(calories),
    xpEarned, timestamp: new Date().toISOString() }
  if (userId && users[userId]) { users[userId].trips.push(trip); users[userId].xp += xpEarned }
  res.json({ trip, xpEarned })
})
app.get('/api/trips/:userId', (req, res) => {
  const u = users[req.params.userId]
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u.trips)
})
app.get('/api/impact/:userId', (req, res) => {
  const u = users[req.params.userId]
  if (!u) return res.status(404).json({ error: 'Not found' })
  const t = u.trips.reduce((a,t) => ({
    co2Saved:   a.co2Saved   + t.co2Saved,
    moneySaved: a.moneySaved + t.moneySaved,
    calories:   a.calories   + t.calories,
    tripCount:  a.tripCount  + 1,
  }), { co2Saved:0, moneySaved:0, calories:0, tripCount:0 })
  t.plasticBottles = (t.co2Saved * 0.47).toFixed(1)
  t.treesEquiv     = (t.co2Saved / 21).toFixed(3)
  t.xp             = u.xp
  res.json(t)
})

// ══ GROUPS ══
app.get('/api/groups/:code', (req, res) => {
  const g = groups[req.params.code.toUpperCase()]
  if (!g) return res.status(404).json({ error: 'Group not found' })
  res.json(g)
})
app.post('/api/groups/join', (req, res) => {
  const g = groups[req.body.code?.toUpperCase()]
  if (!g) return res.status(404).json({ error: 'Group not found' })
  res.json({ success:true, group:g })
})
app.post('/api/groups/create', (req, res) => {
  const code = Math.random().toString(36).substring(2,6).toUpperCase()
  groups[code] = { code, goal:50, progress:0, members:[] }
  res.json({ code, group: groups[code] })
})

app.get('/', (req, res) => res.json({ status:'Core2G API 🌿' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🌿 Core2G API → http://localhost:${PORT}`)
  console.log(`   Google Maps: ${process.env.GOOGLE_MAPS_KEY ? '✅' : '⚠️  mock'}`)
  console.log(`   Weather:     ${process.env.WEATHER_API_KEY ? '✅' : '⚠️  mock'}`)
  console.log(`   Climatiq:    ${process.env.CLIMATIQ_KEY    ? '✅' : '⚠️  DEFRA fallback'}\n`)
})
