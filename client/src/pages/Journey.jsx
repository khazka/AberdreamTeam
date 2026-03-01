import { useState, useEffect } from 'react'
import RouteCard from '../components/RouteCard'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { co2ToImpact } from '../utils/impact'
import { getRoutes, getWeather, logTrip } from '../utils/api'
import { GoogleMap, useJsApiLoader, Polyline, Marker, Autocomplete } from '@react-google-maps/api'

const GMAP_LIBS = ['places']

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const ABERDEEN_CENTER = { lat: 57.1497, lng: -2.0943 }
const ROUTE_COLORS = { walk:'#16a34a', cycle:'#3b82f6', bus:'#8b5cf6', taxi:'#ef4444', train:'#10b981', ev:'#6366f1' }

function decodePolyline(encoded) {
  const points = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

function formatDuration(mins) {
  const total = Math.round(Number(mins) || 0)
  if (total < 60) return `${total} min`

  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

const MODE_CONFIG = {
  walk:  { emoji:'🚶', name:'Walk',      badgeClass:'badge-green'  },
  cycle: { emoji:'🚴', name:'Cycle',     badgeClass:'badge-blue'   },
  bus:   { emoji:'🚌', name:'Bus',       badgeClass:'badge-purple' },
  taxi:  { emoji:'🚕', name:'City Taxi', badgeClass:'badge-red'    },
  train: { emoji:'🚆', name:'Train', badge:'🌱 Low Carbon', badgeClass:'badge-green' },
ev:    { emoji:'⚡', name:'EV Car', badge:'🔋 Electric',   badgeClass:'badge-blue'  },
}

function LogTripModal({ route, onClose, onConfirm }) {
  if (!route) return null
  const impact = co2ToImpact(parseFloat(route.co2Saved || 0))
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
        <div className="modal-title">Trip Logged!</div>
        <p className="modal-sub">You just made a green choice. Here's what it saved:</p>
        <div className="logtrip-stats">
          <div className="lt-chip"><div className="lt-val">{route.co2Saved}kg</div><div className="lt-lbl">CO₂ saved</div></div>
          <div className="lt-chip"><div className="lt-val">🌊 {impact.plasticBottles}</div><div className="lt-lbl">Plastic bottles</div></div>
          <div className="lt-chip"><div className="lt-val">+{route.xpEarned} XP</div><div className="lt-lbl">Green score</div></div>
        </div>
        <button className="modal-btn" onClick={onConfirm}>Track My Impact →</button>
        <button className="modal-skip" onClick={onClose}>Skip for now</button>
      </div>
    </div>
  )
}

export default function Journey({ user, showToast, onNeedSignup, onTripLogged }) {
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [routes, setRoutes]     = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [weather, setWeather]   = useState(null)
  const [selected, setSelected] = useState('walk')
  const [persona, setPersona]   = useState('planet')
  const [loading, setLoading]   = useState(false)
  const [rdsWidth, setRdsWidth] = useState(0)
  const [showLog, setShowLog]   = useState(false)
  const [cityName, setCityName] = useState('Aberdeen')

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
    libraries: GMAP_LIBS,
  })
  const [fromAC, setFromAC] = useState(null)
  const [toAC, setToAC]     = useState(null)
  const [mapRef, setMapRef]  = useState(null)

  // Extract city name from a place string (e.g. "Aberdeen Station" -> "Aberdeen")
  const extractCity = (place) => {
    if (!place) return 'Aberdeen'
    const parts = place.split(',').map(s => s.trim())
    // If it has comma-separated parts, use the second-to-last or first meaningful one
    if (parts.length >= 2) return parts[parts.length - 2] || parts[0]
    // Otherwise take the first word (often the city)
    return parts[0].split(' ')[0] || 'Aberdeen'
  }

  const fetchWeather = (city) => {
    getWeather(city)
      .then(w => { setWeather(w); setTimeout(() => setRdsWidth(w.rainyDayScore), 400) })
      .catch(() => setTimeout(() => setRdsWidth(78), 400))
  }

  useEffect(() => {
  getWeather(from.split(',')[0].trim() || 'Aberdeen')
    .then(w => { setWeather(w); setTimeout(() => setRdsWidth(w.rainyDayScore), 400) })
    .catch(() => setTimeout(() => setRdsWidth(78), 400))
}, [])

  useEffect(() => {
  if (!navigator.geolocation) {
    console.log("Geolocation not supported")
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    },
    (error) => {
      console.error("Location error:", error)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
    }
  )
}, [])

  const onFromPlaceChanged = () => {
    if (fromAC) { const p = fromAC.getPlace(); if (p?.formatted_address) setFrom(p.formatted_address) }
  }
  const onToPlaceChanged = () => {
    if (toAC) { const p = toAC.getPlace(); if (p?.formatted_address) setTo(p.formatted_address) }
  }

  const fitMapToRoutes = (map, rts) => {
    if (!map || !rts?.length) return
    const bounds = new window.google.maps.LatLngBounds()
    rts.forEach(r => { if (r.polyline) decodePolyline(r.polyline).forEach(p => bounds.extend(p)) })
    if (!bounds.isEmpty()) map.fitBounds(bounds, 50)
  }

  const fetchRoutes = async () => {
    setLoading(true)
    // Update weather for the city in the "from" field
    const city = extractCity(from)
    setCityName(city)
    fetchWeather(city)
    try {
      const data = await getRoutes(from, to)
      setRoutes(data)
      const green = data.find(r => r.appMode !== 'taxi')
      if (green) setSelected(green.appMode)
      if (mapRef) fitMapToRoutes(mapRef, data)
        
    } catch { showToast('Locking in on you...') }
    finally { setLoading(false) }
  }

  const selectedRoute = routes.find(r => r.appMode === selected)

  const handleLogConfirm = async () => {
    setShowLog(false)
    if (!user) { onNeedSignup(); return }
    try {
      const result = await logTrip({ userId:user.id, mode:selected, from, to,
        distanceKm:selectedRoute.distanceKm, co2Saved:selectedRoute.co2Saved,
        moneySaved:selectedRoute.moneySaved, calories:selectedRoute.calories })
      if (onTripLogged) onTripLogged(result.xpEarned || selectedRoute.xpEarned)
      showToast(`✅ Trip saved! +${result.xpEarned || selectedRoute.xpEarned} XP`)
    } catch { showToast('Trip logged locally') }
  }

  const buildChartData = () => {
    if (!routes.length) return { labels:[], datasets:[{ data:[] }] }
    const order = ['walk','cycle','bus','taxi','ev','train']
    const ordered = order.map(m => routes.find(r => r.appMode === m)).filter(Boolean)
    const values = ordered.map(r => {
      if (persona === 'planet')  return Math.max(0, 100 - parseFloat(r.co2Kg) * 200)
      if (persona === 'fitness') return Math.min(100, r.calories / 2)
      if (persona === 'budget')  return Math.max(0, 100 - parseFloat(r.cost) * 8)
      return 50
    })
    return {
      labels: ordered.map(r => `${MODE_CONFIG[r.appMode]?.emoji} ${MODE_CONFIG[r.appMode]?.name}`),
      datasets: [{ data: values,
        backgroundColor:['rgba(22,163,74,0.8)','rgba(59,130,246,0.8)','rgba(139,92,246,0.8)','rgba(239,68,68,0.35)', 'rgba(99,102,241,0.8)','rgba(16,185,129,0.8)'],
        borderRadius:6, borderSkipped:false }]
    }
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const chartOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      y:{ beginAtZero:true, max:110, grid:{ color: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)' }, ticks:{ font:{size:10}, color:'#6b7280' } },
      x:{ grid:{display:false}, ticks:{ font:{size:11} } }
    }
  }

  const getWinner = (cat) => {
    if (!routes.length) return MODE_CONFIG.walk
    const order = ['walk','cycle','bus','taxi']
    const ordered = order.map(m => routes.find(r => r.appMode === m)).filter(Boolean)
    if (cat === 'Greenest') return MODE_CONFIG[[...ordered].sort((a,b) => parseFloat(a.co2Kg)-parseFloat(b.co2Kg))[0]?.appMode] || MODE_CONFIG.walk
    if (cat === 'Fittest')  return MODE_CONFIG[[...ordered].sort((a,b) => b.calories-a.calories)[0]?.appMode] || MODE_CONFIG.cycle
    if (cat === 'Cheapest') return MODE_CONFIG[[...ordered].sort((a,b) => parseFloat(a.cost)-parseFloat(b.cost))[0]?.appMode] || MODE_CONFIG.walk
    return MODE_CONFIG.walk
  }

  // Compute badges dynamically from actual route data
  const getRouteBadge = (mode) => {
    if (!routes.length) return null
    const nonTaxi = routes.filter(r => r.appMode !== 'taxi')
    if (!nonTaxi.length) return null
    const greenest = [...nonTaxi].sort((a, b) => parseFloat(a.co2Kg) - parseFloat(b.co2Kg))[0]
    const fittest  = [...nonTaxi].sort((a, b) => b.calories - a.calories)[0]
    const fastest  = [...nonTaxi].sort((a, b) => a.durationMin - b.durationMin)[0]
    if (mode === greenest?.appMode) return '🏆 Greenest'
    if (mode === fittest?.appMode)  return '💪 Fittest'
    if (mode === fastest?.appMode)  return '⚡ Fastest Green'
    return null
  }

  const surgeRoute = routes.find(r => r.isSurge)

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
      <div className="sidebar">
        <div className="sidebar-scroll">
          <div className="search-wrap">
            <div className="search-row" data-icon="📍">
              {isLoaded ? (
                <Autocomplete onLoad={setFromAC} onPlaceChanged={onFromPlaceChanged}
                  options={{ componentRestrictions:{ country:'gb' } }}>
                  <input className="search-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
                </Autocomplete>
              ) : (
                <input className="search-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
              )}
            </div>
            
            <div className="search-dot" />
            <div className="search-row" data-icon="🎯">
              {isLoaded ? (
                <Autocomplete onLoad={setToAC} onPlaceChanged={onToPlaceChanged}
                  options={{ componentRestrictions:{ country:'gb' } }}>
                  <input className="search-input" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
                </Autocomplete>
              ) : (
                <input className="search-input" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
              )}
            </div>
            <button className="go-btn" onClick={fetchRoutes} disabled={loading}>
              {loading ? 'Finding routes...' : 'Find Green Routes →'}
            </button>
          </div>

          <div className="mode-pills">
            {[['walk','🚶 Walk'],['cycle','🚴 Cycle'],['bus','🚌 Bus'],['taxi','🚕 City Taxi'],['ev','⚡ EV'],['train', '🚆 Train']].map(([id,lbl]) => (
              <div key={id} className={`mode-pill${selected===id?' active':''}`}
                onClick={() => setSelected(id)} style={{ cursor:'pointer' }}>{lbl}</div>
            ))}
          </div>

          {weather && (
            <div className="weather-banner">
              <span className="weather-icon">{weather.isSnowing?'❄️':weather.isRaining?'🌧️':'☀️'}</span>
              <div><strong>{weather.temp}°C · {weather.description}{weather.surgeWarning?' · ⚡ Surge warning':''}</strong>{' '}{weather.nudgeMessage}</div>
            </div>
          )}

          <div className="rds-card">
            <div className="rds-top">
              <span className="rds-label">Rainy Day Score™</span>
              <span className="rds-badge">{cityName} · Live</span>
            </div>
            <div className="rds-row">
              <div className="rds-score">{weather?.rainyDayScore || 78}</div>
              <div className="rds-bar-bg"><div className="rds-bar-fill" style={{ width:`${rdsWidth}%` }} /></div>
            </div>
            <div className="rds-sub">{weather?.nudgeMessage || 'Green options available today.'}</div>
          </div>

          <div className="section-label">Routes — ranked by green score</div>
          {loading && <div style={{ textAlign:'center', padding:'1rem', color:'var(--muted)', fontSize:'0.85rem' }}>Fetching live routes...</div>}
          {routes.map(route => {
            const cfg = MODE_CONFIG[route.appMode] || {}
            const badge = (route.appMode==='taxi' && route.isSurge) ? `⚡ Surge ×${route.surgeMultiplier}` : getRouteBadge(route.appMode)
            return (
              <RouteCard key={route.appMode} mode={route.appMode} name={cfg.name} emoji={cfg.emoji}
                badge={badge} badgeClass={cfg.badgeClass}
                selected={selected===route.appMode} onSelect={() => setSelected(route.appMode)}
                stats={{
                  time: formatDuration(route.durationMin),
                  co2: parseFloat(route.co2Kg)===0 ? '0 kg' : `${route.co2Kg} kg`,
                  co2Class: route.appMode==='taxi' ? 'c-red' : 'c-green',
                  cost:`£${route.cost}`,
                  costClass: route.appMode==='taxi' ? 'c-red' : parseFloat(route.cost)===0 ? 'c-green' : '',
                  cal:route.calories,
                  calClass:['walk','cycle'].includes(route.appMode)?'c-blue':'c-muted',
                }} />
            )
          })}

          {selectedRoute && (
            <>
              <div className="summary-strip">
                <div className="sum-chip"><div className="sum-val">{selectedRoute.co2Saved}kg</div><div className="sum-lbl">CO₂ saved vs taxi</div></div>
                <div className="sum-chip"><div className="sum-val">£{selectedRoute.moneySaved}</div><div className="sum-lbl">Money saved</div></div>
                <div className="sum-chip"><div className="sum-val">🌊 {selectedRoute.plasticBottles}</div><div className="sum-lbl">Plastic bottles equiv.</div></div>
              </div>
              <button className="log-btn" onClick={() => setShowLog(true)}>
                ✓ Log This Trip · +{selectedRoute.xpEarned} XP
              </button>
            </>
          )}

          <div className="scoreboard-wrap">
            <div className="section-label" style={{ marginBottom:'0.5rem' }}>📊 Impact Scoreboard</div>
            <div className="persona-pills">
              {[['planet','🌍 Planet'],['fitness','💪 Fitness'],['budget','💰 Budget']].map(([id,lbl]) => (
                <div key={id} className={`persona-pill ${persona===id?'active':''}`} onClick={() => setPersona(id)}>{lbl}</div>
              ))}
            </div>
            <div className="chart-wrap"><Bar key={`${persona}-${routes.map(r=>r.distanceKm).join(',')}`} data={buildChartData()} options={chartOptions} /></div>
            <div className="winners">
              {['Greenest','Fittest','Cheapest'].map(cat => {
                const w = getWinner(cat)
                return <div key={cat} className="winner-chip"><div className="w-cat">{cat}</div><div className="w-icon">{w?.emoji}</div><div className="w-lbl">{w?.name}</div></div>
              })}
            </div>
          </div>
        </div>
      </div>

<div className="map-area" style={{ position: "relative" }}>
  {isLoaded ? (
    <GoogleMap
      key={`${from}-${to}-${selected}`}
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={currentLocation || ABERDEEN_CENTER}
      zoom={14}
      options={{ disableDefaultUI: true, zoomControl: true }}
      onLoad={(map) => {
        setMapRef(map)
        if (routes?.length) fitMapToRoutes(map, routes)
      }}
    >
      {/* Draw route if available */}
      {selectedRoute?.polyline && (
        <Polyline
          key={`${selectedRoute.appMode}-${selectedRoute.polyline}`}
          path={decodePolyline(selectedRoute.polyline)}
          options={{
            strokeColor: ROUTE_COLORS[selectedRoute.appMode],
            strokeOpacity: 1,
            strokeWeight: 5,
            zIndex: 10,
          }}
        />
      )}

      {/* Start/End markers */}
      {selectedRoute?.polyline && (() => {
        const pts = decodePolyline(selectedRoute.polyline)
        return (
          <>
            <Marker position={pts[0]} label="A" />
            <Marker position={pts[pts.length - 1]} label="B" />
          </>
        )
      })()}
    </GoogleMap>
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "var(--map-bg)",
        color: "var(--muted)",
        fontWeight: 600,
      }}
    >
      Loading Google Maps…
    </div>
  )}

  {/* Overlay if routes aren’t ready yet */}
  {isLoaded && !routes.some((r) => r.polyline) && (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        background: "rgba(0,0,0,0.05)",
        color: "var(--muted)",
        fontWeight: 600,
      }}
    >
      {loading ? "Fetching routes…" : 'Enter locations and click “Find Green Routes”'}
    </div>
  )}

  {/* Legend */}
  <div className="map-legend">
    <div
      style={{
        fontSize: "0.65rem",
        fontWeight: 700,
        color: "var(--muted)",
        marginBottom: "0.2rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      Routes
    </div>
    {[["#16a34a", "Walk"], ["#3b82f6", "Cycle"], ["#8b5cf6", "Bus"], ["#ef4444", "Taxi"]].map(([c, l]) => (
      <div key={l} className="legend-row">
        <div className="legend-line" style={{ background: c, opacity: l === "Taxi" ? 0.45 : 1 }} />
        <span style={{ opacity: l === "Taxi" ? 0.6 : 1 }}>{l}</span>
      </div>
    ))}
  </div>

  {/* Surge banner */}
  {surgeRoute && selected === "taxi" && (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(239,68,68,0.9)",
        color: "#fff",
        padding: "0.5rem 1rem",
        borderRadius: "20px",
        fontSize: "0.8rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      ⚡ City Taxi surge active · ×{surgeRoute.surgeMultiplier}
    </div>
  )}
</div>

      {showLog && <LogTripModal route={selectedRoute} onClose={() => setShowLog(false)} onConfirm={handleLogConfirm} />}
    </div>
  )
}
