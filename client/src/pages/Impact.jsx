import { useEffect, useState } from 'react'
import { getLevel, getXPProgress } from '../utils/impact'
import { getUserImpact, getUserTrips } from '../utils/api'

const MODE_EMOJI = { walk:'🚶', cycle:'🚴', bus:'🚌', taxi:'🚕' }

function buildStreak(trips) {
  if (!trips.length) return { days: [], count: 0 }
  const today = new Date()
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const tripDates = new Set(trips.map(t => new Date(t.timestamp).toISOString().slice(0,10)))
  // Build 7-day week starting from Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0,10)
    const isToday = dateStr === today.toISOString().slice(0,10)
    days.push({ name: dayNames[d.getDay()], done: tripDates.has(dateStr), today: isToday })
  }
  // Count consecutive days streak ending at today/yesterday
  let count = 0
  let checkDate = new Date(today)
  if (!tripDates.has(checkDate.toISOString().slice(0,10))) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  for (let i = 0; i < 365; i++) {
    if (tripDates.has(checkDate.toISOString().slice(0,10))) {
      count++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }
  return { days, count }
}

const BADGE_DEFS = [
  { check: (imp, trips) => trips.length >= 1,                        label: '🌿 First Trip' },
  { check: (imp, trips, streak) => streak >= 3,                      label: '🔥 3-Day Streak' },
  { check: (imp, trips) => trips.some(t => t.mode === 'cycle'),      label: '🚴 Cyclist' },
  { check: (imp) => parseFloat(imp.plasticBottles || 0) >= 1,        label: '🌊 Ocean Saver' },
  { check: (imp, trips, streak, xp) => xp >= 2000,                   label: '⚡ Green Legend (Lv5)' },
  { check: (imp, trips, streak) => streak >= 30,                      label: '🏆 30-Day Streak' },
]

export default function Impact({ user, onNeedSignup }) {
  const [xpWidth, setXpWidth] = useState(0)
  const [impact, setImpact]   = useState(null)
  const [trips, setTrips]     = useState([])
  const [streak, setStreak]   = useState({ days: [], count: 0 })

  const xp      = impact?.xp || user?.xp || 0
  const lvlData = getLevel(xp)
  const progress = getXPProgress(xp)
  const nextXP  = lvlData.max === Infinity ? '∞' : lvlData.max

  useEffect(() => {
    if (!user?.id) return
    getUserImpact(user.id).then(setImpact).catch(() => {})
    getUserTrips(user.id).then(t => {
      setTrips(t)
      setStreak(buildStreak(t))
    }).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    setTimeout(() => setXpWidth(progress), 400)
  }, [progress])

  const earned = BADGE_DEFS.filter(b => b.check(impact || {}, trips, streak.count, xp)).map(b => b.label)
  const locked = BADGE_DEFS.filter(b => !b.check(impact || {}, trips, streak.count, xp)).map(b => b.label)

  if (!user) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🌱</div>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem' }}>Create your Green Avatar</div>
        <p style={{ color: 'var(--muted)', textAlign: 'center', maxWidth: '340px', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Sign up to track your CO₂ savings, earn XP badges, and see your personal impact story grow over time.
        </p>
        <button className="go-btn" style={{ maxWidth: '240px' }} onClick={onNeedSignup}>
          Get Started →
        </button>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-title">Your Impact 🌍</div>
        {streak.count > 0 && <div className="streak-badge">🔥 {streak.count}-Day Streak</div>}
      </div>

      {/* AVATAR CARD */}
      <div className="avatar-card">
        <div className="avatar-big">
          <div className="avatar-glow" />
          <span>{user.avatar}</span>
          <div className="avatar-level-badge">Lv{lvlData.level}</div>
        </div>
        <div className="avatar-info">
          <div className="avatar-name">{user.name}</div>
          <div className="avatar-title">{lvlData.title}</div>
          <div className="xp-label-row">
            <span>XP: <strong>{xp}</strong></span>
            <span>Next level: {nextXP} XP</span>
          </div>
          <div className="xp-bar-bg">
            <div className="xp-bar-fill" style={{ width: `${xpWidth}%` }} />
          </div>
          <div className="avatar-badges-row">
            {earned.map(b => <span key={b} className="a-badge earned">{b}</span>)}
            {locked.map(b => <span key={b} className="a-badge locked">{b}</span>)}
          </div>
        </div>
      </div>

      {/* STREAK */}
      {streak.days.length > 0 && (
        <div className="streak-row">
          {streak.days.map(d => (
            <div key={d.name} className={`streak-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}>
              <div className="d-name">{d.name}</div>
              <div className="d-icon">{d.today ? '⭐' : d.done ? '✅' : '○'}</div>
            </div>
          ))}
        </div>
      )}

      {/* IMPACT GRID */}
      <div className="impact-grid">
        {[
          { icon:'🌊', val: impact?.plasticBottles || '0', unit:'plastic bottles', lbl:'removed from ocean equiv.' },
          { icon:'💨', val: `${(impact?.co2Saved || 0).toFixed(1)} kg`, unit:'CO₂ saved', lbl:'lifetime total' },
          { icon:'💰', val: `£${(impact?.moneySaved || 0).toFixed(0)}`, unit:'saved', lbl:'vs city taxis' },
          { icon:'🔥', val: (impact?.calories || 0).toLocaleString(), unit:'kcal burned', lbl:'green commutes' },
          { icon:'🌳', val: impact?.treesEquiv || '0', unit:'trees equiv.', lbl:'CO₂ absorbed' },
          { icon:'⭐', val: xp.toLocaleString(), unit:'green score', lbl:'lifetime total' },
        ].map(c => (
          <div key={c.icon} className="impact-card">
            <div className="i-icon">{c.icon}</div>
            <div className="i-val">{c.val}</div>
            <div className="i-unit">{c.unit}</div>
            <div className="i-lbl">{c.lbl}</div>
          </div>
        ))}
      </div>

      {/* HISTORY */}
      <div className="history-card">
        <div className="history-head">Recent Trips</div>
        {trips.length === 0 && (
          <div style={{ padding:'1rem', color:'var(--muted)', fontSize:'0.85rem', textAlign:'center' }}>
            No trips logged yet. Go to Journey and log your first green trip!
          </div>
        )}
        {trips.slice(-10).reverse().map((t, i) => {
          const date = new Date(t.timestamp)
          const isToday = date.toDateString() === new Date().toDateString()
          const dayLabel = isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday:'short' })
          return (
            <div key={t.id || i} className="history-row">
              <div className="h-emoji">{MODE_EMOJI[t.mode] || '🚶'}</div>
              <div className="h-info">
                <div className="h-route">{t.from} → {t.to}</div>
                <div className="h-sub">{dayLabel} · +{t.xpEarned} XP</div>
              </div>
              <div className="h-co2">−{t.co2Saved.toFixed(2)}kg CO₂</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
