import { useEffect, useState } from 'react'
import { getLevel, getXPProgress } from '../utils/impact'
import { getUserImpact, getUserTrips } from '../utils/api'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const MODE_EMOJI = { walk:'🚶', cycle:'🚴', bus:'🚌', taxi:'🚕' }

export default function Impact({ user, onNeedSignup }) {
  const [xpWidth, setXpWidth]   = useState(0)
  const [impact, setImpact]     = useState(null)
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(false)

  const xp      = user?.xp || 0
  const lvlData = getLevel(xp)
  const progress = getXPProgress(xp)
  const nextXP  = lvlData.max === Infinity ? '∞' : lvlData.max

  useEffect(() => {
    setTimeout(() => setXpWidth(progress), 400)
  }, [progress])

  // Normalise a raw DB/API trip row to camelCase
  const normaliseTrip = (t) => ({
    id:         t.id,
    mode:       t.mode,
    from:       t.from        ?? t.from_place  ?? '',
    to:         t.to          ?? t.to_place    ?? '',
    distanceKm: t.distanceKm  ?? t.distance_km ?? 0,
    co2Saved:   t.co2Saved    ?? t.co2_saved   ?? 0,
    moneySaved: t.moneySaved  ?? t.money_saved ?? 0,
    calories:   t.calories    ?? 0,
    xpEarned:   t.xpEarned    ?? t.xp_earned   ?? 0,
    timestamp:  t.timestamp   ?? new Date().toISOString(),
  })

  // Load real impact data when user is set
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    Promise.all([
      getUserImpact(user.id).catch(() => null),
      getUserTrips(user.id).catch(() => null),
    ]).then(([impactData, tripData]) => {
      if (impactData) setImpact(impactData)
      if (tripData && tripData.length > 0) {
        setTrips(tripData.map(normaliseTrip))
      }
    }).finally(() => setLoading(false))
  }, [user])

  // Build 7-day streak from real trip timestamps
  const buildStreak = () => {
  const today = new Date()
  today.setHours(0,0,0,0)
  return Array.from({length:7}, (_,i) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - i))
    const dayStr = day.toDateString()
    const isToday = i === 6
    const done = trips.some(t => {
      const td = new Date(t.timestamp)
      td.setHours(0,0,0,0)
      return td.toDateString() === dayStr && t.mode !== 'taxi'
    })
    return { name: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day.getDay() === 0 ? 6 : day.getDay()-1], done, isToday }
  })
}

const streakCount = (() => {
  const today = new Date()
  today.setHours(0,0,0,0)
  let count = 0
  let checkDate = new Date(today)
  while (true) {
    const dateStr = checkDate.toDateString()
    const hadGreenTrip = trips.some(t => {
      const td = new Date(t.timestamp)
      td.setHours(0,0,0,0)
      return td.toDateString() === dateStr && t.mode !== 'taxi'
    })
    if (!hadGreenTrip) break
    count++
    checkDate.setDate(checkDate.getDate() - 1)
    if (count > 365) break
  }
  return count
})()

  // Sum stats directly from normalised trip values
  const tripsTotal = trips.length > 0 ? {
    co2Saved:   trips.reduce((s, t) => s + parseFloat(t.co2Saved  || 0), 0),
    moneySaved: trips.reduce((s, t) => s + parseFloat(t.moneySaved || 0), 0),
    calories:   trips.reduce((s, t) => s + (Number(t.calories) || 0), 0),
  } : null

  const co2Saved       = tripsTotal ? tripsTotal.co2Saved.toFixed(2)              : (impact ? parseFloat(impact.co2Saved).toFixed(2)   : '0')
  const moneySaved     = tripsTotal ? tripsTotal.moneySaved.toFixed(2)            : (impact ? parseFloat(impact.moneySaved).toFixed(2) : '0')
  const calories       = tripsTotal ? Math.round(tripsTotal.calories)             : (impact ? impact.calories                          : 0)
  const plasticBottles = tripsTotal ? (tripsTotal.co2Saved * 0.47).toFixed(1)     : (impact ? impact.plasticBottles                    : '0')
  const treesEquiv     = tripsTotal ? (tripsTotal.co2Saved / 21).toFixed(3)       : (impact ? impact.treesEquiv                        : '0')
  const totalXP        = impact?.xp ?? xp

  // Earned badges based on real data
  const earnedBadges = []
  if (trips.length >= 1)                          earnedBadges.push('🌿 First Trip')
  if (streakCount >= 3)                           earnedBadges.push('🔥 3-Day Streak')
  if (trips.some(t => t.mode === 'cycle'))        earnedBadges.push('🚴 Cyclist')
  if (parseFloat(plasticBottles) > 0)             earnedBadges.push('🌊 Ocean Saver')
  if (trips.length >= 10)                         earnedBadges.push('⭐ Dedicated Commuter')
  if (parseFloat(co2Saved) >= 5)                  earnedBadges.push('💚 5kg CO₂ Saved')
  if (streakCount >= 2)  earnedBadges.push('🔥 2-Day Streak')
if (streakCount >= 5)  earnedBadges.push('🔥 5-Day Streak') 
if (streakCount >= 7)  earnedBadges.push('🏆 7-Day Low Carbon Commuter')
if (streakCount >= 14) earnedBadges.push('⚡ 2-Week Habit')
if (streakCount >= 30) earnedBadges.push('🌍 30-Day Green Habit')

  const lockedBadges = []
  if (lvlData.level < 5)   lockedBadges.push('🏆 Green Legend (Lv5)')
  if (trips.length < 50)   lockedBadges.push('🌍 50 Trips')
  if (streakCount < 7)  lockedBadges.push(`🔥 7-Day Streak (${streakCount}/7 days)`)
if (streakCount < 30) lockedBadges.push(`⚡ 30-Day Habit (${streakCount}/30 days)`)

  if (!user) {
    return (
      <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
        <div style={{ fontSize:'3rem' }}>🌱</div>
        <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:'1.4rem' }}>Create your Green Avatar</div>
        <p style={{ color:'var(--muted)', textAlign:'center', maxWidth:'340px', fontSize:'0.9rem', lineHeight:1.6 }}>
          Sign up to track your CO₂ savings, earn XP badges, and see your personal impact story grow over time.
        </p>
        <button className="go-btn" style={{ maxWidth:'240px' }} onClick={onNeedSignup}>
          Get Started →
        </button>
      </div>
    )
  }

  // SDG badges based on real trip data
  const sdgs = []
  const walkCycleTrips = trips.filter(t => t.mode === 'walk' || t.mode === 'cycle')
  const nonTaxiTrips = trips.filter(t => t.mode !== 'taxi')
  if (walkCycleTrips.length > 0)
    sdgs.push({ num:3, icon:'🏃', name:'Good Health & Wellbeing', color:'#4c9f38', count:walkCycleTrips.length })
  if (nonTaxiTrips.length > 0)
    sdgs.push({ num:11, icon:'🏙️', name:'Sustainable Cities', color:'#f99d26', count:nonTaxiTrips.length })
  if (parseFloat(co2Saved) > 0)
    sdgs.push({ num:13, icon:'🌍', name:'Climate Action', color:'#3f7e44', count:trips.filter(t => parseFloat(t.co2Saved || 0) > 0).length })
  if (user?.groupCode)
    sdgs.push({ num:17, icon:'🤝', name:'Partnerships', color:'#19486a', count:1 })

  // Smart recommendations — data-driven nudges
  const recommendations = []
  if (trips.length === 0) {
    recommendations.push({ icon:'🗺', text:'Log your first green trip on the Journey tab to start tracking your impact!' })
  } else {
    const hasCycle = trips.some(t => t.mode === 'cycle')
    const hasWalk = trips.some(t => t.mode === 'walk')
    const cycleCount = trips.filter(t => t.mode === 'cycle').length
    const walkCount = trips.filter(t => t.mode === 'walk').length
    const totalCo2 = parseFloat(co2Saved) || 0

    if (!hasCycle) recommendations.push({ icon:'🚴', text:'Try cycling — even one ride a week could save 1.2kg CO₂ and burn 200+ kcal.' })
    if (hasCycle && cycleCount < 5) recommendations.push({ icon:'🚴', text:`You've cycled ${cycleCount} time${cycleCount!==1?'s':''}. ${5-cycleCount} more to unlock the Cyclist badge!` })
    if (!hasWalk && hasCycle) recommendations.push({ icon:'🚶', text:'Mix in a walk — shorter trips on foot save the most CO₂ per km.' })
    if (streakCount > 0 && streakCount < 3) recommendations.push({ icon:'🔥', text:`${3-streakCount} more day${3-streakCount!==1?'s':''} to hit a 3-Day Streak and earn the streak badge!` })
    if (streakCount >= 3 && streakCount < 7) recommendations.push({ icon:'🔥', text:`Amazing ${streakCount}-day streak! Keep going to hit 7 days.` })
    if (totalCo2 > 0 && totalCo2 < 5) recommendations.push({ icon:'💚', text:`${(5-totalCo2).toFixed(1)}kg more CO₂ to save to unlock the 5kg CO₂ Saved badge.` })
    if (trips.length >= 1 && trips.length < 10) recommendations.push({ icon:'⭐', text:`${10-trips.length} more trip${10-trips.length!==1?'s':''} to unlock Dedicated Commuter!` })
    if (walkCount >= 3 && cycleCount >= 3) recommendations.push({ icon:'🌟', text:'Great mix of walking and cycling — you\'re a true multi-modal commuter!' })
  }

  // Weekly insight — compare this week vs last week
  const now = new Date()
  const thisWeekTrips = trips.filter(t => {
    const d = new Date(t.timestamp)
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const lastWeekTrips = trips.filter(t => {
    const d = new Date(t.timestamp)
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff > 7 && diff <= 14
  })
  const thisWeekCo2 = thisWeekTrips.reduce((s, t) => s + parseFloat(t.co2Saved || 0), 0)
  const lastWeekCo2 = lastWeekTrips.reduce((s, t) => s + parseFloat(t.co2Saved || 0), 0)
  const weekDelta = lastWeekCo2 > 0 ? Math.round(((thisWeekCo2 - lastWeekCo2) / lastWeekCo2) * 100) : null

  // Motivation banner text
  const motivationBanner = user?.motivation ? {
    money:       { icon:'💰', text:`You've saved £${moneySaved} vs taxis this month` },
    health:      { icon:'💪', text:`You've burned ${calories.toLocaleString()} kcal on green commutes` },
    environment: { icon:'🌍', text:`Your choices removed ${plasticBottles} plastic bottles from the ocean` },
    future:      { icon:'👨‍👩‍👧', text:`You're building a greener world — ${co2Saved}kg CO₂ saved` },
  }[user.motivation] : null
const streakDays = buildStreak()   // ← ADD THIS LINE

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-title">Your Impact 🌍</div>
        <div className="streak-badge">🔥 {streakCount}-Day Streak</div>
      </div>

      {/* MOTIVATION BANNER */}
      {motivationBanner && (
        <div style={{
          padding:'0.8rem 1rem', marginBottom:'1rem', borderRadius:'10px',
          background:'rgba(22,163,74,0.08)', borderLeft:'4px solid var(--green, #16a34a)',
          display:'flex', alignItems:'center', gap:'0.6rem',
          fontSize:'0.88rem', fontWeight:600, color:'var(--text)',
        }}>
          <span style={{ fontSize:'1.2rem' }}>{motivationBanner.icon}</span>
          {motivationBanner.text}
        </div>
      )}

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
            <span>XP: <strong>{totalXP.toLocaleString()}</strong></span>
            <span>Next level: {nextXP} XP</span>
          </div>
          <div className="xp-bar-bg">
            <div className="xp-bar-fill" style={{ width:`${xpWidth}%` }} />
          </div>
          <div className="avatar-badges-row">
            {earnedBadges.length === 0 && (
              <span className="a-badge locked">Log your first trip to earn badges</span>
            )}
            {earnedBadges.map(b => <span key={b} className="a-badge earned">{b}</span>)}
            {lockedBadges.map(b => <span key={b} className="a-badge locked">{b}</span>)}
          </div>
        </div>
      </div>

      {/* STREAK */}
      <div className="streak-row">
        {streakDays.map((d, i) => (
          <div key={i} className={`streak-day ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
            <div className="d-name">{d.name}</div>
            <div className="d-icon">{d.isToday ? '⭐' : d.done ? '✅' : '○'}</div>
          </div>
        ))}
      </div>

      {/* SDG IMPACT */}
      {sdgs.length > 0 && (
        <div style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem' }}>
            UN Sustainable Development Goals
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.5rem' }}>
            {sdgs.map(s => (
              <div key={s.num} style={{
                padding:'0.7rem', borderRadius:'10px', background:'var(--surface2)',
                border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'0.25rem',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <div style={{
                    width:24, height:24, borderRadius:'6px', background:s.color,
                    display:'grid', placeItems:'center', fontSize:'0.65rem', fontWeight:800, color:'#fff',
                  }}>{s.num}</div>
                  <span style={{ fontSize:'1rem' }}>{s.icon}</span>
                </div>
                <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>{s.name}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--muted)' }}>{s.count} trip{s.count !== 1 ? 's' : ''} contributed</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SMART RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom:'1rem', padding:'0.8rem', borderRadius:'10px', background:'var(--surface2)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem' }}>
            🤖 Smart Suggestions
          </div>
          {recommendations.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', padding:'0.4rem 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>{r.icon}</span>
              <span style={{ fontSize:'0.82rem', color:'var(--text)', lineHeight:1.5 }}>{r.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* WEEKLY INSIGHT */}
      {thisWeekTrips.length > 0 && (
        <div style={{
          marginBottom:'1rem', padding:'0.7rem 1rem', borderRadius:'10px',
          background: weekDelta !== null && weekDelta >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)',
          border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.6rem',
        }}>
          <span style={{ fontSize:'1.1rem' }}>{weekDelta !== null && weekDelta >= 0 ? '📈' : '📊'}</span>
          <div style={{ fontSize:'0.82rem', color:'var(--text)', lineHeight:1.5 }}>
            <strong>This week:</strong> {thisWeekTrips.length} trip{thisWeekTrips.length !== 1 ? 's' : ''}, {thisWeekCo2.toFixed(1)}kg CO₂ saved
            {weekDelta !== null && (
              <span style={{ color: weekDelta >= 0 ? 'var(--green, #16a34a)' : 'var(--red, #ef4444)', fontWeight:700 }}>
                {' '}· {weekDelta >= 0 ? '+' : ''}{weekDelta}% vs last week
              </span>
            )}
          </div>
        </div>
      )}

      {/* IMPACT GRID — real data */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)' }}>Loading your impact...</div>
      ) : (
        <div className="impact-grid">
          {[
            { icon:'🌊', val:plasticBottles,              unit:'plastic bottles', lbl:'removed from ocean equiv.' },
            { icon:'💨', val:`${co2Saved} kg`,            unit:'CO₂ saved',       lbl:'vs taking a taxi every time' },
            { icon:'💰', val:`£${moneySaved}`,            unit:'saved',           lbl:'vs city taxis'              },
            { icon:'🔥', val:calories.toLocaleString(),   unit:'kcal burned',     lbl:'on green commutes'          },
            { icon:'🌳', val:treesEquiv,                  unit:'trees equiv.',    lbl:'CO₂ absorbed'               },
            { icon:'⭐', val:totalXP.toLocaleString(),    unit:'green score',     lbl:`${trips.length} trips logged` },
          ].map(c => (
            <div key={c.lbl} className="impact-card">
              <div className="i-icon">{c.icon}</div>
              <div className="i-val">{c.val}</div>
              <div className="i-unit">{c.unit}</div>
              <div className="i-lbl">{c.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* TRIP HISTORY — real data */}
      <div className="history-card">
        <div className="history-head">
          Recent Trips {trips.length > 0 && <span style={{ color:'var(--muted)', fontWeight:400, fontSize:'0.78rem' }}>({trips.length} total)</span>}
        </div>
        {trips.length === 0 ? (
          <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--muted)', fontSize:'0.85rem' }}>
            No trips yet — log your first journey on the Journey tab 🗺
          </div>
        ) : (
          [...trips].reverse().slice(0, 6).map((t, i) => {
            const date = new Date(t.timestamp)
            const isToday = date.toDateString() === new Date().toDateString()
            const dateStr = isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
            return (
              <div key={t.id || i} className="history-row">
                <div className="h-emoji">{MODE_EMOJI[t.mode] || '🚗'}</div>
                <div className="h-info">
                  <div className="h-route">{t.from || '?'} → {t.to || '?'}</div>
                  <div className="h-sub">{dateStr} · {parseFloat(t.distanceKm || 0).toFixed(1)}km · +{t.xpEarned || 0} XP</div>
                </div>
                <div className="h-co2">−{parseFloat(t.co2Saved || 0).toFixed(2)}kg CO₂</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}