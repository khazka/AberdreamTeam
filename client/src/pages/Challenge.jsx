import { useState, useEffect } from 'react'

const LEADERBOARD = [
  { rank: '🥇', rankColor: '#f59e0b', av: '🧑', name: 'Jamie R.',  trips: 24, pts: 1240 },
  { rank: '🥈', rankColor: '#9ca3af', av: '👩', name: 'Priya M.',  trips: 19, pts: 980  },
  { rank: '🥉', rankColor: '#cd7c2f', av: '⭐', name: 'You',       trips: 16, pts: 847, you: true },
  { rank: '4',  rankColor: 'var(--muted)', av: '🧔', name: 'Alex T.',  trips: 14, pts: 720  },
  { rank: '5',  rankColor: 'var(--muted)', av: '👨', name: 'Chris W.', trips: 11, pts: 560  },
  { rank: '6',  rankColor: 'var(--muted)', av: '👩', name: 'Sofia L.', trips: 9,  pts: 430  },
]

export default function Challenge({ user, showToast }) {
  const [code, setCode]         = useState('')
  const [goalWidth, setGoalWidth] = useState(0)

  useEffect(() => {
    setTimeout(() => setGoalWidth(68), 400)
  }, [])

  const handleJoin = () => {
    if (code.length === 4) showToast(`🎉 Joined group ${code.toUpperCase()}!`)
    else showToast('Enter a valid 4-letter code')
  }

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
            <div className="yc-val">{user ? 'GR7X' : '????'}</div>
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
              />
              <button className="join-btn" onClick={handleJoin}>Join</button>
            </div>
          </div>
        </div>

        {/* GOAL */}
        <div className="goal-card">
          <div className="goal-top">
            <div className="goal-txt">🎯 Feb Goal: Remove 50 plastic bottles from the ocean</div>
            <div className="goal-pct">68%</div>
          </div>
          <div className="goal-bar-bg">
            <div className="goal-bar-fill" style={{ width: `${goalWidth}%` }} />
          </div>
          <div className="goal-sub-text">34 of 50 bottles equiv. · 6 members · 9 days left</div>
        </div>

        {/* LEADERBOARD */}
        <div className="lb-label">Leaderboard — February</div>
        {LEADERBOARD.map((row, i) => (
          <div key={i} className={`lb-row ${row.you ? 'you' : ''}`}>
            <div className="lb-rank" style={{ color: row.rankColor }}>{row.rank}</div>
            <div className="lb-av">{row.you && user ? user.avatar : row.av}</div>
            <div className="lb-name">{row.you && user ? user.name.split(' ')[0] : row.name}</div>
            <div className="lb-trips">{row.trips} trips</div>
            <div className="lb-pts">{row.pts.toLocaleString()} pts</div>
          </div>
        ))}
      </div>
    </div>
  )
}
