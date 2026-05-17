import React, { useMemo, useState } from 'react'
import { predict } from '../logic/predict.js'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const PARAMS = [
  { key: 'P',      label: 'Pressure (MPa)',         min: 0.1, max: 60,  step: 0.5 },
  { key: 'T',      label: 'Temperature (K)',         min: 273, max: 500, step: 1 },
  { key: 'salinity', label: 'Salinity (mol/kg)',     min: 0,   max: 6,   step: 0.1 },
  { key: 'MCM',    label: 'Monovalent Cations',      min: 0,   max: 6,   step: 0.05 },
  { key: 'BCM',    label: 'Bivalent Cations',        min: 0,   max: 2,   step: 0.01 },
  { key: 'x_CH4',  label: 'CH₄ mole fraction',       min: 0,   max: 0.35, step: 0.005 },
  { key: 'x_N2',   label: 'N₂ mole fraction',        min: 0,   max: 0.25, step: 0.005 },
]

export default function SensitivityChart({ inputs }) {
  const [steps, setSteps] = useState(5)

  const analysis = useMemo(() => {
    if (!inputs?.brineType) return null

    const baseline = predict(inputs)
    const results = []

    PARAMS.forEach(param => {
      const lowResults = []
      const highResults = []

      for (let i = 1; i <= steps; i++) {
        const frac = i / steps
        const lowVal = param.min + (inputs[param.key] - param.min) * frac
        const highVal = inputs[param.key] + (param.max - inputs[param.key]) * frac

        if (Math.abs(inputs[param.key] - param.min) > 0.001) {
          const testInputs = { ...inputs, [param.key]: parseFloat(lowVal.toFixed(4)), eosEstimated: false }
          lowResults.push(predict(testInputs))
        }
        if (Math.abs(param.max - inputs[param.key]) > 0.001) {
          const testInputs = { ...inputs, [param.key]: parseFloat(highVal.toFixed(4)), eosEstimated: false }
          highResults.push(predict(testInputs))
        }
      }

      const lowP50 = lowResults.length > 0 ? Math.min(...lowResults.map(r => r.p50)) : baseline.p50
      const highP50 = highResults.length > 0 ? Math.max(...highResults.map(r => r.p50)) : baseline.p50

      const range = Math.abs(highP50 - lowP50)

      results.push({
        key: param.key,
        label: param.label,
        low: lowP50,
        high: highP50,
        baseline: baseline.p50,
        range,
        lowDelta: baseline.p50 - lowP50,
        highDelta: highP50 - baseline.p50,
      })
    })

    results.sort((a, b) => b.range - a.range)
    return { baseline: baseline.p50, params: results }
  }, [inputs, steps])

  if (!inputs?.brineType) {
    return (
      <div className="card" style={{ opacity: 0.4 }}>
        <p className="card-title">Sensitivity Analysis</p>
        <p className="text-muted">Run a prediction first, then see how each parameter affects IFT.</p>
      </div>
    )
  }

  if (!analysis) return null

  const chartData = {
    labels: analysis.params.map(p => p.label),
    datasets: [
      {
        label: 'Decreases IFT',
        data: analysis.params.map(p => p.lowDelta > 0 ? p.lowDelta : 0),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 3,
      },
      {
        label: 'Increases IFT',
        data: analysis.params.map(p => p.highDelta > 0 ? p.highDelta : 0),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  }

  return (
    <div className="card">
      <div className="flex-between">
        <span className="card-title" style={{ marginBottom: 0 }}>Sensitivity Analysis</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="text-muted" style={{ fontSize: '0.7rem' }}>Resolution:</span>
          <select
            value={steps}
            onChange={e => setSteps(Number(e.target.value))}
            style={{ width: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
          >
            <option value={3}>3 steps</option>
            <option value={5}>5 steps</option>
            <option value={10}>10 steps</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8' }}>
        Baseline IFT = <strong style={{ color: '#f1f5f9' }}>{analysis.baseline.toFixed(2)} mN/m</strong>
        &nbsp;— bars show change when varying each parameter from min to max
      </div>

      <div className="chart-wrapper" style={{ height: Math.max(200, analysis.params.length * 40) }}>
        <Bar
          data={chartData}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 },
              },
              tooltip: {
                callbacks: {
                  label: ctx => `${ctx.dataset.label}: ${Math.abs(ctx.parsed.x).toFixed(2)} mN/m`,
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: 'Δ IFT (mN/m)', color: '#94a3b8', font: { size: 10 } },
                ticks: { color: '#64748b', font: { size: 10 } },
                grid: { color: 'rgba(51,65,85,0.3)' },
              },
              y: {
                ticks: { color: '#cbd5e1', font: { size: 10 } },
                grid: { display: false },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
