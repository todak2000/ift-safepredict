import React, { useState, useCallback, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx'
import InputPanel from './components/InputPanel/InputPanel.jsx'
import PredictionDisplay from './components/PredictionDisplay.jsx'
import UncertaintyChart from './components/UncertaintyChart.jsx'
import ScenarioComparison from './components/ScenarioComparison.jsx'
import EquationsTab from './components/EquationsTab.jsx'
import InputHistory from './components/InputHistory.jsx'
import BatchPredict from './components/BatchPredict.jsx'
import SensitivityChart from './components/SensitivityChart.jsx'
import ContourMap from './components/ContourMap.jsx'
import StorageEstimator from './components/StorageEstimator.jsx'
import { predict, detectRegime } from './logic/predict.js'
import { savePrediction } from './logic/db.js'
import { decodeHash, trackPageView, trackPageExit, encodeInputs } from './logic/tracking.js'

const DEFAULT_INPUTS = {
  P: 10.0,
  T: 323.15,
  salinity: 1.0,
  drho: 0.40,
  MCM: 1.0,
  BCM: 0.0,
  x_CH4: 0.0,
  x_N2: 0.0,
  brineType: '',
  eosEstimated: true,
  presetName: '',
}

function clearHash() {
  history.replaceState(null, '', window.location.pathname)
}

const UNIT_OPTIONS = [
  { id: 'SI', label: 'SI (MPa, K)' },
  { id: 'field', label: 'Field (bar, °C)' },
  { id: 'US', label: 'US (psi, °F)' },
]

// Compute live regime from current inputs for the regime badge
const liveRegime = (inputs) => {
  const x_CO2 = 1 - inputs.x_CH4 - inputs.x_N2
  const Pc_mix = x_CO2 * 7.377 + inputs.x_CH4 * 4.600 + inputs.x_N2 * 3.390
  const Tc_mix = x_CO2 * 304.13 + inputs.x_CH4 * 190.56 + inputs.x_N2 * 126.19
  const Pr = inputs.P / Pc_mix
  const Tr = inputs.T / Tc_mix
  return detectRegime(Pr, Tr)
}

export default function App() {
  const BASE = import.meta.env.BASE_URL

  // Route /analytics to the standalone dashboard
  if (window.location.pathname.startsWith(BASE + 'analytics')) {
    return <AnalyticsDashboard />
  }

  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [activeTab, setActiveTab] = useState('predict')

  const [theme, setTheme] = useState(() => localStorage.getItem('ift-theme') || 'dark')
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('ift-units') || 'SI')

  const { regime, isNearCritical } = liveRegime(inputs)

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('ift-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  // Unit system toggle
  const handleUnitChange = useCallback((id) => {
    setUnitSystem(id)
    localStorage.setItem('ift-units', id)
  }, [])

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS)
    setResult(null)
    setHistory([])
    setScenarios([])
    clearHash()
  }, [])

  const handlePresetChange = useCallback((preset) => {
    setInputs(DEFAULT_INPUTS)
    setResult(null)
    setHistory([])
    setScenarios([])
    clearHash()
    setInputs(preset)
  }, [])

  // Auto-predict whenever inputs change (no URL hash update)
  useEffect(() => {
    if (!inputs.brineType) return
    const r = predict(inputs)
    setResult(r)
    setHistory(prev => [...prev.slice(-19), r])
    savePrediction(inputs, r).catch(() => {})
  }, [inputs])

  // On mount: check shared URL hash, start tracking
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const shared = decodeHash()
    if (shared) {
      setInputs(shared)
      setTimeout(() => document.getElementById('predict-btn')?.click(), 100)
    }
    trackPageView(window.location.pathname)
    window.addEventListener('beforeunload', trackPageExit)

    const handleKey = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && activeTab === 'predict') {
        document.getElementById('predict-btn')?.click()
      }
      if (e.key === 'Escape' && activeTab === 'predict') {
        handleReset()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('beforeunload', trackPageExit)
      window.removeEventListener('keydown', handleKey)
    }
  }, [activeTab, theme, handleReset])

  const handlePredict = useCallback(() => {
    const r = predict(inputs)
    setResult(r)
    setHistory(prev => [...prev.slice(-19), r])
    savePrediction(inputs, r).catch(() => {})
    window.location.hash = encodeInputs(inputs)
  }, [inputs])

  const handleSaveScenario = () => {
    if (!result || scenarios.length >= 3) return
    setScenarios(prev => [...prev, { inputs: { ...inputs }, result: { ...result } }])
  }

  const handleRemoveScenario = (i) => {
    setScenarios(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>IFT-<span>SafePredict</span></h1>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="version">Sub-MARS-16t | Sup-MARS-35t | v1.0</span>
          <select
            className="unit-select"
            value={unitSystem}
            onChange={e => handleUnitChange(e.target.value)}
            title="Unit system"
          >
            {UNIT_OPTIONS.map(u => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
          <button className="btn-ghost theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'predict' ? 'active' : ''}`}
          onClick={() => setActiveTab('predict')}>Predict</button>
        <button className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}>Compare Scenarios</button>
        <button className={`tab ${activeTab === 'equations' ? 'active' : ''}`}
          onClick={() => setActiveTab('equations')}>Equations</button>
        <button className={`tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}>About</button>
        <button className={`tab ${activeTab === 'ptmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('ptmap')}>P–T Map</button>
        <button className={`tab ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}>Batch Predict</button>
      </div>

      {activeTab === 'predict' && (
        <>
          <div className="main-layout">
            <InputPanel
              inputs={inputs}
              regime={regime}
              isNearCritical={isNearCritical}
              unitSystem={unitSystem}
              onChange={setInputs}
              onPredict={handlePredict}
              onReset={handleReset}
              onPresetChange={handlePresetChange}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PredictionDisplay result={result} inputs={inputs} unitSystem={unitSystem} />
              {result && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleSaveScenario}
                    disabled={scenarios.length >= 3}
                  >
                    + Save to comparison {scenarios.length >= 3 ? '(max 3)' : ''}
                  </button>
                </div>
              )}
              <UncertaintyChart result={result} history={history} />
              {result && <SensitivityChart inputs={inputs} />}
              {result && <StorageEstimator result={result} />}
              <InputHistory onLoad={setInputs} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'compare' && (
        <ScenarioComparison scenarios={scenarios} onRemove={handleRemoveScenario} />
      )}

      {activeTab === 'equations' && <EquationsTab />}

      {activeTab === 'ptmap' && (
        <ContourMap
          inputs={inputs}
          onSelectPT={({ P, T }) => setInputs(prev => ({ ...prev, P, T }))}
        />
      )}

      {activeTab === 'batch' && <BatchPredict />}

      {activeTab === 'about' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <p className="card-title">About IFT-SafePredict</p>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            Physics-informed ML prediction of CO₂-Brine interfacial tension (IFT) using
            dual-regime MARS models trained on 3,265 laboratory measurements across 16 sources.
          </p>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>Models</h3>
          <table style={{ fontSize: '0.78rem', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>Regime</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>Model</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>Test nRMSE</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>EV nRMSE</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '0.3rem 0.5rem' }}>Subcritical</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>MARS 16-term</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>5.46%</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>17.00%</td>
              </tr>
              <tr>
                <td style={{ padding: '0.3rem 0.5rem' }}>Supercritical</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>MARS 35-term</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>5.60%</td>
                <td style={{ padding: '0.3rem 0.5rem' }}>5.62%</td>
              </tr>
            </tbody>
          </table>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>UQ Framework</h3>
          <p style={{ fontSize: '0.78rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
            80% conformal prediction intervals. Base half-width: ±2.44 mN/m (sub), ±2.25 mN/m (sup).
            UIF escalation: 3.41× for Na₂SO₄ / high-MCM conditions; 5.0× for extrapolation.
          </p>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Citation</h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
            Olagunju, D. et al. (2026). Closed-Form MARS Equations with Calibrated Conformal Uncertainty for CO₂–Brine Interfacial Tension Prediction in Geological Carbon Storage.
          </p>
          <h3 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Privacy</h3>
          <p style={{ fontSize: '0.78rem', lineHeight: 1.7 }}>
            This tool is 100% client-side. No data is sent to any server.
            All computation runs locally in your browser.
          </p>
        </div>
      )}

      <footer className="app-footer">
        IFT-SafePredict v1.0 | Sub-MARS-16t | Sup-MARS-35t |
        All computation is client-side — no data is transmitted.
        <div style={{ marginTop: '0.75rem', fontSize: '0.65rem' }}>
          <a href={BASE + 'analytics'} style={{ color: 'var(--color-border)', textDecoration: 'none' }}>admin</a>
        </div>
      </footer>
    </div>
  )
}
