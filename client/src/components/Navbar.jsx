export default function Navbar({ screen, setScreen, theme, toggleTheme, user, onAvatarClick, showProfileMenu, onCloseProfileMenu, onLogout }) {
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

        {/* Avatar button + profile dropdown */}
        <div style={{ position: 'relative' }}>
          <button className="avatar-btn" onClick={onAvatarClick}>
            <div className="avatar-ring">
              <span>{user?.avatar || '🌿'}</span>
              {user && (
                <div className="avatar-lvl-badge">Lv{getLevel(user.xp || 847)}</div>
              )}
            </div>
            <span>{user ? user.name.split(' ')[0] : 'Green Avatar'}</span>
          </button>

          {/* Profile dropdown — only shown when logged in and toggled */}
          {showProfileMenu && user && (
            <>
              {/* invisible backdrop to close on outside click */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={onCloseProfileMenu}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: '220px', borderRadius: '14px', zIndex: 100,
                background: 'var(--surface)', border: '1px solid var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}>
                {/* User info header */}
                <div style={{
                  padding: '1rem', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '0.7rem',
                }}>
                  <div style={{ fontSize: '2rem', lineHeight: 1 }}>{user.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>Level {getLevel(user.xp || 0)} · {(user.xp || 0).toLocaleString()} XP</div>
                  </div>
                </div>

                {/* XP bar */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>XP Progress</div>
                  <div style={{ height: '6px', borderRadius: '99px', background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      background: 'var(--green, #16a34a)',
                      width: `${Math.min(100, Math.round(((user.xp || 0) % 200) / 200 * 100))}%`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Log out button */}
                <button
                  onClick={onLogout}
                  style={{
                    width: '100%', padding: '0.8rem 1rem', background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'var(--red, #ef4444)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  🚪 Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}