import React, { useState, useCallback, useEffect } from 'react'
import {
  Sun, Moon, RotateCcw, Activity, Layers, BookOpen,
  Info, Compass, FileSpreadsheet, Sparkles
} from 'lucide-react'
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
import CapillaryHeightCalculator from './components/CapillaryHeightCalculator.jsx'
import AgentCopilot from './components/AgentCopilot.jsx'
import { predict, detectRegime } from './logic/predict.js'
import { computeDrho } from './logic/eosEngine.js'
import { savePrediction } from './logic/db.js'
import { decodeHash, trackPageView, trackPageExit, encodeInputs } from './logic/tracking.js'

const DEFAULT_EOS = computeDrho(10.0, 323.15, 1.0)

const DEFAULT_INPUTS = {
  P: 10.0,
  T: 323.15,
  salinity: 1.0,
  drho: parseFloat(DEFAULT_EOS.drho.toFixed(4)),
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
  const Tc_mix = x_CO2 * 304.28 + inputs.x_CH4 * 190.56 + inputs.x_N2 * 126.19
  const Pr = inputs.P / Pc_mix
  const Tr = inputs.T / Tc_mix
  return detectRegime(Pr, Tr, Pc_mix, Tc_mix)
}

export default function App() {
  const BASE = import.meta.env.BASE_URL

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

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('ift-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

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
    clearHash()
    setInputs({
      ...DEFAULT_INPUTS,
      ...preset,
      eosEstimated: preset.eosEstimated ?? true,
      presetName: preset.presetName || preset.label || '',
    })
  }, [])

  useEffect(() => {
    if (!inputs.brineType) return
    const r = predict(inputs)
    setResult(r)
    setHistory(prev => [...prev.slice(-19), r])
    savePrediction(inputs, r).catch(() => {})
  }, [inputs])

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
        <div className="brand-group">
          <div className="brand-badge mono">IFT</div>
          <div className="brand-text">
            <div className="brand-title-wrap">
              <span className="brand-title">IFT <span>SafePredict</span></span>
            </div>
            <span className="brand-sub">CO₂–Brine Interfacial Tension &amp; SEAL Containment Assurance</span>
          </div>
        </div>

        <div className="header-right-actions">
          <div className="model-pill">
            <span className="model-pill-dot"></span>
            <span>Sub-MARS-16t | Sup-MARS-35t | PR-EOS</span>
          </div>

          <div className="unit-select-wrap">
            <select
              className="unit-select mono"
              value={unitSystem}
              onChange={e => handleUnitChange(e.target.value)}
              title="Select Engineering Units"
            >
              {UNIT_OPTIONS.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>

          <button
            className="icon-btn"
            onClick={handleReset}
            title="Reset All Parameters (Esc)"
            aria-label="Reset parameters"
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="icon-btn"
            onClick={toggleTheme}
            title="Toggle Light/Dark Theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Application tabs">
        <button
          className={`tab ${activeTab === 'predict' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'predict'}
          onClick={() => setActiveTab('predict')}
        >
          <Activity size={15} />
          <span>Predictor &amp; HUD</span>
        </button>
        <button
          className={`tab ${activeTab === 'agent' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'agent'}
          onClick={() => setActiveTab('agent')}
        >
          <Sparkles size={16} />
          <span>SEAL Agent</span>
        </button>
        <button
          className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'compare'}
          onClick={() => setActiveTab('compare')}
        >
          <Layers size={15} />
          <span>Compare Scenarios {scenarios.length > 0 && `(${scenarios.length})`}</span>
        </button>
        <button
          className={`tab ${activeTab === 'ptmap' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'ptmap'}
          onClick={() => setActiveTab('ptmap')}
        >
          <Compass size={15} />
          <span>P–T Regime Map</span>
        </button>
        <button
          className={`tab ${activeTab === 'batch' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'batch'}
          onClick={() => setActiveTab('batch')}
        >
          <FileSpreadsheet size={15} />
          <span>Batch Predictor</span>
        </button>
        <button
          className={`tab ${activeTab === 'equations' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'equations'}
          onClick={() => setActiveTab('equations')}
        >
          <BookOpen size={15} />
          <span>Model Equations</span>
        </button>
        <button
          className={`tab ${activeTab === 'about' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'about'}
          onClick={() => setActiveTab('about')}
        >
          <Info size={15} />
          <span>Scientific Basis</span>
        </button>
      </nav>

      {activeTab === 'predict' && (
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
            <PredictionDisplay
              result={result}
              inputs={inputs}
              unitSystem={unitSystem}
              onOpenAgent={() => setActiveTab('agent')}
            />
            {result && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleSaveScenario}
                  disabled={scenarios.length >= 3}
                >
                  + Add to Scenario Comparison {scenarios.length >= 3 ? '(Limit 3)' : `(${scenarios.length}/3)`}
                </button>
              </div>
            )}
            <UncertaintyChart result={result} history={history} theme={theme} />
            {result && <SensitivityChart inputs={inputs} theme={theme} />}
            {result && <CapillaryHeightCalculator result={result} inputs={inputs} />}
            {result && <StorageEstimator result={result} />}
            <InputHistory onLoad={setInputs} />
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <AgentCopilot
          currentInputs={inputs}
          onApplyInputs={(newInp) => {
            setInputs(prev => ({ ...prev, ...newInp }))
            setActiveTab('predict')
          }}
        />
      )}

      {activeTab === 'compare' && (
        <ScenarioComparison scenarios={scenarios} onRemove={handleRemoveScenario} />
      )}

      {activeTab === 'equations' && <EquationsTab />}

      {activeTab === 'ptmap' && (
        <ContourMap
          inputs={inputs}
          onSelectPT={({ P, T }) => {
            const eos = computeDrho(P, T, inputs.salinity ?? inputs.MCM ?? 0, {
              BCM: inputs.BCM ?? 0,
              x_CH4: inputs.x_CH4 ?? 0,
              x_N2: inputs.x_N2 ?? 0,
            })
            setInputs(prev => ({ ...prev, presetName: '', P, T, drho: parseFloat(eos.drho.toFixed(4)), eosEstimated: true }))
          }}
        />
      )}

      {activeTab === 'batch' && <BatchPredict />}

      {activeTab === 'about' && (
        <div className="card" style={{ maxWidth: 840, margin: '0 auto' }}>
          <div className="card-title-row">
            <div className="card-title-group">
              <span className="card-title">Scientific Basis &amp; Agentic Assurance Architecture</span>
              <span className="card-subtitle">Physics-informed Multivariate Adaptive Regression Splines + Split Conformal UQ</span>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>IFT-SafePredict</strong> couples closed-form, white-box
              dual-regime MARS equations trained on <strong style={{ color: 'var(--text-main)' }}>3,265 laboratory observations</strong> across
              16 experimental campaigns with SHA-256-locked cross-laboratory external validation, split conformal prediction intervals,
              volume-translated Peng–Robinson EOS phase densities, and an <strong style={{ color: 'var(--text-main)' }}>Agentic Containment Assurance Co-Pilot</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '0.4rem' }}>Subcritical Architecture</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>16 Basis Terms</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>T<sub>r</sub> &lt; 1.0 or P<sub>r</sub> &lt; 1.0 &mdash; LOSO median nRMSE 6.35%; UIF<sub>interval</sub> = 3.59 triggers local calibration guardrails.</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-sup)', marginBottom: '0.4rem' }}>Supercritical Architecture</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>35 Basis Terms</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>T<sub>r</sub> &ge; 1.0 and P<sub>r</sub> &ge; 1.0 &mdash; EV R<sup>2</sup> = 0.9452 (5.62% nRMSE); portable UIF<sub>interval</sub> = 1.06 (Green tier).</div>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green)', marginBottom: '0.4rem' }}>Composite Trust Audit</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>Zero Hallucination</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Synthesises Kay&apos;s regime, Hat leverage h*, &plusmn;2 °C near-critical window, UIF<sub>interval</sub> portability, and capillary seal odds.</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.5rem 0 0.5rem', color: 'var(--text-main)' }}>Validation &amp; Cross-Laboratory Benchmarks</h3>
            <div className="batch-table-container" style={{ margin: '0.75rem 0 1.25rem' }}>
              <table className="batch-table">
                <thead>
                  <tr>
                    <th>Regime</th>
                    <th>Model</th>
                    <th>Test nRMSE</th>
                    <th>2-Lab EV nRMSE</th>
                    <th>All-Lab LOSO Median</th>
                    <th>Conformal q80 / UIF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Subcritical</td>
                    <td>MARS 16-term</td>
                    <td>5.95%</td>
                    <td>9.96% (Agg.) / 18.11% (All)</td>
                    <td>6.35% (14 labs)</td>
                    <td>±2.69 mN/m · UIF 3.59</td>
                  </tr>
                  <tr>
                    <td>Supercritical</td>
                    <td>MARS 35-term</td>
                    <td>5.60%</td>
                    <td>5.62% (R² = 0.9452)</td>
                    <td>5.65% (15 labs)</td>
                    <td>±2.25 mN/m · UIF 1.06</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.5rem 0 0.5rem', color: 'var(--text-main)' }}>Citation &amp; Attribution</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              Olagunju, D., Agwu, O. E., &amp; Md Yusof, M. A. (2026). Closed-Form MARS Equations with Calibrated Conformal Uncertainty and Cross-Laboratory Portability Diagnostics for CO₂–Brine Interfacial Tension in Geological Carbon Storage. Universiti Teknologi PETRONAS.
            </p>
          </div>
        </div>
      )}

      <footer className="app-footer" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
        <div>IFT-SafePredict &middot; White-Box MARS + Conformal Assurance Intelligence &middot; Universiti Teknologi PETRONAS</div>
        <div style={{ marginTop: '0.35rem' }}>
          <a href={BASE + 'analytics'} style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Internal Performance Monitor</a>
        </div>
      </footer>
    </div>
  )
}
