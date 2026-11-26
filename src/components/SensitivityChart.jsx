import React, { useMemo, useState } from 'react'
import { predict } from '../logic/predict.js'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const PARAMS = [
  { key: 'P',      label: 'Pressure (P)',            min: 0.1, max: 70,  step: 0.5 },
  { key: 'T',      label: 'Temperature (T)',         min: 273, max: 473, step: 1 },
  { key: 'salinity', label: 'Salinity (S)',          min: 0,   max: 6,   step: 0.1 },
  { key: 'MCM',    label: 'Monovalent Cations (MCM)', min: 0,   max: 6,   step: 0.05 },
  { key: 'BCM',    label: 'Bivalent Cations (BCM)',   min: 0,   max: 2,   step: 0.01 },
  { key: 'x_CH4',  label: 'CH₄ Impurity',            min: 0,   max: 0.890, step: 0.005 },
  { key: 'x_N2',   label: 'N₂ Impurity',             min: 0,   max: 0.7636, step: 0.005 },
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
      <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>
        <p className="card-title" style={{ justifyContent: 'center' }}>Local Sensitivity Tornado</p>
        <p className="text-muted" style={{ fontSize: '0.78rem' }}>Run a prediction to evaluate parameter impact on IFT.</p>
      </div>
    )
  }

  if (!analysis) return null

  const chartData = {
    labels: analysis.params.map(p => p.label),
    datasets: [
      {
        label: 'Decreases IFT (Δσ < 0)',
        data: analysis.params.map(p => p.lowDelta > 0 ? p.lowDelta : 0),
        backgroundColor: 'rgba(0, 240, 255, 0.65)',
        borderColor: '#00F0FF',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Increases IFT (Δσ > 0)',
        data: analysis.params.map(p => p.highDelta > 0 ? p.highDelta : 0),
        backgroundColor: 'rgba(244, 63, 94, 0.65)',
        borderColor: '#F43F5E',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11, weight: 500 },
          usePointStyle: true,
          boxWidth: 6,
        },
        position: 'top',
        align: 'end',
      },
      tooltip: {
        backgroundColor: 'rgba(8, 13, 26, 0.95)',
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.x.toFixed(2)} mN/m shift`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Absolute IFT Delta (mN/m)', color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        border: { color: 'rgba(255, 255, 255, 0.08)' },
      },
      y: {
        ticks: { color: '#E2E8F0', font: { family: 'Inter', size: 11 } },
        grid: { display: false },
        border: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  }

  return (
    <div className="card">
      <div className="card-title-row">
        <div className="card-title-group">
          <span className="card-title">Local Parameter Sensitivity Tornado</span>
          <span className="card-subtitle">Influence rank of reservoir variables on P50 IFT ({analysis.baseline.toFixed(2)} mN/m baseline)</span>
        </div>
      </div>
      <div className="chart-container chart-container--tall">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}
