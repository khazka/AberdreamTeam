import { useEffect, useState } from 'react'
import { getLevel, getXPProgress } from '../utils/impact'

const DAYS = [
  { name: 'Mon', done: true  },
  { name: 'Tue', done: true  },
  { name: 'Wed', done: true  },
  { name: 'Thu', done: true  },
  { name: 'Fri', done: true  },
  { name: 'Sat', today: true },
  { name: 'Sun', done: false },
]

const HISTORY = [
  { emoji: '🚶', route: 'Aberdeen Station → University', sub: 'Today · 28 min · +35 XP', co2: '−0.82kg CO₂' },
  { emoji: '🚴', route: 'Home → City Centre',            sub: 'Fri · 22 min · +42 XP',   co2: '−1.1kg CO₂'  },
  { emoji: '🚌', route: 'Union Street → Uni',            sub: 'Thu · 18 min · +28 XP',   co2: '−0.78kg CO₂' },
  { emoji: '🚶', route: 'Rosemount → King Street',       sub: 'Wed · 35 min · +38 XP',   co2: '−1.2kg CO₂'  },
]

const EARNED_BADGES  = ['🌿 First Trip', '🔥 3-Day Streak', '🚴 Cyclist', '🌊 Ocean Saver']
const LOCKED_BADGES  = ['🏆 Green Legend (Lv5)', '⚡ 30-Day Streak']

export default function Impact({ user, onNeedSignup }) {
  const [xpWidth, setXpWidth] = useState(0)

  const xp      = user?.xp || 847
  const lvlData = getLevel(xp)
  const progress = getXPProgress(xp)
  const nextXP  = lvlData.max === Infinity ? '∞' : lvlData.max

  useEffect(() => {
    setTimeout(() => setXpWidth(progress), 400)
  }, [progress])

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
        <div className="streak-badge">🔥 6-Day Streak</div>
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
            {EARNED_BADGES.map(b  => <span key={b} className="a-badge earned">{b}</span>)}
            {LOCKED_BADGES.map(b  => <span key={b} className="a-badge locked">{b}</span>)}
          </div>
        </div>
      </div>

      {/* STREAK */}
      <div className="streak-row">
        {DAYS.map(d => (
          <div key={d.name} className={`streak-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}>
            <div className="d-name">{d.name}</div>
            <div className="d-icon">{d.today ? '⭐' : d.done ? '✅' : '○'}</div>
          </div>
        ))}
      </div>

      {/* IMPACT GRID */}
      <div className="impact-grid">
        {[
          { icon:'🌊', val:'14.3', unit:'plastic bottles', lbl:'removed from ocean equiv.' },
          { icon:'💨', val:'8.7 kg', unit:'CO₂ saved', lbl:'this month' },
          { icon:'💰', val:'£47', unit:'saved', lbl:'vs city taxis' },
          { icon:'🔥', val:'4,280', unit:'kcal burned', lbl:'green commutes' },
          { icon:'🌳', val:'0.41', unit:'trees equiv.', lbl:'CO₂ absorbed' },
          { icon:'⭐', val:xp.toLocaleString(), unit:'green score', lbl:'lifetime total' },
        ].map(c => (
          <div key={c.lbl} className="impact-card">
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
        {HISTORY.map((h, i) => (
          <div key={i} className="history-row">
            <div className="h-emoji">{h.emoji}</div>
            <div className="h-info">
              <div className="h-route">{h.route}</div>
              <div className="h-sub">{h.sub}</div>
            </div>
            <div className="h-co2">{h.co2}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
