import { useState } from 'react'
import Journey from './pages/Journey'
import Impact from './pages/Impact'
import Challenge from './pages/Challenge'
import Navbar from './components/Navbar'
import SignupModal from './components/SignupModal'
import Toast from './components/Toast'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('journey')
  const [theme, setTheme] = useState('dark')
  const [showSignup, setShowSignup] = useState(false)
  const [user, setUser] = useState(() => {
    try { const saved = localStorage.getItem('greenUser'); return saved ? JSON.parse(saved) : null }
    catch { return null }
  })
  const [toast, setToast] = useState('')

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSignup = (userData) => {
    setUser(userData)
    localStorage.setItem('greenUser', JSON.stringify(userData))
    setShowSignup(false)
    showToast(`Welcome, ${userData.name.split(' ')[0]}! ${userData.avatar} Avatar created`)
    setTimeout(() => setScreen('impact'), 900)
  }

  return (
    <div className="app-root" data-theme={theme}>
      <Navbar
        screen={screen}
        setScreen={setScreen}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onAvatarClick={() => setShowSignup(true)}
      />
      <main className="app-main">
        {screen === 'journey' && (
          <Journey
            user={user}
            showToast={showToast}
            onNeedSignup={() => setShowSignup(true)}
          />
        )}
        {screen === 'impact' && (
          <Impact
            key={screen}
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
