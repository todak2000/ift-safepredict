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

export default function UncertaintyChart({ result, history }) {
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
          pointBackgroundColor: '#04070D',
          pointBorderWidth: 2,
        },
        {
          label: 'P90 Lower Bound',
          data: p90s,
          fill: '-1',
          borderColor: 'transparent',
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
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11, weight: 500 },
          usePointStyle: true,
          pointStyle: 'circle',
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
        usePointStyle: true,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} mN/m`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        border: { color: 'rgba(255, 255, 255, 0.08)' },
      },
      y: {
        title: { display: true, text: 'IFT (mN/m)', color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        border: { color: 'rgba(255, 255, 255, 0.08)' },
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
