import React, { useState, useCallback } from 'react'
import InputPanel from './components/InputPanel/InputPanel.jsx'
import PredictionDisplay from './components/PredictionDisplay.jsx'
import UncertaintyChart from './components/UncertaintyChart.jsx'
import ScenarioComparison from './components/ScenarioComparison.jsx'
import EquationsTab from './components/EquationsTab.jsx'
import { predict, detectRegime } from './logic/predict.js'

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
}

// Compute live regime from current inputs for the regime badge
const liveRegime = (inputs) => {
  const x_CO2 = 1 - inputs.x_CH4 - inputs.x_N2
  const Pc_mix = x_CO2 * 7.377 + inputs.x_CH4 * 4.600 + inputs.x_N2 * 3.390
  const Tc_mix = x_CO2 * 304.13 + inputs.x_CH4 * 190.56 + inputs.x_N2 * 126.19
  const Pr = inputs.P / Pc_mix
  const Tr = inputs.T / Tc_mix
  return detectRegime(Pr, Tr)
}

const BASE_URL = import.meta.env.BASE_URL

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [activeTab, setActiveTab] = useState('predict')

  const { regime, isNearCritical } = liveRegime(inputs)

  const handlePredict = useCallback(() => {
    const r = predict(inputs)
    setResult(r)
    setHistory(prev => [...prev.slice(-19), r])
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={`${BASE_URL}IFT_SafePredict_v1.0.xlsx`}
            download
            className="download-excel-btn"
          >
            ↓ Excel Tool
          </a>
          <span className="version">Sub-MARS-16t | Sup-MARS-35t | v1.0</span>
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
      </div>

      {activeTab === 'predict' && (
        <>
          <div className="main-layout">
            <InputPanel
              inputs={inputs}
              regime={regime}
              isNearCritical={isNearCritical}
              onChange={setInputs}
              onPredict={handlePredict}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PredictionDisplay result={result} inputs={inputs} />
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
            </div>
          </div>
        </>
      )}

      {activeTab === 'compare' && (
        <ScenarioComparison scenarios={scenarios} onRemove={handleRemoveScenario} />
      )}

      {activeTab === 'equations' && <EquationsTab />}

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
      </footer>
    </div>
  )
}
