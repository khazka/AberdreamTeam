import { useState, useEffect } from 'react'
import Journey from './pages/Journey'
import Impact from './pages/Impact'
import Challenge from './pages/Challenge'
import Navbar from './components/Navbar'
import SignupModal from './components/SignupModal'
import Toast from './components/Toast'
import { createUser } from './utils/api'
import './App.css'

export default function App() {
  const [screen, setScreen]       = useState('journey')
  const [theme, setTheme]         = useState(() => localStorage.getItem('theme') || 'dark')
  const [showSignup, setShowSignup] = useState(false)
  const [user, setUser]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('core2g_user')) } catch { return null }
  })
  const [toast, setToast]         = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Show welcome popup once ever
  useEffect(() => {
    if (!localStorage.getItem('welcomed')) {
      setTimeout(() => setShowWelcome(true), 600)
      localStorage.setItem('welcomed', 'true')
    }
  }, [])

const handleSignup = async (formData) => {
  try {
    const savedUser = await createUser({
      name:    formData.name,
      email:   formData.email,
      avatar:  formData.avatar,
      persona: formData.persona,
    })
    const fullUser = { ...savedUser, avatar: formData.avatar, persona: formData.persona, motivation: formData.motivation }
    setUser(fullUser)
    localStorage.setItem('core2g_user', JSON.stringify(fullUser))
    setShowSignup(false)
    showToast(`Welcome, ${fullUser.name.split(' ')[0]}! ${fullUser.avatar} Avatar created`)
    setTimeout(() => setScreen('impact'), 900)
  } catch {
    const localUser = {
      id:      `local_${Date.now()}`,
      name:    formData.name,
      email:   formData.email,
      avatar:  formData.avatar,
      persona: formData.persona,
      motivation: formData.motivation,
      xp:      0,
    }
    setUser(localUser)
    localStorage.setItem('core2g_user', JSON.stringify(localUser))
    setShowSignup(false)
    showToast(`Welcome, ${localUser.name.split(' ')[0]}! ${localUser.avatar} Avatar created`)
    setTimeout(() => setScreen('impact'), 900)
  }
}

  const handleLogout = () => {
    setUser(null)
    setShowProfileMenu(false)
    localStorage.removeItem('core2g_user')
    localStorage.removeItem('greenUserId')
    localStorage.removeItem('greenUser')
    setScreen('journey')
    showToast('👋 Logged out successfully')
  }

  const handleTripLogged = (xpEarned) => {
    if (!user) return
    const updated = { ...user, xp: (user.xp || 0) + xpEarned }
    setUser(updated)
    localStorage.setItem('core2g_user', JSON.stringify(updated))
  }

  return (
    <div className="app-root" data-theme={theme}>
      <Navbar
        screen={screen}
        setScreen={setScreen}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onAvatarClick={() => user ? setShowProfileMenu(p => !p) : setShowSignup(true)}
        showProfileMenu={showProfileMenu}
        onCloseProfileMenu={() => setShowProfileMenu(false)}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {screen === 'journey' && (
          <Journey
            user={user}
            showToast={showToast}
            onNeedSignup={() => setShowSignup(true)}
            onTripLogged={handleTripLogged}
            onGoToImpact={() => setScreen('impact')}
          />
        )}
        {screen === 'impact' && (
          <Impact
            user={user}
            onNeedSignup={() => setShowSignup(true)}
          />
        )}
        {screen === 'challenge' && (
          <Challenge
            user={user}
            showToast={showToast}
          />
        )}
      </main>

      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSignup={handleSignup}
        />
      )}

      <Toast message={toast} />

      {/* ── WELCOME POPUP ── */}
      {showWelcome && (
        <>
          {/* dark backdrop */}
          <div
            onClick={() => setShowWelcome(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease',
            }}
          />

          {/* popup card */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            width: 'min(360px, 90vw)',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>🌿</div>

            <div style={{
              fontSize: '1.5rem', fontWeight: 800,
              color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2,
            }}>
              Welcome to GreenMiles!
            </div>

            <div style={{
              fontSize: '0.88rem', color: 'var(--muted)',
              lineHeight: 1.6, marginBottom: '1.75rem',
            }}>
              Track your green journeys, reduce your carbon footprint, and earn XP every trip. 🚴‍♂️🌍
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              style={{
                width: '100%', padding: '0.85rem',
                borderRadius: '12px', border: 'none',
                background: 'var(--accent, #16a34a)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Let's Go! 🚀
            </button>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes popIn  { from { opacity: 0; transform: translate(-50%, -48%) scale(0.85) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
          `}</style>
        </>
      )}
    </div>
  )
}