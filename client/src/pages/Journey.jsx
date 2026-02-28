import { useState, useEffect, useRef } from 'react'
import RouteCard from '../components/RouteCard'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from 'chart.js'
import { calcCO2, calcCalories, calcTime, calcCost, calcXP, calcCO2Saved, co2ToImpact } from '../utils/impact'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Static route data (replace with Google Maps API response)
const DISTANCE_KM = 2.1

const ROUTES = [
  {
    mode: 'walk', name: 'Walk', emoji: '🚶',
    badge: '🏆 Greenest', badgeClass: 'badge-green',
    stats: {
      time: `${calcTime('walk', DISTANCE_KM)} min`,
      co2: '0 kg', co2Class: 'c-green',
      cost: '£0', costClass: 'c-green',
      cal: calcCalories('walk', DISTANCE_KM), calClass: 'c-blue',
    },
  },
  {
    mode: 'cycle', name: 'Cycle', emoji: '🚴',
    badge: '💪 Fittest', badgeClass: 'badge-blue',
    stats: {
      time: `${calcTime('cycle', DISTANCE_KM)} min`,
      co2: '0 kg', co2Class: 'c-green',
      cost: '£0', costClass: 'c-green',
      cal: calcCalories('cycle', DISTANCE_KM), calClass: 'c-blue',
    },
  },
  {
    mode: 'bus', name: 'Bus', emoji: '🚌',
    badge: '⚡ Fastest Green', badgeClass: 'badge-purple',
    stats: {
      time: `${calcTime('bus', DISTANCE_KM)} min`,
      co2: `${calcCO2('bus', DISTANCE_KM)} kg`, co2Class: 'c-green',
      cost: `£${calcCost('bus', DISTANCE_KM)}`, costClass: '',
      cal: calcCalories('bus', DISTANCE_KM), calClass: 'c-muted',
    },
  },
  {
    mode: 'taxi', name: 'City Taxi', emoji: '🚕',
    badge: '⚡ Surge ×1.4', badgeClass: 'badge-red',
    stats: {
      time: `${calcTime('taxi', DISTANCE_KM)} min`,
      co2: `${calcCO2('taxi', DISTANCE_KM)} kg`, co2Class: 'c-red',
      cost: `£${(parseFloat(calcCost('taxi', DISTANCE_KM)) * 1.4).toFixed(2)}`, costClass: 'c-red',
      cal: calcCalories('taxi', DISTANCE_KM), calClass: 'c-muted',
    },
  },
]

const PERSONAS = {
  planet:  { data: [100, 98, 72, 8],  label: 'Green Score'   },
  fitness: { data: [72, 100, 12, 2],  label: 'Fitness Score' },
  budget:  { data: [100, 100, 85, 10], label: 'Value Score'  },
}

const WINNERS = {
  planet:  ['🚶 Walk', '🚴 Cycle', '🚶 Walk'],
  fitness: ['🚴 Cycle', '🚴 Cycle', '🚴 Cycle'],
  budget:  ['🚶 Walk', '🚴 Cycle', '🚶 Walk'],
}

// LogTrip modal
function LogTripModal({ mode, onClose, onConfirm }) {
  const co2Saved = calcCO2Saved(mode, DISTANCE_KM)
  const xp = calcXP(mode, co2Saved)
  const impact = co2ToImpact(parseFloat(co2Saved))

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
        <div className="modal-title" style={{ justifyContent: 'center' }}>Trip Logged!</div>
        <p className="modal-sub">You just made a green choice. Here's what it saved:</p>
        <div className="logtrip-stats">
          <div className="lt-chip"><div className="lt-val">{co2Saved}kg</div><div className="lt-lbl">CO₂ saved</div></div>
          <div className="lt-chip"><div className="lt-val">🌊 {impact.plasticBottles}</div><div className="lt-lbl">Plastic bottles</div></div>
          <div className="lt-chip"><div className="lt-val">+{xp} XP</div><div className="lt-lbl">Green score</div></div>
        </div>
        <button className="modal-btn" onClick={onConfirm}>Track My Impact →</button>
        <button className="modal-skip" onClick={onClose}>Skip for now</button>
      </div>
    </div>
  )
}

export default function Journey({ user, showToast, onNeedSignup }) {
  const [from, setFrom]             = useState('Aberdeen Station')
  const [to, setTo]                 = useState('University of Aberdeen')
  const [selectedMode, setMode]     = useState('walk')
  const [persona, setPersona]       = useState('planet')
  const [rdsWidth, setRdsWidth]     = useState(0)
  const [showLogModal, setLogModal] = useState(false)

  useEffect(() => {
    // Animate RDS bar on mount
    setTimeout(() => setRdsWidth(78), 400)
  }, [])

  const handleFind = () => {
    // TODO: call Google Maps Directions API via your backend
    showToast('🔧 Wire to Google Directions API in backend')
  }

  const handleLog = () => setLogModal(true)

  const handleLogConfirm = () => {
    setLogModal(false)
    if (!user) onNeedSignup()
    else showToast('✅ Trip saved to your impact history')
  }

  const co2Saved = calcCO2Saved(selectedMode, DISTANCE_KM)
  const moneySaved = (parseFloat(calcCost('taxi', DISTANCE_KM)) * 1.4 - parseFloat(calcCost(selectedMode, DISTANCE_KM))).toFixed(2)
  const impact = co2ToImpact(parseFloat(co2Saved))

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const chartData = {
    labels: ['🚶 Walk', '🚴 Cycle', '🚌 Bus', '🚕 Taxi'],
    datasets: [{
      data: PERSONAS[persona].data,
      backgroundColor: [
        'rgba(22,163,74,0.8)', 'rgba(59,130,246,0.8)',
        'rgba(139,92,246,0.8)', 'rgba(239,68,68,0.35)',
      ],
      borderRadius: 6, borderSkipped: false,
    }],
  }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` Score: ${c.raw}/100` } } },
    scales: {
      y: { beginAtZero: true, max: 110, grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, color: 'var(--muted)' } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-scroll">

          {/* SEARCH */}
          <div className="search-wrap">
            <div className="search-row" data-icon="📍">
              <input className="search-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
            </div>
            <div className="search-dot" />
            <div className="search-row" data-icon="🎯">
              <input className="search-input" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
            </div>
            <button className="go-btn" onClick={handleFind}>Find Green Routes →</button>
          </div>

          {/* MODE PILLS */}
          <div className="mode-pills">
            {['🚶 Walk','🚴 Cycle','🚌 Bus','🚕 City Taxi'].map(m => (
              <div key={m} className="mode-pill active">{m}</div>
            ))}
          </div>

          {/* WEATHER */}
          <div className="weather-banner">
            <span className="weather-icon">🌧️</span>
            <div>
              <strong>Rain expected 5–7pm.</strong>{' '}
              City Taxi surge likely (+40%). Bus route fully covered — today's still a green win.
            </div>
          </div>

          {/* RAINY DAY SCORE */}
          <div className="rds-card">
            <div className="rds-top">
              <span className="rds-label">Rainy Day Score™</span>
              <span className="rds-badge">Aberdeen · Now</span>
            </div>
            <div className="rds-row">
              <div className="rds-score">78</div>
              <div className="rds-bar-bg">
                <div className="rds-bar-fill" style={{ width: `${rdsWidth}%` }} />
              </div>
            </div>
            <div className="rds-sub">3 green options despite rain. Only taxi tanks your score today.</div>
          </div>

          {/* ROUTES */}
          <div className="section-label">Routes — ranked by green score</div>
          {ROUTES.map(r => (
            <RouteCard
              key={r.mode}
              {...r}
              selected={selectedMode === r.mode}
              onSelect={() => setMode(r.mode)}
            />
          ))}

          {/* SUMMARY */}
          <div className="summary-strip">
            <div className="sum-chip"><div className="sum-val">{co2Saved}kg</div><div className="sum-lbl">CO₂ saved vs taxi</div></div>
            <div className="sum-chip"><div className="sum-val">£{moneySaved}</div><div className="sum-lbl">Money saved</div></div>
            <div className="sum-chip"><div className="sum-val">🌊 {impact.plasticBottles}</div><div className="sum-lbl">Plastic bottles equiv.</div></div>
          </div>

          <button className="log-btn" onClick={handleLog}>
            ✓ Log This Trip · +{calcXP(selectedMode, co2Saved)} XP
          </button>

          {/* SCOREBOARD */}
          <div className="scoreboard-wrap">
            <div className="section-label" style={{ marginBottom: '0.5rem' }}>📊 Impact Scoreboard</div>
            <div className="persona-pills">
              {['planet','fitness','budget'].map(p => (
                <div key={p} className={`persona-pill ${persona === p ? 'active' : ''}`} onClick={() => setPersona(p)}>
                  {{ planet:'🌍 Planet', fitness:'💪 Fitness', budget:'💰 Budget' }[p]}
                </div>
              ))}
            </div>
            <div className="chart-wrap">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="winners">
              {['Best','Average','Worst'].map((cat, i) => (
                <div key={cat} className="winner-chip">
                  <div className="w-cat">{cat}</div>
                  <div className="w-icon">{WINNERS[persona][i].split(' ')[0]}</div>
                  <div className="w-lbl">{WINNERS[persona][i].split(' ')[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="map-area">
        <svg className="fake-map" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <rect width="800" height="600" fill="var(--map-bg)" />
          <rect x="490" y="40" width="210" height="160" rx="12" fill="var(--map-park)" opacity="0.7" />
          <rect x="90" y="340" width="140" height="100" rx="8" fill="var(--map-park)" opacity="0.5" />
          <line x1="0" y1="300" x2="800" y2="300" stroke="var(--map-road)" strokeWidth="14" opacity="0.6" />
          <line x1="400" y1="0" x2="400" y2="600" stroke="var(--map-road)" strokeWidth="14" opacity="0.6" />
          <line x1="0" y1="140" x2="800" y2="460" stroke="var(--map-road)" strokeWidth="9" opacity="0.4" />
          <line x1="140" y1="0" x2="640" y2="600" stroke="var(--map-road)" strokeWidth="9" opacity="0.4" />
          <rect x="45" y="75" width="60" height="38" rx="3" fill="var(--map-building)" opacity="0.8" />
          <rect x="120" y="85" width="38" height="28" rx="3" fill="var(--map-building)" opacity="0.7" />
          <rect x="590" y="345" width="75" height="55" rx="3" fill="var(--map-building)" opacity="0.8" />
          <rect x="690" y="315" width="48" height="38" rx="3" fill="var(--map-building)" opacity="0.7" />
          <rect x="240" y="395" width="65" height="48" rx="3" fill="var(--map-building)" opacity="0.65" />

          {/* WALK */}
          <path className="map-route walk" style={{ display: selectedMode === 'walk' ? 'block' : 'none' }}
            d="M 148 475 Q 180 395 205 345 Q 245 270 285 232 Q 345 182 405 155 Q 465 135 525 122 Q 580 112 625 105" />
          {/* CYCLE */}
          <path className="map-route cycle" style={{ display: selectedMode === 'cycle' ? 'block' : 'none' }}
            d="M 148 475 Q 205 415 285 355 Q 365 295 445 235 Q 525 175 625 105" />
          {/* BUS */}
          <path className="map-route bus" style={{ display: selectedMode === 'bus' ? 'block' : 'none' }}
            d="M 148 475 L 148 300 L 400 300 L 400 148 L 625 105" />
          {/* TAXI */}
          <path className="map-route taxi" style={{ display: selectedMode === 'taxi' ? 'block' : 'none' }}
            d="M 148 475 Q 305 448 405 395 Q 525 335 625 105" />

          <circle cx="148" cy="475" r="11" fill="var(--text)" />
          <circle cx="148" cy="475" r="6" fill="var(--surface)" />
          <circle cx="625" cy="105" r="13" fill="#16a34a" />
          <text x="625" y="110" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">G</text>

          {selectedMode === 'walk' && (
            <g>
              <rect x="338" y="182" width="74" height="22" rx="11" fill="var(--surface)" stroke="#16a34a" strokeWidth="1.5" opacity="0.95" />
              <text x="375" y="197" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
                {calcTime('walk', DISTANCE_KM)} min 🚶
              </text>
            </g>
          )}
        </svg>

        <div className="map-legend">
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routes</div>
          {[['#16a34a','Walk'],['#3b82f6','Cycle'],['#8b5cf6','Bus'],['#ef4444','Taxi']].map(([color, label]) => (
            <div key={label} className="legend-row">
              <div className="legend-line" style={{ background: color, opacity: label === 'Taxi' ? 0.45 : 1 }} />
              <span style={{ opacity: label === 'Taxi' ? 0.6 : 1 }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="map-pin" style={{ bottom: '88px', left: '70px' }}>📍 Aberdeen Station</div>
        <div className="map-pin" style={{ top: '55px', right: '90px' }}>🎓 University of Aberdeen</div>
      </div>

      {showLogModal && (
        <LogTripModal
          mode={selectedMode}
          onClose={() => setLogModal(false)}
          onConfirm={handleLogConfirm}
        />
      )}
    </div>
  )
}
