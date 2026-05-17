import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { predict } from '../logic/predict.js'

const RES_X = 50
const RES_Y = 35

function iftToColor(ift) {
  if (ift <= 12) return [59, 130, 246]
  if (ift <= 25) return [34, 211, 238]
  if (ift <= 40) return [34, 197, 94]
  if (ift <= 55) return [234, 179, 8]
  if (ift <= 70) return [249, 115, 22]
  return [239, 68, 68]
}

function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

function iftColorSmooth(ift) {
  const stops = [
    { pos: 0, color: [15, 23, 42] },
    { pos: 12, color: [59, 130, 246] },
    { pos: 25, color: [34, 211, 238] },
    { pos: 40, color: [34, 197, 94] },
    { pos: 55, color: [234, 179, 8] },
    { pos: 70, color: [249, 115, 22] },
    { pos: 80, color: [239, 68, 68] },
  ]
  if (ift <= stops[0].pos) return stops[0].color
  if (ift >= stops[stops.length - 1].pos) return stops[stops.length - 1].color
  for (let i = 0; i < stops.length - 1; i++) {
    if (ift >= stops[i].pos && ift < stops[i + 1].pos) {
      const t = (ift - stops[i].pos) / (stops[i + 1].pos - stops[i].pos)
      return interpolateColor(stops[i].color, stops[i + 1].color, t)
    }
  }
  return stops[stops.length - 1].color
}

export default function ContourMap({ inputs, onSelectPT }) {
  const canvasRef = useRef(null)
  const [pMin, setPMin] = useState(0.1)
  const [pMax, setPMax] = useState(40)
  const [tMin, setTMin] = useState(273)
  const [tMax, setTMax] = useState(420)
  const [targetIFT, setTargetIFT] = useState(25)
  const [showInverse, setShowInverse] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [size, setSize] = useState({ w: 540, h: 380 })

  const grid = useMemo(() => {
    const data = []
    const { brineType, salinity, drho, MCM, BCM, x_CH4, x_N2, eosEstimated } = inputs
    const baseInputs = { salinity, drho, MCM, BCM, x_CH4, x_N2, brineType, eosEstimated: false }
    for (let j = 0; j < RES_Y; j++) {
      const T = tMin + (tMax - tMin) * j / (RES_Y - 1)
      for (let i = 0; i < RES_X; i++) {
        const P = pMin + (pMax - pMin) * i / (RES_X - 1)
        const r = predict({ ...baseInputs, P: +P.toFixed(3), T: +T.toFixed(3) })
        data.push({ i, j, P, T, ift: r.p50, regime: r.regime })
      }
    }
    return { data, minIft: Math.min(...data.map(d => d.ift)), maxIft: Math.max(...data.map(d => d.ift)) }
  }, [inputs, pMin, pMax, tMin, tMax])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = size
    canvas.width = w * devicePixelRatio
    canvas.height = h * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    ctx.clearRect(0, 0, w, h)

    const cellW = w / RES_X
    const cellH = h / RES_Y
    const critP = 7.377
    const critT = 304.13

    let minIft = Infinity, maxIft = -Infinity
    grid.data.forEach(d => { if (d.ift < minIft) minIft = d.ift; if (d.ift > maxIft) maxIft = d.ift })

    grid.data.forEach(d => {
      const x = d.i * cellW, y = d.j * cellH
      const [r, g, b] = iftColorSmooth(d.ift)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5)

      if (showInverse && d.ift <= targetIFT) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5)
      }
    })

    // Regime boundary (Pr=1, Tr=1)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])

    const totalTO2 = inputs.x_CH4 + inputs.x_N2
    const pcMix = (1 - totalTO2) * 7.377 + inputs.x_CH4 * 4.600 + inputs.x_N2 * 3.390
    const tcMix = (1 - totalTO2) * 304.13 + inputs.x_CH4 * 190.56 + inputs.x_N2 * 126.19
    const supP = 1 * pcMix
    const supT = 1 * tcMix

    if (supP >= pMin && supP <= pMax) {
      const x = (supP - pMin) / (pMax - pMin) * w
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    if (supT >= tMin && supT <= tMax) {
      const y = h - (supT - tMin) / (tMax - tMin) * h
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.setLineDash([])

    // Critical point
    if (critP >= pMin && critP <= pMax && critT >= tMin && critT <= tMax) {
      const cx = (critP - pMin) / (pMax - pMin) * w
      const cy = h - (critT - tMin) / (tMax - tMin) * h
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.font = '9px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'
      ctx.fillText('Critical point', cx + 8, cy + 3)
    }

    // Hovered
    if (hovered) {
      const hx = hovered.i * cellW, hy = hovered.j * cellH
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(hx, hy, cellW, cellH)
    }

    // Axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    const nTicksX = 6
    for (let k = 0; k <= nTicksX; k++) {
      const val = pMin + (pMax - pMin) * k / nTicksX
      ctx.fillText(val.toFixed(1), w * k / nTicksX, h + 14)
    }
    ctx.textAlign = 'right'
    const nTicksY = 5
    for (let k = 0; k <= nTicksY; k++) {
      const val = tMin + (tMax - tMin) * k / nTicksY
      ctx.fillText(val.toFixed(0), -4, h - h * k / nTicksY + 4)
    }

    // Color bar
    const barX = w + 10, barY = 0, barW = 14, barH = h
    for (let k = 0; k < barH; k++) {
      const iftVal = minIft + (maxIft - minIft) * (1 - k / barH)
      const [r, g, b] = iftColorSmooth(iftVal)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(barX, barY + k, barW, 1)
    }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '8px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(maxIft.toFixed(1), barX + barW + 4, barY + 8)
    ctx.fillText(minIft.toFixed(1), barX + barW + 4, barY + barH - 2)
    ctx.fillText('IFT', barX + barW + 4, barY + barH / 2 + 3)

  }, [grid, size, showInverse, targetIFT, hovered, inputs, pMin, pMax, tMin, tMax])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const handleMouse = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const cellW = rect.width / RES_X, cellH = rect.height / RES_Y
    const i = Math.floor(x / cellW), j = Math.floor(y / cellH)
    if (i < 0 || i >= RES_X || j < 0 || j >= RES_Y) { setHovered(null); return }
    setHovered({ i, j })
    const idx = j * RES_X + i
    const d = grid.data[idx]
    if (d && e.type === 'click' && onSelectPT) onSelectPT({ P: d.P, T: d.T })
  }, [grid, onSelectPT])

  const hoveredData = hovered ? grid.data[hovered.j * RES_X + hovered.i] : null

  return (
    <div className="card" style={{ maxWidth: '100%' }}>
      <p className="card-title">P–T Contour Map</p>
      <p className="text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>
        IFT (mN/m) as a function of pressure and temperature, with all other parameters fixed
        at current values. White dashed lines show the supercritical boundary (Pr, Tr = 1).
        <strong> Click</strong> any cell to set P & T.
      </p>

      {/* Controls */}
      <div className="contour-controls">
        <div className="contour-control-group">
          <label>P range (MPa)</label>
          <div className="contour-range">
            <input type="number" value={pMin} min={0.1} max={50} step={1} onChange={e => setPMin(+e.target.value)} style={{ width: 60 }} />
            <span>–</span>
            <input type="number" value={pMax} min={1} max={60} step={1} onChange={e => setPMax(+e.target.value)} style={{ width: 60 }} />
          </div>
        </div>
        <div className="contour-control-group">
          <label>T range (K)</label>
          <div className="contour-range">
            <input type="number" value={tMin} min={273} max={400} step={5} onChange={e => setTMin(+e.target.value)} style={{ width: 60 }} />
            <span>–</span>
            <input type="number" value={tMax} min={300} max={500} step={5} onChange={e => setTMax(+e.target.value)} style={{ width: 60 }} />
          </div>
        </div>
        <div className="contour-control-group">
          <label>Target IFT (inverse)</label>
          <input type="number" value={targetIFT} min={5} max={70} step={1} onChange={e => setTargetIFT(+e.target.value)} style={{ width: 60 }} />
        </div>
        <label className="contour-checkbox">
          <input type="checkbox" checked={showInverse} onChange={e => setShowInverse(e.target.checked)} />
          <span>Show safe zone (IFT ≤ target)</span>
        </label>
      </div>

      {/* Canvas */}
      <div className="contour-canvas-wrap">
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h, cursor: 'crosshair' }}
          onMouseMove={handleMouse}
          onMouseLeave={() => setHovered(null)}
          onClick={handleMouse}
        />
        <div className="contour-params">
          <p className="text-muted" style={{ fontSize: '0.72rem' }}>
            Salinity={inputs.salinity} · MCM={inputs.MCM} · BCM={inputs.BCM}<br />
            CH₄={inputs.x_CH4} · N₂={inputs.x_N2} · Brine={inputs.brineType}
          </p>
        </div>
      </div>

      {/* Hover info */}
      {hoveredData && (
        <div className="contour-tooltip">
          P = {hoveredData.P.toFixed(1)} MPa · T = {hoveredData.T.toFixed(1)} K ·
          IFT = <strong>{hoveredData.ift.toFixed(2)}</strong> mN/m ·
          {hoveredData.regime === 'sup' ? ' Supercritical' : ' Subcritical'}
        </div>
      )}
    </div>
  )
}
