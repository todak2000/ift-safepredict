import React, { useState } from 'react'

export default function DepthConverter({ onApply }) {
  const [open, setOpen] = useState(false)
  const [depth, setDepth] = useState(1500)
  const [tGrad, setTGrad] = useState(25)
  const [pGrad, setPGrad] = useState(10)
  const [surfT, setSurfT] = useState(15)

  const handleConvert = () => {
    const T_K = surfT + 273.15 + (tGrad * depth / 1000)
    const P_MPa = pGrad * depth / 1000
    onApply({
      P: parseFloat(P_MPa.toFixed(2)),
      T: parseFloat(T_K.toFixed(2)),
    })
  }

  return (
    <div className="eos-panel" style={{ marginTop: '0.75rem' }}>
      <div className="eos-panel-header" onClick={() => setOpen(o => !o)}>
        <span>Depth → Pressure & Temperature converter</span>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="eos-panel-body">
          <p className="text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>
            Convert subsurface depth to reservoir P and T using hydrostatic and geothermal gradients.
            Results auto-populate into the input fields above.
          </p>
          <div className="field-group">
            <div className="field-label"><span>Depth</span><span className="unit">m</span></div>
            <input type="number" value={depth} min={0} max={8000} step={50}
              onChange={e => setDepth(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Geothermal gradient</span><span className="unit">°C/km</span></div>
            <input type="number" value={tGrad} min={10} max={60} step={1}
              onChange={e => setTGrad(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Pressure gradient</span><span className="unit">MPa/km</span></div>
            <input type="number" value={pGrad} min={5} max={20} step={0.5}
              onChange={e => setPGrad(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Surface temperature</span><span className="unit">°C</span></div>
            <input type="number" value={surfT} min={-10} max={40} step={1}
              onChange={e => setSurfT(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <button className="btn btn-secondary" onClick={handleConvert} style={{ marginTop: '0.25rem' }}>
            Apply P & T
          </button>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <div>T ≈ {(surfT + tGrad * depth / 1000).toFixed(1)} °C ({(surfT + 273.15 + tGrad * depth / 1000).toFixed(1)} K)</div>
            <div>P ≈ {(pGrad * depth / 1000).toFixed(2)} MPa</div>
          </div>
        </div>
      )}
    </div>
  )
}
