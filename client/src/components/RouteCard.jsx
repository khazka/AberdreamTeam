export default function RouteCard({ mode, name, emoji, badge, badgeClass, stats, selected, onSelect }) {
  return (
    <div
      className={`route-card ${mode} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="route-top">
        <div className="route-mode-row">
          <span className="route-emoji">{emoji}</span>
          <span className="route-name">{name}</span>
        </div>
        {badge && <span className={`badge ${badgeClass}`}>{badge}</span>}
      </div>
      <div className="route-stats">
        <div>
          <div className="stat-label">Time</div>
          <div className="stat-value">{stats.time}</div>
        </div>
        <div>
          <div className="stat-label">CO₂</div>
          <div className={`stat-value ${stats.co2Class}`}>{stats.co2}</div>
        </div>
        <div>
          <div className="stat-label">Cost</div>
          <div className={`stat-value ${stats.costClass}`}>{stats.cost}</div>
        </div>
        <div>
          <div className="stat-label">Calories</div>
          <div className={`stat-value ${stats.calClass || ''}`}>{stats.cal}</div>
        </div>
      </div>
    </div>
  )
}
