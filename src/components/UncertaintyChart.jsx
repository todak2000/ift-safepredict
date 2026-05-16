import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const STATUS_COLORS = {
  GREEN:  'rgba(34, 197, 94,',
  YELLOW: 'rgba(234, 179, 8,',
  RED:    'rgba(239, 68, 68,',
}

export default function UncertaintyChart({ result, history }) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null

    const labels = history.map((_, i) => `Run ${i + 1}`)
    const p50s   = history.map(r => r.p50)
    const p10s   = history.map(r => r.p10)
    const p90s   = history.map(r => r.p90)

    const latestStatus = history[history.length - 1]?.status || 'GREEN'
    const colorBase = STATUS_COLORS[latestStatus] || STATUS_COLORS.GREEN

    return {
      labels,
      datasets: [
        {
          label: 'P90 (upper)',
          data: p90s,
          fill: '+1',
          borderColor: `${colorBase}0)`,
          backgroundColor: `${colorBase}0.12)`,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'P50',
          data: p50s,
          fill: false,
          borderColor: `${colorBase}1)`,
          backgroundColor: `${colorBase}1)`,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'P10 (lower)',
          data: p10s,
          fill: '-1',
          borderColor: `${colorBase}0)`,
          backgroundColor: `${colorBase}0.12)`,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    }
  }, [history])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 } },
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} mN/m`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(51,65,85,0.5)' },
      },
      y: {
        title: { display: true, text: 'IFT (mN/m)', color: '#94a3b8', font: { size: 11 } },
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(51,65,85,0.5)' },
        min: 0,
      },
    },
  }

  if (!chartData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>
        <p className="text-muted">Run at least one prediction to see the uncertainty chart.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="card-title">Prediction History — Uncertainty Envelope</p>
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
      <p className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
        Shaded band = 80% conformal prediction interval (P10–P90). Band widens as UIF escalates.
      </p>
    </div>
  )
}
