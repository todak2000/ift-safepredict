import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Compass } from 'lucide-react'
import { predict } from '../logic/predict.js'
import { computeDrho } from '../logic/eosEngine.js'

const RES_X = 52
const RES_Y = 36
// Internal canvas margins so Y-axis ticks, X-axis ticks, and Colorbar NEVER clip!
const PAD = { top: 20, right: 76, bottom: 44, left: 60 }

function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

function iftColorSmooth(ift) {
  const stops = [
    { pos: 12, color: [37, 99, 235] },
    { pos: 24, color: [6, 182, 212] },
    { pos: 36, color: [16, 185, 129] },
    { pos: 50, color: [234, 179, 8] },
    { pos: 64, color: [249, 115, 22] },
    { pos: 78, color: [225, 29, 72] },
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
  const wrapRef = useRef(null)
  const [pMin, setPMin] = useState(0.5)
  const [pMax, setPMax] = useState(45)
  const [tMin, setTMin] = useState(280)
  const [tMax, setTMax] = useState(415)
  const [targetIFT, setTargetIFT] = useState(30)
  const [showSafeZone, setShowSafeZone] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [canvasW, setCanvasW] = useState(820)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(280, Math.min(entry.contentRect.width - 12, 960))
        setCanvasW(Math.round(w))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const canvasH = Math.round(Math.max(240, Math.min(480, canvasW * 0.58)))

  const grid = useMemo(() => {
    const data = []
    const safePMax = Math.max(pMin + 1, pMax)
    const safeTMax = Math.max(tMin + 5, tMax)
    const { brineType, salinity, drho, MCM, BCM, x_CH4, x_N2, eosEstimated } = inputs
    const baseInputs = {
      salinity,
      drho,
      MCM,
      BCM,
      x_CH4,
      x_N2,
      brineType: brineType || 'NaCl',
      eosEstimated: !!eosEstimated,
    }
    for (let j = 0; j < RES_Y; j++) {
      const T = tMin + ((safeTMax - tMin) * j) / (RES_Y - 1)
      for (let i = 0; i < RES_X; i++) {
        const P = pMin + ((safePMax - pMin) * i) / (RES_X - 1)
        const cellDrho = eosEstimated
          ? computeDrho(P, T, salinity ?? MCM ?? 0, { BCM, x_CH4, x_N2 }).drho
          : drho
        const r = predict({ ...baseInputs, P: +P.toFixed(3), T: +T.toFixed(3), drho: +cellDrho.toFixed(4) })
        data.push({ i, j, P, T, ift: r.p50, regime: r.regime, status: r.status })
      }
    }
    return {
      data,
      minIft: Math.min(...data.map(d => d.ift)),
      maxIft: Math.max(...data.map(d => d.ift)),
      safePMax,
      safeTMax,
    }
  }, [inputs, pMin, pMax, tMin, tMax])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Clean dark chart background
    ctx.fillStyle = '#0B1324'
    ctx.fillRect(0, 0, canvasW, canvasH)

    const plotW = canvasW - PAD.left - PAD.right
    const plotH = canvasH - PAD.top - PAD.bottom
    const cellW = plotW / RES_X
    const cellH = plotH / RES_Y

    const { minIft, maxIft, safePMax, safeTMax } = grid

    // Draw contour cells (j=0 is tMin at bottom, j=RES_Y-1 is tMax at top!)
    grid.data.forEach(d => {
      const x = PAD.left + d.i * cellW
      const y = PAD.top + (RES_Y - 1 - d.j) * cellH
      const [r, g, b] = iftColorSmooth(d.ift)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, y, cellW + 0.6, cellH + 0.6)

      if (showSafeZone && d.ift >= targetIFT) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
        ctx.fillRect(x, y, cellW + 0.6, cellH + 0.6)
      }
    })

    // Plot border
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1
    ctx.strokeRect(PAD.left, PAD.top, plotW, plotH)

    // Kay's critical boundaries (Pr = 1, Tr = 1)
    const xImp = (inputs.x_CH4 || 0) + (inputs.x_N2 || 0)
    const pcMix = (1 - xImp) * 7.377 + (inputs.x_CH4 || 0) * 4.6 + (inputs.x_N2 || 0) * 3.39
    const tcMix = (1 - xImp) * 304.28 + (inputs.x_CH4 || 0) * 190.56 + (inputs.x_N2 || 0) * 126.19

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)'
    ctx.lineWidth = 1.6
    ctx.setLineDash([5, 4])

    if (pcMix >= pMin && pcMix <= safePMax) {
      const cx = PAD.left + ((pcMix - pMin) / (safePMax - pMin)) * plotW
      ctx.beginPath()
      ctx.moveTo(cx, PAD.top)
      ctx.lineTo(cx, PAD.top + plotH)
      ctx.stroke()
    }
    if (tcMix >= tMin && tcMix <= safeTMax) {
      const cy = PAD.top + plotH - ((tcMix - tMin) / (safeTMax - tMin)) * plotH
      ctx.beginPath()
      ctx.moveTo(PAD.left, cy)
      ctx.lineTo(PAD.left + plotW, cy)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Critical point marker
    if (pcMix >= pMin && pcMix <= safePMax && tcMix >= tMin && tcMix <= safeTMax) {
      const cx = PAD.left + ((pcMix - pMin) / (safePMax - pMin)) * plotW
      const cy = PAD.top + plotH - ((tcMix - tMin) / (safeTMax - tMin)) * plotH
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = '600 11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      ctx.fillText('Critical Point', cx + 8, cy - 6)
    }

    // Hovered cell highlight
    if (hovered) {
      const hx = PAD.left + hovered.i * cellW
      const hy = PAD.top + (RES_Y - 1 - hovered.j) * cellH
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.strokeRect(hx, hy, cellW, cellH)
    }

    // X-axis ticks & title
    ctx.fillStyle = '#CBD5E1'
    ctx.font = '500 11px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    const nTicksX = 6
    for (let k = 0; k <= nTicksX; k++) {
      const val = pMin + ((safePMax - pMin) * k) / nTicksX
      const tx = PAD.left + (plotW * k) / nTicksX
      ctx.fillText(val.toFixed(1), tx, PAD.top + plotH + 17)
    }
    ctx.font = '600 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#94A3B8'
    ctx.fillText('Pressure P (MPa)', PAD.left + plotW / 2, canvasH - 8)

    // Y-axis ticks & title
    ctx.font = '500 11px "JetBrains Mono", monospace'
    ctx.fillStyle = '#CBD5E1'
    ctx.textAlign = 'right'
    const nTicksY = 5
    for (let k = 0; k <= nTicksY; k++) {
      const val = tMin + ((safeTMax - tMin) * k) / nTicksY
      const ty = PAD.top + plotH - (plotH * k) / nTicksY + 4
      ctx.fillText(`${val.toFixed(0)} K`, PAD.left - 8, ty)
    }

    // Colorbar inside right margin
    const barX = PAD.left + plotW + 16
    const barY = PAD.top
    const barW = 14
    const barH = plotH
    for (let k = 0; k < barH; k++) {
      const iftVal = minIft + (maxIft - minIft) * (1 - k / barH)
      const [r, g, b] = iftColorSmooth(iftVal)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(barX, barY + k, barW, 1.5)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barW, barH)

    ctx.fillStyle = '#CBD5E1'
    ctx.font = '600 10.5px "JetBrains Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${maxIft.toFixed(1)}`, barX + barW + 6, barY + 9)
    ctx.fillText(`${((minIft + maxIft) / 2).toFixed(1)}`, barX + barW + 6, barY + barH / 2 + 4)
    ctx.fillText(`${minIft.toFixed(1)}`, barX + barW + 6, barY + barH - 2)
    ctx.font = '600 10px Inter, sans-serif'
    ctx.fillStyle = '#94A3B8'
    ctx.fillText('mN/m', barX + 1, barY - 6)
  }, [grid, canvasW, canvasH, showSafeZone, targetIFT, hovered, inputs, pMin, tMin])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const handleMouse = useCallback(
    e => {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const plotW = canvasW - PAD.left - PAD.right
      const plotH = canvasH - PAD.top - PAD.bottom
      if (x < PAD.left || x > PAD.left + plotW || y < PAD.top || y > PAD.top + plotH) {
        setHovered(null)
        return
      }
      const cellW = plotW / RES_X
      const cellH = plotH / RES_Y
      const i = Math.min(RES_X - 1, Math.max(0, Math.floor((x - PAD.left) / cellW)))
      const j = Math.min(RES_Y - 1, Math.max(0, RES_Y - 1 - Math.floor((y - PAD.top) / cellH)))
      setHovered({ i, j })
      const d = grid.data[j * RES_X + i]
      if (d && e.type === 'click' && onSelectPT) {
        onSelectPT({ P: +d.P.toFixed(2), T: +d.T.toFixed(2) })
      }
    },
    [grid, canvasW, canvasH, onSelectPT]
  )

  const hoveredData = hovered ? grid.data[hovered.j * RES_X + hovered.i] : null

  return (
    <div className="card" style={{ maxWidth: '100%' }}>
      <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="card-title-group">
          <span className="card-title">
            <Compass size={16} color="var(--accent)" />
            P–T Regime &amp; Interfacial Tension Contour Map
          </span>
          <span className="card-subtitle">
            PR-EOS coupled IFT surface across pressure and temperature &middot; Dashed white lines mark critical boundaries (P<sub>r</sub> = 1, T<sub>r</sub> = 1) &middot; Click any cell to load P &amp; T
          </span>
        </div>
      </div>

      {/* Clean, well-proportioned horizontal controls bar (no clipped 60px inputs!) */}
      <div className="contour-controls">
        <div className="contour-control-group">
          <label className="param-label">Pressure Range (MPa)</label>
          <div className="contour-range">
            <input type="number" value={pMin} min={0.1} max={50} step={0.5} onChange={e => setPMin(+e.target.value)} />
            <span className="text-muted">to</span>
            <input type="number" value={pMax} min={5} max={70} step={1} onChange={e => setPMax(+e.target.value)} />
          </div>
        </div>

        <div className="contour-control-group">
          <label className="param-label">Temperature Range (K)</label>
          <div className="contour-range">
            <input type="number" value={tMin} min={273} max={400} step={5} onChange={e => setTMin(+e.target.value)} />
            <span className="text-muted">to</span>
            <input type="number" value={tMax} min={300} max={450} step={5} onChange={e => setTMax(+e.target.value)} />
          </div>
        </div>

        <div className="contour-control-group">
          <label className="param-label">Seal Threshold (mN/m)</label>
          <input
            type="number"
            value={targetIFT}
            min={12}
            max={75}
            step={1}
            onChange={e => setTargetIFT(+e.target.value)}
            style={{ width: '108px' }}
          />
        </div>

        <label className="contour-checkbox">
          <input type="checkbox" checked={showSafeZone} onChange={e => setShowSafeZone(e.target.checked)} />
          <span>Highlight region (&gamma; &ge; threshold)</span>
        </label>
      </div>

      {/* Full-width responsive Canvas container */}
      <div className="contour-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: canvasW, height: canvasH, cursor: 'crosshair', display: 'block' }}
          onMouseMove={handleMouse}
          onMouseLeave={() => setHovered(null)}
          onClick={handleMouse}
        />
      </div>

      {/* Live readout strip */}
      <div className="hud-conformal-strip" style={{ marginTop: '0.85rem' }}>
        {hoveredData ? (
          <span className="mono">
            Cursor: <strong>P = {hoveredData.P.toFixed(2)} MPa</strong> &middot;{' '}
            <strong>T = {(hoveredData.T - 273.15).toFixed(1)} °C ({hoveredData.T.toFixed(1)} K)</strong> &middot;{' '}
            <strong>IFT = {hoveredData.ift.toFixed(2)} mN/m</strong> ({hoveredData.regime === 'sup' ? 'Supercritical' : 'Subcritical'} · {hoveredData.status})
          </span>
        ) : (
          <span>Hover over the P–T surface to inspect local IFT &amp; regime, or click any point to apply to the Predictor HUD.</span>
        )}
        <span className="mono" style={{ color: 'var(--text-muted)' }}>
          Brine: {inputs.brineType || 'NaCl'} &middot; MCM = {inputs.MCM} mol/kg
        </span>
      </div>
    </div>
  )
}
