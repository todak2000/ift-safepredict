import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const STATUS_COLORS = {
  GREEN:  'rgba(16, 185, 129,',
  AMBER:  'rgba(245, 158, 11,',
  RED:    'rgba(244, 63, 94,',
}

export default function UncertaintyChart({ result, history, theme = 'light' }) {
  const isLight = theme === 'light'
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null

    const labels = history.map((_, i) => `Run #${i + 1}`)
    const p50s   = history.map(r => r.p50)
    const p10s   = history.map(r => r.p10)
    const p90s   = history.map(r => r.p90)

    const latestStatus = history[history.length - 1]?.status || 'GREEN'
    const colorBase = STATUS_COLORS[latestStatus] || STATUS_COLORS.GREEN

    return {
      labels,
      datasets: [
        {
          label: 'P10 Upper Bound',
          data: p10s,
          fill: '+1',
          borderColor: 'transparent',
          backgroundColor: `${colorBase}0.12)`,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'P50 Expected IFT',
          data: p50s,
          fill: false,
          borderColor: `${colorBase}1)`,
          backgroundColor: `${colorBase}1)`,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: isLight ? '#ffffff' : '#04070D',
          pointBorderWidth: 2,
        },
        {
          label: 'P90 Lower Bound',
          data: p90s,
          fill: '-1',
          borderColor: 'transparent',
          backgroundColor: `${colorBase}0.16)`,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    }
  }, [history, isLight])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isLight ? '#1e293b' : '#cbd5e1',
          font: { family: 'Inter', size: 11.5, weight: 600 },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 7,
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
        usePointStyle: true,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} mN/m`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: isLight ? '#334155' : '#cbd5e1', font: { family: 'JetBrains Mono', size: 11, weight: 500 } },
        grid: { color: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)' },
        border: { color: isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)' },
      },
      y: {
        title: { display: true, text: 'IFT (mN/m)', color: isLight ? '#1e293b' : '#cbd5e1', font: { family: 'Inter', size: 11.5, weight: 600 } },
        ticks: { color: isLight ? '#334155' : '#cbd5e1', font: { family: 'JetBrains Mono', size: 11, weight: 500 } },
        grid: { color: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)' },
        border: { color: isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)' },
        min: 0,
      },
    },
  }

  if (!chartData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.5 }}>
        <p className="card-title" style={{ justifyContent: 'center' }}>Uncertainty Propagation History</p>
        <p className="text-muted" style={{ fontSize: '0.78rem' }}>Run predictions to track trajectory and conformal interval width.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title-row">
        <div className="card-title-group">
          <span className="card-title">Prediction Trajectory & Conformal Envelope</span>
          <span className="card-subtitle">Sequence of last {history.length} runs with 80% uncertainty envelope</span>
        </div>
      </div>
      <div className="chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
