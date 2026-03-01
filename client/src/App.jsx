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
    // Restore user from localStorage on refresh
    try { return JSON.parse(localStorage.getItem('core2g_user')) } catch { return null }
  })
  const [toast, setToast]         = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

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

  // Called by Journey after a trip is logged — updates XP in state + localStorage
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
    </div>
  )
}