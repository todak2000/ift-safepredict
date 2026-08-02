import React, { useState, useMemo } from 'react'

const G = 9.81

const PRESETS = {
  sleipner: {
    label: 'Sleipner (Utsira Sand)',
    trap: 'open',
    Pe: 1.8,        // MPa, Nordland shale entry pressure
    rc: 0,          // µm, 0 → derive from P_e
    theta: 30,      // deg, water-wet quartz
    drho: 391.6,    // kg/m³
    gammaLit: 31,   // mN/m, Bachu & Bennion (2009)
    A: 140,         // km², Utsira extent (seal-integrity case; not used for M)
    phi: 0.15,
    rhoCO2: 700,
    SCO2max: 0.60,
  },
  insalah: {
    label: 'In Salah (Krechba)',
    trap: 'structural',
    Pe: 3.5,        // MPa, caprock entry pressure (3–5 MPa range)
    rc: 1.0,        // µm, reservoir pore throat r_res (Rutqvist et al. 2009)
    theta: 40,      // deg, CO₂-brine-sandstone at 90°C
    drho: 400,      // kg/m³
    gammaLit: 27,   // mN/m, Bachu & Bennion (2009)
    A: 16,          // km² (thesis Table 4.18 states 160 km² but stated Mt values match 16 km²)
    phi: 0.15,
    rhoCO2: 650,
    SCO2max: 0.60,  // 1 − Swr, Swr ≈ 0.40
  },
}

const toRad = deg => (deg * Math.PI) / 180

export default function CapillaryHeightCalculator({ result }) {
  const [preset, setPreset] = useState('insalah')
  const [trap, setTrap] = useState(PRESETS.insalah.trap)
  const [Pe, setPe] = useState(PRESETS.insalah.Pe)
  const [rcDirect, setRcDirect] = useState(PRESETS.insalah.rc)
  const [theta, setTheta] = useState(PRESETS.insalah.theta)
  const [drho, setDrho] = useState(PRESETS.insalah.drho)
  const [gammaLit, setGammaLit] = useState(PRESETS.insalah.gammaLit)
  const [A, setA] = useState(PRESETS.insalah.A)
  const [phi, setPhi] = useState(PRESETS.insalah.phi)
  const [rhoCO2, setRhoCO2] = useState(PRESETS.insalah.rhoCO2)
  const [SCO2max, setSCO2max] = useState(PRESETS.insalah.SCO2max)

  const applyPreset = key => {
    const p = PRESETS[key]
    setPreset(key)
    setTrap(p.trap)
    setPe(p.Pe)
    setRcDirect(p.rc)
    setTheta(p.theta)
    setDrho(p.drho)
    setGammaLit(p.gammaLit)
    setA(p.A)
    setPhi(p.phi)
    setRhoCO2(p.rhoCO2)
    setSCO2max(p.SCO2max)
  }

  const ift10 = result?.p10
  const ift50 = result?.p50
  const ift90 = result?.p90

  const calcs = useMemo(() => {
    if (!ift50 || !drho || drho <= 0 || !gammaLit) return null
    const cosTheta = Math.cos(toRad(theta))
    // r_c either entered directly (µm) or derived from P_e via lit IFT (thesis Eq 4.5)
    const rc = rcDirect > 0
      ? rcDirect * 1e-6
      : (2 * gammaLit * 1e-3 * cosTheta) / (Pe * 1e6) // m
    const rcDrhoG = rc * drho * G
    if (rcDrhoG <= 0) return null
    const H = gamma => (2 * gamma * 1e-3 * cosTheta) / rcDrhoG // m
    const H90 = H(ift90 ?? ift50)
    const H50 = H(ift50)
    const H10 = H(ift10 ?? ift50)
    const Hlit = H(gammaLit)
    const toMt = H => (A * H * phi * rhoCO2 * SCO2max * 1e6) / 1e9 // A km² → m², H m, → kg → Mt
    return { rc, H90, H50, H10, Hlit, M90: toMt(H90), M50: toMt(H50), M10: toMt(H10), Mlit: toMt(Hlit) }
  }, [ift10, ift50, ift90, Pe, rcDirect, theta, drho, gammaLit, A, phi, rhoCO2, SCO2max])

  return (
    <div className="card">
      <p className="card-title">Capillary Column Height Calculator</p>
      <p className="text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.5, fontSize: '0.75rem' }}>
        Propagates the IFT prediction interval through the capillary column height formula
        (thesis Eq 4.4–4.6): <em>H = 2γ·cosθ / (r<sub>c</sub>·Δρ·g)</em> with
        <em> r<sub>c</sub> = 2γ<sub>lit</sub>·cosθ / P<sub>e</sub></em> and
        <em> M = A·H·φ·ρ<sub>CO₂</sub>·S<sub>CO₂,max</sub></em>.
        P10 = optimistic (high IFT), P90 = conservative (low IFT).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            className="btn btn-secondary"
            style={preset === key ? { borderColor: '#3b82f6', color: '#3b82f6' } : undefined}
            onClick={() => applyPreset(key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="storage-layout">
        <div className="storage-inputs">
          <div className="field-group">
            <div className="field-label"><span>Capillary entry pressure P<sub>e</sub></span><span className="unit">MPa</span></div>
            <input type="number" value={Pe} min={0.1} max={50} step={0.1} onChange={e => { setPe(+e.target.value); setPreset(null) }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Pore throat r<sub>c</sub> (0 → from P<sub>e</sub>)</span><span className="unit">µm</span></div>
            <input type="number" value={rcDirect} min={0} max={50} step={0.05} onChange={e => { setRcDirect(+e.target.value); setPreset(null) }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Contact angle θ</span><span className="unit">deg</span></div>
            <input type="number" value={theta} min={0} max={180} step={1} onChange={e => { setTheta(+e.target.value); setPreset(null) }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Density difference Δρ</span><span className="unit">kg/m³</span></div>
            <input type="number" value={drho} min={10} max={1200} step={10} onChange={e => { setDrho(+e.target.value); setPreset(null) }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Lit. IFT γ<sub>lit</sub></span><span className="unit">mN/m</span></div>
            <input type="number" value={gammaLit} min={1} max={80} step={0.5} onChange={e => { setGammaLit(+e.target.value); setPreset(null) }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Trap type</span></div>
            <select value={trap} onChange={e => setTrap(e.target.value)} style={{ width: '100%' }}>
              <option value="structural">Structural trap (M from H)</option>
              <option value="open">Open aquifer (seal integrity only)</option>
            </select>
          </div>
          {trap === 'structural' && (
            <>
              <div className="field-group">
                <div className="field-label"><span>Trap area A</span><span className="unit">km²</span></div>
                <input type="number" value={A} min={0.1} max={10000} step={1} onChange={e => { setA(+e.target.value); setPreset(null) }} />
              </div>
              <div className="field-group">
                <div className="field-label"><span>Porosity φ</span><span className="unit">frac.</span></div>
                <input type="number" value={phi} min={0.01} max={0.4} step={0.01} onChange={e => { setPhi(+e.target.value); setPreset(null) }} />
              </div>
              <div className="field-group">
                <div className="field-label"><span>CO₂ density ρ<sub>CO₂</sub></span><span className="unit">kg/m³</span></div>
                <input type="number" value={rhoCO2} min={100} max={1200} step={10} onChange={e => { setRhoCO2(+e.target.value); setPreset(null) }} />
              </div>
              <div className="field-group">
                <div className="field-label"><span>Max CO₂ sat. S<sub>CO₂,max</sub></span><span className="unit">=1−S<sub>wr</sub></span></div>
                <input type="number" value={SCO2max} min={0.05} max={0.95} step={0.05} onChange={e => { setSCO2max(+e.target.value); setPreset(null) }} />
              </div>
            </>
          )}
        </div>

        <div className="storage-results">
          <div className="stat-card">
            <div className="stat-label">Pore throat r<sub>c</sub></div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              {calcs ? calcs.rc.toFixed(3) : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>µm</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Column height H<sub>90/50/10</sub></div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              {calcs ? `${calcs.H90.toFixed(0)} / ${calcs.H50.toFixed(0)} / ${calcs.H10.toFixed(0)}` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>m (H<sub>lit</sub> = {calcs ? calcs.Hlit.toFixed(0) : '—'} m)</div>
          </div>
          {trap === 'structural' && (
            <div className="stat-card" style={{ borderColor: '#3b82f6' }}>
              <div className="stat-label">Storage capacity M<sub>90/50/10</sub></div>
              <div className="stat-value" style={{ color: '#3b82f6', fontSize: '1.6rem' }}>
                {calcs ? `${calcs.M90.toFixed(1)} / ${calcs.M50.toFixed(1)} / ${calcs.M10.toFixed(1)}` : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mt CO₂ (M<sub>lit</sub> = {calcs ? calcs.Mlit.toFixed(1) : '—'} Mt)</div>
            </div>
          )}
        </div>
      </div>

      {calcs && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius)', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>
          r<sub>c</sub> = 2×{gammaLit.toFixed(1)}×cos{theta.toFixed(0)}° / {Pe.toFixed(1)} MPa ={' '}
          <strong style={{ color: '#f1f5f9' }}>{calcs.rc.toFixed(3)} µm</strong>.
          IFT interval [{ift90 ?? ift50},{ift50},{ift10 ?? ift50}] mN/m → H [{calcs.H90.toFixed(0)}, {calcs.H50.toFixed(0)}, {calcs.H10.toFixed(0)}] m.
          {trap === 'structural'
            ? ` Storage: M = A·H·φ·ρ·S_CO₂,max = [${calcs.M90.toFixed(1)}, ${calcs.M50.toFixed(1)}, ${calcs.M10.toFixed(1)}] Mt.`
            : ' Open aquifer: H bounds seal capacity against the caprock; storage volume is governed by aquifer extent and sweep, not H alone.'}
        </div>
      )}

      
    </div>
  )
}
