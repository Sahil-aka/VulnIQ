import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">V</span><span>VulnIQ</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav><a className="active" href="#overview">Overview</a><a href="#targets">Targets</a><a href="#scans">Scans</a><a href="#findings">Findings</a></nav>
        <div className="sidebar-foot"><span className="online-dot" /> Demo environment</div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><span>Vulnerability Detection Platform</span><span className="user-pill">Demo admin</span></header>
        <div className="content">
          <div className="heading-row"><div><p className="eyebrow">SECURITY OVERVIEW</p><h1>Good morning</h1><p className="subtitle">Your scan results will appear here once the API is connected.</p></div><button disabled>＋ New scan</button></div>
          <div className="stats">
            {[['Total findings', '—', 'Across all scans'], ['Critical', '—', 'Needs attention'], ['High', '—', 'Prioritize soon'], ['Scans', '—', 'No scans yet']].map(([label, value, note]) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon">↗</span></div><strong>{value}</strong><small>{note}</small></article>)}
          </div>
          <div className="panels">
            <article className="panel"><div className="panel-head"><div><h2>Recent scans</h2><p>Activity across your targets</p></div><span className="quiet-tag">LIVE</span></div><div className="empty-state"><span className="empty-icon">⌕</span><strong>No scans yet</strong><p>Add a target, then run a Trivy or Nmap scan to get started.</p></div></article>
            <article className="panel"><div className="panel-head"><div><h2>Findings by severity</h2><p>Current risk distribution</p></div></div><div className="chart-empty"><div className="ring"><span>—</span></div><div className="legend"><span><i className="critical"/>Critical <b>—</b></span><span><i className="high"/>High <b>—</b></span><span><i className="medium"/>Medium <b>—</b></span><span><i className="low"/>Low <b>—</b></span></div></div></article>
          </div>
          <footer>VulnIQ <span>•</span> Phase 1 demo scaffold</footer>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
