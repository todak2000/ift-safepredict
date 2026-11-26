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
    <div className="eos-panel" style={{ marginTop: '0.9rem' }}>
      <div className="eos-panel-header" onClick={() => setOpen(o => !o)}>
        <span>Depth &rarr; Pressure &amp; Temperature Converter</span>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="eos-panel-body">
          <p className="text-muted" style={{ marginBottom: '0.9rem', fontSize: '0.88rem', lineHeight: 1.55 }}>
            Convert subsurface depth to reservoir P and T using hydrostatic and geothermal gradients.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <div className="param-group" style={{ marginBottom: 0 }}>
              <div className="param-header"><span className="param-label">Depth</span><span className="param-val-pill mono">m</span></div>
              <input type="number" value={depth} min={0} max={8000} step={50} onChange={e => setDepth(Number(e.target.value))} />
            </div>
            <div className="param-group" style={{ marginBottom: 0 }}>
              <div className="param-header"><span className="param-label">Geothermal</span><span className="param-val-pill mono">°C/km</span></div>
              <input type="number" value={tGrad} min={10} max={60} step={1} onChange={e => setTGrad(Number(e.target.value))} />
            </div>
            <div className="param-group" style={{ marginBottom: 0 }}>
              <div className="param-header"><span className="param-label">Hydrostatic</span><span className="param-val-pill mono">MPa/km</span></div>
              <input type="number" value={pGrad} min={5} max={20} step={0.5} onChange={e => setPGrad(Number(e.target.value))} />
            </div>
            <div className="param-group" style={{ marginBottom: 0 }}>
              <div className="param-header"><span className="param-label">Surface T</span><span className="param-val-pill mono">°C</span></div>
              <input type="number" value={surfT} min={-10} max={40} step={1} onChange={e => setSurfT(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div className="mono" style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              P &approx; {(pGrad * depth / 1000).toFixed(2)} MPa &middot; T &approx; {(surfT + tGrad * depth / 1000).toFixed(1)} °C ({(surfT + 273.15 + tGrad * depth / 1000).toFixed(1)} K)
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleConvert}>
              Apply P &amp; T
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
