/* ─── CONFIGURATION ──────────────────────────────────────────────
 * 1. Create a Google Sheet
 * 2. Extensions → Apps Script → paste Code.gs (provided)
 * 3. Deploy → Web App → "Anyone" → copy URL
 * 4. Paste URL below
 * ─────────────────────────────────────────────────────────────── */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfX_vSoTvvmORqPhMEALYmS5dsRi5FEsHjy29bwIA5u9hqUyRvmgDEPCrvXhkC0cyidQ/exec'

/* ─── VISITOR TRACKING ────────────────────────────────────────── */

const SESSION_ID = crypto.randomUUID()
const PAGE_LOAD_TIME = Date.now()
let pageTracked = false

function getDeviceInfo() {
  const ua = navigator.userAgent
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

export async function trackPageView(page) {
  if (!APPS_SCRIPT_URL || pageTracked) return
  if (page.startsWith('/analytics')) return
  if (!page || page.trim() === '') page = '/'
  pageTracked = true

  let geo = { ip: '', country: '', city: '' }
  async function tryGeo(url, parser) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
      if (!res.ok) return false
      const d = await res.json()
      return parser(d)
    } catch { return false }
  }
  await tryGeo('https://ipinfo.io/json', d => d.ip && (geo = { ip: d.ip, country: d.country || '', city: d.city || '' }))
    || await tryGeo('https://api.ipify.org?format=json', d => d.ip && (geo.ip = d.ip) )

  const payload = {
    sessionId: SESSION_ID,
    timestamp: new Date().toISOString(),
    ip: geo.ip,
    country: geo.country,
    city: geo.city,
    device: getDeviceInfo(),
    browser: navigator.userAgent,
    page,
    referrer: document.referrer || '',
    duration: 0,
    pageLoadTime: PAGE_LOAD_TIME,
  }

  try {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    })
  } catch (_) {}
}

export function trackPageExit() {
  if (!APPS_SCRIPT_URL) return
  const duration = Math.round((Date.now() - PAGE_LOAD_TIME) / 1000)
  const payload = JSON.stringify({
    sessionId: SESSION_ID,
    duration,
    action: 'exit',
    timestamp: new Date().toISOString(),
  })
  try {
    navigator.sendBeacon(APPS_SCRIPT_URL, new Blob([payload], { type: 'text/plain' }))
  } catch (_) {}
}

/* ─── SHAREABLE URLs ──────────────────────────────────────────── */

export function encodeInputs(inputs) {
  const p = new URLSearchParams()
  p.set('P', inputs.P)
  p.set('T', inputs.T)
  p.set('sal', inputs.salinity ?? 1)
  p.set('drho', inputs.drho)
  p.set('MCM', inputs.MCM)
  p.set('BCM', inputs.BCM)
  p.set('CH4', inputs.x_CH4)
  p.set('N2', inputs.x_N2)
  p.set('brine', inputs.brineType)
  return p.toString()
}

export function decodeHash() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const p = new URLSearchParams(hash)
  if (!p.get('P')) return null
  return {
    P: parseFloat(p.get('P')),
    T: parseFloat(p.get('T')),
    salinity: parseFloat(p.get('sal')) || 1,
    drho: parseFloat(p.get('drho')) || 0,
    MCM: parseFloat(p.get('MCM')) || 0,
    BCM: parseFloat(p.get('BCM')) || 0,
    x_CH4: parseFloat(p.get('CH4')) || 0,
    x_N2: parseFloat(p.get('N2')) || 0,
    brineType: p.get('brine') || '',
    eosEstimated: false,
  }
}

export function buildShareUrl(inputs) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${encodeInputs(inputs)}`
}

export { APPS_SCRIPT_URL }
