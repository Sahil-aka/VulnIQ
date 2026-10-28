import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, Finding, Scan, setToken, Summary, Target } from './api';
import './style.css';
import './app.css';

type Page = 'overview' | 'targets' | 'scans' | 'findings';
const pages: { id: Page; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◫' }, { id: 'targets', label: 'Targets', icon: '⌖' },
  { id: 'scans', label: 'Scans', icon: '◎' }, { id: 'findings', label: 'Findings', icon: '▤' },
];

function App() {
  const [token, setAuthToken] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [severity, setSeverity] = useState('');
  const [tool, setTool] = useState('');
  const [findingPage, setFindingPage] = useState(1);

  const loadSummary = useCallback(async () => setSummary(await api.summary()), []);
  const loadTargets = useCallback(async () => setTargets(await api.targets()), []);
  const loadScans = useCallback(async () => setScans(await api.scans()), []);
  const loadFindings = useCallback(async () => {
    const params = new URLSearchParams({ page: String(findingPage), page_size: '50' });
    if (severity) params.set('severity', severity);
    if (tool) params.set('tool', tool);
    setFindings(await api.findings(params));
  }, [findingPage, severity, tool]);
  const refreshTargets = useCallback(() => { void loadTargets().catch(e => setError(e.message)); }, [loadTargets]);

  useEffect(() => { if (!token) return; setError(''); void loadSummary().catch(e => setError(e.message)); }, [token, loadSummary]);
  useEffect(() => { if (token && page === 'targets') void loadTargets().catch(e => setError(e.message)); }, [token, page, loadTargets]);
  useEffect(() => { if (token && page === 'scans') void loadScans().catch(e => setError(e.message)); }, [token, page, loadScans]);
  useEffect(() => { if (!token || page !== 'findings') return; void loadFindings().catch(e => setError(e.message)); }, [token, page, loadFindings]);
  useEffect(() => {
    if (!token || page !== 'scans' || !scans.some(scan => scan.status === 'queued' || scan.status === 'running')) return;
    const timer = window.setInterval(() => { void loadScans().catch(e => setError(e.message)); }, 3000);
    return () => window.clearInterval(timer);
  }, [token, page, scans, loadScans]);

  async function run(action: () => Promise<unknown>, after?: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); if (after) await after(); await loadSummary(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }

  function onLogin(username: string, password: string) {
    void run(async () => { const result = await api.login(username, password); setToken(result.access_token); setAuthToken(result.access_token); });
  }

  if (!token) return <Login onLogin={onLogin} error={error} busy={busy} />;

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">V</span><span>VulnIQ</span></div>
      <p className="nav-label">WORKSPACE</p>
      <nav>{pages.map(item => <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(item.id); setError(''); }}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <button className="sidebar-foot" onClick={() => { setToken(null); setAuthToken(null); }}>↪ &nbsp;Sign out</button>
    </aside>
    <section className="main-panel">
      <header className="topbar"><span>Vulnerability Detection Platform</span><span className="user-pill"><i className="online-dot" /> Demo admin</span></header>
      <div className="content">
        {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
        {page === 'overview' && <Dashboard summary={summary} onNavigate={setPage} />}
        {page === 'targets' && <Targets targets={targets} busy={busy} onAdd={body => run(() => api.addTarget(body), loadTargets)} onDelete={id => run(() => api.deleteTarget(id), loadTargets)} />}
        {page === 'scans' && <Scans targets={targets} scans={scans} busy={busy} onRefresh={() => run(loadScans)} onStart={(id, scanner) => run(() => api.startScan(id, scanner), loadScans)} onLoadTargets={refreshTargets} />}
        {page === 'findings' && <Findings rows={findings} severity={severity} tool={tool} page={findingPage} onSeverity={v => { setFindingPage(1); setSeverity(v); }} onTool={v => { setFindingPage(1); setTool(v); }} onPage={setFindingPage} />}
        <footer>VulnIQ <span>•</span> Phase 1 demo</footer>
      </div>
    </section>
  </main>;
}

function Login({ onLogin, error, busy }: { onLogin: (u: string, p: string) => void; error: string; busy: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onLogin(String(form.get('username')), String(form.get('password'))); }
  return <main className="login-shell"><section className="login-card"><div className="brand login-brand"><span className="brand-mark">V</span><span>VulnIQ</span></div><p className="eyebrow">SECURITY WORKSPACE</p><h1>Welcome back</h1><p className="subtitle">Sign in to review your scan results.</p>{error && <div className="alert">{error}</div>}<form onSubmit={submit} className="stack-form"><label>Username<input name="username" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><small className="muted">Credentials are configured in your local .env file.</small></section></main>;
}

function Dashboard({ summary, onNavigate }: { summary: Summary | null; onNavigate: (p: Page) => void }) {
  const counts = summary?.by_severity ?? {};
  return <>
    <div className="heading-row"><div><p className="eyebrow">SECURITY OVERVIEW</p><h1>Good morning</h1><p className="subtitle">A unified view of findings from your lab scans.</p></div><button className="primary" onClick={() => onNavigate('scans')}>＋ New scan</button></div>
    <div className="stats">{[['Total findings', summary?.total_findings ?? '—', 'Across all scans'], ['Critical', counts.CRITICAL ?? '—', 'Needs attention'], ['High', counts.HIGH ?? '—', 'Prioritize soon'], ['Medium', counts.MEDIUM ?? '—', 'Review findings'], ['Low', counts.LOW ?? '—', 'Lower priority']].map(([label, value, note]) => <article className="stat-card" key={String(label)}><div className="stat-top"><span>{label}</span><span className="stat-icon">↗</span></div><strong>{value}</strong><small>{note}</small></article>)}</div>
    <div className="panels"><article className="panel"><div className="panel-head"><div><h2>Recent scans</h2><p>Activity across your targets</p></div><button className="text-button" onClick={() => onNavigate('scans')}>View all</button></div>{!summary ? <Loading /> : summary.last_scans.length === 0 ? <Empty title="No scans yet" text="Add a target and start a Trivy or Nmap scan." /> : <ScanTable scans={summary.last_scans} />}</article>
      <article className="panel"><div className="panel-head"><div><h2>Findings by severity</h2><p>Current risk distribution</p></div></div>{!summary ? <Loading /> : <div className="severity-grid">{['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(s => <div className="severity-row" key={s}><Severity severity={s}/><b>{counts[s] ?? 0}</b></div>)}<div className="tool-counts"><span>Trivy <b>{summary.by_tool.trivy ?? 0}</b></span><span>Nmap <b>{summary.by_tool.nmap ?? 0}</b></span></div></div>}</article></div>
  </>;
}

function Targets({ targets, busy, onAdd, onDelete }: { targets: Target[]; busy: boolean; onAdd: (body: { name: string; type: 'host' | 'image'; value: string }) => void; onDelete: (id: number) => void }) {
  const [type, setType] = useState<'host'|'image'>('image');
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); onAdd({ name: String(form.get('name')).trim(), type, value: String(form.get('value')).trim() }); event.currentTarget.reset(); }
  return <><PageHeading eyebrow="INVENTORY" title="Targets" subtitle="Manage the images and private lab hosts you can scan." />
    <section className="panel form-panel"><h2>Add target</h2><form className="inline-form" onSubmit={submit}><label>Name<input name="name" placeholder="Juice Shop image" required maxLength={120}/></label><label>Type<select value={type} onChange={e => setType(e.target.value as 'host'|'image')}><option value="image">Image</option><option value="host">Host</option></select></label><label className="grow">Image name or host<input name="value" placeholder={type === 'image' ? 'bkimminich/juice-shop' : 'juice-shop'} required maxLength={512}/></label><button className="primary" disabled={busy}>Add target</button></form></section>
    <section className="panel table-panel"><div className="panel-head"><div><h2>Saved targets</h2><p>{targets.length} target{targets.length === 1 ? '' : 's'}</p></div></div>{targets.length === 0 ? <Empty title="No targets saved" text="Add an image for Trivy or a private host for Nmap."/> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Added</th><th/></tr></thead><tbody>{targets.map(t => <tr key={t.id}><td>{t.name}</td><td><span className="tool-pill">{t.type}</span></td><td className="mono">{t.value}</td><td>{date(t.created_at)}</td><td><button className="icon-button danger-text" title={`Delete ${t.name}`} onClick={() => onDelete(t.id)}>×</button></td></tr>)}</tbody></table></div>}</section>
  </>;
}

function Scans({ targets, scans, busy, onRefresh, onStart, onLoadTargets }: { targets: Target[]; scans: Scan[]; busy: boolean; onRefresh: () => void; onStart: (id: number, tool: 'trivy'|'nmap') => void; onLoadTargets: () => void }) {
  const [targetId, setTargetId] = useState(''); const [tool, setTool] = useState<'trivy'|'nmap'>('trivy');
  useEffect(() => { onLoadTargets(); }, [onLoadTargets]);
  const choices = targets.filter(t => t.type === (tool === 'trivy' ? 'image' : 'host'));
  function submit(e: FormEvent) { e.preventDefault(); if (targetId) onStart(Number(targetId), tool); }
  return <><PageHeading eyebrow="SCAN ACTIVITY" title="Scans" subtitle="Start a scanner and follow its status." action={<button className="secondary" onClick={onRefresh}>↻ Refresh</button>} />
    <section className="panel form-panel"><h2>Start a scan</h2><form className="inline-form" onSubmit={submit}><label>Scanner<select value={tool} onChange={e => { setTool(e.target.value as 'trivy'|'nmap'); setTargetId(''); }}><option value="trivy">Trivy image scan</option><option value="nmap">Nmap host scan</option></select></label><label className="grow">Target<select value={targetId} onChange={e => setTargetId(e.target.value)} required><option value="">Choose a target</option>{choices.map(t => <option key={t.id} value={t.id}>{t.name} — {t.value}</option>)}</select></label><button className="primary" disabled={busy || !choices.length}>Start scan</button></form>{!choices.length && <p className="form-hint">Add a matching {tool === 'trivy' ? 'image' : 'host'} target first.</p>}</section>
    <section className="panel table-panel"><div className="panel-head"><div><h2>Recent scans</h2><p>Refreshes automatically while you are here</p></div></div>{scans.length === 0 ? <Empty title="No scans yet" text="Choose a target above to start your first scan."/> : <ScanTable scans={scans} />}</section>
  </>;
}

function Findings({ rows, severity, tool, page, onSeverity, onTool, onPage }: { rows: Finding[]; severity: string; tool: string; page: number; onSeverity: (v:string)=>void; onTool:(v:string)=>void; onPage:(v:number)=>void }) {
  return <><PageHeading eyebrow="SCAN RESULTS" title="Findings" subtitle="Review normalized findings from all completed scans." />
    <section className="panel table-panel"><div className="filters"><label>Severity<select value={severity} onChange={e => onSeverity(e.target.value)}><option value="">All severities</option>{['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(s => <option key={s}>{s}</option>)}</select></label><label>Tool<select value={tool} onChange={e => onTool(e.target.value)}><option value="">All tools</option><option value="trivy">Trivy</option><option value="nmap">Nmap</option></select></label></div>
    {rows.length === 0 ? <Empty title="No findings match" text="Try another filter, or run a scan to populate this table."/> : <div className="table-wrap"><table><thead><tr><th>Tool</th><th>Asset</th><th>Finding</th><th>CVE</th><th>Severity</th><th>Fixed version</th></tr></thead><tbody>{rows.map(f => <tr key={f.id}><td><span className="tool-pill">{f.tool}</span></td><td className="mono">{f.asset}</td><td><strong>{f.title}</strong>{f.description && <small className="cell-description">{f.description}</small>}</td><td>{f.cve_id || '—'}</td><td><Severity severity={f.severity}/></td><td>{f.fixed_version || '—'}</td></tr>)}</tbody></table></div>}
    <div className="pagination"><button className="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Previous</button><span>Page {page}</span><button className="secondary" disabled={rows.length < 50} onClick={() => onPage(page + 1)}>Next →</button></div></section>
  </>;
}

function ScanTable({ scans }: { scans: Scan[] }) { return <div className="table-wrap"><table><thead><tr><th>Scan</th><th>Tool</th><th>Target</th><th>Status</th><th>Started</th></tr></thead><tbody>{scans.map(scan => <tr key={scan.id}><td>#{scan.id}</td><td><span className="tool-pill">{scan.tool}</span></td><td>Target #{scan.target_id}</td><td><span className={`status-pill ${scan.status}`}>{scan.status}</span>{scan.error && <small className="cell-error">{scan.error}</small>}</td><td>{date(scan.started_at || scan.created_at)}</td></tr>)}</tbody></table></div>; }
function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) { return <div className="heading-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</div>; }
function Severity({ severity }: { severity: string }) { return <span className={`severity-pill ${severity.toLowerCase()}`}>{severity}</span>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span className="empty-icon">⌕</span><strong>{title}</strong><p>{text}</p></div>; }
function Loading() { return <div className="empty-state"><strong>Loading…</strong></div>; }
function date(value: string | null) { if (!value) return '—'; return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
