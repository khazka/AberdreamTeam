export default function Navbar({ screen, setScreen, theme, toggleTheme, user, onAvatarClick }) {
  const LEVELS = [
    { min: 0,    max: 199,  level: 1 },
    { min: 200,  max: 499,  level: 2 },
    { min: 500,  max: 999,  level: 3 },
    { min: 1000, max: 1999, level: 4 },
    { min: 2000, max: Infinity, level: 5 },
  ]
  const getLevel = (xp) => LEVELS.find(l => xp >= l.min && xp < l.max)?.level || 1

  return (
    <nav className="navbar">
      <button className="navbar-logo" onClick={() => setScreen('journey')}>
        Green<span>Miles</span>
      </button>

      <div className="navbar-center">
        {[
          { id: 'journey', label: '🗺 Journey' },
          { id: 'impact',  label: '🌱 Impact'  },
          { id: 'challenge', label: '🏆 Challenge' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${screen === tab.id ? 'active' : ''}`}
            onClick={() => setScreen(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        {/* Theme toggle */}
        <div className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          <div className="theme-icons">
            <span>☀️</span>
            <span>🌙</span>
          </div>
        </div>

        {/* Avatar button */}
        <button className="avatar-btn" onClick={onAvatarClick}>
          <div className="avatar-ring">
            <span>{user?.avatar || '🌿'}</span>
            {user && (
              <div className="avatar-lvl-badge">Lv{getLevel(user.xp || 847)}</div>
            )}
          </div>
          <span>{user ? user.name.split(' ')[0] : 'Green Avatar'}</span>
        </button>
      </div>
    </nav>
  )
}
