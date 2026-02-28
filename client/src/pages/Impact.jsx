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

  // Load real impact data when user is set
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    Promise.all([
      getUserImpact(user.id).catch(() => null),
      getUserTrips(user.id).catch(() => []),
    ]).then(([impactData, tripData]) => {
      if (impactData) setImpact(impactData)
      if (tripData)   setTrips(tripData)
    }).finally(() => setLoading(false))
  }, [user])

  // Build 7-day streak from real trip timestamps
  const buildStreak = () => {
    const today = new Date()
    return DAYS.map((name, i) => {
      const day = new Date(today)
      day.setDate(today.getDate() - (6 - i))
      const dayStr = day.toDateString()
      const isToday = i === 6
      const done = trips.some(t => new Date(t.timestamp).toDateString() === dayStr)
      return { name: name, done, today: isToday && done, isToday }
    })
  }

  const streakDays = buildStreak()
  const streakCount = (() => {
    let count = 0
    for (let i = streakDays.length - 1; i >= 0; i--) {
      if (streakDays[i].done) count++
      else break
    }
    return count
  })()

  // Use real impact data if available, else zeros
  const co2Saved      = impact ? parseFloat(impact.co2Saved).toFixed(2)      : '0'
  const moneySaved    = impact ? parseFloat(impact.moneySaved).toFixed(2)     : '0'
  const calories      = impact ? impact.calories                               : 0
  const plasticBottles = impact ? impact.plasticBottles                        : '0'
  const treesEquiv    = impact ? impact.treesEquiv                             : '0'
  const totalXP       = impact ? impact.xp                                     : xp

  // Earned badges based on real data
  const earnedBadges = []
  if (trips.length >= 1)                          earnedBadges.push('🌿 First Trip')
  if (streakCount >= 3)                           earnedBadges.push('🔥 3-Day Streak')
  if (trips.some(t => t.mode === 'cycle'))        earnedBadges.push('🚴 Cyclist')
  if (parseFloat(plasticBottles) > 0)             earnedBadges.push('🌊 Ocean Saver')
  if (trips.length >= 10)                         earnedBadges.push('⭐ Dedicated Commuter')
  if (parseFloat(co2Saved) >= 5)                  earnedBadges.push('💚 5kg CO₂ Saved')

  const lockedBadges = []
  if (lvlData.level < 5)   lockedBadges.push('🏆 Green Legend (Lv5)')
  if (streakCount < 30)    lockedBadges.push('⚡ 30-Day Streak')
  if (trips.length < 50)   lockedBadges.push('🌍 50 Trips')

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

  // Motivation banner text
  const motivationBanner = user?.motivation ? {
    money:       { icon:'💰', text:`You've saved £${moneySaved} vs taxis this month` },
    health:      { icon:'💪', text:`You've burned ${calories.toLocaleString()} kcal on green commutes` },
    environment: { icon:'🌍', text:`Your choices removed ${plasticBottles} plastic bottles from the ocean` },
    future:      { icon:'👨‍👩‍👧', text:`You're building a greener world — ${co2Saved}kg CO₂ saved` },
  }[user.motivation] : null

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
                  <div className="h-route">{t.from} → {t.to}</div>
                  <div className="h-sub">{dateStr} · {t.distanceKm}km · +{t.xpEarned} XP</div>
                </div>
                <div className="h-co2">−{parseFloat(t.co2Saved).toFixed(2)}kg CO₂</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
