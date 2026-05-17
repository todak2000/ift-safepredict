import React, { useState, useRef, useEffect } from 'react'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhYcFfjTQzMxIhlqq1hisOh25BVoNlOc1NYq57eGUFfi3kOSSSM5WR-029TmvbNhXxSQ/exec'

async function fetchData(url, password) {
  const fullUrl = url + '?password=' + encodeURIComponent(password)
  console.log('[Analytics] Fetching:', fullUrl)

  const resp = await fetch(fullUrl)
  const text = await resp.text()
  console.log('[Analytics] Raw response length:', text.length, 'preview:', text.slice(0, 300))

  if (text.startsWith('<')) {
    throw new Error('Received HTML — the script probably needs authorization. Open the ? link in a browser first.')
  }

  try {
    return JSON.parse(text)
  } catch (_) {
    const m = text.match(/{.*}/s)
    if (m) return JSON.parse(m[0])
    throw new Error('Response is not JSON. Raw: ' + text.slice(0, 200))
  }
}

export default function AnalyticsDashboard() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState('')
  const [data, setData] = useState(null)
  const [debug, setDebug] = useState(null)

  const handleLogin = async () => {
    if (!password.trim()) { setError('Enter the password'); return }
    setLoading(true)
    setError('')
    setHelp('')
    setDebug(null)

    try {
      const res = await fetchData(APPS_SCRIPT_URL, password)
      setDebug({ total: res.total, rows: res.data?.length, firstRow: res.data?.[0] || null, keys: res.data?.length > 0 ? Object.keys(res.data[0]) : [] })

      if (res.error) {
        setError(res.error === 'Unauthorized' ? 'Wrong password' : res.error)
        return
      }
      setData(res)
      setAuthed(true)
    } catch (err) {
      console.error('[Analytics] Error:', err)
      setError(err.message)
      setHelp(
        '1. <a href="' + APPS_SCRIPT_URL + '?password=' + encodeURIComponent(password) + '" target="_blank" style="color:#3b82f6">Open script with password</a> in a new tab — if you see "Unauthorized" the password is wrong; if you see JSON data, the script works and you can refresh this page.<br>' +
        '2. Make sure you re-deployed the Apps Script <strong>after</strong> adding the doGet function.'
      )
    }
    setLoading(false)
  }

  const handleTest = () => {
    window.open(APPS_SCRIPT_URL + '?password=' + encodeURIComponent(password || ''), '_blank')
  }

  if (!authed) {
    return (
      <div className="analytics-standalone">
        <div className="an-login-card">
          <div className="an-login-header">
            <h1>IFT-<span>SafePredict</span></h1>
            <p>Admin Analytics</p>
          </div>
          <div className="an-login-form">
            <label className="an-label">Password</label>
            <div className="an-pw-wrap">
              <input
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Enter analytics password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
              <button className="an-eye" onClick={() => setPasswordVisible(v => !v)} tabIndex={-1}>
                {passwordVisible ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {error && <p className="an-error">{error}</p>}
            {help && <p className="an-help" dangerouslySetInnerHTML={{ __html: help }} />}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button className="an-btn an-btn-primary" onClick={handleLogin} disabled={loading} style={{ flex: 1 }}>
                {loading ? <span className="an-spinner" /> : 'View Dashboard'}
              </button>
              <button className="an-btn an-btn-ghost" onClick={handleTest} title="Test connection in new tab with your password">
                ?
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <DashboardView data={data} onLogout={() => { setAuthed(false); setData(null) }} />
}

function DashboardView({ data, onLogout }) {
  const rows = data?.data || []

  function classifyBrowser(ua) {
    if (!ua) return 'Unknown'
    if (ua.includes('Edg/') || ua.includes('Edge/') || ua.includes('EdgA/')) return 'Edge'
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera'
    if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) return 'Chrome'
    if (ua.includes('Safari/') && !ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Safari'
    if (ua.includes('Firefox/')) return 'Firefox'
    if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE'
    return 'Other'
  }

  const stats = React.useMemo(() => {
    if (rows.length === 0) return null
    const uniqueIPs = new Set(rows.map(r => r.IP).filter(Boolean))
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = rows.filter(r => (r.Timestamp || '').startsWith(today)).length
    const deviceCounts = {}
    const pageCounts = {}
    const countryCounts = {}
    const dailyCounts = {}
    const browserCounts = {}
    const referrerCounts = {}
    let totalDuration = 0, durationCount = 0
    rows.forEach(r => {
      const d = (r.Device || 'unknown').toLowerCase()
      deviceCounts[d] = (deviceCounts[d] || 0) + 1
      const p = r.Page || 'unknown'
      pageCounts[p] = (pageCounts[p] || 0) + 1
      const c = r.Country || 'Unknown'
      countryCounts[c] = (countryCounts[c] || 0) + 1
      const day = (r.Timestamp || '').slice(0, 10)
      if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1
      const b = classifyBrowser(r.Browser || r.browser)
      browserCounts[b] = (browserCounts[b] || 0) + 1
      const ref = r.Referrer || r.referrer || ''
      const source = !ref ? 'Direct' : ref.includes('google') ? 'Google' : ref.includes('facebook') || ref.includes('fb') ? 'Facebook' : ref.includes('twitter') || ref.includes('x.com') ? 'Twitter/X' : ref.includes('linkedin') ? 'LinkedIn' : ref.includes('instagram') ? 'Instagram' : 'Other'
      referrerCounts[source] = (referrerCounts[source] || 0) + 1
      const dur = parseFloat(r.Duration)
      if (dur > 0) { totalDuration += dur; durationCount++ }
    })
    return {
      total: rows.length, uniqueIPs: uniqueIPs.size, todayCount,
      avgDuration: durationCount ? (totalDuration / durationCount / 60).toFixed(1) : '—',
      devices: Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]),
      pages: Object.entries(pageCounts).sort((a, b) => b[1] - a[1]),
      countries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]),
      daily: Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0])),
      browsers: Object.entries(browserCounts).sort((a, b) => b[1] - a[1]),
      referrers: Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]),
      recent: rows.slice(0, 30),
      debug: { total: data.total, columns: rows.length > 0 ? Object.keys(rows[0]) : [], sample: rows[0] || null },
    }
  }, [rows])

  if (!stats) {
    return (
      <div className="analytics-standalone">
        <div className="an-login-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>IFT-<span style={{ color: '#3b82f6' }}>SafePredict</span></h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No visitor data yet.</p>
          <button className="an-btn an-btn-ghost" onClick={onLogout} style={{ marginTop: '1rem' }}>Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-standalone an-dash">
      <header className="an-dash-header">
        <h1>IFT-<span>SafePredict</span> <small>Analytics</small></h1>
        <button className="an-btn an-btn-ghost" onClick={onLogout}>Logout</button>
      </header>
      <div className="an-dash-body">
        <div className="an-stat-grid">
          {[
            ['Total Visits', stats.total],
            ['Unique IPs', stats.uniqueIPs],
            ['Today', stats.todayCount],
            ['Avg Session', stats.avgDuration !== '—' ? stats.avgDuration + 'm' : '—'],
          ].map(([label, value]) => (
            <div key={label} className="an-stat-item">
              <div className="an-stat-val">{value}</div>
              <div className="an-stat-lbl">{label}</div>
            </div>
          ))}
        </div>

        <div className="an-chart-grid">
          <ChartCard title="Page Views Over Time" id="daily-chart" type="line"
            data={stats.daily} labelKey={d => d[0].slice(5)} valueKey={d => d[1]}
            color="#3b82f6" fill="rgba(59,130,246,0.1)" />
          <ChartCard title="Devices" id="device-chart" type="doughnut"
            data={stats.devices} labelKey={d => d[0].charAt(0).toUpperCase() + d[0].slice(1)} valueKey={d => d[1]}
            colors={['#3b82f6', '#22c55e', '#eab308', '#ef4444']} />
          <ChartCard title="Browsers" id="browser-chart" type="doughnut"
            data={stats.browsers} labelKey={d => d[0]} valueKey={d => d[1]}
            colors={['#3b82f6', '#a855f7', '#22c55e', '#eab308', '#f97316', '#ef4444', '#64748b']} />
          <ChartCard title="Traffic Sources" id="source-chart" type="doughnut"
            data={stats.referrers} labelKey={d => d[0]} valueKey={d => d[1]}
            colors={['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#f97316', '#64748b']} />
        </div>

        <div className="an-table-grid">
          <div className="an-card"><h3>Top Pages</h3><div className="an-scroll"><AnTable headers={['Page', 'Views']} rows={stats.pages.slice(0, 10).map(([a, b]) => [a, b])} rightAlign={[1]} /></div></div>
          <div className="an-card"><h3>Countries</h3><div className="an-scroll"><AnTable headers={['Country', 'Visits']} rows={stats.countries.slice(0, 10).map(([a, b]) => [a || 'Unknown', b])} rightAlign={[1]} /></div></div>
        </div>

        <div className="an-card">
          <h3>Recent Visitors</h3>
          <div className="an-scroll" style={{ maxHeight: 340 }}>
            <AnTable
              headers={['Time', 'IP', 'Country', 'City', 'Device', 'Page', 'Duration']}
              rows={stats.recent.map(r => [
                fmtDate(r.Timestamp), r.IP || '—', r.Country || '—', r.City || '—',
                r.Device || '—', r.Page || '—', r.Duration && r.Duration !== '0' ? r.Duration + 's' : '—',
              ])}
            />
          </div>
        </div>

        <div className="an-card">
          <h3>Debug — Raw API Response</h3>
          <pre className="an-debug">{JSON.stringify(stats.debug, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}

function fmtDate(ts) {
  if (!ts || ts === '') return '—'
  try { return new Date(ts).toLocaleString() } catch (_) { return ts }
}

/* ─── Chart card (uses Chart.js from CDN) ───────────────────── */

function ChartCard({ title, id, type, data, labelKey, valueKey, color, fill, colors }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const [chartJsReady, setChartJsReady] = useState(!!window.Chart)

  useEffect(() => {
    if (window.Chart) { setChartJsReady(true); return }
    const handler = () => setChartJsReady(true)
    window.addEventListener('chartjs-loaded', handler)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js'
    s.onload = handler
    document.head.appendChild(s)
    return () => window.removeEventListener('chartjs-loaded', handler)
  }, [])

  useEffect(() => {
    if (!chartJsReady || !canvasRef.current || data.length === 0) return
    if (chartRef.current) chartRef.current.destroy()

    const ctx = canvasRef.current.getContext('2d')
    const isLine = type === 'line'

    chartRef.current = new window.Chart(ctx, {
      type: isLine ? 'line' : 'doughnut',
      data: isLine ? {
        labels: data.map(labelKey),
        datasets: [{
          label: 'Visits',
          data: data.map(valueKey),
          borderColor: color,
          backgroundColor: fill || color,
          fill: !!fill,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: color,
        }],
      } : {
        labels: data.map(labelKey),
        datasets: [{
          data: data.map(valueKey),
          backgroundColor: colors || ['#3b82f6', '#22c55e', '#eab308', '#ef4444'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: isLine ? { display: false } : { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 12 } },
        },
        scales: isLine ? {
          x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51,65,85,0.3)' }, beginAtZero: true },
        } : undefined,
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data, title, chartJsReady])

  return (
    <div className="an-card">
      <h3>{title}</h3>
      <div className="an-chart-wrap"><canvas ref={canvasRef} /></div>
    </div>
  )
}

function AnTable({ headers, rows, rightAlign }) {
  return (
    <table className="an-table">
      <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => (
          <td key={j} style={rightAlign?.includes(j) ? { textAlign: 'right', fontWeight: 600 } : undefined}>{cell}</td>
        ))}</tr>
      ))}</tbody>
    </table>
  )
}
