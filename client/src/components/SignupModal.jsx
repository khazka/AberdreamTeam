import { useState } from 'react'
import { createUser } from '../utils/api'

const AVATARS = ['🌿','🐢','🦋','🌍','⚡','🚴','🌊','🔥','🌱','🦅']
const PERSONAS = [
  { id: 'planet',  icon: '🌍', label: 'Planet'  },
  { id: 'fitness', icon: '💪', label: 'Fitness'  },
  { id: 'budget',  icon: '💰', label: 'Budget'   },
]

export default function SignupModal({ onClose, onSignup }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [avatar, setAvatar]   = useState('🌿')
  const [persona, setPersona] = useState('planet')
  const [error, setError]     = useState('')

  const handleSignup = async () => {
    if (!name.trim()) { setError('Enter your name to continue'); return }
    try {
      const user = await createUser({ name: name.trim(), email, avatar, persona })
      localStorage.setItem('greenUserId', user.id)
      localStorage.setItem('greenUser', JSON.stringify(user))
      onSignup(user)
    } catch {
      // Fallback if server is down — create local user
      const fallback = { id: `local_${Date.now()}`, name: name.trim(), email, avatar, persona, xp: 0, trips: [] }
      localStorage.setItem('greenUserId', fallback.id)
      localStorage.setItem('greenUser', JSON.stringify(fallback))
      onSignup(fallback)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Build your Green Avatar 🌿</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="modal-sub">
          Choose your avatar, set your green priority, unlock badges and XP as you make greener choices.
        </p>

        <input
          className="modal-input"
          placeholder="Your name"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
        />
        <input
          className="modal-input"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</p>}

        <div className="modal-section-label">Choose your avatar</div>
        <div className="avatar-chooser">
          {AVATARS.map(av => (
            <div
              key={av}
              className={`av-opt ${avatar === av ? 'selected' : ''}`}
              onClick={() => setAvatar(av)}
            >
              {av}
            </div>
          ))}
        </div>

        <div className="modal-section-label">Your green priority</div>
        <div className="persona-grid">
          {PERSONAS.map(p => (
            <div
              key={p.id}
              className={`persona-opt ${persona === p.id ? 'selected' : ''}`}
              onClick={() => setPersona(p.id)}
            >
              <div className="p-icon">{p.icon}</div>
              <div className="p-label">{p.label}</div>
            </div>
          ))}
        </div>

        <button className="modal-btn" onClick={handleSignup}>
          Create my Avatar →
        </button>
        <button className="modal-skip" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  )
}
