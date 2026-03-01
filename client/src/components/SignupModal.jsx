import { useState } from 'react'
import { createUser } from '../utils/api'

const AVATARS = ['🌿','🐢','🦋','🌍','⚡','🚴','🌊','🔥','🌱','🦅']
const PERSONAS = [
  { id: 'planet',  icon: '🌍', label: 'Planet'  },
  { id: 'fitness', icon: '💪', label: 'Fitness'  },
  { id: 'budget',  icon: '💰', label: 'Budget'   },
]
const MOTIVATIONS = [
  { id: 'money',       icon: '💰', label: 'Save money on commuting' },
  { id: 'health',      icon: '💪', label: 'Stay active and healthy' },
  { id: 'environment', icon: '🌍', label: 'Reduce my carbon footprint' },
  { id: 'future',      icon: '👨‍👩‍👧', label: 'For future generations' },
]

export default function SignupModal({ onClose, onSignup }) {
  const [step, setStep]           = useState(1)
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [avatar, setAvatar]       = useState('🌿')
  const [persona, setPersona]     = useState('planet')
  const [motivation, setMotivation] = useState('environment')
  const [error, setError]         = useState('')

  const handleSignup = async () => {
    try {
      const user = await createUser({ name: name.trim(), email, avatar, persona, motivation })
      localStorage.setItem('greenUserId', user.id)
      localStorage.setItem('greenUser', JSON.stringify({ ...user, motivation }))
      onSignup({ ...user, motivation })
    } catch {
      const fallback = { id: `local_${Date.now()}`, name: name.trim(), email, avatar, persona, motivation, xp: 0, trips: [] }
      localStorage.setItem('greenUserId', fallback.id)
      localStorage.setItem('greenUser', JSON.stringify(fallback))
      onSignup(fallback)
    }
  }

  const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.co.uk', 'icloud.com']

  const nextStep = () => {
    if (step === 1) {
      if (!name.trim()) { setError('Enter your name to continue'); return }
      if (email.trim()) {
        const domain = email.trim().toLowerCase().split('@')[1]
        if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
          setError('Please use a Gmail, Outlook, Yahoo, or iCloud email')
          return
        }
      }
    }
    setError('')
    setStep(s => s + 1)
  }

  const TITLES = ['Your Details', 'Your Avatar', 'Your Why']

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{TITLES[step - 1]} 🌿</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', margin:'0.5rem 0 1rem' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', fontWeight:600,
              color: s === step ? 'var(--accent)' : s < step ? 'var(--green)' : 'var(--muted)',
            }}>
              <div style={{
                width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center',
                fontSize:'0.7rem', fontWeight:700,
                background: s < step ? 'var(--green)' : s === step ? 'var(--accent)' : 'var(--surface2)',
                color: s <= step ? '#fff' : 'var(--muted)',
              }}>{s < step ? '✓' : s}</div>
              <span style={{ display: s === step ? 'inline' : 'none' }}>Step {s} of 3</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Name & Email */}
        {step === 1 && (
          <>
            <p className="modal-sub">Let's get started — tell us a bit about yourself.</p>
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
            <button className="modal-btn" onClick={nextStep}>Next →</button>
          </>
        )}

        {/* STEP 2: Avatar & Persona */}
        {step === 2 && (
          <>
            <p className="modal-sub">Choose your avatar and green priority.</p>
            <div className="modal-section-label">Choose your avatar</div>
            <div className="avatar-chooser">
              {AVATARS.map(av => (
                <div key={av} className={`av-opt ${avatar === av ? 'selected' : ''}`} onClick={() => setAvatar(av)}>
                  {av}
                </div>
              ))}
            </div>
            <div className="modal-section-label">Your green priority</div>
            <div className="persona-grid">
              {PERSONAS.map(p => (
                <div key={p.id} className={`persona-opt ${persona === p.id ? 'selected' : ''}`} onClick={() => setPersona(p.id)}>
                  <div className="p-icon">{p.icon}</div>
                  <div className="p-label">{p.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <button className="modal-skip" onClick={() => setStep(1)} style={{ flex:1 }}>← Back</button>
              <button className="modal-btn" onClick={nextStep} style={{ flex:2 }}>Next →</button>
            </div>
          </>
        )}

        {/* STEP 3: Motivation */}
        {step === 3 && (
          <>
            <p className="modal-sub">What's your main reason for travelling greener?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'1rem' }}>
              {MOTIVATIONS.map(m => (
                <div
                  key={m.id}
                  onClick={() => setMotivation(m.id)}
                  style={{
                    padding:'1rem 0.75rem', borderRadius:'12px', cursor:'pointer', textAlign:'center',
                    border: motivation === m.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: motivation === m.id ? 'rgba(22,163,74,0.08)' : 'var(--surface2)',
                    transition:'all 0.2s',
                  }}
                >
                  <div style={{ fontSize:'1.6rem', marginBottom:'0.4rem' }}>{m.icon}</div>
                  <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <button className="modal-skip" onClick={() => setStep(2)} style={{ flex:1 }}>← Back</button>
              <button className="modal-btn" onClick={handleSignup} style={{ flex:2 }}>Create my Avatar →</button>
            </div>
          </>
        )}

        <button className="modal-skip" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  )
}