import { useState, useEffect } from 'react'
import { getGroup, joinGroup, createGroup } from '../utils/api'

const BOTS = [
  { name: 'James R.',  pts: 1240, trips: 24, av: '👤', isBot: true },
  { name: 'Priya M.',  pts: 980,  trips: 19, av: '👤', isBot: true },
  { name: 'Alex T.',   pts: 720,  trips: 14, av: '👤', isBot: true },
  { name: 'Sophie L.', pts: 560,  trips: 11, av: '👤', isBot: true },
  { name: 'Chris W.',  pts: 430,  trips: 9,  av: '👤', isBot: true },
]

export default function Challenge({ user, showToast }) {
  const [code, setCode]           = useState('')
  const [goalWidth, setGoalWidth] = useState(0)
  const [group, setGroup]         = useState(null)
  const [myCode, setMyCode]       = useState('GR7X')
  const [joining, setJoining]     = useState(false)
  const [creating, setCreating]   = useState(false)

  // Load default demo group on mount
  useEffect(() => {
    getGroup('GR7X')
      .then(g => { setGroup(g); setTimeout(() => setGoalWidth(Math.round((g.progress / g.goal) * 100)), 400) })
      .catch(() => setTimeout(() => setGoalWidth(68), 400))
  }, [])

  // If user is logged in, create them a real group code
  useEffect(() => {
    if (!user?.id || myCode !== 'GR7X') return
    createGroup(user.id)
      .then(res => setMyCode(res.code))
      .catch(() => {})
  }, [user])

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 4) { showToast('Enter a valid 4-letter code'); return }
    setJoining(true)
    try {
      const res = await joinGroup(trimmed, user?.id)
      setGroup(res.group)
      const pct = Math.round((res.group.progress / res.group.goal) * 100)
      setGoalWidth(0)
      setTimeout(() => setGoalWidth(pct), 100)
      showToast(`🎉 Joined group ${trimmed}!`)
      setCode('')
    } catch {
      showToast('Group not found — check the code')
    } finally {
      setJoining(false)
    }
  }

  // Build leaderboard — bots + current user sorted by pts
  const buildLeaderboard = () => {
    let lb = [...BOTS]

    if (user) {
      const userEntry = {
        name: user.name.split(' ')[0] + ' (you)',
        pts: user.xp || 847,
        trips: 16,
        av: user.avatar || '🌿',
        isYou: true,
      }
      lb = [...lb, userEntry]
    }

    return lb.sort((a, b) => b.pts - a.pts).slice(0, 6)
  }

  const RANK_ICONS  = ['🥇', '🥈', '🥉']
  const RANK_COLORS = ['#f59e0b', '#9ca3af', '#cd7c2f']
  const leaderboard = buildLeaderboard()
  const pct = group ? Math.round((group.progress / group.goal) * 100) : 68

  return (
    <div className="page-content">
      <div className="challenge-inner">
        <div className="page-header">
          <div className="page-title">Group Challenge 🏆</div>
        </div>

        {/* CODE ROW */}
        <div className="code-row">
          <div className="your-code-card">
            <div className="yc-label">Your code</div>
            <div className="yc-val">{user ? myCode : '????'}</div>
            <div className="yc-sub">{user ? 'Share with friends →' : 'Sign up to get a code'}</div>
          </div>
          <div className="join-card">
            <div className="join-label">Join a group</div>
            <div className="join-row">
              <input
                className="join-input"
                placeholder="CODE"
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="join-btn" onClick={handleJoin} disabled={joining}>
                {joining ? '...' : 'Join'}
              </button>
            </div>
          </div>
        </div>

        {/* GOAL */}
        <div className="goal-card">
          <div className="goal-top">
            <div className="goal-txt">🎯 Feb Goal: Remove {group?.goal || 50} plastic bottles from the ocean</div>
            <div className="goal-pct">{pct}%</div>
          </div>
          <div className="goal-bar-bg">
            <div className="goal-bar-fill" style={{ width: `${goalWidth}%` }} />
          </div>
          <div className="goal-sub-text">
            {group?.progress || 34} of {group?.goal || 50} bottles equiv. · {leaderboard.length} members · 9 days left
          </div>
        </div>

        {/* LEADERBOARD */}
        <div className="lb-label">Leaderboard — February</div>
        {leaderboard.map((row, i) => (
          <div key={i} className={`lb-row ${row.isYou ? 'you' : ''}`}>
            <div className="lb-rank" style={{ color: RANK_COLORS[i] || 'var(--muted)' }}>
              {RANK_ICONS[i] || i + 1}
            </div>
            <div className="lb-av">{row.av}</div>
            <div className="lb-name">
              {row.name}
              {row.isBot && (
                <span style={{
                  marginLeft: '0.4rem',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  background: 'var(--surface2)',
                  borderRadius: '6px',
                  padding: '1px 5px',
                  verticalAlign: 'middle',
                }}>BOT</span>
              )}
            </div>
            <div className="lb-trips">{row.trips} trips</div>
            <div className="lb-pts">{row.pts.toLocaleString()} pts</div>
          </div>
        ))}

        {/* HOW IT WORKS */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>How it works</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>
            Share your 4-letter code with friends or colleagues. Every green trip you log earns points and contributes to your group's shared goal. The team with the most plastic bottles removed from the ocean wins. 🌊
          </div>
        </div>
      </div>
    </div>
  )
}