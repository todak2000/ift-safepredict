import React from 'react'
import { Check, AlertTriangle } from 'lucide-react'

const LABELS = {
  GREEN: <>GREEN <Check size={14} /> In Domain</>,
  AMBER: <>AMBER <AlertTriangle size={14} /> Graduated Extrapolation</>,
  RED:   <>RED <AlertTriangle size={14} /> Strong Extrapolation</>,
}

export default function QualityBadge({ status, message, uif, h, hStar }) {
  if (!status) return null

  return (
    <div className={`qa-badge ${status}`}>
      <div className="dot" />
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{LABELS[status]}</div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', opacity: 0.9 }}>{message}</div>
        {uif !== 1.0 && (
          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.7 }}>
            UIF = {uif} — interval widened by {uif}×
          </div>
        )}
        {h !== undefined && hStar !== undefined && (
          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.7 }}>
            Leverage h = {h.toFixed(4)} | h* = {hStar.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  )
}
