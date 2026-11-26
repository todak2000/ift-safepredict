import React, { useState } from 'react'
import { Check, Link, Info, Download, ShieldCheck, Cpu, Sparkles } from 'lucide-react'
import QualityBadge from './QualityBadge.jsx'
import { exportCSV, exportPDF } from '../logic/exportEngine.js'
import { buildShareUrl } from '../logic/tracking.js'

export default function PredictionDisplay({ result, inputs, unitSystem, onOpenAgent }) {
  const [copied, setCopied] = useState(false)

  if (!result) {
    return (
      <div className="hero-hud-card" style={{ opacity: 0.7 }}>
        <div className="card-title-row">
          <div className="card-title-group">
            <span className="card-title">Interfacial Tension HUD</span>
            <span className="card-subtitle">Dual-regime MARS real-time inference</span>
          </div>
        </div>
        <div className="hero-percentile-grid">
          <div className="hud-tile">
            <div className="hud-tile-tag">P90 Conservative (Low IFT)</div>
            <div className="hud-tile-value mono">—</div>
            <div className="hud-tile-unit">mN/m</div>
          </div>
          <div className="hud-tile hud-tile--p50">
            <div className="hud-tile-tag">P50 Expected IFT</div>
            <div className="hud-tile-value mono">—</div>
            <div className="hud-tile-unit">mN/m</div>
          </div>
          <div className="hud-tile">
            <div className="hud-tile-tag">P10 Optimistic (High IFT)</div>
            <div className="hud-tile-value mono">—</div>
            <div className="hud-tile-unit">mN/m</div>
          </div>
        </div>
        <div className="hud-conformal-strip">
          <span>Awaiting reservoir inputs &middot; Select a formation preset or adjust parameters</span>
          <span className="mono">80% Conformal Prediction Band</span>
        </div>
      </div>
    )
  }

  const {
    p10, p50, p90, calibP10, calibP90, status, adStatus, message, uif, h, hStar,
    regime, Pr, Tr, drho_sq, eosEstimated, p50Clipped, rawP50, checks,
    isBoundaryAdjacent, boundaryDelta,
  } = result

  const fullInputs = {
    ...inputs,
    Pr, Tr, drho_sq,
    drho: inputs.drho,
    eosEstimated,
  }

  const handleCSV = () => exportCSV(fullInputs, result, regime)
  const handlePDF = () => exportPDF(fullInputs, result, regime)

  const intervalLabel = uif > 1.0
    ? `Escalated Interval [${p90.toFixed(2)}, ${p10.toFixed(2)}] mN/m (UIF ${uif.toFixed(2)}× · Calib 80%: [${calibP90.toFixed(2)}, ${calibP10.toFixed(2)}])`
    : `80% Conformal Interval [${p90.toFixed(2)}, ${p10.toFixed(2)}] mN/m (±${(result.halfWidth ?? 2.25).toFixed(2)} mN/m)`

  return (
    <div className="hero-hud-card">
      <div className="card-title-row">
        <div className="card-title-group">
          <span className="card-title">
            <Cpu size={15} color="var(--accent)" />
            Interfacial Tension HUD
          </span>
          <span className="card-subtitle">
            Regime: {regime === 'sup' ? 'Supercritical (35-term)' : 'Subcritical (16-term)'} &middot; Unified Composite Assurance
          </span>
        </div>
        <div className="hud-actions">
          {onOpenAgent && (
            <button
              className="btn btn-secondary"
              onClick={onOpenAgent}
              style={{ borderColor: 'rgba(8, 145, 178, 0.40)', color: 'var(--accent-text)' }}
              title="Open SEAL — Subsurface Evaluation & Assurance Lead"
            >
              <Sparkles size={14} />
              <span className="btn-label">Ask SEAL</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleCSV} title="Export CSV audit file">
            <Download size={13} />
            <span className="btn-label">CSV</span>
          </button>
          <button className="btn btn-secondary" onClick={handlePDF} title="Generate technical PDF report">
            <Download size={13} />
            <span className="btn-label">PDF</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              navigator.clipboard.writeText(buildShareUrl(inputs))
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            title="Copy shareable link"
          >
            {copied ? <><Check size={13} /> <span className="btn-label">Copied</span></> : <><Link size={13} /> <span className="btn-label">Share</span></>}
          </button>
        </div>
      </div>

      <div className="hero-percentile-grid">
        <div className="hud-tile">
          <div className="hud-tile-tag">P90 Conservative (Low γ)</div>
          <div className="hud-tile-value mono">{p90.toFixed(2)}</div>
          <div className="hud-tile-unit">mN/m</div>
        </div>

        <div className="hud-tile hud-tile--p50">
          <div className="hud-tile-tag">P50 Expected IFT (γ)</div>
          <div className="hud-tile-value mono">
            {p50.toFixed(2)}
          </div>
          <div className="hud-tile-unit">mN/m &middot; (mJ/m²)</div>
        </div>

        <div className="hud-tile">
          <div className="hud-tile-tag">P10 Optimistic (High γ)</div>
          <div className="hud-tile-value mono">{p10.toFixed(2)}</div>
          <div className="hud-tile-unit">mN/m</div>
        </div>
      </div>

      <div className="hud-conformal-strip" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <ShieldCheck size={16} color={status === 'GREEN' ? 'var(--green)' : status === 'AMBER' ? 'var(--yellow)' : 'var(--red)'} />
          <span className="mono" style={{ fontSize: '0.86rem' }}>{intervalLabel}</span>
          {eosEstimated && <span className="eos-tag">Δρ PR-EOS</span>}
        </div>
        <div className="mono" style={{ fontSize: '0.84rem' }}>
          P<sub>r</sub> = {Pr?.toFixed(3)} &middot; T<sub>r</sub> = {Tr?.toFixed(3)} &middot; (&Delta;&rho;)<sup>2</sup> = {drho_sq?.toFixed(4)}
        </div>
      </div>

      {isBoundaryAdjacent && boundaryDelta !== null && boundaryDelta > 2.0 && (
        <div style={{
          marginTop: '0.65rem',
          padding: '0.45rem 0.75rem',
          background: 'rgba(245, 158, 11, 0.10)',
          border: '1px solid rgba(245, 158, 11, 0.30)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.71rem',
          color: 'var(--yellow)',
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>
            Boundary-adjacent state (Pr or Tr within ±5% of 1.00): cross-regime equation step Δγ = {boundaryDelta.toFixed(2)} mN/m. Verify sensitivity across phase transition.
          </span>
        </div>
      )}

      {p50Clipped && (
        <div style={{
          marginTop: '0.65rem',
          padding: '0.45rem 0.75rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--yellow)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>P50 clipped from {rawP50.toFixed(2)} → {p50.toFixed(2)} mN/m (clamped to physical dataset bounds 12.40–78.88 mN/m).</span>
        </div>
      )}

      <QualityBadge
        status={status}
        adStatus={adStatus}
        message={message}
        uif={uif}
        h={h}
        hStar={hStar}
        checks={checks}
      />
    </div>
  )
}
